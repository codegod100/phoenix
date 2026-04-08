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
import { setPriority, filterByPriority, getCompletedTasks, setStatus, filterByStatus, archiveTask, getArchivedTasks, list, addTags, removeTags } from '../index.js';

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

  // 🔴 RED: setPriority should transform input
  it('setPriority processes task', () => {
    const item: Task = { id: '1', name: 'test' };
    const result = setPriority(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

  // 🔴 RED: filterByPriority should return correct data
  it('filterByPriority returns task by id', () => {
    const result = filterByPriority('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: getCompletedTasks should return correct data
  it('getCompletedTasks returns task by id', () => {
    const result = getCompletedTasks('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: setStatus should transform input
  it('setStatus processes task', () => {
    const item: Task = { id: '1', name: 'test' };
    const result = setStatus(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

  // 🔴 RED: filterByStatus should return correct data
  it('filterByStatus returns task by id', () => {
    const result = filterByStatus('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: archiveTask should transform input
  it('archiveTask processes task', () => {
    const item: Task = { id: '1', name: 'test' };
    const result = archiveTask(item);
    expect(result).not.toBe(item); // 🔴 Currently returns same object
  });

  // 🔴 RED: getArchivedTasks should return correct data
  it('getArchivedTasks returns task by id', () => {
    const result = getArchivedTasks('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: list should return correct data
  it('list returns task by id', () => {
    const result = list('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: addTags should return correct data
  it('addTags returns task by id', () => {
    const result = addTags('test-id');
    expect(result).not.toBeNull();
    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'
  });

  // 🔴 RED: removeTags should delete and return success
  it('removeTags deletes task', () => {
    expect(removeTags('test-id')).toBe(true); // 🔴 Currently returns false
  });

});
