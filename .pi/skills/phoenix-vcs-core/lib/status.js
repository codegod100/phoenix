/**
 * Status - Unified diagnostics
 */

import { loadManifest, detectDrift } from './drift.js';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { DRateTracker, BootstrapStateMachine } from './identity.js';

/**
 * Get complete VCS status
 */
export async function getVCSStatus(projectRoot) {
  const diagnostics = [];
  let overallStatus = 'HEALTHY';
  
  // Load state
  const statePath = join(projectRoot, '.phoenix/state.json');
  let state = { bootstrap_state: 'BOOTSTRAP_COLD', d_rate_data: { A: 0, B: 0, C: 0, D: 0, total: 0 } };
  if (existsSync(statePath)) {
    state = JSON.parse(readFileSync(statePath, 'utf-8'));
  }
  
  // D-rate check
  const tracker = new DRateTracker();
  Object.entries(state.d_rate_data?.counts || {}).forEach(([k, v]) => {
    tracker.counts[k] = v;
  });
  tracker.total = state.d_rate_data?.total || 0;
  
  const dRateStatus = tracker.getStatus();
  if (dRateStatus.level === 'ALARM' && state.bootstrap_state === 'STEADY_STATE') {
    overallStatus = 'CRITICAL';
    diagnostics.push({
      severity: 'error',
      category: 'classification',
      subject: 'system',
      message: `D-rate ${(dRateStatus.dRate * 100).toFixed(1)}% exceeds 15% threshold`,
      recommended_actions: ['Review canonicalization logic', 'Retrain classifier', 'Check for spec instability']
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
        subject: 'working-tree',
        message: `${driftReport.summary.modified} modified, ${driftReport.summary.missing} missing files`,
        recommended_actions: ['Revert manual edits', 'Create waiver for intentional changes', 'Regenerate from spec']
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
      d_rate: dRateStatus.dRate,
      level: dRateStatus.level,
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

/**
 * Format VCS status for display
 */
export function formatVCSStatus(state) {
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
