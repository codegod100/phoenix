---
name: phoenix-spec
description: Guidelines and helpers for writing and editing Phoenix specification files. Ensures no IU references and proper spec structure.
---

# Phoenix Spec Editor

Guidelines and helpers for writing and editing Phoenix specification files.

## When Using This Skill

**ALWAYS edit the spec file FIRST, then update plan.md to match.**

The correct order is:
1. **Edit** `spec/*.md` files (source of truth)
2. **Update** `.phoenix/plan.md` to reflect new/removed requirements  
3. **Regenerate** code if needed

Never update code or plan without first updating the spec. Specs drive everything.

## Core Principle

**Specs are the source of truth. IUs are generated FROM specs.**

Never reference Implementation Units (IUs) in specs. IUs are dynamically planned from canonical requirements. A spec that mentions "IU-3" or "Dashboard Page IU" creates a circular dependency.

## Spec Structure

```markdown
# Spec Name

One-line description of what this spec covers.

## Section Name

- REQUIREMENT: The system shall do X
- CONSTRAINT: The system must not do Y
- DEFINITION: A "term" is ...

## Another Section

- SCENARIO: User performs action
  - GIVEN: Initial state
  - WHEN: Action occurs
  - THEN: Expected result
```

## Writing Requirements

### Good Requirement
```markdown
- REQUIREMENT: The dashboard shall display a compact status bar showing total tasks, completed count, overdue count, and completion rate
```

### Bad (References IU)
```markdown
- REQUIREMENT: The IU-8 Analytics Bar shall display metrics  ← WRONG!
- REQUIREMENT: The status bar (from IU-8) shall show ...      ← WRONG!
```

### Good (References Feature Area)
```markdown
- REQUIREMENT: The analytics bar shall display metrics inline
- REQUIREMENT: The dashboard header shall show compact metrics
```

## Constraint: No IU References

**NEVER use in specs:**
- `IU-1`, `IU-2`, etc.
- "The Dashboard Page IU"
- "From IU-3..."
- "The Task Model unit..."

**INSTEAD use:**
- Feature names: "analytics bar", "task list", "create form"
- Functional areas: "dashboard header", "task grid", "archive view"
- Component descriptions: "compact status bar below header"

## Cross-Spec References

When one spec depends on another, reference by **feature/behavior**, not IU:

### Good
```markdown
- REQUIREMENT: The archive tab shall filter tasks displayed in the task grid
- REQUIREMENT: The create form shall append tasks to the same localStorage used by the task list
```

### Bad
```markdown
- REQUIREMENT: IU-6 shall filter tasks from IU-4    ← WRONG!
```

## Spec Editing Checklist

Before saving a spec file:

- [ ] No mentions of "IU-" or "Implementation Unit"
- [ ] Requirements are self-contained (don't depend on generated artifacts)
- [ ] Feature names are descriptive, not numeric
- [ ] Cross-references use functional descriptions
- [ ] Each requirement has a clear subject ("The X shall...")

## Common Spec Types

### Domain Spec (tasks.md, analytics.md)
Defines data models, operations, rules.

```markdown
# Task Domain

## Task Lifecycle

- REQUIREMENT: A task shall have title, description, priority, status
- REQUIREMENT: The system shall support status transitions: open → in_progress → review → done
```

### UI Component Spec (web-dashboard-*.md)
Defines UI components, layout, interactions.

```markdown
# Dashboard Task List

## Task Grid

- REQUIREMENT: The task grid shall render tasks as cards in a responsive grid
- REQUIREMENT: Each card shall display title, priority badge, status badge, assignee
```

### Integration Spec (web-dashboard-integration.md)
Defines how components work together. References components by **feature name**, never by IU.

```markdown
# Dashboard Integration

## Component Wiring

- REQUIREMENT: The create form shall append tasks to localStorage and trigger task grid re-render
- REQUIREMENT: The analytics bar shall recalculate when localStorage changes
```

## Anti-Patterns to Avoid

### 1. IU Leakage
```markdown
# Bad - spec mentions generated artifact
- REQUIREMENT: IU-5 shall provide edit functionality
```

### 2. Forward Reference
```markdown
# Bad - assumes planning output
- REQUIREMENT: The Dashboard Page IU shall include the Analytics Bar IU
```

### 3. Circular Description
```markdown
# Bad - describes planning, not behavior
- REQUIREMENT: All HIGH risk IUs shall have test files
```

## Validation

To check specs for IU references:

```bash
grep -r "IU-" spec/
# Should return nothing (or only in comments marked as examples of what NOT to do)
```

## Pipeline Flow Reminder

```
spec/*.md        ← You are here (source of truth)
    ↓
[phoenix-ingest] ← Reads specs, extracts clauses
    ↓
[phoenix-canonicalize] ← Creates canonical requirements
    ↓
[phoenix-plan]   ← Creates IUs (derived, not source)
    ↓
[phoenix-regen]  ← Generates code
    ↓
src/generated/*  ← Output
```

**Specs know nothing about IUs. IUs know which specs they came from.**
