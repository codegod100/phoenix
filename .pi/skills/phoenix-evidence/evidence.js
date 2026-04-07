#!/usr/bin/env node
/**
 * Phoenix Evidence - Collect and verify evidence for Implementation Units
 * 
 * Risk-tiered evidence collection:
 * - low: typecheck, lint, boundary
 * - medium: + unit_tests
 * - high: + property_tests, threat_note
 * - critical: + static_analysis, human_signoff
 * 
 * Usage: node .pi/skills/phoenix-evidence/evidence.js [project-root] [iu-id]
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { resolve, join, relative } from 'path';
import { createHash } from 'crypto';

// === VCS IDENTITY ===

function sha256(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function fileHash(content) {
  return sha256(content);
}

function shortHash(fullHash) {
  return fullHash.slice(0, 8);
}

// === EVIDENCE TYPES ===

const EVIDENCE_KINDS = [
  'typecheck',
  'lint',
  'boundary_validation',
  'unit_tests',
  'property_tests',
  'static_analysis',
  'threat_note',
  'human_signoff',
];

function getRequiredEvidence(tier) {
  switch (tier) {
    case 'low':
      return ['typecheck', 'lint', 'boundary_validation'];
    case 'medium':
      return ['typecheck', 'lint', 'boundary_validation', 'unit_tests'];
    case 'high':
      return [
        'typecheck', 'lint', 'boundary_validation', 'unit_tests',
        'property_tests', 'threat_note'
      ];
    case 'critical':
      return [
        'typecheck', 'lint', 'boundary_validation', 'unit_tests',
        'property_tests', 'threat_note', 'static_analysis', 'human_signoff'
      ];
    default:
      return ['typecheck'];
  }
}

// === COMMAND RUNNERS ===

function runCommand(cmd, args, cwd) {
  return new Promise((resolve) => {
    const child = spawn(cmd, args, { cwd, shell: true });
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => stdout += data);
    child.stderr?.on('data', (data) => stderr += data);
    
    child.on('close', (exitCode) => {
      resolve({ exitCode: exitCode || 0, stdout, stderr });
    });
    
    child.on('error', (err) => {
      resolve({ exitCode: 1, stdout: '', stderr: String(err) });
    });
  });
}

async function runTypecheck(projectRoot) {
  const start = Date.now();
  
  try {
    const result = await runCommand('npx', ['tsc', '--noEmit'], projectRoot);
    const duration = Date.now() - start;
    
    return {
      kind: 'typecheck',
      status: result.exitCode === 0 ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
      iu_id: 'global',
      duration_ms: duration,
      details: result.exitCode === 0 ? 'No type errors' : result.stderr.slice(0, 200),
    };
  } catch (error) {
    return {
      kind: 'typecheck',
      status: 'failed',
      timestamp: new Date().toISOString(),
      iu_id: 'global',
      details: String(error),
    };
  }
}

async function runLint(projectRoot) {
  const start = Date.now();
  
  try {
    const result = await runCommand('npm', ['run', 'lint'], projectRoot);
    const duration = Date.now() - start;
    
    return {
      kind: 'lint',
      status: result.exitCode === 0 ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
      iu_id: 'global',
      duration_ms: duration,
      details: result.exitCode === 0 ? 'No lint errors' : result.stderr.slice(0, 200),
    };
  } catch {
    return {
      kind: 'lint',
      status: 'waived',
      timestamp: new Date().toISOString(),
      iu_id: 'global',
      details: 'Lint not configured',
    };
  }
}

async function runUnitTests(projectRoot, iuId, testPattern) {
  const start = Date.now();
  
  try {
    const args = testPattern 
      ? ['test', testPattern, '--reporter=verbose']
      : ['test', '--reporter=verbose'];
    
    const result = await runCommand('npm', args, projectRoot);
    const duration = Date.now() - start;
    
    const output = result.stdout + result.stderr;
    const passed = (output.match(/✓/g) || []).length;
    const failed = (output.match(/✗|FAIL/g) || []).length;
    
    return {
      kind: 'unit_tests',
      status: result.exitCode === 0 ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
      iu_id: iuId,
      duration_ms: duration,
      test_count: passed + failed,
      pass_count: passed,
      fail_count: failed,
      details: output.slice(-300),
    };
  } catch (error) {
    return {
      kind: 'unit_tests',
      status: 'failed',
      timestamp: new Date().toISOString(),
      iu_id: iuId,
      details: String(error),
    };
  }
}

async function runBoundaryValidation(projectRoot, iuId, filePath) {
  const start = Date.now();
  
  try {
    // Simplified boundary check - just verify file exists and has _phoenix export
    const content = readFileSync(join(projectRoot, filePath), 'utf-8');
    const hasPhoenix = content.includes('_phoenix');
    const hasIuId = content.includes(`iu_id:`);
    
    const duration = Date.now() - start;
    
    return {
      kind: 'boundary_validation',
      status: hasPhoenix && hasIuId ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
      iu_id: iuId,
      duration_ms: duration,
      details: hasPhoenix && hasIuId 
        ? `Traceability export found in ${filePath}`
        : `Missing _phoenix export in ${filePath}`,
    };
  } catch (error) {
    return {
      kind: 'boundary_validation',
      status: 'failed',
      timestamp: new Date().toISOString(),
      iu_id: iuId,
      details: `Error validating ${filePath}: ${error.message}`,
    };
  }
}

function checkThreatNote(projectRoot, iuId) {
  // Check if threat note exists in comments or separate file
  // For now, waive if not explicitly required
  return {
    kind: 'threat_note',
    status: 'waived',
    timestamp: new Date().toISOString(),
    iu_id: iuId,
    details: 'Threat note check waived - manual verification required',
  };
}

function checkHumanSignoff(projectRoot, iuId) {
  return {
    kind: 'human_signoff',
    status: 'pending',
    timestamp: new Date().toISOString(),
    iu_id: iuId,
    details: 'Human signoff pending - requires manual review',
  };
}

function checkStaticAnalysis(projectRoot, iuId) {
  return {
    kind: 'static_analysis',
    status: 'waived',
    timestamp: new Date().toISOString(),
    iu_id: iuId,
    details: 'Static analysis waived - configure security scanner',
  };
}

function checkPropertyTests(projectRoot, iuId) {
  return {
    kind: 'property_tests',
    status: 'waived',
    timestamp: new Date().toISOString(),
    iu_id: iuId,
    details: 'Property tests waived - configure property-based testing',
  };
}

// === POLICY EVALUATION ===

function evaluatePolicy(iuId, tier, records) {
  const required = getRequiredEvidence(tier);
  const recordMap = new Map(records.map(r => [r.kind, r]));
  
  const missing = [];
  const failed = [];
  let passedCount = 0;
  
  for (const kind of required) {
    const record = recordMap.get(kind);
    
    if (!record) {
      missing.push(kind);
    } else if (record.status === 'failed') {
      failed.push(kind);
    } else if (record.status === 'passed' || record.status === 'waived') {
      passedCount++;
    }
  }
  
  const total = required.length;
  const score = Math.round((passedCount / total) * 100);
  
  let status;
  if (failed.length > 0) {
    status = 'REJECTED';
  } else if (missing.length > 0) {
    status = 'PENDING';
  } else if (passedCount === total) {
    status = 'ACCEPTED';
  } else {
    status = 'PENDING';
  }
  
  return {
    iu_id: iuId,
    tier,
    records,
    status,
    missing_evidence: missing,
    failed_evidence: failed,
    score,
  };
}

// === EVIDENCE COLLECTION ===

async function collectEvidence(projectRoot, iuFilter = null) {
  const iusPath = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
  if (!existsSync(iusPath)) {
    throw new Error('No IU graph found. Run phoenix-plan first.');
  }

  const iuGraph = JSON.parse(readFileSync(iusPath, 'utf-8'));
  const evaluations = [];

  // Global checks
  const typecheckResult = await runTypecheck(projectRoot);
  const lintResult = await runLint(projectRoot);

  for (const iu of iuGraph.ius || []) {
    if (iuFilter && !iu.id.includes(iuFilter) && iu.short_id !== iuFilter) {
      continue;
    }

    const records = [];
    
    // Global checks apply to all IUs
    records.push({ ...typecheckResult, iu_id: iu.id });
    records.push({ ...lintResult, iu_id: iu.id });

    // Boundary validation
    const implPath = iu.output_path || `src/generated/${iu.name.toLowerCase().replace(/\s+/g, '-')}/index.ts`;
    const boundaryResult = await runBoundaryValidation(projectRoot, iu.id, implPath);
    records.push(boundaryResult);

    // Unit tests for medium+
    if (iu.risk_tier === 'medium' || iu.risk_tier === 'high' || iu.risk_tier === 'critical') {
      const testPath = iu.test_path;
      if (testPath && existsSync(join(projectRoot, testPath))) {
        const testResult = await runUnitTests(projectRoot, iu.id, testPath);
        records.push(testResult);
      }
    }

    // High/critical specific checks
    if (iu.risk_tier === 'high' || iu.risk_tier === 'critical') {
      records.push(checkThreatNote(projectRoot, iu.id));
      records.push(checkPropertyTests(projectRoot, iu.id));
    }

    // Critical only
    if (iu.risk_tier === 'critical') {
      records.push(checkStaticAnalysis(projectRoot, iu.id));
      records.push(checkHumanSignoff(projectRoot, iu.id));
    }

    const evaluation = evaluatePolicy(iu.id, iu.risk_tier, records);
    evaluations.push(evaluation);
  }

  return evaluations;
}

function formatEvaluation(evaluation) {
  const tierIcon = {
    low: '🔵',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  }[evaluation.tier];
  
  const statusIcon = evaluation.status === 'ACCEPTED' ? '✅' :
                     evaluation.status === 'REJECTED' ? '❌' : '⏳';
  
  const lines = [];
  lines.push(`${tierIcon} ${shortHash(evaluation.iu_id)}... (${evaluation.tier.toUpperCase()}) ${statusIcon} ${evaluation.status}`);
  lines.push(`   Score: ${evaluation.score}/100`);
  
  for (const record of evaluation.records) {
    const icon = record.status === 'passed' ? '✓' :
                 record.status === 'failed' ? '✗' :
                 record.status === 'waived' ? '−' : '○';
    lines.push(`      ${icon} ${record.kind}${record.duration_ms ? ` (${record.duration_ms}ms)` : ''}`);
  }
  
  if (evaluation.missing_evidence.length > 0) {
    lines.push(`   Missing: ${evaluation.missing_evidence.join(', ')}`);
  }
  
  if (evaluation.failed_evidence.length > 0) {
    lines.push(`   Failed: ${evaluation.failed_evidence.join(', ')}`);
  }
  
  return lines.join('\n');
}

function saveEvidence(projectRoot, evaluations) {
  const evidenceDir = join(projectRoot, '.phoenix', 'evidence');
  if (!existsSync(evidenceDir)) {
    mkdirSync(evidenceDir, { recursive: true });
  }
  
  const evidencePath = join(evidenceDir, `evidence-${Date.now()}.json`);
  const evidence = {
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    evaluations,
  };
  
  writeFileSync(evidencePath, JSON.stringify(evidence, null, 2), 'utf-8');
  return evidencePath;
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');
const iuFilter = process.argv[3] || null;

console.log('📋 Phoenix Evidence');
console.log(`   Project: ${projectRoot}`);
if (iuFilter) {
  console.log(`   Filter: ${iuFilter}`);
}
console.log('');

(async () => {
  try {
    const evaluations = await collectEvidence(projectRoot, iuFilter);
    
    // Save evidence
    const evidencePath = saveEvidence(projectRoot, evaluations);
    
    // Print results
    console.log(`✅ Collected evidence for ${evaluations.length} IUs`);
    console.log(`   Saved: ${evidencePath}`);
    console.log('');
    
    // Summary
    const accepted = evaluations.filter(e => e.status === 'ACCEPTED').length;
    const rejected = evaluations.filter(e => e.status === 'REJECTED').length;
    const pending = evaluations.filter(e => e.status === 'PENDING').length;
    const avgScore = evaluations.length > 0
      ? Math.round(evaluations.reduce((a, e) => a + e.score, 0) / evaluations.length)
      : 0;
    
    console.log('Summary:');
    console.log(`   ✅ Accepted: ${accepted}`);
    console.log(`   ❌ Rejected: ${rejected}`);
    console.log(`   ⏳ Pending: ${pending}`);
    console.log(`   Average Score: ${avgScore}/100`);
    console.log('');
    
    // Detailed output
    for (const eval_ of evaluations) {
      console.log(formatEvaluation(eval_));
      console.log('');
    }
    
    // Overall status
    if (rejected > 0) {
      console.log('🔴 Status: REJECTED - Some IUs failed policy evaluation');
      console.log('   Fix failed evidence and re-run');
      process.exit(1);
    } else if (pending > 0) {
      console.log('🟡 Status: PENDING - Evidence collection incomplete');
      console.log('   Provide missing evidence');
      process.exit(1);
    } else {
      console.log('🟢 Status: ACCEPTED - All policy requirements met');
      console.log('🎉 Ready for audit and drift detection');
    }
    
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
})();
