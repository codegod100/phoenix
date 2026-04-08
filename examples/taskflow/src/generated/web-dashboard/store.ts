/**
 * @phoenix-deliverable: web-dashboard-legacy
 * @phoenix-generated: 2026-04-08T18:00:00.000Z
 * 
 * TaskFlow Data Store
 * 
 * Integrates all Phoenix domains into a unified task management API
 */

import { deleteTask } from '../delete/index.js';

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
  const task: Task = {
    id: crypto.randomUUID(),
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
  
  tasks.set(task.id, task);
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): Task | undefined {
  const existing = tasks.get(id);
  if (!existing) return undefined;
  
  const updated: Task = {
    ...existing,
    ...updates,
    updatedAt: new Date().toISOString(),
  };
  
  tasks.set(id, updated);
  return updated;
}

export function deleteTaskById(id: string): boolean {
  const task = tasks.get(id);
  if (!task) return false;
  
  // Use Delete domain
  const deleted = deleteTask(id);
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
// Note: UI domain exports getArchivedTasks, setStatus, filterByStatus
// Selection logic is handled locally in the store

const selectedIds = new Set<string>();

export function getSelectedIds(): string[] {
  return Array.from(selectedIds);
}

export function setSelectedId(id: string, selected: boolean): void {
  if (selected) selectedIds.add(id);
  else selectedIds.delete(id);
}

export function clearSelectedIds(): void {
  selectedIds.clear();
}
