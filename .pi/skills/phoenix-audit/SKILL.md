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

### Traceability
- [ ] All canon_ids exist
- [ ] Output paths valid
- [ ] _phoenix export present in generated files
- [ ] canon_ids are actual IDs, not counts

### Code Quality (for generated files)
- [ ] All requirements implemented
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
✓ All canon_ids valid
✓ _phoenix export present
✓ Code implements all requirements

Recommendation: Minor warning only.
```

## Finding Issues

| Issue | Fix |
|-------|-----|
| Vague invariant | Add specific values |
| Wrong risk tier | Adjust based on count |
| Missing traceability | Add _phoenix export |
| canon_ids as counts | Replace with actual IDs |
