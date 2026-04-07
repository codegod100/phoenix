---
name: phoenix-cascade
description: Compute cascade actions for failed IUs. Implements graph-based failure propagation with selective invalidation.
---

# Phoenix Cascade

Graph-based failure propagation per PRD Section 11.

## When to Use

- When evidence fails for an IU
- To determine what needs re-validation
- To compute selective invalidation after spec changes
- To check dependency health

## Concepts

### Dependency Graph

IUs form a directed graph:
```
IU-Database ← IU-Models ← IU-API ← IU-UI
```

If `IU-Database` fails:
- `IU-Models` must re-validate (typecheck, boundary)
- `IU-API` must re-validate
- `IU-UI` must re-validate

### Selective Invalidation

Per PRD Section 0:
> "Changing one spec line invalidates only the dependent subtree"

Not the entire codebase - just the affected subtree.

## Process

### Step 1: Load IU graph

```bash
cat .phoenix/graphs/ius.json
```

### Step 2: Build dependency graph

Using VCS core:

```typescript
import { buildDependencyGraph, getTransitiveDependents } from 'phoenix-vcs/vcs';

const graph = buildDependencyGraph(ius);

// Get all IUs that depend on a given IU
const dependents = getTransitiveDependents(graph, databaseIuId);
// → [modelsIuId, apiIuId, uiIuId]
```

### Step 3: Compute cascade

When evidence fails:

```typescript
import { computeCascade, formatCascadeEvent } from 'phoenix-vcs/vcs';

const event = computeCascade(graph, failedIuId, 'unit_tests', '3 tests failed');

console.log(formatCascadeEvent(event));
```

Output:
```
⚡ Phoenix VCS Cascade Event
   Source: ec4737a7... (unit_tests)
   Affected IUs: 3

RETYPECHECK:
   → d9277914...
   → a1b2c3d4...
   → b2c3d4e5...

REBOUNDARY_CHECK:
   → d9277914...
   → a1b2c3d4...

RETEST:
   → d9277914... (tags: ec4737a7)
   → a1b2c3d4... (tags: ec4737a7)

REGENERATE (high-risk):
   → b2c3d4e5... (high risk)
```

### Step 4: Execute cascade actions

| Action | Meaning |
|--------|---------|
| RETYPECHECK | Re-run typecheck on dependent |
| REBOUNDARY_CHECK | Re-validate boundaries |
| RETEST | Re-run tests tagged with dependency |
| REGENERATE | Regenerate high-risk dependents |
| BLOCK | Mark IU as blocked |

## Selective Invalidation

After spec changes:

```bash
# Find which IUs are affected by changed requirements
npx phoenix-vcs invalidate node-a1b2c3d4 node-b2c3d4e5
```

Using VCS core:

```typescript
import { computeInvalidation, formatInvalidationReport } from 'phoenix-vcs/vcs';

const changedCanonIds = ['a1b2c3d4...', 'b2c3d4e5...'];
const invalidatedIus = computeInvalidation(graph, changedCanonIds, iuToCanonMap);

console.log(formatInvalidationReport(changedCanonIds, invalidatedIus));
```

Output:
```
🎯 Phoenix VCS Selective Invalidation

Changed requirements: 2
   node-a1b2c3d4... (system shall display board)
   node-b2c3d4e5... (board has columns)

Invalidated IUs: 3
   IU-ec4737a7 (Dashboard Page)
   IU-d9277914 (Board UI)
   IU-2cb00b55 (Column UI)

Selective rate: 25% (3 of 12 IUs)
```

## Detecting Circular Dependencies

```typescript
import { detectCircularDependencies } from 'phoenix-vcs/vcs';

const cycles = detectCircularDependencies(graph);
// → [['iu-a', 'iu-b', 'iu-c']]
```

Circular dependencies = ERROR (must refactor).

## Topological Sort

For regeneration order (dependencies first):

```typescript
import { topologicalSort } from 'phoenix-vcs/vcs';

const order = topologicalSort(graph);
// → ['iu-database', 'iu-models', 'iu-api', 'iu-ui']
```

## CLI Commands

```bash
# Compute cascade for failed IU
npx phoenix-vcs cascade ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88

# Check selective invalidation
npx phoenix-vcs invalidate node-a1b2c3d4 node-b2c3d4e5
```

## Per-PRD Cascade Semantics

From PRD Section 11:
> "If IU-X evidence fails: IU-X blocked, Dependent IU-Y: re-run typecheck, re-run boundary checks, re-run relevant tests"

> "Failure propagation is explicit and graph-based."

Not silent - explicit cascade actions.

## Next Step

Execute cascade actions, or use `phoenix-regen` for selective regeneration.
