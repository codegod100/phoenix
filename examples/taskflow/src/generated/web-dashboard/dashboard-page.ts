export interface Task {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'review' | 'done';
  assignee?: string;
  deadline?: string;
  createdAt: Date;
  updatedAt: Date;
  archived?: boolean;
  editHistory?: EditRecord[];
}

export interface EditRecord {
  timestamp: Date;
  field: string;
  oldValue: string;
  newValue: string;
}

export interface DashboardState {
  tasks: Task[];
  selectedIds: string[];
  view: 'active' | 'archived';
}

export class DashboardPage {
  private tasks: Task[] = [];
  private selectedIds: string[] = [];
  private view: 'active' | 'archived' = 'active';
  private taskIdCounter = 1;

  public addTask(title: string, description: string, priority: Task['priority'], deadline?: string, assignee?: string): Task {
    if (!title.trim()) {
      throw new Error('Task title cannot be empty');
    }

    const task: Task = {
      id: `task-${this.taskIdCounter++}`,
      title: title.trim(),
      description: description.trim(),
      priority,
      status: 'open',
      assignee: assignee?.trim() || undefined,
      deadline: deadline || undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      archived: false,
      editHistory: []
    };

    this.tasks.push(task);
    return task;
  }

  public getTasks(): Task[] {
    return this.tasks.filter(t => t.archived === (this.view === 'archived'));
  }

  public getAllTasks(): Task[] {
    return [...this.tasks];
  }

  public getTaskCount(): number {
    return this.getTasks().length;
  }

  public getStats() {
    const all = this.tasks;
    const completed = all.filter(t => t.status === 'done' && !t.archived).length;
    const overdue = all.filter(t => {
      if (t.status === 'done' || t.archived) return false;
      if (!t.deadline) return false;
      return new Date(t.deadline) < new Date();
    }).length;
    return {
      total: all.filter(t => !t.archived).length,
      completed,
      overdue,
      completionRate: all.filter(t => !t.archived).length > 0 
        ? Math.round((completed / all.filter(t => !t.archived).length) * 100) 
        : 0
    };
  }

  public updateTask(id: string, updates: Partial<Task>): Task | null {
    const task = this.tasks.find(t => t.id === id);
    if (!task) return null;

    const editHistory = task.editHistory || [];
    
    for (const [key, value] of Object.entries(updates)) {
      if (key !== 'id' && key !== 'createdAt' && task[key as keyof Task] !== value) {
        editHistory.push({
          timestamp: new Date(),
          field: key,
          oldValue: String(task[key as keyof Task] || ''),
          newValue: String(value)
        });
      }
    }

    Object.assign(task, updates, { updatedAt: new Date(), editHistory });
    return task;
  }

  public deleteTask(id: string): boolean {
    const index = this.tasks.findIndex(t => t.id === id);
    if (index === -1) return false;
    this.tasks.splice(index, 1);
    this.selectedIds = this.selectedIds.filter(sid => sid !== id);
    return true;
  }

  public bulkDelete(ids: string[]): number {
    let count = 0;
    ids.forEach(id => {
      if (this.deleteTask(id)) count++;
    });
    return count;
  }

  public archiveTask(id: string): boolean {
    const task = this.tasks.find(t => t.id === id);
    if (!task || task.archived) return false;
    task.archived = true;
    task.updatedAt = new Date();
    return true;
  }

  public bulkArchive(ids: string[]): number {
    let count = 0;
    ids.forEach(id => {
      if (this.archiveTask(id)) count++;
    });
    this.selectedIds = [];
    return count;
  }

  public restoreTask(id: string): boolean {
    const task = this.tasks.find(t => t.id === id);
    if (!task || !task.archived) return false;
    task.archived = false;
    task.updatedAt = new Date();
    return true;
  }

  public toggleSelection(id: string) {
    if (this.selectedIds.includes(id)) {
      this.selectedIds = this.selectedIds.filter(sid => sid !== id);
    } else {
      this.selectedIds.push(id);
    }
  }

  public clearSelection() {
    this.selectedIds = [];
  }

  public setView(view: 'active' | 'archived') {
    this.view = view;
  }

  public renderHTML(): string {
    const stats = this.getStats();
    const tasks = this.getTasks();
    
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>TaskFlow Dashboard</title>
    <style>
        :root {
            /* Catppuccin Mocha Palette */
            --ctp-base: #1e1e2e;
            --ctp-surface0: #313244;
            --ctp-surface1: #45475a;
            --ctp-surface2: #585b70;
            --ctp-text: #cdd6f4;
            --ctp-subtext0: #a6adc8;
            --ctp-subtext1: #bac2de;
            --ctp-overlay0: #6c7086;
            --ctp-overlay1: #7f849c;
            --ctp-blue: #89b4fa;
            --ctp-lavender: #b4befe;
            --ctp-sapphire: #74c7ec;
            --ctp-sky: #89dceb;
            --ctp-teal: #94e2d5;
            --ctp-green: #a6e3a1;
            --ctp-yellow: #f9e2af;
            --ctp-peach: #fab387;
            --ctp-maroon: #eba0ac;
            --ctp-red: #f38ba8;
            --ctp-mauve: #cba6f7;
            --ctp-pink: #f5c2e7;
            --ctp-flamingo: #f2cdcd;
            --ctp-rosewater: #f5e0dc;
            
            /* Semantic mappings */
            --background: var(--ctp-base);
            --surface: var(--ctp-surface0);
            --surface-hover: var(--ctp-surface1);
            --text: var(--ctp-text);
            --text-secondary: var(--ctp-subtext0);
            --border: var(--ctp-surface1);
            --primary: var(--ctp-blue);
            --primary-hover: var(--ctp-lavender);
            --success: var(--ctp-green);
            --warning: var(--ctp-yellow);
            --danger: var(--ctp-red);
            --info: var(--ctp-sapphire);
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: var(--background);
            color: var(--text);
            line-height: 1.6;
            min-height: 100vh;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
            padding: 1rem;
        }

        /* Header */
        .header {
            background: var(--surface);
            border-bottom: 1px solid var(--border);
            padding: 1rem 0;
            margin-bottom: 2rem;
        }

        .header-content {
            display: flex;
            justify-content: space-between;
            align-items: center;
            flex-wrap: wrap;
            gap: 1rem;
        }

        .logo {
            font-size: 1.5rem;
            font-weight: bold;
            color: var(--primary);
        }

        /* Status Bar - Compact inline metrics */
        .status-bar-wrapper {
            display: flex;
            justify-content: center;
            margin-bottom: 1rem;
        }

        .status-bar {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 6px;
            padding: 0.5rem 1rem;
            display: inline-flex;
            align-items: center;
            gap: 0.75rem;
            font-size: 0.9rem;
            max-height: 48px;
            width: fit-content;
        }

        .status-bar .metric {
            display: flex;
            align-items: center;
            gap: 0.35rem;
        }

        .status-bar .metric-value {
            font-weight: 600;
            color: var(--text);
        }

        .status-bar .metric-label {
            color: var(--text-secondary);
        }

        .status-bar .separator {
            color: var(--ctp-overlay0);
            margin: 0 0.25rem;
        }

        /* View Tabs */
        .view-tabs {
            display: flex;
            gap: 0.5rem;
            margin-bottom: 1rem;
        }

        .tab-btn {
            padding: 0.5rem 1rem;
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text);
            border-radius: 6px;
            cursor: pointer;
            transition: all 0.2s;
        }

        .tab-btn.active {
            background: var(--primary);
            color: var(--ctp-base);
            border-color: var(--primary);
        }

        .tab-btn:hover:not(.active) {
            background: var(--surface-hover);
        }

        /* Bulk Action Bar */
        .bulk-action-bar {
            display: none;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 0.75rem 1rem;
            margin-bottom: 1rem;
            align-items: center;
            gap: 1rem;
        }

        .bulk-action-bar.visible {
            display: flex;
        }

        .selected-count {
            font-weight: 600;
            color: var(--primary);
        }

        /* Layout */
        .main-content {
            display: grid;
            grid-template-columns: 1fr 2fr;
            gap: 2rem;
        }

        @media (max-width: 768px) {
            .main-content {
                grid-template-columns: 1fr;
            }
        }

        /* Forms */
        .form-section {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1.5rem;
            height: fit-content;
        }

        .form-section h2 {
            color: var(--text);
            margin-bottom: 1rem;
            font-size: 1.25rem;
        }

        .form-group {
            margin-bottom: 1rem;
        }

        .form-group label {
            display: block;
            margin-bottom: 0.5rem;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 0.75rem;
            border: 1px solid var(--border);
            border-radius: 6px;
            background: var(--background);
            color: var(--text);
            font-size: 0.95rem;
        }

        .form-group input:focus,
        .form-group select:focus,
        .form-group textarea:focus {
            outline: none;
            border-color: var(--primary);
        }

        .error-message {
            color: var(--danger);
            font-size: 0.85rem;
            margin-top: 0.25rem;
            display: none;
        }

        .error-message.visible {
            display: block;
        }

        /* Buttons */
        .btn {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.95rem;
            transition: all 0.2s;
            font-weight: 500;
        }

        .btn-primary {
            background: var(--primary);
            color: var(--ctp-base);
        }

        .btn-primary:hover {
            background: var(--primary-hover);
        }

        .btn-danger {
            background: var(--danger);
            color: var(--ctp-base);
        }

        .btn-danger:hover {
            background: #f5a3b8;
        }

        .btn-secondary {
            background: var(--surface-hover);
            color: var(--text);
            border: 1px solid var(--border);
        }

        .btn-secondary:hover {
            background: var(--ctp-overlay0);
        }

        .btn-small {
            padding: 0.4rem 0.75rem;
            font-size: 0.85rem;
        }

        /* Task List */
        .task-list {
            display: flex;
            flex-direction: column;
            gap: 1rem;
        }

        .task-card {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem;
            transition: all 0.2s;
            position: relative;
        }

        .task-card:hover {
            border-color: var(--primary);
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        }

        .task-card.overdue {
            border-color: var(--danger);
            border-width: 2px;
        }

        .task-card-header {
            display: flex;
            align-items: center;
            gap: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .task-checkbox {
            width: 18px;
            height: 18px;
            cursor: pointer;
            accent-color: var(--primary);
        }

        .task-title {
            font-weight: 600;
            font-size: 1.1rem;
            color: var(--text);
            flex: 1;
        }

        .task-actions {
            display: flex;
            gap: 0.5rem;
        }

        .btn-edit {
            background: var(--info);
            color: var(--ctp-base);
            border: none;
            padding: 0.4rem 0.75rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
        }

        .btn-edit:hover {
            background: var(--ctp-sky);
        }

        .btn-delete {
            background: var(--danger);
            color: var(--ctp-base);
            border: none;
            padding: 0.4rem 0.75rem;
            border-radius: 6px;
            cursor: pointer;
            font-size: 0.85rem;
        }

        .btn-delete:hover {
            background: #f5a3b8;
        }

        .task-description {
            color: var(--text-secondary);
            margin-bottom: 0.75rem;
            line-height: 1.5;
        }

        .task-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 0.75rem;
            align-items: center;
        }

        /* Priority Badges */
        .badge {
            padding: 0.25rem 0.75rem;
            border-radius: 4px;
            font-size: 0.8rem;
            font-weight: 600;
            text-transform: uppercase;
        }

        .priority-critical {
            background: var(--danger);
            color: var(--ctp-base);
        }

        .priority-high {
            background: var(--ctp-peach);
            color: var(--ctp-base);
        }

        .priority-medium {
            background: var(--warning);
            color: var(--ctp-base);
        }

        .priority-low {
            background: var(--success);
            color: var(--ctp-base);
        }

        /* Status Badges */
        .status-open {
            background: var(--ctp-overlay0);
            color: var(--text);
        }

        .status-in_progress {
            background: var(--primary);
            color: var(--ctp-base);
        }

        .status-review {
            background: var(--ctp-mauve);
            color: var(--ctp-base);
        }

        .status-done {
            background: var(--success);
            color: var(--ctp-base);
        }

        .overdue-badge {
            background: var(--danger);
            color: var(--ctp-base);
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.7; }
        }

        /* Modals */
        .modal-overlay {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 1000;
            justify-content: center;
            align-items: center;
        }

        .modal-overlay.active {
            display: flex;
        }

        .modal {
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 12px;
            padding: 1.5rem;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal h3 {
            color: var(--text);
            margin-bottom: 1rem;
        }

        /* Inline Edit Panel */
        .edit-panel {
            display: none;
            background: var(--surface);
            border: 1px solid var(--border);
            border-radius: 8px;
            padding: 1rem;
            margin-top: 0.75rem;
        }

        .edit-panel.active {
            display: block;
        }

        .edit-panel .form-row {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 0.75rem;
            margin-bottom: 0.75rem;
        }

        .edit-panel .form-group {
            margin-bottom: 0.5rem;
        }

        .edit-panel .form-group label {
            display: block;
            font-size: 0.85rem;
            color: var(--text-secondary);
            margin-bottom: 0.25rem;
        }

        .edit-panel .form-group input,
        .edit-panel .form-group select,
        .edit-panel .form-group textarea {
            width: 100%;
            padding: 0.4rem 0.6rem;
            font-size: 0.9rem;
        }

        .edit-panel .panel-actions {
            display: flex;
            gap: 0.5rem;
            justify-content: flex-end;
            margin-top: 0.75rem;
            padding-top: 0.75rem;
            border-top: 1px solid var(--border);
        }

        .modal-actions {
            display: flex;
            gap: 0.75rem;
            justify-content: flex-end;
            margin-top: 1.5rem;
        }

        .empty-state {
            text-align: center;
            padding: 3rem;
            color: var(--text-secondary);
        }

        .empty-state-icon {
            font-size: 3rem;
            margin-bottom: 1rem;
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="container">
            <div class="header-content">
                <div class="logo">📋 TaskFlow</div>
            </div>
        </div>
    </header>

    <main class="container">
        <!-- Status Bar -->
        <div class="status-bar-wrapper">
            <div class="status-bar">
                <span class="metric">
                    <span>📊</span>
                    <span class="metric-value">${stats.total}</span>
                    <span class="metric-label">tasks</span>
                </span>
                <span class="separator">•</span>
                <span class="metric">
                    <span>✅</span>
                    <span class="metric-value">${stats.completed}</span>
                    <span class="metric-label">done</span>
                </span>
                <span class="separator">•</span>
                <span class="metric">
                    <span>⚠️</span>
                    <span class="metric-value">${stats.overdue}</span>
                    <span class="metric-label">overdue</span>
                </span>
                <span class="separator">•</span>
                <span class="metric">
                    <span>📈</span>
                    <span class="metric-value">${stats.completionRate}%</span>
                </span>
            </div>
        </div>

        <!-- View Tabs -->
        <div class="view-tabs">
            <button class="tab-btn ${this.view === 'active' ? 'active' : ''}" onclick="setView('active')">Active Tasks</button>
            <button class="tab-btn ${this.view === 'archived' ? 'active' : ''}" onclick="setView('archived')">Archived</button>
        </div>

        <!-- Bulk Action Bar -->
        <div id="bulkActionBar" class="bulk-action-bar">
            <span class="selected-count"><span id="selectedCount">0</span> selected</span>
            ${this.view === 'active' ? `
            <button class="btn btn-secondary btn-small" onclick="bulkArchive()">📦 Archive Selected</button>
            ` : `
            <button class="btn btn-secondary btn-small" onclick="bulkRestore()">♻️ Restore Selected</button>
            `}
            <button class="btn btn-danger btn-small" onclick="bulkDelete()">🗑️ Delete Selected</button>
            <button class="btn btn-secondary btn-small" onclick="clearSelection()">Clear</button>
        </div>

        <div class="main-content">
            <!-- Task Form -->
            <section class="form-section">
                <h2>Create New Task</h2>
                <form id="taskForm">
                    <div class="form-group">
                        <label for="title">Title *</label>
                        <input type="text" id="title" name="title" required placeholder="Enter task title">
                        <div id="titleError" class="error-message">Title cannot be empty</div>
                    </div>
                    <div class="form-group">
                        <label for="description">Description</label>
                        <textarea id="description" name="description" rows="3" placeholder="Enter task description"></textarea>
                    </div>
                    <div class="form-group">
                        <label for="priority">Priority</label>
                        <select id="priority" name="priority">
                            <option value="low">Low</option>
                            <option value="medium" selected>Medium</option>
                            <option value="high">High</option>
                            <option value="critical">Critical</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label for="assignee">Assignee</label>
                        <input type="text" id="assignee" name="assignee" placeholder="Enter assignee name">
                    </div>
                    <div class="form-group">
                        <label for="deadline">Deadline</label>
                        <input type="date" id="deadline" name="deadline">
                    </div>
                    <button type="submit" class="btn btn-primary">Create Task</button>
                </form>
            </section>

            <!-- Task List -->
            <section>
                <h2>${this.view === 'active' ? 'Active Tasks' : 'Archived Tasks'}</h2>
                <div class="task-list" id="taskList">
                    ${tasks.length === 0 ? `
                        <div class="empty-state">
                            <div class="empty-state-icon">📝</div>
                            <p>No ${this.view} tasks yet. Create one to get started!</p>
                        </div>
                    ` : tasks.map(task => this.renderTaskCard(task)).join('')}
                </div>
            </section>
        </div>
    </main>

    <!-- Delete Confirmation Modal -->
    <div id="deleteModal" class="modal-overlay">
        <div class="modal">
            <h3>🗑️ Confirm Delete</h3>
            <p>Are you sure you want to delete this task? This action cannot be undone.</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeDeleteModal()">Cancel</button>
                <button class="btn btn-danger" onclick="executeDelete()">Delete</button>
            </div>
        </div>
    </div>

    <!-- Bulk Delete Confirmation Modal -->
    <div id="bulkDeleteModal" class="modal-overlay">
        <div class="modal">
            <h3>🗑️ Confirm Bulk Delete</h3>
            <p>Are you sure you want to delete <strong id="bulkDeleteCount">0</strong> selected tasks? This action cannot be undone.</p>
            <div class="modal-actions">
                <button class="btn btn-secondary" onclick="closeBulkDeleteModal()">Cancel</button>
                <button class="btn btn-danger" onclick="executeBulkDelete()">Delete Selected</button>
            </div>
        </div>
    </div>

    <script>
        const STORAGE_KEY = 'taskflow_tasks';
        const STORAGE_COUNTER_KEY = 'taskflow_counter';
        
        // Load from localStorage or use initial data
        let savedTasks = null;
        let savedCounter = 1;
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                savedTasks = JSON.parse(stored);
            }
            const storedCounter = localStorage.getItem(STORAGE_COUNTER_KEY);
            if (storedCounter) {
                savedCounter = parseInt(storedCounter, 10);
            }
        } catch (e) {
            console.warn('Failed to load from localStorage:', e);
        }
        
        let tasks = savedTasks || ${JSON.stringify(tasks)};
        let selectedIds = ${JSON.stringify(this.selectedIds)};
        let view = '${this.view}';
        let taskIdCounter = savedCounter || ${this.taskIdCounter};
        let deleteId = null;
        
        // Save to localStorage whenever tasks change
        function saveTasks() {
            try {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
                localStorage.setItem(STORAGE_COUNTER_KEY, taskIdCounter.toString());
            } catch (e) {
                console.warn('Failed to save to localStorage:', e);
            }
        }

        function updateBulkActions() {
            const bar = document.getElementById('bulkActionBar');
            const countSpan = document.getElementById('selectedCount');
            countSpan.textContent = selectedIds.length;
            bar.classList.toggle('visible', selectedIds.length > 0);
        }

        function toggleSelection(taskId) {
            if (selectedIds.includes(taskId)) {
                selectedIds = selectedIds.filter(id => id !== taskId);
            } else {
                selectedIds.push(taskId);
            }
            updateBulkActions();
            renderTaskList();
        }

        function clearSelection() {
            selectedIds = [];
            updateBulkActions();
            renderTaskList();
        }

        function bulkDelete() {
            if (selectedIds.length === 0) return;
            document.getElementById('bulkDeleteCount').textContent = selectedIds.length;
            document.getElementById('bulkDeleteModal').classList.add('active');
        }

        function closeBulkDeleteModal() {
            document.getElementById('bulkDeleteModal').classList.remove('active');
        }

        function executeBulkDelete() {
            tasks = tasks.filter(t => !selectedIds.includes(t.id));
            selectedIds = [];
            closeBulkDeleteModal();
            updateBulkActions();
            updateStats();
            renderTaskList();
            saveTasks();
        }

        function bulkArchive() {
            tasks.forEach(t => {
                if (selectedIds.includes(t.id)) t.archived = true;
            });
            selectedIds = [];
            updateBulkActions();
            updateStats();
            renderTaskList();
            saveTasks();
        }

        function bulkRestore() {
            tasks.forEach(t => {
                if (selectedIds.includes(t.id)) t.archived = false;
            });
            selectedIds = [];
            updateBulkActions();
            updateStats();
            renderTaskList();
            saveTasks();
        }

        function setView(newView) {
            view = newView;
            // Update tab button states
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.classList.remove('active');
            });
            const activeBtn = Array.from(tabBtns).find(btn => 
                (view === 'active' && btn.textContent?.includes('Active')) ||
                (view === 'archived' && btn.textContent?.includes('Archived'))
            );
            if (activeBtn) activeBtn.classList.add('active');
            // Re-render without page reload
            renderTaskList();
            updateStats();
        }

        function openEditPanel(taskId) {
            // Close any other open edit panels first
            document.querySelectorAll('.edit-panel.active').forEach(panel => {
                panel.classList.remove('active');
            });
            const panel = document.getElementById('edit-panel-' + taskId);
            if (panel) panel.classList.add('active');
        }

        function closeEditPanel(taskId) {
            const panel = document.getElementById('edit-panel-' + taskId);
            if (panel) panel.classList.remove('active');
        }

        function saveEditPanel(taskId) {
            const task = tasks.find(t => t.id === taskId);
            if (!task) return;
            
            const title = document.getElementById('edit-title-' + taskId).value.trim();
            if (!title) return; // Don't save empty titles
            
            task.title = title;
            task.description = document.getElementById('edit-description-' + taskId).value.trim();
            task.priority = document.getElementById('edit-priority-' + taskId).value;
            task.assignee = document.getElementById('edit-assignee-' + taskId).value.trim() || undefined;
            task.deadline = document.getElementById('edit-deadline-' + taskId).value || undefined;
            task.status = document.getElementById('edit-status-' + taskId).value;
            task.updatedAt = new Date();
            
            closeEditPanel(taskId);
            updateStats();
            renderTaskList();
            saveTasks();
        }

        function confirmDelete(taskId) {
            deleteId = taskId;
            document.getElementById('deleteModal').classList.add('active');
        }

        function closeDeleteModal() {
            deleteId = null;
            document.getElementById('deleteModal').classList.remove('active');
        }

        function executeDelete() {
            if (deleteId) {
                tasks = tasks.filter(t => t.id !== deleteId);
                deleteId = null;
                closeDeleteModal();
                updateStats();
                renderTaskList();
                saveTasks();
            }
        }

        function updateStats() {
            const all = tasks.filter(t => !t.archived);
            const completed = all.filter(t => t.status === 'done').length;
            const overdue = all.filter(t => {
                if (t.status === 'done') return false;
                if (!t.deadline) return false;
                return new Date(t.deadline) < new Date();
            }).length;
            const completionRate = all.length > 0 ? Math.round((completed / all.length) * 100) : 0;
            
            const metricValues = document.querySelectorAll('.status-bar .metric-value');
            if (metricValues.length >= 4) {
                metricValues[0].textContent = all.length;
                metricValues[1].textContent = completed;
                metricValues[2].textContent = overdue;
                metricValues[3].textContent = completionRate + '%';
            }
        }

        function isOverdue(task) {
            if (task.status === 'done' || task.archived) return false;
            if (!task.deadline) return false;
            return new Date(task.deadline) < new Date();
        }

        function renderTaskList() {
            const list = document.getElementById('taskList');
            const filtered = tasks.filter(t => t.archived === (view === 'archived'));
            
            if (filtered.length === 0) {
                list.innerHTML = \`
                    <div class="empty-state">
                        <div class="empty-state-icon">📝</div>
                        <p>No \${view} tasks yet. Create one to get started!</p>
                    </div>
                \`;
                return;
            }
            
            list.innerHTML = filtered.map(task => \`
                <div class="task-card \${isOverdue(task) ? 'overdue' : ''}">
                    <div class="task-card-header">
                        <input type="checkbox" class="task-checkbox" 
                            \${selectedIds.includes(task.id) ? 'checked' : ''} 
                            onchange="toggleSelection('\${task.id}')">
                        <div class="task-title">\${task.title}</div>
                        <div class="task-actions">
                            <button class="btn-edit" onclick="openEditModal('\${task.id}')">Edit</button>
                            <button class="btn-delete" onclick="confirmDelete('\${task.id}')">🗑️</button>
                        </div>
                    </div>
                    <div class="task-description">\${task.description || 'No description'}</div>
                    <div class="task-meta">
                        <span class="badge priority-\${task.priority}">\${task.priority}</span>
                        <span class="badge status-\${task.status}">\${task.status.replace('_', ' ')}</span>
                        \${task.assignee ? \`<span>👤 \${task.assignee}</span>\` : ''}
                        \${task.deadline ? \`<span>📅 \${new Date(task.deadline).toLocaleDateString()}</span>\` : ''}
                        \${isOverdue(task) ? '<span class="badge overdue-badge">OVERDUE</span>' : ''}
                    </div>
                </div>
            \`).join('');
        }

        // Form submission
        document.getElementById('taskForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const title = document.getElementById('title').value.trim();
            if (!title) {
                document.getElementById('titleError').classList.add('visible');
                return;
            }
            document.getElementById('titleError').classList.remove('visible');
            
            const task = {
                id: \`task-\${taskIdCounter++}\`,
                title: title,
                description: document.getElementById('description').value.trim(),
                priority: document.getElementById('priority').value,
                assignee: document.getElementById('assignee').value.trim() || undefined,
                deadline: document.getElementById('deadline').value || undefined,
                status: 'open',
                createdAt: new Date(),
                updatedAt: new Date(),
                archived: false
            };
            
            tasks.push(task);
            updateStats();
            renderTaskList();
            saveTasks();
            this.reset();
            document.getElementById('priority').value = 'medium';
        });

        // Close modals on overlay click
        document.getElementById('deleteModal').addEventListener('click', function(e) {
            if (e.target === this) closeDeleteModal();
        });
        document.getElementById('bulkDeleteModal').addEventListener('click', function(e) {
            if (e.target === this) closeBulkDeleteModal();
        });

        // Initialize
        updateStats();
        renderTaskList();
        updateBulkActions();
    </script>

    <footer style="text-align: center; padding: 2rem; color: var(--text-secondary);">
        <small>Generated with Phoenix VCS — Task Dashboard</small>
    </footer>
</body>
</html>
`;
  }

  private renderTaskCard(task: Task): string {
    const isOverdue = task.deadline && new Date(task.deadline) < new Date() && task.status !== 'done' && !task.archived;
    
    return `
        <div class="task-card ${isOverdue ? 'overdue' : ''}" data-task-id="${task.id}">
            <div class="task-card-header">
                <input type="checkbox" class="task-checkbox" 
                    ${this.selectedIds.includes(task.id) ? 'checked' : ''} 
                    onchange="toggleSelection('${task.id}')">
                <div class="task-title">${task.title}</div>
                <div class="task-actions">
                    <button class="btn-edit" onclick="openEditPanel('${task.id}')">Edit</button>
                    <button class="btn-delete" onclick="confirmDelete('${task.id}')">🗑️</button>
                </div>
            </div>
            <div class="task-description">${task.description || 'No description'}</div>
            <div class="task-meta">
                <span class="badge priority-${task.priority}">${task.priority}</span>
                <span class="badge status-${task.status}">${task.status.replace('_', ' ')}</span>
                ${task.assignee ? `<span>👤 ${task.assignee}</span>` : ''}
                ${task.deadline ? `<span>📅 ${new Date(task.deadline).toLocaleDateString()}</span>` : ''}
                ${isOverdue ? '<span class="badge overdue-badge">OVERDUE</span>' : ''}
            </div>
            <!-- Inline Edit Panel -->
            <div id="edit-panel-${task.id}" class="edit-panel">
                <div class="form-row">
                    <div class="form-group" style="flex: 2;">
                        <label>Title *</label>
                        <input type="text" id="edit-title-${task.id}" value="${task.title}" required>
                    </div>
                    <div class="form-group">
                        <label>Priority</label>
                        <select id="edit-priority-${task.id}">
                            <option value="low" ${task.priority === 'low' ? 'selected' : ''}>Low</option>
                            <option value="medium" ${task.priority === 'medium' ? 'selected' : ''}>Medium</option>
                            <option value="high" ${task.priority === 'high' ? 'selected' : ''}>High</option>
                            <option value="critical" ${task.priority === 'critical' ? 'selected' : ''}>Critical</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Status</label>
                        <select id="edit-status-${task.id}">
                            <option value="open" ${task.status === 'open' ? 'selected' : ''}>Open</option>
                            <option value="in_progress" ${task.status === 'in_progress' ? 'selected' : ''}>In Progress</option>
                            <option value="review" ${task.status === 'review' ? 'selected' : ''}>Review</option>
                            <option value="done" ${task.status === 'done' ? 'selected' : ''}>Done</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Assignee</label>
                        <input type="text" id="edit-assignee-${task.id}" value="${task.assignee || ''}">
                    </div>
                    <div class="form-group">
                        <label>Deadline</label>
                        <input type="date" id="edit-deadline-${task.id}" value="${task.deadline || ''}">
                    </div>
                </div>
                <div class="form-group">
                    <label>Description</label>
                    <textarea id="edit-description-${task.id}" rows="2">${task.description || ''}</textarea>
                </div>
                <div class="panel-actions">
                    <button type="button" class="btn btn-secondary" onclick="closeEditPanel('${task.id}')">Cancel</button>
                    <button type="button" class="btn btn-primary" onclick="saveEditPanel('${task.id}')">Save Changes</button>
                </div>
            </div>
        </div>
    `;
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'ec4737a7671a24d2c859604470556a65e34e7a700615fa11f18bf5e3d4e5ea88',
  name: 'Dashboard Page',
  risk_tier: 'high',
} as const;
