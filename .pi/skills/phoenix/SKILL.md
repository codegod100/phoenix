---
name: phoenix
description: Universal Phoenix VCS command router. Maps commands to specific Phoenix skills with VCS core integration. Executable via individual skill scripts.
---

# Phoenix

Universal entry point for Phoenix VCS operations.

## Command Map

| Command | Skill | VCS Core Function | Direct Execution |
|---------|-------|-------------------|------------------|
| `init` | phoenix-init | Initialize project structure | `node .pi/skills/phoenix-init/init.js [project-root]` |
| `ingest` | phoenix-ingest | `canonId()`, `clauseSemhash()` | `node .pi/skills/phoenix-ingest/ingest.js [project-root]` |
| `canonicalize` | phoenix-canonicalize | `classifyChange()`, `DRateTracker` | `node .pi/skills/phoenix-canonicalize/canonicalize.js [project-root]` |
| `plan` | phoenix-plan | `iuId()`, risk tiers | `node .pi/skills/phoenix-plan/plan.js [project-root]` |
| `regen` | phoenix-regen | `fileHash()`, `runTypecheck()` | `node .pi/skills/phoenix-regen/regen.js [iu-id...]` |
| `evidence` | phoenix-evidence | `evaluatePolicy()`, `getRequiredEvidence()` | `node .pi/skills/phoenix-evidence/evidence.js [project-root]` |
| `audit` | phoenix-audit | `validateBoundary()`, boundary lint | `node .pi/skills/phoenix-audit/audit.js <file-path>` |
| `drift` | phoenix-drift | `detectDrift()`, `createWaiver()` | `node .pi/skills/phoenix-drift/drift.js [project-root]` |
| `cascade` | phoenix-cascade | `computeCascade()`, `computeInvalidation()` | `node .pi/skills/phoenix-cascade/cascade.js <command>` |
| `shadow` | phoenix-shadow | `runShadowPipeline()`, upgrade safety | `node .pi/skills/phoenix-shadow/shadow.js [project-root] [old-ver] [new-ver]` |
| `pipeline` | phoenix-pipeline | Full flow with gates | `node .pi/skills/phoenix-pipeline/pipeline.js [project-root]` |
| `status` | phoenix-status | `getVCSStatus()`, unified diagnostics | `node .pi/skills/phoenix-status/status.js [project-root]` |
| `testing` | phoenix-testing | Test verification by tier | `node .pi/skills/phoenix-testing/testing.js [project-root]` |
| `invalidate` | phoenix-cascade | Selective invalidation check | `node .pi/skills/phoenix-cascade/cascade.js invalidate <canon-id...>` |
| `purge` | phoenix-purge | Test regen determinism | `bash .pi/skills/phoenix-purge/purge.sh` |
| `inspect` | phoenix-inspect | Visualize project traceability | `node .pi/skills/phoenix-inspect/inspect.js [project-root]` |
| `spec` | phoenix-spec | Validate spec files | `node .pi/skills/phoenix-spec/validate.js [spec-directory]` |
| `constraint-review` | phoenix-constraint-review | Check spec completeness | `node .pi/skills/phoenix-constraint-review/constraint-review.js [project-root]` |

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

### CLI-Based (Direct Node Execution)

```bash
# Individual skill scripts (project-root optional, defaults to current directory)
node .pi/skills/phoenix-status/status.js [project-root]
node .pi/skills/phoenix-drift/drift.js [project-root]
node .pi/skills/phoenix-audit/audit.js <file-path>
node .pi/skills/phoenix-testing/testing.js [project-root]

# With specific arguments
node .pi/skills/phoenix-cascade/cascade.js cascade <iu-id>
node .pi/skills/phoenix-cascade/cascade.js invalidate node-abc123...
node .pi/skills/phoenix-regen/regen.js [iu-id...]
node .pi/skills/phoenix-spec/validate.js [spec-directory]
node .pi/skills/phoenix-constraint-review/constraint-review.js [project-root]
```

## Pipeline Flow

```
spec/*.md ──→ [Ingest] ──→ [Canonicalize] ──→ [Plan] ──→ [Regen] ──→ [Evidence]
                │                │                │            │            │
                └────────────────┴────────────────┴────────────┴────────────┘
                                     phoenix pipeline
```

## Integration Points

Each skill inlines VCS core functions from `src/vcs/`:

### 1. Content-Addressed Identity

Skills use SHA-256 for all IDs (from `src/vcs/identity.ts`):

```javascript
// Inlined in skill scripts
const requirementId = canonId(normalizedText);
const unitId = iuId(name, contract, canonIds);
const contentHash = fileHash(sourceCode);
```

### 2. D-rate Tracking

From `src/vcs/identity.ts`:

```javascript
const tracker = new DRateTracker();
tracker.record(changeClassification); // A, B, C, or D
const status = tracker.getStatus();
// Block if status.level === 'ALARM'
```

### 3. Defensive Drift

From `src/vcs/drift.ts`:

```javascript
const report = detectDrift(projectRoot, manifest);
if (report.has_blocking_drift) {
  // Block acceptance
  // Require waiver
}
```

### 4. Graph Cascade

From `src/vcs/cascade.ts`:

```javascript
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
├── phoenix-testing (test verification)
├── phoenix-inspect (traceability)
├── phoenix-spec (spec validation)
├── phoenix-constraint-review (spec linting)
├── phoenix-purge (determinism testing)
└── phoenix-utils (reference patterns - not executable)
```

## Quick Reference

```
# Initialize
/skill:phoenix init
node .pi/skills/phoenix-init/init.js [project-root]

# Full pipeline
/skill:phoenix pipeline
node .pi/skills/phoenix-pipeline/pipeline.js [project-root]

# Check status
/skill:phoenix status
node .pi/skills/phoenix-status/status.js [project-root]

# Check drift (defensive)
/skill:phoenix drift
node .pi/skills/phoenix-drift/drift.js [project-root]

# Validate boundaries
/skill:phoenix audit
node .pi/skills/phoenix-audit/audit.js <file-path>

# Compute cascade
/skill:phoenix cascade <iu-id>
node .pi/skills/phoenix-cascade/cascade.js cascade <iu-id>

# Selective invalidation
node .pi/skills/phoenix-cascade/cascade.js invalidate node-abc123...

# Shadow pipeline (upgrades)
/skill:phoenix shadow
node .pi/skills/phoenix-shadow/shadow.js [project-root] [old-ver] [new-ver]

# Test verification
/skill:phoenix testing
node .pi/skills/phoenix-testing/testing.js [project-root]

# Visualize project
/skill:phoenix inspect
node .pi/skills/phoenix-inspect/inspect.js [project-root]
```

## VCS Core Source

The canonical VCS implementation is in `src/vcs/`:

- `src/vcs/identity.ts` - SHA-256 hashing, D-rate tracking, bootstrap state
- `src/vcs/drift.ts` - Defensive manifest comparison
- `src/vcs/cascade.ts` - Graph-based invalidation
- `src/vcs/shadow.ts` - Upgrade safety (SAFE/COMPACTION/REJECT)
- `src/vcs/evidence.ts` - Risk-tiered enforcement
- `src/vcs/boundary.ts` - Architectural linting
- `src/vcs/status.ts` - Unified diagnostics

Skills inline these functions for self-contained operation:
- **Identity**: SHA-256 for all IDs (content-addressed)
- **Classification**: A/B/C/D with D-rate tracking
- **Bootstrap**: State machine (COLD → WARMING → STEADY)
- **Drift**: Defensive manifest comparison
- **Cascade**: Graph-based invalidation
- **Shadow**: Upgrade safety (SAFE/COMPACTION/REJECT)
- **Evidence**: Risk-tiered enforcement
- **Boundary**: Architectural linting

## Trust Surface

Per PRD: **"Trust > cleverness"**

The Phoenix VCS system is:
- **Conservative**: Blocks on uncertainty
- **Explainable**: Every decision has reasoning
- **Correct-enough**: D-rate ensures quality
- **Defensive**: Drift detection prevents silent edits
