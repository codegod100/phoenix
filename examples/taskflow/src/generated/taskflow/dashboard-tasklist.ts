// Generated: Dashboard Task List (IU-c3d4e5f6789012345678abcdef90123456789012)
// Description: Task grid display, cards, badges, localStorage persistence

import { PRIORITY_COLORS, STATUS_COLORS } from './dashboard-page.js';
import type { Task, ArchivedTask } from './task-model.js';
import { isArchived } from './task-model.js';

const STORAGE_KEY = 'taskflow_tasks_v1';

export function saveTasks(tasks: (Task | ArchivedTask)[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export function loadTasks(): (Task | ArchivedTask)[] {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) return [];
  try {
    return JSON.parse(stored, (key, value) => {
      if (key === 'createdAt' || key === 'updatedAt' || key === 'deadline' || key === 'completedAt' || key === 'archivedAt' || key === 'timestamp') {
        return value ? new Date(value) : value;
      }
      return value;
    });
  } catch {
    return [];
  }
}

export function clearTasks(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function getNextStatuses(current: Task['status']): Task['status'][] {
  const transitions: Record<Task['status'], Task['status'][]> = {
    open: ['in_progress'],
    in_progress: ['review', 'open'],
    review: ['done', 'in_progress'],
    done: [],
  };
  return transitions[current] || [];
}

export function renderPriorityBadge(priority: string): string {
  const color = PRIORITY_COLORS[priority] || '#888';
  return `<span class="badge" style="background:${color};color:#1e1e2e;padding:2px 8px;border-radius:4px;font-size:0.75rem;text-transform:uppercase;">${priority}</span>`;
}

export function renderStatusBadge(status: string, isArchivedTask = false): string {
  if (isArchivedTask) {
    // Dimmed archived appearance
    return `<span class="badge archived" style="background:#585b70;color:#a6adc8;padding:2px 8px;border-radius:4px;font-size:0.75rem;text-transform:uppercase;opacity:0.7;">${status}</span>`;
  }
  const color = STATUS_COLORS[status] || '#888';
  const label = status.replace('_', ' ');
  return `<span class="badge" style="background:${color};color:#1e1e2e;padding:2px 8px;border-radius:4px;font-size:0.75rem;text-transform:uppercase;">${label}</span>`;
}

export function isTaskOverdue(task: Task | ArchivedTask): boolean {
  if (!task.deadline || task.status === 'done') return false;
  return new Date() > new Date(task.deadline);
}

export function renderTaskCard(task: Task | ArchivedTask, isArchivedView = false): string {
  const overdue = isTaskOverdue(task);
  const borderStyle = overdue
    ? 'border:2px solid var(--ctp-danger);'
    : 'border:1px solid transparent;';

  const nextStatuses = isArchivedView || isArchived(task) ? [] : getNextStatuses(task.status);
  const statusButtons = nextStatuses
    .map(
      (s) =>
        `<button class="btn btn-primary status-btn" data-task-id="${task.id}" data-new-status="${s}" style="padding:4px 8px;font-size:0.8rem;margin-right:4px;">→ ${s.replace('_', ' ')}</button>`
    )
    .join('');

  const actions = isArchivedView
    ? `<button class="btn btn-success restore-btn" data-task-id="${task.id}" style="padding:4px 12px;font-size:0.8rem;">Restore</button>`
    : `<button class="btn btn-primary edit-btn" data-task-id="${task.id}" style="padding:4px 12px;font-size:0.8rem;margin-right:4px;">Edit</button>
       <button class="btn btn-danger delete-btn" data-task-id="${task.id}" style="padding:4px 12px;font-size:0.8rem;">🗑️</button>`;

  const overdueIndicator = overdue
    ? `<span style="color:var(--ctp-danger);font-weight:bold;margin-left:8px;">OVERDUE</span>`
    : '';

  const assigneeDisplay = task.assignee || 'Unassigned';
  const deadlineDisplay = task.deadline
    ? new Date(task.deadline).toLocaleDateString()
    : 'No deadline';

  // Show archived indicator for archived tasks
  const archivedIndicator = isArchived(task) && !isArchivedView
    ? `<span class="badge archived-indicator" style="background:#585b70;color:#a6adc8;padding:2px 6px;border-radius:4px;font-size:0.65rem;text-transform:uppercase;margin-left:8px;opacity:0.7;text-decoration:line-through;">archived</span>`
    : '';

  return `
    <div class="task-card card" data-task-id="${task.id}" style="${borderStyle}padding:16px;margin-bottom:16px;">
      <div class="card-content">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
          <h3 style="font-size:1.1rem;margin:0;">${escapeHtml(task.title)}${archivedIndicator}${overdueIndicator}</h3>
          <input type="checkbox" class="bulk-select" data-task-id="${task.id}" style="margin-left:8px;">
        </div>
        <p style="color:var(--ctp-subtext0);margin-bottom:12px;font-size:0.9rem;">${escapeHtml(task.description)}</p>
        <div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;">
          ${renderPriorityBadge(task.priority)}
          ${renderStatusBadge(task.status, isArchived(task))}
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.85rem;color:var(--ctp-subtext0);margin-bottom:12px;">
          <span>👤 ${escapeHtml(assigneeDisplay)}</span>
          <span>📅 ${deadlineDisplay}</span>
        </div>
        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div>${statusButtons}</div>
          <div>${actions}</div>
        </div>
      </div>
      <div class="edit-form" style="display:none;"></div>
    </div>
  `;
}

export function renderTaskGrid(tasks: (Task | ArchivedTask)[], isArchivedView = false): string {
  if (tasks.length === 0) {
    return `<div style="text-align:center;padding:48px;color:var(--ctp-subtext0);">${isArchivedView ? 'No archived tasks' : 'No active tasks'}</div>`;
  }

  const cards = tasks.map((t) => renderTaskCard(t, isArchivedView)).join('');

  return `
    <div class="task-grid" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(320px,1fr));gap:16px;">
      ${cards}
    </div>
  `;
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'c3d4e5f6789012345678abcdef90123456789012',
  name: 'Dashboard Task List',
  risk_tier: 'high',
} as const;
