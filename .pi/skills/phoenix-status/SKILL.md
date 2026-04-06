---
name: phoenix-status
description: Display Phoenix pipeline status. Shows which phases are complete, file sync state, test results, and next recommended actions.
---

# Phoenix Status

Display the current state of the Phoenix pipeline.

## When to Use

- After any Phoenix skill to verify state
- To check if pipeline is complete
- To see what phase to run next
- Before committing changes

## Usage

```bash
/skill:phoenix-status           # Full status
/skill:phoenix-status --short   # One-line summary
/skill:phoenix-status --json    # Machine readable
```

## What It Shows

1. **Bootstrap state** (cold/warm/stable)
2. **Phase completion** (ingest/canonicalize/plan/regen)
3. **File counts** (specs, IUs, generated files)
4. **Sync status** (in sync / drifted)
5. **Test results** (pass/fail counts)
6. **Next actions** (recommended next skill)

## Implementation Steps

### Step 1: Load State

```typescript
const { root, phoenixDir } = requireProjectRoot();
const state = loadState(phoenixDir);
```

### Step 2: Check Each Phase

```typescript
const status = {
  initialized: existsSync(join(root, '.phoenix')),
  phases: {
    ingest: {
      complete: existsSync(join(phoenixDir, 'graphs', 'spec.json')),
      lastRun: state.last_ingest,
      fileCount: countSpecFiles(root)
    },
    canonicalize: {
      complete: existsSync(join(phoenixDir, 'graphs', 'canonical.json')),
      lastRun: state.last_canonicalize,
      nodeCount: 0  // Load from graph
    },
    plan: {
      complete: existsSync(join(phoenixDir, 'graphs', 'ius.json')),
      lastRun: state.last_plan,
      iuCount: 0  // Load from graph
    },
    regen: {
      complete: existsSync(join(phoenixDir, 'manifests', 'generated_manifest.json')),
      lastRun: state.last_regen,
      fileCount: 0  // Load from manifest
    }
  }
};

// Load counts from graphs
if (status.phases.ingest.complete) {
  const specGraph = readGraph<SpecGraph>(phoenixDir, 'spec');
  status.phases.ingest.fileCount = Object.keys(specGraph?.documents || {}).length;
}

if (status.phases.canonicalize.complete) {
  const canonGraph = readGraph<CanonicalGraph>(phoenixDir, 'canonical');
  status.phases.canonicalize.nodeCount = Object.keys(canonGraph?.nodes || {}).length;
}

if (status.phases.plan.complete) {
  const iuGraph = readGraph<IUGraph>(phoenixDir, 'ius');
  status.phases.plan.iuCount = iuGraph?.ius?.length || 0;
}

if (status.phases.regen.complete) {
  const manifest = loadManifest(phoenixDir);
  status.phases.regen.fileCount = Object.keys(manifest?.files || {}).length;
}
```

### Step 3: Check Drift

```typescript
const drift = checkDrift(phoenixDir, root);
status.drift = {
  status: drift.status,
  driftedFiles: drift.files.filter(f => f.status === 'drift').length,
  orphanFiles: drift.files.filter(f => f.status === 'orphan').length
};
```

### Step 4: Check Tests

```typescript
// Try to find test results or run quick check
try {
  const testOutput = await $`bun test`.cwd(root).quiet();
  const match = testOutput.stdout.match(/(\d+) pass/);
  status.tests = {
    passed: parseInt(match?.[1] || '0'),
    failed: 0  // Would parse from output
  };
} catch {
  status.tests = { passed: 0, failed: 0 };
}
```

### Step 5: Determine Next Action

```typescript
function getNextAction(status: Status): string {
  if (!status.phases.ingest.complete) {
    return '/skill:phoenix-ingest (no specs parsed)';
  }
  if (!status.phases.canonicalize.complete) {
    return '/skill:phoenix-canonicalize (requirements not extracted)';
  }
  if (!status.phases.plan.complete) {
    return '/skill:phoenix-plan (IUs not planned)';
  }
  if (!status.phases.regen.complete) {
    return '/skill:phoenix-regen (code not generated)';
  }
  if (status.drift.status === 'drifted') {
    return '/skill:phoenix-drift (files out of sync)';
  }
  if (status.tests.failed > 0) {
    return 'Fix failing tests or /skill:phoenix-regen --force';
  }
  return 'Pipeline complete! Edit spec/ and run /skill:phoenix-pipeline to update';
}
```

### Step 6: Display Status

```
🔥 Phoenix Status

  Project: kanban (stable)

  ┌─────────────┬──────────┬────────────────┐
  │ Phase       │ Status   │ Details        │
  ├─────────────┼──────────┼────────────────┤
  │ Ingest      │ ✔        │ 1 spec file    │
  │ Canonicalize│ ✔        │ 83 nodes       │
  │ Plan        │ ✔        │ 6 IUs          │
  │ Regen       │ ✔        │ 12 files       │
  └─────────────┴──────────┴────────────────┘

  Files: 12 in sync
  Tests: 37 passed, 0 failed

  Next: Pipeline complete! Edit spec/ and run /skill:phoenix-pipeline
```

Or if incomplete:

```
🔥 Phoenix Status

  Project: my-app (cold)

  ┌─────────────┬──────────┬────────────────────────────┐
  │ Phase       │ Status   │ Details                    │
  ├─────────────┼──────────┼────────────────────────────┤
  │ Ingest      │ ✖        │ No spec graph found        │
  │ Canonicalize│ ✖        │ Needs ingest first         │
  │ Plan        │ ✖        │ Needs canonicalize first   │
  │ Regen       │ ✖        │ Needs plan first           │
  └─────────────┴──────────┴────────────────────────────┘

  Next: /skill:phoenix-ingest
```

## Output Formats

**Default**: Human-readable table
**--short**: One line: "Phoenix: 6 IUs, 12 files, stable"
**--json**:
```json
{
  "initialized": true,
  "state": "stable",
  "phases": {
    "ingest": { "complete": true, "lastRun": "2026-04-06T10:30:00Z" },
    "canonicalize": { "complete": true, "lastRun": "2026-04-06T10:35:00Z" },
    "plan": { "complete": true, "lastRun": "2026-04-06T10:40:00Z" },
    "regen": { "complete": true, "lastRun": "2026-04-06T10:45:00Z" }
  },
  "counts": {
    "specFiles": 1,
    "canonicalNodes": 83,
    "ius": 6,
    "generatedFiles": 12
  },
  "drift": { "status": "clean", "driftedFiles": 0 },
  "tests": { "passed": 37, "failed": 0 },
  "nextAction": "Pipeline complete"
}
```

## Prerequisites

- Phoenix project initialized

## Pipeline Position

Utility skill - can run anytime.

## See Also

- /skill:phoenix-pipeline - Full pipeline
- /skill:phoenix-drift - Detailed drift analysis
