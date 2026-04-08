---
name: panproto
description: Category-theoretic schema morphisms for Phoenix VCS using panproto's Generalized Algebraic Theory engine. Enables theory morphisms between spec representations, protolens-based traceability, and automatic migration detection.
---

# Panproto — Schema Morphisms for Phoenix

**Universal schema migration engine** for Phoenix VCS pipeline transformations. Treats each pipeline phase as a mathematical theory with composable morphisms.

```
Spec ──[Ingest morphism]──► Clause ──[Canonicalize morphism]──► Canonical
                                                         │
                                                         ▼
                                                      Code ◄──[Regen morphism]── IU ◄──[Plan morphism]
```

Each arrow is a **theory morphism** — a structure-preserving map between GATs. Protolenses provide bidirectional transformations.

## ✅ WASM Build Status: Complete

The WASM has been built from the vendored source and is ready to use:

```bash
node .pi/skills/panproto/panproto.js --help
# ✅ Local WASM loaded successfully
```

### Rebuilding WASM (if needed)

```bash
cd .pi/skills/panproto
./build-wasm.sh
```

Requirements: Rust, wasm-bindgen-cli 0.2.114

### Native Fallback

If WASM is unavailable:

```bash
export PANPROTO_NATIVE=1
node panproto.js diff --old old.json --new new.json
```

| Feature | WASM Mode | Native Mode |
|---------|-----------|-------------|
| Schema diff | ✅ Full GAT | ✅ Basic JSON |
| IU impact | ✅ Theory morphism | ✅ Vertex matching |
| Protolens | ✅ Auto-generate | ❌ Not available |
| Migration | ✅ Compile & apply | ❌ Not available |

## Pipeline Category

| Phase | Theory | Morphism | Protolens |
|-------|--------|----------|-----------|
| **Ingest** | `ThSpec` → `ThClause` | `μ_ingest` | Extract clauses from markdown |
| **Canonicalize** | `ThClause` → `ThCanon` | `μ_canon` | Normalize to clean requirements |
| **Plan** | `ThCanon` → `ThIU` | `μ_plan` | Group into compilation boundaries |
| **Regen** | `ThIU` → `ThCode` | `μ_regen` | Generate code stubs |

## Installation

```bash
cd .pi/skills/panproto
npm install  # Try npm package first

# If WASM fails, use native mode:
export PANPROTO_NATIVE=1
node panproto.js --help
```

## Usage

### 1. Define Phoenix Protocol

```javascript
const { Panproto, definePhoenixProtocol } = await import('./lib/panproto-phoenix.js');

const pan = await Panproto.init();

// Register Phoenix VCS theories
const phoenixProto = definePhoenixProtocol(pan);
```

### 2. Schema Morphism — Track Spec Changes

```javascript
// Build schemas from current and previous spec
const oldSpecSchema = phoenixProto.specSchema(oldClauses);
const newSpecSchema = phoenixProto.specSchema(newClauses);

// Detect breaking changes
const diff = pan.diffFull(oldSpecSchema, newSpecSchema);
console.log(`Breaking changes: ${diff.breaking.length}`);
console.log(`Safe changes: ${diff.nonBreaking.length}`);

// Classify impact on IUs
const impact = diff.classifyImpact(iuGraph);
```

### 3. Protolens — Bidirectional Traceability

```javascript
// Create lens between canonical and code representations
const traceLens = pan.lens(canonicalSchema, codeSchema);

// Forward: requirements → code locations
const { view: codeLocations, complement } = traceLens.get(requirements);

// Backward: code → requirements (with complement for round-trip)
const restoredReqs = traceLens.put(modifiedCode, complement);
```

### 4. Migration — Auto-Generate Pipeline Transforms

```javascript
// When canonical changes, compute IU migration
const migration = pan.migration(oldCanonSchema, newCanonSchema)
  .map('REQ-1a2b', 'REQ-1a2b')      // preserved requirement
  .map('REQ-3c4d', 'REQ-3c4d-new')  // renamed requirement
  .compile();

// Apply to IU structure
const migratedIUs = migration.lift(currentIUs);
```

### 5. CLI Commands

```bash
# Analyze spec changes for breaking vs non-breaking
node .pi/skills/panproto/panproto.js morphism --from .phoenix/clauses-prev.json --to .phoenix/clauses.json

# Generate protolens for traceability
node .pi/skills/panproto/panproto.js lens --from canonical --to code --output traceability.json

# Compute IU impact from spec changes
node .pi/skills/panproto/panproto.js impact --spec-diff spec-diff.json --ius .phoenix/graphs/ius.json

# Validate migration correctness
node .pi/skills/panproto/panproto.js check --migration migration.json --from old.json --to new.json
```

## Theory Specifications

### ThSpec — Raw Specification

```yaml
sorts:
  - Document        # Markdown file
  - Section         # Heading section
  - Clause          # Requirement line

operations:
  - clauses: Document → List(Clause)
  - sectionOf: Clause → Section
  - rawText: Clause → String
```

### ThClause — Extracted Clauses

```yaml
sorts:
  - ClauseId        # SHA-256 hash
  - ClauseType      # REQUIREMENT | CONSTRAINT | DEFINITION
  - NormalizedText

operations:
  - clauseId: Clause → ClauseId
  - clauseType: Clause → ClauseType
  - normalize: RawText → NormalizedText
```

### ThCanon — Canonical Requirements

```yaml
sorts:
  - CanonId         # Content-addressed
  - Statement       # Clean requirement
  - Constraint

operations:
  - canonId: Statement → CanonId
  - sources: CanonId → List(ClauseId)
  - dependencies: CanonId → List(CanonId)
```

### ThIU — Implementation Units

```yaml
sorts:
  - IUId            # Hash of canon nodes + config
  - Boundary
  - Contract

operations:
  - iuId: Boundary → IUId
  - contains: IUId → List(CanonId)
  - riskTier: IUId → RiskLevel
```

## Integration with Phoenix Pipeline

### Selective Invalidation via Morphisms

```javascript
// When spec changes, compute the minimal invalidation
const morphism = computeMorphism(oldSpec, newSpec);
const affectedIUs = morphism.image().intersect(iuGraph);

// Only regenerate affected IUs
for (const iu of affectedIUs) {
  await regen(iu);
}
```

### Traceability Preservation

```javascript
// Build symmetric lens for full bidirectional sync
const symLens = pan.symmetricLens(canonicalSchema, codeSchema);

// Sync: update code when canonical changes
const { newA: updatedCode } = symLens.sync(
  { a: currentCode, b: currentCanon },
  { a: newCode, b: newCanon }
);
```

### Using with Phoenix Status

```bash
# Check Phoenix status, then analyze impact
node .pi/skills/phoenix-status/status.js
node .pi/skills/panproto/panproto.js impact \
  --ius .phoenix/graphs/ius.json \
  --canon .phoenix/graphs/canonical.json \
  --spec-diff .phoenix/spec-diff.json
```

## API Reference

### PanprotoPhoenix Class

| Method | Description |
|--------|-------------|
| `specSchema(clauses)` | Build `ThSpec` schema from clause array |
| `canonSchema(nodes)` | Build `ThCanon` schema from canonical nodes |
| `iuSchema(units)` | Build `ThIU` schema from IU array |
| `codeSchema(files)` | Build `ThCode` schema from generated files |
| `ingestMorphism()` | Morphism: `ThSpec → ThClause` |
| `canonMorphism()` | Morphism: `ThClause → ThCanon` |
| `planMorphism()` | Morphism: `ThCanon → ThIU` |
| `regenMorphism()` | Morphism: `ThIU → ThCode` |

### Morphism Operations

| Method | Description |
|--------|-------------|
| `map(src, tgt)` | Map source vertex to target vertex |
| `mapEdge(src, tgt)` | Map source edge to target edge |
| `compile()` | Compile to executable transformation |
| `lift(data)` | Apply morphism to data |
| `invert()` | Compute inverse morphism (if bijective) |
| `compose(other)` | Compose two morphisms |

### Diff & Validation

| Method | Description |
|--------|-------------|
| `diff(old, new)` | Structural diff between schemas |
| `diffFull(old, new)` | 20+ category diff with breaking detection |
| `checkExistence()` | Validate morphism correctness |
| `validate(schema)` | Validate against theory axioms |

## Architecture

```
┌─────────────────────────────────────────┐
│         panproto skill                  │
│  ┌──────────┐  ┌──────────┐  ┌───────┐  │
│  │ protocol │  │ morphism │  │ lens  │  │
│  │  loader  │  │  engine  │  │ store │  │
│  └────┬─────┘  └────┬─────┘  └───┬───┘  │
│       └─────────────┴────────────┘       │
│                  │                        │
│       ┌──────────▼──────────┐            │
│       │  @panproto/core     │            │
│       │  (WASM via vendor)  │            │
│       └─────────────────────┘            │
└─────────────────────────────────────────┘
```

## Safety Guarantees

1. **Type-checked morphisms** — Every morphism validated as well-formed theory morphism at GAT level
2. **Verified equations** — Schemas checked against protocol theory axioms
3. **Pullback-enhanced merges** — Three-way merge uses categorical pullbacks to detect structural overlap

## Dependencies

- `@panproto/core` (vendored in `vendor/`)
- Node.js >= 20 (WASM requirement)

## License

MIT — same as panproto
