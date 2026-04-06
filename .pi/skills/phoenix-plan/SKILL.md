---
name: phoenix-plan
description: Plan Implementation Units from canonical requirements. Groups related requirements and assigns risk tiers.
---

# Phoenix Plan

Organize requirements into Implementation Units (IUs).

## When to Use

- After canonicalization
- Before code generation
- To organize complex features

## Input

Canonical requirements:
```
node-001: system shall render complete html page
node-002: page must display taskflow header
node-003: no theme toggle allowed
node-004: dashboard uses catppuccin mocha colors
node-005: background color is #1e1e2e
node-006: card background is #313244
```

## Process

1. **Group related requirements**
   - By feature area (UI, API, Database)
   - By user flow (Create Task, Edit Task)
   - By technical concern (Styles, Logic)

2. **Assign risk tier**

| Tier | Criteria |
|------|----------|
| low | <5 requirements, simple logic |
| medium | 5-10 requirements, some complexity |
| high | 10+ requirements, user-facing UI |
| critical | Security, data integrity |

3. **Define contract**
   - Description: What this IU does
   - Inputs: What it needs
   - Outputs: What it produces
   - Invariants: Must always be true

4. **Assign output files**
   - Where to put generated code
   - Test files (for medium+ risk)

## Output

Implementation Units:
```
IU-1: Dashboard Page (HIGH)
  Description: Renders HTML dashboard with Catppuccin theme
  Requirements: node-001, node-002, node-004, node-005, node-006
  Risk: HIGH (11 requirements, user-facing)
  Output: src/generated/web-dashboard/dashboard-page.ts
  Tests: src/generated/web-dashboard/__tests__/dashboard-page.test.ts

IU-2: Styles (MEDIUM)
  Description: CSS custom properties for Catppuccin Mocha
  Requirements: node-004, node-005, node-006
  Risk: MEDIUM (7 requirements)
  Output: src/generated/web-dashboard/styles.ts
```

## Next Step

Pass IUs to Regen phase for code generation.
