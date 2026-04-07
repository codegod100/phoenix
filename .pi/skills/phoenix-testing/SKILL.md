---
name: phoenix-testing
description: Testing guidelines and verification for Phoenix projects. Provides test coverage validation by risk tier. Executable skill - runs testing.js directly.
---

# Phoenix Testing

Testing verification and validation for Phoenix projects.

## When to Use

- To validate test coverage by risk tier
- Before committing to ensure tests pass
- To check that all IUs have required tests

## How to Run

```bash
# Run full testing verification
node .pi/skills/phoenix-testing/testing.js [project-root]
```

## Risk-Based Testing Requirements

| Risk | Tests Required |
|------|----------------|
| low | Optional unit tests |
| medium | Unit tests |
| high | Unit + integration tests |
| critical | Full suite + manual verification |

## What It Checks

1. **Test file existence** - Each medium+ IU has corresponding test file
2. **Test execution** - All tests pass
3. **Traceability** - Tests reference IU via _phoenix export
4. **Coverage** - Minimum coverage per risk tier

## Output

```
🧪 Phoenix Testing

Checking 12 IUs...

✅ IU-ec4737a7 (Dashboard Page) - HIGH
   Test file: src/generated/app/__tests__/dashboard.test.ts
   Status: 12/12 passed
   Coverage: 87%

⚠️  IU-d9277914 (Board UI) - MEDIUM
   Test file: MISSING
   Required for medium tier: unit_tests

❌ IU-a1b2c3d4 (Task Model) - CRITICAL
   Test file: src/generated/__tests__/task.test.ts
   Status: 2/8 tests failed
   Failed:
     - should validate input
     - should handle null
```

## Exit Codes

- 0: All tests pass, coverage sufficient
- 1: Tests failing or missing required coverage

## Next Step

Fix failing tests or add missing test files, then re-run.
