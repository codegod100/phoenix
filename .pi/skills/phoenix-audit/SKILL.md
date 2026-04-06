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

### IU Granularity (File Size Check)
- [ ] No file exceeds 500 lines (threshold for splitting consideration)
- [ ] No IU has >20 requirements (split into multiple IUs)
- [ ] No single function/component exceeds 100 lines
- [ ] UI code separated from API logic (different IUs)
- [ ] Client/server split respected (no dual-concern files)

**Splitting Triggers:**
| Metric | Warning | Must Split |
|--------|---------|------------|
| Lines of code | 350-500 | >500 |
| Requirements count | 15-20 | >20 |
| Number of exported functions | 5-8 | >8 |
| Cyclomatic complexity | 10-15 | >15 |

**Common Split Patterns:**
1. **UI → Page + Components**: Split large page into separate component IUs
2. **API → Routes + Logic**: Separate route handlers from business logic
3. **Client → API client + UI client**: Split data fetching from UI state
4. **Theme → Tokens + Components**: Design system split by concern

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
| **File too large (>500 lines)** | **Split into multiple IUs** |
| **Too many requirements (>20)** | **Group into separate IUs by concern** |
| **Mixed client/server logic** | **Create separate client and server IUs** |

## Detecting Split Candidates

Use these commands to find large files:

```bash
# Find files exceeding 500 lines
cd examples/item-dashboard && wc -l src/generated/app/*.ts | sort -n | tail -5

# Find files with >20 requirements (count canon_ids)
grep -c "canon_ids:" src/generated/app/*.ts | grep -E ":[2-9][0-9]$|:[0-9]{3,}$"

# Find IUs with multiple concerns (mixed patterns)
grep -l "class.*Client" src/generated/app/*.ts | xargs grep -l "export.*Router\|Hono()"
```

### Example Split Decision

```
🔍 Audit: items-dashboard.ts

Score: 65/100

✓ Contract complete
⚠ File size: 520 lines (exceeds 500 threshold)
⚠ 22 canon_ids (exceeds 20 threshold)
⚠ Contains both page HTML and API client class
⚠ _phoenix export present (iu_id only)

RECOMMENDATION: Split into 3 IUs:
  1. items-dashboard.page.ts (HTML page, 180 lines, 10 requirements)
  2. items-dashboard.client.ts (API client, 80 lines, 8 requirements)  
  3. items-dashboard.ui.ts (shared UI components, 90 lines, 4 requirements)
```
