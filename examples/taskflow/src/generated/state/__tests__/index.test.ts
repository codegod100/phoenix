// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// State Domain (IU-b25d3806)
// Risk Tier: HIGH

// @phoenix-iu: b25d38068f5a68a7e72a54568159d1e595758e1fbc22e51d023dd441e230607a
// @phoenix-name: State Domain
// @phoenix-risk: high
// @phoenix-short: IU-b25d3806

// TDD CYCLE:
// 1. npm test -- iu-b25d3806
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { getArchivedTasks } from '../index.js';

describe('State Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const path = require('path');
    const implPath = path.join(__dirname, '..', 'index.ts');
    const impl = fs.readFileSync(implPath, 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*b25d38068f5a68a7/);
  });

  // 🔴 RED: getArchivedTasks should return correct data
  it('getArchivedTasks returns state by id', () => {
    const result = getArchivedTasks('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

});
