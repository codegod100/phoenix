#!/usr/bin/env node
/**
 * Phoenix Pipeline — Spec-Driven Development
 * 
 *   SPEC → CANON → PLAN → PROTOLENS → CODEGEN → EVIDENCE → AUDIT → DRIFT
 *    ↑                                                    ↓
 *    └────────────────── Manual Edits ←───────────────────┘
 * 
 * All code generation happens in single CODEGEN phase at the end.
 * PROTOLENS computes migration plan using theory morphism (category theory).
 * The deliverable is generated along with IU implementations.
 * 
 * Phases:
 * 1. Ingest - Parse specs into clauses
 * 2. Canonicalize - Extract clean requirements
 * 3. Plan - Create IUs with boundary exports
 * 4. Protolens - Compute migration plan (theory morphism)
 * 5. Codegen - Generate IU implementations AND deliverable
 * 6. Evidence - Validate implementation
 * 7. Audit - Boundary checks
 * 8. Drift - Detect manual changes
 * 
 * Usage: node .pi/skills/phoenix-pipeline/pipeline.js [project-root] [options]
 * Options:
 *   --skip-ingest
 *   --skip-canonicalize
 *   --skip-plan
 *   --skip-protolens      (Skip migration computation)
 *   --skip-codegen         (Preserve your implementations!)
 *   --skip-evidence
 *   --skip-audit
 *   --skip-drift
 *   --continue-on-error
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === PHASE CONFIGURATION ===

const PHASES = [
  { 
    name: 'ingest', 
    script: 'phoenix-ingest/ingest.js', 
    description: 'Parse specs into content-addressed clauses',
  },
  { 
    name: 'canonicalize', 
    script: 'phoenix-canonicalize/canonicalize.js', 
    description: 'Extract clean requirements with traceability',
  },
  { 
    name: 'plan', 
    script: 'phoenix-plan/plan.js', 
    description: 'Group requirements into Implementation Units',
  },
  { 
    name: 'protolens', 
    script: 'phoenix-panproto/panproto.js', 
    description: 'Compute migration plan (theory morphism)',
    args: ['migrate'],
  },
  { 
    name: 'codegen', 
    script: 'phoenix-codegen/codegen.js', 
    description: 'Generate IU implementations and deliverable',
    warning: '⚠️  DESTRUCTIVE: Overwrites src/generated/*. Edit with care!',
  },
  { 
    name: 'evidence', 
    script: 'phoenix-evidence/evidence.js', 
    description: 'Validate tier requirements (pass or fail)',
  },
  { 
    name: 'audit', 
    script: 'phoenix-audit/audit.js', 
    description: 'Validate architectural boundaries',
  },
  { 
    name: 'drift', 
    script: 'phoenix-drift/drift.js', 
    description: 'Detect manual changes vs manifest',
  },
];

// === COMMAND RUNNER ===

function runPhase(script, projectRoot, args = []) {
  return new Promise((resolve) => {
    const scriptPath = join(__dirname, '..', script);
    const child = spawn('node', [scriptPath, projectRoot, ...args], {
      stdio: 'inherit',
      shell: false,
    });
    
    child.on('close', (exitCode) => {
      resolve({ success: exitCode === 0, exitCode: exitCode || 0 });
    });
    
    child.on('error', (err) => {
      console.error(`Error running ${script}: ${err.message}`);
      resolve({ success: false, exitCode: 1 });
    });
  });
}

// === STATE MANAGEMENT ===

function loadState(projectRoot) {
  const statePath = join(projectRoot, '.phoenix', 'state.json');
  if (!existsSync(statePath)) {
    return null;
  }
  return JSON.parse(readFileSync(statePath, 'utf-8'));
}

function updateState(projectRoot, phase, status) {
  const statePath = join(projectRoot, '.phoenix', 'state.json');
  let state = loadState(projectRoot);
  
  if (!state) {
    state = {
      version: '1.0.0',
      project: projectRoot.split('/').pop(),
      pipeline: {},
    };
  }
  
  state.pipeline[phase] = {
    status,
    completed_at: new Date().toISOString(),
  };
  
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
}

// === PIPELINE EXECUTION ===

async function runPipeline(projectRoot, options) {
  const results = [];
  const skipped = [];
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Phoenix Pipeline — Spec-Driven Development                  ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  Spec → Canon → Plan → Protolens → Codegen → Evidence...    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  for (const phase of PHASES) {
    const skipFlag = options[`skip-${phase.name}`];
    
    if (skipFlag) {
      skipped.push(phase.name);
      console.log(`⏭️  Skipping ${phase.name}: ${phase.description}`);
      continue;
    }
    
    console.log(`\n▶ Phase: ${phase.name.toUpperCase()}`);
    console.log(`   ${phase.description}`);
    if (phase.warning) {
      console.log(`   ${phase.warning}`);
    }
    console.log();
    
    const result = await runPhase(phase.script, projectRoot);
    
    results.push({
      phase: phase.name,
      success: result.success,
      exitCode: result.exitCode,
    });
    
    if (result.success) {
      updateState(projectRoot, phase.name, 'complete');
      
      if (phase.name === 'codegen') {
        console.log('   ✅ Generated IU implementations and deliverable');
        console.log('   → Both IU layer and app/ deliverable created');
      }
      if (phase.name === 'evidence') {
        console.log('\n   🟢 Evidence collected — check scores above');
        console.log('   → ACCEPTED: Evidence passes (human OR LLM implementation OK)');
        console.log('   → REJECTED: Need implementation to pass tier requirements');
      }
    } else {
      updateState(projectRoot, phase.name, 'failed');
      console.log(`\n   ❌ Phase ${phase.name} failed`);
      
      if (phase.name === 'evidence') {
        console.log('\n   💡 Implementation needed: fix functions to pass tests');
      }
      
      if (!options['continue-on-error']) {
        console.log('\n   ⚠️  Pipeline halted. Use --continue-on-error to proceed anyway.');
        console.log('   Or use --skip-codegen to preserve implementations and re-evidence.');
        break;
      }
    }
  }
  
  return { results, skipped };
}

// === OPTION PARSING ===

function parseOptions(args) {
  const options = {
    'skip-ingest': false,
    'skip-canonicalize': false,
    'skip-plan': false,
    'skip-protolens': false,
    'skip-codegen': false,
    'skip-evidence': false,
    'skip-audit': false,
    'skip-drift': false,
    'continue-on-error': false,
  };
  
  for (const arg of args) {
    if (arg === '--skip-ingest') options['skip-ingest'] = true;
    if (arg === '--skip-canonicalize') options['skip-canonicalize'] = true;
    if (arg === '--skip-plan') options['skip-plan'] = true;
    if (arg === '--skip-protolens') options['skip-protolens'] = true;
    if (arg === '--skip-codegen') options['skip-codegen'] = true;
    if (arg === '--skip-evidence') options['skip-evidence'] = true;
    if (arg === '--skip-audit') options['skip-audit'] = true;
    if (arg === '--skip-drift') options['skip-drift'] = true;
    if (arg === '--continue-on-error') options['continue-on-error'] = true;
  }
  
  return options;
}

// === MAIN EXECUTION ===

const args = process.argv.slice(2);
const projectRoot = resolve(args[0] || '.');
const options = parseOptions(args.slice(1));

console.log('🚀 Phoenix Pipeline — Spec-Driven Development');
console.log(`   Project: ${projectRoot}`);
if (options['skip-codegen']) {
  console.log(`   Mode: Preserve implementations (--skip-codegen)`);
}
console.log('');

(async () => {
  try {
    // Check for initialized project
    const phoenixDir = join(projectRoot, '.phoenix');
    if (!existsSync(phoenixDir)) {
      console.error('❌ Phoenix project not initialized');
      console.error('   Run: node .pi/skills/phoenix-init/init.js');
      process.exit(1);
    }
    
    // Run pipeline
    const { results, skipped } = await runPipeline(projectRoot, options);
    
    // TDD Summary
    console.log('\n' + '═'.repeat(64));
    console.log('📊 TDD Pipeline Summary');
    console.log('═'.repeat(64));
    console.log('');
    
    const passed = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    for (const result of results) {
      const icon = result.success ? '✓' : '✗';
      console.log(`   ${icon} ${result.phase}`);
    }
    
    for (const phase of skipped) {
      console.log(`   ⏭  ${phase} (skipped)`);
    }
    
    console.log('');
    console.log(`   Passed: ${passed.length}/${results.length}`);
    if (skipped.length > 0) {
      console.log(`   Skipped: ${skipped.length}`);
    }
    console.log('');
    
    if (failed.length > 0) {
      console.log('❌ Pipeline completed with failures');
      console.log('');
      for (const f of failed) {
        console.log(`   ✗ ${f.phase}`);
      }
      
      console.log('');
      console.log('   Fix the failed phases and re-run.');
      console.log('   Use --skip-codegen to preserve implementations during re-run.');
      
      process.exit(1);
    } else {
      console.log('✅ All pipeline phases passed');
      console.log('');
      console.log('   Next steps:');
      console.log('   • Edit specs to add features');
      console.log('   • Re-run pipeline to regenerate code');
      console.log('   • Check status: node .pi/skills/phoenix-status/status.js');
    }
    
  } catch (error) {
    console.error(`\n❌ Pipeline error: ${error.message}`);
    process.exit(1);
  }
})();
