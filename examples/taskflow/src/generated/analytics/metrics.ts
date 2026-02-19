export interface TaskRecord {
  id: string;
  createdAt: Date;
  completedAt?: Date;
  dueDate?: Date;
  status: 'pending' | 'in-progress' | 'completed' | 'cancelled';
}

export interface MetricsSnapshot {
  totalTasksCreated: number;
  totalTasksCompleted: number;
  totalTasksOverdue: number;
  averageCompletionTimeHours: number;
  throughputTasksPerDay: number;
  calculatedAt: Date;
}

export class Metrics {
  private tasks: TaskRecord[] = [];

  constructor(tasks: TaskRecord[] = []) {
    this.tasks = [...tasks];
  }

  updateTasks(tasks: TaskRecord[]): void {
    this.tasks = [...tasks];
  }

  addTask(task: TaskRecord): void {
    this.tasks.push(task);
  }

  removeTask(taskId: string): void {
    this.tasks = this.tasks.filter(task => task.id !== taskId);
  }

  calculateMetrics(): MetricsSnapshot {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    const totalTasksCreated = this.tasks.length;
    
    const completedTasks = this.tasks.filter(task => task.status === 'completed' && task.completedAt);
    const totalTasksCompleted = completedTasks.length;

    const overdueTasks = this.tasks.filter(task => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
        return false;
      }
      return now > task.dueDate;
    });
    const totalTasksOverdue = overdueTasks.length;

    const averageCompletionTimeHours = this.calculateAverageCompletionTime(completedTasks);

    const throughputTasksPerDay = this.calculateThroughput(completedTasks, sevenDaysAgo, now);

    return {
      totalTasksCreated,
      totalTasksCompleted,
      totalTasksOverdue,
      averageCompletionTimeHours,
      throughputTasksPerDay,
      calculatedAt: now
    };
  }

  private calculateAverageCompletionTime(completedTasks: TaskRecord[]): number {
    if (completedTasks.length === 0) {
      return 0;
    }

    const totalCompletionTimeMs = completedTasks.reduce((sum, task) => {
      if (!task.completedAt) {
        return sum;
      }
      const completionTimeMs = task.completedAt.getTime() - task.createdAt.getTime();
      return sum + completionTimeMs;
    }, 0);

    const averageCompletionTimeMs = totalCompletionTimeMs / completedTasks.length;
    return averageCompletionTimeMs / (1000 * 60 * 60); // Convert to hours
  }

  private calculateThroughput(completedTasks: TaskRecord[], startDate: Date, endDate: Date): number {
    const tasksCompletedInWindow = completedTasks.filter(task => {
      if (!task.completedAt) {
        return false;
      }
      return task.completedAt >= startDate && task.completedAt <= endDate;
    });

    const windowDays = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    
    if (windowDays === 0) {
      return 0;
    }

    return tasksCompletedInWindow.length / windowDays;
  }

  getTotalTasksCreated(): number {
    return this.tasks.length;
  }

  getTotalTasksCompleted(): number {
    return this.tasks.filter(task => task.status === 'completed').length;
  }

  getTotalTasksOverdue(): number {
    const now = new Date();
    return this.tasks.filter(task => {
      if (!task.dueDate || task.status === 'completed' || task.status === 'cancelled') {
        return false;
      }
      return now > task.dueDate;
    }).length;
  }

  getAverageCompletionTimeHours(): number {
    const completedTasks = this.tasks.filter(task => task.status === 'completed' && task.completedAt);
    return this.calculateAverageCompletionTime(completedTasks);
  }

  getThroughputTasksPerDay(): number {
    const now = new Date();
    const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const completedTasks = this.tasks.filter(task => task.status === 'completed' && task.completedAt);
    return this.calculateThroughput(completedTasks, sevenDaysAgo, now);
  }
}

export function createMetrics(tasks: TaskRecord[] = []): Metrics {
  return new Metrics(tasks);
}

export function calculateMetricsFromTasks(tasks: TaskRecord[]): MetricsSnapshot {
  const metrics = new Metrics(tasks);
  return metrics.calculateMetrics();
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'c6a76ccf723cbaf85f990a1b7260b82c8063e5b48c1ef23fcbcc42161e235cbd',
  name: 'Metrics',
  risk_tier: 'high',
  canon_ids: [4 as const],
} as const;