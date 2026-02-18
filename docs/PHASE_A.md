# Phase A — Clause Extraction & Semantic Hashing

## Overview

Phase A is the foundation layer. It parses spec documents (Markdown) into discrete clauses and computes semantic hashes for change detection.

## Components

### 1. Spec Parser (`src/spec-parser.ts`)

Parses Markdown spec documents into structured clauses.

**Input:** Markdown file content + document ID  
**Output:** Array of `Clause` objects

**Parsing Rules:**
- Split on heading boundaries (any level: #, ##, ###, etc.)
- Each heading + its body content = one clause
- Track section hierarchy (e.g., `["1. Adoption Scope", "v1 Scope"]`)
- Record source line ranges
- Preserve raw text, compute normalized text

**Normalization:**
- Lowercase
- Collapse whitespace (multiple spaces/tabs → single space)
- Strip leading/trailing whitespace per line
- Remove markdown formatting characters (**, *, `, #)
- Remove empty lines
- Sort list items within a list block (for order-invariant hashing)

### 2. Clause Model (`src/models/clause.ts`)

```typescript
interface Clause {
  clause_id: string;           // content-addressed hash
  source_doc_id: string;       // document identifier
  source_line_range: [number, number]; // [start, end] 1-indexed
  raw_text: string;            // original text
  normalized_text: string;     // after normalization
  section_path: string[];      // heading hierarchy
  clause_semhash: string;      // SHA-256 of normalized_text
  context_semhash_cold: string; // SHA-256 of normalized_text + section_path + adjacent clause hashes
}
```

### 3. Semantic Hasher (`src/semhash.ts`)

**clause_semhash:** `SHA-256(normalized_text)`

**context_semhash_cold:** `SHA-256(normalized_text + section_path.join('/') + prev_clause_semhash + next_clause_semhash)`

This captures local context without requiring the canonical graph (cold start).

### 4. Spec Graph Store (`src/store/spec-store.ts`)

Persists clauses to the content-addressed store and maintains the spec graph index.

**Operations:**
- `ingestDocument(docPath: string): IngestResult`
- `getClauses(docId: string): Clause[]`
- `getClause(clauseId: string): Clause | null`
- `diffDocument(docPath: string): ClauseDiff[]`

### 5. Diff Engine (`src/diff.ts`)

Compares previous vs. current clauses for a document.

**Diff types:**
- `ADDED` — new clause
- `REMOVED` — clause deleted
- `MODIFIED` — clause_semhash changed
- `MOVED` — section_path changed but content same
- `UNCHANGED` — identical

## Data Flow

```
spec/*.md → SpecParser.parse() → Clause[] → SemHasher.hash() → Clause[] (with hashes) → SpecStore.save()
```

## File Layout

```
src/
  models/
    clause.ts          # Clause interface + types
  spec-parser.ts       # Markdown → Clause[] parser
  semhash.ts           # Semantic hashing functions
  normalizer.ts        # Text normalization
  diff.ts              # Clause diff engine
  store/
    spec-store.ts      # Spec graph persistence
    content-store.ts   # Content-addressed object store
  index.ts             # Public API exports
```

## Success Criteria

1. Parse a Markdown spec into correct clauses with accurate line ranges
2. Normalized text is deterministic and order-invariant for lists
3. clause_semhash is stable across formatting-only changes
4. context_semhash_cold captures local structure
5. Diff engine correctly classifies all change types
6. Store persists and retrieves clauses by ID and document
