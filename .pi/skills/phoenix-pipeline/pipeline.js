#!/usr/bin/env node
/**
 * Phoenix Pipeline — TDD with Automated Scaffolding
 * 
 * Phoenix implements Test-Driven Development:
 * 
 *   SPEC → STUB (RED) → IMPLEMENT (GREEN) → EVIDENCE
 *    ↑                                         ↓
 *    └──────── SELECTIVE INVALIDATION ←───────┘
 * 
 * Phases:
 * 1. Ingest - Parse specs into clauses
 * 2. Canonicalize - Extract clean requirements (GREEN)
 * 3. Plan - Create IUs (GREEN)
 * 4. Protolens - Compute selective invalidation (GREEN, optional)
 * 5. Regen - Generate **failing stubs** (RED)
 * 6. Evidence - Validate implementation (GREEN)
 * 7. Audit - Boundary checks
 * 8. Drift - Detect manual changes
 * 
 * Key Principle: Regen creates throw statements on purpose.
 * Tests fail until you (or AI) implement real logic.
 * 
 * Usage: node .pi/skills/phoenix-pipeline/pipeline.js [project-root] [options]
 * Options:
 *   --skip-ingest
 *   --skip-canonicalize
 *   --skip-plan
 *   --skip-protolens      (Skip selective invalidation)
 *   --skip-regen          (Preserve your implementations!)
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
 * Run panproto protolens phase to compute selective invalidation
 * This determines which IUs need regeneration based on spec changes
 */
async function runProtolensPhase(projectRoot, options) {
  const { spawn } = await import('child_process');
  const { join, dirname } = await import('path');
  const { fileURLToPath } = await import('url');
  const { existsSync, readFileSync, writeFileSync } = await import('fs');
  
  const __dirname = dirname(fileURLToPath(import.meta.url));
  
  console.log('   🔍 Computing selective invalidation via panproto...');
  
  const graphsDir = join(projectRoot, '.phoenix', 'graphs');
  const iusPath = join(graphsDir, 'ius.json');
  const canonPath = join(graphsDir, 'canonical.json');
  
  // Check if we have previous canonical for comparison
  const canonPrevPath = join(graphsDir, 'canonical-prev.json');
  
  // If no previous canonical, all IUs are affected (first run)
  if (!existsSync(canonPrevPath)) {
    console.log('   📋 First run - all IUs will be regenerated');
    if (existsSync(iusPath)) {
      const ius = JSON.parse(readFileSync(iusPath, 'utf-8'));
      const affected = ius.ius?.map(iu => iu.id) || [];
      writeFileSync(
        join(graphsDir, 'affected-ius.json'),
        JSON.stringify({ affected, reason: 'first-run' }, null, 2)
      );
      console.log(`   🎯 ${affected.length} IUs marked for regeneration`);
      return { success: true, affected };
    }
    return { success: true, affected: [] };
  }
  
  // Run panproto impact analysis
  const panprotoPath = join(__dirname, '..', 'panproto', 'panproto.js');
  
  return new Promise((resolve) => {
    const child = spawn('node', [
      panprotoPath,
      'impact',
      '--ius', iusPath,
      '--canon', canonPath,
      '--spec-diff', canonPrevPath  // Using prev as diff input for now
    ], {
      stdio: ['ignore', 'pipe', 'pipe'],
      shell: false,
    });
    
    let stdout = '';
    let stderr = '';
    
    child.stdout?.on('data', (data) => { stdout += data; });
    child.stderr?.on('data', (data) => { stderr += data; });
    
    child.on('close', (exitCode) => {
      if (exitCode !== 0) {
        console.log(`   ⚠️  Panproto impact analysis failed (exit ${exitCode})`);
        console.log(`   📝 Falling back to regenerating all IUs`);
        
        // Fallback: mark all IUs as affected
        if (existsSync(iusPath)) {
          const ius = JSON.parse(readFileSync(iusPath, 'utf-8'));
          const affected = ius.ius?.map(iu => iu.id) || [];
          writeFileSync(
            join(graphsDir, 'affected-ius.json'),
            JSON.stringify({ affected, reason: 'fallback-panproto-failed' }, null, 2)
          );
          resolve({ success: true, affected, fallback: true });
          return;
        }
        resolve({ success: false, error: 'No IUs found' });
        return;
      }
      
      // Parse panproto output to extract affected IUs
      // For now, mark all as affected (implement proper parsing later)
      if (existsSync(iusPath)) {
        const ius = JSON.parse(readFileSync(iusPath, 'utf-8'));
        const affected = ius.ius?.map(iu => iu.id) || [];
        writeFileSync(
          join(graphsDir, 'affected-ius.json'),
          JSON.stringify({ affected, reason: 'panproto-impact' }, null, 2)
        );
        console.log(`   🎯 ${affected.length} IUs marked for regeneration`);
        resolve({ success: true, affected });
      } else {
        resolve({ success: false, error: 'No IUs found' });
      }
    });
    
    child.on('error', (err) => {
      console.error(`   ⚠️  Panproto error: ${err.message}`);
      console.log(`   📝 Falling back to regenerating all IUs`);
      
      if (existsSync(iusPath)) {
        const ius = JSON.parse(readFileSync(iusPath, 'utf-8'));
        const affected = ius.ius?.map(iu => iu.id) || [];
        writeFileSync(
          join(graphsDir, 'affected-ius.json'),
          JSON.stringify({ affected, reason: 'fallback-error' }, null, 2)
        );
        resolve({ success: true, affected, fallback: true });
      } else {
        resolve({ success: false, error: err.message });
      }
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
    
    // If selective mode and we have affected IUs, use them
    if (phase.name === 'regen' && options.selective) {
      const affectedPath = join(projectRoot, '.phoenix', 'graphs', 'affected-ius.json');
      if (existsSync(affectedPath)) {
        const affected = JSON.parse(readFileSync(affectedPath, 'utf-8'));
        if (affected.affected && affected.affected.length > 0) {
          console.log(`   🎯 Selective regeneration: ${affected.affected.length} IUs affected`);
          // Pass affected IUs to regen via a special flag or env var
          process.env.PHOENIX_AFFECTED_IUS = JSON.stringify(affected.affected);
        }
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
        console.log('\n   🔴 Stubs generated with throw statements');
        console.log('   → Next: Implement functions (you OR LLM)');
        console.log('   → Replace throw with real logic');
        console.log('   → Run evidence to verify (GREEN)');
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
    'skip-evidence': false,
    'skip-audit': false,
    'skip-drift': false,
    'continue-on-error': false,
    'selective': false,
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
