/**
 * Complete TaskFlow Dashboard - Uses newly generated taskflow modules
 * Provides full working HTML with CSS, JavaScript, and all features
 */

import * as taskflow from '../taskflow/index.js';

// Re-export for server use
export { taskflow };

export interface DashboardConfig {
  title?: string;
  initialTasks?: taskflow.Task[];
}

export class TaskFlowDashboard {
  private config: DashboardConfig;

  constructor(config: DashboardConfig = {}) {
    this.config = {
      title: 'TaskFlow',
      initialTasks: [],
      ...config
    };
  }

  /**
   * Render the complete working HTML dashboard
   */
  public renderHTML(): string {
    const css = this.generateCSS();
    const js = this.generateClientJS();

    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${this.config.title}</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><text y='.9em' font-size='90'>📋</text></svg>">
    <style>${css}</style>
</head>
<body>
    <div class="dashboard">
        <header class="header">
            <h1>📋 ${this.config.title}</h1>
            <div class="header-stats" id="header-stats"></div>
        </header>

        <main class="main">
            <!-- Create Task Form -->
            <section class="create-section">
                <h2>Create New Task</h2>
                <form id="create-task-form" class="create-form">
                    <div class="form-row">
                        <input type="text" id="task-title" placeholder="Task title *" required class="input title-input">
                        <select id="task-priority" class="input">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    <textarea id="task-description" placeholder="Description" rows="2" class="input"></textarea>
                    <div class="form-row">
                        <input type="date" id="task-deadline" class="input">
                        <input type="text" id="task-assignee" placeholder="Assignee" class="input">
                        <button type="submit" class="btn btn-primary">Create Task</button>
                    </div>
                </form>
            </section>

            <!-- Archive Tabs -->
            <section class="tabs-section">
                <div class="archive-tabs">
                    <button class="tab-btn active" data-view="active">Active Tasks</button>
                    <button class="tab-btn" data-view="archived">Archived Tasks</button>
                </div>
            </section>

            <!-- Bulk Action Bar (hidden by default) -->
            <section class="bulk-bar" id="bulk-bar" style="display: none;">
                <span class="bulk-count"><span id="selected-count">0</span> selected</span>
                <button class="btn btn-warning" id="bulk-archive-btn">Archive</button>
                <button class="btn btn-danger" id="bulk-delete-btn">Delete</button>
                <button class="btn btn-secondary" id="bulk-clear-btn">Clear</button>
            </section>

            <!-- Task Grid -->
            <section class="tasks-section" id="tasks-container">
                <div class="empty-state">No tasks yet. Create one above!</div>
            </section>

            <!-- Status Bar -->
            <section class="status-bar" id="status-bar"></section>
        </main>
    </div>

    <!-- Confirmation Modal -->
    <div class="modal-overlay" id="modal-overlay" style="display: none;">
        <div class="modal">
            <h3 id="modal-title">Confirm</h3>
            <p id="modal-message">Are you sure?</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" id="modal-cancel">Cancel</button>
                <button class="btn btn-danger" id="modal-confirm">Confirm</button>
            </div>
        </div>
    </div>

    <script>${js}</script>
</body>
</html>`;
  }

  private generateCSS(): string {
    return `
      :root {
        --ctp-base: #1e1e2e;
        --ctp-surface0: #313244;
        --ctp-surface1: #45475a;
        --ctp-text: #cdd6f4;
        --ctp-subtext0: #a6adc8;
        --ctp-subtext1: #bac2de;
        --ctp-overlay0: #6c7086;
        --ctp-blue: #89b4fa;
        --ctp-green: #a6e3a1;
        --ctp-yellow: #f9e2af;
        --ctp-red: #f38ba8;
        --ctp-peach: #fab387;
        --ctp-mauve: #cba6f7;
      }

      * { box-sizing: border-box; margin: 0; padding: 0; }

      body {
        font-family: system-ui, -apple-system, sans-serif;
        font-size: 0.95rem;
        background: var(--ctp-base);
        color: var(--ctp-text);
        line-height: 1.5;
        min-height: 100vh;
      }

      .dashboard { max-width: 1200px; margin: 0 auto; padding: 24px; }

      .header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 0;
        border-bottom: 1px solid var(--ctp-surface0);
        margin-bottom: 24px;
      }

      .header h1 { font-size: 1.75rem; font-weight: 600; }

      .header-stats {
        display: flex;
        gap: 16px;
        font-size: 0.9rem;
        color: var(--ctp-subtext0);
      }

      .create-section { margin-bottom: 24px; }
      .create-section h2 { font-size: 1.25rem; margin-bottom: 12px; }

      .create-form {
        background: var(--ctp-surface0);
        padding: 16px;
        border-radius: 8px;
        display: flex;
        flex-direction: column;
        gap: 12px;
      }

      .form-row {
        display: flex;
        gap: 12px;
        flex-wrap: wrap;
      }

      .input {
        background: var(--ctp-base);
        border: 1px solid var(--ctp-overlay0);
        border-radius: 6px;
        padding: 8px 12px;
        color: var(--ctp-text);
        font-size: 0.9rem;
        flex: 1;
        min-width: 120px;
      }

      .input:focus {
        outline: none;
        border-color: var(--ctp-blue);
      }

      .title-input { flex: 2; }

      .btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        font-weight: 500;
        transition: opacity 0.2s;
      }

      .btn:hover { opacity: 0.9; }

      .btn-primary { background: var(--ctp-blue); color: var(--ctp-base); }
      .btn-success { background: var(--ctp-green); color: var(--ctp-base); }
      .btn-warning { background: var(--ctp-yellow); color: var(--ctp-base); }
      .btn-danger { background: var(--ctp-red); color: var(--ctp-base); }
      .btn-secondary { background: var(--ctp-overlay0); color: var(--ctp-text); }

      .archive-tabs {
        display: flex;
        gap: 8px;
        margin-bottom: 20px;
        border-bottom: 1px solid var(--ctp-surface0);
      }

      .tab-btn {
        padding: 12px 20px;
        background: transparent;
        border: none;
        color: var(--ctp-subtext0);
        cursor: pointer;
        font-size: 0.95rem;
        border-bottom: 2px solid transparent;
        transition: all 0.2s;
      }

      .tab-btn.active {
        color: var(--ctp-text);
        border-bottom-color: var(--ctp-blue);
      }

      .bulk-bar {
        display: flex;
        align-items: center;
        gap: 12px;
        background: var(--ctp-surface0);
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 16px;
      }

      .bulk-count { font-weight: 500; }

      .tasks-section {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
      }

      .task-card {
        background: var(--ctp-surface0);
        border-radius: 8px;
        padding: 16px;
        position: relative;
        transition: transform 0.2s, box-shadow 0.2s;
      }

      .task-card:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 12px rgba(0,0,0,0.3);
      }

      .task-card.overdue { border: 2px solid var(--ctp-red); }

      .task-card.archived { opacity: 0.7; }

      .task-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 8px;
        gap: 8px;
      }

      .task-title-area {
        display: flex;
        align-items: center;
        gap: 8px;
        flex: 1;
      }

      .task-title {
        font-size: 1.1rem;
        font-weight: 600;
        margin: 0;
      }

      .task-checkbox {
        width: 18px;
        height: 18px;
        cursor: pointer;
      }

      .task-badges {
        display: flex;
        gap: 6px;
        flex-wrap: wrap;
      }

      .badge {
        padding: 2px 8px;
        border-radius: 4px;
        font-size: 0.7rem;
        font-weight: 600;
        text-transform: uppercase;
      }

      .badge.priority-critical { background: var(--ctp-red); color: var(--ctp-base); }
      .badge.priority-high { background: var(--ctp-peach); color: var(--ctp-base); }
      .badge.priority-medium { background: var(--ctp-yellow); color: var(--ctp-base); }
      .badge.priority-low { background: var(--ctp-green); color: var(--ctp-base); }

      .badge.status-open { background: var(--ctp-overlay0); color: var(--ctp-text); }
      .badge.status-in_progress { background: var(--ctp-blue); color: var(--ctp-base); }
      .badge.status-review { background: var(--ctp-mauve); color: var(--ctp-base); }
      .badge.status-done { background: var(--ctp-green); color: var(--ctp-base); }
      .badge.status-archived { background: #585b70; color: var(--ctp-text); text-decoration: line-through; }

      .overdue-indicator {
        color: var(--ctp-red);
        font-weight: bold;
        font-size: 0.8rem;
      }

      .archived-indicator {
        background: #585b70;
        color: var(--ctp-subtext0);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.65rem;
        text-transform: uppercase;
      }

      .task-description {
        color: var(--ctp-subtext0);
        font-size: 0.9rem;
        margin-bottom: 12px;
      }

      .task-meta {
        display: flex;
        justify-content: space-between;
        font-size: 0.85rem;
        color: var(--ctp-subtext0);
        margin-bottom: 12px;
      }

      .task-actions {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 8px;
      }

      .status-buttons {
        display: flex;
        gap: 4px;
        flex-wrap: wrap;
      }

      .status-btn {
        padding: 4px 8px;
        font-size: 0.75rem;
        background: var(--ctp-surface1);
        border: none;
        border-radius: 4px;
        color: var(--ctp-text);
        cursor: pointer;
      }

      .status-btn:hover { background: var(--ctp-blue); color: var(--ctp-base); }

      .action-buttons {
        display: flex;
        gap: 4px;
      }

      .action-btn {
        padding: 6px 10px;
        font-size: 0.8rem;
      }

      .edit-form {
        display: none;
        padding: 12px;
        background: var(--ctp-surface1);
        border-radius: 6px;
        margin-top: 12px;
      }

      .edit-form.active { display: block; }

      .edit-form .form-row {
        margin-bottom: 8px;
      }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 48px;
        color: var(--ctp-subtext0);
      }

      .status-bar {
        margin-top: 24px;
        padding: 12px;
        background: var(--ctp-surface0);
        border-radius: 8px;
        text-align: center;
        font-size: 0.9rem;
      }

      .modal-overlay {
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.7);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
      }

      .modal {
        background: var(--ctp-surface0);
        padding: 24px;
        border-radius: 12px;
        max-width: 400px;
        width: 90%;
      }

      .modal h3 { margin-bottom: 12px; }

      .modal p { color: var(--ctp-subtext0); margin-bottom: 20px; }

      .modal-actions {
        display: flex;
        justify-content: flex-end;
        gap: 12px;
      }

      @media (max-width: 768px) {
        .dashboard { padding: 16px; }
        .tasks-section { grid-template-columns: 1fr; }
        .form-row { flex-direction: column; }
        .header { flex-direction: column; gap: 12px; }
      }
    `;
  }

  private generateClientJS(): string {
    return `
      // TaskFlow Dashboard Client-side JavaScript
      (function() {
        // State
        let tasks = JSON.parse(localStorage.getItem('taskflow_tasks') || '[]');
        let view = 'active';
        let selectedIds = [];
        let modalCallback = null;

        // Parse dates from JSON
        tasks.forEach(t => {
          t.createdAt = new Date(t.createdAt);
          t.updatedAt = new Date(t.updatedAt);
          if (t.deadline) t.deadline = new Date(t.deadline);
          if (t.archivedAt) t.archivedAt = new Date(t.archivedAt);
        });

        function saveTasks() {
          localStorage.setItem('taskflow_tasks', JSON.stringify(tasks));
        }

        function generateId() {
          return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }

        function isOverdue(task) {
          if (!task.deadline || task.status === 'done' || task.archived) return false;
          return new Date() > new Date(task.deadline);
        }

        function getPriorityColor(p) {
          return { critical: '#f38ba8', high: '#fab387', medium: '#f9e2af', low: '#a6e3a1' }[p] || '#888';
        }

        function getStatusColor(s) {
          return { open: '#6c7086', in_progress: '#89b4fa', review: '#cba6f7', done: '#a6e3a1' }[s] || '#888';
        }

        function getNextStatuses(status) {
          const transitions = {
            open: ['in_progress'],
            in_progress: ['review', 'open'],
            review: ['done', 'in_progress'],
            done: []
          };
          return transitions[status] || [];
        }

        function renderBadge(text, type, isArchived) {
          if (type === 'status' && isArchived) {
            return '<span class="badge status-archived">archived</span>';
          }
          const color = type === 'priority' ? getPriorityColor(text) : getStatusColor(text);
          const className = type === 'priority' ? 'priority-' + text : 'status-' + text;
          const label = text.replace('_', ' ');
          return '<span class="badge ' + className + '" style="background:' + color + '">' + label + '</span>';
        }

        function renderTaskCard(task) {
          const isArchived = !!task.archived;
          const isOverdueTask = isOverdue(task);
          const isSelected = selectedIds.includes(task.id);

          const nextStatuses = (view === 'active' && !isArchived) ? getNextStatuses(task.status) : [];
          const statusButtons = nextStatuses.map(s => 
            '<button class="status-btn" onclick="transitionStatus(\\'' + task.id + '\\', '\\'' + s + '\\')">→ ' + s.replace('_', ' ') + '</button>'
          ).join('');

          const actions = view === 'archived' 
            ? '<button class="btn btn-success action-btn" onclick="restoreTask(\\'' + task.id + '\\')">Restore</button>'
            : '<button class="btn btn-primary action-btn" onclick="startEdit(\\'' + task.id + '\\')">Edit</button>' +
              '<button class="btn btn-danger action-btn" onclick="deleteTask(\\'' + task.id + '\\')">🗑️</button>';

          const overdueIndicator = isOverdueTask ? '<span class="overdue-indicator">OVERDUE</span>' : '';
          const archivedIndicator = (isArchived && view === 'active') ? '<span class="archived-indicator">archived</span>' : '';

          const assignee = task.assignee || 'Unassigned';
          const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline';

          return '<div class="task-card ' + (isOverdueTask ? 'overdue ' : '') + (isArchived ? 'archived' : '') + '" data-id="' + task.id + '">' +
            '<div class="task-header">' +
              '<div class="task-title-area">' +
                '<input type="checkbox" class="task-checkbox" ' + (isSelected ? 'checked' : '') + ' onchange="toggleSelection(\\'' + task.id + '\\')">' +
                '<h3 class="task-title">' + escapeHtml(task.title) + archivedIndicator + overdueIndicator + '</h3>' +
              '</div>' +
              '<div class="task-badges">' +
                renderBadge(task.priority, 'priority', false) +
                renderBadge(task.status, 'status', isArchived && view === 'active') +
              '</div>' +
            '</div>' +
            '<div class="task-description">' + escapeHtml(task.description || '') + '</div>' +
            '<div class="task-meta">' +
              '<span>👤 ' + escapeHtml(assignee) + '</span>' +
              '<span>📅 ' + deadline + '</span>' +
            '</div>' +
            '<div class="task-actions">' +
              '<div class="status-buttons">' + statusButtons + '</div>' +
              '<div class="action-buttons">' + actions + '</div>' +
            '</div>' +
            '<div class="edit-form" id="edit-form-' + task.id + '">' +
              '<div class="form-row">' +
                '<input type="text" id="edit-title-' + task.id + '" value="' + escapeHtml(task.title) + '" class="input">' +
                '<select id="edit-priority-' + task.id + '" class="input">' +
                  '<option value="low" ' + (task.priority === 'low' ? 'selected' : '') + '>Low</option>' +
                  '<option value="medium" ' + (task.priority === 'medium' ? 'selected' : '') + '>Medium</option>' +
                  '<option value="high" ' + (task.priority === 'high' ? 'selected' : '') + '>High</option>' +
                  '<option value="critical" ' + (task.priority === 'critical' ? 'selected' : '') + '>Critical</option>' +
                '</select>' +
              '</div>' +
              '<textarea id="edit-desc-' + task.id + '" class="input" rows="2">' + escapeHtml(task.description || '') + '</textarea>' +
              '<div class="form-row">' +
                '<input type="date" id="edit-deadline-' + task.id + '" value="' + (task.deadline ? task.deadline.toISOString().split('T')[0] : '') + '" class="input">' +
                '<input type="text" id="edit-assignee-' + task.id + '" value="' + escapeHtml(task.assignee || '') + '" placeholder="Assignee" class="input">' +
              '</div>' +
              '<div class="form-row">' +
                '<button class="btn btn-secondary" onclick="cancelEdit(\\'' + task.id + '\\')">Cancel</button>' +
                '<button class="btn btn-primary" onclick="saveEdit(\\'' + task.id + '\\')">Save</button>' +
              '</div>' +
            '</div>' +
          '</div>';
        }

        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        function renderTasks() {
          const container = document.getElementById('tasks-container');
          const filtered = view === 'archived' 
            ? tasks.filter(t => t.archived)
            : tasks.filter(t => !t.archived);

          if (filtered.length === 0) {
            container.innerHTML = '<div class="empty-state">' + (view === 'archived' ? 'No archived tasks' : 'No active tasks') + '</div>';
          } else {
            container.innerHTML = filtered.map(renderTaskCard).join('');
          }

          updateStats();
          updateBulkBar();
        }

        function updateStats() {
          const active = tasks.filter(t => !t.archived);
          const completed = active.filter(t => t.status === 'done').length;
          const overdue = active.filter(t => isOverdue(t)).length;
          const rate = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;

          document.getElementById('header-stats').innerHTML = 
            '<span>' + active.length + ' active</span>' +
            '<span>' + completed + ' done</span>' +
            '<span>' + overdue + ' overdue</span>' +
            '<span>' + rate + '% complete</span>';

          document.getElementById('status-bar').innerHTML = 
            '<span>📊 ' + active.length + ' tasks</span> • ' +
            '<span>✅ ' + completed + ' done</span> • ' +
            '<span>⚠️ ' + overdue + ' overdue</span> • ' +
            '<span>📈 ' + rate + '%</span>';
        }

        function updateBulkBar() {
          const bar = document.getElementById('bulk-bar');
          const count = document.getElementById('selected-count');
          count.textContent = selectedIds.length;
          bar.style.display = selectedIds.length > 0 ? 'flex' : 'none';
        }

        // Actions
        window.transitionStatus = function(id, newStatus) {
          const task = tasks.find(t => t.id === id);
          if (!task) return;
          
          const transitions = { open: ['in_progress'], in_progress: ['review', 'open'], review: ['done', 'in_progress'], done: [] };
          if (!transitions[task.status].includes(newStatus)) {
            alert('Invalid status transition');
            return;
          }

          task.status = newStatus;
          task.updatedAt = new Date();
          if (newStatus === 'done') {
            task.completedAt = new Date();
            task.duration = (task.completedAt - task.createdAt) / (1000 * 60 * 60);
          }
          saveTasks();
          renderTasks();
        };

        window.startEdit = function(id) {
          const form = document.getElementById('edit-form-' + id);
          form.classList.add('active');
        };

        window.cancelEdit = function(id) {
          const form = document.getElementById('edit-form-' + id);
          form.classList.remove('active');
        };

        window.saveEdit = function(id) {
          const task = tasks.find(t => t.id === id);
          if (!task) return;

          const title = document.getElementById('edit-title-' + id).value.trim();
          if (!title) { alert('Title is required'); return; }

          task.title = title;
          task.priority = document.getElementById('edit-priority-' + id).value;
          task.description = document.getElementById('edit-desc-' + id).value;
          task.assignee = document.getElementById('edit-assignee-' + id).value;
          
          const deadlineVal = document.getElementById('edit-deadline-' + id).value;
          task.deadline = deadlineVal ? new Date(deadlineVal) : null;
          
          task.updatedAt = new Date();

          saveTasks();
          renderTasks();
        };

        window.deleteTask = function(id) {
          showModal('Delete Task?', 'This task will be permanently removed.', function() {
            tasks = tasks.filter(t => t.id !== id);
            selectedIds = selectedIds.filter(sid => sid !== id);
            saveTasks();
            renderTasks();
          });
        };

        window.restoreTask = function(id) {
          const task = tasks.find(t => t.id === id);
          if (!task) return;
          delete task.archived;
          delete task.archivedAt;
          task.updatedAt = new Date();
          saveTasks();
          renderTasks();
        };

        window.toggleSelection = function(id) {
          if (selectedIds.includes(id)) {
            selectedIds = selectedIds.filter(sid => sid !== id);
          } else {
            selectedIds.push(id);
          }
          updateBulkBar();
          renderTasks();
        };

        // Modal
        function showModal(title, message, onConfirm) {
          document.getElementById('modal-title').textContent = title;
          document.getElementById('modal-message').textContent = message;
          document.getElementById('modal-overlay').style.display = 'flex';
          modalCallback = onConfirm;
        }

        document.getElementById('modal-cancel').onclick = function() {
          document.getElementById('modal-overlay').style.display = 'none';
          modalCallback = null;
        };

        document.getElementById('modal-confirm').onclick = function() {
          document.getElementById('modal-overlay').style.display = 'none';
          if (modalCallback) modalCallback();
          modalCallback = null;
        };

        document.getElementById('modal-overlay').onclick = function(e) {
          if (e.target === this) {
            document.getElementById('modal-overlay').style.display = 'none';
            modalCallback = null;
          }
        };

        // Create form
        document.getElementById('create-task-form').onsubmit = function(e) {
          e.preventDefault();
          
          const title = document.getElementById('task-title').value.trim();
          if (!title) { alert('Title is required'); return; }

          const task = {
            id: generateId(),
            title: title,
            description: document.getElementById('task-description').value,
            priority: document.getElementById('task-priority').value,
            status: 'open',
            assignee: document.getElementById('task-assignee').value || null,
            deadline: document.getElementById('task-deadline').value 
              ? new Date(document.getElementById('task-deadline').value) 
              : null,
            createdAt: new Date(),
            updatedAt: new Date()
          };

          tasks.push(task);
          saveTasks();
          
          // Reset form
          document.getElementById('task-title').value = '';
          document.getElementById('task-description').value = '';
          document.getElementById('task-deadline').value = '';
          document.getElementById('task-assignee').value = '';
          
          renderTasks();
        };

        // Tabs
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.onclick = function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            view = this.dataset.view;
            selectedIds = [];
            renderTasks();
          };
        });

        // Bulk actions
        document.getElementById('bulk-archive-btn').onclick = function() {
          tasks.forEach(t => {
            if (selectedIds.includes(t.id) && !t.archived) {
              t.archived = true;
              t.archivedAt = new Date();
              t.updatedAt = new Date();
            }
          });
          selectedIds = [];
          saveTasks();
          renderTasks();
        };

        document.getElementById('bulk-delete-btn').onclick = function() {
          showModal('Delete ' + selectedIds.length + ' Tasks?', 'These tasks will be permanently removed.', function() {
            tasks = tasks.filter(t => !selectedIds.includes(t.id));
            selectedIds = [];
            saveTasks();
            renderTasks();
          });
        };

        document.getElementById('bulk-clear-btn').onclick = function() {
          selectedIds = [];
          renderTasks();
        };

        // Initial render
        renderTasks();
      })();
    `;
  }
}

export function createDashboard(config?: DashboardConfig): TaskFlowDashboard {
  return new TaskFlowDashboard(config);
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'taskflow-dashboard-complete-working-v1',
  name: 'TaskFlow Dashboard (Complete Working)',
  risk_tier: 'high',
} as const;
