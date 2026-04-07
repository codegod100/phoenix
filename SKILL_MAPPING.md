# Phoenix VCS Skills Mapping

Complete mapping of VCS core code to skills-based pipeline.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     SKILLS LAYER (Agent)                         │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐  │
│  │ phoenix-│ │ phoenix-│ │ phoenix-│ │ phoenix-│ │ phoenix-│  │
│  │ ingest  │ │canon.   │ │ plan    │ │ regen   │ │ audit   │  │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘  │
│       │           │           │           │           │        │
│  ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ ┌────┴────┐ │
│  │phoenix- │ │phoenix- │ │phoenix- │ │phoenix- │ │phoenix- │ │
│  │ drift   │ │ cascade │ │ shadow  │ │evidence │ │ status  │ │
│  └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ └────┬────┘ │
│       │           │           │           │           │        │
│       └───────────┴───────────┴───────────┴───────────┘        │
│                           │                                     │
├───────────────────────────┼─────────────────────────────────────┤
│                     VCS CORE (Code)                            │
│  ┌─────────────────────────┴──────────────────────────────┐   │
│  │  identity.ts ─── SHA-256, D-rate, classification       │   │
│  │  drift.ts ──── Manifest comparison, waivers           │   │
│  │  boundary.ts ─ Dependency extraction, validation      │   │
│  │  evidence.ts ─ Risk-tiered enforcement                │   │
│  │  cascade.ts ── Graph operations, selective invalidation │   │
│  │  shadow.ts ─── Pipeline upgrade safety                 │   │
│  │  status.ts ─── Unified diagnostics                   │   │
│  └──────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

## Skill → VCS Core Mapping

| Skill | VCS Core Module | Key Functions | Purpose |
|-------|-----------------|---------------|---------|
| **phoenix-ingest** | `identity.ts` | `canonId()`, `clauseSemhash()`, `normalizeText()` | Content-addressed clause extraction |
| **phoenix-canonicalize** | `identity.ts` | `classifyChange()`, `DRateTracker`, `BootstrapStateMachine` | Change classification, D-rate tracking |
| **phoenix-plan** | `identity.ts` | `iuId()` | Content-addressed IU identity |
| **phoenix-regen** | `drift.ts`, `evidence.ts` | `fileHash()`, `runTypecheck()`, `evaluatePolicy()` | Manifest creation, evidence collection |
| **phoenix-audit** | `boundary.ts`, `evidence.ts` | `validateBoundary()`, `evaluatePolicy()` | Architectural validation |
| **phoenix-drift** | `drift.ts` | `detectDrift()`, `createWaiver()` | Defensive drift detection |
| **phoenix-cascade** | `cascade.ts` | `computeCascade()`, `computeInvalidation()`, `buildDependencyGraph()` | Graph-based failure propagation |
| **phoenix-evidence** | `evidence.ts` | `getRequiredEvidence()`, `runUnitTests()`, `createThreatNote()` | Risk-tiered enforcement |
| **phoenix-shadow** | `shadow.ts` | `runShadowPipeline()`, `classifyShadowDiff()` | Pipeline upgrade safety |
| **phoenix-status** | `status.ts` | `getVCSStatus()`, `formatVCSStatus()` | Unified diagnostics |

## Pipeline Flow with Skills

```
spec/*.md
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix ingest                                           │
│ • Read spec files                                                │
│ • Extract clauses                                                │
│ • Compute SHA-256: canonId(), clauseSemhash()                    │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼ .phoenix/graphs/spec.json
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix canonicalize                                     │
│ • Remove duplicates (same hash)                                  │
│ • Classify changes: classifyChange()                             │
│ • Track D-rate: DRateTracker                                     │
│ • Bootstrap state: BootstrapStateMachine                         │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼ .phoenix/graphs/canonical.json
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix plan                                             │
│ • Group requirements                                             │
│ • Compute IU ID: iuId() (SHA-256)                               │
│ • Assign risk tier                                               │
│ • Define boundary policy                                         │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼ .phoenix/graphs/ius.json
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix regen                                            │
│ • Generate code                                                  │
│ • Add _phoenix export                                            │
│ • Compute file hash: fileHash()                                  │
│ • Collect evidence: runTypecheck(), runUnitTests()               │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼ src/generated/*, .phoenix/manifests/generated_manifest.json
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix evidence                                         │
│ • Verify risk-tiered evidence: evaluatePolicy()                  │
│ • Run tests: runUnitTests()                                      │
│ • Create threat notes: createThreatNote()                         │
│ • Block if failed                                                │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix audit                                            │
│ • Validate boundaries: validateBoundary()                        │
│ • Check over-implementation                                      │
│ • Verify traceability                                            │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix drift                                            │
│ • Detect drift: detectDrift()                                    │
│ • Block on unlabeled edits                                       │
│ • Create waivers: createWaiver()                                 │
└─────────────────────────────────────────────────────────────────┘
    │
    ▼
┌─────────────────────────────────────────────────────────────────┐
│ /skill:phoenix status                                           │
│ • Unified diagnostics: getVCSStatus()                              │
│ • Show drift, evidence, graph health                            │
└─────────────────────────────────────────────────────────────────┘
```

## VCS Core → Skill Integration

### 1. Identity (identity.ts)

```typescript
// Skill: phoenix-ingest
import { canonId, clauseSemhash } from 'phoenix-vcs/vcs';
const clauseId = canonId(normalizedText);

// Skill: phoenix-plan
import { iuId } from 'phoenix-vcs/vcs';
const unitId = iuId(name, contract, canonIds);

// Skill: phoenix-regen
import { fileHash } from 'phoenix-vcs/vcs';
const hash = fileHash(sourceCode);
```

### 2. Drift (drift.ts)

```typescript
// Skill: phoenix-drift
import { detectDrift, createWaiver } from 'phoenix-vcs/vcs';
const report = detectDrift(projectRoot, manifest);
const waiver = createWaiver(filePath, 'temporary_patch', options);
```

### 3. Boundary (boundary.ts)

```typescript
// Skill: phoenix-audit
import { validateBoundary } from 'phoenix-vcs/vcs';
const result = validateBoundary(iuId, filePath, sourceCode, policy, enforcement);
```

### 4. Evidence (evidence.ts)

```typescript
// Skill: phoenix-evidence
import { 
  getRequiredEvidence, 
  runTypecheck, 
  runUnitTests,
  evaluatePolicy 
} from 'phoenix-vcs/vcs';

const required = getRequiredEvidence('high');
const typecheck = await runTypecheck(projectRoot);
const tests = await runUnitTests(projectRoot, iuId, pattern);
const evaluation = evaluatePolicy(iuId, 'high', [typecheck, tests]);
```

### 5. Cascade (cascade.ts)

```typescript
// Skill: phoenix-cascade
import { 
  buildDependencyGraph, 
  computeCascade, 
  computeInvalidation 
} from 'phoenix-vcs/vcs';

const graph = buildDependencyGraph(ius);
const event = computeCascade(graph, failedIuId, 'unit_tests', reason);
const invalidated = computeInvalidation(graph, changedCanonIds, iuToCanonMap);
```

### 6. Shadow (shadow.ts)

```typescript
// Skill: phoenix-shadow
import { runShadowPipeline } from 'phoenix-vcs/vcs';
const result = runShadowPipeline(oldNodes, newNodes, 'v1.2', 'v1.3');
// result.classification: SAFE | COMPACTION_EVENT | REJECT
```

### 7. Status (status.ts)

```typescript
// Skill: phoenix-status
import { getVCSStatus, formatVCSStatus } from 'phoenix-vcs/vcs';
const state = await getVCSStatus(projectRoot);
console.log(formatVCSStatus(state));
```

## CLI Integration

Each skill has CLI access via VCS core:

```bash
# phoenix-ingest / phoenix-canonicalize
# (no direct CLI - use skills)

# phoenix-plan / phoenix-regen
# (no direct CLI - use skills)

# phoenix-audit / phoenix-boundary
npx phoenix-vcs boundary src/generated/app/dashboard.ts

# phoenix-drift
npx phoenix-vcs drift

# phoenix-cascade
npx phoenix-vcs cascade <iu-id>
npx phoenix-vcs invalidate node-a1b2c3d4...

# phoenix-shadow
npx phoenix-vcs shadow

# phoenix-status
npx phoenix-vcs status
```

## Skill Commands Reference

| Command | Purpose | VCS Core |
|---------|---------|----------|
| `/skill:phoenix ingest` | Parse specs to clauses | `canonId()`, `clauseSemhash()` |
| `/skill:phoenix canonicalize` | Extract requirements | `classifyChange()`, `DRateTracker` |
| `/skill:phoenix plan` | Create IUs | `iuId()` |
| `/skill:phoenix regen` | Generate code | `fileHash()`, evidence collection |
| `/skill:phoenix evidence` | Verify quality | `evaluatePolicy()`, `getRequiredEvidence()` |
| `/skill:phoenix audit` | Validate architecture | `validateBoundary()` |
| `/skill:phoenix drift` | Check for edits | `detectDrift()`, `createWaiver()` |
| `/skill:phoenix cascade` | Compute failure propagation | `computeCascade()` |
| `/skill:phoenix shadow` | Pipeline upgrade safety | `runShadowPipeline()` |
| `/skill:phoenix status` | Full project health | `getVCSStatus()` |
| `/skill:phoenix pipeline` | Full flow | All of above |

## Example Usage

### Agent (Skill-Based)

```
User: Generate a dashboard from my spec

Agent:
  1. /skill:phoenix ingest (parse spec)
  2. /skill:phoenix canonicalize (extract requirements)
  3. /skill:phoenix plan (create IUs)
  4. /skill:phoenix regen (generate code)
  5. /skill:phoenix evidence (collect evidence)
  6. /skill:phoenix audit (validate boundaries)
  7. /skill:phoenix drift (establish baseline)
  8. /skill:phoenix status (verify health)
```

### CLI (Direct)

```bash
# Check project health
npx phoenix-vcs status

# Detect manual edits
npx phoenix-vcs drift

# Check what needs regeneration after spec change
npx phoenix-vcs invalidate node-a1b2c3d4

# Validate file boundaries
npx phoenix-vcs boundary src/generated/app/dashboard.ts

# Compute failure cascade
npx phoenix-vcs cascade ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88
```

## Benefits

1. **Principled**: Every skill uses VCS core with SHA-256 identity
2. **Defensive**: Drift detection blocks unlabeled edits
3. **Efficient**: Selective invalidation (not full regeneration)
4. **Safe**: Shadow pipeline for upgrades
5. **Trustworthy**: D-rate tracking ensures quality
6. **Flexible**: Skills for agents, CLI for direct access
