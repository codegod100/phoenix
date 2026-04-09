/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-language: typescript-web
 * 
 * @phoenix-canon: e5812b6a584792edc9967face4977a6bda2ada84f731d38b55b3c49dd7e7d953
 * Requirement: The dashboard must render a complete HTML page with inline CSS and JavaScript
 * 
 * @phoenix-canon: 30d7c5acea649f28567d0b0bab67bf416b751712003faf6dae0add36ae400298
 * Requirement: The page must be encoded in UTF-8 with proper charset meta tag
 * 
 * @phoenix-canon: bf3ef52e9fb03378f76e12d2fde4d4af6be22c90abd90b9b5d6b6f9d6ac30f6f
 * Requirement: The page must include a viewport meta tag for responsive scaling
 * 
 * Server - Node.js native HTTP server with inline HTML dashboard
 * All IU functions exposed via global API
 * All canonical constraints implemented
 */

import http from "http";

const PORT = process.env.PORT || 3000;

// HTML Dashboard with embedded JavaScript
const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow</title>
  <style>
    :root {
      --ctp-base: #1e1e2e;
      --ctp-mantle: #181825;
      --ctp-crust: #11111b;
      --ctp-surface0: #313244;
      --ctp-surface1: #45475a;
      --ctp-surface2: #585b70;
      --ctp-overlay0: #6c7086;
      --ctp-text: #cdd6f4;
      --ctp-subtext0: #a6adc8;
      --ctp-blue: #89b4fa;
      --ctp-green: #a6e3a1;
      --ctp-yellow: #f9e2af;
      --ctp-peach: #fab387;
      --ctp-red: #f38ba8;
      --ctp-mauve: #cba6f7;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.95rem;
      line-height: 1.5;
      background: var(--ctp-base);
      color: var(--ctp-text);
      min-height: 100vh;
    }
    .header {
      background: var(--ctp-mantle);
      padding: 16px 32px;
      border-bottom: 1px solid var(--ctp-surface0);
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 24px;
      flex-wrap: wrap;
      min-height: 56px;
    }
    .header h1 { font-size: 1.75rem; font-weight: 600; color: var(--ctp-text); }
    .status-bar {
      display: flex;
      align-items: center;
      gap: 8px;
      background: var(--ctp-surface0);
      padding: 8px 16px;
      border-radius: 8px;
    }
    .metric-badge {
      display: inline-flex;
      align-items: center;
      gap: 4px;
      background: var(--ctp-surface1);
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 0.85rem;
      transition: background 0.2s;
    }
    .metric-badge:hover { background: var(--ctp-surface2); }
    .metric-badge .label { color: var(--ctp-subtext0); font-weight: 400; }
    .metric-badge .value { color: var(--ctp-text); font-weight: 600; }
    .metric-badge.rate .value { color: var(--ctp-blue); }
    .nav-tabs {
      display: flex;
      gap: 8px;
      padding: 16px 24px 0;
      border-bottom: 1px solid var(--ctp-surface0);
    }
    .nav-tab {
      padding: 8px 16px;
      background: transparent;
      border: none;
      border-radius: 0;
      color: var(--ctp-subtext0);
      cursor: pointer;
      border-bottom: 3px solid transparent;
      transition: border-bottom-color 0.2s, color 0.2s;
    }
    .nav-tab:hover { color: var(--ctp-text); }
    .nav-tab.active { color: var(--ctp-blue); border-bottom-color: var(--ctp-blue); }
    .main-container {
      display: grid;
      grid-template-columns: 320px 1fr;
      gap: 24px;
      padding: 24px;
      max-width: 1600px;
      margin: 0 auto;
    }
    @media (max-width: 768px) {
      .main-container { grid-template-columns: 1fr; }
    }
    .card {
      background: var(--ctp-surface0);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    h2 { font-size: 1.25rem; font-weight: 600; margin: 0 0 16px 0; padding: 0; line-height: 1.3; }
    .form-group { margin-bottom: 12px; }
    .form-group label { display: block; margin-bottom: 2px; font-size: 0.85rem; color: var(--ctp-subtext0); }
    .form-group input,
    .form-group select,
    .form-group textarea {
      width: 100%;
      padding: 6px 10px;
      border: 1px solid var(--ctp-surface1);
      border-radius: 6px;
      background: var(--ctp-surface1);
      color: var(--ctp-text);
      font-family: inherit;
      font-size: 0.95rem;
    }
    .form-group input:focus,
    .form-group select:focus,
    .form-group textarea:focus { outline: none; border-color: var(--ctp-blue); }
    .form-group textarea { min-height: 50px; resize: vertical; }
    .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
    button {
      cursor: pointer;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 0.9rem;
      font-family: inherit;
      transition: opacity 0.2s;
    }
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    .btn-primary { background: var(--ctp-blue); color: var(--ctp-crust); }
    .btn-success { background: var(--ctp-green); color: var(--ctp-crust); }
    .btn-danger { background: var(--ctp-red); color: var(--ctp-crust); }
    .btn-secondary { background: var(--ctp-surface1); color: var(--ctp-text); }
    .btn-sm { padding: 4px 8px; font-size: 0.8rem; }
    .task-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    @media (max-width: 768px) { .task-grid { grid-template-columns: 1fr; } }
    .task-card {
      background: var(--ctp-surface0);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
      position: relative;
    }
    .task-card:hover { transform: translateY(-2px); box-shadow: 0 4px 16px rgba(0,0,0,0.3); }
    .task-card.overdue { border: 2px solid var(--ctp-red); }
    .task-card.archived { opacity: 0.7; }
    .task-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; margin-bottom: 8px; }
    .task-title { font-weight: 600; font-size: 1rem; flex: 1; }
    .task-badges { display: flex; gap: 6px; flex-wrap: wrap; margin-bottom: 8px; }
    .badge { padding: 2px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: 500; text-transform: uppercase; }
    .badge-priority-critical { background: var(--ctp-red); color: var(--ctp-crust); }
    .badge-priority-high { background: var(--ctp-peach); color: var(--ctp-crust); }
    .badge-priority-medium { background: var(--ctp-yellow); color: var(--ctp-crust); }
    .badge-priority-low { background: var(--ctp-green); color: var(--ctp-crust); }
    .badge-status-open { background: var(--ctp-overlay0); color: var(--ctp-text); }
    .badge-status-in_progress { background: var(--ctp-blue); color: var(--ctp-crust); }
    .badge-status-review { background: var(--ctp-mauve); color: var(--ctp-crust); }
    .badge-status-done { background: var(--ctp-green); color: var(--ctp-crust); }
    .badge-status-archived { background: var(--ctp-surface2); color: var(--ctp-subtext0); text-decoration: line-through; }
    .badge-overdue { background: var(--ctp-red); color: var(--ctp-crust); font-weight: 600; }
    .task-description { color: var(--ctp-subtext0); font-size: 0.9rem; margin-bottom: 12px; line-height: 1.4; }
    .task-meta { display: flex; flex-wrap: wrap; gap: 12px; font-size: 0.85rem; color: var(--ctp-subtext0); margin-bottom: 12px; }
    .task-actions { display: flex; gap: 8px; flex-wrap: wrap; }
    .task-actions button { padding: 4px 10px; font-size: 0.8rem; }
    .task-card {
      position: relative;
      cursor: pointer;
      border-left: 3px solid transparent;
      transition: border-left-color 0.2s, background-color 0.2s;
    }
    .task-card:hover { border-left-color: var(--ctp-surface1); }
    .task-card.selected {
      border-left-color: var(--ctp-blue);
      background: var(--ctp-surface2);
    }
    .task-card .card-content {
      pointer-events: none;
    }
    .task-card .task-actions {
      pointer-events: auto;
    }
    .bulk-action-bar {
      display: none;
      position: fixed;
      bottom: 24px;
      left: 50%;
      transform: translateX(-50%);
      background: var(--ctp-surface0);
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.4);
      gap: 12px;
      align-items: center;
      z-index: 100;
    }
    .bulk-action-bar.visible { display: flex; }
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(17, 17, 27, 0.8);
      align-items: center;
      justify-content: center;
      z-index: 1000;
    }
    .modal-overlay.visible { display: flex; }
    .modal {
      background: var(--ctp-surface0);
      border-radius: 12px;
      padding: 24px;
      width: 95%;
      max-width: 400px;
    }
    .modal-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
    .modal-header h2 { margin: 0; }
    .modal-close { background: none; border: none; color: var(--ctp-subtext0); font-size: 1.5rem; cursor: pointer; padding: 0; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center; border-radius: 6px; }
    .modal-close:hover { background: var(--ctp-surface1); color: var(--ctp-text); }
    .modal-footer { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
    .edit-form { display: none; }
    .edit-form.visible { display: block; }
    .card-content.hidden { display: none; }
    .empty-state { text-align: center; padding: 48px 24px; color: var(--ctp-subtext0); }
    .section-header { margin: 24px 0 16px; padding-top: 16px; border-top: 1px solid var(--ctp-surface1); }
    .section-header h3 { color: var(--ctp-subtext0); font-size: 1rem; text-transform: uppercase; letter-spacing: 0.5px; }
    .search-bar { margin-bottom: 16px; }
    .search-bar input { width: 100%; padding: 10px 16px; background: var(--ctp-surface1); border: 1px solid var(--ctp-surface2); border-radius: 6px; color: var(--ctp-text); font-size: 0.95rem; }
    .search-bar input:focus { outline: none; border-color: var(--ctp-blue); }
  </style>
</head>
<body>
  <header class="header">
    <h1>📋 TaskFlow</h1>
    <div class="status-bar" id="statusBar">
      <span class="metric-badge"><span class="label">Tasks:</span> <span class="value" id="metricTotal">0</span></span>
      <span class="metric-badge"><span class="label">✓ Done:</span> <span class="value" id="metricCompleted">0</span></span>
      <span class="metric-badge"><span class="label">⚠ Overdue:</span> <span class="value" id="metricOverdue">0</span></span>
      <span class="metric-badge"><span class="label">🗄 Archived:</span> <span class="value" id="metricArchived">0</span></span>
      <span class="metric-badge rate"><span class="label">📊 Rate:</span> <span class="value" id="metricRate">0%</span></span>
    </div>
  </header>
  <nav class="nav-tabs">
    <button class="nav-tab active" data-tab="active" id="tabActive">Active Tasks</button>
    <button class="nav-tab" data-tab="archived" id="tabArchived">Archived Tasks</button>
  </nav>
  <main class="main-container">
    <section class="create-section">
      <h2>Create Task</h2>
      <form id="createForm" class="card">
        <div class="form-group">
          <label for="createTitle">Title *</label>
          <input type="text" id="createTitle" name="title" required autocomplete="off" placeholder="Enter task title">
        </div>
        <div class="form-group">
          <label for="createDescription">Description</label>
          <textarea id="createDescription" name="description" rows="2" autocomplete="off" placeholder="Enter task description"></textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="createPriority">Priority *</label>
            <select id="createPriority" name="priority" required autocomplete="off">
              <option value="low">Low</option>
              <option value="medium" selected>Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div class="form-group">
            <label for="createStatus">Status</label>
            <select id="createStatus" name="status" autocomplete="off">
              <option value="open" selected>Open</option>
              <option value="in_progress">In Progress</option>
              <option value="review">Review</option>
              <option value="done">Done</option>
            </select>
          </div>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="createAssignee">Assignee</label>
            <input type="text" id="createAssignee" name="assignee" autocomplete="off" placeholder="Enter assignee">
          </div>
          <div class="form-group">
            <label for="createDeadline">Deadline</label>
            <input type="date" id="createDeadline" name="deadline" autocomplete="off">
          </div>
        </div>
        <div class="form-group">
          <label for="createTags">Tags (comma-separated)</label>
          <input type="text" id="createTags" name="tags" autocomplete="off" placeholder="tag1, tag2, tag3">
        </div>
        <button type="submit" class="btn-primary" style="width: 100%;">Create Task</button>
      </form>
    </section>
    <section class="tasks-section">
      <h2>Tasks</h2>
      <div class="search-bar">
        <input type="text" id="searchInput" placeholder="Search tasks by title or description..." autocomplete="off">
      </div>
      <div id="activeTasksContainer">
        <div id="activeTasks" class="task-grid"></div>
        <div class="section-header" id="completedHeader" style="display: none;">
          <h3>Completed Tasks</h3>
        </div>
        <div id="completedTasks" class="task-grid"></div>
      </div>
      <div id="archivedTasksContainer" style="display: none;">
        <div id="archivedTasks" class="task-grid"></div>
      </div>
    </section>
  </main>
  <div class="bulk-action-bar" id="bulkActionBar">
    <span id="bulkCount">0 selected</span>
    <button class="btn-secondary" id="bulkArchiveBtn">Archive Selected</button>
    <button class="btn-secondary" id="bulkRestoreBtn" style="display: none;">Restore Selected</button>
    <button class="btn-danger" id="bulkDeleteBtn">Delete Selected</button>
    <button class="btn-secondary" id="bulkCancelBtn">Cancel</button>
  </div>
  <div class="modal-overlay confirm-modal" id="confirmModal">
    <div class="modal">
      <div class="modal-header">
        <h2 id="confirmTitle">Confirm Action</h2>
        <button class="modal-close" id="confirmClose">×</button>
      </div>
      <p class="confirm-message" id="confirmMessage">Are you sure?</p>
      <div class="modal-footer">
        <button class="btn-secondary" id="confirmCancel">Cancel</button>
        <button class="btn-danger" id="confirmAction">Confirm</button>
      </div>
    </div>
  </div>
  <script>
    // @phoenix-canon: 900da6bbb6abdd66d83efe4b9162e74c6bcc540811e4639a2908fe1199a1b02b
    const STORAGE_KEY = 'taskflow_tasks';
    const taskStore = new Map();
    let currentTab = 'active';
    let selectedIds = new Set();
    let confirmCallback = null;
    
    function generateUUID() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
      });
    }
    
    function loadFromStorage() {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        try {
          const tasks = JSON.parse(stored);
          taskStore.clear();
          tasks.forEach(t => taskStore.set(t.id, t));
        } catch (e) { console.error('Failed to parse tasks', e); }
      }
    }
    
    function persistToStorage() {
      const tasks = Array.from(taskStore.values());
      localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
    }
    
    function getAllTasks() {
      loadFromStorage();
      return Array.from(taskStore.values());
    }
    
    function createTask(data) {
      if (!data.title || data.title.trim() === '') throw new Error('Title is required');
      const now = new Date().toISOString();
      const task = { ...data, id: generateUUID(), created_at: now, updated_at: now, archived: false, tags: data.tags || [], audit_trail: [] };
      taskStore.set(task.id, task);
      persistToStorage();
      return task;
    }
    
    function updateTask(id, updates) {
      const task = taskStore.get(id);
      if (!task) throw new Error('Task not found');
      const validTransitions = { open: ['in_progress'], in_progress: ['review', 'open'], review: ['done', 'in_progress'], done: ['open'] };
      if (updates.status && updates.status !== task.status) {
        const allowed = validTransitions[task.status];
        if (!allowed.includes(updates.status)) throw new Error('Invalid transition: ' + task.status + ' → ' + updates.status);
      }
      const now = new Date().toISOString();
      const updated = { ...task, ...updates, updated_at: now };
      if (updates.status === 'done' && task.status !== 'done') {
        updated.completed_at = now;
        updated.duration = new Date(now).getTime() - new Date(task.created_at).getTime();
      }
      taskStore.set(id, updated);
      persistToStorage();
      return updated;
    }
    
    function deleteTask(id) {
      const result = taskStore.delete(id);
      if (result) persistToStorage();
      return result;
    }
    
    function archiveTask(id) {
      const task = taskStore.get(id);
      if (!task) throw new Error('Task not found');
      const now = new Date().toISOString();
      const updated = { ...task, archived: true, archived_at: now, previous_status: task.status, updated_at: now };
      taskStore.set(id, updated);
      persistToStorage();
      return updated;
    }
    
    function restoreTask(id) {
      const task = taskStore.get(id);
      if (!task) throw new Error('Task not found');
      const now = new Date().toISOString();
      const updated = { ...task, archived: false, archived_at: undefined, status: task.previous_status || task.status, previous_status: undefined, updated_at: now };
      taskStore.set(id, updated);
      persistToStorage();
      return updated;
    }
    
    function getMetrics() {
      const tasks = getAllTasks();
      const total = tasks.length;
      const completed = tasks.filter(t => t.status === 'done').length;
      const now = new Date().toISOString();
      const overdue = tasks.filter(t => { if (t.status === 'done' || !t.deadline) return false; return new Date(t.deadline) < new Date(now); }).length;
      const archived = tasks.filter(t => t.archived).length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;
      return { total, completed, overdue, archived, completionRate };
    }
    
    function searchTasks(query) {
      const tasks = getAllTasks();
      if (!query || query.trim() === '') return tasks;
      const lower = query.toLowerCase();
      return tasks.filter(t => t.title.toLowerCase().includes(lower) || t.description.toLowerCase().includes(lower));
    }
    
    function seedData() {
      if (taskStore.size === 0) {
        const samples = [
          { title: 'Setup project repository', description: 'Initialize Git repo and configure CI/CD', priority: 'high', status: 'done', assignee: 'alice', deadline: new Date(Date.now() + 86400000 * 2).toISOString().split('T')[0], tags: ['devops', 'setup'] },
          { title: 'Design database schema', description: 'Create ERD and define table structures', priority: 'critical', status: 'in_progress', assignee: 'bob', deadline: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0], tags: ['database', 'design'] },
          { title: 'Write API documentation', description: 'Document all REST endpoints', priority: 'medium', status: 'open', assignee: 'charlie', deadline: new Date(Date.now() + 86400000 * 5).toISOString().split('T')[0], tags: ['docs', 'api'] },
          { title: 'Fix navigation bug', description: 'Mobile menu does not close on selection', priority: 'high', status: 'review', deadline: new Date(Date.now() - 86400000).toISOString().split('T')[0], tags: ['bug', 'ui'] },
          { title: 'Update dependencies', description: 'Check for security updates', priority: 'low', status: 'open', tags: ['maintenance'] }
        ];
        samples.forEach(s => { try { createTask(s); } catch (e) {} });
      }
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function formatDate(dateStr) {
      if (!dateStr) return '';
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
    
    function renderStatusBar() {
      const metrics = getMetrics();
      document.getElementById('metricTotal').textContent = metrics.total;
      document.getElementById('metricCompleted').textContent = metrics.completed;
      document.getElementById('metricOverdue').textContent = metrics.overdue;
      document.getElementById('metricArchived').textContent = metrics.archived;
      document.getElementById('metricRate').textContent = metrics.completionRate + '%';
    }
    
    function createTaskCard(task) {
      const div = document.createElement('div');
      div.className = 'task-card';
      if (selectedIds.has(task.id)) div.classList.add('selected');
      div.dataset.taskId = task.id;
      const isOverdue = task.deadline && task.status !== 'done' && new Date(task.deadline) < new Date();
      if (isOverdue) div.classList.add('overdue');
      if (task.archived) div.classList.add('archived');
      const priorityColors = { critical: 'badge-priority-critical', high: 'badge-priority-high', medium: 'badge-priority-medium', low: 'badge-priority-low' };
      const statusColors = { open: 'badge-status-open', in_progress: 'badge-status-in_progress', review: 'badge-status-review', done: 'badge-status-done' };
      const validTransitions = { open: [{ status: 'in_progress', label: 'Start' }], in_progress: [{ status: 'review', label: 'Submit for Review' }, { status: 'open', label: 'Back to Open' }], review: [{ status: 'done', label: 'Complete' }, { status: 'in_progress', label: 'Back to Progress' }], done: [{ status: 'open', label: 'Reopen' }] };
      const transitions = validTransitions[task.status] || [];
      const transitionButtons = transitions.map(t => '<button class="btn-secondary btn-sm transition-btn" data-task-id="' + task.id + '" data-status="' + t.status + '">' + t.label + '</button>').join('');
      div.innerHTML = '<div class="card-content"><div class="task-header"><span class="task-title">' + escapeHtml(task.title) + '</span></div><div class="task-badges"><span class="badge ' + priorityColors[task.priority] + '">' + task.priority + '</span><span class="badge ' + statusColors[task.status] + '">' + task.status.replace('_', ' ') + '</span>' + (task.archived ? '<span class="badge badge-status-archived">archived</span>' : '') + (isOverdue ? '<span class="badge badge-overdue">OVERDUE</span>' : '') + '</div><p class="task-description">' + escapeHtml(task.description) + '</p><div class="task-meta">' + (task.assignee ? '<span>👤 ' + escapeHtml(task.assignee) + '</span>' : '') + (task.deadline ? '<span>📅 ' + formatDate(task.deadline) + '</span>' : '') + (task.tags.length ? '<span>🏷️ ' + task.tags.join(', ') + '</span>' : '') + '</div><div class="task-actions">' + transitionButtons + '<button class="btn-secondary btn-sm edit-btn" data-task-id="' + task.id + '">Edit</button>' + (!task.archived ? '<button class="btn-secondary btn-sm archive-btn" data-task-id="' + task.id + '">Archive</button>' : '') + (task.archived ? '<button class="btn-secondary btn-sm restore-btn" data-task-id="' + task.id + '">Restore</button>' : '') + '<button class="btn-danger btn-sm delete-btn" data-task-id="' + task.id + '">Delete</button></div></div><div class="edit-form" id="edit-form-' + task.id + '"><div class="form-group"><label>Title</label><input type="text" class="edit-title" value="' + escapeHtml(task.title) + '" autocomplete="off"></div><div class="form-group"><label>Description</label><textarea class="edit-description" rows="2" autocomplete="off">' + escapeHtml(task.description) + '</textarea></div><div class="form-row"><div class="form-group"><label>Priority</label><select class="edit-priority" autocomplete="off"><option value="low" ' + (task.priority === 'low' ? 'selected' : '') + '>Low</option><option value="medium" ' + (task.priority === 'medium' ? 'selected' : '') + '>Medium</option><option value="high" ' + (task.priority === 'high' ? 'selected' : '') + '>High</option><option value="critical" ' + (task.priority === 'critical' ? 'selected' : '') + '>Critical</option></select></div><div class="form-group"><label>Status</label><select class="edit-status" autocomplete="off"><option value="open" ' + (task.status === 'open' ? 'selected' : '') + '>Open</option><option value="in_progress" ' + (task.status === 'in_progress' ? 'selected' : '') + '>In Progress</option><option value="review" ' + (task.status === 'review' ? 'selected' : '') + '>Review</option><option value="done" ' + (task.status === 'done' ? 'selected' : '') + '>Done</option></select></div></div><div class="form-row"><div class="form-group"><label>Assignee</label><input type="text" class="edit-assignee" value="' + escapeHtml(task.assignee || '') + '" autocomplete="off"></div><div class="form-group"><label>Deadline</label><input type="date" class="edit-deadline" value="' + (task.deadline || '') + '"></div></div><div class="task-actions"><button class="btn-success btn-sm save-edit-btn" data-task-id="' + task.id + '">Save</button><button class="btn-secondary btn-sm cancel-edit-btn" data-task-id="' + task.id + '">Cancel</button></div></div>';
      
      // Click card to toggle selection
      div.addEventListener('click', (e) => {
        // Don't select if clicking buttons or form elements
        if (e.target.closest('.task-actions') || e.target.closest('.edit-form')) return;
        if (selectedIds.has(task.id)) {
          selectedIds.delete(task.id);
          div.classList.remove('selected');
        } else {
          selectedIds.add(task.id);
          div.classList.add('selected');
        }
        updateBulkBar();
      });
      return div;
    }
    
    function renderTasks() {
      const tasks = searchTasks(document.getElementById('searchInput').value);
      const activeContainer = document.getElementById('activeTasks');
      const completedContainer = document.getElementById('completedTasks');
      const archivedContainer = document.getElementById('archivedTasks');
      activeContainer.innerHTML = '';
      completedContainer.innerHTML = '';
      archivedContainer.innerHTML = '';
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      if (currentTab === 'active') {
        const activeTasks = tasks.filter(t => !t.archived && t.status !== 'done').sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        const completedTasks = tasks.filter(t => !t.archived && t.status === 'done').sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        if (activeTasks.length === 0 && completedTasks.length === 0) {
          activeContainer.innerHTML = '<div class="empty-state">No tasks found. Create one to get started!</div>';
        } else {
          activeTasks.forEach(task => { activeContainer.appendChild(createTaskCard(task)); });
          document.getElementById('completedHeader').style.display = completedTasks.length ? 'block' : 'none';
          completedTasks.forEach(task => { completedContainer.appendChild(createTaskCard(task)); });
        }
      } else {
        const archivedTasks = tasks.filter(t => t.archived).sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
        if (archivedTasks.length === 0) { archivedContainer.innerHTML = '<div class="empty-state">No archived tasks.</div>'; } else { archivedTasks.forEach(task => { archivedContainer.appendChild(createTaskCard(task)); }); }
      }
      renderStatusBar();
    }
    
    function updateBulkBar() {
      const bar = document.getElementById('bulkActionBar');
      const count = document.getElementById('bulkCount');
      const archiveBtn = document.getElementById('bulkArchiveBtn');
      const restoreBtn = document.getElementById('bulkRestoreBtn');
      if (selectedIds.size > 0) {
        bar.classList.add('visible');
        count.textContent = selectedIds.size + ' selected';
        if (currentTab === 'active') { archiveBtn.style.display = 'block'; restoreBtn.style.display = 'none'; } else { archiveBtn.style.display = 'none'; restoreBtn.style.display = 'block'; }
      } else { bar.classList.remove('visible'); }
    }
    
    function showConfirm(title, message, callback) {
      confirmCallback = callback;
      document.getElementById('confirmTitle').textContent = title;
      document.getElementById('confirmMessage').textContent = message;
      document.getElementById('confirmModal').classList.add('visible');
    }
    
    function hideConfirm() {
      document.getElementById('confirmModal').classList.remove('visible');
      confirmCallback = null;
    }
    
    document.addEventListener('DOMContentLoaded', () => {
      seedData();
      renderTasks();
      document.getElementById('createTitle').focus();
      document.getElementById('tabActive').addEventListener('click', () => {
        currentTab = 'active';
        document.getElementById('tabActive').classList.add('active');
        document.getElementById('tabArchived').classList.remove('active');
        document.getElementById('activeTasksContainer').style.display = 'block';
        document.getElementById('archivedTasksContainer').style.display = 'none';
        selectedIds.clear(); updateBulkBar(); renderTasks();
      });
      document.getElementById('tabArchived').addEventListener('click', () => {
        currentTab = 'archived';
        document.getElementById('tabArchived').classList.add('active');
        document.getElementById('tabActive').classList.remove('active');
        document.getElementById('activeTasksContainer').style.display = 'none';
        document.getElementById('archivedTasksContainer').style.display = 'block';
        selectedIds.clear(); updateBulkBar(); renderTasks();
      });
      document.getElementById('createForm').addEventListener('submit', (e) => {
        e.preventDefault();
        const title = document.getElementById('createTitle').value.trim();
        if (!title) { alert('Title is required'); return; }
        const tags = document.getElementById('createTags').value.split(',').map(t => t.trim()).filter(t => t);
        createTask({ title, description: document.getElementById('createDescription').value, priority: document.getElementById('createPriority').value, status: document.getElementById('createStatus').value, assignee: document.getElementById('createAssignee').value || undefined, deadline: document.getElementById('createDeadline').value || undefined, tags });
        document.getElementById('createForm').reset();
        document.getElementById('createTitle').focus();
        renderTasks();
      });
      document.getElementById('createForm').addEventListener('keydown', (e) => { if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA') { e.preventDefault(); document.getElementById('createForm').dispatchEvent(new Event('submit')); } });
      document.getElementById('searchInput').addEventListener('input', () => { renderTasks(); });
      document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('transition-btn')) {
          const taskId = target.dataset.taskId;
          const newStatus = target.dataset.status;
          try { updateTask(taskId, { status: newStatus }); renderTasks(); } catch (err) { alert(err.message); }
        }
        if (target.classList.contains('edit-btn')) {
          const taskId = target.dataset.taskId;
          const card = document.querySelector('[data-task-id="' + taskId + '"]');
          card.querySelector('.card-content').classList.add('hidden');
          card.querySelector('.edit-form').classList.add('visible');
        }
        if (target.classList.contains('cancel-edit-btn')) {
          const taskId = target.dataset.taskId;
          const card = document.querySelector('[data-task-id="' + taskId + '"]');
          card.querySelector('.card-content').classList.remove('hidden');
          card.querySelector('.edit-form').classList.remove('visible');
        }
        if (target.classList.contains('save-edit-btn')) {
          const taskId = target.dataset.taskId;
          const card = document.querySelector('[data-task-id="' + taskId + '"]');
          try {
            updateTask(taskId, { title: card.querySelector('.edit-title').value, description: card.querySelector('.edit-description').value, priority: card.querySelector('.edit-priority').value, status: card.querySelector('.edit-status').value, assignee: card.querySelector('.edit-assignee').value || undefined, deadline: card.querySelector('.edit-deadline').value || undefined });
            renderTasks();
          } catch (err) { alert(err.message); }
        }
        if (target.classList.contains('archive-btn')) {
          const taskId = target.dataset.taskId;
          showConfirm('Archive Task', 'Archive this task? It can be restored later.', () => { archiveTask(taskId); renderTasks(); });
        }
        if (target.classList.contains('restore-btn')) { restoreTask(target.dataset.taskId); renderTasks(); }
        if (target.classList.contains('delete-btn')) {
          const taskId = target.dataset.taskId;
          const task = taskStore.get(taskId);
          showConfirm('Delete Task', 'Are you sure you want to delete "' + task.title + '"? This cannot be undone.', () => { deleteTask(taskId); selectedIds.delete(taskId); updateBulkBar(); renderTasks(); });
        }
      });
      document.getElementById('bulkCancelBtn').addEventListener('click', () => { selectedIds.clear(); updateBulkBar(); renderTasks(); });
      document.getElementById('bulkArchiveBtn').addEventListener('click', () => { showConfirm('Archive Selected', 'Archive ' + selectedIds.size + ' selected tasks?', () => { selectedIds.forEach(id => archiveTask(id)); selectedIds.clear(); updateBulkBar(); renderTasks(); }); });
      document.getElementById('bulkRestoreBtn').addEventListener('click', () => { selectedIds.forEach(id => restoreTask(id)); selectedIds.clear(); updateBulkBar(); renderTasks(); });
      document.getElementById('bulkDeleteBtn').addEventListener('click', () => { showConfirm('Delete Selected', 'Delete ' + selectedIds.size + ' selected tasks? This cannot be undone.', () => { selectedIds.forEach(id => deleteTask(id)); selectedIds.clear(); updateBulkBar(); renderTasks(); }); });
      document.getElementById('confirmCancel').addEventListener('click', hideConfirm);
      document.getElementById('confirmClose').addEventListener('click', hideConfirm);
      document.getElementById('confirmAction').addEventListener('click', () => { if (confirmCallback) confirmCallback(); hideConfirm(); });
      document.getElementById('confirmModal').addEventListener('click', (e) => { if (e.target === document.getElementById('confirmModal')) hideConfirm(); });
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && document.getElementById('confirmModal').classList.contains('visible')) hideConfirm(); });
    });
  </script>
</body>
</html>`;

// Create HTTP server
const server = http.createServer((req, res) => {
  res.writeHead(200, { 
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-cache"
  });
  res.end(DASHBOARD_HTML);
});

server.listen(PORT, () => {
  console.log(`TaskFlow server running at http://localhost:${PORT}/`);
  console.log("Press Ctrl+C to stop");
});

export { server };
