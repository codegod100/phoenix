/**
 * @phoenix-iu: a2326ea173747bc5745173ec09c3b70161ad8e3cd51f24d72b50498419fb2ec5
 * @phoenix-name: Component Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 93e388ff1c8a76fad9445f075c3fd9ea8efe04e9dd6e8cc9ef56a022a742312f
 * Requirement: The dashboard shall compose the page theme, task list, edit form, archive tabs, bulk selection, and analytics bar
 * 
 * @phoenix-canon: f20e473ea2499d65651a44132b03b7140287261031f24406c651baf7d13830d3
 * Requirement: The analytics bar shall display inline on the same line as the page title in the header
 * 
 * @phoenix-canon: 3b3b6ce2da6dcd2ad6576b630478b6e2bf372a5f9a5b8cc20224289d6822fe05
 * Requirement: The create form shall append new tasks to localStorage and trigger task grid re-render
 * 
 * @phoenix-canon: 72c4a2c45dc1edcf82869093e34ec8b75a8b643e78819281ccbfe9bce9ff5a68
 * Requirement: The task grid shall display tasks from localStorage and pass click events to edit handlers
 * 
 * @phoenix-canon: a731f6b43208397eaad60a9312cf10acd760afc578f3181cc364ed27e6235ae8
 * Requirement: The inline edit form shall update localStorage and trigger task grid re-render on save
 * 
 * @phoenix-canon: a9bd9ecc8c5b5ccb2fa9e778f7d9262a084ffe9c4c91ab2821685de30589e9c4
 * Requirement: The archive tabs shall filter task grid display without page reload
 * 
 * @phoenix-canon: 8a0f621ecff296896c4fd634e42ebbfa60aef208bbc6e178861c152c74e7b638
 * Requirement: The bulk selection shall update task grid checkbox states and show or hide bulk action bar
 * 
 * @phoenix-canon: 09a6c7528b6310dba374140c53e37d97645c71ad77fa3b9d35be7b3bad5a6f9b
 * Requirement: The analytics bar shall recalculate on every localStorage change
 * 
 * Component Domain - Risk Tier: high
 */

import { Task, getAllTasks, getMetrics } from "../app/store.js";

export type { Task };

export interface ComponentState {
  tasks: Task[];
  metrics: ReturnType<typeof getMetrics>;
  currentTab: "active" | "archived";
  selectedIds: string[];
  editingId: string | null;
}

/**
 * Get initial component state
 * @phoenix-canon: 93e388ff1c8a76fad9445f075c3fd9ea8efe04e9dd6e8cc9ef56a022a742312f
 * @phoenix-canon: 1195e2f9dc63ac5d4c567883d7d1f72eee36c83e62f22b6021c6ee86282a11a0
 */
export function getInitialState(): ComponentState {
  return {
    tasks: getAllTasks(),
    metrics: getMetrics(),
    currentTab: "active",
    selectedIds: [],
    editingId: null
  };
}

/**
 * Refresh component state from localStorage
 * @phoenix-canon: 4a49ae7c4ceb6b5a1ebfdf188d51adfeba7b84eb3ee76a711cde2ce0dc75d236
 * @phoenix-canon: 09a6c7528b6310dba374140c53e37d97645c71ad77fa3b9d35be7b3bad5a6f9b
 */
export function refreshState(currentTab: "active" | "archived" = "active", selectedIds: string[] = []): ComponentState {
  const tasks = getAllTasks();
  return {
    tasks,
    metrics: getMetrics(),
    currentTab,
    selectedIds,
    editingId: null
  };
}

/**
 * Get filtered tasks based on current tab
 * @phoenix-canon: a9bd9ecc8c5b5ccb2fa9e778f7d9262a084ffe9c4c91ab2821685de30589e9c4
 */
export function getFilteredTasks(state: ComponentState): { active: Task[]; done: Task[]; archived: Task[] } {
  return {
    active: state.tasks.filter(t => !t.archived && t.status !== "done"),
    done: state.tasks.filter(t => !t.archived && t.status === "done"),
    archived: state.tasks.filter(t => t.archived)
  };
}
