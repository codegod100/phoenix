---
name: phoenix-evidence
description: Collect and verify evidence for Implementation Units. Risk-tiered enforcement with automated quality gates.
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

Using VCS core:

```typescript
import { getRequiredEvidence, evaluatePolicy } from 'phoenix-vcs/vcs';

const required = getRequiredEvidence('high');
// → ['typecheck', 'lint', 'boundary_validation', 'unit_tests', 
//     'property_tests', 'threat_note']
```

### Step 2: Collect evidence

```typescript
import { 
  runTypecheck, 
  runLint, 
  runUnitTests,
  createThreatNote,
  createHumanSignoff 
} from 'phoenix-vcs/vcs';

// Automated evidence
const typecheck = await runTypecheck(projectRoot);
const lint = await runLint(projectRoot);
const tests = await runUnitTests(projectRoot, iuId, testPattern);

// Manual evidence
const threatNote = createThreatNote(iuId, [
  'XSS: User input is escaped in templates',
  'CSRF: API uses same-site cookies'
]);

const signoff = createHumanSignoff(iuId, 'nandi', artifactHash);
```

### Step 3: Evaluate policy

```typescript
const evaluation = evaluatePolicy(iuId, 'high', [
  typecheck, lint, tests, threatNote
]);

// → {
//   iu_id: 'ec4737a7...',
//   tier: 'high',
//   status: 'ACCEPTED' | 'REJECTED' | 'PENDING',
//   score: 85,
//   missing_evidence: [],
//   failed_evidence: []
// }
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
    npx phoenix-vcs status
```

## Per-PRD Risk Tiers

From PRD Section 10:
> "Evidence binds to canonical nodes, IU IDs, generated artifact hashes"

Evidence is content-addressed and traceable.

## Next Step

Pass evaluation to `phoenix-audit` for comprehensive review, or `phoenix-status` for project view.
