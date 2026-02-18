/**
 * Canonical Node — structured requirement extracted from clauses.
 */

export enum CanonicalType {
  REQUIREMENT = 'REQUIREMENT',
  CONSTRAINT = 'CONSTRAINT',
  INVARIANT = 'INVARIANT',
  DEFINITION = 'DEFINITION',
}

export interface CanonicalNode {
  /** Content-addressed ID */
  canon_id: string;
  /** Node type */
  type: CanonicalType;
  /** Normalized canonical statement */
  statement: string;
  /** Provenance: source clause IDs */
  source_clause_ids: string[];
  /** Edges to related canonical nodes */
  linked_canon_ids: string[];
  /** Extracted keywords/terms for linking */
  tags: string[];
}

export interface CanonicalGraph {
  nodes: Record<string, CanonicalNode>;
  /** Provenance edges: canon_id → clause_id[] */
  provenance: Record<string, string[]>;
}
