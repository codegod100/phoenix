---
name: phoenix-drift
description: Detect drift between spec and implementation. Finds outdated code or missing requirements.
---

# Phoenix Drift

Check if implementation matches specification.

## When to Use

- After editing specs
- Before committing
- To find outdated code

## What to Check

1. **Spec changes**
   - New requirements added?
   - Requirements modified?
   - Requirements removed?

2. **Implementation status**
   - Which requirements are implemented?
   - Which are missing?
   - Which are outdated?

3. **File drift**
   - Files generated but spec changed?
   - Manual edits without spec update?

## Output Format

```
🔍 Drift Detection

Spec Changes:
  + REQ-025: Add bulk archive feature (new)
  ~ REQ-012: Updated color palette (modified)
  - REQ-008: Removed old auth method (deleted)

Implementation Status:
  ✓ node-001 → dashboard-page.ts (current)
  ✓ node-002 → dashboard-page.ts (current)
  ⚠ node-012 → styles.ts (outdated - color changed)
  ✗ node-025 → (not implemented)

Action Needed:
  → Update styles.ts for new color palette
  → Add bulk archive feature
```

## Manual Check

1. Read current spec
2. Extract requirements
3. Check generated files
4. Compare _phoenix.canon_ids with current requirements
5. Identify gaps
