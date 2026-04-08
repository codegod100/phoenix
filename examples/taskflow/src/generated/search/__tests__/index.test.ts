import { searchTasks, search, filterTasks, filterByStatus } from '../index.js';

describe('searchTasks', () => {
  it('should be implemented', () => {
    expect(typeof searchTasks).toBe('function');
  });
});

describe('search', () => {
  it('should be implemented', () => {
    expect(typeof search).toBe('function');
  });
});

describe('filterTasks', () => {
  it('should be implemented', () => {
    expect(typeof filterTasks).toBe('function');
  });
});

describe('filterByStatus', () => {
  it('should be implemented', () => {
    expect(typeof filterByStatus).toBe('function');
  });
});

