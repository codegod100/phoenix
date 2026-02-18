import { describe, it, expect } from 'vitest';
import { parseSpec } from '../../src/spec-parser.js';
import { diffClauses } from '../../src/diff.js';
import { DiffType } from '../../src/models/clause.js';

describe('diffClauses', () => {
  const docId = 'test.md';

  it('reports UNCHANGED for identical documents', () => {
    const content = '# A\n\nText A\n\n# B\n\nText B';
    const before = parseSpec(content, docId);
    const after = parseSpec(content, docId);
    const diffs = diffClauses(before, after);
    expect(diffs.every(d => d.diff_type === DiffType.UNCHANGED)).toBe(true);
    expect(diffs).toHaveLength(2);
  });

  it('detects ADDED clauses', () => {
    const before = parseSpec('# A\n\nText A', docId);
    const after = parseSpec('# A\n\nText A\n\n# B\n\nText B', docId);
    const diffs = diffClauses(before, after);
    const added = diffs.filter(d => d.diff_type === DiffType.ADDED);
    expect(added).toHaveLength(1);
    expect(added[0].clause_after?.section_path).toEqual(['B']);
  });

  it('detects REMOVED clauses', () => {
    const before = parseSpec('# A\n\nText A\n\n# B\n\nText B', docId);
    const after = parseSpec('# A\n\nText A', docId);
    const diffs = diffClauses(before, after);
    const removed = diffs.filter(d => d.diff_type === DiffType.REMOVED);
    expect(removed).toHaveLength(1);
  });

  it('detects MODIFIED clauses (same section, different content)', () => {
    const before = parseSpec('# A\n\nOriginal text', docId);
    const after = parseSpec('# A\n\nUpdated text', docId);
    const diffs = diffClauses(before, after);
    const modified = diffs.filter(d => d.diff_type === DiffType.MODIFIED);
    expect(modified).toHaveLength(1);
    expect(modified[0].section_path_before).toEqual(['A']);
  });

  it('detects MOVED clauses (same content, different parent)', () => {
    // Same subsection content moved under a different parent heading
    const before = parseSpec('# Parent A\n\n## Child\n\nShared text', docId);
    const after = parseSpec('# Parent B\n\n## Child\n\nShared text', docId);
    const diffs = diffClauses(before, after);
    const moved = diffs.filter(d => d.diff_type === DiffType.MOVED);
    // "Child" section has same normalized content but different section_path
    expect(moved).toHaveLength(1);
    expect(moved[0].section_path_before).toEqual(['Parent A', 'Child']);
    expect(moved[0].section_path_after).toEqual(['Parent B', 'Child']);
  });

  it('handles complete replacement', () => {
    const before = parseSpec('# A\n\nOld', docId);
    const after = parseSpec('# X\n\nNew', docId);
    const diffs = diffClauses(before, after);
    const removed = diffs.filter(d => d.diff_type === DiffType.REMOVED);
    const added = diffs.filter(d => d.diff_type === DiffType.ADDED);
    expect(removed.length + added.length).toBe(2);
  });

  it('ignores formatting-only changes', () => {
    const before = parseSpec('# A\n\nPhoenix is a VCS.', docId);
    const after = parseSpec('# A\n\n**Phoenix** is a VCS.', docId);
    const diffs = diffClauses(before, after);
    expect(diffs.every(d => d.diff_type === DiffType.UNCHANGED)).toBe(true);
  });
});
