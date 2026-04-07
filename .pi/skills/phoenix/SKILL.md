---
name: phoenix
description: Universal Phoenix VCS command router. Maps commands to specific Phoenix skills with VCS core integration.
---

# Phoenix

Universal entry point for Phoenix VCS operations.

## Command Map

| Command | Skill | VCS Core Function |
|---------|-------|-------------------|
| `init` | phoenix-init | Initialize project structure |
| `ingest` | phoenix-ingest | `canonId()`, `clauseSemhash()` |
| `canonicalize` | phoenix-canonicalize | `classifyChange()`, `DRateTracker` |
| `plan` | phoenix-plan | `iuId()`, risk tiers |
| `regen` | phoenix-regen | `fileHash()`, `runTypecheck()` |
| `evidence` | phoenix-evidence | `evaluatePolicy()`, `getRequiredEvidence()` |
| `audit` | phoenix-audit | `validateBoundary()`, boundary lint |
| `drift` | phoenix-drift | `detectDrift()`, `createWaiver()` |
| `cascade` | phoenix-cascade | `computeCascade()`, `computeInvalidation()` |
| `shadow` | phoenix-shadow | `runShadowPipeline()`, upgrade safety |
| `pipeline` | phoenix-pipeline | Full flow with gates |
| `status` | phoenix-status | `getVCSStatus()`, unified diagnostics |
| `invalidate` | phoenix-cascade | Selective invalidation check |

## Usage

### Skill-Based (Agent)

```
User: /skill:phoenix ingest

Agent reads: phoenix-ingest/SKILL.md
Agent executes:
  1. Read spec files
  2. Extract clauses
  3. Compute SHA-256 hashes
  4. Write .phoenix/graphs/spec.json
```

### CLI-Based (Direct)

```bash
# Using VCS core CLI
npx phoenix-vcs status
npx phoenix-vcs drift
npx phoenix-vcs boundary src/app.ts
npx phoenix-vcs cascade <iu-id>
npx phoenix-vcs invalidate node-abc123...
```

## Pipeline Flow

```
spec/*.md ──→ [Ingest] ──→ [Canonicalize] ──→ [Plan] ──→ [Regen] ──→ [Evidence]
                │                │                │            │            │
                └────────────────┴────────────────┴────────────┴────────────┘
                                     phoenix pipeline
```

## Integration Points

### 1. Content-Addressed Identity (VCS Core)

```typescript
import { canonId, iuId, fileHash } from 'phoenix-vcs/vcs';

// Every entity has stable SHA-256 identity
const requirementId = canonId(normalizedText);
const unitId = iuId(name, contract, canonIds);
const contentHash = fileHash(sourceCode);
```

### 2. D-rate Tracking (VCS Core)

```typescript
import { DRateTracker } from 'phoenix-vcs/vcs';

const tracker = new DRateTracker();
tracker.record(changeClassification); // A, B, C, or D
const status = tracker.getStatus();
// Block if status.level === 'ALARM'
```

### 3. Defensive Drift (VCS Core)

```typescript
import { detectDrift } from 'phoenix-vcs/vcs';

const report = detectDrift(projectRoot, manifest);
if (report.has_blocking_drift) {
  // Block acceptance
  // Require waiver
}
```

### 4. Graph Cascade (VCS Core)

```typescript
import { computeCascade, computeInvalidation } from 'phoenix-vcs/vcs';

const event = computeCascade(graph, failedIuId, 'unit_tests', reason);
const invalidated = computeInvalidation(graph, changedCanonIds, iuToCanonMap);
```

## Skill Hierarchy

```
phoenix (router)
├── phoenix-init
├── phoenix-ingest (SHA-256 hashing)
├── phoenix-canonicalize (D-rate, bootstrap)
├── phoenix-plan (content-addressed IU IDs)
├── phoenix-regen (manifest, evidence)
├── phoenix-evidence (risk-tiered gates)
├── phoenix-audit (boundary validation)
├── phoenix-drift (defensive checking)
├── phoenix-cascade (graph operations)
├── phoenix-shadow (upgrade safety)
├── phoenix-pipeline (orchestration)
├── phoenix-status (unified diagnostics)
└── phoenix-utils (shared types)
```

## Quick Reference

```
# Initialize
/skill:phoenix init

# Full pipeline
/skill:phoenix pipeline

# Check status
/skill:phoenix status
npx phoenix-vcs status

# Check drift (defensive)
/skill:phoenix drift
npx phoenix-vcs drift

# Validate boundaries
/skill:phoenix audit
npx phoenix-vcs boundary src/app.ts

# Compute cascade
/skill:phoenix cascade <iu-id>
npx phoenix-vcs cascade <iu-id>

# Selective invalidation
npx phoenix-vcs invalidate node-abc123...

# Shadow pipeline (upgrades)
/skill:phoenix shadow
```

## VCS Core Integration

The skills use the VCS core for principled operations:

1. **Identity**: SHA-256 for all IDs (content-addressed)
2. **Classification**: A/B/C/D with D-rate tracking
3. **Bootstrap**: State machine (COLD → WARMING → STEADY)
4. **Drift**: Defensive manifest comparison
5. **Cascade**: Graph-based invalidation
6. **Shadow**: Upgrade safety (SAFE/COMPACTION/REJECT)
7. **Evidence**: Risk-tiered enforcement
8. **Boundary**: Architectural linting

## Trust Surface

Per PRD: **"Trust > cleverness"**

The Phoenix VCS system is:
- **Conservative**: Blocks on uncertainty
- **Explainable**: Every decision has reasoning
- **Correct-enough**: D-rate ensures quality
- **Defensive**: Drift detection prevents silent edits
