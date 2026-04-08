import { viewTasks, queryTasks, archive } from '../index.js';

describe('viewTasks', () => {
  it('should be implemented', () => {
    expect(typeof viewTasks).toBe('function');
  });
});

describe('queryTasks', () => {
  it('should be implemented', () => {
    expect(typeof queryTasks).toBe('function');
  });
});

describe('archive', () => {
  it('should be implemented', () => {
    expect(typeof archive).toBe('function');
  });
});

