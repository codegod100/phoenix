---
name: phoenix-pipeline
description: Complete Phoenix VCS pipeline with selective invalidation, drift detection, and evidence collection. Executable skill - runs pipeline.js directly.
---

# Phoenix Pipeline

Complete spec → code pipeline with VCS integrity.

## Pipeline Flow

```
spec/*.md ──→ Ingest ──→ Canonicalize ──→ Plan ──→ Regen ──→ Evidence
   (sha256)    (sha256)     (sha256)    (sha256)   (hash)    (verify)
     │            │            │           │         │         │
     └────────────┴────────────┴───────────┴─────────┴─────────┘
                    Phoenix VCS Graph
```

## Phase A: Ingest

**Purpose**: Parse specs into content-addressed clauses

**Skill**: `phoenix-ingest`

**Output**: `.phoenix/graphs/spec.json`

**Key Operations**:
- Normalize text
- Compute `clause_semhash` (SHA-256)
- Compute `context_semhash` (with neighbors)
- Classify changes (A/B/C/D)

## Phase B: Canonicalize

**Purpose**: Extract clean requirements with D-rate tracking

**Skill**: `phoenix-canonicalize`

**Output**: `.phoenix/canonical.md`, `.phoenix/graphs/canonical.json`

**Key Operations**:
- Remove duplicates (same hash = same requirement)
- Assign `node-<hash>` IDs
- Track bootstrap state (COLD → WARMING → STEADY)
- Record D-rate (target <5%)

## Phase C: Plan

**Purpose**: Group requirements into Implementation Units

**Skill**: `phoenix-plan`

**Output**: `.phoenix/plan.md`, `.phoenix/graphs/ius.json`

**Key Operations**:
- Compute `iu_id` (SHA-256 of contract + requirements)
- Assign risk tier (low/medium/high/critical)
- Define boundary policy
- Set evidence requirements

## Phase D: Regen

**Purpose**: Generate code with traceability

**Skill**: `phoenix-regen`

**Output**: `src/generated/`, `.phoenix/manifests/generated_manifest.json`

**Key Operations**:
- Generate TypeScript from IU contract
- Add `_phoenix` export with `iu_id`
- Compute file hash for manifest
- Collect evidence (typecheck, tests, etc.)

**Selective Invalidation**:
```bash
# Only regenerate affected subtree
node .pi/skills/phoenix-cascade/cascade.js invalidate node-a1b2c3d4 node-b2c3d4e5
# → 3 of 12 IUs need regeneration
```

## Phase E: Evidence

**Purpose**: Verify risk-tiered quality gates

**Skill**: `phoenix-evidence`

**Key Operations**:
- Run typecheck (all tiers)
- Run unit tests (medium+)
- Run property tests (high+)
- Create threat notes (high+)
- Human signoff (critical)

**Blocking**:
```
❌ REJECTED - Evidence failed
   unit_tests: 9/12 failed
   → Must pass before acceptance
```

## Phase F: Audit & Drift

**Purpose**: Validate and establish baseline

**Skills**: `phoenix-audit`, `phoenix-drift`

**Key Operations**:
- Boundary validation (no forbidden imports)
- Drift detection (working tree vs manifest)
- Over-implementation check

**Defensive**:
```
❌ BLOCKING DRIFT
   src/app.ts: modified without waiver
   → Label with waiver or revert
```

## Running the Full Pipeline

```bash
# Method 1: Individual phases
node .pi/skills/phoenix-ingest/ingest.js
node .pi/skills/phoenix-canonicalize/canonicalize.js
node .pi/skills/phoenix-plan/plan.js
node .pi/skills/phoenix-regen/regen.js
node .pi/skills/phoenix-evidence/evidence.js
node .pi/skills/phoenix-audit/audit.js src/generated/
node .pi/skills/phoenix-drift/drift.js

# Method 2: Full pipeline
node .pi/skills/phoenix-pipeline/pipeline.js
```

## Pipeline State Machine

| State | Meaning | Drift Detection | D-rate Alarms |
|-------|---------|-----------------|---------------|
| BOOTSTRAP_COLD | Initial run | Off | Suppressed |
| BOOTSTRAP_WARMING | Stabilizing | Off | Suppressed |
| STEADY_STATE | Normal | On | Active |

## Integration with Cascade

When specs change:

```bash
# 1. Check what needs regeneration
node .pi/skills/phoenix-cascade/cascade.js invalidate node-a1b2c3d4

# 2. Regenerate affected IUs only
node .pi/skills/phoenix-regen/regen.js IU-ec4737a7 IU-d9277914

# 3. Verify cascade didn't break dependents
node .pi/skills/phoenix-cascade/cascade.js cascade IU-ec4737a7
```

## Integration with Shadow

When upgrading pipeline:

```bash
# Run shadow comparison first
node .pi/skills/phoenix-shadow/shadow.js

# Classification: SAFE | COMPACTION_EVENT | REJECT

# If SAFE or COMPACTION:
node .pi/skills/phoenix-pipeline/pipeline.js
```

## Per-PRD Selective Invalidation

From PRD Section 0:
> "Changing one spec line invalidates only the dependent subtree"

Not full regeneration - just the affected IUs.

## Pipeline Artifacts

```
.phoenix/
├── canonical.md              # Human-readable requirements
├── plan.md                   # Human-readable IUs
├── graphs/
│   ├── spec.json            # Clauses with hashes
│   ├── canonical.json       # Canonical nodes
│   └── ius.json             # IU graph
├── manifests/
│   └── generated_manifest.json  # File hashes for drift
└── state.json               # Bootstrap state, timestamps
```

## Quality Gates

Each phase has gates:

| Phase | Gate | Block on Fail |
|-------|------|---------------|
| Ingest | D-rate < 15% | Yes |
| Canonicalize | No orphans | Yes |
| Plan | Valid IU IDs | Yes |
| Regen | Evidence passes tier | Yes |
| Audit | Boundary clean | Yes |
| Drift | No blocking drift | Yes |

## Next Step

After pipeline: `node .pi/skills/phoenix-status/status.js` for full project health check.
