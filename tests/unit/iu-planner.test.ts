import { describe, it, expect } from 'vitest';
import { planIUs } from '../../src/iu-planner.js';
import { parseSpec } from '../../src/spec-parser.js';
import { extractCanonicalNodes } from '../../src/canonicalizer.js';

describe('planIUs', () => {
  it('returns empty array for no canonical nodes', () => {
    expect(planIUs([], [])).toEqual([]);
  });

  it('creates IUs from canonical nodes', () => {
    const clauses = parseSpec('# Auth\n\nUsers must log in.\nPasswords must be hashed.', 'test.md');
    const canon = extractCanonicalNodes(clauses);
    const ius = planIUs(canon, clauses);
    expect(ius.length).toBeGreaterThan(0);
  });

  it('groups linked canonical nodes into the same IU', () => {
    const spec = `# Auth

Users must authenticate with JWT tokens.

## Security

JWT tokens must be signed with RS256.`;
    const clauses = parseSpec(spec, 'test.md');
    const canon = extractCanonicalNodes(clauses);
    const ius = planIUs(canon, clauses);
    // Linked nodes should be grouped — fewer IUs than nodes
    expect(ius.length).toBeLessThanOrEqual(canon.length);
  });

  it('sets risk tier based on constraints', () => {
    const clauses = parseSpec('# Security Constraints\n\nDirect DB access is forbidden.\nRate limited to 5 per minute.', 'test.md');
    const canon = extractCanonicalNodes(clauses);
    const ius = planIUs(canon, clauses);
    expect(ius.length).toBeGreaterThan(0);
    // Should be medium or high due to constraints
    expect(['medium', 'high', 'critical']).toContain(ius[0].risk_tier);
  });

  it('populates all required IU fields', () => {
    const clauses = parseSpec('# Auth\n\nUsers must authenticate.', 'test.md');
    const canon = extractCanonicalNodes(clauses);
    const ius = planIUs(canon, clauses);

    for (const iu of ius) {
      expect(iu.iu_id).toHaveLength(64);
      expect(iu.kind).toBe('module');
      expect(iu.name).toBeTruthy();
      expect(iu.risk_tier).toBeTruthy();
      expect(iu.contract.description).toBeTruthy();
      expect(iu.source_canon_ids.length).toBeGreaterThan(0);
      expect(iu.output_files.length).toBeGreaterThan(0);
      expect(iu.boundary_policy).toBeTruthy();
      expect(iu.evidence_policy.required.length).toBeGreaterThan(0);
    }
  });

  it('generates output file paths under src/generated/', () => {
    const clauses = parseSpec('# Auth\n\nUsers must log in.', 'test.md');
    const canon = extractCanonicalNodes(clauses);
    const ius = planIUs(canon, clauses);

    for (const iu of ius) {
      for (const f of iu.output_files) {
        expect(f).toMatch(/^src\/generated\//);
        expect(f).toMatch(/\.ts$/);
      }
    }
  });

  it('assigns evidence policy based on risk tier', () => {
    const clauses = parseSpec('# Auth\n\nUsers must log in.', 'test.md');
    const canon = extractCanonicalNodes(clauses);
    const ius = planIUs(canon, clauses);

    for (const iu of ius) {
      expect(iu.evidence_policy.required).toContain('typecheck');
      if (iu.risk_tier === 'medium' || iu.risk_tier === 'high') {
        expect(iu.evidence_policy.required).toContain('unit_tests');
      }
    }
  });
});
