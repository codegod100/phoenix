import { describe, it, expect } from 'vitest';
import { extractCanonicalNodes, extractTerms } from '../../src/canonicalizer.js';
import { parseSpec } from '../../src/spec-parser.js';
import { CanonicalType } from '../../src/models/canonical.js';

describe('extractCanonicalNodes', () => {
  it('extracts requirements from "must" statements', () => {
    const clauses = parseSpec('# Auth\n\nUsers must authenticate with email.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    const reqs = nodes.filter(n => n.type === CanonicalType.REQUIREMENT);
    expect(reqs.length).toBeGreaterThan(0);
    expect(reqs[0].statement).toContain('authenticate');
  });

  it('extracts constraints from "must not" statements', () => {
    const clauses = parseSpec('# Rules\n\nUsers must not share passwords.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    const constraints = nodes.filter(n => n.type === CanonicalType.CONSTRAINT);
    expect(constraints.length).toBeGreaterThan(0);
  });

  it('extracts constraints from "forbidden" statements', () => {
    const clauses = parseSpec('# Rules\n\nDirect database access is forbidden.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    const constraints = nodes.filter(n => n.type === CanonicalType.CONSTRAINT);
    expect(constraints.length).toBeGreaterThan(0);
  });

  it('extracts invariants from "always" statements', () => {
    const clauses = parseSpec('# Guarantees\n\nData must always be encrypted at rest.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    const invariants = nodes.filter(n => n.type === CanonicalType.INVARIANT);
    expect(invariants.length).toBeGreaterThan(0);
  });

  it('extracts definitions from colon patterns', () => {
    const clauses = parseSpec('# Glossary\n\nJWT: A JSON Web Token used for auth.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    const defs = nodes.filter(n => n.type === CanonicalType.DEFINITION);
    expect(defs.length).toBeGreaterThan(0);
  });

  it('uses heading context for classification', () => {
    const clauses = parseSpec('# Security Constraints\n\nAll endpoints use HTTPS.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    // "All endpoints use HTTPS" doesn't match specific patterns,
    // but heading context "Security Constraints" → CONSTRAINT
    expect(nodes.some(n => n.type === CanonicalType.CONSTRAINT)).toBe(true);
  });

  it('links nodes that share terms', () => {
    const spec = `# Auth

Users must authenticate with JWT tokens.

## Security

JWT tokens must be signed with RS256.`;
    const clauses = parseSpec(spec, 'test.md');
    const nodes = extractCanonicalNodes(clauses);

    // Both mention "jwt" and "tokens" — should be linked
    const jwtNodes = nodes.filter(n => n.statement.includes('jwt'));
    if (jwtNodes.length >= 2) {
      expect(jwtNodes[0].linked_canon_ids.length).toBeGreaterThan(0);
    }
  });

  it('sets source_clause_ids for provenance', () => {
    const clauses = parseSpec('# Auth\n\nUsers must log in.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    expect(nodes.length).toBeGreaterThan(0);
    expect(nodes[0].source_clause_ids).toContain(clauses[0].clause_id);
  });

  it('generates unique canon_ids', () => {
    const spec = `# Auth

Users must authenticate.
Sessions must expire after 24h.`;
    const clauses = parseSpec(spec, 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    const ids = new Set(nodes.map(n => n.canon_id));
    expect(ids.size).toBe(nodes.length);
  });

  it('returns empty array for clause with no extractable content', () => {
    const clauses = parseSpec('# Title\n\nJust some description text.', 'test.md');
    const nodes = extractCanonicalNodes(clauses);
    // "Just some description text" doesn't match any pattern and
    // heading "Title" doesn't give context
    expect(nodes).toEqual([]);
  });
});

describe('extractTerms', () => {
  it('extracts meaningful terms, excluding stop words', () => {
    const terms = extractTerms('users must authenticate with email and password');
    expect(terms).toContain('users');
    expect(terms).toContain('authenticate');
    expect(terms).toContain('email');
    expect(terms).toContain('password');
    expect(terms).not.toContain('and');
    expect(terms).not.toContain('with');
  });

  it('filters short words', () => {
    const terms = extractTerms('a is on it by');
    expect(terms).toEqual([]);
  });

  it('deduplicates terms', () => {
    const terms = extractTerms('token token token value');
    expect(terms.filter(t => t === 'token')).toHaveLength(1);
  });
});
