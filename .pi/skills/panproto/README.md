# Panproto Skill for Phoenix VCS

Category-theoretic schema morphisms for the Phoenix pipeline using [panproto](https://github.com/panproto/panproto)'s Generalized Algebraic Theory engine.

## Overview

This skill treats Phoenix pipeline phases as mathematical theories with composable morphisms:

```
ThSpec ──[μ_ingest]──► ThClause ──[μ_canon]──► ThCanon ──[μ_plan]──► ThIU ──[μ_regen]──► ThCode
```

Each morphism is a **structure-preserving map** between GATs (Generalized Algebraic Theories). Protolenses provide bidirectional traceability.

## ✅ Status: WASM Built and Ready

The skill now includes a **locally built WASM** from the vendored panproto source:

```bash
cd .pi/skills/panproto
node panproto.js --help
# ✅ Local WASM loaded successfully
```

### Build WASM (if needed)

If you need to rebuild the WASM (e.g., after vendor updates):

```bash
cd .pi/skills/panproto
./build-wasm.sh
```

Requirements:
- Rust (https://rustup.rs/)
- wasm-bindgen-cli 0.2.114 (auto-installed by script)

### Fallback: Native Mode

If WASM fails, you can use native JavaScript mode (limited functionality):

```bash
export PANPROTO_NATIVE=1
node panproto.js diff --old old.json --new new.json
```

Native mode supports basic diff and impact analysis but not protolens generation.

## Quick Start

```bash
cd .pi/skills/panproto

# Compute impact of spec changes on IUs
node panproto.js impact \
  --ius .phoenix/graphs/ius.json \
  --canon .phoenix/graphs/canonical.json
```

### 2. Create Traceability Lens

```bash
# Build bidirectional traceability between canonical and code
node panproto.js lens \
  --from .phoenix/graphs/canonical.json \
  --to src/generated/ \
  --fromType canon \
  --toType code \
  --output .phoenix/traceability.json
```

### 3. Diff Schemas

```bash
# Compare canonical versions for breaking changes
node panproto.js diff \
  --old .phoenix/graphs/canonical-prev.json \
  --new .phoenix/graphs/canonical.json \
  --type canon
```

## API Usage

```javascript
import { PanprotoPipeline } from './lib/pipeline-integration.js';

const pipeline = await new PanprotoPipeline('./my-project').init();

// Analyze impact
const impact = pipeline.analyzeImpact();
console.log(`Affected IUs: ${impact.affectedIUs.length}`);

// Get invalidation list
const invalidation = pipeline.getInvalidationList();
console.log(`Need regen: ${invalidation.needsRegen.join(', ')}`);

// Generate report
const report = pipeline.generateReport();
console.log(report.recommendations);

// Cleanup
pipeline.dispose();
```

## Theory Specifications

### ThSpec — Raw Specifications
- **Sorts**: Document, Section, Clause, ClauseType, RawText
- **Operations**: clauses, sectionOf, clauseType, rawText

### ThClause — Normalized Clauses
- **Sorts**: ClauseId, NormalizedText, SemanticHash, SourceRange
- **Operations**: clauseId, normalize, source

### ThCanon — Canonical Requirements
- **Sorts**: CanonId, CanonNode, NodeType, CleanStatement, Constraint
- **Operations**: canonId, nodeType, sources, dependencies

### ThIU — Implementation Units
- **Sorts**: IUId, IUBoundary, IUContract, RiskTier, EvidencePolicy
- **Operations**: iuId, contains, riskTier, contract, boundaryPolicy

### ThCode — Generated Code
- **Sorts**: CodeFile, CodeModule, CodeFunction, CodeType, TraceabilityRef
- **Operations**: fileId, iuRef, exports, implements, tracesTo

## Pipeline Morphisms

| Morphism | Source → Target | Purpose |
|----------|-----------------|---------|
| μ_ingest | ThSpec → ThClause | Extract clauses from markdown |
| μ_canon | ThClause → ThCanon | Normalize to clean requirements |
| μ_plan | ThCanon → ThIU | Group into compilation boundaries |
| μ_regen | ThIU → ThCode | Generate code stubs |

## CLI Reference

### Commands

| Command | Description | Key Options |
|---------|-------------|-------------|
| `morphism` | Compute pipeline morphism | `--from`, `--to`, `--type` |
| `lens` | Create traceability protolens | `--from`, `--to`, `--output` |
| `diff` | Analyze schema changes | `--old`, `--new`, `--type` |
| `impact` | Compute IU invalidation | `--ius`, `--canon` |
| `check` | Validate migration | `--migration`, `--from`, `--to` |

### Options

```
--from, --old     Source schema file
--to, --new       Target schema file
--type            Schema type: spec|clause|canon|iu|code
--ius             IU graph file
--canon           Canonical graph file
--migration       Migration spec file
--output          Output file for lens/morphism
```

## Integration with Phoenix Pipeline

### Selective Invalidation

The key insight: **content-addressed IDs enable automatic morphisms**. When canonical requirements change, panproto computes the exact IUs affected via the `contains` relation.

```javascript
// In pipeline phase
const impact = pipeline.analyzeImpact(newCanonData);

// Only regenerate affected IUs
for (const iuId of impact.affectedIUs) {
  await regenIU(iuId);
}
```

### Breaking Change Detection

Panproto classifies changes as breaking vs non-breaking based on the GAT structure:

```javascript
const diff = pipeline.diffPhase('canon', oldCanon, newCanon);

if (diff.breaking.length > 0) {
  console.error('Breaking changes detected!');
  // Block or require manual review
}
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│              Panproto Skill                      │
│  ┌─────────────┐  ┌─────────────┐  ┌──────────┐ │
│  │   panproto  │  │   phoenix   │  │ pipeline │ │
│  │     .js     │  │  -protocol  │  │   -int   │ │
│  │             │  │    .js      │  │   .js    │ │
│  └──────┬──────┘  └──────┬──────┘  └────┬─────┘ │
│         └─────────────────┴────────────────┘      │
│                        │                         │
│              ┌─────────▼──────────┐               │
│              │   @panproto/core   │               │
│              │     (WASM SDK)     │               │
│              └─────────────────────┘               │
└─────────────────────────────────────────────────┘
```

## Safety Guarantees

1. **Type-checked morphisms**: Every morphism validated as well-formed theory morphism at GAT level
2. **Verified equations**: Schemas checked against protocol theory axioms
3. **Pullback-enhanced analysis**: Three-way diff uses categorical pullbacks for precise overlap detection

## Dependencies

- `@panproto/core` ^0.27.1 — WASM-based GAT engine
- Node.js >= 20 — WASM requirement

## Vendored Source

The `vendor/` directory contains the full panproto repository for reference:
- `sdk/typescript/` — TypeScript SDK source
- `crates/` — Rust implementation
- `grammars/` — Tree-sitter grammars for 248 languages

## License

MIT — same as panproto
