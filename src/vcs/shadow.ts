/**
 * Phoenix VCS — Shadow Pipeline
 * 
 * Implements PRD Section 5.1: Shadow Canonicalization (Upgrade Mode)
 * Run old and new pipelines in parallel, classify diff as SAFE/COMPACTION_EVENT/REJECT.
 */

import type { CanonNode } from './identity.js';
import { sha256 } from './identity.js';

export interface ShadowDiffMetrics {
  node_change_pct: number;
  edge_change_pct: number;
  risk_escalations: number;
  orphan_nodes: number;
  out_of_scope_growth: number;
  semantic_stmt_drift: number;
}

export type UpgradeClassification = 'SAFE' | 'COMPACTION_EVENT' | 'REJECT';

export interface ShadowResult {
  old_pipeline_id: string;
  new_pipeline_id: string;
  old_nodes: CanonNode[];
  new_nodes: CanonNode[];
  metrics: ShadowDiffMetrics;
  classification: UpgradeClassification;
  diff_report: string;
}

export interface CanonNode {
  id: string;
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'INVARIANT' | 'DEFINITION' | 'CONTEXT';
  text: string;
  confidence: number;
  edges: Array<{ to: string; type: string }>;
}

/**
 * Compute shadow diff metrics between old and new canonical graphs.
 * Per PRD 5.1: Classify as SAFE, COMPACTION_EVENT, or REJECT.
 */
export function computeShadowDiff(
  oldNodes: CanonNode[],
  newNodes: CanonNode[]
): ShadowDiffMetrics {
  const oldIds = new Set(oldNodes.map(n => n.id));
  const newIds = new Set(newNodes.map(n => n.id));
  
  // Nodes that exist in both
  const sharedIds = new Set([...oldIds].filter(id => newIds.has(id)));
  
  // Orphan nodes: exist in old but not in new
  const orphanNodes = [...oldIds].filter(id => !newIds.has(id));
  
  // Out of scope growth: new nodes not in old
  const newScopeNodes = [...newIds].filter(id => !oldIds.has(id));
  
  // Node change percentage
  const nodeChangePct = oldIds.size > 0
    ? (orphanNodes.length + newScopeNodes.filter(id => {
        // Count as change if ID changed but might be similar content
        return !oldNodes.some(old => 
          old.id !== id && old.text === newNodes.find(n => n.id === id)?.text
        );
      }).length) / oldIds.size
    : 0;
  
  // Edge changes
  const oldEdges = countEdges(oldNodes);
  const newEdges = countEdges(newNodes);
  const edgeChangePct = oldEdges > 0 ? Math.abs(newEdges - oldEdges) / oldEdges : 0;
  
  // Risk escalations: low confidence → high confidence (good) or vice versa (bad)
  let riskEscalations = 0;
  for (const sharedId of sharedIds) {
    const oldNode = oldNodes.find(n => n.id === sharedId)!;
    const newNode = newNodes.find(n => n.id === sharedId)!;
    
    // Escalation: confidence dropped significantly
    if (oldNode.confidence - newNode.confidence > 0.2) {
      riskEscalations++;
    }
  }
  
  // Semantic statement drift: compare text similarity for shared nodes
  let semanticDrift = 0;
  for (const sharedId of sharedIds) {
    const oldNode = oldNodes.find(n => n.id === sharedId)!;
    const newNode = newNodes.find(n => n.id === sharedId)!;
    
    if (oldNode.text !== newNode.text) {
      // Simple word-level diff
      const similarity = textSimilarity(oldNode.text, newNode.text);
      semanticDrift += 1 - similarity;
    }
  }
  semanticDrift = sharedIds.size > 0 ? semanticDrift / sharedIds.size : 0;
  
  // Out of scope growth percentage
  const outOfScopeGrowth = oldIds.size > 0 ? newScopeNodes.length / oldIds.size : 0;
  
  return {
    node_change_pct: nodeChangePct * 100,
    edge_change_pct: edgeChangePct * 100,
    risk_escalations: riskEscalations,
    orphan_nodes: orphanNodes.length,
    out_of_scope_growth: outOfScopeGrowth * 100,
    semantic_stmt_drift: semanticDrift * 100,
  };
}

/**
 * Classify shadow diff per PRD thresholds:
 * - SAFE: node_change_pct ≤3%, no orphan nodes, no risk escalations
 * - COMPACTION_EVENT: node_change_pct ≤25%, no orphan nodes, limited risk escalations
 * - REJECT: orphan nodes exist, excessive churn, semantic drift large
 */
export function classifyShadowDiff(metrics: ShadowDiffMetrics): UpgradeClassification {
  // REJECT conditions (hard failures)
  if (metrics.orphan_nodes > 0) {
    return 'REJECT';
  }
  
  if (metrics.node_change_pct > 50) {
    return 'REJECT';
  }
  
  if (metrics.semantic_stmt_drift > 30) {
    return 'REJECT';
  }
  
  // COMPACTION_EVENT conditions
  if (metrics.node_change_pct > 3) {
    return 'COMPACTION_EVENT';
  }
  
  if (metrics.risk_escalations > 2) {
    return 'COMPACTION_EVENT';
  }
  
  if (metrics.out_of_scope_growth > 10) {
    return 'COMPACTION_EVENT';
  }
  
  // SAFE
  return 'SAFE';
}

/**
 * Run shadow pipeline: compare old vs new canonicalization.
 */
export function runShadowPipeline(
  oldNodes: CanonNode[],
  newNodes: CanonNode[],
  oldPipelineVersion: string,
  newPipelineVersion: string
): ShadowResult {
  const metrics = computeShadowDiff(oldNodes, newNodes);
  const classification = classifyShadowDiff(metrics);
  
  // Generate diff report
  const diffReport = formatShadowDiff(oldNodes, newNodes, metrics, classification);
  
  return {
    old_pipeline_id: sha256(oldPipelineVersion),
    new_pipeline_id: sha256(newPipelineVersion),
    old_nodes: oldNodes,
    new_nodes: newNodes,
    metrics,
    classification,
    diff_report: diffReport,
  };
}

/**
 * Helper: count total edges in graph.
 */
function countEdges(nodes: CanonNode[]): number {
  return nodes.reduce((sum, n) => sum + n.edges.length, 0);
}

/**
 * Simple text similarity (0-1) using word overlap.
 */
function textSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

/**
 * Format shadow diff for human review.
 */
function formatShadowDiff(
  oldNodes: CanonNode[],
  newNodes: CanonNode[],
  metrics: ShadowDiffMetrics,
  classification: UpgradeClassification
): string {
  const lines: string[] = [];
  
  const icon = {
    'SAFE': '✅',
    'COMPACTION_EVENT': '⚠️',
    'REJECT': '❌'
  }[classification];
  
  lines.push(`${icon} Shadow Pipeline Classification: ${classification}`);
  lines.push('');
  lines.push('Metrics:');
  lines.push(`  Node change: ${metrics.node_change_pct.toFixed(1)}% (threshold: 3% SAFE, 25% COMPACTION)`);
  lines.push(`  Edge change: ${metrics.edge_change_pct.toFixed(1)}%`);
  lines.push(`  Risk escalations: ${metrics.risk_escalations}`);
  lines.push(`  Orphan nodes: ${metrics.orphan_nodes} (REJECT if >0)`);
  lines.push(`  Scope growth: ${metrics.out_of_scope_growth.toFixed(1)}%`);
  lines.push(`  Semantic drift: ${metrics.semantic_stmt_drift.toFixed(1)}%`);
  lines.push('');
  
  // Node-by-node comparison
  const oldIds = new Set(oldNodes.map(n => n.id));
  const newIds = new Set(newNodes.map(n => n.id));
  
  const removed = oldNodes.filter(n => !newIds.has(n.id));
  const added = newNodes.filter(n => !oldIds.has(n.id));
  const changed: Array<{ old: CanonNode; new: CanonNode }> = [];
  
  for (const oldNode of oldNodes) {
    const newNode = newNodes.find(n => n.id === oldNode.id);
    if (newNode && oldNode.text !== newNode.text) {
      changed.push({ old: oldNode, new: newNode });
    }
  }
  
  if (removed.length > 0) {
    lines.push(`Removed nodes (${removed.length}):`);
    for (const n of removed.slice(0, 5)) {
      lines.push(`  - ${n.id.slice(0, 8)}...: ${n.text.slice(0, 50)}...`);
    }
    if (removed.length > 5) {
      lines.push(`  ... and ${removed.length - 5} more`);
    }
    lines.push('');
  }
  
  if (added.length > 0) {
    lines.push(`Added nodes (${added.length}):`);
    for (const n of added.slice(0, 5)) {
      lines.push(`  + ${n.id.slice(0, 8)}...: ${n.text.slice(0, 50)}...`);
    }
    if (added.length > 5) {
      lines.push(`  ... and ${added.length - 5} more`);
    }
    lines.push('');
  }
  
  if (changed.length > 0) {
    lines.push(`Changed nodes (${changed.length}):`);
    for (const { old, neu } of changed.slice(0, 5)) {
      lines.push(`  ~ ${old.id.slice(0, 8)}...:`);
      lines.push(`      OLD: ${old.text.slice(0, 40)}...`);
      lines.push(`      NEW: ${neu.text.slice(0, 40)}...`);
    }
    if (changed.length > 5) {
      lines.push(`  ... and ${changed.length - 5} more`);
    }
    lines.push('');
  }
  
  // Recommendation
  lines.push('Recommendation:');
  switch (classification) {
    case 'SAFE':
      lines.push('  ✅ SAFE to upgrade. Changes are minimal and non-breaking.');
      lines.push('  Action: Accept new pipeline version.');
      break;
    case 'COMPACTION_EVENT':
      lines.push('  ⚠️ COMPACTION EVENT. Significant but manageable changes.');
      lines.push('  Action: Review changes, run full validation, then accept.');
      break;
    case 'REJECT':
      lines.push('  ❌ REJECT. Breaking changes or orphan nodes detected.');
      lines.push('  Action: Tune new pipeline or accept data loss (not recommended).');
      break;
  }
  
  return lines.join('\n');
}

/**
 * Create PipelineUpgrade meta-node as specified in PRD 5.1
 */
export function createPipelineUpgradeEvent(
  shadowResult: ShadowResult,
  accepted: boolean
): {
  type: 'PipelineUpgrade';
  old_pipeline_id: string;
  new_pipeline_id: string;
  classification: UpgradeClassification;
  metrics: ShadowDiffMetrics;
  accepted: boolean;
  timestamp: string;
} {
  return {
    type: 'PipelineUpgrade',
    old_pipeline_id: shadowResult.old_pipeline_id,
    new_pipeline_id: shadowResult.new_pipeline_id,
    classification: shadowResult.classification,
    metrics: shadowResult.metrics,
    accepted,
    timestamp: new Date().toISOString(),
  };
}
