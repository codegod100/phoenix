// Generated: Analytics Engine (IU-a1b2c3d4e5f6789012345678abcdef9012345678)
// Description: Metrics calculation and reporting functions

import type { Task } from './task-model.js';

export interface Metrics {
  total: number;
  completed: number;
  overdue: number;
  completionRate: number; // percentage
  avgCompletionTime: number; // hours
  throughput: number; // tasks per day over 7 days
}

export interface PriorityBreakdown {
  priority: string;
  count: number;
  percentage: number;
}

export interface StatusBreakdown {
  status: string;
  count: number;
  percentage: number;
}

export interface TeamPerformance {
  assignee: string;
  total: number;
  completed: number;
  completionRate: number;
}

export function calculateMetrics(tasks: Task[]): Metrics {
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  const completed = tasks.filter((t) => t.status === 'done');
  const overdue = tasks.filter((t) => {
    if (!t.deadline || t.status === 'done') return false;
    return now > t.deadline;
  });

  const avgTime =
    completed.length > 0
      ? completed.reduce((sum, t) => sum + (t.duration || 0), 0) /
        completed.length
      : 0;

  const recentCompleted = completed.filter(
    (t) => t.completedAt && t.completedAt >= sevenDaysAgo
  );
  const throughput = recentCompleted.length / 7;

  return {
    total: tasks.length,
    completed: completed.length,
    overdue: overdue.length,
    completionRate:
      tasks.length > 0 ? Math.round((completed.length / tasks.length) * 100) : 0,
    avgCompletionTime: Math.round(avgTime * 10) / 10,
    throughput: Math.round(throughput * 10) / 10,
  };
}

export function getPriorityBreakdown(tasks: Task[]): PriorityBreakdown[] {
  const counts = new Map<string, number>();
  tasks.forEach((t) => {
    counts.set(t.priority, (counts.get(t.priority) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([priority, count]) => ({
    priority,
    count,
    percentage:
      tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0,
  }));
}

export function getStatusBreakdown(tasks: Task[]): StatusBreakdown[] {
  const counts = new Map<string, number>();
  tasks.forEach((t) => {
    counts.set(t.status, (counts.get(t.status) || 0) + 1);
  });

  return Array.from(counts.entries()).map(([status, count]) => ({
    status,
    count,
    percentage:
      tasks.length > 0 ? Math.round((count / tasks.length) * 100) : 0,
  }));
}

export function getTeamPerformance(tasks: Task[]): TeamPerformance[] {
  const assigneeStats = new Map<
    string,
    { total: number; completed: number }
  >();

  tasks.forEach((t) => {
    if (!t.assignee) return; // Exclude unassigned
    const stats = assigneeStats.get(t.assignee) || { total: 0, completed: 0 };
    stats.total++;
    if (t.status === 'done') stats.completed++;
    assigneeStats.set(t.assignee, stats);
  });

  return Array.from(assigneeStats.entries()).map(([assignee, stats]) => ({
    assignee,
    total: stats.total,
    completed: stats.completed,
    completionRate:
      stats.total > 0
        ? Math.round((stats.completed / stats.total) * 100)
        : 0,
  }));
}

export function getTopPerformer(
  tasks: Task[]
): { assignee: string; completionRate: number } | null {
  const performance = getTeamPerformance(tasks);
  const eligible = performance.filter((p) => p.total >= 3);

  if (eligible.length === 0) return null;

  const top = eligible.reduce((best, current) =>
    current.completionRate > best.completionRate ? current : best
  );

  return { assignee: top.assignee, completionRate: top.completionRate };
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'a1b2c3d4e5f6789012345678abcdef9012345678',
  name: 'Analytics Engine',
  risk_tier: 'medium',
} as const;
