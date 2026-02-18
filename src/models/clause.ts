/**
 * Core Clause model — the atomic unit of spec decomposition.
 * Every spec document is parsed into an array of Clauses.
 */

export interface Clause {
  /** Content-addressed ID: SHA-256(source_doc_id + section_path + normalized_text) */
  clause_id: string;
  /** Document identifier (usually relative file path) */
  source_doc_id: string;
  /** [startLine, endLine] 1-indexed inclusive */
  source_line_range: [number, number];
  /** Original text as found in the document */
  raw_text: string;
  /** Normalized text for stable hashing */
  normalized_text: string;
  /** Heading hierarchy, e.g. ["1. Adoption Scope", "v1 Scope"] */
  section_path: string[];
  /** SHA-256 of normalized_text — content identity */
  clause_semhash: string;
  /** SHA-256 of normalized_text + section_path + neighbor hashes — local structural context */
  context_semhash_cold: string;
}

export interface IngestResult {
  doc_id: string;
  clauses: Clause[];
  timestamp: string;
}

export enum DiffType {
  ADDED = 'ADDED',
  REMOVED = 'REMOVED',
  MODIFIED = 'MODIFIED',
  MOVED = 'MOVED',
  UNCHANGED = 'UNCHANGED',
}

export interface ClauseDiff {
  diff_type: DiffType;
  clause_id_before?: string;
  clause_id_after?: string;
  clause_before?: Clause;
  clause_after?: Clause;
  section_path_before?: string[];
  section_path_after?: string[];
}
