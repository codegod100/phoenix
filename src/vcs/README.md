# Phoenix VCS Core Implementation

This directory contains the **principled implementation** of Phoenix VCS as specified in the PRD. It bridges the gap between the original vision (main branch CLI) and the practical skills-based approach.

## What Was Missing vs. What's Now Implemented

| PRD Section | Original Vision | Skills Approach | VCS Core (This) |
|-------------|-----------------|-----------------|-----------------|
| **3** Identity & Hashing | SHA-256 clause semhash, D-rate tracking | Human-readable IDs | ✅ SHA-256 content-addressing, D-rate, bootstrap state machine |
| **7** Boundary Policy | Architectural linter, side-channel detection | Manual review | ✅ Dependency extraction, boundary validation, forbidden imports |
| **9** Drift Detection | Working tree vs manifest, waivers | No automated check | ✅ File hash comparison, blocking drift detection, waiver system |
| **10** Evidence & Policy | Risk-tiered enforcement | Optional tests | ✅ Low/medium/high/critical tiers, automated quality gates |
| **11** Cascade Semantics | Graph-based invalidation | Manual regeneration | ✅ Dependency graph, transitive invalidation, cascade actions |
| **5.1** Shadow Pipeline | SAFE/COMPACTION/REJECT classification | No upgrade safety | ✅ Parallel pipeline diff, upgrade classification |
| **13** Diagnostics | Severity model, `phoenix status` | Skill-based checks | ✅ Unified status with grouped diagnostics |

## Quick Start

```bash
# Install dependencies
bun install

# Build the VCS core
bun run build

# Run status check in a Phoenix project
bun run vcs status

# Detect drift
bun run vcs drift

# Validate boundaries
bun run vcs boundary src/generated/app/database.ts

# Compute cascade for a failed IU
bun run vcs cascade <iu-id>

# Check what IUs need regeneration after spec changes
bun run vcs invalidate node-abc123 node-def456
```

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Phoenix VCS Core                             │
├─────────────────────────────────────────────────────────────────┤
│  identity.ts    │  SHA-256 hashing, D-rate, bootstrap states    │
│  drift.ts       │  Manifest comparison, waiver system           │
│  boundary.ts    │  Dependency extraction, architectural linting │
│  evidence.ts    │  Risk-tiered evidence, policy enforcement     │
│  cascade.ts     │  Graph operations, selective invalidation     │
│  shadow.ts      │  Pipeline upgrade safety (shadow mode)        │
│  status.ts      │  Unified diagnostics & severity model         │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### Content-Addressed Identity

Every entity has a stable SHA-256 identity:

```typescript
import { canonId, iuId, fileHash } from 'phoenix-vcs/vcs';

// Canonical requirement ID from text
const requirementId = canonId("system shall validate email format");
// → 'a1b2c3d4...'

// IU ID from contract + requirements
const unitId = iuId("AuthModule", "Handles login", [requirementId]);
// → 'ec4737a7...'

// File content hash for drift detection
const contentHash = fileHash(sourceCode);
// → 'f8a9b0c1...'
```

### Risk-Tiered Evidence

Evidence requirements scale with risk:

| Tier | Required Evidence |
|------|-------------------|
| **Low** | typecheck, lint, boundary_validation |
| **Medium** | + unit_tests |
| **High** | + property_tests, threat_note |
| **Critical** | + static_analysis, human_signoff |

```typescript
import { evaluatePolicy, getRequiredEvidence } from 'phoenix-vcs/vcs';

const required = getRequiredEvidence('high');
// → ['typecheck', 'lint', 'boundary_validation', 'unit_tests', 'property_tests', 'threat_note']

const evaluation = evaluatePolicy(iuId, 'high', evidenceRecords);
// → { status: 'ACCEPTED' | 'REJECTED' | 'PENDING', score: 85, ... }
```

### Defensive Drift Detection

Blocks acceptance on unlabeled manual edits:

```typescript
import { detectDrift, createWaiver } from 'phoenix-vcs/vcs';

const report = detectDrift(projectRoot, manifest);

if (report.has_blocking_drift) {
  console.log("❌ REJECTED: Manual edits detected without waiver");
  console.log("Options:");
  console.log("  1. Revert to generated version");
  console.log("  2. Create waiver: promote_to_requirement | temporary_patch | manual_override");
}

// Create a waiver
const waiver = createWaiver('src/app.ts', 'temporary_patch', { 
  expires: '2026-04-15',
  signed_by: 'nandi' 
});
```

### Selective Invalidation

Only regenerate the subtree affected by spec changes:

```typescript
import { computeInvalidation, buildDependencyGraph } from 'phoenix-vcs/vcs';

// Changed requirements from spec edit
const changedCanonIds = ['node-a1b2c3d4', 'node-b2c3d4e5'];

// Compute which IUs need regeneration
const invalidatedIUs = computeInvalidation(graph, changedCanonIds, iuToCanonMap);
// → ['iu-ec4737a7', 'iu-d9277914', ...] // Only affected subtree

console.log(`Selective regeneration: ${invalidatedIUs.length} of ${totalIUs} IUs`);
```

### Cascade Failure Semantics

When evidence fails, dependents are re-validated:

```typescript
import { computeCascade, buildDependencyGraph } from 'phoenix-vcs/vcs';

const event = computeCascade(graph, failedIuId, 'unit_tests', 'Test failure details');

for (const action of event.actions) {
  switch (action.type) {
    case 'RETYPECHECK':
      await runTypecheck(action.target_iu);
      break;
    case 'REBOUNDARY_CHECK':
      await validateBoundaries(action.target_iu);
      break;
    case 'RETEST':
      await runTests(action.target_iu, action.test_tags);
      break;
    case 'REGENERATE':
      if (isHighRisk(action.target_iu)) {
        await regenerate(action.target_iu);
      }
      break;
  }
}
```

### Shadow Pipeline Upgrades

Test pipeline changes safely:

```typescript
import { runShadowPipeline } from 'phoenix-vcs/vcs';

const result = runShadowPipeline(oldNodes, newNodes, 'v1.2.3', 'v1.3.0');

switch (result.classification) {
  case 'SAFE':
    console.log('✅ Upgrade accepted: Changes <3%, no orphans');
    break;
  case 'COMPACTION_EVENT':
    console.log('⚠️ Review required: Significant but manageable changes');
    break;
  case 'REJECT':
    console.log('❌ Upgrade rejected: Orphan nodes or excessive churn');
    break;
}
```

## CLI Usage

```bash
# Full status check (diagnostics, drift, evidence, dependencies)
npx phoenix-vcs status

# Check for manual edits
npx phoenix-vcs drift

# Validate architectural boundaries
npx phoenix-vcs boundary src/generated/app/database.ts

# Compute failure cascade
npx phoenix-vcs cascade ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88

# Find IUs to regenerate after spec change
npx phoenix-vcs invalidate node-a1b2c3d4 node-b2c3d4e5 node-c3d4e5f6
```

## Integration with Skills

The VCS core can be used by Pi skills for principled operations:

```typescript
// In a skill
import { getVCSStatus, detectDrift, computeInvalidation } from 'phoenix-vcs/vcs';

export async function checkBeforeCommit(projectRoot: string) {
  const status = await getVCSStatus(projectRoot);
  
  if (status.status === 'CRITICAL') {
    return {
      allowed: false,
      reason: 'Critical VCS issues must be resolved',
      diagnostics: status.diagnostics
    };
  }
  
  if (status.drift?.has_blocking_drift) {
    return {
      allowed: false,
      reason: 'Manual edits detected - label with waiver or revert',
      drift: status.drift
    };
  }
  
  return { allowed: true };
}
```

## Trust Surface

Per PRD Section 0: **"Trust > cleverness"**

The VCS core is designed to be:

1. **Conservative**: When in doubt, block (REJECT > silent acceptance)
2. **Explainable**: Every status item has severity, category, and recommended actions
3. **Correct-enough**: D-rate tracking ensures classification quality
4. **Defensive**: Drift detection prevents unlabeled manual edits

## Metrics

Track these for VCS health:

- **D-rate**: Target ≤5%, Alarm at >15%
- **Average policy score**: Target >90/100
- **Drift incidents**: Should be 0 (all edits labeled)
- **Boundary violations**: Should decrease over time
- **Cascade events**: Indicator of dependency graph health
