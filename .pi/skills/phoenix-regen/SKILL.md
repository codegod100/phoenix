---
name: phoenix-regen
description: Generate implementation code from Implementation Units. Creates TypeScript files with traceability exports.
---

# Phoenix Regen

Generate code from Implementation Units.

## When to Use

- After planning IUs
- To implement a specific feature
- When requirements change

## Input

Implementation Unit:
```
IU: Dashboard Page (HIGH)
IU ID: ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88
Description: Renders HTML dashboard with Catppuccin theme
Source Canon IDs: a1b2c3d4e5f67890, b2c3d4e5f6789012, ...
Output: src/generated/web-dashboard/dashboard-page.ts
```

## Process

1. **Read IU contract**
   - Understand what the IU must do
   - Note constraints and invariants
   - The IU's `source_canon_ids` link to requirements

2. **Generate code**
   - Write TypeScript implementation
   - Include all required functionality
   - Follow project conventions

3. **Add traceability**
   - Include `_phoenix` export at end of file
   - Reference IU ID only (the IU tracks canon_ids)

4. **Write files**
   - Save to output path
   - Create directories if needed

5. **Add tests** (if medium+ risk)
   - Test critical functionality
   - Verify invariants

## Traceability Export

Every generated file MUST include:

```typescript
/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
```

**Traceability Chain:**
```
CODE (iu_id) → IU (source_canon_ids) → CANON → SPEC
```

The code references only the IU. The IU tracks which canonical requirements it implements.

## Output

Generated files with:
- Full implementation
- Traceability export (iu_id only)
- Tests (for medium+ risk)

## Example

Input IU → Output code:
```typescript
// Generated dashboard page
export function renderDashboard(): string {
  return `<!DOCTYPE html>
<html>
<head>
  <style>
    :root {
      --ctp-base: #1e1e2e;
      --ctp-surface0: #313244;
    }
    body { background: var(--ctp-base); }
  </style>
</head>
<body>
  <h1>TaskFlow</h1>
</body>
</html>`;
}

export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
```

## Quality Checks

- [ ] All requirements implemented
- [ ] No placeholder code
- [ ] Error handling present
- [ ] Tests exist (medium+ risk)
- [ ] `_phoenix` export with `iu_id` only (IU tracks canon_ids)
