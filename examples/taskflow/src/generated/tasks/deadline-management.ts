export interface TaskDeadline {
  taskId: string;
  deadline: Date;
  isOverdue: boolean;
  daysOverdue: number;
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  deadline?: Date;
  completed: boolean;
  createdAt: Date;
  completedAt?: Date;
}

export interface DeadlineWarning {
  message: string;
  taskId: string;
  deadline: Date;
  severity: 'warning';
}

export class DeadlineManager {
  private tasks = new Map<string, Task>();
  private warnings: DeadlineWarning[] = [];

  addTask(task: Task): void {
    if (task.deadline && this.isDateInPast(task.deadline)) {
      const warning: DeadlineWarning = {
        message: `Task "${task.title}" has a deadline in the past: ${task.deadline.toISOString()}`,
        taskId: task.id,
        deadline: task.deadline,
        severity: 'warning'
      };
      this.warnings.push(warning);
    }
    
    this.tasks.set(task.id, { ...task });
  }

  updateTask(taskId: string, updates: Partial<Task>): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const updatedTask = { ...task, ...updates };

    if (updates.deadline && this.isDateInPast(updates.deadline)) {
      const warning: DeadlineWarning = {
        message: `Task "${updatedTask.title}" has a deadline in the past: ${updates.deadline.toISOString()}`,
        taskId: taskId,
        deadline: updates.deadline,
        severity: 'warning'
      };
      this.warnings.push(warning);
    }

    this.tasks.set(taskId, updatedTask);
  }

  setDeadline(taskId: string, deadline: Date): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    if (this.isDateInPast(deadline)) {
      const warning: DeadlineWarning = {
        message: `Task "${task.title}" has a deadline in the past: ${deadline.toISOString()}`,
        taskId: taskId,
        deadline: deadline,
        severity: 'warning'
      };
      this.warnings.push(warning);
    }

    this.tasks.set(taskId, { ...task, deadline });
  }

  removeDeadline(taskId: string): void {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new Error(`Task with id ${taskId} not found`);
    }

    const updatedTask = { ...task };
    delete updatedTask.deadline;
    this.tasks.set(taskId, updatedTask);
  }

  getOverdueTasks(): TaskDeadline[] {
    const now = new Date();
    const overdueTasks: TaskDeadline[] = [];

    for (const task of this.tasks.values()) {
      if (task.deadline && !task.completed && task.deadline < now) {
        const daysOverdue = Math.ceil((now.getTime() - task.deadline.getTime()) / (1000 * 60 * 60 * 24));
        
        overdueTasks.push({
          taskId: task.id,
          deadline: task.deadline,
          isOverdue: true,
          daysOverdue
        });
      }
    }

    return overdueTasks.sort((a, b) => b.daysOverdue - a.daysOverdue);
  }

  getTasksWithDeadlines(): TaskDeadline[] {
    const now = new Date();
    const tasksWithDeadlines: TaskDeadline[] = [];

    for (const task of this.tasks.values()) {
      if (task.deadline) {
        const isOverdue = !task.completed && task.deadline < now;
        const daysOverdue = isOverdue 
          ? Math.ceil((now.getTime() - task.deadline.getTime()) / (1000 * 60 * 60 * 24))
          : 0;

        tasksWithDeadlines.push({
          taskId: task.id,
          deadline: task.deadline,
          isOverdue,
          daysOverdue
        });
      }
    }

    return tasksWithDeadlines.sort((a, b) => a.deadline.getTime() - b.deadline.getTime());
  }

  getTask(taskId: string): Task | undefined {
    return this.tasks.get(taskId);
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values());
  }

  getWarnings(): DeadlineWarning[] {
    return [...this.warnings];
  }

  clearWarnings(): void {
    this.warnings = [];
  }

  isTaskOverdue(taskId: string): boolean {
    const task = this.tasks.get(taskId);
    if (!task || !task.deadline || task.completed) {
      return false;
    }

    return task.deadline < new Date();
  }

  private isDateInPast(date: Date): boolean {
    const now = new Date();
    return date < now;
  }
}

export function createDeadlineManager(): DeadlineManager {
  return new DeadlineManager();
}

export function isOverdue(deadline: Date, completed: boolean): boolean {
  if (completed) {
    return false;
  }
  return deadline < new Date();
}

export function calculateDaysOverdue(deadline: Date): number {
  const now = new Date();
  if (deadline >= now) {
    return 0;
  }
  return Math.ceil((now.getTime() - deadline.getTime()) / (1000 * 60 * 60 * 24));
}

export function formatDeadlineStatus(deadline: Date, completed: boolean): string {
  if (completed) {
    return 'Completed';
  }

  const now = new Date();
  if (deadline < now) {
    const daysOverdue = calculateDaysOverdue(deadline);
    return `Overdue by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`;
  }

  const daysUntil = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  if (daysUntil === 0) {
    return 'Due today';
  } else if (daysUntil === 1) {
    return 'Due tomorrow';
  } else {
    return `Due in ${daysUntil} days`;
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '8e0191994ba2a364acf2753ba76a9c63e725dd7b9a4993792ccf1d62806eb460',
  name: 'Deadline Management',
  risk_tier: 'high',
  canon_ids: [4 as const],
} as const;