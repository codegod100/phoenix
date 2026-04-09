/**
 * @phoenix-iu: f5ffe871e50a8aa8f46509df8c4b2f3b68d72df61e1504d5df80b11ffd792676
 * @phoenix-name: Data Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 900da6bbb6abdd66d83efe4b9162e74c6bcc540811e4639a2908fe1199a1b02b
 * Requirement: Tasks must persist in browser localStorage and survive page refreshes
 * 
 * @phoenix-canon: b5ce30f01710bee3d6e9ad93784345656aff05b0ebab96700d6921b59b7ec00d
 * Requirement: The dashboard must immediately display all tasks from localStorage on page load
 * 
 * Data Domain - Risk Tier: high
 */

export {
  // Re-export all data functions from store
  getAllTasks,
  getTaskById,
  createTask,
  updateTask,
  deleteTask,
  archiveTask,
  restoreTask,
  getArchivedTasks,
  getOverdueTasks,
  searchTasks,
  filterTasks,
  assignTask,
  getMetrics,
  getTeamMetrics,
  bulkDelete,
  bulkArchive,
  bulkRestore,
  bulkAssign,
  setDeadline,
  seedData,
  type Task,
  type Priority,
  type Status,
  type Metrics,
  type TeamMetrics
} from "../app/store.js";
