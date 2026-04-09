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

## Phoenix State Directory (`.phoenix/`)

**NEVER delete `.phoenix/` between normal pipeline runs.** Phoenix is **incremental by design**.

The `.phoenix/` directory contains:
- `graphs/canonical.json` - Content-addressed requirements (expensive to rebuild)
- `graphs/ius.json` - Implementation Unit boundaries
- `manifests/` - Generated file hashes for drift detection
- `state.json` - Pipeline state tracking

### Correct Usage

```bash
# Just run the pipeline - it detects spec changes automatically
node .pi/skills/phoenix-pipeline/pipeline.js /path/to/project

# Skip phases when specs haven't changed
node .pi/skills/phoenix-pipeline/pipeline.js /path/to/project --skip-ingest
```

### When to Reset (Rare)

Only delete `.phoenix/` for:
- **Corrupted state** (rare - usually indicated by parse errors)
- **Changing canonicalization algorithm** (major version upgrade)
- **Force full rebuild** (debugging/troubleshooting)

```bash
# Cold start - only when necessary!
rm -rf /path/to/project/.phoenix
node .pi/skills/phoenix-pipeline/pipeline.js /path/to/project
```

### Why Deleting is Harmful

Deleting `.phoenix/` forces a **cold start**:
- Re-ingests all specs from scratch (slow for large projects)
- Re-canonicalizes all requirements (loses edit history context)
- Re-plans all IUs (destroys boundary optimization)
- Loses drift detection baseline (false positives on next run)

**The pipeline already checks file mtimes and content hashes. Let it do its job.**

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

## Post-Pipeline Verification (Agent Task)

After the pipeline completes, an agent should perform smoketest verification:

### Smoketest Steps
1. **Kill any existing server** on the configured port (usually 8080)
2. **Start the generated server**: `node src/generated/app/server.ts`
3. **Wait for server ready** (poll HTTP endpoint until 200 response or timeout)
4. **Verify response**: Check that the page loads and contains expected content
5. **Kill the server**: Stop the process after verification

### Why This Is Agent-Level
The smoketest requires runtime verification that cannot be captured in static files. The agent interprets the pipeline output, starts the server, and verifies it works. This is the "draw the rest of the owl" principle - the skill provides the instruction, the agent does the work.

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
