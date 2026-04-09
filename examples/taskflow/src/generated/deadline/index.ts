/**
 * @phoenix-iu: fa4e979e652ff75351003d30304eb1f655f37613ccc7d9fd13bc1207b8cab44e
 * @phoenix-name: Deadline Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: 45db43506cd234df7050a25eea309f75993465e219e87839cd80dc869890eb94
 * Requirement: Tasks must support optional deadline dates
 * 
 * @phoenix-canon: 3306386ed3c6c0b59327576f0716cd23c6e93bd3e55fb6f09663c52461605f8c
 * Requirement: Overdue tasks (past deadline and not done) must be flagged automatically
 * 
 * @phoenix-canon: 23a499c17f6d8b814a18fd6b60bbc6b6dfd2a605cb51560d9bcfb4911b81015b
 * Requirement: The system must provide a function to list all overdue tasks
 * 
 * @phoenix-canon: b085dd428dc562f0fdb71ecda7f25218ec4d5b7955379f724372f57f184a9d91
 * Constraint: Setting a deadline in the past must produce a warning but still be allowed
 * 
 * Deadline Domain - Risk Tier: low
 */

import {
  Task,
  getOverdueTasks,
  setDeadline,
  getAllTasks
} from "../app/store.js";

/**
 * List all overdue tasks
 * @phoenix-canon: 23a499c17f6d8b814a18fd6b60bbc6b6dfd2a605cb51560d9bcfb4911b81015b
 * @phoenix-canon: 3306386ed3c6c0b59327576f0716cd23c6e93bd3e55fb6f09663c52461605f8c
 */
export function list(): Task[] {
  return getOverdueTasks();
}

/**
 * List with metadata
 */
export function a(): { tasks: Task[]; count: number } {
  const tasks = getOverdueTasks();
  return { tasks, count: tasks.length };
}

/**
 * Set a task deadline
 * @phoenix-canon: 45db43506cd234df7050a25eea309f75993465e219e87839cd80dc869890eb94
 * @phoenix-canon: b085dd428dc562f0fdb71ecda7f25218ec4d5b7955379f724372f57f184a9d91
 */
export function setTaskDeadline(taskId: string, deadline: string): { task: Task; warning?: string } {
  return setDeadline(taskId, deadline);
}

/**
 * Check if a task is overdue
 * @phoenix-canon: 3306386ed3c6c0b59327576f0716cd23c6e93bd3e55fb6f09663c52461605f8c
 */
export function isOverdue(task: Task): boolean {
  if (task.status === "done" || !task.deadline) return false;
  const now = new Date().toISOString();
  return new Date(task.deadline) < new Date(now);
}

/**
 * Format deadline for display
 */
export function formatDeadline(deadline: string | undefined): string {
  if (!deadline) return "";
  const date = new Date(deadline);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
}

/**
 * Get deadline status indicator
 */
export function getDeadlineStatus(task: Task): "overdue" | "today" | "upcoming" | "none" {
  if (!task.deadline) return "none";
  
  const now = new Date();
  const deadlineDate = new Date(task.deadline);
  
  if (task.status === "done") return "none";
  
  if (deadlineDate < now) return "overdue";
  
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const deadlineDay = new Date(deadlineDate.getFullYear(), deadlineDate.getMonth(), deadlineDate.getDate());
  
  if (deadlineDay.getTime() === today.getTime()) return "today";
  
  return "upcoming";
}
