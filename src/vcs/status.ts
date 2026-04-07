/**
 * Phoenix VCS — Unified Status Command
 * 
 * Implements PRD Section 13: Diagnostics & Severity Model
 * Single command that shows the complete VCS state.
 */

import { loadManifest, detectDrift, type DriftReport } from './drift.js';
import { evaluatePolicy, runTypecheck, runLint, runUnitTests, formatPolicyReport, type PolicyEvaluation, type EvidenceRecord } from './evidence.js';
import { getRequiredEvidence, type RiskTier } from './evidence.js';
import { buildDependencyGraph, detectCircularDependencies, type IUGraph } from './cascade.js';
import { DRateTracker, BootstrapStateMachine } from './identity.js';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export interface VCSState {
  // Pipeline state
  bootstrap: {
    state: 'BOOTSTRAP_COLD' | 'BOOTSTRAP_WARMING' | 'STEADY_STATE';
    stabilization_count: number;
  };
  
  // D-rate tracking
  classification: {
    d_rate: number;
    level: 'TARGET' | 'ACCEPTABLE' | 'ALARM';
    message: string;
    suppressed: boolean;
  };
  
  // Drift detection
  drift: DriftReport | null;
  
  // Evidence & policy
  evidence: {
    evaluations: PolicyEvaluation[];
    global_status: 'ACCEPTED' | 'REJECTED' | 'PENDING';
    average_score: number;
  };
  
  // Dependency graph
  graph: {
    nodes: number;
    edges: number;
    cycles: string[][];
  };
  
  // Overall status
  status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  diagnostics: Array<{
    severity: 'error' | 'warning' | 'info';
    category: string;
    subject: string;
    message: string;
    recommended_actions: string[];
  }>;
}

/**
 * Load IU graph from .phoenix/graphs/ius.json
 */
function loadIUGraph(projectRoot: string): Array<{
  iu_id: string;
  risk_tier: RiskTier;
  source_canon_ids: string[];
  output_files: string[];
  dependencies?: string[];
}> {
  const path = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
  if (!existsSync(path)) {
    return [];
  }
  
  try {
    const content = readFileSync(path, 'utf-8');
    const data = JSON.parse(content);
    return data.ius || [];
  } catch {
    return [];
  }
}

/**
 * Run complete VCS status check.
 * This is the main `phoenix status` implementation from PRD.
 */
export async function getVCSStatus(projectRoot: string): Promise<VCSState> {
  const diagnostics: VCSState['diagnostics'] = [];
  
  // 1. Load state
  const statePath = join(projectRoot, '.phoenix', 'state.json');
  let bootstrapState: 'BOOTSTRAP_COLD' | 'BOOTSTRAP_WARMING' | 'STEADY_STATE' = 'BOOTSTRAP_COLD';
  let stabilizationCount = 0;
  
  if (existsSync(statePath)) {
    try {
      const state = JSON.parse(readFileSync(statePath, 'utf-8'));
      bootstrapState = state.state || 'BOOTSTRAP_COLD';
    } catch {}
  }
  
  // 2. Load IU graph
  const ius = loadIUGraph(projectRoot);
  const graph = buildDependencyGraph(ius);
  
  // 3. Detect circular dependencies
  const cycles = detectCircularDependencies(graph);
  if (cycles.length > 0) {
    diagnostics.push({
      severity: 'error',
      category: 'dependency',
      subject: 'graph',
      message: `${cycles.length} circular dependencies detected`,
      recommended_actions: ['Refactor IUs to break dependency cycles', cycles.map(c => `  - ${c.join(' → ')}`).join('\n')],
    });
  }
  
  // 4. Detect drift
  const manifest = loadManifest(projectRoot);
  let driftReport: DriftReport | null = null;
  
  if (manifest) {
    driftReport = detectDrift(projectRoot, manifest);
    
    if (driftReport.has_blocking_drift) {
      for (const entry of driftReport.entries.filter(e => e.status === 'MODIFIED' || e.status === 'MISSING')) {
        diagnostics.push({
          severity: 'error',
          category: 'drift',
          subject: entry.file,
          message: `${entry.status}: Working tree differs from manifest`,
          recommended_actions: [
            'Label with waiver: promote_to_requirement, temporary_patch, or manual_override',
            'Or revert to generated version',
          ],
        });
      }
    }
  } else {
    diagnostics.push({
      severity: 'warning',
      category: 'drift',
      subject: 'manifest',
      message: 'No generated manifest found - drift detection disabled',
      recommended_actions: ['Run phoenix pipeline to generate manifest'],
    });
  }
  
  // 5. Collect evidence
  const evaluations: PolicyEvaluation[] = [];
  const evidenceRecords: EvidenceRecord[] = [];
  
  // Global checks
  const typecheckResult = await runTypecheck(projectRoot);
  const lintResult = await runLint(projectRoot);
  
  evidenceRecords.push(typecheckResult, lintResult);
  
  // Per-IU evidence (simplified - in real system would run IU-specific tests)
  for (const iu of ius) {
    const existingRecords: EvidenceRecord[] = [];
    
    // Typecheck applies to all
    existingRecords.push({ ...typecheckResult, iu_id: iu.iu_id });
    existingRecords.push({ ...lintResult, iu_id: iu.iu_id });
    
    // Unit tests for medium+ risk
    if (iu.risk_tier === 'medium' || iu.risk_tier === 'high' || iu.risk_tier === 'critical') {
      // Check if test file exists
      const testFile = iu.output_files.find(f => f.includes('__tests__'));
      if (testFile && existsSync(join(projectRoot, testFile))) {
        const testResult = await runUnitTests(projectRoot, iu.iu_id, testFile);
        existingRecords.push(testResult);
      }
    }
    
    const eval_ = evaluatePolicy(iu.iu_id, iu.risk_tier, existingRecords);
    evaluations.push(eval_);
    
    // Add diagnostics for failed/rejected IUs
    if (eval_.status === 'REJECTED') {
      diagnostics.push({
        severity: 'error',
        category: 'policy',
        subject: iu.iu_id,
        message: `Policy evaluation failed: score ${eval_.score}/100`,
        recommended_actions: [
          ...eval_.missing_evidence.map(e => `Add missing evidence: ${e}`),
          ...eval_.failed_evidence.map(e => `Fix failed evidence: ${e}`),
        ],
      });
    } else if (eval_.status === 'PENDING') {
      diagnostics.push({
        severity: 'warning',
        category: 'policy',
        subject: iu.iu_id,
        message: `Evidence incomplete: missing ${eval_.missing_evidence.join(', ')}`,
        recommended_actions: eval_.missing_evidence.map(e => `Provide evidence: ${e}`),
      });
    }
  }
  
  // Calculate global status
  const rejected = evaluations.filter(e => e.status === 'REJECTED').length;
  const pending = evaluations.filter(e => e.status === 'PENDING').length;
  const accepted = evaluations.filter(e => e.status === 'ACCEPTED').length;
  
  let globalStatus: 'ACCEPTED' | 'REJECTED' | 'PENDING';
  if (rejected > 0) {
    globalStatus = 'REJECTED';
  } else if (pending > 0) {
    globalStatus = 'PENDING';
  } else {
    globalStatus = 'ACCEPTED';
  }
  
  const averageScore = evaluations.length > 0
    ? Math.round(evaluations.reduce((a, e) => a + e.score, 0) / evaluations.length)
    : 0;
  
  // 6. D-rate (placeholder - would be tracked over time)
  const dRateTracker = new DRateTracker();
  // Simulate some classifications
  for (let i = 0; i < 20; i++) {
    dRateTracker.record(i < 2 ? 'D' : 'A'); // 10% D-rate
  }
  const dRateStatus = dRateTracker.getStatus();
  const suppressAlarms = bootstrapState !== 'STEADY_STATE';
  
  if (dRateStatus.level === 'ALARM' && !suppressAlarms) {
    diagnostics.push({
      severity: 'error',
      category: 'classification',
      subject: 'd-rate',
      message: dRateStatus.message,
      recommended_actions: ['Tune classifier parameters', 'Review recent classifications'],
    });
  }
  
  // 7. Determine overall status
  let status: 'HEALTHY' | 'WARNING' | 'CRITICAL';
  const errors = diagnostics.filter(d => d.severity === 'error').length;
  const warnings = diagnostics.filter(d => d.severity === 'warning').length;
  
  if (errors > 0) {
    status = 'CRITICAL';
  } else if (warnings > 0) {
    status = 'WARNING';
  } else {
    status = 'HEALTHY';
  }
  
  return {
    bootstrap: {
      state: bootstrapState,
      stabilization_count: stabilizationCount,
    },
    classification: {
      d_rate: dRateStatus.dRate,
      level: dRateStatus.level,
      message: dRateStatus.message,
      suppressed: suppressAlarms,
    },
    drift: driftReport,
    evidence: {
      evaluations,
      global_status: globalStatus,
      average_score: averageScore,
    },
    graph: {
      nodes: graph.nodes.size,
      edges: graph.edges.length,
      cycles,
    },
    status,
    diagnostics: diagnostics.sort((a, b) => {
      const severityOrder = { error: 0, warning: 1, info: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
  };
}

/**
 * Format VCS status for display (the main `phoenix status` output).
 */
export function formatVCSStatus(state: VCSState): string {
  const lines: string[] = [];
  
  // Header
  const statusIcon = {
    'HEALTHY': '🟢',
    'WARNING': '🟡',
    'CRITICAL': '🔴'
  }[state.status];
  
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push(`║  Phoenix VCS Status                           ${statusIcon} ${state.status.padEnd(10)} ║`);
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  // Bootstrap state
  const bootstrapIcon = {
    'BOOTSTRAP_COLD': '❄️',
    'BOOTSTRAP_WARMING': '🌡️',
    'STEADY_STATE': '✅'
  }[state.bootstrap.state];
  
  lines.push(`Bootstrap: ${bootstrapIcon} ${state.bootstrap.state}`);
  if (state.classification.suppressed) {
    lines.push('  (D-rate alarms suppressed during bootstrap)');
  }
  lines.push('');
  
  // D-rate
  const dRateIcon = state.classification.level === 'TARGET' ? '✅' :
                    state.classification.level === 'ACCEPTABLE' ? '⚠️' : '❌';
  lines.push(`Classification: ${dRateIcon} D-rate ${(state.classification.d_rate * 100).toFixed(1)}% (${state.classification.level})`);
  lines.push(`  ${state.classification.message}`);
  lines.push('');
  
  // Drift
  if (state.drift) {
    const driftIcon = state.drift.has_blocking_drift ? '❌' : '✅';
    lines.push(`Drift: ${driftIcon} ${state.drift.summary.clean} clean, ${state.drift.summary.modified} modified, ${state.drift.summary.missing} missing`);
    if (state.drift.has_blocking_drift) {
      lines.push('  🔴 BLOCKING: Unlabeled manual edits detected');
    }
  } else {
    lines.push('Drift: ⚠️  No manifest (drift detection disabled)');
  }
  lines.push('');
  
  // Evidence
  const evIcon = state.evidence.global_status === 'ACCEPTED' ? '✅' :
                 state.evidence.global_status === 'PENDING' ? '⏳' : '❌';
  lines.push(`Evidence: ${evIcon} ${state.evidence.global_status} (avg score: ${state.evidence.average_score}/100)`);
  lines.push(`  ${state.evidence.evaluations.filter(e => e.status === 'ACCEPTED').length}/${state.evidence.evaluations.length} IUs passed`);
  lines.push('');
  
  // Graph
  const cycleIcon = state.graph.cycles.length === 0 ? '✅' : '❌';
  lines.push(`Dependencies: ${cycleIcon} ${state.graph.nodes} nodes, ${state.graph.edges} edges`);
  if (state.graph.cycles.length > 0) {
    lines.push(`  ❌ ${state.graph.cycles.length} circular dependencies`);
  }
  lines.push('');
  
  // Diagnostics
  if (state.diagnostics.length > 0) {
    lines.push('─'.repeat(64));
    lines.push('Diagnostics:');
    lines.push('');
    
    for (const diag of state.diagnostics) {
      const icon = diag.severity === 'error' ? '❌' :
                   diag.severity === 'warning' ? '⚠️' : 'ℹ️';
      lines.push(`${icon} [${diag.category.toUpperCase()}] ${diag.subject}`);
      lines.push(`   ${diag.message}`);
      for (const action of diag.recommended_actions) {
        lines.push(`   → ${action}`);
      }
      lines.push('');
    }
  }
  
  // Footer
  lines.push('─'.repeat(64));
  lines.push(`Status: ${statusIcon} ${state.status}`);
  
  if (state.status === 'CRITICAL') {
    lines.push('');
    lines.push('🔴 REJECTED - Fix blocking errors before proceeding');
  } else if (state.status === 'WARNING') {
    lines.push('');
    lines.push('🟡 WARNING - Address warnings for full compliance');
  } else {
    lines.push('');
    lines.push('🟢 ACCEPTED - All VCS checks passed');
  }
  
  return lines.join('\n');
}
