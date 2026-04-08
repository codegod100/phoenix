/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-generated: 2026-04-08T20:58:38.056Z
 */



export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'review' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

const tasks = new Map<string, Task>();

export function getAllTasks(): Task[] {
  return Array.from(tasks.values()).filter(t => t.status !== 'archived');
}

export function getArchivedTasks(): Task[] {
  return Array.from(tasks.values()).filter(t => t.status === 'archived');
}

export function getTaskById(id: string): Task | undefined {
  return tasks.get(id);
}

export function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    ...data,
    status: data.status || 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): Task | undefined {
  const existing = tasks.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  return updated;
}

export function archiveTask(id: string): Task | undefined {
  return updateTask(id, { status: 'archived' });
}

export function restoreTask(id: string): Task | undefined {
  return updateTask(id, { status: 'open' });
}
