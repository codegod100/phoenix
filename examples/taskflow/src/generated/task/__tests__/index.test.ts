// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Task Domain (IU-d46cdcd2)
// Risk Tier: HIGH

// @phoenix-iu: d46cdcd2f55a1f02afe06966ada179610c0017e78c69fe29ba144f9f3f4b4ab5
// @phoenix-name: Task Domain
// @phoenix-risk: high
// @phoenix-short: IU-d46cdcd2

// TDD CYCLE:
// 1. npm test -- iu-d46cdcd2
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { restorTasks, list, renderA } from '../index.js';

describe('Task Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const path = require('path');
    const implPath = path.join(__dirname, '..', 'index.ts');
    const impl = fs.readFileSync(implPath, 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*d46cdcd2f55a1f02/);
  });

  // 🔴 RED: restorTasks should transform input
  it('restorTasks processes task', () => {
    const item: Task = { id: '1', name: 'test' };
    const result = restorTasks(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

  // 🔴 RED: list should return correct data
  it('list returns task by id', () => {
    const result = list('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: renderA should transform input
  it('renderA processes task', () => {
    const item: Task = { id: '1', name: 'test' };
    const result = renderA(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

});
