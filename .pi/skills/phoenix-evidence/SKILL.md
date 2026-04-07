---
name: phoenix-evidence
description: Collect and verify evidence for Implementation Units. Risk-tiered enforcement with automated quality gates. Executable skill - runs evidence.js directly.
---

# Phoenix Evidence

Risk-tiered evidence collection per PRD Section 10.

## When to Use

- After generating code
- Before accepting IU
- To verify quality gates
- In CI/CD pipelines

## Risk Tiers

| Tier | Requirements | Evidence Required |
|------|--------------|-------------------|
| **Low** | <5 requirements, simple | typecheck, lint, boundary |
| **Medium** | 5-10 requirements | + unit_tests |
| **High** | 10+ requirements, user UI | + property_tests, threat_note |
| **Critical** | Security, data integrity | + static_analysis, human_signoff |

## Evidence Types

| Kind | Description | When Required |
|------|-------------|---------------|
| typecheck | TypeScript type checking | All tiers |
| lint | Code style/linting | All tiers |
| boundary_validation | Architectural compliance | All tiers |
| unit_tests | Unit test suite | Medium+ |
| property_tests | Property-based tests | High+ |
| static_analysis | Security/bug analysis | Critical |
| threat_note | Security considerations | High+ |
| human_signoff | Manual review | Critical |
| formal_verification | Mathematical proof | Optional |

## Process

### Step 1: Determine required evidence

Using evidence.js directly:

```bash
node .pi/skills/phoenix-evidence/evidence.js <iu-id> [--tier=high]
```

Or programmatically, the skill inlines VCS evidence functions from `src/vcs/evidence.ts`:
- `getRequiredEvidence(tier)` - Returns required evidence kinds for risk tier
- `evaluatePolicy(iuId, tier, records)` - Evaluates evidence against policy
- `runTypecheck(projectRoot)` - Runs TypeScript type checking
- `runLint(projectRoot)` - Runs linting
- `runUnitTests(projectRoot, iuId, pattern)` - Runs unit tests
- `createThreatNote(iuId, threats)` - Creates threat note record
- `createHumanSignoff(iuId, signer, artifactHash)` - Creates signoff record

### Step 2: Collect evidence

The evidence.js script runs automated checks:

```bash
# Typecheck
npm run typecheck

# Lint  
npm run lint

# Tests
npm test
```

For manual evidence (threat notes, signoffs), create JSON files in `.phoenix/evidence/`.

### Step 3: Evaluate policy

```javascript
const evaluation = evaluatePolicy(iuId, 'high', records);
// Returns: { iu_id, tier, status, score, missing_evidence, failed_evidence }
```

### Step 4: Block or accept

```
IU: Dashboard Page (HIGH)
Score: 85/100
Status: ACCEPTED

✓ typecheck (passed in 1.2s)
✓ lint (passed in 0.8s)
✓ boundary_validation (passed in 0.3s)
✓ unit_tests (12/12 passed in 2.5s)
✓ property_tests (50/50 passed in 4.1s)
✓ threat_note (documented)
```

## Evidence Record Format

```json
{
  "kind": "unit_tests",
  "status": "passed",
  "timestamp": "2026-04-07T20:00:00Z",
  "iu_id": "ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88",
  "duration_ms": 2500,
  "test_count": 12,
  "pass_count": 12,
  "fail_count": 0,
  "details": "All tests passed"
}
```

## Human Signoff

For critical IUs:

```typescript
const signoff = createHumanSignoff(
  iuId,
  'nandi',                                    // Signed by
  'sha256-of-reviewed-artifact'             // Artifact hash
);
```

Immutable record of human review.

## Threat Notes

For high/critical IUs:

```typescript
const threats = createThreatNote(iuId, [
  'Input validation: All user inputs sanitized',
  'SQL injection: Parameterized queries only',
  'XSS: HTML escaping in templates'
]);
```

Required for security-sensitive code.

## Rejection Example

```
❌ REJECTED - Evidence Failed

IU: Dashboard Page (HIGH)
Score: 45/100

✓ typecheck (passed)
✓ lint (passed)
✓ boundary_validation (passed)
✗ unit_tests (9/12 failed)
⚠ property_tests (missing)
⚠ threat_note (missing)

Failed Evidence:
  - unit_tests: tests/dashboard.test.ts
    - should render columns: FAILED
    - should handle drag-drop: FAILED
    - should validate input: FAILED

Actions:
  1. Fix failing tests
  2. Add property tests
  3. Document threat model
  4. Re-run evidence collection
```

## Waiving Evidence

In exceptional cases:

```typescript
const waivedEvidence = {
  kind: 'unit_tests',
  status: 'waived',
  timestamp: '2026-04-07T20:00:00Z',
  iu_id: 'ec4737a7...',
  details: 'Waived: Emergency hotfix'
};
```

Requires signoff for high/critical tiers.

## CI Integration

```yaml
# .github/workflows/evidence.yml
- name: Collect Evidence
  run: |
    # Typecheck
    npm run typecheck
    
    # Lint
    npm run lint
    
    # Tests
    npm test
    
    # Verify all IUs have evidence
    node .pi/skills/phoenix-evidence/evidence.js --check-all
```

## Per-PRD Risk Tiers

From PRD Section 10:
> "Evidence binds to canonical nodes, IU IDs, generated artifact hashes"

Evidence is content-addressed and traceable.

## Next Step

Pass evaluation to `phoenix-audit` for comprehensive review, or `phoenix-status` for project view.
