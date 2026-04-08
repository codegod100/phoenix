#!/usr/bin/env node
/**
 * Phoenix Pipeline — TDD with Automated Scaffolding
 * 
 * Phoenix implements Test-Driven Development with optional auto-implementation:
 * 
 *   SPEC → STUB (RED) → IMPLEMENT (GREEN) → EVIDENCE → DELIVERABLE
 *    ↑                                         ↓           ↓
 *    └──────── SELECTIVE INVALIDATION ←───────┘           └→ Deploy
 * 
 * By default, stubs are RED (throw statements). Use --auto-implement to
 * automatically fill in common patterns and go directly to GREEN.
 * 
 * Phases:
 * 1. Ingest - Parse specs into clauses
 * 2. Canonicalize - Extract clean requirements (GREEN)
 * 3. Plan - Create IUs (GREEN)
 * 4. Protolens - Compute selective invalidation (GREEN, optional)
 * 5. Regen - Generate **failing stubs** (RED)
 * 6. Auto-implement - Fill common patterns (GREEN, use --auto-implement)
 * 7. Deliverable - Compose IUs into working application (GREEN)
 * 8. Evidence - Validate implementation (GREEN)
 * 9. Audit - Boundary checks
 * 10. Drift - Detect manual changes
 * 
 * Usage: node .pi/skills/phoenix-pipeline/pipeline.js [project-root] [options]
 * Options:
 *   --auto-implement      Auto-implement RED stubs (go directly to GREEN)
 *   --skip-ingest
 *   --skip-canonicalize
 *   --skip-plan
 *   --skip-protolens      (Skip selective invalidation)
 *   --skip-regen          (Preserve your implementations!)
 *   --skip-deliverable    (Skip deliverable generation)
 *   --skip-evidence
 *   --skip-audit
 *   --skip-drift
 *   --continue-on-error
 *   --selective           (Use panproto for selective regen)
 *   --iu=<iu-id>          (Regenerate specific IU only)
 */

import { spawn } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// === TDD PHASE CONFIGURATION ===

const PHASES = [
  { 
    name: 'ingest', 
    script: 'phoenix-ingest/ingest.js', 
    description: 'Parse specs into content-addressed clauses',
    tdd_phase: 'GREEN' 
  },
  { 
    name: 'canonicalize', 
    script: 'phoenix-canonicalize/canonicalize.js', 
    description: 'Extract clean requirements with traceability',
    tdd_phase: 'GREEN'
  },
  { 
    name: 'plan', 
    script: 'phoenix-plan/plan.js', 
    description: 'Group requirements into Implementation Units',
    tdd_phase: 'GREEN'
  },
  { 
    name: 'protolens', 
    script: null,  // Internal phase - uses panproto
    description: 'Compute selective invalidation via protolens',
    tdd_phase: 'GREEN',
    internal: true  // Handled specially, not a child process
  },
  { 
    name: 'regen', 
    script: 'phoenix-regen/regen.js', 
    description: 'Generate failing stubs (RED) — YOU implement',
    tdd_phase: 'RED',
    warning: '⚠️  DESTRUCTIVE: Overwrites src/generated/*. Edit with care!',
  },
  { 
    name: 'deliverable', 
    script: 'phoenix-deliverable/deliverable.js', 
    description: 'Compose IUs into deliverable (colimit generation)',
    tdd_phase: 'GREEN',
    // No args needed - deliverable infers type from spec
    skipFlag: '--skip-deliverable',
  },
  { 
    name: 'evidence', 
    script: 'phoenix-evidence/evidence.js', 
    description: 'Validate tier requirements (GREEN or REJECTED)',
    tdd_phase: 'GREEN'
  },
  { 
    name: 'audit', 
    script: 'phoenix-audit/audit.js', 
    description: 'Validate architectural boundaries',
    tdd_phase: 'GREEN'
  },
  { 
    name: 'drift', 
    script: 'phoenix-drift/drift.js', 
    description: 'Detect manual changes vs manifest',
    tdd_phase: 'GREEN'
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

// === PROTOLEMNS INTEGRATION ===

/**
 * Run panproto protolens phase to compute IU migration
 * Uses theory morphism to determine which implementations can be lifted vs regenerated
 */
async function runProtolensPhase(projectRoot, options) {
  const { spawn } = await import('child_process');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const { existsSync, readFileSync, writeFileSync } = await import('fs');
  
  const __dirname = dirname(fileURLToPath(import.meta.url));
  
  console.log('   🔍 Computing IU migration via theory morphism...');
  
  const graphsDir = join(projectRoot, '.phoenix', 'graphs');
  const manifestsDir = join(projectRoot, '.phoenix', 'manifests');
  
  const iusPath = join(graphsDir, 'ius.json');
  const canonPath = join(graphsDir, 'canonical.json');
  const manifestPath = join(manifestsDir, 'generated_manifest.json');
  
  // Check if we have previous state for comparison
  const canonPrevPath = join(graphsDir, 'canonical-prev.json');
  const iusPrevPath = join(graphsDir, 'ius-prev.json');
  
  // If no previous state, all IUs need fresh generation (first run)
  if (!existsSync(canonPrevPath) || !existsSync(iusPrevPath)) {
    console.log('   📋 First run - no previous state to migrate from');
    console.log('   📝 All IUs will be generated fresh (no migration possible)');
    
    if (existsSync(iusPath)) {
      const ius = JSON.parse(readFileSync(iusPath, 'utf-8'));
      const migration = {
        timestamp: new Date().toISOString(),
        first_run: true,
        schema_changes: { added: [], removed: [], modified: [] },
        ius: (ius.ius || []).map(iu => ({
          new_iu_id: iu.id,
          new_iu_name: iu.name,
          old_iu_id: null,
          old_iu_name: null,
          overlap_ratio: 0,
          strategy: 'regenerate',
          reason: 'first_run_no_previous_state',
          old_impl_path: null,
          old_test_path: null,
        })),
        summary: { migrate: 0, regenerate: ius.ius?.length || 0, unchanged: 0 },
      };
      
      const migrationPath = join(graphsDir, 'iu-migration.json');
      writeFileSync(migrationPath, JSON.stringify(migration, null, 2));
      console.log(`   🎯 ${migration.summary.regenerate} IUs marked for fresh generation`);
      return { success: true, migration };
    }
    return { success: false, error: 'No IUs found' };
  }
  
  // Run panproto migrate command
  const panprotoPath = join(__dirname, '..', 'panproto', 'panproto.js');
  const migrationPath = join(graphsDir, 'iu-migration.json');
  
  return new Promise((resolve) => {
    const child = spawn('node', [
      panprotoPath,
      'migrate',
      '--old-canon', canonPrevPath,
      '--new-canon', canonPath,
      '--old-ius', iusPrevPath,
      '--new-ius', iusPath,
      '--manifest', manifestPath,
      '--output', migrationPath,
      '--project-root', projectRoot,
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => { 
      stdout += data; 
      process.stdout.write(data); // Stream output to console
    });
    child.stderr?.on('data', (data) => { 
      stderr += data;
      process.stderr.write(data); // Stream errors to console
    });
    
    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        console.log(`   ⚠️  Panproto migration failed (exit ${exitCode})`);
        console.log(`   📝 Falling back to regenerating all IUs`);
        
        // Fallback: mark all for regeneration
        if (existsSync(iusPath)) {
          const ius = JSON.parse(readFileSync(iusPath, 'utf-8'));
          const migration = {
            timestamp: new Date().toISOString(),
            fallback: true,
            schema_changes: { added: [], removed: [], modified: [] },
            ius: (ius.units || []).map(iu => ({
              new_iu_id: iu.id,
              new_iu_name: iu.name,
              old_iu_id: null,
              strategy: 'regenerate',
              reason: 'panproto_fallback',
            })),
            summary: { migrate: 0, regenerate: ius.units?.length || 0, unchanged: 0 },
          };
          writeFileSync(migrationPath, JSON.stringify(migration, null, 2));
          resolve({ success: true, migration, fallback: true });
          return;
        }
        resolve({ success: false, error: 'No IUs found' });
        return;
      }
      
      // Read the generated migration plan
      try {
        const migration = JSON.parse(readFileSync(migrationPath, 'utf-8'));
        console.log(`\n   ✅ Migration plan computed:`);
        console.log(`      Unchanged: ${migration.summary.unchanged}`);
        console.log(`      Migrate: ${migration.summary.migrate}`);
        console.log(`      Regenerate: ${migration.summary.regenerate}`);
        resolve({ success: true, migration });
      } catch (e) {
        console.error(`   ❌ Failed to read migration plan: ${e.message}`);
        resolve({ success: false, error: e.message });
      }
    });
    
    child.on('error', (err) => {
      console.error(`   ⚠️  Panproto error: ${err.message}`);
      resolve({ success: false, error: err.message });
    });
  });
}

// === TDD PIPELINE EXECUTION ===

async function runPipeline(projectRoot, options) {
  const results = [];
  const skipped = [];
  
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Phoenix Pipeline — TDD with Automated Scaffolding           ║');
  console.log('╠══════════════════════════════════════════════════════════════╣');
  console.log('║  RED = Failing stubs    GREEN = Passing evidence             ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  for (const phase of PHASES) {
    const skipFlag = options[`skip-${phase.name}`];
    
    if (skipFlag) {
      skipped.push(phase.name);
      console.log(`⏭️  [${phase.tdd_phase}] Skipping ${phase.name}: ${phase.description}`);
      continue;
    }
    
    // Handle internal protolens phase
    if (phase.internal && phase.name === 'protolens') {
      // Skip if selective regeneration is not enabled
      if (!options.selective) {
        console.log(`⏭️  [${phase.tdd_phase}] Skipping protolens (use --selective to enable)`);
        continue;
      }
      
      const tddIcon = '🟢';
      console.log(`\n${tddIcon} [${phase.tdd_phase}] Phase: ${phase.name.toUpperCase()}`);
      console.log(`   ${phase.description}`);
      console.log('');
      
      const result = await runProtolensPhase(projectRoot, options);
      
      results.push({
        phase: phase.name,
        success: result.success,
        exitCode: result.success ? 0 : 1,
        tdd_phase: phase.tdd_phase,
        affected: result.affected,
        fallback: result.fallback,
      });
      
      if (result.success) {
        updateState(projectRoot, phase.name, 'complete');
        console.log(`   ✅ Protolens computed ${result.affected?.length || 0} affected IUs`);
        if (result.fallback) {
          console.log('   📝 (Using fallback - all IUs affected)');
        }
      } else {
        console.log(`   ❌ Protolens failed: ${result.error}`);
        if (!options['continue-on-error']) {
          break;
        }
      }
      continue;
    }
    
    // Special handling for regen with selective IU
    const args = [];
    if (phase.name === 'regen' && options.iu) {
      args.push(options.iu);
    }
    
    // Pass phase-defined args (e.g., deliverable --detect)
    if (phase.args) {
      args.push(...phase.args);
    }
    
    // If selective mode and we have migration plan, pass it to regen
    if (phase.name === 'regen' && options.selective) {
      const migrationPath = join(projectRoot, '.phoenix', 'graphs', 'iu-migration.json');
      if (existsSync(migrationPath)) {
        const migration = JSON.parse(readFileSync(migrationPath, 'utf-8'));
        const toRegenerate = migration.ius?.filter(iu => iu.strategy === 'regenerate').length || 0;
        const toMigrate = migration.ius?.filter(iu => iu.strategy === 'migrate').length || 0;
        const unchanged = migration.ius?.filter(iu => iu.strategy === 'unchanged').length || 0;
        
        console.log(`   🎯 Migration plan loaded:`);
        console.log(`      ${toMigrate} IUs to migrate (lift old implementation)`);
        console.log(`      ${toRegenerate} IUs to regenerate (fresh stubs)`);
        console.log(`      ${unchanged} IUs unchanged`);
        
        // Pass migration plan path to regen via env var
        process.env.PHOENIX_MIGRATION_PLAN = migrationPath;
      }
    }
    
    const tddIcon = phase.tdd_phase === 'RED' ? '🔴' : '🟢';
    console.log(`\n${tddIcon} [${phase.tdd_phase}] Phase: ${phase.name.toUpperCase()}`);
    console.log(`   ${phase.description}`);
    if (phase.warning) {
      console.log(`   ${phase.warning}`);
    }
    console.log('');
    
    const result = await runPhase(phase.script, projectRoot, args);
    
    results.push({
      phase: phase.name,
      success: result.success,
      exitCode: result.exitCode,
      tdd_phase: phase.tdd_phase,
    });
    
    if (result.success) {
      updateState(projectRoot, phase.name, 'complete');
      
      // TDD-specific messaging
      if (phase.name === 'regen') {
        if (options['auto-implement']) {
          // Run pattern-based implement immediately after regen (no LLM needed)
          console.log('\n   🔴 Stubs generated with throw statements');
          console.log('   🔧 Applying pattern implementations...');
          
          const autoImplResult = await runPhase(
            'phoenix-regen/implement-patterns.js',
            projectRoot,
            [projectRoot]
          );
          
          if (autoImplResult.success) {
            console.log('   🟢 Pattern implement complete');
            updateState(projectRoot, 'auto-implement', 'complete');
          } else {
            console.log('   ⚠️  Pattern implement had issues, continuing...');
          }
        } else {
          console.log('\n   🔴 Stubs generated with throw statements');
          console.log('   → Next: Implement functions (you OR LLM)');
          console.log('   → Replace throw with real logic');
          console.log('   → Run evidence to verify (GREEN)');
          console.log('   → Or use --auto-implement to fill common patterns automatically');
        }
      }
      if (phase.name === 'evidence') {
        console.log('\n   🟢 Evidence collected — check scores above');
        console.log('   → ACCEPTED: Evidence passes (human OR LLM implementation OK)');
        console.log('   → REJECTED: Need implementation to pass tier requirements');
      }
    } else {
      updateState(projectRoot, phase.name, 'failed');
      console.log(`\n   ❌ Phase ${phase.name} failed`);
      
      // TDD guidance for failures
      if (phase.name === 'evidence') {
        console.log('\n   💡 Implementation needed:');
        console.log('      Stubs are RED by design (throw statements)');
        console.log('      Human OR LLM must implement to make them GREEN');
      }
      
      if (!options['continue-on-error']) {
        console.log('\n   ⚠️  Pipeline halted. Use --continue-on-error to proceed anyway.');
        console.log('   Or use --skip-regen to preserve implementations and re-evidence.');
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
      console.log('   Next Steps (choose one):');
      console.log('   1. Manual: Edit src/generated/*/index.ts (replace throw with logic)');
      console.log('   2. Auto: Use LLM to implement from spec + stub');
      console.log('   3. Hybrid: LLM does LOW tiers, you do HIGH tiers');
      console.log('');
      console.log('   Then: node .pi/skills/phoenix-evidence/evidence.js .');
      console.log('   Once GREEN: run full pipeline with --skip-regen');
      
      process.exit(1);
    } else {
      console.log('✅ All pipeline phases passed');
      console.log('');
      console.log('   🎯 TDD Status: All IUs meeting tier requirements!');
      console.log('');
      console.log('   Next steps:');
      console.log('   • Edit specs to add features');
      console.log('   • Re-run pipeline (selective invalidation preserves work)');
      console.log('   • Check status: node .pi/skills/phoenix-status/status.js');
    }
    
  } catch (error) {
    console.error(`\n❌ Pipeline error: ${error.message}`);
    process.exit(1);
  }
})();
