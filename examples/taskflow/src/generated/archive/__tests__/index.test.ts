import { isTasks, getTaskss, getArchivedTasks, setStatus, filterByStatus, archiveTask, getCompletedTasks } from '../index.js';

describe('isTasks', () => {
  it('should be implemented', () => {
    expect(typeof isTasks).toBe('function');
  });
});

describe('getTaskss', () => {
  it('should be implemented', () => {
    expect(typeof getTaskss).toBe('function');
  });
});

describe('getArchivedTasks', () => {
  it('should be implemented', () => {
    expect(typeof getArchivedTasks).toBe('function');
  });
});

describe('setStatus', () => {
  it('should be implemented', () => {
    expect(typeof setStatus).toBe('function');
  });
});

describe('filterByStatus', () => {
  it('should be implemented', () => {
    expect(typeof filterByStatus).toBe('function');
  });
});

describe('archiveTask', () => {
  it('should be implemented', () => {
    expect(typeof archiveTask).toBe('function');
  });
});

describe('getCompletedTasks', () => {
  it('should be implemented', () => {
    expect(typeof getCompletedTasks).toBe('function');
  });
});

