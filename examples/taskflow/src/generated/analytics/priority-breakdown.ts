export interface Task {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'blocked' | 'cancelled';
}

export interface PriorityBreakdownItem {
  priority: string;
  count: number;
  percentage: number;
}

export interface StatusBreakdownItem {
  status: string;
  count: number;
  percentage: number;
}

export interface BreakdownReport {
  priorityBreakdown: PriorityBreakdownItem[];
  statusBreakdown: StatusBreakdownItem[];
  totalTasks: number;
}

export class PriorityBreakdown {
  private tasks: Task[] = [];

  addTask(task: Task): void {
    this.tasks.push(task);
  }

  addTasks(tasks: Task[]): void {
    this.tasks.push(...tasks);
  }

  removeTask(taskId: string): boolean {
    const initialLength = this.tasks.length;
    this.tasks = this.tasks.filter(task => task.id !== taskId);
    return this.tasks.length < initialLength;
  }

  updateTask(taskId: string, updates: Partial<Pick<Task, 'priority' | 'status'>>): boolean {
    const task = this.tasks.find(t => t.id === taskId);
    if (!task) return false;

    if (updates.priority) task.priority = updates.priority;
    if (updates.status) task.status = updates.status;
    return true;
  }

  clearTasks(): void {
    this.tasks = [];
  }

  generateReport(): BreakdownReport {
    const totalTasks = this.tasks.length;

    const priorityBreakdown = this.calculatePriorityBreakdown(totalTasks);
    const statusBreakdown = this.calculateStatusBreakdown(totalTasks);

    return {
      priorityBreakdown,
      statusBreakdown,
      totalTasks
    };
  }

  private calculatePriorityBreakdown(totalTasks: number): PriorityBreakdownItem[] {
    const priorityCounts = new Map<string, number>();
    const priorities = ['low', 'medium', 'high', 'critical'];

    // Initialize all priorities with 0
    priorities.forEach(priority => priorityCounts.set(priority, 0));

    // Count tasks by priority
    this.tasks.forEach(task => {
      const current = priorityCounts.get(task.priority) || 0;
      priorityCounts.set(task.priority, current + 1);
    });

    return priorities.map(priority => {
      const count = priorityCounts.get(priority) || 0;
      const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100 * 100) / 100 : 0;
      
      return {
        priority,
        count,
        percentage
      };
    });
  }

  private calculateStatusBreakdown(totalTasks: number): StatusBreakdownItem[] {
    const statusCounts = new Map<string, number>();
    const statuses = ['pending', 'in-progress', 'completed', 'blocked', 'cancelled'];

    // Initialize all statuses with 0
    statuses.forEach(status => statusCounts.set(status, 0));

    // Count tasks by status
    this.tasks.forEach(task => {
      const current = statusCounts.get(task.status) || 0;
      statusCounts.set(task.status, current + 1);
    });

    return statuses.map(status => {
      const count = statusCounts.get(status) || 0;
      const percentage = totalTasks > 0 ? Math.round((count / totalTasks) * 100 * 100) / 100 : 0;
      
      return {
        status,
        count,
        percentage
      };
    });
  }

  getTasks(): readonly Task[] {
    return [...this.tasks];
  }

  getTaskCount(): number {
    return this.tasks.length;
  }

  getTasksByPriority(priority: Task['priority']): Task[] {
    return this.tasks.filter(task => task.priority === priority);
  }

  getTasksByStatus(status: Task['status']): Task[] {
    return this.tasks.filter(task => task.status === status);
  }
}

export function createPriorityBreakdown(initialTasks: Task[] = []): PriorityBreakdown {
  const breakdown = new PriorityBreakdown();
  if (initialTasks.length > 0) {
    breakdown.addTasks(initialTasks);
  }
  return breakdown;
}

export function generateQuickReport(tasks: Task[]): BreakdownReport {
  const breakdown = createPriorityBreakdown(tasks);
  return breakdown.generateReport();
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '0e8c6fd7f3c15acb3e984fe7b4acac3476c2cb0abade85705720eaf362f1cca9',
  name: 'Priority Breakdown',
  risk_tier: 'low',
  canon_ids: [3 as const],
} as const;