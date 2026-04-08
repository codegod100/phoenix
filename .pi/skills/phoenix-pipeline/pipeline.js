#!/usr/bin/env node
/**
 * Phoenix Pipeline — Spec-Driven Development
 * 
 *   SPEC → CANON → PLAN → CODEGEN → EVIDENCE → AUDIT → DRIFT
 *    ↑                              ↓
 *    └──────── MANUAL EDITS ───────┘
 * 
 * All code generation happens in single CODEGEN phase at the end.
 * The deliverable is generated along with IU implementations.
 * 
 * Phases:
 * 1. Ingest - Parse specs into clauses
 * 2. Canonicalize - Extract clean requirements
 * 3. Plan - Create IUs with boundary exports
 * 4. Codegen - Generate IU implementations AND deliverable
 * 5. Evidence - Validate implementation
 * 6. Audit - Boundary checks
 * 7. Drift - Detect manual changes
 * 
 * Usage: node .pi/skills/phoenix-pipeline/pipeline.js [project-root] [options]
 * Options:
 *   --skip-ingest
 *   --skip-canonicalize
 *   --skip-plan
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
  console.log('║  Spec → Canon → Plan → Codegen → Evidence → Audit → Drift   ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  for (const phase of PHASES) {
    const skipFlag = options[`skip-${phase.name}`];
    
    if (skipFlag) {
      skipped.push(phase.name);
      console.log(`⏭️  [GREEN] Skipping ${phase.name}: ${phase.description}`);
      continue;
    }
    
    console.log(`\n🟢 [GREEN] Phase: ${phase.name.toUpperCase()}`);
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
      tdd_phase: 'GREEN',
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
    'skip-regen': false,
    'skip-deliverable': false,
    'skip-evidence': false,
    'skip-audit': false,
    'skip-drift': false,
    'continue-on-error': false,
    'selective': false,
    'auto-implement': false,
    'iu': null,
  };
  
  for (const arg of args) {
    if (arg === '--skip-ingest') options['skip-ingest'] = true;
    if (arg === '--skip-canonicalize') options['skip-canonicalize'] = true;
    if (arg === '--skip-plan') options['skip-plan'] = true;
    if (arg === '--skip-protolens') options['skip-protolens'] = true;
    if (arg === '--skip-regen') options['skip-regen'] = true;
    if (arg === '--skip-evidence') options['skip-evidence'] = true;
    if (arg === '--skip-audit') options['skip-audit'] = true;
    if (arg === '--skip-drift') options['skip-drift'] = true;
    if (arg === '--continue-on-error') options['continue-on-error'] = true;
    if (arg === '--selective') options.selective = true;
    if (arg === '--auto-implement') options['auto-implement'] = true;
    if (arg.startsWith('--iu=')) options.iu = arg.split('=')[1];
  }
  
  return options;
}

// === MAIN EXECUTION ===

const args = process.argv.slice(2);
const projectRoot = resolve(args[0] || '.');
const options = parseOptions(args.slice(1));

console.log('🚀 Phoenix Pipeline — TDD with Automated Scaffolding');
console.log(`   Project: ${projectRoot}`);
if (options.iu) {
  console.log(`   Selective IU: ${options.iu}`);
}
if (options.selective) {
  console.log(`   Mode: Selective regeneration (--selective) via panproto`);
}
if (options['auto-implement']) {
  console.log(`   Mode: Auto-implement (--auto-implement) RED→GREEN in one step`);
}
if (options['skip-regen']) {
  console.log(`   Mode: Preserve implementations (--skip-regen)`);
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
    
    const greenPhases = results.filter(r => r.tdd_phase === 'GREEN');
    const redPhases = results.filter(r => r.tdd_phase === 'RED');
    const passed = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    for (const result of results) {
      const icon = result.success ? '🟢' : '🔴';
      const tdd = result.tdd_phase;
      console.log(`   ${icon} [${tdd}] ${result.phase}`);
    }
    
    for (const phase of skipped) {
      const phaseConfig = PHASES.find(p => p.name === phase);
      const tdd = phaseConfig?.tdd_phase || '?';
      console.log(`   ⏭️  [${tdd}] ${phase} (skipped)`);
    }
    
    console.log('');
    console.log(`   Passed: ${passed.length}/${results.length}`);
    console.log(`   GREEN phases: ${greenPhases.filter(r => r.success).length}/${greenPhases.length}`);
    console.log(`   RED phases: ${redPhases.filter(r => r.success).length}/${redPhases.length}`);
    if (skipped.length > 0) {
      console.log(`   Skipped: ${skipped.length}`);
    }
    console.log('');
    
    if (failed.length > 0) {
      console.log('❌ Pipeline completed with failures');
      console.log('');
      const redFailed = failed.filter(f => f.tdd_phase === 'RED');
      const greenFailed = failed.filter(f => f.tdd_phase === 'GREEN');
      
      if (redFailed.length > 0) {
        console.log('   🔴 RED Phase Failures (expected until implemented):');
        for (const f of redFailed) {
          console.log(`      - ${f.phase}: Stubs generated, implement to proceed`);
        }
      }
      
      if (greenFailed.length > 0) {
        console.log('   🟢 GREEN Phase Failures (requires attention):');
        for (const f of greenFailed) {
          console.log(`      - ${f.phase}`);
        }
      }
      
      console.log('');
      console.log('   Next Steps:');
      console.log('   1. Manual: Edit src/generated/*/index.ts (implement functions)');
      console.log('   2. Auto: Use LLM to implement from spec');
      console.log('');
      console.log('   Then: node .pi/skills/phoenix-evidence/evidence.js .');
      console.log('   Once passing: run full pipeline with --skip-codegen');
      
      process.exit(1);
    } else {
      console.log('✅ All pipeline phases passed');
      console.log('');
      console.log('   🎯 All IUs meeting tier requirements!');
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
