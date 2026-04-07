---
name: phoenix-canonicalize
description: Extract canonical requirements from clauses with semantic hashing and change classification. Normalizes statements, removes duplicates, and tracks D-rate.
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

### Using VCS Core

```typescript
import { 
  canonId, normalizeText, classifyChange, 
  DRateTracker, BootstrapStateMachine 
} from 'phoenix-vcs/vcs';

// Normalize for canonical form
const normalized = normalizeText("The system shall render complete HTML page");
// → "the system shall render complete html page"

// Compute canonical node ID
const canonId = canonId(normalized).slice(0, 8);
// → 'node-a1b2c3d4'

// Track bootstrap state
const bootstrap = new BootstrapStateMachine();
bootstrap.transitionColdToWarming();
// State: BOOTSTRAP_COLD → BOOTSTRAP_WARMING

// Classify changes
const classification = classifyChange(
  oldClauseSemhash, newClauseSemhash,
  oldContextSemhash, newContextSemhash,
  { normalizedDiffScore: 0.1, termReferenceDelta: 0, sectionStructureDelta: 0 }
);
// → { class: 'B', confidence: 0.85, signals: {...} }

// Track D-rate
const dRate = new DRateTracker();
dRate.record(classification.class);
const status = dRate.getStatus();
// → { dRate: 0.05, level: 'TARGET', message: '...' }
```

### Step 3: Build canonical graph

Write to `.phoenix/canonical.md` and `.phoenix/graphs/canonical.json`:

```markdown
# Canonical Requirements

## Board
node-a1b2c3d4: system shall render complete html page with inline css and javascript
node-b2c3d4e5: page must display header with title taskflow and task count summary
node-c3d4e5f6: no theme toggle allowed
```

```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-07T20:00:00Z",
  "bootstrap_state": "BOOTSTRAP_WARMING",
  "d_rate": 0.05,
  "nodes": [
    {
      "canon_id": "a1b2c3d4e5f67890...",
      "short_id": "node-a1b2c3d4",
      "type": "REQUIREMENT",
      "statement": "system shall render complete html page...",
      "source_clause_ids": ["sha256-of-original-clause"],
      "confidence": 0.95
    }
  ]
}
```

## Quality Checks

- [ ] No duplicate statements (same hash = same requirement)
- [ ] All requirements are specific and testable
- [ ] Constraints are measurable
- [ ] Language is consistent
- [ ] D-rate < 10% (classifier performing adequately)

## Bootstrap States

| State | Meaning | D-rate Alarms |
|-------|---------|---------------|
| BOOTSTRAP_COLD | Initial ingest | Suppressed |
| BOOTSTRAP_WARMING | Stabilizing | Suppressed |
| STEADY_STATE | Stable operation | Active (>15% = alarm) |

## Two-Pass Hashing

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
