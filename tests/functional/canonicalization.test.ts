import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { parseSpec } from '../../src/spec-parser.js';
import { diffClauses } from '../../src/diff.js';
import { extractCanonicalNodes } from '../../src/canonicalizer.js';
import { computeWarmHashes } from '../../src/warm-hasher.js';
import { classifyChanges } from '../../src/classifier.js';
import { DRateTracker } from '../../src/d-rate.js';
import { BootstrapStateMachine } from '../../src/bootstrap.js';
import { CanonicalStore } from '../../src/store/canonical-store.js';
import { CanonicalType } from '../../src/models/canonical.js';
import { ChangeClass, BootstrapState, DRateLevel } from '../../src/models/classification.js';

const fixturesDir = join(import.meta.dirname, '..', 'fixtures');

describe('Functional: Full Canonicalization Pipeline', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'phoenix-canon-'));
  });

  it('performs complete bootstrap flow on auth spec', () => {
    const content = readFileSync(join(fixturesDir, 'spec-auth-v1.md'), 'utf8');
    const docId = 'spec-auth.md';

    // Phase A: Parse
    const clauses = parseSpec(content, docId);
    expect(clauses.length).toBeGreaterThan(0);

    // Phase B: Canonicalize
    const canonNodes = extractCanonicalNodes(clauses);
    expect(canonNodes.length).toBeGreaterThan(0);

    // Should extract requirements (must authenticate, must expire, etc.)
    const reqs = canonNodes.filter(n => n.type === CanonicalType.REQUIREMENT);
    expect(reqs.length).toBeGreaterThan(0);

    // Should extract constraints (HTTPS, RS256, etc.)
    const constraints = canonNodes.filter(n => n.type === CanonicalType.CONSTRAINT);
    expect(constraints.length).toBeGreaterThan(0);

    // Compute warm hashes
    const warmHashes = computeWarmHashes(clauses, canonNodes);
    expect(warmHashes.size).toBe(clauses.length);

    // Persist canonical graph
    const canonStore = new CanonicalStore(tempDir);
    canonStore.saveNodes(canonNodes);
    const retrieved = canonStore.getAllNodes();
    expect(retrieved.length).toBe(canonNodes.length);
  });

  it('detects contextual changes when spec evolves v1 → v2', () => {
    const v1 = readFileSync(join(fixturesDir, 'spec-auth-v1.md'), 'utf8');
    const v2 = readFileSync(join(fixturesDir, 'spec-auth-v2.md'), 'utf8');
    const docId = 'spec-auth.md';

    // Parse both
    const clausesV1 = parseSpec(v1, docId);
    const clausesV2 = parseSpec(v2, docId);

    // Canonicalize both
    const canonV1 = extractCanonicalNodes(clausesV1);
    const canonV2 = extractCanonicalNodes(clausesV2);

    // v2 should have more canonical nodes (OAuth requirements)
    expect(canonV2.length).toBeGreaterThanOrEqual(canonV1.length);

    // Compute warm hashes
    const warmV1 = computeWarmHashes(clausesV1, canonV1);
    const warmV2 = computeWarmHashes(clausesV2, canonV2);

    // Diff and classify
    const diffs = diffClauses(clausesV1, clausesV2);
    const classifications = classifyChanges(diffs, canonV1, canonV2, warmV1, warmV2);

    expect(classifications.length).toBe(diffs.length);

    // Should have some non-trivial changes
    const nonTrivial = classifications.filter(c => c.change_class !== ChangeClass.A);
    expect(nonTrivial.length).toBeGreaterThan(0);
  });

  it('runs full bootstrap state machine flow', () => {
    const content = readFileSync(join(fixturesDir, 'spec-auth-v1.md'), 'utf8');
    const docId = 'spec-auth.md';

    // Start cold
    const bootstrap = new BootstrapStateMachine();
    expect(bootstrap.getState()).toBe(BootstrapState.BOOTSTRAP_COLD);
    expect(bootstrap.shouldSuppressAlarms()).toBe(true);

    // Cold pass: parse
    const clauses = parseSpec(content, docId);

    // Canonicalize (triggers warm pass)
    const canonNodes = extractCanonicalNodes(clauses);
    const warmHashes = computeWarmHashes(clauses, canonNodes);

    // Mark warm pass complete
    bootstrap.markWarmPassComplete();
    expect(bootstrap.getState()).toBe(BootstrapState.BOOTSTRAP_WARMING);
    expect(bootstrap.shouldDowngradeSeverity()).toBe(true);

    // Simulate classifications to build D-rate history
    const tracker = new DRateTracker(20);
    // Simulate good classifications
    for (let i = 0; i < 15; i++) {
      tracker.recordOne(ChangeClass.A);
    }
    tracker.recordOne(ChangeClass.B);
    tracker.recordOne(ChangeClass.C);

    const status = tracker.getStatus();
    expect(status.level).toBe(DRateLevel.TARGET);

    // Evaluate transition
    bootstrap.evaluateTransition(status);
    expect(bootstrap.getState()).toBe(BootstrapState.STEADY_STATE);
    expect(bootstrap.shouldDowngradeSeverity()).toBe(false);
    expect(bootstrap.shouldSuppressAlarms()).toBe(false);
  });

  it('D-rate tracker alarms on high uncertainty', () => {
    const tracker = new DRateTracker(20);

    // 4 out of 20 = 20% D rate → ALARM
    for (let i = 0; i < 16; i++) tracker.recordOne(ChangeClass.B);
    for (let i = 0; i < 4; i++) tracker.recordOne(ChangeClass.D);

    const status = tracker.getStatus();
    expect(status.level).toBe(DRateLevel.ALARM);
    expect(status.rate).toBe(0.2);

    // Bootstrap should not transition to STEADY_STATE
    const bootstrap = new BootstrapStateMachine();
    bootstrap.markWarmPassComplete();
    bootstrap.evaluateTransition(status);
    expect(bootstrap.getState()).toBe(BootstrapState.BOOTSTRAP_WARMING);
  });

  it('canonical nodes maintain provenance back to clauses', () => {
    const content = readFileSync(join(fixturesDir, 'spec-auth-v1.md'), 'utf8');
    const clauses = parseSpec(content, 'spec-auth.md');
    const canonNodes = extractCanonicalNodes(clauses);

    // Store and retrieve
    const canonStore = new CanonicalStore(tempDir);
    canonStore.saveNodes(canonNodes);

    // Every canonical node should trace back to a clause
    for (const node of canonNodes) {
      expect(node.source_clause_ids.length).toBeGreaterThan(0);
      // The clause ID should be from our parsed clauses
      const clauseIds = new Set(clauses.map(c => c.clause_id));
      for (const srcId of node.source_clause_ids) {
        expect(clauseIds.has(srcId)).toBe(true);
      }
    }

    // Can look up nodes by clause
    for (const clause of clauses) {
      const nodes = canonStore.getNodesByClause(clause.clause_id);
      // Each returned node should reference this clause
      for (const node of nodes) {
        expect(node.source_clause_ids).toContain(clause.clause_id);
      }
    }
  });

  it('warm hashes are stable when canonical graph is unchanged', () => {
    const content = readFileSync(join(fixturesDir, 'spec-auth-v1.md'), 'utf8');
    const clauses = parseSpec(content, 'spec-auth.md');
    const canonNodes = extractCanonicalNodes(clauses);

    const warm1 = computeWarmHashes(clauses, canonNodes);
    const warm2 = computeWarmHashes(clauses, canonNodes);

    for (const clause of clauses) {
      expect(warm1.get(clause.clause_id)).toBe(warm2.get(clause.clause_id));
    }
  });
});
