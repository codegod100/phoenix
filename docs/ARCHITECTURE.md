# Phoenix VCS — System Architecture

## Overview

Phoenix is a causal compiler for intent. It transforms spec documents through a deterministic pipeline into generated code, with full provenance tracking and selective invalidation.

## System Layers

```
┌─────────────────────────────────────────────────┐
│                   CLI / Bot Interface            │
├─────────────────────────────────────────────────┤
│              Policy & Evidence Engine            │
├─────────────────────────────────────────────────┤
│             Regeneration Engine                  │
├─────────────────────────────────────────────────┤
│        Implementation Graph (IU Manager)        │
├─────────────────────────────────────────────────┤
│        Canonicalization Pipeline                 │
├─────────────────────────────────────────────────┤
│     Spec Ingestion (Clause Extraction)          │
├─────────────────────────────────────────────────┤
│          Content-Addressed Store                │
│         (Graph DB + Blob Storage)               │
└─────────────────────────────────────────────────┘
```

## Five Core Graphs

1. **Spec Graph** — Clauses extracted from spec documents
2. **Canonical Graph** — Requirements, Constraints, Invariants, Definitions
3. **Implementation Graph** — Implementation Units (IUs) with contracts & boundaries
4. **Evidence Graph** — Tests, analysis results, reviews bound to nodes
5. **Provenance Graph** — All transformation edges connecting the above

## Content Addressing

All nodes use content-based IDs:
- `clause:{sha256(normalized_text + source_doc_id + section_path)}`
- `canon:{sha256(canonical_statement + type + linked_clauses)}`
- `iu:{sha256(kind + contract + boundary_policy)}`

## Directory Structure

```
.phoenix/                    # Phoenix metadata root
  store/                     # Content-addressed store
    objects/                 # All graph nodes (JSON)
    refs/                    # Named references
  graphs/
    spec.json                # Spec graph index
    canonical.json           # Canonical graph index
    implementation.json      # IU graph index
    evidence.json            # Evidence graph index
    provenance.json          # Provenance edges
  manifests/
    generated_manifest.json  # Generated file hashes
  state.json                 # System state (BOOTSTRAP_COLD, WARMING, STEADY_STATE)
  config.json                # Pipeline configuration
```

## Build Phases

| Phase | Components | Dependencies |
|-------|-----------|-------------|
| A | Clause extraction, clause_semhash | None |
| B | Canonicalization, warm hashing, classifier | A |
| C1 | IU module-level, regen, manifest | B |
| C2 | Boundary validator, UnitBoundaryChange | C1 |
| D | Evidence, policy, cascade | C2 |
| E | Shadow pipeline, compaction | D |
| F | Freeq bots | All |
