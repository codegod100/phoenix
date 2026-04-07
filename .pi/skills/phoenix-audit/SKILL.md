---
name: phoenix-audit
description: Audit Implementation Units with boundary validation, evidence verification, and over-implementation detection. Validates architectural integrity.
---

# Phoenix Audit

Comprehensive audit with boundary validation and evidence verification.

## When to Use

- Before committing code
- After generating code
- To validate architectural integrity
- To detect boundary violations

## Audit Dimensions

### 1. Contract Completeness
- [ ] Description is clear
- [ ] Inputs defined
- [ ] Outputs defined
- [ ] Invariants are specific (not vague)

### 2. Risk Tier Appropriateness
- [ ] <5 requirements → low/medium
- [ ] 5-15 requirements → medium/high
- [ ] >15 requirements → high/critical
- [ ] User-facing UI → high

### 3. Boundary Validation (VCS Core)

Validate architectural integrity:

```bash
npx phoenix-vcs boundary src/generated/app/dashboard.ts
```

Using VCS core:

```typescript
import { validateBoundary, formatBoundaryReport } from 'phoenix-vcs/vcs';

const sourceCode = readFileSync(filePath, 'utf-8');
const iuId = extractFromPhoenixExport(sourceCode);

const result = validateBoundary(iuId, filePath, sourceCode, policy, enforcement);
// → { has_errors, has_warnings, diagnostics: [...] }

console.log(formatBoundaryReport([result]));
```

Checks:
- Forbidden IU imports
- Forbidden packages
- Undeclared side channels (DB, external APIs)
- Dependency extraction from source

### 4. Evidence Verification (VCS Core)

Verify risk-tiered evidence is collected:

```typescript
import { evaluatePolicy, formatPolicyReport } from 'phoenix-vcs/vcs';

const evaluation = evaluatePolicy(iuId, 'high', evidenceRecords);
// → { status: 'ACCEPTED' | 'REJECTED', score: 85, ... }
```

| Tier | Required | Status |
|------|----------|--------|
| low | typecheck, lint, boundary | Must pass |
| medium | + unit_tests | Must pass |
| high | + property_tests, threat_note | Must pass |
| critical | + static_analysis, human_signoff | Must pass |

### 5. Traceability Verification
- [ ] All `source_canon_ids` are valid canonical IDs
- [ ] Every IU requirement traces to canon
- [ ] No orphan canon IDs
- [ ] `_phoenix` export present with correct `iu_id`

### 6. Over-Implementation Detection

Detect files implementing more than their IU requires:

```bash
# Check specific file
.pi/skills/phoenix-audit/check-over-impl.sh src/generated/app/dashboard.ts

# Check all files
for f in src/generated/app/*.ts; do
  .pi/skills/phoenix-audit/check-over-impl.sh "$f"
done
```

Detection criteria:
- Lines of code (by file type)
- Export count (>5 = concern)
- Concern mixing (>2 types = high severity)

| File Type | Expected | Warning | Must Split |
|-----------|----------|---------|------------|
| `.client.ts` | 100 lines | 150 | 200 |
| `.ui.ts` | 250 lines | 300 | 400 |
| `api.ts` | 80 lines | 100 | 150 |

Concern types:
- HTTP Routes (router.get/post)
- Database (db.prepare, SQL)
- API Client (fetch)
- UI/HTML (templates)
- Validation (zod)
- Business Logic

## Output Format

```
🔍 Phoenix VCS Audit Report

IU: Dashboard Page (ec4737a7...)
Risk Tier: HIGH

✓ Contract complete
✓ Risk tier appropriate (11 requirements → HIGH)
✓ Boundary validation passed (no violations)
⚠ Evidence: unit_tests missing (pending)
✓ Traceability: _phoenix export correct
✓ No over-implementation (312 lines, 3 concerns)

Score: 85/100
Status: PENDING (missing evidence)

Actions:
  → Add unit tests for Dashboard Page
  → Re-run audit after evidence collection
```

## Rejection Criteria

Audit **blocks acceptance** on:

1. **Boundary violations** (error severity)
2. **Missing evidence** for risk tier
3. **Failed evidence** (tests failing, type errors)
4. **Traceability gaps** (missing _phoenix export)
5. **Critical over-implementation** (must split IUs)

## Score Interpretation

| Score | Status | Meaning |
|-------|--------|---------|
| 90-100 | ✅ ACCEPTED | Minor issues only |
| 70-89 | ⚠️ PENDING | Missing evidence, fixable |
| 50-69 | ❌ REJECTED | Boundary violations, must fix |
| 0-49 | ❌ REJECTED | Critical issues, must split/rearchitect |

## Next Step

Run `phoenix-drift` to establish baseline, or `phoenix-status` for full project view.
