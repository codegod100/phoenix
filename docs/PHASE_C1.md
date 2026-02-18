# Phase C1 — Implementation Units, Regeneration & Manifest

## Overview

Phase C1 introduces Implementation Units (IUs) — stable compilation boundaries that
map canonical requirements to generated code. The regeneration engine produces code
artifacts and tracks them in a generated manifest for drift detection.

## Components

### 1. Implementation Unit Model (`src/models/iu.ts`)

```typescript
interface ImplementationUnit {
  iu_id: string;                    // content-addressed
  kind: 'module' | 'function';
  name: string;                     // human-readable label
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
  contract: IUContract;             // inputs, outputs, invariants
  source_canon_ids: string[];       // which canonical nodes this implements
  dependencies: string[];           // other iu_ids this depends on
  boundary_policy: BoundaryPolicy;  // what it's allowed to touch
  evidence_policy: EvidencePolicy;  // what proof is required
  output_files: string[];           // generated file paths
}
```

### 2. IU Planner (`src/iu-planner.ts`)

Maps canonical nodes → IU proposals. Groups related requirements into
module-level IUs based on:
- Shared tags/terms
- Same source clause
- Linked canonical nodes

### 3. Regeneration Engine (`src/regen.ts`)

Generates code stubs for each IU. Records:
- model_id (or "stub-generator/1.0" for v1)
- promptpack hash
- toolchain version

Outputs:
- Generated source files (TypeScript stubs)
- Per-file content hashes in the manifest

### 4. Generated Manifest (`src/manifest.ts`)

Tracks every generated file:

```typescript
interface GeneratedManifest {
  iu_manifests: Record<string, IUManifest>;
  generated_at: string;
}

interface IUManifest {
  iu_id: string;
  files: Record<string, FileManifestEntry>;
  regen_metadata: RegenMetadata;
}

interface FileManifestEntry {
  path: string;
  content_hash: string;
  size: number;
}
```

### 5. Drift Detector (`src/drift.ts`)

Compares working tree files against the generated manifest:

- **CLEAN**: file matches manifest hash
- **DRIFTED**: file differs, no waiver
- **WAIVED**: file differs, waiver exists
- **MISSING**: manifest entry but no file
- **UNTRACKED**: file exists but not in manifest

## Data Flow

```
CanonicalNodes (Phase B)
  → IUPlanner.plan() → ImplementationUnit[]
  → RegenEngine.generate() → generated files + RegenMetadata
  → Manifest.record() → generated_manifest.json
  → DriftDetector.check() → DriftReport
```
