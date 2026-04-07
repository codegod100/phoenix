/**
 * Phoenix VCS — Evidence & Policy Engine
 * 
 * Implements PRD Section 10: Evidence & Policy Engine
 * Risk-tiered enforcement with cascading failure semantics.
 */

import { spawn } from 'node:child_process';
import { promisify } from 'node:util';

export type RiskTier = 'low' | 'medium' | 'high' | 'critical';

export type EvidenceKind = 
  | 'typecheck' 
  | 'lint' 
  | 'boundary_validation' 
  | 'unit_tests' 
  | 'property_tests' 
  | 'static_analysis' 
  | 'threat_note' 
  | 'human_signoff' 
  | 'formal_verification';

export type EvidenceStatus = 'pending' | 'passed' | 'failed' | 'waived';

export interface EvidenceRecord {
  kind: EvidenceKind;
  status: EvidenceStatus;
  timestamp: string;
  iu_id: string;
  details?: string;
  duration_ms?: number;
  // For human signoff
  signed_by?: string;
  signature_hash?: string;
  // For formal verification
  proof_system?: string;
  // For test results
  test_count?: number;
  pass_count?: number;
  fail_count?: number;
}

export interface EvidencePolicy {
  tier: RiskTier;
  required: EvidenceKind[];
  optional?: EvidenceKind[];
}

export interface PolicyEvaluation {
  iu_id: string;
  tier: RiskTier;
  records: EvidenceRecord[];
  status: 'ACCEPTED' | 'REJECTED' | 'PENDING' | 'WAIVED';
  missing_evidence: EvidenceKind[];
  failed_evidence: EvidenceKind[];
  score: number; // 0-100
}

/**
 * Risk-tiered evidence requirements from PRD Section 10
 */
export function getRequiredEvidence(tier: RiskTier): EvidenceKind[] {
  switch (tier) {
    case 'low':
      return ['typecheck', 'lint', 'boundary_validation'];
    case 'medium':
      return ['typecheck', 'lint', 'boundary_validation', 'unit_tests'];
    case 'high':
      return [
        'typecheck', 
        'lint', 
        'boundary_validation', 
        'unit_tests', 
        'property_tests',
        'threat_note'
      ];
    case 'critical':
      return [
        'typecheck', 
        'lint', 
        'boundary_validation', 
        'unit_tests', 
        'property_tests',
        'threat_note',
        'static_analysis',
        'human_signoff' // or formal_verification
      ];
    default:
      return ['typecheck'];
  }
}

/**
 * Evaluate evidence policy for an IU.
 * Per PRD: "Evidence binds to canonical nodes, IU IDs, generated artifact hashes"
 */
export function evaluatePolicy(
  iuId: string,
  tier: RiskTier,
  records: EvidenceRecord[]
): PolicyEvaluation {
  const required = getRequiredEvidence(tier);
  const recordMap = new Map(records.map(r => [r.kind, r]));
  
  const missing: EvidenceKind[] = [];
  const failed: EvidenceKind[] = [];
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
  
  // Calculate score
  const total = required.length;
  const score = Math.round((passedCount / total) * 100);
  
  // Determine status
  let status: PolicyEvaluation['status'];
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

/**
 * Run typecheck evidence for TypeScript code.
 */
export async function runTypecheck(projectRoot: string): Promise<EvidenceRecord> {
  const start = Date.now();
  
  try {
    // Run tsc --noEmit
    const result = await runCommand('npx', ['tsc', '--noEmit'], projectRoot);
    const duration = Date.now() - start;
    
    return {
      kind: 'typecheck',
      status: result.exitCode === 0 ? 'passed' : 'failed',
      timestamp: new Date().toISOString(),
      iu_id: 'global', // Typecheck is project-wide
      duration_ms: duration,
      details: result.exitCode === 0 ? 'No type errors' : result.stderr,
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

/**
 * Run lint evidence.
 */
export async function runLint(projectRoot: string): Promise<EvidenceRecord> {
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
      details: result.exitCode === 0 ? 'No lint errors' : result.stderr,
    };
  } catch {
    // Lint might not be configured - that's okay
    return {
      kind: 'lint',
      status: 'waived',
      timestamp: new Date().toISOString(),
      iu_id: 'global',
      details: 'Lint not configured',
    };
  }
}

/**
 * Run unit tests for a specific IU.
 */
export async function runUnitTests(
  projectRoot: string,
  iuId: string,
  testPattern?: string
): Promise<EvidenceRecord> {
  const start = Date.now();
  
  try {
    const args = testPattern 
      ? ['test', testPattern, '--reporter=verbose']
      : ['test', '--reporter=verbose'];
    
    const result = await runCommand('npm', args, projectRoot);
    const duration = Date.now() - start;
    
    // Parse test results
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
      details: output.slice(-500), // Last 500 chars
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

/**
 * Create a human signoff record.
 */
export function createHumanSignoff(
  iuId: string,
  signedBy: string,
  signatureHash: string // Hash of the reviewed artifact
): EvidenceRecord {
  return {
    kind: 'human_signoff',
    status: 'passed',
    timestamp: new Date().toISOString(),
    iu_id: iuId,
    signed_by: signedBy,
    signature_hash: signatureHash,
  };
}

/**
 * Create a threat note (required for high/critical tier).
 */
export function createThreatNote(
  iuId: string,
  threats: string[]
): EvidenceRecord {
  return {
    kind: 'threat_note',
    status: 'passed', // Presence is sufficient
    timestamp: new Date().toISOString(),
    iu_id: iuId,
    details: threats.join('\n'),
  };
}

/**
 * Helper to run shell commands.
 */
function runCommand(cmd: string, args: string[], cwd: string): Promise<{
  exitCode: number;
  stdout: string;
  stderr: string;
}> {
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

/**
 * Format policy evaluation for display
 */
export function formatPolicyEvaluation(evaluation: PolicyEvaluation): string {
  const lines: string[] = [];
  
  const tierIcon = {
    low: '🔵',
    medium: '🟡',
    high: '🟠',
    critical: '🔴'
  }[evaluation.tier];
  
  lines.push(`${tierIcon} IU ${evaluation.iu_id.slice(0, 8)}... (${evaluation.tier.toUpperCase()} RISK)`);
  lines.push(`   Score: ${evaluation.score}/100`);
  lines.push(`   Status: ${evaluation.status}`);
  lines.push('');
  
  // Evidence breakdown
  lines.push('   Evidence:');
  for (const record of evaluation.records) {
    const icon = record.status === 'passed' ? '✓' : 
                 record.status === 'failed' ? '✗' : 
                 record.status === 'waived' ? '−' : '○';
    lines.push(`      ${icon} ${record.kind}${record.duration_ms ? ` (${record.duration_ms}ms)` : ''}`);
    
    if (record.status === 'failed' && record.details) {
      lines.push(`         ${record.details.slice(0, 100)}...`);
    }
  }
  
  if (evaluation.missing_evidence.length > 0) {
    lines.push('');
    lines.push('   Missing (required):');
    for (const kind of evaluation.missing_evidence) {
      lines.push(`      ○ ${kind}`);
    }
  }
  
  if (evaluation.failed_evidence.length > 0) {
    lines.push('');
    lines.push('   Failed:');
    for (const kind of evaluation.failed_evidence) {
      lines.push(`      ✗ ${kind}`);
    }
  }
  
  return lines.join('\n');
}

/**
 * Format multi-IU policy report
 */
export function formatPolicyReport(evaluations: PolicyEvaluation[]): string {
  const lines: string[] = [];
  lines.push('📋 Phoenix VCS Evidence & Policy Report');
  lines.push('');
  
  const accepted = evaluations.filter(e => e.status === 'ACCEPTED');
  const rejected = evaluations.filter(e => e.status === 'REJECTED');
  const pending = evaluations.filter(e => e.status === 'PENDING');
  
  for (const e of rejected) {
    lines.push(formatPolicyEvaluation(e));
    lines.push('');
  }
  
  for (const e of pending) {
    lines.push(formatPolicyEvaluation(e));
    lines.push('');
  }
  
  lines.push('─'.repeat(50));
  lines.push(`Summary: ${accepted.length} accepted, ${rejected.length} rejected, ${pending.length} pending`);
  lines.push(`Average Score: ${Math.round(evaluations.reduce((a, e) => a + e.score, 0) / evaluations.length)}/100`);
  
  if (rejected.length > 0) {
    lines.push('');
    lines.push('Status: 🔴 REJECTED - Some IUs failed policy evaluation');
  } else if (pending.length > 0) {
    lines.push('');
    lines.push('Status: 🟡 PENDING - Evidence collection incomplete');
  } else {
    lines.push('');
    lines.push('Status: 🟢 ACCEPTED - All policy requirements met');
  }
  
  return lines.join('\n');
}
