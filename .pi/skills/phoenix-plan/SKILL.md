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
node-a1b2c3d4: system shall render complete html page
node-b2c3d4e5: page must display taskflow header
node-c3d4e5f6: no theme toggle allowed
node-d4e5f678: dashboard uses catppuccin mocha colors
node-e5f67890: background color is #1e1e2e
node-f6789012: card background is #313244
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

Implementation Units (IU ID = SHA-256 of IU name + first canon ID):
```
IU-ec4737a7: Dashboard Page (HIGH)
  Description: Renders HTML dashboard with Catppuccin theme
  Requirements: node-a1b2c3d4, node-b2c3d4e5, node-d4e5f678, node-e5f67890, node-f6789012
  Risk: HIGH (11 requirements, user-facing)
  Output: src/generated/web-dashboard/dashboard-page.ts
  Tests: src/generated/web-dashboard/__tests__/dashboard-page.test.ts

IU-a1b2c3d4: Styles (MEDIUM)
  Description: CSS custom properties for Catppuccin Mocha
  Requirements: node-d4e5f678, node-e5f67890, node-f6789012
  Risk: MEDIUM (7 requirements)
  Output: src/generated/web-dashboard/styles.ts
```

## Next Step

Pass IUs to Regen phase for code generation.
