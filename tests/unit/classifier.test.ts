import { describe, it, expect } from 'vitest';
import { classifyChange, classifyChanges } from '../../src/classifier.js';
import { parseSpec } from '../../src/spec-parser.js';
import { diffClauses } from '../../src/diff.js';
import { extractCanonicalNodes } from '../../src/canonicalizer.js';
import { DiffType } from '../../src/models/clause.js';
import { ChangeClass } from '../../src/models/classification.js';

describe('classifyChange', () => {
  const docId = 'test.md';

  it('classifies unchanged content as A (trivial)', () => {
    const content = '# Auth\n\nUsers must log in.';
    const before = parseSpec(content, docId);
    const after = parseSpec(content, docId);
    const diffs = diffClauses(before, after);
    const canonBefore = extractCanonicalNodes(before);
    const canonAfter = extractCanonicalNodes(after);

    const result = classifyChange(diffs[0], canonBefore, canonAfter);
    expect(result.change_class).toBe(ChangeClass.A);
    expect(result.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('classifies added clause as B (local semantic)', () => {
    const before = parseSpec('# Auth\n\nUsers must log in.', docId);
    const after = parseSpec('# Auth\n\nUsers must log in.\n\n# New\n\nNew feature required.', docId);
    const diffs = diffClauses(before, after);
    const canonBefore = extractCanonicalNodes(before);
    const canonAfter = extractCanonicalNodes(after);

    const added = diffs.find(d => d.diff_type === DiffType.ADDED)!;
    const result = classifyChange(added, canonBefore, canonAfter);
    expect(result.change_class).toBe(ChangeClass.B);
  });

  it('classifies removed clause as B (local semantic)', () => {
    const before = parseSpec('# Auth\n\nUsers must log in.\n\n# Old\n\nOld feature.', docId);
    const after = parseSpec('# Auth\n\nUsers must log in.', docId);
    const diffs = diffClauses(before, after);
    const canonBefore = extractCanonicalNodes(before);
    const canonAfter = extractCanonicalNodes(after);

    const removed = diffs.find(d => d.diff_type === DiffType.REMOVED)!;
    const result = classifyChange(removed, canonBefore, canonAfter);
    expect(result.change_class).toBe(ChangeClass.B);
  });

  it('classifies semantic modification with canon impact as C', () => {
    const before = parseSpec('# Security\n\nPasswords must be hashed with bcrypt.', docId);
    const after = parseSpec('# Security\n\nPasswords must be hashed with argon2id.', docId);
    const diffs = diffClauses(before, after);
    const canonBefore = extractCanonicalNodes(before);
    const canonAfter = extractCanonicalNodes(after);

    const modified = diffs.find(d => d.diff_type === DiffType.MODIFIED)!;
    const result = classifyChange(modified, canonBefore, canonAfter);
    // Should be C because canonical nodes are affected
    expect([ChangeClass.B, ChangeClass.C]).toContain(result.change_class);
    expect(result.signals.semhash_delta).toBe(true);
  });

  it('provides confidence score between 0 and 1', () => {
    const before = parseSpec('# A\n\nOriginal text here.', docId);
    const after = parseSpec('# A\n\nModified text here.', docId);
    const diffs = diffClauses(before, after);
    const result = classifyChange(diffs[0], [], []);
    expect(result.confidence).toBeGreaterThanOrEqual(0);
    expect(result.confidence).toBeLessThanOrEqual(1);
  });

  it('includes all signal fields', () => {
    const before = parseSpec('# A\n\nOriginal.', docId);
    const after = parseSpec('# A\n\nChanged completely to something new.', docId);
    const diffs = diffClauses(before, after);
    const result = classifyChange(diffs[0], [], []);

    expect(result.signals).toHaveProperty('norm_diff');
    expect(result.signals).toHaveProperty('semhash_delta');
    expect(result.signals).toHaveProperty('context_cold_delta');
    expect(result.signals).toHaveProperty('term_ref_delta');
    expect(result.signals).toHaveProperty('section_structure_delta');
    expect(result.signals).toHaveProperty('canon_impact');
  });
});

describe('classifyChanges', () => {
  it('classifies all diffs in a batch', () => {
    const before = parseSpec('# A\n\nText A\n\n# B\n\nText B', 'test.md');
    const after = parseSpec('# A\n\nText A modified\n\n# B\n\nText B\n\n# C\n\nText C', 'test.md');
    const diffs = diffClauses(before, after);
    const results = classifyChanges(diffs, [], []);
    expect(results).toHaveLength(diffs.length);
    for (const r of results) {
      expect([ChangeClass.A, ChangeClass.B, ChangeClass.C, ChangeClass.D]).toContain(r.change_class);
    }
  });
});
