/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-generated: 2026-04-08T20:13:28.060Z
 * 
 * Data store that uses IU implementations
 */

import { process } from './metrics/index.js';
import { setPriority, filterByPriority, setStatus } from './priority/index.js';
import { assignTask, unassignTask, getUnassignedTasks } from './team/index.js';
import { setPriority, filterByPriority, getCompletedTasks } from './task/index.js';
import { assignTask, unassignTask, getUnassignedTasks } from './assignment/index.js';
import { isTasks, getTaskss, searchTasks } from './search/index.js';
import { setDeadline, getOverdueTasks, list } from './deadline/index.js';
import { setStatus, filterByStatus } from './status/index.js';
import { isTasks, getTaskss, getArchivedTasks } from './archive/index.js';
import { process } from './page/index.js';
import { setPriority, filterByPriority, setStatus } from './catppuccin/index.js';
import { process } from './base/index.js';
import { bulk, a } from './bulk/index.js';
import { deleteTask } from './delete/index.js';
import { process } from './confirmation/index.js';
import { setDeadline, getOverdueTasks, setPriority } from './create/index.js';
import { process } from './inline/index.js';
import { editTask, assignTask, unassignTask } from './edit/index.js';
import { process } from './component/index.js';
import { setStatus, filterByStatus } from './event/index.js';
import { getArchivedTasks } from './state/index.js';
import { getArchivedTasks, setStatus, filterByStatus } from './ui/index.js';
import { process } from './integration/index.js';
import { getOverdueTasks } from './overdue/index.js';
import { process } from './data/index.js';

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
  const task = updateTask(id, { status: 'archived' });
  
  // Call IU implementation
  if (task && typeof archiveTask === 'function') {
    archiveTask({ id, name: task.title });
  }
  return task;
}

export function restoreTask(id: string): Task | undefined {
  return updateTask(id, { status: 'open' });
}
