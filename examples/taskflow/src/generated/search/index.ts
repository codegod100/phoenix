/**
 * @phoenix-iu: 5d746ac1128920d75ba29eea92baea4de98f5db5e30d13c28589bfefe5ca019f
 * @phoenix-name: Search Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: 49a95edd719e1d20d9ee59928f417b9a3753b0fa0d5789f0831714cc82b40d06
 * Requirement: Tasks must be searchable by title substring (case-insensitive)
 * 
 * @phoenix-canon: d87a8adb9feac0dda93fef7932e161d59275ce5886931b29101af1c100e0b057
 * Requirement: Tasks must be filterable by status, priority, assignee, and archived state
 * 
 * @phoenix-canon: d162133ca6cb92ab0fb842b24f0793460485e4762d59b748a613165343e7592f
 * Requirement: Search results must be sorted by priority (critical first) then by created_at
 * 
 * @phoenix-canon: fa9e6c9a18b3b575d8da78af91b7e601c92394e61d84aaf66e208bdca073f7ed
 * Constraint: An empty search query must return all tasks
 * 
 * Search Domain - Risk Tier: low
 */

import {
  Task,
  Priority,
  Status,
  searchTasks,
  filterTasks
} from "../app/store.js";

export type { Task, Priority, Status };

/**
 * Search tasks by query string
 * @phoenix-canon: 49a95edd719e1d20d9ee59928f417b9a3753b0fa0d5789f0831714cc82b40d06
 * @phoenix-canon: fa9e6c9a18b3b575d8da78af91b7e601c92394e61d84aaf66e208bdca073f7ed
 */
export async function searchTasksFn(query: string): Promise<Task[]> {
  return searchTasks(query);
}

/**
 * Search function (sync version)
 * @phoenix-canon: 49a95edd719e1d20d9ee59928f417b9a3753b0fa0d5789f0831714cc82b40d06
 * @phoenix-canon: fa9e6c9a18b3b575d8da78af91b7e601c92394e61d84aaf66e208bdca073f7ed
 */
export function search(query: string): Task[] {
  return searchTasks(query);
}

/**
 * Filter tasks by criteria
 * @phoenix-canon: d87a8adb9feac0dda93fef7932e161d59275ce5886931b29101af1c100e0b057
 * @phoenix-canon: d162133ca6cb92ab0fb842b24f0793460485e4762d59b748a613165343e7592f
 */
export async function filterTasksFn(options: {
  status?: Status;
  priority?: Priority;
  assignee?: string;
  archived?: boolean;
}): Promise<Task[]> {
  return filterTasks(options);
}

/**
 * Filter by status (sync version)
 * @phoenix-canon: d87a8adb9feac0dda93fef7932e161d59275ce5886931b29101af1c100e0b057
 * @phoenix-canon: d162133ca6cb92ab0fb842b24f0793460485e4762d59b748a613165343e7592f
 */
export function filterByStatus(status: Status): Task[] {
  return filterTasks({ status, archived: false });
}
