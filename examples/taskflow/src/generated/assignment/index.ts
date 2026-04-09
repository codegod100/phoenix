/**
 * @phoenix-iu: 013287c893c1bba6be09bfff5263b29ac7909c11fd7fa3bff7780919f8570026
 * @phoenix-name: Assignment Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: 5e0a0179854a33ec4fc1e3b2dac67644aab962c45b04e8d642744e8039198eae
 * Requirement: Tasks must be assignable to a single user by user ID
 * 
 * @phoenix-canon: f8cbfa7d6c882d94d5a8712676ec777f819b769367cd566f73bc90cc47cc37c9
 * Requirement: Reassigning a task must log the previous assignee in an audit trail
 * 
 * @phoenix-canon: 3d832f261b6d440d8d061952b4ef0cf49d98841a5386e7210783575a5ec130cb
 * Requirement: Unassigned tasks must be queryable as a filtered list
 * 
 * @phoenix-canon: b604c9dae64a2a90e08f32822b2c37e1cc5728ceb8a99be9206e20c6742ec3a4
 * Constraint: Assignment must validate that the user ID is non-empty
 * 
 * Assignment Domain - Risk Tier: low
 */

import {
  Task,
  assignTask,
  getUnassignedTasks,
  getAllTasks,
  bulkAssign
} from "../app/store.js";

/**
 * Assign a task to a user
 * @phoenix-canon: 5e0a0179854a33ec4fc1e3b2dac67644aab962c45b04e8d642744e8039198eae
 * @phoenix-canon: f8cbfa7d6c882d94d5a8712676ec777f819b769367cd566f73bc90cc47cc37c9
 * @phoenix-canon: b604c9dae64a2a90e08f32822b2c37e1cc5728ceb8a99be9206e20c6742ec3a4
 */
export async function assignTasks(taskId: string, userId: string): Promise<Task> {
  return assignTask(taskId, userId);
}

/**
 * Query unassigned tasks
 * @phoenix-canon: 3d832f261b6d440d8d061952b4ef0cf49d98841a5386e7210783575a5ec130cb
 */
export async function queryTasks(): Promise<Task[]> {
  return getUnassignedTasks();
}

/**
 * Bulk assign multiple tasks to a user
 */
export function bulkAssignTasks(taskIds: string[], userId: string): number {
  return bulkAssign(taskIds, userId);
}

/**
 * Get all assignees from tasks
 */
export function getAssignees(): string[] {
  const tasks = getAllTasks();
  const assignees = new Set<string>();
  tasks.forEach(t => {
    if (t.assignee) {
      assignees.add(t.assignee);
    }
  });
  return Array.from(assignees).sort();
}
