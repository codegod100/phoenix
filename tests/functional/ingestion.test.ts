import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { SpecStore } from '../../src/store/spec-store.js';
import { DiffType } from '../../src/models/clause.js';

describe('Functional: Spec Ingestion Pipeline', () => {
  let tempDir: string;
  let store: SpecStore;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'phoenix-test-'));
    store = new SpecStore(tempDir);
  });

  const fixturesDir = join(import.meta.dirname, '..', 'fixtures');

  it('ingests a real spec document and produces correct clauses', () => {
    const result = store.ingestDocument(
      join(fixturesDir, 'spec-auth-v1.md'),
      fixturesDir,
    );

    expect(result.doc_id).toBe('spec-auth-v1.md');
    expect(result.clauses.length).toBeGreaterThan(0);

    // Should have sections: Authentication Service, Requirements, API Endpoints,
    // POST /auth/login, POST /auth/register, POST /auth/logout, Security Constraints
    const headings = result.clauses.map(c => c.section_path[c.section_path.length - 1]);
    expect(headings).toContain('Authentication Service');
    expect(headings).toContain('Requirements');
    expect(headings).toContain('Security Constraints');
  });

  it('retrieves stored clauses by document ID', () => {
    store.ingestDocument(
      join(fixturesDir, 'spec-auth-v1.md'),
      fixturesDir,
    );

    const clauses = store.getClauses('spec-auth-v1.md');
    expect(clauses.length).toBeGreaterThan(0);
    expect(clauses[0].source_doc_id).toBe('spec-auth-v1.md');
  });

  it('retrieves individual clauses by ID', () => {
    const result = store.ingestDocument(
      join(fixturesDir, 'spec-auth-v1.md'),
      fixturesDir,
    );

    const firstClause = result.clauses[0];
    const retrieved = store.getClause(firstClause.clause_id);
    expect(retrieved).not.toBeNull();
    expect(retrieved!.clause_id).toBe(firstClause.clause_id);
    expect(retrieved!.normalized_text).toBe(firstClause.normalized_text);
  });

  it('produces stable hashes across re-ingestion', () => {
    const result1 = store.ingestDocument(
      join(fixturesDir, 'spec-auth-v1.md'),
      fixturesDir,
    );
    const result2 = store.ingestDocument(
      join(fixturesDir, 'spec-auth-v1.md'),
      fixturesDir,
    );

    expect(result1.clauses.map(c => c.clause_semhash))
      .toEqual(result2.clauses.map(c => c.clause_semhash));
  });

  it('detects changes between v1 and v2 of a spec', () => {
    const v1Content = readFileSync(join(fixturesDir, 'spec-auth-v1.md'), 'utf8');
    const v2Content = readFileSync(join(fixturesDir, 'spec-auth-v2.md'), 'utf8');

    // Diff same logical document across versions
    const diffs = store.diffContent(v1Content, v2Content, 'spec-auth.md');

    const added = diffs.filter(d => d.diff_type === DiffType.ADDED);
    const modified = diffs.filter(d => d.diff_type === DiffType.MODIFIED);
    const unchanged = diffs.filter(d => d.diff_type === DiffType.UNCHANGED);

    // Some clauses should be unchanged (login, register, logout endpoints)
    expect(unchanged.length).toBeGreaterThan(0);
    // There should be additions or modifications (OAuth endpoint added, requirements modified, etc.)
    expect(added.length + modified.length).toBeGreaterThan(0);
  });

  it('handles multiple documents independently', () => {
    store.ingestDocument(join(fixturesDir, 'spec-auth-v1.md'), fixturesDir);
    store.ingestDocument(join(fixturesDir, 'spec-simple.md'), fixturesDir);

    const authClauses = store.getClauses('spec-auth-v1.md');
    const simpleClauses = store.getClauses('spec-simple.md');

    expect(authClauses.length).toBeGreaterThan(simpleClauses.length);
    expect(simpleClauses.length).toBe(3); // Simple Service, Feature A, Feature B
  });

  it('all clauses have required fields populated', () => {
    const result = store.ingestDocument(
      join(fixturesDir, 'spec-auth-v1.md'),
      fixturesDir,
    );

    for (const clause of result.clauses) {
      expect(clause.clause_id).toBeTruthy();
      expect(clause.clause_id).toHaveLength(64);
      expect(clause.source_doc_id).toBe('spec-auth-v1.md');
      expect(clause.source_line_range[0]).toBeGreaterThan(0);
      expect(clause.source_line_range[1]).toBeGreaterThanOrEqual(clause.source_line_range[0]);
      expect(clause.raw_text).toBeTruthy();
      expect(clause.normalized_text).toBeTruthy();
      expect(clause.section_path.length).toBeGreaterThan(0);
      expect(clause.clause_semhash).toHaveLength(64);
      expect(clause.context_semhash_cold).toHaveLength(64);
    }
  });

  it('formatting-only changes produce no diffs', () => {
    const v1 = '# Test\n\nPhoenix is a VCS.\n\n## Details\n\nIt tracks intent.';
    const v2 = '# Test\n\n**Phoenix** is a VCS.\n\n## Details\n\nIt tracks intent.';

    const diffs = store.diffContent(v1, v2, 'test.md');
    expect(diffs.every(d => d.diff_type === DiffType.UNCHANGED)).toBe(true);
  });
});
