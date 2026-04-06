---
name: phoenix-inspect
description: Visualize Phoenix project structure. Shows spec → requirements → code traceability.
---

# Phoenix Inspect

Visualize the project structure.

## When to Use

- To understand organization
- To find gaps
- To review traceability

## Output Format

```
🔍 Phoenix Inspect

Spec → Requirements → Code

web-dashboard.md
  ├─ node-001: render html → dashboard-page.ts ✓
  ├─ node-002: display header → dashboard-page.ts ✓
  ├─ node-003: catppuccin theme → dashboard-page.ts ✓
  └─ node-004: css variables → styles.ts ✓

tasks.md
  ├─ node-005: create task → (not implemented) ⚠
  └─ node-006: status transitions → task-lifecycle.ts ✓

Coverage: 5/6 requirements implemented (83%)

Missing:
  - node-005: create task (from tasks.md)
```

## Manual Inspection

1. Read spec files
2. List requirements with node IDs
3. Check generated files for _phoenix exports
4. Map canon_ids to requirements
5. Identify unimplemented requirements
