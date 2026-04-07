---
name: phoenix-regen
description: Generate implementation code from Implementation Units with evidence collection and traceability exports. Creates TypeScript files with content-addressed identity. Executable skill - runs regen.js directly.
---

# Phoenix Regen

Generate code from Implementation Units with full VCS tracking.

## When to Use

- After planning IUs
- To implement a specific feature
- When requirements change (selective regeneration)
- After spec edits invalidate IUs

## Input

Implementation Unit:
```json
{
  "iu_id": "ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88",
  "name": "Dashboard Page",
  "risk_tier": "high",
  "contract": {
    "description": "Renders HTML dashboard with Catppuccin theme",
    "invariants": ["Uses only Catppuccin Mocha colors"]
  },
  "source_canon_ids": ["a1b2c3d4...", "b2c3d4e5..."],
  "output_files": [
    "src/generated/app/dashboard.ts",
    "src/generated/app/__tests__/dashboard.test.ts"
  ]
}
```

## How to Run

```bash
# Regenerate all IUs
node .pi/skills/phoenix-regen/regen.js

# Regenerate specific IUs (selective invalidation)
node .pi/skills/phoenix-regen/regen.js IU-ec4737a7 IU-d9277914
```

## Process

### Step 1: Check for selective invalidation

If regenerating after spec changes:

```bash
# Check which IUs need regeneration
node .pi/skills/phoenix-cascade/cascade.js invalidate node-a1b2c3d4 node-b2c3d4e5

# Only regenerate affected IUs, not entire codebase
```

### Step 2: Read IU contract and requirements

1. Load IU from `.phoenix/graphs/ius.json`
2. Load canonical requirements from `.phoenix/graphs/canonical.json`
3. Understand invariants and boundary policies

### Step 3: Generate code

Write TypeScript implementation:
- Implement all requirements
- Respect invariants
- Follow boundary policy (no forbidden imports)
- Add error handling

### Step 4: Add traceability export

Every generated file MUST include:

```typescript
/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
```

### Step 5: Collect evidence

Run required evidence based on risk tier:

```bash
# Low: typecheck, lint, boundary
# Medium: + unit_tests
# High: + property_tests, threat_note
# Critical: + static_analysis, human_signoff

npm run typecheck
npm run lint
npm test
```

**Note:** Evidence collection is performed by `phoenix-evidence`, not during regen. Regen generates the code; evidence validates it.

### Step 6: Update manifest

Record generated file hashes using VCS identity functions inlined from `src/vcs/identity.ts`:

- `fileHash(content)` - SHA-256 of file content

Write to `.phoenix/manifests/generated_manifest.json`:

```json
{
  "version": "1.0.0",
  "generated_at": "2026-04-07T20:00:00Z",
  "files": {
    "src/generated/app/dashboard.ts": {
      "iu_id": "ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88",
      "hash": "96bc65e6206fb3e810f88f3e87891b23ca8a461c90a63a8b5fb0a71f296fdabe",
      "size": 3431,
      "generated_at": "2026-04-07T20:00:00Z"
    }
  }
}
```

## Quality Gates

| Tier | Required Evidence | Block on Fail |
|------|-------------------|---------------|
| low | typecheck, lint | yes |
| medium | + unit_tests | yes |
| high | + property_tests | yes |
| critical | + static_analysis, human_signoff | yes |

## Traceability Chain

```
CODE (iu_id) → IU (source_canon_ids) → CANON (canon_id) → CLAUSE (id) → SPEC
```

**In generated code:**
```typescript
export const _phoenix = {
  iu_id: 'ec4737a7...',  // Links to IU
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
```

**In IU:**
```json
{
  "iu_id": "ec4737a7...",
  "source_canon_ids": ["a1b2c3d4...", "b2c3d4e5..."]
}
```

## Output

Generated files:
- `src/generated/app/dashboard.ts` (with _phoenix export)
- `src/generated/app/__tests__/dashboard.test.ts` (medium+ risk)
- Updated `.phoenix/manifests/generated_manifest.json`

## Rejection Handling

If evidence fails:

```
❌ REJECTED - Policy evaluation failed

Failed Evidence:
  - unit_tests: 3 of 12 tests failed

Actions:
  1. Fix code to pass tests
  2. Re-run phoenix-regen
  3. Evidence must pass before acceptance
```

## Next Step

Run `node .pi/skills/phoenix-audit/audit.js` to validate completeness, or `node .pi/skills/phoenix-drift/drift.js` to detect manual edits.
