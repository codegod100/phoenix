/**
 * @phoenix-iu: 2ff32cc95412bbebb3de93d8ad7403ec968c3cc1ecc1dfb6ec9ebd609fb3a9e7
 * @phoenix-name: Overdue Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: a38b112678258c10202350b56dfe5e273be02155bb2fd91e93b5dbf8c3f02668
 * Requirement: Overdue tasks must have a red border and an OVERDUE indicator
 * 
 * Overdue Domain - Risk Tier: low
 */

import { Task, getOverdueTasks } from "../app/store.js";

export type { Task };

/**
 * Get overdue indicator styles
 * @phoenix-canon: a38b112678258c10202350b56dfe5e273be02155bb2fd91e93b5dbf8c3f02668
 */
export function getOverdueStyles(): string {
  return `
    .task-overdue {
      border: 2px solid var(--ctp-red) !important;
    }
    .overdue-indicator {
      background: var(--ctp-red);
      color: var(--ctp-crust);
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
  `;
}

/**
 * Check if a task is overdue
 */
export function isTaskOverdue(task: Task): boolean {
  if (task.status === "done" || !task.deadline) return false;
  const now = new Date().toISOString();
  return new Date(task.deadline) < new Date(now);
}

/**
 * Get all overdue tasks
 */
export function getOverdue(): Task[] {
  return getOverdueTasks();
}
