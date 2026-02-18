/**
 * Canonicalization Engine
 *
 * Extracts structured canonical nodes (Requirements, Constraints,
 * Invariants, Definitions) from clauses using rule-based extraction.
 */

import type { Clause } from './models/clause.js';
import type { CanonicalNode } from './models/canonical.js';
import { CanonicalType } from './models/canonical.js';
import { sha256 } from './semhash.js';
import { normalizeText } from './normalizer.js';

/** Patterns for classifying lines into canonical types */
const REQUIREMENT_PATTERNS = [
  /\b(?:must|shall|required|requires?)\b/i,
  /\b(?:needs? to|has to|will)\b/i,
];

const CONSTRAINT_PATTERNS = [
  /\b(?:must not|shall not|forbidden|prohibited|cannot|disallowed)\b/i,
  /\b(?:limited to|maximum|minimum|at most|at least|no more than)\b/i,
];

const INVARIANT_PATTERNS = [
  /\b(?:always|never|invariant|at all times|guaranteed)\b/i,
];

const DEFINITION_PATTERNS = [
  /\b(?:is defined as|means|refers to)\b/i,
  /:\s+\S/,  // colon followed by text (definition-style)
];

/** Heading patterns that provide type context */
const HEADING_CONTEXT: [RegExp, CanonicalType][] = [
  [/\b(?:constraint|security|limit|restrict)/i, CanonicalType.CONSTRAINT],
  [/\b(?:requirement|feature|capability)/i, CanonicalType.REQUIREMENT],
  [/\b(?:definition|glossary|term)/i, CanonicalType.DEFINITION],
  [/\b(?:invariant|guarantee)/i, CanonicalType.INVARIANT],
];

/**
 * Extract canonical nodes from an array of clauses.
 */
export function extractCanonicalNodes(clauses: Clause[]): CanonicalNode[] {
  const allNodes: CanonicalNode[] = [];

  for (const clause of clauses) {
    const nodes = extractFromClause(clause);
    allNodes.push(...nodes);
  }

  // Link nodes that share terms
  linkNodesByTerms(allNodes);

  return allNodes;
}

/**
 * Extract canonical nodes from a single clause.
 */
function extractFromClause(clause: Clause): CanonicalNode[] {
  const nodes: CanonicalNode[] = [];
  const lines = clause.raw_text.split('\n');

  // Determine heading context type
  const headingContext = getHeadingContext(clause.section_path);

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.match(/^#{1,6}\s/)) continue; // skip empty and heading lines

    // Strip list markers for analysis
    const content = trimmed.replace(/^(?:[-*•]|\d+[.)]\s*)\s*/, '');
    if (!content || content.length < 5) continue;

    const type = classifyLine(content, headingContext);
    if (!type) continue;

    const normalizedStatement = normalizeText(content);
    if (!normalizedStatement) continue;

    const tags = extractTerms(normalizedStatement);
    const canonId = sha256([type, normalizedStatement, clause.clause_id].join('\x00'));

    nodes.push({
      canon_id: canonId,
      type,
      statement: normalizedStatement,
      source_clause_ids: [clause.clause_id],
      linked_canon_ids: [],
      tags,
    });
  }

  return nodes;
}

/**
 * Classify a line into a canonical type based on patterns and context.
 */
function classifyLine(content: string, headingContext: CanonicalType | null): CanonicalType | null {
  // Check specific patterns first (most specific wins)
  for (const pattern of CONSTRAINT_PATTERNS) {
    if (pattern.test(content)) return CanonicalType.CONSTRAINT;
  }
  for (const pattern of INVARIANT_PATTERNS) {
    if (pattern.test(content)) return CanonicalType.INVARIANT;
  }
  for (const pattern of REQUIREMENT_PATTERNS) {
    if (pattern.test(content)) return CanonicalType.REQUIREMENT;
  }
  for (const pattern of DEFINITION_PATTERNS) {
    if (pattern.test(content)) return CanonicalType.DEFINITION;
  }

  // Fall back to heading context
  if (headingContext) return headingContext;

  return null;
}

/**
 * Determine canonical type context from section path headings.
 */
function getHeadingContext(sectionPath: string[]): CanonicalType | null {
  // Check from most specific (deepest) to least specific
  for (let i = sectionPath.length - 1; i >= 0; i--) {
    for (const [pattern, type] of HEADING_CONTEXT) {
      if (pattern.test(sectionPath[i])) return type;
    }
  }
  return null;
}

/**
 * Extract key terms from normalized text for linking.
 */
export function extractTerms(text: string): string[] {
  // Split into words, filter short/common words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being',
    'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
    'should', 'may', 'might', 'shall', 'can', 'must', 'need', 'to', 'of',
    'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into', 'through',
    'and', 'or', 'but', 'not', 'no', 'if', 'then', 'else', 'when', 'where',
    'that', 'this', 'these', 'those', 'it', 'its', 'all', 'each', 'every',
    'any', 'both', 'few', 'more', 'most', 'other', 'some', 'such',
  ]);

  const words = text.toLowerCase()
    .split(/\s+/)
    .map(w => w.replace(/[^a-z0-9]/g, ''))
    .filter(Boolean);
  return [...new Set(
    words.filter(w => w.length > 2 && !stopWords.has(w))
  )];
}

/**
 * Link canonical nodes that share significant terms.
 * Modifies nodes in place.
 */
function linkNodesByTerms(nodes: CanonicalNode[]): void {
  for (let i = 0; i < nodes.length; i++) {
    for (let j = i + 1; j < nodes.length; j++) {
      const shared = nodes[i].tags.filter(t => nodes[j].tags.includes(t));
      if (shared.length >= 2) {
        if (!nodes[i].linked_canon_ids.includes(nodes[j].canon_id)) {
          nodes[i].linked_canon_ids.push(nodes[j].canon_id);
        }
        if (!nodes[j].linked_canon_ids.includes(nodes[i].canon_id)) {
          nodes[j].linked_canon_ids.push(nodes[i].canon_id);
        }
      }
    }
  }
}
