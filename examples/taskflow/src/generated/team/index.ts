/**
 * @phoenix-iu: 169b3c51a6e13ea8b494cd34f7ab734949573f0d68ed447b981fa276a306dddf
 * @phoenix-name: Team Domain
 * @phoenix-risk: LOW
 */
/**
 * @phoenix-canon: c384544cc22649f48f3a8a7d872f4a27a96933210dd8b83059732202ad41d2a1
 * Requirement: The system must calculate per-assignee completion rate as done divided by total assigned
 * 
 * @phoenix-canon: 21a8432fc76f29827f911a3f936b58245aff878ec7b933c5d72d0b448aafa2b9
 * Requirement: The system must identify the top performer with highest completion rate and minimum 3 tasks
 * 
 * @phoenix-canon: 7b890674e3dd62f5f8ce67daa3fbf08173ddfb23c8d6440645db9b01018fd0a5
 * Constraint: Unassigned tasks must be excluded from team performance metrics
 * 
 * Team Domain - Risk Tier: low
 */

import { getTeamMetrics, Task } from "../app/store.js";

export interface AssigneeMetrics {
  assignee: string;
  total: number;
  completed: number;
  rate: number;
}

export interface TopPerformer {
  assignee: string;
  rate: number;
  total: number;
}

/**
 * Get team performance metrics
 * @phoenix-canon: c384544cc22649f48f3a8a7d872f4a27a96933210dd8b83059732202ad41d2a1
 * @phoenix-canon: 7b890674e3dd62f5f8ce67daa3fbf08173ddfb23c8d6440645db9b01018fd0a5
 */
export function getTeamPerformance(): { perAssignee: Record<string, AssigneeMetrics>; topPerformer: TopPerformer | null } {
  const metrics = getTeamMetrics();
  
  const perAssignee: Record<string, AssigneeMetrics> = {};
  Object.entries(metrics.perAssignee).forEach(([assignee, m]) => {
    perAssignee[assignee] = {
      assignee,
      total: m.total,
      completed: m.completed,
      rate: m.rate
    };
  });
  
  const topPerformer = metrics.topPerformer ? {
    assignee: metrics.topPerformer.assignee,
    rate: metrics.topPerformer.rate,
    total: metrics.topPerformer.total
  } : null;
  
  return { perAssignee, topPerformer };
}

/**
 * Get the top performer
 * @phoenix-canon: 21a8432fc76f29827f911a3f936b58245aff878ec7b933c5d72d0b448aafa2b9
 */
export function getTopPerformer(): TopPerformer | null {
  const { topPerformer } = getTeamPerformance();
  return topPerformer;
}

/**
 * Get list of all assignees from tasks
 */
export function getAllAssignees(tasks: Task[]): string[] {
  const assignees = new Set<string>();
  tasks.forEach(t => {
    if (t.assignee) {
      assignees.add(t.assignee);
    }
  });
  return Array.from(assignees).sort();
}
