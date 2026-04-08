// 🔴 RED: Tests designed to FAIL — fix implementation to pass
// Team Domain (IU-169b3c51)
// Risk Tier: LOW

// @phoenix-iu: 169b3c51a6e13ea8b494cd34f7ab734949573f0d68ed447b981fa276a306dddf
// @phoenix-name: Team Domain
// @phoenix-risk: low
// @phoenix-short: IU-169b3c51

// TDD CYCLE:
// 1. npm test -- iu-169b3c51
// 2. 🔴 See RED (tests fail)
// 3. Fix ../index.ts implementations
// 4. 🟢 See GREEN (tests pass)

import { describe, it, expect } from 'vitest';
import { assignTask, unassignTask, getUnassignedTasks } from '../index.js';

describe('Team Domain', () => {
  // 🟢 GREEN: Traceability (always passes)
  it('has phoenix traceability comments', () => {
    // Read the impl file and check for @phoenix-iu comment
    const fs = require('fs');
    const path = require('path');
    const implPath = path.join(__dirname, '..', 'index.ts');
    const impl = fs.readFileSync(implPath, 'utf-8');
    expect(impl).toMatch(/@phoenix-iu:.*169b3c51a6e13ea8/);
  });

  // 🔴 RED: assignTask should transform input
  it('assignTask processes team', () => {
    const item: Team = { id: '1', name: 'test' };
    const result = assignTask(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

  // 🔴 RED: unassignTask should transform input
  it('unassignTask processes team', () => {
    const item: Team = { id: '1', name: 'test' };
    const result = unassignTask(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

  // 🔴 RED: getUnassignedTasks should return correct data
  it('getUnassignedTasks returns team by id', () => {
    const result = getUnassignedTasks('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

});
