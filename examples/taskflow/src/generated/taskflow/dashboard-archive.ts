// Generated: Dashboard Archive UI (IU-e5f6789012345678abcdef901234567890123456)
// Description: Archive tab switching, archived task display with status badges, restore functionality

import type { Task, ArchivedTask } from './task-model.js';
import { isArchived, listArchived, listActive } from './task-model.js';
import { renderTaskGrid, renderStatusBadge } from './dashboard-tasklist.js';

export type ViewMode = 'active' | 'archived';

export function renderArchiveTabs(currentView: ViewMode): string {
  return `
    <div class="archive-tabs" style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid var(--ctp-surface0);padding-bottom:8px;">
      <button class="tab-btn ${currentView === 'active' ? 'active' : ''}" data-view="active" style="padding:8px 16px;border:none;background:${currentView === 'active' ? 'var(--ctp-surface0)' : 'transparent'};color:var(--ctp-text);border-radius:6px 6px 0 0;cursor:pointer;">
        Active Tasks
      </button>
      <button class="tab-btn ${currentView === 'archived' ? 'active' : ''}" data-view="archived" style="padding:8px 16px;border:none;background:${currentView === 'archived' ? 'var(--ctp-surface0)' : 'transparent'};color:var(--ctp-text);border-radius:6px 6px 0 0;cursor:pointer;">
        Archived Tasks
      </button>
    </div>
  `;
}

export function renderArchivedStatusBadge(task: Task | ArchivedTask, viewMode: ViewMode): string {
  if (viewMode === 'active' && isArchived(task)) {
    // In Active tab: show dimmed/strikethrough archived badge
    return `<span class="badge archived-badge" style="background:#585b70;color:#a6adc8;padding:2px 8px;border-radius:4px;font-size:0.75rem;text-transform:uppercase;text-decoration:line-through;opacity:0.7;">archived</span>`;
  }
  
  if (viewMode === 'archived' && isArchived(task)) {
    // In Archived tab: show original status with archived overlay indicator
    const originalStatus = renderStatusBadge(task.status);
    return `${originalStatus}<span class="badge archived-indicator" style="background:#585b70;color:#cdd6f4;padding:2px 6px;border-radius:4px;font-size:0.65rem;text-transform:uppercase;margin-left:4px;opacity:0.8;">📦</span>`;
  }
  
  // Not archived or in default view
  return renderStatusBadge(task.status);
}

export function filterTasksByViewMode(
  tasks: (Task | ArchivedTask)[],
  viewMode: ViewMode
): Task[] | ArchivedTask[] {
  return viewMode === 'archived' ? listArchived(tasks) : listActive(tasks);
}

export function renderArchiveView(
  tasks: (Task | ArchivedTask)[],
  viewMode: ViewMode
): { tabs: string; content: string } {
  const filtered = filterTasksByViewMode(tasks, viewMode);

  return {
    tabs: renderArchiveTabs(viewMode),
    content: renderTaskGrid(filtered as Task[], viewMode === 'archived'),
  };
}

export function setupArchiveHandlers(
  container: HTMLElement,
  onViewChange: (view: ViewMode) => void
): void {
  container.querySelectorAll('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const view = btn.getAttribute('data-view') as ViewMode;
      onViewChange(view);
    });
  });
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'e5f6789012345678abcdef901234567890123456',
  name: 'Dashboard Archive UI',
  risk_tier: 'high',
} as const;
