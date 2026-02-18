# Phase C2 — Boundary Validator & UnitBoundaryChange

## Overview

Phase C2 enforces architectural boundaries declared by each IU. The boundary
validator (architectural linter) extracts the dependency graph from generated
code and checks it against the IU's boundary policy. Violations produce
diagnostics that feed into `phoenix status`.

## Components

### 1. Boundary Policy Model (in `src/models/iu.ts`)

```typescript
interface BoundaryPolicy {
  code: {
    allowed_ius: string[];        // IU IDs this may import from
    allowed_packages: string[];   // npm packages allowed
    forbidden_ius: string[];      // explicitly blocked IU IDs
    forbidden_packages: string[]; // explicitly blocked packages
    forbidden_paths: string[];    // glob patterns (e.g. "src/internal/**")
  };
  side_channels: {
    databases: string[];          // allowed DB names / connection strings
    queues: string[];
    caches: string[];
    config: string[];             // env vars / config keys
    external_apis: string[];      // URLs / service names
    files: string[];              // filesystem paths
  };
}
```

### 2. Dependency Extractor (`src/dep-extractor.ts`)

Parses generated TypeScript files and extracts:
- `import` / `require` statements → package or relative path
- Known side-channel patterns (env var reads, DB connections, fetch calls)

Returns a `DependencyGraph` for validation.

### 3. Boundary Validator (`src/boundary-validator.ts`)

Validates extracted dependencies against the IU's boundary policy.

Produces `BoundaryDiagnostic[]`:
- `dependency_violation`: imports something forbidden or not in allowlist
- `side_channel_violation`: uses undeclared side channel

Each diagnostic has severity (error | warning) controlled by the IU's
enforcement config.

### 4. UnitBoundaryChange Detector

When an IU's boundary policy changes, emits a `UnitBoundaryChange` event
that triggers re-validation of the IU and all dependents.

## Diagnostic Model

```typescript
interface BoundaryDiagnostic {
  severity: 'error' | 'warning';
  category: 'dependency_violation' | 'side_channel_violation';
  iu_id: string;
  subject: string;        // the offending import / channel
  message: string;
  source_file?: string;
  source_line?: number;
}
```

## Data Flow

```
Generated code (Phase C1)
  → DepExtractor.extract() → DependencyGraph
  → BoundaryValidator.validate(graph, policy) → BoundaryDiagnostic[]
  → StatusEngine.merge() → phoenix status
```
