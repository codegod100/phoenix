/**
 * TaskFlow Data Store
 * 
 * Integrates all Phoenix domains into a unified task management API
 */

import { process as processTask } from '../task/index.js';
import { selectedids } from '../ui/index.js';
import { delete_ } from '../delete/index.js';
import { create } from '../create/index.js';
import { edit } from '../edit/index.js';

// Full Task interface with all domain fields
export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'review' | 'done' | 'archived';
  assignee?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  tags: string[];
}

// In-memory store (replace with DB in production)
const tasks: Map<string, Task> = new Map();

// Seed with sample data
const sampleTasks: Task[] = [
  {
    id: '1',
    title: 'Design system architecture',
    description: 'Create domain models and service boundaries',
    priority: 'high',
    status: 'in_progress',
    assignee: 'alice',
    createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
    tags: ['architecture', 'design'],
  },
  {
    id: '2',
    title: 'Implement catppuccin theme',
    description: 'Add color palette and CSS variables to dashboard',
    priority: 'medium',
    status: 'done',
    assignee: 'bob',
    createdAt: new Date(Date.now() - 86400000 * 5).toISOString(),
    updatedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    completedAt: new Date(Date.now() - 86400000 * 2).toISOString(),
    tags: ['ui', 'css'],
  },
  {
    id: '3',
    title: 'Write comprehensive tests',
    description: 'Unit tests for all 25 Phoenix domains',
    priority: 'critical',
    status: 'open',
    assignee: 'charlie',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ['testing', 'phoenix'],
  },
];

sampleTasks.forEach(t => tasks.set(t.id, t));

// ======== CRUD OPERATIONS ========

export function getAllTasks(): Task[] {
  return Array.from(tasks.values()).filter(t => t.status !== 'archived');
}

export function getTaskById(id: string): Task | undefined {
  return tasks.get(id);
}

export function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  // Use Create domain
  const created = create(data.title) || { id: crypto.randomUUID(), name: data.title };
  
  const task: Task = {
    id: created.id,
    title: data.title,
    description: data.description || '',
    priority: data.priority || 'medium',
    status: 'open',
    assignee: data.assignee,
    deadline: data.deadline,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: data.tags || [],
  };
  
  // Process through Task domain
  const processed = processTask({ id: task.id, name: task.title }) as unknown as Task;
  
  tasks.set(task.id, { ...task, ...processed });
  return tasks.get(task.id)!;
}

export function updateTask(id: string, updates: Partial<Task>): Task | undefined {
  const existing = tasks.get(id);
  if (!existing) return undefined;
  
  // Use Edit domain
  const edited = edit({ id, name: existing.title, ...updates } as any);
  
  const updated: Task = {
    ...existing,
    ...updates,
    ...edited,
    updatedAt: new Date().toISOString(),
  };
  
  tasks.set(id, updated);
  return updated;
}

export function deleteTask(id: string): boolean {
  const task = tasks.get(id);
  if (!task) return false;
  
  // Use Delete domain
  const deleted = delete_(id);
  if (!deleted) return false;
  
  return tasks.delete(id);
}

export function archiveTask(id: string): Task | undefined {
  return updateTask(id, { status: 'archived' });
}

export function restoreTask(id: string): Task | undefined {
  return updateTask(id, { status: 'open' });
}

// ======== SEARCH & FILTER ========

export function searchTasks(query: string): Task[] {
  if (!query.trim()) return getAllTasks();
  
  return getAllTasks().filter(t => 
    t.title.toLowerCase().includes(query.toLowerCase()) ||
    t.description.toLowerCase().includes(query.toLowerCase())
  );
}

export function filterByStatus(status: Task['status']): Task[] {
  return getAllTasks().filter(t => t.status === status);
}

export function filterByPriority(priority: Task['priority']): Task[] {
  return getAllTasks().filter(t => t.priority === priority);
}

export function filterByAssignee(assignee: string): Task[] {
  return getAllTasks().filter(t => t.assignee === assignee);
}

// ======== STATS ========

export function getStats() {
  const all = getAllTasks();
  const archived = Array.from(tasks.values()).filter(t => t.status === 'archived').length;
  const now = new Date();
  
  return {
    total: all.length + archived,
    inProgress: all.filter(t => t.status === 'in_progress').length,
    completed: all.filter(t => t.status === 'done').length,
    overdue: all.filter(t => {
      if (!t.deadline || t.status === 'done') return false;
      return new Date(t.deadline) < now;
    }).length,
    archived: archived,
    byPriority: {
      critical: all.filter(t => t.priority === 'critical').length,
      high: all.filter(t => t.priority === 'high').length,
      medium: all.filter(t => t.priority === 'medium').length,
      low: all.filter(t => t.priority === 'low').length,
    },
    byStatus: {
      open: all.filter(t => t.status === 'open').length,
      in_progress: all.filter(t => t.status === 'in_progress').length,
      review: all.filter(t => t.status === 'review').length,
      done: all.filter(t => t.status === 'done').length,
      archived: archived,
    },
  };
}

// ======== SELECTED IDS (UI Domain) ========

export function getSelectedIds(): string[] {
  const selected = selectedids();
  return selected.map((s: any) => s.id);
}
