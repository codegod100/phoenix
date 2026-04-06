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
Description: Renders HTML dashboard with Catppuccin theme
Requirements:
  - node-001: system shall render complete html page
  - node-002: page must display taskflow header
  - node-004: dashboard uses catppuccin mocha colors
  - node-005: background color is #1e1e2e
  - node-006: card background is #313244
Output: src/generated/web-dashboard/dashboard-page.ts
```

## Process

1. **Read requirements**
   - Understand what the IU must do
   - Note constraints and invariants

2. **Generate code**
   - Write TypeScript implementation
   - Include all required functionality
   - Follow project conventions

3. **Add traceability**
   - Include `_phoenix` export at end of file
   - Reference IU ID and canon_ids

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
  iu_id: 'abc123...',
  name: 'Dashboard Page',
  risk_tier: 'high',
  canon_ids: ['node-001', 'node-002', 'node-004', 'node-005', 'node-006'] as const,
} as const;
```

## Output

Generated files with:
- Full implementation
- Traceability export
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
  iu_id: 'ec4737a...',
  name: 'Dashboard Page',
  risk_tier: 'high',
  canon_ids: ['node-001', 'node-002', 'node-004', 'node-005', 'node-006'] as const,
} as const;
```

## Quality Checks

- [ ] All requirements implemented
- [ ] Traceability export present
- [ ] canon_ids are actual IDs (not counts)
- [ ] Code compiles/runs
- [ ] Tests pass (if applicable)
