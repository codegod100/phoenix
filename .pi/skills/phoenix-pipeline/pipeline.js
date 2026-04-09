#!/usr/bin/env node
/**
 * Phoenix Pipeline — Spec-Driven Code Generation
 * 
 *   SPEC ──[μ_ingest]──► CLAUSE ──[μ_canon]──► CANON ──[μ_plan]──► IU ──[μ_codegen]──► CODE
 * 
 * Each arrow is a lensing morphism (structure-preserving theory map):
 * - μ_ingest: ThSpec → ThClause (parsing lens)
 * - μ_canon: ThClause → ThCanon (quotient lens - collapses duplicates)
 * - μ_plan: ThCanon → ThIU (partition lens - groups by domain)
 * - μ_codegen: ThIU → ThCode (generative lens - constructs implementations)
 * 
 * The composition μ_total = μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest is a functor
 * from specifications to code. GAT validation enforces mathematical correctness.
 * 
 * Phases:
 * 1. ingest      - μ_ingest: Parse specs into content-addressed clauses
 * 2. canonicalize - μ_canon: Extract clean requirements, collapse duplicates
 * 3. plan         - μ_plan: Group requirements into Implementation Units
 * 4. codegen      - μ_codegen: Generate IU implementations
 * 5. evidence     - Collect validation metrics
 * 6. audit        - Validate architectural boundaries
 * 7. drift        - Detect manual changes
 * 8. gat          - Validate Generalized Algebraic Theory axioms
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
 *   --skip-gat            (Skip GAT validation)
 *   --strict-evidence      (Legacy TDD mode - fail on test failures)
 *   --strict-gat          (Fail pipeline on GAT axiom violations)
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
    description: 'μ_ingest: ThSpec → ThClause (lensing morphism)',
  },
  { 
    name: 'canonicalize', 
    script: 'phoenix-canonicalize/canonicalize.js', 
    description: 'μ_canon: ThClause → ThCanon (quotient morphism)',
  },
  { 
    name: 'plan', 
    script: 'phoenix-plan/plan.js', 
    description: 'μ_plan: ThCanon → ThIU (partition morphism)',
  },
  { 
    name: 'codegen', 
    script: 'phoenix-codegen/codegen.js', 
    description: 'μ_codegen: ThIU → ThCode (generative morphism)',
    warning: '⚠️  DESTRUCTIVE: Overwrites src/generated/*. Edit with care!',
  },
  { 
    name: 'evidence', 
    script: 'phoenix-evidence/evidence.js', 
    description: 'Validate evidence tiers (informational only)',
    blocking: false,
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
    blocking: false,
  },
  { 
    name: 'gat', 
    script: 'phoenix/validate-gat.js', 
    description: 'Validate GAT axioms (mathematical enforcement)',
    blocking: false,
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
  console.log('║  Phoenix Pipeline — Spec-Driven Code Generation            ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  SPEC ──[μ_ingest]──► CLAUSE ──[μ_canon]──► CANON ──[μ_plan] ║');
  console.log('║                    ──[μ_codegen]──► CODE                     ║');
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
    
    // Run the phase
    const result = await runPhase(phase.script, projectRoot, phase.args || []);
    
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
        console.log('\n   📊 Evidence collected — review scores above');
        console.log('   → Use --strict-evidence for legacy TDD mode');
      }
    } else {
      updateState(projectRoot, phase.name, 'failed');
      
      // Evidence is non-blocking by default
      if (phase.name === 'evidence' && !phase.blocking && !options['strict-evidence']) {
        console.log(`\n   ⚠️  Phase ${phase.name} has issues (non-blocking)`);
        continue;
      }
      
      console.log(`\n   ❌ Phase ${phase.name} failed`);
      
      if (!options['strict-evidence']) {
        console.log('\n   ⚠️  Pipeline halted. Use --strict-evidence to fail on evidence issues.');
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
    'skip-codegen': false,
    'skip-evidence': false,
    'skip-audit': false,
    'skip-drift': false,
    'skip-gat': false,
    'strict-evidence': false,
    'strict-gat': false,
  };
  
  for (const arg of args) {
    if (arg === '--skip-ingest') options['skip-ingest'] = true;
    if (arg === '--skip-canonicalize') options['skip-canonicalize'] = true;
    if (arg === '--skip-plan') options['skip-plan'] = true;
    if (arg === '--skip-codegen') options['skip-codegen'] = true;
    if (arg === '--skip-evidence') options['skip-evidence'] = true;
    if (arg === '--skip-audit') options['skip-audit'] = true;
    if (arg === '--skip-drift') options['skip-drift'] = true;
    if (arg === '--skip-gat') options['skip-gat'] = true;
    if (arg === '--strict-evidence') options['strict-evidence'] = true;
    if (arg === '--strict-gat') options['strict-gat'] = true;
  }
  
  return options;
}

// === MAIN EXECUTION ===

const args = process.argv.slice(2);
const projectRoot = resolve(args[0] || '.');
const options = parseOptions(args.slice(1));

console.log('🚀 Phoenix Pipeline — Spec-Driven Code Generation');
console.log(`   Project: ${projectRoot}`);
if (options['skip-codegen']) {
  console.log(`   Mode: Preserve implementations (--skip-codegen)`);
}
if (options['strict-evidence']) {
  console.log(`   Mode: Strict evidence checking (--strict-evidence)`);
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
    
    // Pipeline Summary
    console.log('\n' + '═'.repeat(64));
    console.log('📊 Pipeline Summary');
    console.log('═'.repeat(64));
    console.log('');
    
    const passed = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);
    
    // Separate non-blocking failures from critical failures
    const nonBlockingPhases = ['evidence', 'drift'];
    const criticalFailed = failed.filter(f => !nonBlockingPhases.includes(f.phase));
    const warningFailed = failed.filter(f => nonBlockingPhases.includes(f.phase));
    
    for (const result of results) {
      const icon = result.success ? '✓' : (nonBlockingPhases.includes(result.phase) ? '⚠' : '✗');
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
    if (warningFailed.length > 0) {
      console.log(`   Warnings: ${warningFailed.map(w => w.phase).join(', ')} (non-blocking)`);
    }
    console.log('');
    
    // In strict mode, warnings become failures
    const effectiveFailures = options['strict-evidence'] 
      ? [...criticalFailed, ...warningFailed] 
      : criticalFailed;
    
    if (effectiveFailures.length > 0) {
      console.log('❌ Pipeline completed with failures');
      console.log('');
      for (const f of effectiveFailures) {
        console.log(`   ✗ ${f.phase}`);
      }
      
      console.log('');
      console.log('   Fix the failed phases and re-run.');
      console.log('   Use --skip-codegen to preserve implementations during re-run.');
      
      process.exit(1);
    } else {
      console.log('✅ Pipeline complete');
      console.log('');
      console.log('   Next steps:');
      console.log('   • Test the generated code');
      console.log('   • Edit specs to add features');
      console.log('   • Re-run pipeline to regenerate');
      console.log('   • Use --strict-evidence to fail on test failures');
    }
    
  } catch (error) {
    console.error(`\n❌ Pipeline error: ${error.message}`);
    process.exit(1);
  }
})();
