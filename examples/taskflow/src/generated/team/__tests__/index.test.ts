import { assignTask, unassignTask, getUnassignedTasks } from '../index.js';

describe('assignTask', () => {
  it('should be implemented', () => {
    expect(typeof assignTask).toBe('function');
  });
});

describe('unassignTask', () => {
  it('should be implemented', () => {
    expect(typeof unassignTask).toBe('function');
  });
});

describe('getUnassignedTasks', () => {
  it('should be implemented', () => {
    expect(typeof getUnassignedTasks).toBe('function');
  });
});

