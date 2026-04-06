---
name: phoenix-status
description: Display Phoenix project status. Shows specs, requirements, and generated files.
---

# Phoenix Status

Check the current state of a Phoenix project.

## When to Use

- When starting work
- To see what's implemented
- To check progress

## What to Check

1. **Spec files**
   - Count of `.md` files in `spec/`
   - List by name

2. **Requirements**
   - Total count
   - By type (REQUIREMENT, CONSTRAINT, etc.)
   - By spec file

3. **Implementation Units**
   - Number of IUs planned
   - Risk distribution

4. **Generated files**
   - Count in `src/generated/`
   - List by directory

5. **Traceability**
   - Files with `_phoenix` export
   - Missing traceability

## Output Format

```
🔥 Phoenix Status

Specs: 3 files
  - web-dashboard.md (12 requirements)
  - tasks.md (8 requirements)
  - analytics.md (4 requirements)

Requirements: 24 total
  - REQUIREMENT: 18
  - CONSTRAINT: 4
  - DEFINITION: 2

Implementation Units: 2
  - Dashboard Page (HIGH)
  - Styles (MEDIUM)

Generated Files: 2
  src/generated/web-dashboard/
    - dashboard-page.ts ✓ (has _phoenix)
    - styles.ts ✓ (has _phoenix)

Traceability: 100%
  All files have _phoenix exports
```

## Manual Check

Without CLI, read files directly:
1. `ls spec/*.md`
2. Read each spec, count clauses
3. `ls src/generated/`
4. Check `_phoenix` exports in files
