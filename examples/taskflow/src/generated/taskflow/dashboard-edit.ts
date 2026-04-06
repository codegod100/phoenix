// Generated: Dashboard Edit UI (IU-d4e5f6789012345678abcdef9012345678901234)
// Description: Create form and inline editing for tasks

import type { Priority, Task } from './task-model.js';

export function renderCreateForm(): string {
  return `
    <div class="create-form card" style="padding:20px;margin-bottom:24px;">
      <h2 style="margin-bottom:16px;font-size:1.2rem;">Create New Task</h2>
      <form id="create-task-form" style="display:grid;gap:12px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Title *</label>
          <input type="text" name="title" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Description</label>
          <textarea name="description" rows="2" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);resize:vertical;"></textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Priority</label>
            <select name="priority" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Deadline</label>
            <input type="date" name="deadline" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);">
          </div>
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
          <button type="submit" class="btn btn-primary">Create Task</button>
        </div>
      </form>
    </div>
  `;
}

export function renderEditForm(task: Task): string {
  const deadlineValue = task.deadline
    ? new Date(task.deadline).toISOString().split('T')[0]
    : '';

  return `
    <form class="edit-task-form" data-task-id="${task.id}" style="padding:16px;">
      <div style="display:grid;gap:12px;">
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Title *</label>
          <input type="text" name="title" value="${escapeHtml(task.title)}" required style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);">
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Description</label>
          <textarea name="description" rows="2" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);resize:vertical;">${escapeHtml(task.description)}</textarea>
        </div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Priority</label>
            <select name="priority" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);">
              <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
              <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
              <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
              <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Critical</option>
            </select>
          </div>
          <div>
            <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Deadline</label>
            <input type="date" name="deadline" value="${deadlineValue}" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);">
          </div>
        </div>
        <div>
          <label style="display:block;margin-bottom:4px;font-size:0.85rem;color:var(--ctp-subtext0);">Assignee</label>
          <input type="text" name="assignee" value="${escapeHtml(task.assignee || '')}" placeholder="User ID" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid var(--ctp-overlay0);background:var(--ctp-base);color:var(--ctp-text);">
        </div>
        <div style="display:flex;gap:8px;justify-content:flex-end;margin-top:8px;">
          <button type="button" class="btn cancel-edit" style="background:var(--ctp-overlay0);color:var(--ctp-text);">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </div>
    </form>
  `;
}

export function setupInlineEditing(
  cardElement: HTMLElement,
  task: Task,
  onSave: (updated: Task) => void,
  onCancel: () => void
): void {
  const contentDiv = cardElement.querySelector('.card-content') as HTMLElement;
  const formDiv = cardElement.querySelector('.edit-form') as HTMLElement;

  if (!contentDiv || !formDiv) return;

  formDiv.innerHTML = renderEditForm(task);
  contentDiv.style.display = 'none';
  formDiv.style.display = 'block';

  const form = formDiv.querySelector('.edit-task-form');
  const cancelBtn = formDiv.querySelector('.cancel-edit');

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);

    const updated: Task = {
      ...task,
      title: formData.get('title') as string,
      description: formData.get('description') as string,
      priority: formData.get('priority') as Priority,
      assignee: (formData.get('assignee') as string) || undefined,
      updatedAt: new Date(),
    };

    const deadlineVal = formData.get('deadline') as string;
    if (deadlineVal) {
      updated.deadline = new Date(deadlineVal);
    } else {
      updated.deadline = undefined;
    }

    onSave(updated);
  });

  cancelBtn?.addEventListener('click', () => {
    contentDiv.style.display = 'block';
    formDiv.style.display = 'none';
    formDiv.innerHTML = '';
    onCancel();
  });
}

function escapeHtml(text: string): string {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'd4e5f6789012345678abcdef9012345678901234',
  name: 'Dashboard Edit UI',
  risk_tier: 'high',
} as const;
