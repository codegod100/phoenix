---
name: phoenix-pipeline
description: Spec-driven code generation pipeline. Generates code from specs with optional validation. Non-blocking by default — use --strict-evidence for TDD mode.
---

# Phoenix Pipeline — Spec-Driven Code Generation

**Phoenix generates code directly from specs. Validation is informational.**

The pipeline prioritizes code generation over enforcement. Evidence and drift detection run but don't block by default.

## Workflow

```
SPEC → CANON → PLAN → PROTOLENS → CODEGEN → EVIDENCE → AUDIT → DRIFT
```

1. **Ingest** - Parse specs into clauses
2. **Canonicalize** - Extract clean requirements
3. **Plan** - Create Implementation Units (IUs)
4. **Protolens** - Compute migration plan (theory morphism)
5. **Codegen** - Generate IU implementations AND deliverable
6. **Evidence** - Collect validation metrics (informational)
7. **Audit** - Check architectural boundaries
8. **Drift** - Detect manual changes vs manifest

## Default Mode (Non-Blocking)

By default, the pipeline completes successfully even if tests fail or drift is detected:

```bash
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow
# ✅ Pipeline complete (with warnings)
```

Evidence and drift show as warnings (⚠️) but don't prevent code generation.

## Strict Mode (Legacy TDD)

Use `--strict-evidence` for the old TDD behavior where test failures block the pipeline:

```bash
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow --strict-evidence
# ❌ Pipeline fails if evidence or drift issues exist
```

## Running Individual Phases

```bash
# Just setup (no codegen)
node .pi/skills/phoenix-ingest/ingest.js examples/taskflow
node .pi/skills/phoenix-canonicalize/canonicalize.js examples/taskflow
node .pi/skills/phoenix-plan/plan.js examples/taskflow

# Regenerate code
node .pi/skills/phoenix-codegen/codegen.js examples/taskflow

# Just evidence (informational)
node .pi/skills/phoenix-evidence/evidence.js examples/taskflow

# Skip specific phases
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow --skip-codegen
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow --skip-evidence
```

## Selective Invalidation

When specs change, Phoenix **only regenerates affected IUs**:

```bash
# Change one requirement
edit spec/tasks.md

# Pipeline regenerates ONLY dependent IUs:
node .pi/skills/phoenix-pipeline/pipeline.js examples/taskflow
# → "Regenerating 3 of 25 IUs..."
# → Other 22 IUs preserve implementations
```

## Pipeline Options

| Flag | Description |
|------|-------------|
| `--strict-evidence` | Fail pipeline on evidence/drift issues (legacy TDD mode) |
| `--skip-codegen` | Preserve existing implementations |
| `--skip-evidence` | Skip evidence collection |
| `--skip-drift` | Skip drift detection |
| `--skip-audit` | Skip boundary validation |

## Next Steps

```bash
# Check health
node .pi/skills/phoenix-status/status.js examples/taskflow

# See what's generated
node .pi/skills/phoenix-inspect/inspect.js examples/taskflow
```
