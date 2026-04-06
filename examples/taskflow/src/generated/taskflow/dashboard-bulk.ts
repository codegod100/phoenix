// Generated: Dashboard Bulk Operations (IU-f6789012345678abcdef90123456789012345678)
// Description: Multi-select, bulk actions, confirmation modals

import type { Task } from './task-model.js';

export interface BulkSelection {
  selectedIds: Set<string>;
}

export function createBulkSelection(): BulkSelection {
  return { selectedIds: new Set() };
}

export function toggleSelection(selection: BulkSelection, taskId: string): boolean {
  if (selection.selectedIds.has(taskId)) {
    selection.selectedIds.delete(taskId);
    return false;
  } else {
    selection.selectedIds.add(taskId);
    return true;
  }
}

export function selectAll(selection: BulkSelection, taskIds: string[]): void {
  taskIds.forEach((id) => selection.selectedIds.add(id));
}

export function clearSelection(selection: BulkSelection): void {
  selection.selectedIds.clear();
}

export function isSelected(selection: BulkSelection, taskId: string): boolean {
  return selection.selectedIds.has(taskId);
}

export function getSelectedCount(selection: BulkSelection): number {
  return selection.selectedIds.size;
}

export function renderBulkActionBar(count: number): string {
  if (count === 0) return '';

  return `
    <div class="bulk-action-bar" style="position:fixed;top:16px;left:50%;transform:translateX(-50%);background:var(--ctp-surface0);padding:12px 24px;border-radius:8px;box-shadow:0 4px 16px rgba(0,0,0,0.4);z-index:100;display:flex;gap:12px;align-items:center;animation:slideDown 0.2s ease-out;">
      <span style="color:var(--ctp-text);font-weight:500;">${count} selected</span>
      <button class="btn bulk-archive-btn" style="background:var(--ctp-warning);color:var(--ctp-base);padding:6px 12px;">Archive</button>
      <button class="btn bulk-delete-btn" style="background:var(--ctp-danger);color:var(--ctp-base);padding:6px 12px;">Delete</button>
      <button class="btn bulk-clear-btn" style="background:var(--ctp-overlay0);color:var(--ctp-text);padding:6px 12px;">Clear</button>
    </div>
    <style>@keyframes slideDown{from{opacity:0;transform:translateX(-50%) translateY(-20px);}to{opacity:1;transform:translateX(-50%) translateY(0);}}</style>
  `;
}

export function renderConfirmationModal(
  title: string,
  message: string,
  confirmText: string,
  danger = false
): string {
  const confirmStyle = danger
    ? 'background:var(--ctp-danger);color:var(--ctp-base);'
    : 'background:var(--ctp-primary);color:var(--ctp-base);';

  return `
    <div class="modal-overlay" style="position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px);">
      <div class="modal" style="background:var(--ctp-surface0);padding:24px;border-radius:12px;max-width:400px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,0.5);">
        <h3 style="margin-bottom:12px;font-size:1.2rem;color:var(--ctp-text);">${escapeHtml(title)}</h3>
        <p style="margin-bottom:20px;color:var(--ctp-subtext0);line-height:1.5;">${escapeHtml(message)}</p>
        <div style="display:flex;gap:12px;justify-content:flex-end;">
          <button class="btn modal-cancel" style="background:var(--ctp-overlay0);color:var(--ctp-text);padding:8px 16px;">Cancel</button>
          <button class="btn modal-confirm" style="${confirmStyle}padding:8px 16px;">${escapeHtml(confirmText)}</button>
        </div>
      </div>
    </div>
  `;
}

export function showModal(
  container: HTMLElement,
  title: string,
  message: string,
  confirmText: string,
  danger = false
): Promise<boolean> {
  return new Promise((resolve) => {
    const modalHtml = renderConfirmationModal(title, message, confirmText, danger);
    const modalContainer = document.createElement('div');
    modalContainer.innerHTML = modalHtml;
    container.appendChild(modalContainer);

    const confirmBtn = modalContainer.querySelector('.modal-confirm');
    const cancelBtn = modalContainer.querySelector('.modal-cancel');
    const overlay = modalContainer.querySelector('.modal-overlay');

    const cleanup = () => {
      modalContainer.remove();
    };

    confirmBtn?.addEventListener('click', () => {
      cleanup();
      resolve(true);
    });

    cancelBtn?.addEventListener('click', () => {
      cleanup();
      resolve(false);
    });

    overlay?.addEventListener('click', (e) => {
      if (e.target === overlay) {
        cleanup();
        resolve(false);
      }
    });
  });
}

export function setupCheckboxHandlers(
  container: HTMLElement,
  selection: BulkSelection,
  onChange: () => void
): void {
  container.querySelectorAll('.bulk-select').forEach((checkbox) => {
    checkbox.addEventListener('change', () => {
      const taskId = (checkbox as HTMLInputElement).getAttribute('data-task-id');
      if (taskId) {
        toggleSelection(selection, taskId);
        onChange();
      }
    });
  });
}

export async function confirmDelete(
  container: HTMLElement,
  count: number
): Promise<boolean> {
  return showModal(
    container,
    count === 1 ? 'Delete Task?' : `Delete ${count} Tasks?`,
    count === 1
      ? 'This action cannot be undone. The task will be permanently removed.'
      : `You are about to delete ${count} tasks. This action cannot be undone.`,
    count === 1 ? 'Delete' : `Delete ${count}`,
    true
  );
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'f6789012345678abcdef90123456789012345678',
  name: 'Dashboard Bulk Operations',
  risk_tier: 'high',
} as const;
