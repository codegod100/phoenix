import type { CanonicalNode } from './canon-pipeline.js';

export type UpgradeClassification = 'SAFE' | 'COMPACTION_EVENT' | 'REJECT';

export interface ShadowDiffMetrics {
  node_change_pct: number;
  edge_change_pct: number;
  risk_escalations: number;
  orphan_nodes: number;
  out_of_scope_growth: number;
  semantic_stmt_drift: number;
}

export class ShadowPipeline {
  comparePipelines(oldNodes: CanonicalNode[], newNodes: CanonicalNode[]): ShadowDiffMetrics {
    const oldIds = new Set(oldNodes.map(n => n.canon_id));
    const newIds = new Set(newNodes.map(n => n.canon_id));
    const added = [...newIds].filter(id => !oldIds.has(id)).length;
    const removed = [...oldIds].filter(id => !newIds.has(id)).length;
    const total = Math.max(oldNodes.length, 1);
    return {
      node_change_pct: ((added + removed) / total) * 100,
      edge_change_pct: 0,
      risk_escalations: 0,
      orphan_nodes: removed,
      out_of_scope_growth: 0,
      semantic_stmt_drift: 0,
    };
  }

  classifyUpgrade(metrics: ShadowDiffMetrics): UpgradeClassification {
    if (metrics.orphan_nodes > 0 || metrics.node_change_pct > 25) return 'REJECT';
    if (metrics.node_change_pct <= 3 && metrics.risk_escalations === 0) return 'SAFE';
    return 'COMPACTION_EVENT';
  }
}

export function createShadowPipeline(): ShadowPipeline {
  return new ShadowPipeline();
}

export const _phoenix = {
  iu_id: 'a3b4c5d6',
  name: 'Shadow Mode',
  risk_tier: 'high',
  canon_ids: [7],
} as const;
