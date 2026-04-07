#!/usr/bin/env node
/**
 * Phoenix Status - Unified VCS diagnostics
 * 
 * Self-contained skill - no external dependencies except Node.js stdlib
 * 
 * Usage: node .pi/skills/phoenix-status/status.js [project-root]
 */

import { readFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve } from 'path';

// === VCS IDENTITY FUNCTIONS (inlined) ===

function canonId(text) {
  return createHash('sha256').update(text).digest('hex');
}

function fileHash(content) {
  return canonId(content);
}

// === VCS DRIFT FUNCTIONS (inlined) ===

function loadManifest(projectRoot) {
  const manifestPath = join(projectRoot, '.phoenix/manifests/generated_manifest.json');
  if (!existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

function detectDrift(projectRoot, manifest) {
  const results = [];
  let hasBlockingDrift = false;
  
  for (const [filePath, expected] of Object.entries(manifest.files || {})) {
    const fullPath = join(projectRoot, filePath);
    
    if (!existsSync(fullPath)) {
      results.push({
        file: filePath,
        status: 'MISSING',
        is_blocking: true
      });
      hasBlockingDrift = true;
      continue;
    }
    
    const content = readFileSync(fullPath, 'utf-8');
    const actualHash = fileHash(content);
    
    if (actualHash !== expected.hash) {
      results.push({
        file: filePath,
        status: 'MODIFIED',
        is_blocking: true
      });
      hasBlockingDrift = true;
    } else {
      results.push({
        file: filePath,
        status: 'CLEAN',
        is_blocking: false
      });
    }
  }
  
  return {
    has_blocking_drift: hasBlockingDrift,
    summary: {
      clean: results.filter(r => r.status === 'CLEAN').length,
      modified: results.filter(r => r.status === 'MODIFIED').length,
      missing: results.filter(r => r.status === 'MISSING').length,
      total: results.length
    }
  };
}

// === VCS STATUS FUNCTIONS (inlined) ===

async function getVCSStatus(projectRoot) {
  const diagnostics = [];
  let overallStatus = 'HEALTHY';
  
  // Load state
  const statePath = join(projectRoot, '.phoenix/state.json');
  let state = { bootstrap_state: 'BOOTSTRAP_COLD', d_rate_data: { counts: {}, total: 0 } };
  if (existsSync(statePath)) {
    state = JSON.parse(readFileSync(statePath, 'utf-8'));
  }
  
  // D-rate check
  const dRateData = state.d_rate_data || { counts: { D: 0 }, total: 1 };
  const dCount = dRateData.counts?.D || 0;
  const total = dRateData.total || 1;
  const dRate = dCount / total;
  
  let dRateLevel;
  if (dRate < 0.05) dRateLevel = 'TARGET';
  else if (dRate < 0.10) dRateLevel = 'ACCEPTABLE';
  else if (dRate < 0.15) dRateLevel = 'WARNING';
  else dRateLevel = 'ALARM';
  
  if (dRateLevel === 'ALARM' && state.bootstrap_state === 'STEADY_STATE') {
    overallStatus = 'CRITICAL';
    diagnostics.push({
      severity: 'error',
      category: 'classification',
      message: `D-rate ${(dRate * 100).toFixed(1)}% exceeds 15% threshold`,
      recommended_actions: ['Review canonicalization logic', 'Check for spec instability']
    });
  }
  
  // Drift check
  const manifest = loadManifest(projectRoot);
  let driftReport = null;
  if (manifest) {
    driftReport = detectDrift(projectRoot, manifest);
    if (driftReport.has_blocking_drift) {
      overallStatus = 'CRITICAL';
      diagnostics.push({
        severity: 'error',
        category: 'drift',
        message: `${driftReport.summary.modified} modified, ${driftReport.summary.missing} missing files`,
        recommended_actions: ['Revert manual edits', 'Create waiver', 'Regenerate from spec']
      });
    }
  }
  
  // Load IU graph
  const iusPath = join(projectRoot, '.phoenix/graphs/ius.json');
  let iuCount = 0;
  let edgeCount = 0;
  if (existsSync(iusPath)) {
    const iusData = JSON.parse(readFileSync(iusPath, 'utf-8'));
    iuCount = iusData.ius?.length || 0;
    edgeCount = iusData.ius?.reduce((sum, iu) => sum + (iu.dependencies?.length || 0), 0) || 0;
  }
  
  return {
    status: overallStatus,
    bootstrap: state.bootstrap_state,
    classification: {
      d_rate: dRate,
      level: dRateLevel,
      target: 0.05
    },
    drift: driftReport ? {
      has_drift: driftReport.has_blocking_drift,
      clean: driftReport.summary.clean,
      modified: driftReport.summary.modified,
      missing: driftReport.summary.missing
    } : null,
    graph: {
      iu_count: iuCount,
      edge_count: edgeCount
    },
    diagnostics
  };
}

function formatVCSStatus(state) {
  const lines = [];
  const icon = state.status === 'HEALTHY' ? '🟢' : state.status === 'WARNING' ? '🟡' : '🔴';
  
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push(`║  Phoenix VCS Status                           ${icon} ${state.status.padEnd(7)} ║`);
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  const bootstrapIcon = state.bootstrap === 'STEADY_STATE' ? '✅' : '⏳';
  lines.push(`Bootstrap: ${bootstrapIcon} ${state.bootstrap}`);
  
  const dRatePct = (state.classification.d_rate * 100).toFixed(1);
  const dRateIcon = state.classification.level === 'TARGET' ? '✅' : 
                    state.classification.level === 'ACCEPTABLE' ? '✅' :
                    state.classification.level === 'WARNING' ? '⚠️' : '❌';
  lines.push(`Classification: ${dRateIcon} D-rate ${dRatePct}% (${state.classification.level})`);
  
  if (state.drift) {
    const driftIcon = state.drift.has_drift ? '❌' : '✅';
    lines.push(`Drift: ${driftIcon} ${state.drift.clean} clean, ${state.drift.modified} modified, ${state.drift.missing} missing`);
  }
  
  lines.push(`Graph: ${state.graph.iu_count} nodes, ${state.graph.edge_count} edges`);
  lines.push('');
  
  if (state.diagnostics.length > 0) {
    lines.push('Diagnostics:');
    for (const d of state.diagnostics) {
      const sevIcon = d.severity === 'error' ? '❌' : d.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`  ${sevIcon} [${d.category.toUpperCase()}] ${d.message}`);
      for (const action of d.recommended_actions) {
        lines.push(`     → ${action}`);
      }
    }
    lines.push('');
  }
  
  const statusText = state.status === 'HEALTHY' ? 'All VCS checks passed' : 'Issues detected - see above';
  lines.push(`Status: ${icon} ${statusText}`);
  
  return lines.join('\n');
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');

console.log('🔍 Phoenix VCS Status');
console.log(`   Project: ${projectRoot}\n`);

try {
  const state = await getVCSStatus(projectRoot);
  console.log(formatVCSStatus(state));
  
  process.exit(state.status === 'HEALTHY' ? 0 : 1);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
