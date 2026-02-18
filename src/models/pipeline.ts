/**
 * Pipeline & Compaction models.
 */

export interface PipelineConfig {
  pipeline_id: string;
  model_id: string;
  promptpack_version: string;
  extraction_rules_version: string;
  diff_policy_version: string;
}

export interface ShadowDiffMetrics {
  node_change_pct: number;
  edge_change_pct: number;
  risk_escalations: number;
  orphan_nodes: number;
  out_of_scope_growth: number;
  semantic_stmt_drift: number;
}

export enum UpgradeClassification {
  SAFE = 'SAFE',
  COMPACTION_EVENT = 'COMPACTION_EVENT',
  REJECT = 'REJECT',
}

export interface ShadowResult {
  old_pipeline: PipelineConfig;
  new_pipeline: PipelineConfig;
  metrics: ShadowDiffMetrics;
  classification: UpgradeClassification;
  reason: string;
}

export enum StorageTier {
  HOT = 'HOT',
  ANCESTRY = 'ANCESTRY',
  COLD = 'COLD',
}

export interface CompactionEvent {
  type: 'CompactionEvent';
  timestamp: string;
  trigger: 'size_threshold' | 'pipeline_upgrade' | 'time_based';
  nodes_compacted: number;
  bytes_freed: number;
  preserved: {
    node_headers: number;
    provenance_edges: number;
    approvals: number;
    signatures: number;
  };
}
