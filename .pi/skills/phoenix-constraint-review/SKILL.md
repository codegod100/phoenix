---
name: phoenix-constraint-review
description: Review specifications for missing constraints and anti-patterns.
---

# Phoenix Constraint Review

Check specs for completeness.

## What to Find

### Missing Constraints
- No error handling
- Missing input validation
- Unclear boundaries

### Anti-Patterns
- "Should" instead of "shall/must"
- Vague terms ("appropriate", "reasonable")
- Missing limits ("max N items")

## Checklist

- [ ] All REQUIREMENTs are specific
- [ ] All CONSTRAINTs are measurable
- [ ] Error cases are specified
- [ ] Limits are defined (max, min)
- [ ] No vague language

## Example Findings

```
⚠ web-dashboard.md
  Line 12: "System should display..."
    → Use "shall" for requirements

⚠ tasks.md
  Line 8: "Appropriate padding"
    → Specify: "16px padding"

⚠ web-dashboard.md
  Missing: Max task title length
    → Add: CONSTRAINT: Title max 100 chars
```

## Fix Priority

| Issue | Priority |
|-------|----------|
| Missing error handling | High |
| Vague terms | Medium |
| "should" → "shall" | Low |
