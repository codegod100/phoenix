---
name: test-coverage
description: Analyze test coverage and identify areas needing more tests. Use to improve test suite quality and find untested code.
---

# Test Coverage Analysis Skill

## Overview

Analyze the test suite and identify gaps in test coverage.

## Steps

1. Detect test framework (Jest, Vitest, Mocha, etc.)
2. Run coverage report if available:
   ```bash
   npm run test -- --coverage || npx jest --coverage || npm run coverage
   ```

3. Analyze coverage output
4. Identify critical untested paths:
   - Error handling branches
   - Edge cases
   - Complex logic
   - Integration points

5. Suggest test cases for:
   - Happy paths
   - Error conditions
   - Boundary values
   - Async operations

## Output Format

```
Test Coverage Report
===================
Overall coverage: X%
Statements: X%
Branches: X%
Functions: X%
Lines: X%

Priority files needing tests:
1. src/... (X% coverage) - Reason
2. src/... (X% coverage) - Reason

Suggested test cases:
- File: describe what to test
```
