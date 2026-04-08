import { setDeadline, getOverdueTasks, setPriority, filterByPriority } from '../index.js';

describe('setDeadline', () => {
  it('should be implemented', () => {
    expect(typeof setDeadline).toBe('function');
  });
});

describe('getOverdueTasks', () => {
  it('should be implemented', () => {
    expect(typeof getOverdueTasks).toBe('function');
  });
});

describe('setPriority', () => {
  it('should be implemented', () => {
    expect(typeof setPriority).toBe('function');
  });
});

describe('filterByPriority', () => {
  it('should be implemented', () => {
    expect(typeof filterByPriority).toBe('function');
  });
});

