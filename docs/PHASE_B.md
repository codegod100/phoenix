# Phase B — Canonicalization, Warm Context Hashing & Change Classifier

## Overview

Phase B transforms clauses into a **Canonical Graph** — structured requirement nodes
(Requirements, Constraints, Invariants, Definitions). It also computes warm context
hashes that incorporate canonical graph context, and implements the A/B/C/D change classifier.

## Components

### 1. Canonical Node Model (`src/models/canonical.ts`)

```typescript
enum CanonicalType {
  REQUIREMENT = 'REQUIREMENT',
  CONSTRAINT = 'CONSTRAINT',
  INVARIANT = 'INVARIANT',
  DEFINITION = 'DEFINITION',
}

interface CanonicalNode {
  canon_id: string;            // content-addressed
  type: CanonicalType;
  statement: string;           // normalized canonical statement
  source_clause_ids: string[]; // provenance back to clauses
  linked_canon_ids: string[];  // edges to related canonical nodes
  tags: string[];              // extracted keywords/terms
}
```

### 2. Canonicalization Engine (`src/canonicalizer.ts`)

Extracts canonical nodes from clauses using rule-based extraction:

**Extraction Rules:**
- Lines containing "must", "shall", "required" → REQUIREMENT
- Lines containing "must not", "forbidden", "prohibited" → CONSTRAINT
- Lines containing "always", "never", "invariant" → INVARIANT
- Lines containing definitions (": ", "is defined as", "means") → DEFINITION
- Headings containing "constraint", "security", "limit" → CONSTRAINT context
- Headings containing "requirement" → REQUIREMENT context

**Linking Rules:**
- Nodes sharing terms/keywords get linked
- Nodes from same clause get linked
- Nodes referencing same entities get linked

### 3. Warm Context Hasher (`src/warm-hasher.ts`)

After canonicalization, compute `context_semhash_warm`:

```
context_semhash_warm = SHA-256(
  normalized_text +
  section_path.join('/') +
  sorted(linked_canon_ids).join(',') +
  sorted(canon_node_types).join(',')
)
```

### 4. Change Classifier (`src/classifier.ts`)

Classifies each change into A/B/C/D:

| Class | Meaning | Criteria |
|-------|---------|----------|
| A | Trivial | normalized_text identical, only formatting changed |
| B | Local semantic | clause_semhash changed, context_semhash_cold unchanged |
| C | Contextual shift | context_semhash changed, canonical links affected |
| D | Uncertain | classifier confidence below threshold |

**Signals:**
- `norm_diff`: edit distance of normalized texts
- `semhash_delta`: binary (same/different clause_semhash)
- `context_cold_delta`: binary (same/different context_semhash_cold)
- `term_ref_delta`: Jaccard distance of extracted terms
- `section_structure_delta`: section_path changed?
- `canon_impact`: number of affected canonical nodes

### 5. D-Rate Tracker (`src/d-rate.ts`)

Tracks D-classification rate over a rolling window.

- Target: ≤5%
- Acceptable: ≤10%
- Alarm: >15%

### 6. Bootstrap State Machine (`src/bootstrap.ts`)

States: `BOOTSTRAP_COLD` → `BOOTSTRAP_WARMING` → `STEADY_STATE`

Transitions:
- COLD → WARMING: after first canonicalization + warm pass complete
- WARMING → STEADY_STATE: after D-rate stabilizes below acceptable threshold

## Data Flow

```
Clauses (Phase A)
  → Canonicalizer.extract() → CanonicalNode[]
  → WarmHasher.computeWarm() → Clause[] (with warm hashes)
  → Classifier.classify() → ChangeClassification[]
  → DRateTracker.record() → DRateStatus
  → BootstrapState.transition()
```

## File Layout (Phase B additions)

```
src/
  models/
    canonical.ts       # CanonicalNode interface + types
    classification.ts  # ChangeClass enum + ChangeClassification
  canonicalizer.ts     # Clause → CanonicalNode extraction
  warm-hasher.ts       # Warm context hash computation
  classifier.ts        # A/B/C/D change classifier
  d-rate.ts            # D-rate tracking
  bootstrap.ts         # Bootstrap state machine
  store/
    canonical-store.ts # Canonical graph persistence
```
