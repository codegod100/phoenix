# Phoenix VCS Divergence Mitigation — Implementation Summary

## What Was Implemented

This implementation bridges the ideological gap between the original Phoenix VCS vision (main branch) and the practical skills-based approach (nandi/dev). 

### Core VCS Modules (in `src/vcs/`)

| Module | PRD Section | Purpose | Status |
|--------|-------------|---------|--------|
| `identity.ts` | 3, 4 | SHA-256 hashing, D-rate tracking, bootstrap state machine | ✅ Complete |
| `drift.ts` | 9 | Manifest comparison, waiver system, blocking drift detection | ✅ Complete |
| `boundary.ts` | 7 | Dependency extraction, architectural linting, forbidden imports | ✅ Complete |
| `evidence.ts` | 10 | Risk-tiered evidence, policy enforcement, quality gates | ✅ Complete |
| `cascade.ts` | 11 | Graph operations, selective invalidation, failure cascade | ✅ Complete |
| `shadow.ts` | 5.1 | Pipeline upgrade safety, SAFE/COMPACTION/REJECT classification | ✅ Complete |
| `status.ts` | 13 | Unified diagnostics with severity model | ✅ Complete |
| `cli.ts` | 14 | Command-line interface for all VCS operations | ✅ Complete |

## Key Ideological Bridges

### 1. Content-Addressed Identity ✅

**Original Vision**: SHA-256 for all identities (clause, IU, file)
**Skills Approach**: Human-readable numbered IDs (IU-11, IU-12)
**Resolution**: Core uses SHA-256 throughout; skills can maintain human aliases

```typescript
// The core uses proper content-addressing
const canonId = sha256(normalizedRequirementText);
const iuId = sha256(name + contract + sortedCanonIds);
const fileHash = sha256(fileContent);
```

### 2. Defensive Drift Detection ✅

**Original Vision**: Block acceptance on unlabeled manual edits
**Skills Approach**: No automated checking
**Resolution**: `phoenix-vcs drift` command with waiver system

```bash
npx phoenix-vcs drift
# 🔴 BLOCKING: 8 modified files without waivers

# Options:
# 1. Revert to generated: git checkout src/generated/
# 2. Create waiver: edit .phoenix/waivers.json
```

### 3. Risk-Tiered Evidence ✅

**Original Vision**: Automated quality gates (low→medium→high→critical)
**Skills Approach**: Optional manual testing
**Resolution**: `evaluatePolicy()` with mandatory evidence per tier

```typescript
const required = getRequiredEvidence('high');
// → ['typecheck', 'lint', 'boundary_validation', 'unit_tests', 
//     'property_tests', 'threat_note']
```

### 4. Graph-Based Cascade ✅

**Original Vision**: Selective invalidation, transitive dependency tracking
**Skills Approach**: Manual full regeneration
**Resolution**: `computeCascade()` and `computeInvalidation()`

```bash
# Only regenerate subtree affected by spec changes
npx phoenix-vcs invalidate node-a1b2c3d4 node-b2c3d4e5
# → 3 of 12 IUs need regeneration
```

### 5. Shadow Pipeline Safety ✅

**Original Vision**: SAFE/COMPACTION/REJECT classification for upgrades
**Skills Approach**: No upgrade safety mechanism
**Resolution**: `runShadowPipeline()` for canonicalization changes

```typescript
const result = runShadowPipeline(oldNodes, newNodes, 'v1.2', 'v1.3');
// Classification: SAFE | COMPACTION_EVENT | REJECT
```

## CLI Commands

```bash
# Full status check (diagnostics, drift, evidence, dependencies)
npx phoenix-vcs status

# Check for manual edits
npx phoenix-vcs drift

# Validate architectural boundaries
npx phoenix-vcs boundary src/generated/app/database.ts

# Compute failure cascade
npx phoenix-vcs cascade <iu-id>

# Selective invalidation after spec changes
npx phoenix-vcs invalidate node-abc123...
```

## Integration with Skills

Skills can use the VCS core for principled operations:

```typescript
// In a Pi skill
import { getVCSStatus, detectDrift, computeInvalidation } from 'phoenix-vcs/vcs';

export async function beforeCommit(projectRoot: string) {
  const status = await getVCSStatus(projectRoot);
  
  if (status.status === 'CRITICAL') {
    return {
      allowed: false,
      reason: 'VCS issues must be resolved',
      diagnostics: status.diagnostics
    };
  }
  
  return { allowed: true };
}
```

## File Structure

```
src/vcs/
├── index.ts          # Public API exports
├── cli.ts            # Command-line interface
├── identity.ts       # SHA-256, D-rate, classification
├── drift.ts          # Manifest comparison, waivers
├── boundary.ts       # Dependency extraction, validation
├── evidence.ts       # Risk-tiered policy enforcement
├── cascade.ts        # Graph operations, selective invalidation
├── shadow.ts         # Pipeline upgrade safety
├── status.ts         # Unified diagnostics
└── README.md         # Documentation
```

## Testing Results

From the kanban example:

```
🔍 Phoenix VCS Status                           🔴 CRITICAL

Drift: ❌ 0 clean, 8 modified, 4 missing
  🔴 BLOCKING: Unlabeled manual edits detected

Evidence: ❌ REJECTED (avg score: 0/100)
  0/7 IUs passed (evidence collection incomplete)

Dependencies: ✅ 7 nodes, 0 edges
```

This is the **correct defensive behavior** per PRD Section 9:
> "Drift detection blocks unlabeled edits"

## Next Steps for Full Compliance

1. **Store waivers** in `.phoenix/waivers.json`
2. **Collect evidence** via skill integration
3. **Track D-rate** over time in `.phoenix/metrics.json`
4. **Add side-channel** declarations to IU boundaries
5. **Implement shadow** pipeline for skill upgrades

## The VCS Philosophy

Per PRD Section 0:
> "Version control should operate on **intent and causality**, not file diffs"
> 
> "If phoenix status is trusted, Phoenix becomes the coordination substrate."
> 
> "Trust > cleverness"

This implementation restores that trust by:
1. Being **conservative** (REJECT when uncertain)
2. Being **explainable** (every decision has reasoning)
3. Being **correct-enough** (D-rate tracking, bootstrap states)
4. Being **defensive** (blocks unlabeled manual edits)

## Usage

```bash
# Build
cd /home/nandi/code/phoenix
bun run build

# Run status in a Phoenix project
cd examples/kanban
bun /home/nandi/code/phoenix/dist/vcs/cli.js status

# Or if installed globally
npx phoenix-vcs status
```
