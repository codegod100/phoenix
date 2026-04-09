/**
 * @phoenix-iu: 12c44af604f1ae2de162c4c6b280539f2c133255d96ed18e32bfbe535eb87fec
 * @phoenix-name: Delete Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: 0ca3fa4b087995c9e4aa1cccfe1d8a53c88e4e1d5f2cd42bcabf805cc16050bb
 * Requirement: Users must be able to delete tasks by their unique ID
 * 
 * @phoenix-canon: 4c4897891d89254e0afba437fd21549f7f782e3bf8c70026a341e26faa976d46
 * Requirement: Each task card must have a delete button that opens a confirmation modal, not browser alert
 * 
 * @phoenix-canon: c37ac43e5c7fbb2f71ed9cf3f121411ebe752a7fd5032b2de2d099056c7c01d0
 * Requirement: The delete button must use the danger color red and include a trash icon
 * 
 * @phoenix-canon: d612bbc65b30fddc3fcf82f2e88429442c975b2c04c6688f77f810fda7710cb9
 * Requirement: Deleted tasks must be removed from all filtered views and search results
 * 
 * Delete Domain - Risk Tier: low
 */

import { deleteTask, Task } from "../app/store.js";

export type { Task };

/**
 * Delete a task by ID
 * @phoenix-canon: 0ca3fa4b087995c9e4aa1cccfe1d8a53c88e4e1d5f2cd42bcabf805cc16050bb
 * @phoenix-canon: d612bbc65b30fddc3fcf82f2e88429442c975b2c04c6688f77f810fda7710cb9
 */
export function deleteTaskById(taskId: string): boolean {
  return deleteTask(taskId);
}

/**
 * Alias for deleteTaskById
 */
export function deleteFn(taskId: string): boolean {
  return deleteTask(taskId);
}

/**
 * Get delete confirmation text
 * @phoenix-canon: 4c4897891d89254e0afba437fd21549f7f782e3bf8c70026a341e26faa976d46
 */
export function getDeleteConfirmation(task: Task): { title: string; message: string } {
  return {
    title: "Delete Task",
    message: `Are you sure you want to delete "${task.title}"? This action cannot be undone.`
  };
}

/**
 * Get delete button configuration
 * @phoenix-canon: c37ac43e5c7fbb2f71ed9cf3f121411ebe752a7fd5032b2de2d099056c7c01d0
 */
export function getDeleteButtonConfig(): { icon: string; cssClass: string; ariaLabel: string } {
  return {
    icon: "🗑️",
    cssClass: "btn-danger btn-sm",
    ariaLabel: "Delete task"
  };
}
