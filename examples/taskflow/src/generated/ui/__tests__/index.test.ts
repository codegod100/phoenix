// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// UI Domain (IU-fa4c8303)
// Risk Tier: HIGH

// @phoenix-iu: fa4c83036ec9c9a9dc5d827a93eb8e8e6683bdb93cd99c0bd5a730ef789481e7
// @phoenix-name: UI Domain
// @phoenix-risk: high
// @phoenix-short: IU-fa4c8303

// TDD CYCLE:
// 1. npm test -- iu-fa4c8303
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { getArchivedTasks, setStatus, filterByStatus, getActiveTasks } from '../index.js';

describe('UI Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const path = require('path');
    const implPath = path.join(__dirname, '..', 'index.ts');
    const impl = fs.readFileSync(implPath, 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*fa4c83036ec9c9a9/);
  });

  // 🔴 RED: getArchivedTasks should return correct data
  it('getArchivedTasks returns ui by id', () => {
    const result = getArchivedTasks('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: setStatus should transform input
  it('setStatus processes ui', () => {
    const item: Ui = { id: '1', name: 'test' };
    const result = setStatus(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

  // 🔴 RED: filterByStatus should return correct data
  it('filterByStatus returns ui by id', () => {
    const result = filterByStatus('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: getActiveTasks should return correct data
  it('getActiveTasks returns ui by id', () => {
    const result = getActiveTasks('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

});
