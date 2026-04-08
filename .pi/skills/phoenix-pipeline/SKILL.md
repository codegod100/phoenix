---
name: phoenix-pipeline
description: TDD pipeline with automated scaffolding — supports both manual implementation AND LLM auto-implementation. Validated via evidence tiers.
---

# Phoenix Pipeline — TDD with Optional Auto-Implementation

**Phoenix generates failing stubs (RED) → You OR an LLM implement → Evidence validates (GREEN).**

The pipeline doesn't care **who** implements — human or AI — it only cares that **evidence passes**.

## Two Valid Workflows

### Workflow A: Manual TDD (You Implement)

```
SPEC → STUB (RED) → YOU CODE → EVIDENCE (GREEN)
```

Traditional TDD. You edit the stub, write tests, make it pass.

### Workflow B: Auto-Implementation (LLM Implements)

```
SPEC → STUB (RED) → LLM GENERATES → EVIDENCE (GREEN)
```

Same pipeline, but an LLM reads the spec + stub and generates the implementation.

**Both workflows produce the same output**: Code with traceability that passes evidence.

## Pipeline Phases as TDD

### Phase 1-3: Setup (GREEN)
- **Ingest**: Parse specs into clauses
- **Canonicalize**: Extract clean requirements  
- **Plan**: Group into Implementation Units (IUs)

**Result**: Requirements locked, traceability established.

### Phase 4: Regen — **Failing Stubs (RED)**

**Purpose**: Generate intentionally-failing code stubs

**Skill**: `phoenix-regen`

**Output**: `src/generated/IU-*/index.ts` + `__tests__/index.test.ts`

**What Gets Generated**:
```typescript
// Types derived from spec
export interface Task { ... }

// 🔴 RED: Function signature from contract  
export function calculateMetrics(tasks: Task[]): Metrics {
  // TODO: Implement logic to make this GREEN
  throw new Error('🔴 RED: Not implemented: calculateMetrics');
}

// Traceability (REQUIRED)
export const _phoenix = {
  iu_id: '29eaf566...',
  name: 'Metrics Domain',
  risk_tier: 'medium',
} as const;
```

**Why throw?** 
- Forces implementation (can't ship stubs)
- Tests will fail until logic added
- **Human OR LLM must replace with real code**

### Phase 5: Evidence — **Validation (GREEN)**

**Purpose**: Verify implementation meets tier requirements

**Skill**: `phoenix-evidence`

**Who implemented doesn't matter — only that evidence passes:**

| Tier | Required Evidence | Passes? |
|------|-------------------|---------|
| **LOW** | typecheck, lint, boundary | ✅ Auto-accept if valid TS |
| **MEDIUM** | + unit_tests | ✅ Auto-accept if tests pass |
| **HIGH** | + property_tests, threat_note | ✅ Accept if all present |
| **CRITICAL** | + static_analysis, **human_signoff** | 🔴 Must have human approval |

**Blocking Behavior**:
```
❌ REJECTED - Evidence failed
   unit_tests: 0/12 passed
   → Must implement before acceptance (you OR LLM)
   
✅ ACCEPTED - All evidence passed
   → IU enters manifest (regardless of who wrote code)
```

## Implementation Options

### Option 1: Manual Implementation (Traditional TDD)

```bash
# 1. Run pipeline to generate stubs
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow

# 2. Edit the stub manually
vim src/generated/metrics/index.ts
# Replace throw with your logic

# 3. Write your tests
vim src/generated/metrics/__tests__/index.test.ts
# Replace trivial tests with real assertions

# 4. Verify
npm test
npm run typecheck
```

### Option 2: LLM Auto-Implementation

```bash
# 1. Run pipeline to generate stubs
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow

# 2. Use LLM to implement (example with pi-interactive-shell)
# Prompt: "Read examples/taskflow/src/generated/metrics/index.ts 
#          and the canonical requirements in .phoenix/canonical.md
#          Implement the functions to make tests pass"

# 3. Verify (same as manual)
npm test
npm run typecheck

# 4. If evidence passes → ACCEPTED
node .pi/skills/phoenix-evidence/evidence.js examples/taskflow
```

### Option 3: Hybrid (LLM Draft + Human Review)

```bash
# 1. Generate stubs
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow

# 2. LLM implements all LOW tier IUs (auto-accept, safe)
# 3. Human implements HIGH tier IUs (needs review)

# 4. Verify all
node .pi/skills/phoenix-evidence/evidence.js examples/taskflow
```

## Selective Invalidation (Preserves Your Work)

When specs change, Phoenix **only regenerates affected IUs**:

```bash
# Change one requirement
edit spec/tasks.md

# Pipeline regenerates ONLY dependent IUs:
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow
# → "Regenerating 3 of 25 IUs..."
# → Other 22 IUs preserve implementations (human OR AI)
```

**Why this matters**: You don't lose work when specs evolve, regardless of who implemented.

## Key Principle: Evidence is the Gate

> **Phoenix doesn't judge WHO wrote the code.**
> 
> Phoenix validates:
> - Type safety ✅
> - Test passage ✅
> - Boundary policies ✅
> - Traceability preservation ✅
> 
> Implementation can be:
> - Human-written 🔧
> - LLM-generated 🤖
> - Hybrid approach 🔧🤖

## Running Individual Phases

```bash
# Just setup (no codegen)
node .pi/skills/phoenix-ingest/ingest.js examples/taskflow
node .pi/skills/phoenix-canonicalize/canonicalize.js examples/taskflow
node .pi/skills/phoenix-plan/plan.js examples/taskflow

# Regenerate stubs (DESTRUCTIVE - overwrites implementations!)
node .pi/skills/phoenix-regen/regen.js examples/taskflow

# Just evidence (safe, validates current code)
node .pi/skills/phoenix-evidence/evidence.js examples/taskflow

# Full pipeline with options
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow --skip-regen
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow --continue-on-error
```

## Pipeline State Machine

| State | TDD Phase | Behavior |
|-------|-----------|----------|
| **BOOTSTRAP_COLD** | Initial spec ingest | Drift detection OFF |
| **BOOTSTRAP_WARMING** | First implementation | D-rate alarms suppressed |
| **STEADY_STATE** | Normal operation | Full validation active |

## Quality Gates (All Must Pass)

| Phase | Gate | Fail Action |
|-------|------|-------------|
| Ingest | D-rate < 15% | Block, spec needs cleanup |
| Canonicalize | No orphan clauses | Block, missing requirements |
| Plan | Valid IU IDs | Block, planning error |
| Regen | Files created | Block, generation error |
| Evidence | Tier requirements met | **REJECTED** — implement (you or LLM) and retry |
| Audit | Boundary respected | Block, architectural violation |
| Drift | No unlabeled drift | Block, label changes or revert |

## Next Steps

```bash
# Check health
node .pi/skills/phoenix-status/status.js examples/taskflow

# See what's implemented vs stub
node .pi/skills/phoenix-inspect/inspect.js examples/taskflow

# Implement specific IU (skip regen to preserve work!)
node .pi/skills/phoenix-evidence/evidence.js examples/taskflow IU-29eaf566
```
