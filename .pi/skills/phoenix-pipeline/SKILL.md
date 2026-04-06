---
name: phoenix-pipeline
description: Run the complete Phoenix pipeline. Executes ingest → canonicalize → plan → regen in sequence. Use for first-time setup or full regeneration after spec changes.
---

# Phoenix Pipeline

Run the complete Phoenix VCS pipeline from spec to code.

## When to Use

- First time setting up a Phoenix project
- After major spec changes
- For full regeneration (clean slate)
- CI/CD pipelines
- When unsure which phase to run

## Usage

```bash
/skill:phoenix-pipeline              # Full pipeline
/skill:phoenix-pipeline --from plan  # Start from specific phase
/skill:phoenix-pipeline --dry-run    # Show what would happen
/skill:phoenix-pipeline --fast       # Skip validation (dev mode)
```

## Pipeline Flow

```
┌─────────┐    ┌─────────────┐    ┌─────────────┐    ┌───────┐
│  Spec   │───→│  Canonical  │───→│     IUs     │───→│  Code │
│  Files  │    │ Requirements│    │   Planned   │    │Generated│
└─────────┘    └─────────────┘    └─────────────┘    └───────┘
     │               │                  │               │
     ▼               ▼                  ▼               ▼
spec/*.md    .phoenix/graphs/   .phoenix/graphs/  src/generated/
             canonical.json     ius.json          app/

Phase A         Phase B           Phase C          Phase C
INGEST       CANONICALIZE        PLAN              REGEN
```

## Implementation Steps

### Step 1: Initialize (if needed)

```typescript
// Check if project initialized
if (!findProjectRoot()) {
  console.log('🔥 Phoenix not initialized. Running init first...\n');
  await executeSkill('phoenix-init');
}

const { root, phoenixDir } = requireProjectRoot();
```

### Step 2: Determine Starting Phase

```typescript
function determineStartingPhase(args: string[]): string {
  // Explicit --from flag
  const fromIndex = args.indexOf('--from');
  if (fromIndex >= 0 && args[fromIndex + 1]) {
    return args[fromIndex + 1];
  }
  
  // Auto-detect based on existing graphs
  if (!existsSync(join(phoenixDir, 'graphs', 'spec.json'))) {
    return 'ingest';
  }
  if (!existsSync(join(phoenixDir, 'graphs', 'canonical.json'))) {
    return 'canonicalize';
  }
  if (!existsSync(join(phoenixDir, 'graphs', 'ius.json'))) {
    return 'plan';
  }
  
  return 'regen';
}

const startPhase = determineStartingPhase(args);
const phases = ['ingest', 'canonicalize', 'plan', 'regen'];
const startIndex = phases.indexOf(startPhase);
const phasesToRun = phases.slice(startIndex);
```

### Step 3: Execute Each Phase

```typescript
console.log('🔥 Phoenix Pipeline');
console.log(`Starting from: ${startPhase}`);
console.log(`Phases to run: ${phasesToRun.join(' → ')}\n`);

const results = {
  ingest: null as IngestResult | null,
  canonicalize: null as CanonicalizeResult | null,
  plan: null as PlanResult | null,
  regen: null as RegenResult | null
};

// Phase A: Ingest
if (phasesToRun.includes('ingest')) {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  Phase A: Ingest                        │');
  console.log('└─────────────────────────────────────────┘');
  
  results.ingest = await executeSkill('phoenix-ingest');
  
  if (!results.ingest.success) {
    console.error('\n✖ Ingest failed. Stopping pipeline.');
    return { success: false, phase: 'ingest', error: results.ingest.error };
  }
  
  console.log(`\n✔ Ingest complete: ${results.ingest.clauseCount} clauses\n`);
}

// Phase B: Canonicalize
if (phasesToRun.includes('canonicalize')) {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  Phase B: Canonicalize                  │');
  console.log('└─────────────────────────────────────────┘');
  
  results.canonicalize = await executeSkill('phoenix-canonicalize');
  
  if (!results.canonicalize.success) {
    console.error('\n✖ Canonicalize failed. Stopping pipeline.');
    return { success: false, phase: 'canonicalize', error: results.canonicalize.error };
  }
  
  console.log(`\n✔ Canonicalize complete: ${results.canonicalize.nodeCount} nodes\n`);
}

// Phase C: Plan
if (phasesToRun.includes('plan')) {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  Phase C: Plan                          │');
  console.log('└─────────────────────────────────────────┘');
  
  results.plan = await executeSkill('phoenix-plan');
  
  if (!results.plan.success) {
    console.error('\n✖ Plan failed. Stopping pipeline.');
    return { success: false, phase: 'plan', error: results.plan.error };
  }
  
  console.log(`\n✔ Plan complete: ${results.plan.iuCount} IUs\n`);
}

// Phase C (continued): Regen
if (phasesToRun.includes('regen')) {
  console.log('┌─────────────────────────────────────────┐');
  console.log('│  Phase C: Regenerate                    │');
  console.log('└─────────────────────────────────────────┘');
  
  results.regen = await executeSkill('phoenix-regen');
  
  if (!results.regen.success) {
    console.error('\n✖ Regenerate had errors.');
    // Continue to show status even with errors
  } else {
    console.log(`\n✔ Regenerate complete: ${results.regen.fileCount} files\n`);
  }
}
```

### Step 4: Run Audit

```typescript
// Optional: Audit IUs before reporting
console.log('┌─────────────────────────────────────────┐');
console.log('│  Audit                                  │');
console.log('└─────────────────────────────────────────┘');

const audit = await executeSkill('phoenix-audit');

if (audit.issues > 0) {
  console.log(`\n⚠ ${audit.issues} audit warnings found`);
  console.log('Run /skill:phoenix-audit for details\n');
}
```

### Step 5: Run Tests

```typescript
console.log('┌─────────────────────────────────────────┐');
console.log('│  Tests                                  │');
console.log('└─────────────────────────────────────────┘');

try {
  const testResult = await $`bun test`.cwd(root);
  const match = testResult.stdout.match(/(\d+) pass/);
  const passed = parseInt(match?.[1] || '0');
  
  console.log(`\n✔ ${passed} tests passed\n`);
} catch (e) {
  console.log('\n⚠ Some tests failed');
  console.log('Run bun test for details\n');
}
```

### Step 6: Final Status

```typescript
console.log('┌─────────────────────────────────────────┐');
console.log('│  Pipeline Complete                    │');
console.log('└─────────────────────────────────────────┘\n');

await executeSkill('phoenix-status');

console.log('\n📋 Next Steps:');
console.log('  • Edit spec/ and run /skill:phoenix-pipeline again');
console.log('  • Run /skill:phoenix-inspect to visualize');
console.log('  • Run /skill:phoenix-drift to check sync status');
```

## Error Handling

Pipeline stops on first failure:

```
🔥 Phoenix Pipeline
Starting from: ingest
Phases to run: ingest → canonicalize → plan → regen

┌─────────────────────────────────────────┐
│  Phase A: Ingest                        │
└─────────────────────────────────────────┘
  spec/app.md → 24 clauses

✔ Ingest complete: 24 clauses

┌─────────────────────────────────────────┐
│  Phase B: Canonicalize                  │
└─────────────────────────────────────────┘
  Error: No REQUIREMENT or CONSTRAINT clauses found
  All clauses are CONTEXT type - add explicit markers

✖ Canonicalize failed. Stopping pipeline.

Fix: Add REQUIREMENT: and CONSTRAINT: markers to spec/app.md
```

## Dry Run Mode

With `--dry-run`:

```
🔥 Phoenix Pipeline (Dry Run)

Would execute:
  1. /skill:phoenix-ingest
     - Parse spec/app.md
     - Extract ~24 clauses
  
  2. /skill:phoenix-canonicalize
     - Extract ~18 canonical nodes
     - Compute warm hashes
  
  3. /skill:phoenix-plan
     - Plan ~6 IUs
     - Risk assessment
  
  4. /skill:phoenix-regen
     - Generate ~12 files
     - Run tests

No changes made. Remove --dry-run to execute.
```

## Fast Mode

With `--fast`:
- Skip syntax validation
- Skip full test suite (just check tests exist)
- Skip audit
- For rapid iteration during development

## Phase Dependencies

| Phase | Requires | Produces |
|-------|----------|----------|
| Ingest | spec/*.md files | spec.json |
| Canonicalize | spec.json | canonical.json, warm-hashes.json |
| Plan | canonical.json | ius.json |
| Regen | ius.json | src/generated/app/*, manifest.json |

## Output Summary

```
🔥 Phoenix Pipeline Complete

┌─────────────┬──────────┬────────────────┐
│ Phase       │ Status   │ Output         │
├─────────────┼──────────┼────────────────┤
│ Ingest      │ ✔        │ 24 clauses     │
│ Canonicalize│ ✔        │ 18 nodes       │
│ Plan        │ ✔        │ 6 IUs          │
│ Regen       │ ✔        │ 12 files       │
└─────────────┴──────────┴────────────────┘

Files: 12 in sync
Tests: 37 passed, 0 failed

Generated:
  • src/generated/app/api.ts
  • src/generated/app/board.ui.ts
  • src/generated/app/cards.ui.ts
  • src/generated/app/cards.client.ts
  • src/generated/app/database.ts
  • src/generated/app/design-system.ui.ts
  • src/generated/app/ui.ui.ts
  • src/generated/app/__tests__/api.test.ts
  • src/generated/app/__tests__/board.test.ts
  • src/generated/app/__tests__/cards.test.ts
  • src/generated/app/__tests__/database.test.ts
  • src/generated/app/__tests__/ui.test.ts

Next: Run /skill:phoenix-inspect --serve to visualize
```

## Prerequisites

- Phoenix project initialized (auto-runs init if needed)
- Spec files in spec/ directory

## See Also

- /skill:phoenix-init - Just initialize
- /skill:phoenix-ingest - Just parse specs
- /skill:phoenix-status - Check state without running
