---
name: phoenix-cascade
description: Compute cascade actions for failed IUs and selective invalidation. Graph-based failure propagation. Executable skill - runs cascade.js directly.
---

# Phoenix Cascade

Graph-based failure propagation per PRD Section 11.

## When to Use

- When evidence fails for an IU
- To determine what needs re-validation
- To compute selective invalidation after spec changes

## How to Run

```bash
# Compute cascade for failed IU
node .pi/skills/phoenix-cascade/cascade.js cascade <iu-id>

# Check selective invalidation
node .pi/skills/phoenix-cascade/cascade.js invalidate <canon-id-1> [canon-id-2...]
```

## Commands

### cascade

Computes what actions to take when an IU fails:

```bash
node .pi/skills/phoenix-cascade/cascade.js cascade ec4737a7671a24d2...
```

Output:
```
⚡ Phoenix Cascade
   Failed IU: ec4737a7... (unit_tests)
   Affected IUs: 3
   Cascade depth: 2

🚫 BLOCK:
   → ec4737a7...

🔍 RETYPECHECK:
   → d9277914...
   → a1b2c3d4...

🔄 REGENERATE (high-risk):
   → b2c3d4e5...
```

### invalidate

Finds which IUs need regeneration after spec changes:

```bash
node .pi/skills/phoenix-cascade/cascade.js invalidate node-a1b2c3d4 node-b2c3d4e5
```

Output:
```
🎯 Phoenix Selective Invalidation
   Changed requirements: 2
   • node-a1b2c3d4...
   • node-b2c3d4e5...

Invalidated IUs: 3
   • IU-ec4737a7...
   • IU-d9277914...
   • IU-2cb00b55...
```

## Per-PRD Cascade Semantics

> "If IU-X evidence fails: IU-X blocked, Dependent IU-Y: re-run typecheck, re-run boundary checks, re-run relevant tests"

> "Failure propagation is explicit and graph-based."

## Next Step

Execute cascade actions or regenerate invalidated IUs.
