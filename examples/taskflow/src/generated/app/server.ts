#!/usr/bin/env node
/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-colimit: 29eaf5668c0afbf2,7cce149b135824bc,169b3c51a6e13ea8,d46cdcd2f55a1f02,013287c893c1bba6,5d746ac1128920d7,fa4e979e652ff753,92d0c760174e68f5,fc1780770cf0e487,8f7a7e1c526a8fc3,f56c1390c9aa63a5,e9b69935bcb82130,eb7c109efd2e8536,12c44af604f1ae2d,7bde30d9da55ca74,8ae5c45f3147f2a0,1b10421cf0b4c927,b0512ab0394066ac,a2326ea173747bc5,c73fdbc477cf950a,b25d38068f5a68a7,fa4c83036ec9c9a9,379356eb108fd53b,2ff32cc95412bbeb,f5ffe871e50a8aa8
 * @phoenix-generated: 2026-04-08T21:32:11.295Z
 */

import { createServer } from 'http';
import { archiveTask, getArchivedTasks } from '../task/index.js';

const tasks = new Map();
let idCounter = 1;

const server = createServer((req, res) => {
  const path = req.url || '/';
  
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // GET all tasks
  if (path === '/api/tasks' && req.method === 'GET') {
    const all = Array.from(tasks.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(all));
    return;
  }
  
  // GET single task
  const getMatch = path.match(/^\/api\/tasks\/([^\/]+)$/);
  if (getMatch && req.method === 'GET') {
    const id = getMatch[1];
    const task = tasks.get(id);
    if (task) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    return;
  }
  
  
  
  // PUT update task
  if (getMatch && req.method === 'PUT') {
    const id = getMatch[1];
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const updates = JSON.parse(body);
        const task = tasks.get(id);
        if (task) {
          Object.assign(task, updates, { updatedAt: new Date().toISOString() });
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(task));
        } else {
          res.writeHead(404);
          res.end(JSON.stringify({ error: 'Task not found' }));
        }
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  
  
  // DELETE task
  if (getMatch && req.method === 'DELETE') {
    const id = getMatch[1];
    if (tasks.has(id)) {
      tasks.delete(id);
      res.writeHead(204);
      res.end();
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    return;
  }
  
  
  // GET archived tasks
  if (path === '/api/tasks/archived' && req.method === 'GET') {
    const all = Array.from(tasks.values());
    const archived = all.filter(t => t.status === 'archived');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(archived));
    return;
  }
  
  // POST archive task
  const archiveMatch = path.match(/^\/api\/tasks\/([^\/]+)\/archive$/);
  if (archiveMatch && req.method === 'POST') {
    const id = archiveMatch[1];
    const task = tasks.get(id);
    if (task) {
      task.status = 'archived';
      task.updatedAt = new Date().toISOString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    return;
  }
  
  // POST restore task
  const restoreMatch = path.match(/^\/api\/tasks\/([^\/]+)\/restore$/);
  if (restoreMatch && req.method === 'POST') {
    const id = restoreMatch[1];
    const task = tasks.get(id);
    if (task) {
      task.status = 'open';
      task.updatedAt = new Date().toISOString();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    return;
  }
  
  
  // Serve dashboard HTML
  if (path === '/' || path === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>TaskFlow Dashboard</title>
  <style>
    :root {
      --base: #1e1e2e; --surface0: #313244; --surface1: #45475a;
      --text: #cdd6f4; --subtext: #a6adc8; --blue: #89b4fa;
      --green: #a6e3a1; --red: #f38ba8; --yellow: #f9e2af;
      --crust: #11111b;
    }
    * { box-sizing: border-box; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--base);
      color: var(--text);
      margin: 0;
      padding: 24px;
      line-height: 1.6;
    }
    h1 { margin: 0 0 24px 0; font-size: 28px; }
    .toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
      align-items: center;
    }
    button {
      background: var(--surface0);
      color: var(--text);
      border: 1px solid var(--surface1);
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
    }
    button:hover { background: var(--surface1); }
    button.primary { background: var(--blue); color: var(--crust); border: none; }
    button.primary:hover { opacity: 0.9; }
    button.danger { background: var(--red); color: var(--crust); border: none; }
    .tabs { display: flex; gap: 8px; margin-bottom: 16px; }
    .tab { background: transparent; border: 1px solid var(--surface1); }
    .tab.active { background: var(--surface1); }
    input, select, textarea {
      background: var(--surface0);
      color: var(--text);
      border: 1px solid var(--surface1);
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 14px;
    }
    .search-box { min-width: 200px; }
    .task-card {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 8px;
      padding: 16px;
      margin-bottom: 12px;
    }
    .task-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px; }
    .task-title { font-size: 18px; font-weight: 600; margin: 0; }
    .task-meta { display: flex; gap: 12px; font-size: 13px; color: var(--subtext); flex-wrap: wrap; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
    }
    .badge-open { background: var(--blue); color: var(--crust); }
    .badge-in_progress { background: var(--yellow); color: var(--crust); }
    .badge-done { background: var(--green); color: var(--crust); }
    .badge-archived { background: var(--surface1); opacity: 0.7; }
    .badge-priority-high { background: var(--red); color: var(--crust); }
    .badge-priority-medium { background: var(--yellow); color: var(--crust); }
    .badge-priority-low { background: var(--blue); color: var(--crust); }
    .task-actions { display: flex; gap: 8px; margin-top: 12px; }
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.open { display: flex; }
    .modal {
      background: var(--surface0);
      border: 1px solid var(--surface1);
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 4px; font-size: 13px; color: var(--subtext); }
    .form-group input, .form-group select, .form-group textarea { width: 100%; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 24px; }
    .tag-input { display: flex; gap: 8px; flex-wrap: wrap; }
    .tag { background: var(--surface1); padding: 2px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>📋 TaskFlow Dashboard</h1>
  
  <div class="toolbar">
    <button class="primary" onclick="openModal()">+ New Task</button>
    <input type="text" class="search-box" id="searchInput" placeholder="Search tasks..." oninput="renderTasks()">
    <select id="filterStatus" onchange="renderTasks()">
      <option value="">All Status</option>
      <option value="open">Open</option>
      <option value="in_progress">In Progress</option>
      <option value="review">Review</option>
      <option value="done">Done</option>
    </select>
    <select id="filterPriority" onchange="renderTasks()">
      <option value="">All Priorities</option>
      <option value="critical">Critical</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
    </select>
  </div>
  
  <div class="tabs">
    <button class="tab active" id="tab-active" onclick="setTab('active')">Active</button>
    <button class="tab" id="tab-archived" onclick="setTab('archived')">Archived</button>
    <button class="tab" id="tab-all" onclick="setTab('all')">All</button>
  </div>
  
  <div id="taskList"></div>
  
  <!-- Create/Edit Modal -->
  <div class="modal-overlay" id="modal">
    <div class="modal">
      <h2 id="modalTitle">New Task</h2>
      <input type="hidden" id="taskId">
      <div class="form-group">
        <label>Title</label>
        <input type="text" id="taskTitle" placeholder="Task title...">
      </div>
      <div class="form-group">
        <label>Description</label>
        <textarea id="taskDesc" rows="3" placeholder="Description..."></textarea>
      </div>
      <div class="form-group">
        <label>Status</label>
        <select id="taskStatus">
          <option value="open">Open</option>
          <option value="in_progress">In Progress</option>
          <option value="review">Review</option>
          <option value="done">Done</option>
        </select>
      </div>
      <div class="form-group">
        <label>Priority</label>
        <select id="taskPriority">
          <option value="low">Low</option>
          <option value="medium">Medium</option>
          <option value="high">High</option>
          <option value="critical">Critical</option>
        </select>
      </div>
      <div class="form-group">
        <label>Assignee</label>
        <input type="text" id="taskAssignee" placeholder="@username">
      </div>
      <div class="form-group">
        <label>Deadline</label>
        <input type="date" id="taskDeadline">
      </div>
      <div class="form-group">
        <label>Tags (comma separated)</label>
        <input type="text" id="taskTags" placeholder="frontend, urgent, bug...">
      </div>
      <div class="form-actions">
        <button onclick="closeModal()">Cancel</button>
        <button class="primary" onclick="saveTask()">Save</button>
      </div>
    </div>
  </div>
  
  <script>
    let tasks = [];
    let currentTab = 'active';
    let editingId = null;
    
    async function loadTasks() {
      const res = await fetch('/api/tasks');
      tasks = await res.json();
      renderTasks();
    }
    
    function setTab(tab) {
      currentTab = tab;
      document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
      document.getElementById('tab-' + tab).classList.add('active');
      renderTasks();
    }
    
    function renderTasks() {
      const search = document.getElementById('searchInput').value.toLowerCase();
      const statusFilter = document.getElementById('filterStatus').value;
      const priorityFilter = document.getElementById('filterPriority').value;
      
      let filtered = tasks.filter(t => {
        if (currentTab === 'active' && t.status === 'archived') return false;
        if (currentTab === 'archived' && t.status !== 'archived') return false;
        if (search && !t.title.toLowerCase().includes(search) && !t.description?.toLowerCase().includes(search)) return false;
        if (statusFilter && t.status !== statusFilter) return false;
        if (priorityFilter && t.priority !== priorityFilter) return false;
        return true;
      });
      
      const container = document.getElementById('taskList');
      if (filtered.length === 0) {
        container.innerHTML = '<p style="color: var(--subtext); text-align: center; padding: 40px;">No tasks found</p>';
        return;
      }
      
      container.innerHTML = filtered.map(t => {
        const tagsHtml = (t.tags || []).map(tag => '<span class="tag">' + tag + '</span>').join('');
        return '<div class="task-card">' +
          '<div class="task-header">' +
            '<h3 class="task-title">' + escapeHtml(t.title) + '</h3>' +
            '<span class="badge badge-' + t.status + '">' + t.status.replace('_', ' ') + '</span>' +
          '</div>' +
          '<p style="margin: 8px 0; color: var(--subtext);">' + escapeHtml(t.description || '') + '</p>' +
          '<div class="task-meta">' +
            '<span class="badge badge-priority-' + t.priority + '">' + t.priority + '</span>' +
            (t.assignee ? '<span>👤 ' + escapeHtml(t.assignee) + '</span>' : '') +
            (t.deadline ? '<span>📅 ' + t.deadline + '</span>' : '') +
            tagsHtml +
          '</div>' +
          '<div class="task-actions">' +
            '<button onclick="editTask(' + JSON.stringify(t.id) + ')">Edit</button>' +
            (t.status === 'archived' 
              ? '<button onclick="restoreTask(' + JSON.stringify(t.id) + ')">Restore</button>'
              : '<button onclick="archiveTask(' + JSON.stringify(t.id) + ')">Archive</button>'
            ) +
            '<button class="danger" onclick="deleteTask(' + JSON.stringify(t.id) + ')">Delete</button>' +
          '</div>' +
        '</div>';
      }).join('');
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function openModal(id = null) {
      editingId = id;
      document.getElementById('modalTitle').textContent = id ? 'Edit Task' : 'New Task';
      if (id) {
        const t = tasks.find(x => x.id === id);
        document.getElementById('taskId').value = t.id;
        document.getElementById('taskTitle').value = t.title;
        document.getElementById('taskDesc').value = t.description || '';
        document.getElementById('taskStatus').value = t.status;
        document.getElementById('taskPriority').value = t.priority || 'medium';
        document.getElementById('taskAssignee').value = t.assignee || '';
        document.getElementById('taskDeadline').value = t.deadline || '';
        document.getElementById('taskTags').value = (t.tags || []).join(', ');
      } else {
        document.getElementById('taskId').value = '';
        document.getElementById('taskTitle').value = '';
        document.getElementById('taskDesc').value = '';
        document.getElementById('taskStatus').value = 'open';
        document.getElementById('taskPriority').value = 'medium';
        document.getElementById('taskAssignee').value = '';
        document.getElementById('taskDeadline').value = '';
        document.getElementById('taskTags').value = '';
      }
      document.getElementById('modal').classList.add('open');
    }
    
    function closeModal() {
      document.getElementById('modal').classList.remove('open');
      editingId = null;
    }
    
    async function saveTask() {
      const data = {
        title: document.getElementById('taskTitle').value,
        description: document.getElementById('taskDesc').value,
        status: document.getElementById('taskStatus').value,
        priority: document.getElementById('taskPriority').value,
        assignee: document.getElementById('taskAssignee').value,
        deadline: document.getElementById('taskDeadline').value,
        tags: document.getElementById('taskTags').value.split(',').map(t => t.trim()).filter(t => t)
      };
      
      const id = document.getElementById('taskId').value;
      if (id) {
        await fetch('/api/tasks/' + id, { method: 'PUT', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
      } else {
        await fetch('/api/tasks', { method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(data) });
      }
      closeModal();
      await loadTasks();
    }
    
    function editTask(id) {
      openModal(id);
    }
    
    async function archiveTask(id) {
      await fetch('/api/tasks/' + id + '/archive', { method: 'POST' });
      await loadTasks();
    }
    
    async function restoreTask(id) {
      await fetch('/api/tasks/' + id + '/restore', { method: 'POST' });
      await loadTasks();
    }
    
    async function deleteTask(id) {
      if (!confirm('Delete this task?')) return;
      await fetch('/api/tasks/' + id, { method: 'DELETE' });
      await loadTasks();
    }
    
    // Close modal on overlay click
    document.getElementById('modal').addEventListener('click', e => {
      if (e.target.id === 'modal') closeModal();
    });
    
    loadTasks();
  </script>
</body>
</html>`);
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000, () => {
  console.log('🚀 TaskFlow Dashboard');
  console.log('   Operations:', ["process","setPriority","filterByPriority","setStatus","filterByStatus","assignTask","unassignTask","getUnassignedTasks","getCompletedTasks","archiveTask","getArchivedTasks","list","a","addTags","removeTags","getActiveTasks","setDeadline","getOverdueTasks","isTasks","getTaskss","searchTasks","bulk","deleteTask","editTask"]);
  console.log('   http://localhost:3000');
});
