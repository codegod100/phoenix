/**
 * Dashboard Integration (IU-9)
 *
 * Wires all dashboard components (IU-3 through IU-8) into a complete
 * working single-page application.
 *
 * Responsibilities:
 * - Component composition (renders complete HTML page)
 * - Event flow management (handlers wire components together)
 * - State synchronization (localStorage as single source of truth)
 * - UI coordination (tabs, bulk bar, modals work together)
 *
 * Invariants:
 * - localStorage is the single source of truth
 * - All renders read fresh state from localStorage
 * - Write operations complete before re-render (synchronous)
 * - No external dependencies (all data from localStorage)
 */

import * as taskflow from './index.js';

// Re-export for server use
export { taskflow };

export interface DashboardConfig {
  title?: string;
  localStorageKey?: string;
}

/**
 * Complete working TaskFlow Dashboard
 * Implements all IU-9 integration requirements
 */
export class IntegratedDashboard {
  private config: Required<DashboardConfig>;

  constructor(config: DashboardConfig = {}) {
    this.config = {
      title: 'TaskFlow',
      localStorageKey: 'taskflow_tasks',
      ...config,
    };
  }

  /**
   * Render complete working HTML dashboard
   * Composes IU-3 (Page), IU-4 (Task List), IU-5 (Edit), IU-6 (Archive), IU-7 (Bulk), IU-8 (Analytics)
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
        <!-- IU-3: Header -->
        <!-- IU-3: Header with IU-8: Analytics Bar inline -->
        <header class="header">
            <h1>📋 ${this.config.title}</h1>
            <div class="analytics-bar" id="analytics-bar"></div>
        </header>

        <main class="main">
            <!-- IU-6: Archive Tabs (full width above content) -->
            <section class="tabs-section">
                <div class="archive-tabs">
                    <button class="tab-btn active" data-view="active">Active Tasks</button>
                    <button class="tab-btn" data-view="archived">Archived Tasks</button>
                </div>
            </section>

            <!-- IU-7: Bulk Action Bar (full width, shows when selectedIds.length > 0) -->
            <section class="bulk-bar" id="bulk-bar" style="display: none;">
                <span class="bulk-count"><span id="selected-count">0</span> selected</span>
                <button class="btn btn-warning" id="bulk-archive-btn">Archive</button>
                <button class="btn btn-success" id="bulk-restore-btn" style="display: none;">Restore</button>
                <button class="btn btn-danger" id="bulk-delete-btn">Delete</button>
                <button class="btn btn-secondary" id="bulk-clear-btn">Clear</button>
            </section>

            <!-- Two-column layout: Create Form (left) + Task Grid (right) -->
            <div class="content-layout">
                <!-- IU-5: Create Form (left column on desktop) -->
                <section class="create-section">
                    <h2>Create New Task</h2>
                    <form id="create-task-form" class="create-form">
                        <div class="form-row">
                            <input type="text" id="task-title" placeholder="Task title *" required class="input title-input">
                        </div>
                        <div class="form-row">
                            <select id="task-priority" class="input">
                                <option value="low">Low</option>
                                <option value="medium" selected>Medium</option>
                                <option value="high">High</option>
                                <option value="critical">Critical</option>
                            </select>
                            <input type="text" id="task-deadline" class="input date-picker-trigger" placeholder="Deadline (YYYY-MM-DD)" readonly>
                            <div class="custom-date-picker" id="create-date-picker" style="display: none;">
                                <div class="date-picker-header">
                                    <button class="date-nav" data-action="prev-month">‹</button>
                                    <span class="date-month-year" id="create-month-year"></span>
                                    <button class="date-nav" data-action="next-month">›</button>
                                </div>
                                <div class="date-picker-grid">
                                    <div class="date-weekday">Su</div><div class="date-weekday">Mo</div><div class="date-weekday">Tu</div>
                                    <div class="date-weekday">We</div><div class="date-weekday">Th</div><div class="date-weekday">Fr</div><div class="date-weekday">Sa</div>
                                </div>
                                <div class="date-days" id="create-date-days"></div>
                            </div>
                        </div>
                        <textarea id="task-description" placeholder="Description" rows="3" class="input"></textarea>
                        <input type="text" id="task-assignee" placeholder="Assignee" class="input">
                        <button type="submit" class="btn btn-primary">Create Task</button>
                    </form>
                </section>

                <!-- IU-4: Task Grid (right column on desktop) -->
                <section class="tasks-section">
                    <h2>Tasks</h2>
                    <div id="tasks-container">
                        <div class="empty-state">No tasks yet. Create one above!</div>
                    </div>
                </section>
            </div>
        </main>
    </div>

    <!-- IU-7: Confirmation Modal (custom overlay, not browser confirm) -->
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

  /**
   * IU-3: Generate CSS with Catppuccin theme
   */
  private generateCSS(): string {
    return `
      :root {
        --ctp-base: #1e1e2e;
        --ctp-surface0: #313244;
        --ctp-surface1: #45475a;
        --ctp-surface2: #585b70;
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
        margin-bottom: 24px;
        min-height: 32px;
      }

      .header h1 { 
        font-size: 1.5rem; 
        font-weight: 600; 
        margin: 0;
        white-space: nowrap;
      }

      /* IU-8: Analytics Bar inline with header title */
      .analytics-bar {
        display: flex;
        align-items: center;
        gap: 16px;
        font-size: 0.9rem;
        color: var(--ctp-subtext0);
        white-space: nowrap;
      }

      /* IU-9: Two-column layout (desktop: side by side, mobile: stacked) */
      .content-layout {
        display: grid;
        grid-template-columns: 320px 1fr;
        gap: 24px;
        align-items: start;
      }

      /* Align sections at same top height for symmetry */
      .create-section, .tasks-section {
        margin-top: 0;
        padding-top: 0;
        align-self: start;
      }

      .create-section h2, .tasks-section h2 {
        margin-top: 0;
        padding-top: 0;
        line-height: 1;
      }

      @media (max-width: 900px) {
        .content-layout {
          grid-template-columns: 1fr;
        }
      }

      .create-section { margin-bottom: 0; }
      .create-section h2 { font-size: 1.25rem; margin-bottom: 12px; }
      
      .tasks-section h2 { 
        font-size: 1.25rem; 
        margin-bottom: 12px; 
      }

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

      /* Date input styling with Catppuccin Mocha theme */
      input[type="date"] {
        background: var(--ctp-base);
        border: 1px solid var(--ctp-overlay0);
        border-radius: 6px;
        padding: 8px 12px;
        color: var(--ctp-text);
        font-size: 0.9rem;
        font-family: inherit;
        cursor: pointer;
        min-width: 140px;
      }

      input[type="date"]:focus {
        outline: none;
        border-color: var(--ctp-blue);
        box-shadow: 0 0 0 2px rgba(137, 180, 250, 0.2);
      }

      input[type="date"]:hover {
        border-color: var(--ctp-surface2);
      }

      /* Webkit date picker icon styling */
      input[type="date"]::-webkit-calendar-picker-indicator {
        filter: invert(1) brightness(0.8);
        opacity: 0.6;
        cursor: pointer;
        padding: 4px;
        border-radius: 4px;
        transition: opacity 0.2s, background 0.2s;
      }

      input[type="date"]::-webkit-calendar-picker-indicator:hover {
        opacity: 1;
        background: var(--ctp-surface0);
      }

      /* Firefox date input styling */
      input[type="date"]::-moz-calendar-picker-indicator {
        filter: invert(1) brightness(0.8);
        opacity: 0.6;
      }

      /* Custom Date Picker Component */
      .date-picker-trigger {
        cursor: pointer;
        background: var(--ctp-base) url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%23a6adc8' stroke-width='2'%3E%3Crect x='3' y='4' width='18' height='18' rx='2' ry='2'%3E%3C/rect%3E%3Cline x1='16' y1='2' x2='16' y2='6'%3E%3C/line%3E%3Cline x1='8' y1='2' x2='8' y2='6'%3E%3C/line%3E%3Cline x1='3' y1='10' x2='21' y2='10'%3E%3C/line%3E%3C/svg%3E") no-repeat right 12px center;
        background-size: 16px;
        padding-right: 36px;
      }

      .custom-date-picker {
        position: absolute;
        background: var(--ctp-surface0);
        border: 1px solid var(--ctp-surface1);
        border-radius: 8px;
        padding: 12px;
        box-shadow: 0 8px 24px rgba(0,0,0,0.4);
        z-index: 1000;
        min-width: 240px;
      }

      .date-picker-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-bottom: 12px;
        padding-bottom: 8px;
        border-bottom: 1px solid var(--ctp-surface1);
      }

      .date-month-year {
        font-weight: 600;
        color: var(--ctp-text);
        font-size: 0.95rem;
      }

      .date-nav {
        background: var(--ctp-surface1);
        border: none;
        border-radius: 4px;
        width: 28px;
        height: 28px;
        cursor: pointer;
        color: var(--ctp-text);
        font-size: 1rem;
        display: flex;
        align-items: center;
        justify-content: center;
      }

      .date-nav:hover {
        background: var(--ctp-surface2);
      }

      .date-picker-grid {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        text-align: center;
      }

      .date-weekday {
        font-size: 0.75rem;
        color: var(--ctp-subtext0);
        padding: 4px;
        font-weight: 500;
      }

      .date-days {
        display: grid;
        grid-template-columns: repeat(7, 1fr);
        gap: 4px;
        margin-top: 4px;
      }

      .date-day {
        aspect-ratio: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.85rem;
        color: var(--ctp-text);
        background: transparent;
        border: none;
      }

      .date-day:hover {
        background: var(--ctp-surface1);
      }

      .date-day.other-month {
        color: var(--ctp-subtext0);
        opacity: 0.5;
      }

      .date-day.selected {
        background: var(--ctp-blue);
        color: var(--ctp-base);
      }

      .date-day.today {
        border: 1px solid var(--ctp-blue);
      }

      .form-row {
        position: relative;
      }

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
        display: block;  /* Container is block, inner grid handles cards */
      }

      #tasks-container {
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
      .badge.status-archived { background: var(--ctp-surface2); color: var(--ctp-subtext0); text-decoration: line-through; }

      .archived-indicator {
        background: var(--ctp-surface2);
        color: var(--ctp-subtext0);
        padding: 2px 6px;
        border-radius: 4px;
        font-size: 0.65rem;
        margin-left: 8px;
      }

      .overdue-indicator {
        color: var(--ctp-red);
        font-weight: bold;
        font-size: 0.8rem;
        margin-left: 8px;
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

      .status-buttons { display: flex; gap: 4px; flex-wrap: wrap; }

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

      .action-buttons { display: flex; gap: 4px; }

      .action-btn { padding: 6px 10px; font-size: 0.8rem; }

      /* IU-5: Edit form (sibling of card-content, hidden by default) */
      .card-content { display: block; }
      .card-content.hidden { display: none; }

      .edit-form {
        display: none;
        padding: 12px;
        background: var(--ctp-surface1);
        border-radius: 6px;
        margin-top: 12px;
      }

      .edit-form.active { display: block; }

      .empty-state {
        grid-column: 1 / -1;
        text-align: center;
        padding: 48px;
        color: var(--ctp-subtext0);
      }

      /* IU-4a: Done tasks section styling - same grid as active */
      .done-section {
        grid-column: 1 / -1;
        margin-top: 24px;
        padding-top: 16px;
        border-top: 1px solid var(--ctp-surface1);
      }

      .done-heading {
        font-size: 1rem;
        font-weight: 600;
        color: var(--ctp-green);
        margin-bottom: 16px;
      }

      .done-tasks-grid {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
        gap: 16px;
      }

      /* IU-7: Modal overlay */
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
      .modal-actions { display: flex; justify-content: flex-end; gap: 12px; }

      @media (max-width: 768px) {
        .dashboard { padding: 16px; }
        #tasks-container { grid-template-columns: 1fr; }
        .done-tasks-grid { grid-template-columns: 1fr; }
        .form-row { flex-direction: column; }
        .header { flex-direction: column; gap: 8px; align-items: flex-start; }
        .analytics-bar { flex-wrap: wrap; gap: 8px 16px; }
      }
    `;
  }

  /**
   * Generate client-side JavaScript that wires all components together
   * Implements event flow, state management, and UI coordination per IU-9
   */
  private generateClientJS(): string {
    return `
      // IU-9: Dashboard Integration - Client-side wiring
      (function() {
        const STORAGE_KEY = '${this.config.localStorageKey}';
        let view = 'active'; // 'active' or 'archived'
        let selectedIds = [];
        let modalCallback = null;

        // Read from localStorage (single source of truth)
        function readTasks() {
          try {
            const data = localStorage.getItem(STORAGE_KEY);
            if (!data) return [];
            const tasks = JSON.parse(data);
            // Parse dates
            return tasks.map(t => ({
              ...t,
              createdAt: new Date(t.createdAt),
              updatedAt: new Date(t.updatedAt),
              deadline: t.deadline ? new Date(t.deadline) : null,
              completedAt: t.completedAt ? new Date(t.completedAt) : null,
              archivedAt: t.archivedAt ? new Date(t.archivedAt) : null
            }));
          } catch (e) {
            console.error('Error reading tasks:', e);
            return [];
          }
        }

        // Write to localStorage (synchronous, completes before re-render)
        function writeTasks(tasks) {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
        }

        // Generate unique ID
        function generateId() {
          return 'task-' + Date.now() + '-' + Math.random().toString(36).substr(2, 9);
        }

        // Check if task is overdue
        function isOverdue(task) {
          if (!task.deadline || task.status === 'done' || task.archived) return false;
          return new Date() > new Date(task.deadline);
        }

        // IU-4: Render task card
        function renderTaskCard(task) {
          const isArchived = !!task.archived;
          const isOverdueTask = isOverdue(task);
          const isSelected = selectedIds.includes(task.id);

          // Status transition buttons (only in active view)
          let statusButtons = '';
          if (view === 'active' && !isArchived) {
            const transitions = {
              open: ['in_progress'],
              in_progress: ['review', 'open'],
              review: ['done', 'in_progress'],
              done: ['open']
            }[task.status] || [];
            statusButtons = transitions.map(s => 
              \`<button class="status-btn" data-action="transition" data-id="\${task.id}" data-status="\${s}">→ \${s.replace('_', ' ')}</button>\`
            ).join('');
          }

          // Action buttons (edit/delete for active, restore for archived)
          let actionButtons = '';
          if (view === 'archived') {
            actionButtons = \`<button class="btn btn-success action-btn" data-action="restore" data-id="\${task.id}">Restore</button>\`;
          } else {
            actionButtons = \`
              <button class="btn btn-primary action-btn" data-action="edit" data-id="\${task.id}">Edit</button>
              <button class="btn btn-danger action-btn" data-action="delete" data-id="\${task.id}">🗑️</button>
            \`;
          }

          // Badges
          const priorityColors = {
            critical: '#f38ba8', high: '#fab387', medium: '#f9e2af', low: '#a6e3a1'
          };
          const statusColors = {
            open: '#6c7086', in_progress: '#89b4fa', review: '#cba6f7', done: '#a6e3a1'
          };

          // IU-6: Archived indicator in active tab
          const archivedBadge = (isArchived && view === 'active') 
            ? '<span class="archived-indicator">archived</span>' 
            : '';
          const overdueBadge = isOverdueTask 
            ? '<span class="overdue-indicator">OVERDUE</span>' 
            : '';

          // IU-6: Status badge (dimmed strikethrough if archived in active view)
          const statusBadge = (isArchived && view === 'active')
            ? '<span class="badge status-archived">archived</span>'
            : \`<span class="badge status-\${task.status}" style="background:\${statusColors[task.status]}">\${task.status.replace('_', ' ')}</span>\`;

          // IU-6: Archived tab shows original status + indicator
          const archivedIndicator = (isArchived && view === 'archived')
            ? '<span class="archived-indicator">📦</span>'
            : '';

          return \`
            <div class="task-card \${isOverdueTask ? 'overdue' : ''} \${isArchived ? 'archived' : ''}" data-id="\${task.id}">
              <div class="task-header">
                <div class="task-title-area">
                  <input type="checkbox" class="task-checkbox" \${isSelected ? 'checked' : ''} data-action="select" data-id="\${task.id}">
                  <h3 class="task-title">
                    \${escapeHtml(task.title)}
                    \${archivedBadge}
                    \${overdueBadge}
                    \${archivedIndicator}
                  </h3>
                </div>
                <div class="task-badges">
                  <span class="badge priority-\${task.priority}" style="background:\${priorityColors[task.priority]}">\${task.priority}</span>
                  \${statusBadge}
                </div>
              </div>
              <div class="card-content" id="content-\${task.id}">
                <div class="task-description">\${escapeHtml(task.description || '')}</div>
                <div class="task-meta">
                  <span>👤 \${escapeHtml(task.assignee || 'Unassigned')}</span>
                  <span>📅 \${task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}</span>
                </div>
                <div class="task-actions">
                  <div class="status-buttons">\${statusButtons}</div>
                  <div class="action-buttons">\${actionButtons}</div>
                </div>
              </div>
              <!-- IU-5: Edit form (sibling, not nested) -->
              <div class="edit-form" id="edit-form-\${task.id}">
                <div class="form-row">
                  <input type="text" id="edit-title-\${task.id}" value="\${escapeHtml(task.title)}" class="input title-input">
                  <select id="edit-priority-\${task.id}" class="input">
                    <option value="low" \${task.priority === 'low' ? 'selected' : ''}>Low</option>
                    <option value="medium" \${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                    <option value="high" \${task.priority === 'high' ? 'selected' : ''}>High</option>
                    <option value="critical" \${task.priority === 'critical' ? 'selected' : ''}>Critical</option>
                  </select>
                </div>
                <textarea id="edit-desc-\${task.id}" class="input" rows="2">\${escapeHtml(task.description || '')}</textarea>
                <div class="form-row">
                  <input type="text" id="edit-deadline-\${task.id}" value="\${task.deadline ? new Date(task.deadline).toISOString().split('T')[0] : ''}" class="input date-picker-trigger edit-date-trigger" placeholder="Deadline (YYYY-MM-DD)" readonly>
                  <div class="custom-date-picker edit-date-picker" id="edit-date-picker-\${task.id}" style="display: none;">
                    <div class="date-picker-header">
                      <button class="date-nav" data-action="prev-month">‹</button>
                      <span class="date-month-year" id="edit-month-year-\${task.id}"></span>
                      <button class="date-nav" data-action="next-month">›</button>
                    </div>
                    <div class="date-picker-grid">
                      <div class="date-weekday">Su</div><div class="date-weekday">Mo</div><div class="date-weekday">Tu</div>
                      <div class="date-weekday">We</div><div class="date-weekday">Th</div><div class="date-weekday">Fr</div><div class="date-weekday">Sa</div>
                    </div>
                    <div class="date-days" id="edit-date-days-\${task.id}"></div>
                  </div>
                  <input type="text" id="edit-assignee-\${task.id}" value="\${escapeHtml(task.assignee || '')}" placeholder="Assignee" class="input">
                </div>
                <div class="form-row">
                  <button class="btn btn-secondary" data-action="cancel-edit" data-id="\${task.id}">Cancel</button>
                  <button class="btn btn-primary" data-action="save-edit" data-id="\${task.id}">Save</button>
                </div>
              </div>
            </div>
          \`;
        }

        // Custom Date Picker Component (supports multiple instances)
        const datePickerInstances = new Map();

        function initDatePicker(triggerId, pickerId) {
          const trigger = document.getElementById(triggerId);
          const picker = document.getElementById(pickerId);
          if (!trigger || !picker) return;

          // Store instance-specific state
          datePickerInstances.set(pickerId, {
            currentMonth: new Date(),
            selectedDate: trigger.value ? new Date(trigger.value) : null,
            inputId: triggerId,
            pickerId: pickerId
          });

          trigger.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            // Hide other pickers
            document.querySelectorAll('.custom-date-picker').forEach(p => {
              if (p.id !== pickerId) p.style.display = 'none';
            });
            const state = datePickerInstances.get(pickerId);
            if (trigger.value) state.selectedDate = new Date(trigger.value);
            renderDatePicker(picker, state);
            picker.style.display = picker.style.display === 'none' ? 'block' : 'none';
          });

          // Close picker when clicking outside
          document.addEventListener('click', (e) => {
            if (!picker.contains(e.target) && e.target !== trigger) {
              picker.style.display = 'none';
            }
          });

          // Navigation buttons
          picker.querySelectorAll('.date-nav').forEach(btn => {
            btn.addEventListener('click', (e) => {
              e.stopPropagation();
              const state = datePickerInstances.get(pickerId);
              const action = btn.dataset.action;
              if (action === 'prev-month') {
                state.currentMonth.setMonth(state.currentMonth.getMonth() - 1);
              } else if (action === 'next-month') {
                state.currentMonth.setMonth(state.currentMonth.getMonth() + 1);
              }
              renderDatePicker(picker, state);
            });
          });
        }

        function renderDatePicker(picker, state) {
          const year = state.currentMonth.getFullYear();
          const month = state.currentMonth.getMonth();
          const monthYearEl = picker.querySelector('.date-month-year');
          const daysEl = picker.querySelector('.date-days');
          
          if (monthYearEl) {
            monthYearEl.textContent = new Date(year, month).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
          }
          
          if (!daysEl) return;
          
          const firstDay = new Date(year, month, 1).getDay();
          const daysInMonth = new Date(year, month + 1, 0).getDate();
          const daysInPrevMonth = new Date(year, month, 0).getDate();
          
          let html = '';
          
          // Previous month days
          for (let i = firstDay - 1; i >= 0; i--) {
            const prevMonth = month === 0 ? 11 : month - 1;
            const prevYear = month === 0 ? year - 1 : year;
            html += \`<button class="date-day other-month" data-date="\${prevYear}-\${String(prevMonth + 1).padStart(2,'0')}-\${String(daysInPrevMonth - i).padStart(2,'0')}">\${daysInPrevMonth - i}</button>\`;
          }
          
          // Current month days
          const today = new Date();
          for (let i = 1; i <= daysInMonth; i++) {
            const date = new Date(year, month, i);
            const dateStr = date.toISOString().split('T')[0];
            const isSelected = state.selectedDate && date.toDateString() === state.selectedDate.toDateString();
            const isToday = date.toDateString() === today.toDateString();
            let className = 'date-day';
            if (isSelected) className += ' selected';
            if (isToday) className += ' today';
            html += \`<button class="\${className}" data-date="\${dateStr}">\${i}</button>\`;
          }
          
          // Next month days
          const totalCells = Math.ceil((firstDay + daysInMonth) / 7) * 7;
          const remainingCells = totalCells - firstDay - daysInMonth;
          for (let i = 1; i <= remainingCells; i++) {
            const nextMonth = month === 11 ? 0 : month + 1;
            const nextYear = month === 11 ? year + 1 : year;
            html += \`<button class="date-day other-month" data-date="\${nextYear}-\${String(nextMonth + 1).padStart(2,'0')}-\${String(i).padStart(2,'0')}">\${i}</button>\`;
          }
          
          daysEl.innerHTML = html;
          
          // Add click handlers to days
          daysEl.querySelectorAll('.date-day').forEach(day => {
            day.addEventListener('click', (e) => {
              e.stopPropagation();
              const dateStr = day.dataset.date;
              const input = document.getElementById(state.inputId);
              if (input) input.value = dateStr;
              picker.style.display = 'none';
              state.selectedDate = new Date(dateStr);
            });
          });
        }

        function escapeHtml(text) {
          if (!text) return '';
          const div = document.createElement('div');
          div.textContent = text;
          return div.innerHTML;
        }

        // IU-4, IU-6: Render tasks based on current view
        // IU-4a: Separate done tasks section in active tab
        function renderTasks() {
          const container = document.getElementById('tasks-container');
          const tasks = readTasks();
          
          if (view === 'archived') {
            const archived = tasks.filter(t => t.archived);
            if (archived.length === 0) {
              container.innerHTML = \`<div class="empty-state">No archived tasks</div>\`;
            } else {
              container.innerHTML = archived.map(renderTaskCard).join('');
            }
          } else {
            // Active view: separate done tasks from active
            const active = tasks.filter(t => !t.archived);
            const notDone = active.filter(t => t.status !== 'done');
            const done = active.filter(t => t.status === 'done');
            
            let html = '';
            
            // Active tasks section
            if (notDone.length === 0) {
              html += \`<div class="empty-state">No active tasks. Create one above!</div>\`;
            } else {
              html += notDone.map(renderTaskCard).join('');
            }
            
            // Done tasks section
            if (done.length > 0) {
              html += \`
                <div class="done-section">
                  <h3 class="done-heading">✓ Completed</h3>
                  <div class="done-tasks-grid">
                    \${done.map(renderTaskCard).join('')}
                  </div>
                </div>
              \`;
            }
            
            container.innerHTML = html;
          }

          // IU-8: Recalculate and render analytics bar
          renderAnalyticsBar(tasks);
          // IU-7: Update bulk bar visibility
          updateBulkBar();
        }

        // IU-8: Render analytics bar with metrics (inline with header)
        function renderAnalyticsBar(tasks) {
          const active = tasks.filter(t => !t.archived);
          const completed = active.filter(t => t.status === 'done').length;
          const overdue = active.filter(t => isOverdue(t)).length;
          const archived = tasks.filter(t => t.archived).length;
          const rate = active.length > 0 ? Math.round((completed / active.length) * 100) : 0;

          const bar = document.getElementById('analytics-bar');
          if (bar) {
            bar.innerHTML = \`
              <span>\${active.length} active</span>
              <span>\${completed} done</span>
              <span>\${overdue} overdue</span>
              <span>\${archived} archived</span>
              <span>\${rate}% complete</span>
            \`;
          }
        }

        // IU-7: Update bulk action bar
        function updateBulkBar() {
          const bar = document.getElementById('bulk-bar');
          const count = document.getElementById('selected-count');
          const archiveBtn = document.getElementById('bulk-archive-btn');
          const restoreBtn = document.getElementById('bulk-restore-btn');

          count.textContent = selectedIds.length;
          bar.style.display = selectedIds.length > 0 ? 'flex' : 'none';

          // Disable archive in archived view, disable restore in active view
          if (archiveBtn) archiveBtn.style.display = view === 'active' ? 'block' : 'none';
          if (restoreBtn) restoreBtn.style.display = view === 'archived' ? 'block' : 'none';
        }

        // IU-7: Modal handling
        function showModal(title, message, onConfirm) {
          document.getElementById('modal-title').textContent = title;
          document.getElementById('modal-message').textContent = message;
          document.getElementById('modal-overlay').style.display = 'flex';
          modalCallback = onConfirm;
        }

        function hideModal() {
          document.getElementById('modal-overlay').style.display = 'none';
          modalCallback = null;
        }

        // Event delegation for all actions
        document.addEventListener('click', function(e) {
          const target = e.target.closest('[data-action]');
          if (!target) return;

          const action = target.dataset.action;
          const id = target.dataset.id;

          switch (action) {
            // IU-5: Edit button - hide content, show edit form
            case 'edit':
              document.getElementById('content-' + id).classList.add('hidden');
              document.getElementById('edit-form-' + id).classList.add('active');
              // Initialize date picker for this edit form
              setTimeout(() => initDatePicker('edit-deadline-' + id, 'edit-date-picker-' + id), 0);
              break;

            // IU-5: Cancel edit - restore card view
            case 'cancel-edit':
              document.getElementById('content-' + id).classList.remove('hidden');
              document.getElementById('edit-form-' + id).classList.remove('active');
              break;

            // IU-5: Save edit - update localStorage then re-render
            case 'save-edit':
              const tasks = readTasks();
              const task = tasks.find(t => t.id === id);
              if (task) {
                const title = document.getElementById('edit-title-' + id).value.trim();
                if (!title) { alert('Title is required'); return; }
                task.title = title;
                task.priority = document.getElementById('edit-priority-' + id).value;
                task.description = document.getElementById('edit-desc-' + id).value;
                task.assignee = document.getElementById('edit-assignee-' + id).value;
                const deadlineVal = document.getElementById('edit-deadline-' + id).value;
                task.deadline = deadlineVal ? new Date(deadlineVal) : null;
                task.updatedAt = new Date();
                writeTasks(tasks); // Write before re-render
                renderTasks(); // Re-render after write completes
              }
              break;

            // IU-4: Status transition - update, write, re-render
            case 'transition':
              const newStatus = target.dataset.status;
              const allTasks = readTasks();
              const t = allTasks.find(task => task.id === id);
              if (t) {
                t.status = newStatus;
                t.updatedAt = new Date();
                if (newStatus === 'done') {
                  t.completedAt = new Date();
                }
                writeTasks(allTasks);
                renderTasks();
              }
              break;

            // IU-7: Bulk selection toggle
            case 'select':
              if (selectedIds.includes(id)) {
                selectedIds = selectedIds.filter(sid => sid !== id);
              } else {
                selectedIds.push(id);
              }
              renderTasks(); // Re-render to update checkbox state
              break;

            // IU-7, IU-6: Delete with confirmation
            case 'delete':
              showModal('Delete Task?', 'This task will be permanently removed.', function() {
                const currentTasks = readTasks();
                const filtered = currentTasks.filter(t => t.id !== id);
                selectedIds = selectedIds.filter(sid => sid !== id);
                writeTasks(filtered);
                renderTasks();
              });
              break;

            // IU-6: Archive/Restore
            case 'restore':
              const rt = readTasks();
              const rtTask = rt.find(t => t.id === id);
              if (rtTask) {
                delete rtTask.archived;
                delete rtTask.archivedAt;
                rtTask.updatedAt = new Date();
                writeTasks(rt);
                renderTasks();
              }
              break;
          }
        });

        // IU-5: Create form submission
        document.getElementById('create-task-form').addEventListener('submit', function(e) {
          e.preventDefault();
          
          const title = document.getElementById('task-title').value.trim();
          if (!title) { alert('Title is required'); return; }

          const newTask = {
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

          const tasks = readTasks();
          tasks.push(newTask);
          writeTasks(tasks);
          
          // Reset form
          document.getElementById('task-title').value = '';
          document.getElementById('task-description').value = '';
          document.getElementById('task-deadline').value = '';
          document.getElementById('task-assignee').value = '';
          
          renderTasks();
        });

        // IU-6: Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
          btn.addEventListener('click', function() {
            document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            this.classList.add('active');
            view = this.dataset.view;
            selectedIds = []; // Clear selection on tab switch
            renderTasks();
          });
        });

        // IU-7: Bulk actions
        document.getElementById('bulk-archive-btn')?.addEventListener('click', function() {
          const tasks = readTasks();
          tasks.forEach(t => {
            if (selectedIds.includes(t.id) && !t.archived) {
              t.archived = true;
              t.archivedAt = new Date();
              t.updatedAt = new Date();
            }
          });
          selectedIds = [];
          writeTasks(tasks);
          renderTasks();
        });

        document.getElementById('bulk-restore-btn')?.addEventListener('click', function() {
          const tasks = readTasks();
          tasks.forEach(t => {
            if (selectedIds.includes(t.id) && t.archived) {
              delete t.archived;
              delete t.archivedAt;
              t.updatedAt = new Date();
            }
          });
          selectedIds = [];
          writeTasks(tasks);
          renderTasks();
        });

        document.getElementById('bulk-delete-btn')?.addEventListener('click', function() {
          showModal('Delete ' + selectedIds.length + ' Tasks?', 'These tasks will be permanently removed.', function() {
            const tasks = readTasks().filter(t => !selectedIds.includes(t.id));
            selectedIds = [];
            writeTasks(tasks);
            renderTasks();
          });
        });

        document.getElementById('bulk-clear-btn')?.addEventListener('click', function() {
          selectedIds = [];
          renderTasks();
        });

        // IU-7: Modal handlers
        document.getElementById('modal-cancel').addEventListener('click', hideModal);
        document.getElementById('modal-confirm').addEventListener('click', function() {
          if (modalCallback) modalCallback();
          hideModal();
        });
        document.getElementById('modal-overlay').addEventListener('click', function(e) {
          if (e.target === this) hideModal(); // Click outside to cancel
        });
        document.addEventListener('keydown', function(e) {
          if (e.key === 'Escape' && document.getElementById('modal-overlay').style.display === 'flex') {
            hideModal(); // Escape to cancel
          }
        });

        // IU-4: Immediate display on page load
        // Initialize custom date pickers
        initDatePicker('task-deadline', 'create-date-picker');
        renderTasks();
      })();
    `;
  }
}

/**
 * Factory function to create integrated dashboard
 */
export function createIntegratedDashboard(config?: DashboardConfig): IntegratedDashboard {
  return new IntegratedDashboard(config);
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'iu-9-dashboard-integration-39-reqs',
  name: 'Dashboard Integration (IU-9)',
  risk_tier: 'high',
} as const;
