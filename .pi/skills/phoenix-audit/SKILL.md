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

## Detecting Over-Implementation

Files implementing more than their IU requires:

### Use the over-impl checker

```bash
cd examples/item-dashboard
../../.pi/skills/phoenix-audit/check-over-impl.sh src/generated/app/items.ts
```

### Detection Criteria

| Check | Threshold | Severity |
|-------|-----------|----------|
| Lines of code | By type (see below) | > threshold |
| Export count | >5 exports | Moderate |
| Concern mixing | >2 concern types | High |
| External imports | >5 packages | Low |

**File Type Thresholds:**
| Type | Expected | Warning | Must Split |
|------|----------|---------|------------|
| `.client.ts` | 100 lines | 150 | 200 |
| `.ui.ts` | 250 lines | 300 | 400 |
| `api.ts` | 80 lines | 100 | 150 |
| Core modules | 150 lines | 200 | 250 |

**Concern Types to Detect:**
- HTTP Routes (Hono router, GET/POST/PATCH/DELETE)
- Database (db.prepare, SQL)
- API Client (fetch, axios)
- UI/HTML (html templates, innerHTML)
- Validation (zod, zValidator)
- Business Logic (validate, calculate functions)

### Quick Check All Files

```bash
cd examples/item-dashboard
for f in src/generated/app/*.ts; do
  [[ "$f" == *"__tests__"* ]] && continue
  [[ "$f" == *"index.ts"* ]] && continue
  echo "=== $f ==="
  lines=$(wc -l < "$f")
  exports=$(grep -c "^export " "$f")
  concerns=0
  grep -q "router\.\(get\|post\)" "$f" && ((concerns++))
  grep -q "db\.prepare" "$f" && ((concerns++))
  grep -q "fetch" "$f" && ((concerns++))
  grep -q "html\|<div" "$f" && ((concerns++))
  echo "  Lines: $lines | Exports: $exports | Concerns: $concerns"
done
```

### Interpreting Results

**Score 0-30:** ✅ Acceptable — minor issues only  
**Score 31-60:** ⚠️ Consider splitting — mixed concerns or too large  
**Score 61-100:** ❌ Must split — violating IU boundaries

### Common Over-Implementation Patterns

1. **"God File"** — Implements multiple IUs
   ```
   items.ts doing: routes + DB + validation + business logic
   → Split: items.routes.ts, items.db.ts, items.logic.ts
   ```

2. **Interface Bloat** — Client file defines domain types
   ```
   items-dashboard.client.ts exports 4 interfaces
   → Should import from items.types.ts or domain IU
   ```

3. **UI Monolith** — HTML template with embedded scripts/styles
   ```
   design-system.ui.ts at 325 lines (mostly CSS)
   → Split: design-system.tokens.ts, design-system.components.ts
   ```

4. **Mixed Client/Server** — Same file has fetch() and db.query()
   ```
   ⚠️ Violates IU boundary policy
   → Always separate into .client.ts and .ts files
   ```
