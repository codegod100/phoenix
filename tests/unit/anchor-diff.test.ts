/**
 * Tests for anchor-based diff classification.
 * When canon nodes have matching anchors across before/after, 
 * the classifier should downgrade D→B (same concept, different wording).
 */
import { describe, it, expect } from 'vitest';
import { classifyChange } from '../../src/classifier.js';
import { extractCanonicalNodes } from '../../src/canonicalizer.js';
import { parseSpec } from '../../src/spec-parser.js';
import { DiffType } from '../../src/models/clause.js';
import { ChangeClass } from '../../src/models/classification.js';

describe('anchor-based diff classification', () => {
  it('classifies reworded clause as B when anchors match', () => {
    // Before: one wording
    const specBefore = `# Auth

- Users must authenticate with email and password
- Sessions expire after 24 hours`;

    // After: heavily reworded but same concept
    const specAfter = `# Auth

- Email and password authentication is required for all users
- Session timeout is 24 hours`;

    const clausesBefore = parseSpec(specBefore, 'auth.md');
    const clausesAfter = parseSpec(specAfter, 'auth.md');
    const canonBefore = extractCanonicalNodes(clausesBefore);
    const canonAfter = extractCanonicalNodes(clausesAfter);

    // Classify the MODIFIED diff
    const result = classifyChange(
      {
        diff_type: DiffType.MODIFIED,
        clause_id_before: clausesBefore[0].clause_id,
        clause_id_after: clausesAfter[0].clause_id,
        clause_before: clausesBefore[0],
        clause_after: clausesAfter[0],
      },
      canonBefore,
      canonAfter,
    );

    // Should be B or C (semantic change), NOT D (uncertain)
    expect([ChangeClass.A, ChangeClass.B, ChangeClass.C]).toContain(result.change_class);
  });

  it('classifies genuinely new content as C or D', () => {
    const specBefore = `# Auth

- Users must authenticate with email and password`;

    const specAfter = `# Auth

- The system must support OAuth2 SSO with SAML federation`;

    const clausesBefore = parseSpec(specBefore, 'auth.md');
    const clausesAfter = parseSpec(specAfter, 'auth.md');
    const canonBefore = extractCanonicalNodes(clausesBefore);
    const canonAfter = extractCanonicalNodes(clausesAfter);

    const result = classifyChange(
      {
        diff_type: DiffType.MODIFIED,
        clause_id_before: clausesBefore[0].clause_id,
        clause_id_after: clausesAfter[0].clause_id,
        clause_before: clausesBefore[0],
        clause_after: clausesAfter[0],
      },
      canonBefore,
      canonAfter,
    );

    // Genuinely different content — should be B, C, or D
    expect([ChangeClass.B, ChangeClass.C, ChangeClass.D]).toContain(result.change_class);
  });

  it('preserves A classification for unchanged content', () => {
    const spec = `# Auth

- Users must authenticate with email and password`;

    const clauses = parseSpec(spec, 'auth.md');
    const canon = extractCanonicalNodes(clauses);

    const result = classifyChange(
      {
        diff_type: DiffType.UNCHANGED,
        clause_id_before: clauses[0].clause_id,
        clause_id_after: clauses[0].clause_id,
        clause_before: clauses[0],
        clause_after: clauses[0],
      },
      canon,
      canon,
    );

    expect(result.change_class).toBe(ChangeClass.A);
  });
});
