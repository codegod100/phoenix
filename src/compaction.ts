/**
 * Compaction Engine — moves cold data to archives while preserving
 * node headers, provenance edges, approvals, and signatures.
 */

import type { CompactionEvent } from './models/pipeline.js';

export interface StorageStats {
  total_objects: number;
  total_bytes: number;
  hot_objects: number;
  hot_bytes: number;
  cold_objects: number;
  cold_bytes: number;
}

export interface CompactionCandidate {
  object_id: string;
  object_type: string;
  age_days: number;
  size_bytes: number;
  /** Whether this object must be preserved (header, provenance, approval, sig) */
  preserve: boolean;
}

/**
 * Identify objects eligible for compaction.
 */
export function identifyCandidates(
  objects: CompactionCandidate[],
  hotWindowDays: number = 30,
): { toCompact: CompactionCandidate[]; toPreserve: CompactionCandidate[] } {
  const toCompact: CompactionCandidate[] = [];
  const toPreserve: CompactionCandidate[] = [];

  for (const obj of objects) {
    if (obj.preserve) {
      toPreserve.push(obj);
    } else if (obj.age_days > hotWindowDays) {
      toCompact.push(obj);
    } else {
      toPreserve.push(obj);
    }
  }

  return { toCompact, toPreserve };
}

/**
 * Simulate a compaction run and produce an event.
 */
export function runCompaction(
  objects: CompactionCandidate[],
  trigger: CompactionEvent['trigger'],
  hotWindowDays: number = 30,
): CompactionEvent {
  const { toCompact, toPreserve } = identifyCandidates(objects, hotWindowDays);

  const bytesFreed = toCompact.reduce((sum, o) => sum + o.size_bytes, 0);
  const preservedHeaders = toPreserve.filter(o => o.object_type === 'node_header').length;
  const preservedProvenance = toPreserve.filter(o => o.object_type === 'provenance_edge').length;
  const preservedApprovals = toPreserve.filter(o => o.object_type === 'approval').length;
  const preservedSignatures = toPreserve.filter(o => o.object_type === 'signature').length;

  return {
    type: 'CompactionEvent',
    timestamp: new Date().toISOString(),
    trigger,
    nodes_compacted: toCompact.length,
    bytes_freed: bytesFreed,
    preserved: {
      node_headers: preservedHeaders,
      provenance_edges: preservedProvenance,
      approvals: preservedApprovals,
      signatures: preservedSignatures,
    },
  };
}

/**
 * Check if compaction should be triggered.
 */
export function shouldTriggerCompaction(
  stats: StorageStats,
  sizeThresholdBytes: number = 100 * 1024 * 1024, // 100MB default
  daysSinceLastCompaction: number = 0,
  timeThresholdDays: number = 90,
): { trigger: boolean; reason: CompactionEvent['trigger'] | null } {
  if (stats.total_bytes > sizeThresholdBytes) {
    return { trigger: true, reason: 'size_threshold' };
  }
  if (daysSinceLastCompaction > timeThresholdDays) {
    return { trigger: true, reason: 'time_based' };
  }
  return { trigger: false, reason: null };
}
