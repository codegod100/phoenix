import { describe, it, expect } from 'vitest';
import { identifyCandidates, runCompaction, shouldTriggerCompaction } from '../../src/compaction.js';
import type { CompactionCandidate } from '../../src/compaction.js';

function makeCandidate(id: string, type: string, ageDays: number, sizeBytes: number, preserve = false): CompactionCandidate {
  return { object_id: id, object_type: type, age_days: ageDays, size_bytes: sizeBytes, preserve };
}

describe('identifyCandidates', () => {
  it('compacts old non-preserved objects', () => {
    const objects = [
      makeCandidate('a', 'clause_body', 60, 1000),
      makeCandidate('b', 'clause_body', 10, 500),
    ];
    const { toCompact, toPreserve } = identifyCandidates(objects, 30);
    expect(toCompact).toHaveLength(1);
    expect(toCompact[0].object_id).toBe('a');
    expect(toPreserve).toHaveLength(1);
  });

  it('never compacts preserved objects regardless of age', () => {
    const objects = [
      makeCandidate('a', 'provenance_edge', 365, 100, true),
      makeCandidate('b', 'node_header', 365, 50, true),
    ];
    const { toCompact, toPreserve } = identifyCandidates(objects, 30);
    expect(toCompact).toHaveLength(0);
    expect(toPreserve).toHaveLength(2);
  });
});

describe('runCompaction', () => {
  it('produces a CompactionEvent', () => {
    const objects = [
      makeCandidate('a', 'clause_body', 60, 1000),
      makeCandidate('b', 'node_header', 60, 50, true),
      makeCandidate('c', 'provenance_edge', 60, 30, true),
    ];
    const event = runCompaction(objects, 'size_threshold', 30);
    expect(event.type).toBe('CompactionEvent');
    expect(event.nodes_compacted).toBe(1);
    expect(event.bytes_freed).toBe(1000);
    expect(event.preserved.node_headers).toBe(1);
    expect(event.preserved.provenance_edges).toBe(1);
  });
});

describe('shouldTriggerCompaction', () => {
  it('triggers on size threshold', () => {
    const stats = { total_objects: 100, total_bytes: 200_000_000, hot_objects: 50, hot_bytes: 100_000_000, cold_objects: 50, cold_bytes: 100_000_000 };
    const { trigger, reason } = shouldTriggerCompaction(stats);
    expect(trigger).toBe(true);
    expect(reason).toBe('size_threshold');
  });

  it('triggers on time threshold', () => {
    const stats = { total_objects: 10, total_bytes: 1000, hot_objects: 10, hot_bytes: 1000, cold_objects: 0, cold_bytes: 0 };
    const { trigger, reason } = shouldTriggerCompaction(stats, 100_000_000, 100, 90);
    expect(trigger).toBe(true);
    expect(reason).toBe('time_based');
  });

  it('does not trigger when below thresholds', () => {
    const stats = { total_objects: 10, total_bytes: 1000, hot_objects: 10, hot_bytes: 1000, cold_objects: 0, cold_bytes: 0 };
    const { trigger } = shouldTriggerCompaction(stats);
    expect(trigger).toBe(false);
  });
});
