---
name: phoenix-audit
description: Audit Implementation Units for quality and completeness. Checks contracts, traceability, and coverage.
---

# Phoenix Audit

Review IUs before or after code generation.

## When to Use

- Before generating code
- To check quality
- To find gaps

## Checklist

### Contract Completeness
- [ ] Description is clear
- [ ] Inputs defined
- [ ] Outputs defined
- [ ] Invariants are specific (not vague like "appropriate")

### Risk Tier
- [ ] <5 requirements → low/medium
- [ ] 5-15 requirements → medium/high
- [ ] >15 requirements → high/critical
- [ ] User-facing UI → high

### Traceability (in IU)
- [ ] All `source_canon_ids` are valid canonical IDs
- [ ] Every IU requirement traces to canon
- [ ] No orphan canon IDs

### Code Quality (for generated files)
- [ ] All IU requirements implemented
- [ ] `_phoenix` export with `iu_id` only
- [ ] No placeholder code
- [ ] Error handling present
- [ ] Tests exist (medium+ risk)

## Output Format

```
🔍 Audit: Dashboard Page

Score: 95/100

✓ Contract complete
✓ Risk tier appropriate (11 → high)
⚠ Invariant "responsive layout" is vague
✓ source_canon_ids valid (30 refs)
✓ _phoenix export present (iu_id only)
✓ Code implements all IU requirements

Recommendation: Minor warning only.
```

## Finding Issues

| Issue | Fix |
|-------|-----|
| Vague invariant | Add specific values |
| Wrong risk tier | Adjust based on count |
| Missing _phoenix export | Add traceability |
| Orphan canon ID | Add to IU or remove |
