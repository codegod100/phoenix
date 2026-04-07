---
name: phoenix-canonicalize
description: Extract canonical requirements from clauses with semantic hashing and change classification. Normalizes statements, removes duplicates, and tracks D-rate. Executable skill - runs canonicalize.js directly.
---

# Phoenix Canonicalize

Transform clauses into clean, canonical requirements with full provenance.

## When to Use

- After ingesting spec files
- Before planning implementation
- To resolve duplicates and ambiguities
- To bootstrap from cold to warm state

## Input

Clauses from Ingest phase:
```json
{
  "clauses": [
    {
      "id": "a1b2c3d4...",
      "type": "REQUIREMENT",
      "text": "the system shall render complete html page",
      "clause_semhash": "...",
      "context_semhash": "..."
    }
  ]
}
```

## How to Run

```bash
node .pi/skills/phoenix-canonicalize/canonicalize.js [project-root]
```

## Implementation

This skill is self-contained in `canonicalize.js`. It inlines VCS identity functions from the core implementation (`src/vcs/identity.ts`):

- `canonId()` - SHA-256 hash for canonical node IDs
- `normalizeText()` - Text normalization for stable comparison
- `classifyChange()` - A/B/C/D change classification
- `DRateTracker` - D-rate monitoring class
- `BootstrapStateMachine` - Bootstrap state management

## Process

### Step 1: Load existing canonical graph (if any)

```bash
cat .phoenix/graphs/canonical.json 2>/dev/null || echo "Cold start"
```

### Step 2: Process each clause

For each new/updated clause:
1. **Normalize statement** (standardize terms)
2. **Compute canonical ID**: `node-<first-8-chars-of-SHA-256>`
3. **Classify change** vs existing graph (A/B/C/D)
4. **Record D-rate** for classifier quality

Pass 1 (Cold):
- Compute `clause_semhash` (content only)
- Compute `context_semhash_cold` (local context)
- Classify conservatively

Pass 2 (Warm):
- Compute `context_semhash_warm` (with canonical graph)
- Re-classify with full context
- Transition to STEADY_STATE

## Next Step

Run `phoenix-plan` to organize requirements into Implementation Units.

## Shadow Pipeline (Advanced)

When upgrading canonicalization pipeline:

```typescript
import { runShadowPipeline } from 'phoenix-vcs/vcs';

const result = runShadowPipeline(oldNodes, newNodes, 'v1.2', 'v1.3');
// Classification: SAFE | COMPACTION_EVENT | REJECT
```

Use `phoenix-shadow` skill for pipeline upgrades.
