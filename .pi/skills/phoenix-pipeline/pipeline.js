#!/usr/bin/env node
/**
 * Phoenix Pipeline - Complete Phoenix VCS pipeline
 * 
 * Runs all phases in sequence:
 * 1. Ingest - Parse spec files
 * 2. Canonicalize - Extract clean requirements
 * 3. Plan - Create IUs
 * 4. Regen - Generate code
 * 5. Evidence - Collect evidence
 * 6. Audit - Validate boundaries
 * 7. Drift - Detect drift
 * 
 * Usage: node .pi/skills/phoenix-pipeline/pipeline.js [project-root] [options]
 * Options:
 *   --skip-ingest
 *   --skip-canonicalize
 *   --skip-plan
 *   --skip-regen
 *   --skip-evidence
 *   --skip-audit
 *   --skip-drift
 *   --iu=<iu-id>    (selective regeneration)
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === CONFIGURATION ===

const PHASES = [
  { name: 'ingest', script: 'phoenix-ingest/ingest.js', description: 'Parse spec files' },
  { name: 'canonicalize', script: 'phoenix-canonicalize/canonicalize.js', description: 'Extract requirements' },
  { name: 'plan', script: 'phoenix-plan/plan.js', description: 'Create IUs' },
  { name: 'regen', script: 'phoenix-regen/regen.js', description: 'Generate code' },
  { name: 'evidence', script: 'phoenix-evidence/evidence.js', description: 'Collect evidence' },
  { name: 'audit', script: 'phoenix-audit/audit.js', description: 'Validate boundaries' },
  { name: 'drift', script: 'phoenix-drift/drift.js', description: 'Detect drift' },
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
  console.log('║  Phoenix Pipeline — Complete VCS Workflow                    ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  for (const phase of PHASES) {
    const skipFlag = options[`skip-${phase.name}`];
    
    if (skipFlag) {
      skipped.push(phase.name);
      console.log(`⏭️  Skipping ${phase.name}: ${phase.description}`);
      continue;
    }
    
    // Special handling for regen with selective IU
    const args = [];
    if (phase.name === 'regen' && options.iu) {
      args.push(options.iu);
    }
    
    console.log(`\n🔷 Phase: ${phase.name.toUpperCase()}`);
    console.log(`   ${phase.description}`);
    console.log('');
    
    const result = await runPhase(phase.script, projectRoot, args);
    
    results.push({
      phase: phase.name,
      success: result.success,
      exitCode: result.exitCode,
    });
    
    if (result.success) {
      updateState(projectRoot, phase.name, 'complete');
    } else {
      updateState(projectRoot, phase.name, 'failed');
      console.log(`\n❌ Phase ${phase.name} failed`);
      
      // Ask whether to continue
      if (!options['continue-on-error']) {
        console.log('\n⚠️  Pipeline halted. Use --continue-on-error to proceed anyway.');
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
    'skip-regen': false,
    'skip-evidence': false,
    'skip-audit': false,
    'skip-drift': false,
    'continue-on-error': false,
    'iu': null,
  };
  
  for (const arg of args) {
    if (arg === '--skip-ingest') options['skip-ingest'] = true;
    if (arg === '--skip-canonicalize') options['skip-canonicalize'] = true;
    if (arg === '--skip-plan') options['skip-plan'] = true;
    if (arg === '--skip-regen') options['skip-regen'] = true;
    if (arg === '--skip-evidence') options['skip-evidence'] = true;
    if (arg === '--skip-audit') options['skip-audit'] = true;
    if (arg === '--skip-drift') options['skip-drift'] = true;
    if (arg === '--continue-on-error') options['continue-on-error'] = true;
    if (arg.startsWith('--iu=')) options.iu = arg.split('=')[1];
  }
  
  return options;
}

// === MAIN EXECUTION ===

const args = process.argv.slice(2);
const projectRoot = resolve(args[0] || '.');
const options = parseOptions(args.slice(1));

console.log('🚀 Phoenix Pipeline');
console.log(`   Project: ${projectRoot}`);
if (options.iu) {
  console.log(`   Selective IU: ${options.iu}`);
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
    
    // Summary
    console.log('\n' + '═'.repeat(64));
    console.log('📊 Pipeline Summary');
    console.log('═'.repeat(64));
    console.log('');
    
    const passed = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    for (const result of results) {
      const icon = result.success ? '✅' : '❌';
      console.log(`   ${icon} ${result.phase}`);
    }
    
    for (const phase of skipped) {
      console.log(`   ⏭️  ${phase} (skipped)`);
    }
    
    console.log('');
    console.log(`   Passed: ${passed.length}/${results.length}`);
    if (skipped.length > 0) {
      console.log(`   Skipped: ${skipped.length}`);
    }
    console.log('');
    
    if (failed.length > 0) {
      console.log('❌ Pipeline completed with failures');
      console.log('   Failed phases:');
      for (const f of failed) {
        console.log(`      - ${f.phase}`);
      }
      console.log('');
      console.log('   Check individual phase outputs for details');
      process.exit(1);
    } else {
      console.log('✅ Pipeline completed successfully');
      console.log('');
      console.log('   Next steps:');
      console.log('   • Review generated code in src/generated/');
      console.log('   • Run tests: npm test');
      console.log('   • Check status: node .pi/skills/phoenix-status/status.js');
    }
    
  } catch (error) {
    console.error(`\n❌ Pipeline error: ${error.message}`);
    process.exit(1);
  }
})();
