import { randomUUID } from 'node:crypto';

export type TaskStatus = 'open' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Task {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  assignee?: string;
  created_at: Date;
  updated_at: Date;
  completed_at?: Date;
  duration_ms?: number;
}

export interface CreateTaskInput {
  title: string;
  description: string;
  priority: TaskPriority;
  assignee?: string;
}

export interface TaskFilter {
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
}

const VALID_TRANSITIONS: Record<TaskStatus, TaskStatus[]> = {
  open: ['in_progress'],
  in_progress: ['review', 'open'],
  review: ['done', 'in_progress'],
  done: []
};

export class TaskLifecycleManager {
  private tasks = new Map<string, Task>();

  createTask(input: CreateTaskInput): Task {
    if (!input.title.trim()) {
      throw new Error('Task title cannot be empty');
    }
    if (!input.description.trim()) {
      throw new Error('Task description cannot be empty');
    }
    if (!this.isValidPriority(input.priority)) {
      throw new Error(`Invalid priority: ${input.priority}. Must be one of: low, medium, high, critical`);
    }

    const now = new Date();
    const task: Task = {
      id: randomUUID(),
      title: input.title.trim(),
      description: input.description.trim(),
      priority: input.priority,
      status: 'open',
      assignee: input.assignee?.trim(),
      created_at: now,
      updated_at: now
    };

    this.tasks.set(task.id, task);
    return { ...task };
  }

  getTask(id: string): Task | undefined {
    const task = this.tasks.get(id);
    return task ? { ...task } : undefined;
  }

  updateTaskStatus(id: string, newStatus: TaskStatus): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (!this.isValidStatusTransition(task.status, newStatus)) {
      throw new Error(`Invalid status transition from ${task.status} to ${newStatus}`);
    }

    const now = new Date();
    task.status = newStatus;
    task.updated_at = now;

    if (newStatus === 'done' && !task.completed_at) {
      task.completed_at = now;
      task.duration_ms = now.getTime() - task.created_at.getTime();
    }

    return { ...task };
  }

  updateTask(id: string, updates: Partial<Pick<Task, 'title' | 'description' | 'priority' | 'assignee'>>): Task {
    const task = this.tasks.get(id);
    if (!task) {
      throw new Error(`Task not found: ${id}`);
    }

    if (updates.title !== undefined) {
      if (!updates.title.trim()) {
        throw new Error('Task title cannot be empty');
      }
      task.title = updates.title.trim();
    }

    if (updates.description !== undefined) {
      if (!updates.description.trim()) {
        throw new Error('Task description cannot be empty');
      }
      task.description = updates.description.trim();
    }

    if (updates.priority !== undefined) {
      if (!this.isValidPriority(updates.priority)) {
        throw new Error(`Invalid priority: ${updates.priority}. Must be one of: low, medium, high, critical`);
      }
      task.priority = updates.priority;
    }

    if (updates.assignee !== undefined) {
      task.assignee = updates.assignee?.trim();
    }

    task.updated_at = new Date();
    return { ...task };
  }

  filterTasks(filter: TaskFilter): Task[] {
    const results: Task[] = [];
    
    for (const task of this.tasks.values()) {
      if (filter.status && task.status !== filter.status) {
        continue;
      }
      if (filter.priority && task.priority !== filter.priority) {
        continue;
      }
      if (filter.assignee && task.assignee !== filter.assignee) {
        continue;
      }
      results.push({ ...task });
    }

    return results;
  }

  getAllTasks(): Task[] {
    return Array.from(this.tasks.values()).map(task => ({ ...task }));
  }

  deleteTask(id: string): boolean {
    return this.tasks.delete(id);
  }

  private isValidPriority(priority: string): priority is TaskPriority {
    return ['low', 'medium', 'high', 'critical'].includes(priority);
  }

  private isValidStatusTransition(currentStatus: TaskStatus, newStatus: TaskStatus): boolean {
    return VALID_TRANSITIONS[currentStatus].includes(newStatus);
  }
}

export function createTaskLifecycleManager(): TaskLifecycleManager {
  return new TaskLifecycleManager();
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'ff644f70786609347751a6f701a6ea069ff8a8bb01eb48caa2a15a43b97ce081',
  name: 'Task Lifecycle',
  risk_tier: 'high',
  canon_ids: [8 as const],
} as const;