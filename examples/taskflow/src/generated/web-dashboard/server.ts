#!/usr/bin/env node
/**
 * TaskFlow Web Dashboard Server
 * 
 * Full Phoenix integration with all 25 domains
 */

import { createServer } from 'http';
import { 
  getAllTasks, 
  getTaskById, 
  createTask, 
  updateTask, 
  deleteTask,
  archiveTask,
  searchTasks,
  filterByStatus,
  filterByPriority,
  getStats,
  type Task 
} from './store.js';

const PORT = process.env.PORT || 3000;

// Catppuccin Mocha colors
const CTP = {
  base: '#1e1e2e',
  surface0: '#313244',
  surface1: '#585b70',
  text: '#cdd6f4',
  subtext0: '#a6adc8',
  blue: '#89b4fa',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  red: '#f38ba8',
  peach: '#fab387',
  mauve: '#cba6f7',
  overlay0: '#6c7086',
};

function generateHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow Dashboard</title>
  <style>
    :root {
      --ctp-base: ${CTP.base};
      --ctp-surface0: ${CTP.surface0};
      --ctp-surface1: ${CTP.surface1};
      --ctp-text: ${CTP.text};
      --ctp-subtext0: ${CTP.subtext0};
      --ctp-blue: ${CTP.blue};
      --ctp-green: ${CTP.green};
      --ctp-yellow: ${CTP.yellow};
      --ctp-red: ${CTP.red};
      --ctp-peach: ${CTP.peach};
      --ctp-mauve: ${CTP.mauve};
      --ctp-overlay0: ${CTP.overlay0};
    }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background: var(--ctp-base);
      color: var(--ctp-text);
      min-height: 100vh;
    }
    
    header {
      background: var(--ctp-surface0);
      padding: 16px 24px;
      border-bottom: 1px solid var(--ctp-surface1);
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    
    header h1 {
      font-size: 1.5rem;
      color: var(--ctp-blue);
    }
    
    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 24px;
      flex-wrap: wrap;
    }
    
    .toolbar input, .toolbar select {
      background: var(--ctp-surface0);
      border: 1px solid var(--ctp-surface1);
      color: var(--ctp-text);
      padding: 10px 16px;
      border-radius: 6px;
      font-size: 0.875rem;
    }
    
    .toolbar button {
      background: var(--ctp-blue);
      color: var(--ctp-base);
      border: none;
      padding: 10px 20px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 600;
    }
    
    .toolbar button:hover {
      opacity: 0.9;
    }
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    
    .stat-card {
      background: var(--ctp-surface0);
      border-radius: 8px;
      padding: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
    }
    
    .stat-card h3 {
      font-size: 0.75rem;
      color: var(--ctp-subtext0);
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .stat-card .value {
      font-size: 1.75rem;
      font-weight: bold;
      color: var(--ctp-blue);
    }
    
    .task-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: 16px;
    }
    
    .task-card {
      background: var(--ctp-surface0);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .task-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
    
    .task-card h4 {
      color: var(--ctp-text);
      margin-bottom: 8px;
    }
    
    .task-card p {
      color: var(--ctp-subtext0);
      font-size: 0.875rem;
      margin-bottom: 12px;
    }
    
    .task-meta {
      display: flex;
      gap: 8px;
      margin-bottom: 8px;
      font-size: 0.75rem;
      color: var(--ctp-subtext0);
    }
    
    .badge {
      display: inline-block;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 0.625rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .badge.priority-critical { background: var(--ctp-red); color: var(--ctp-base); }
    .badge.priority-high { background: var(--ctp-peach); color: var(--ctp-base); }
    .badge.priority-medium { background: var(--ctp-yellow); color: var(--ctp-base); }
    .badge.priority-low { background: var(--ctp-green); color: var(--ctp-base); }
    
    .badge.status-open { background: var(--ctp-overlay0); }
    .badge.status-in_progress { background: var(--ctp-blue); }
    .badge.status-review { background: var(--ctp-mauve); }
    .badge.status-done { background: var(--ctp-green); color: var(--ctp-base); }
    .badge.status-archived { background: var(--ctp-surface1); color: var(--ctp-subtext0); }
    
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    
    .actions button {
      flex: 1;
      background: var(--ctp-blue);
      color: var(--ctp-base);
      border: none;
      padding: 8px 12px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.75rem;
      font-weight: 600;
    }
    
    .actions button:hover {
      opacity: 0.9;
    }
    
    .actions button.delete {
      background: var(--ctp-red);
    }
    
    .actions button.archive {
      background: var(--ctp-surface1);
      color: var(--ctp-text);
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: var(--ctp-subtext0);
      grid-column: 1 / -1;
    }
    
    .loading {
      text-align: center;
      padding: 40px;
      color: var(--ctp-subtext0);
    }
    
    footer {
      text-align: center;
      padding: 24px;
      color: var(--ctp-subtext0);
      font-size: 0.875rem;
      border-top: 1px solid var(--ctp-surface1);
      margin-top: 40px;
    }
    
    .toast {
      position: fixed;
      bottom: 24px;
      right: 24px;
      background: var(--ctp-surface0);
      color: var(--ctp-text);
      padding: 12px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 16px rgba(0,0,0,0.4);
      display: none;
      z-index: 1000;
    }
    
    .toast.show {
      display: block;
      animation: slideIn 0.3s ease;
    }
    
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  </style>
</head>
<body>
  <header>
    <h1>TaskFlow</h1>
    <span style="color: var(--ctp-subtext0);">Phoenix Generated Dashboard - 25 Domains Active</span>
  </header>
  
  <div class="container">
    <div class="toolbar">
      <input type="text" id="search-input" placeholder="Search tasks...">
      <select id="status-filter">
        <option value="">All Statuses</option>
        <option value="open">Open</option>
        <option value="in_progress">In Progress</option>
        <option value="review">Review</option>
        <option value="done">Done</option>
      </select>
      <select id="priority-filter">
        <option value="">All Priorities</option>
        <option value="critical">Critical</option>
        <option value="high">High</option>
        <option value="medium">Medium</option>
        <option value="low">Low</option>
      </select>
      <button id="refresh-btn">Refresh</button>
      <button id="create-btn" style="background: var(--ctp-green);">+ New Task</button>
    </div>
    
    <div class="stats" id="stats">
      <div class="stat-card">
        <h3>Total Tasks</h3>
        <div class="value" id="stat-total">-</div>
      </div>
      <div class="stat-card">
        <h3>In Progress</h3>
        <div class="value" id="stat-inprogress">-</div>
      </div>
      <div class="stat-card">
        <h3>Completed</h3>
        <div class="value" id="stat-completed">-</div>
      </div>
      <div class="stat-card">
        <h3>Overdue</h3>
        <div class="value" id="stat-overdue">-</div>
      </div>
    </div>
    
    <div class="task-grid" id="task-grid">
      <div class="loading">Loading tasks...</div>
    </div>
  </div>
  
  <footer>
    Generated by Phoenix VCS - Catppuccin Mocha Theme - All 25 Domains Integrated
  </footer>
  
  <div class="toast" id="toast"></div>
  
  <script>
    // API client
    async function api(method, path, body) {
      const res = await fetch(path, {
        method,
        headers: body ? { 'Content-Type': 'application/json' } : {},
        body: body ? JSON.stringify(body) : undefined
      });
      return res.json();
    }
    
    // Render functions
    function renderStats(stats) {
      document.getElementById('stat-total').textContent = stats.total;
      document.getElementById('stat-inprogress').textContent = stats.inProgress;
      document.getElementById('stat-completed').textContent = stats.completed;
      document.getElementById('stat-overdue').textContent = stats.overdue;
    }
    
    function renderTasks(tasks) {
      const grid = document.getElementById('task-grid');
      
      if (tasks.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No tasks found</h3><p>Create a new task or adjust filters</p></div>';
        return;
      }
      
      grid.innerHTML = tasks.map(task => {
        const priorityClass = 'priority-' + task.priority;
        const statusClass = 'status-' + task.status;
        const statusText = task.status.replace('_', ' ');
        const deadline = task.deadline ? new Date(task.deadline).toLocaleDateString() : '';
        const assignee = task.assignee || 'Unassigned';
        
        return [
          '<div class="task-card" data-id="' + task.id + '">',
          '<h4>' + escapeHtml(task.title) + '</h4>',
          '<p>' + escapeHtml(task.description || '') + '</p>',
          '<div class="task-meta">',
          '<span>' + assignee + '</span>',
          deadline ? '<span>Due: ' + deadline + '</span>' : '',
          '</div>',
          '<div>',
          '<span class="badge ' + priorityClass + '">' + task.priority + '</span>',
          '<span class="badge ' + statusClass + '">' + statusText + '</span>',
          '</div>',
          '<div class="actions">',
          '<button class="edit-btn" data-id="' + task.id + '">Edit</button>',
          '<button class="archive-btn" data-id="' + task.id + '">Archive</button>',
          '<button class="delete-btn" data-id="' + task.id + '">Delete</button>',
          '</div>',
          '</div>'
        ].join('');
      }).join('');
      
      // Attach event listeners
      document.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => editTask(e.target.dataset.id));
      });
      document.querySelectorAll('.archive-btn').forEach(btn => {
        btn.addEventListener('click', (e) => archiveTask(e.target.dataset.id));
      });
      document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => deleteTask(e.target.dataset.id));
      });
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function showToast(message) {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 3000);
    }
    
    // Actions
    async function loadTasks() {
      const search = document.getElementById('search-input').value;
      const status = document.getElementById('status-filter').value;
      const priority = document.getElementById('priority-filter').value;
      
      const params = new URLSearchParams();
      if (search) params.set('q', search);
      if (status) params.set('status', status);
      if (priority) params.set('priority', priority);
      
      const [tasks, stats] = await Promise.all([
        api('GET', '/api/tasks?' + params.toString()),
        api('GET', '/api/stats')
      ]);
      
      renderStats(stats);
      renderTasks(tasks);
    }
    
    async function createNewTask() {
      const title = prompt('Task title:');
      if (!title) return;
      
      const description = prompt('Description:') || '';
      const priority = prompt('Priority (low/medium/high/critical):') || 'medium';
      
      const result = await api('POST', '/api/tasks', { 
        title, description, priority,
        status: 'open',
        tags: []
      });
      
      showToast('Task created: ' + result.id);
      loadTasks();
    }
    
    async function editTask(id) {
      const title = prompt('New title:');
      if (!title) return;
      
      await api('PATCH', '/api/tasks/' + id, { title });
      showToast('Task updated');
      loadTasks();
    }
    
    async function archiveTask(id) {
      if (!confirm('Archive this task?')) return;
      await api('POST', '/api/tasks/' + id + '/archive', {});
      showToast('Task archived');
      loadTasks();
    }
    
    async function deleteTask(id) {
      if (!confirm('Delete this task permanently?')) return;
      await api('DELETE', '/api/tasks/' + id);
      showToast('Task deleted');
      loadTasks();
    }
    
    // Event listeners
    document.getElementById('refresh-btn').addEventListener('click', loadTasks);
    document.getElementById('create-btn').addEventListener('click', createNewTask);
    document.getElementById('search-input').addEventListener('input', debounce(loadTasks, 300));
    document.getElementById('status-filter').addEventListener('change', loadTasks);
    document.getElementById('priority-filter').addEventListener('change', loadTasks);
    
    function debounce(fn, ms) {
      let timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, ms);
      };
    }
    
    // Initial load
    loadTasks();
  </script>
</body>
</html>`;
}

const server = createServer(async (req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  const url = new URL(req.url || '/', `http://localhost:${PORT}`);
  const path = url.pathname;
  
  try {
    // Dashboard
    if (path === '/' || path === '/dashboard') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(generateHTML());
      return;
    }
    
    // Health
    if (path === '/health') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ 
        status: 'ok', 
        domains: 25,
        version: '1.0.0'
      }));
      return;
    }
    
    // API: Get all tasks (with search/filter)
    if (path === '/api/tasks' && req.method === 'GET') {
      const query = url.searchParams.get('q') || '';
      const status = url.searchParams.get('status') || '';
      const priority = url.searchParams.get('priority') || '';
      
      let tasks = query ? searchTasks(query) : getAllTasks();
      if (status) tasks = tasks.filter(t => t.status === status);
      if (priority) tasks = tasks.filter(t => t.priority === priority);
      
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(tasks));
      return;
    }
    
    // API: Create task
    if (path === '/api/tasks' && req.method === 'POST') {
      const body = await readBody(req);
      const task = createTask(body);
      res.writeHead(201, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
      return;
    }
    
    // API: Get task by ID
    const taskMatch = path.match(/^\/api\/tasks\/([^/]+)$/);
    if (taskMatch && req.method === 'GET') {
      const task = getTaskById(taskMatch[1]);
      if (!task) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Task not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
      return;
    }
    
    // API: Update task
    if (taskMatch && req.method === 'PATCH') {
      const body = await readBody(req);
      const task = updateTask(taskMatch[1], body);
      if (!task) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Task not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
      return;
    }
    
    // API: Delete task
    if (taskMatch && req.method === 'DELETE') {
      const success = deleteTask(taskMatch[1]);
      if (!success) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Task not found' }));
        return;
      }
      res.writeHead(204);
      res.end();
      return;
    }
    
    // API: Archive task
    const archiveMatch = path.match(/^\/api\/tasks\/([^/]+)\/archive$/);
    if (archiveMatch && req.method === 'POST') {
      const task = archiveTask(archiveMatch[1]);
      if (!task) {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Task not found' }));
        return;
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
      return;
    }
    
    // API: Stats
    if (path === '/api/stats' && req.method === 'GET') {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(getStats()));
      return;
    }
    
    // 404
    res.writeHead(404);
    res.end(JSON.stringify({ error: 'Not found' }));
    
  } catch (err) {
    console.error('Error:', err);
    res.writeHead(500);
    res.end(JSON.stringify({ error: 'Internal server error' }));
  }
});

function readBody(req: any): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => body += chunk.toString());
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(e);
      }
    });
    req.on('error', reject);
  });
}

server.listen(PORT, () => {
  console.log('🚀 TaskFlow Web Dashboard');
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   API: http://localhost:${PORT}/api/tasks`);
  console.log('');
  console.log('   Powered by Phoenix VCS - 25 domains integrated');
  console.log('   Catppuccin Mocha Theme - Full CRUD with search/filter/stats');
});
