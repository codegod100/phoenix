#!/usr/bin/env node
/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-colimit: 29eaf5668c0afbf2,7cce149b135824bc,169b3c51a6e13ea8,d46cdcd2f55a1f02,013287c893c1bba6,5d746ac1128920d7,fa4e979e652ff753,92d0c760174e68f5,fc1780770cf0e487,8f7a7e1c526a8fc3,f56c1390c9aa63a5,e9b69935bcb82130,eb7c109efd2e8536,12c44af604f1ae2d,7bde30d9da55ca74,8ae5c45f3147f2a0,1b10421cf0b4c927,b0512ab0394066ac,a2326ea173747bc5,c73fdbc477cf950a,b25d38068f5a68a7,fa4c83036ec9c9a9,379356eb108fd53b,2ff32cc95412bbeb,f5ffe871e50a8aa8
 * @phoenix-generated: 2026-04-08T20:58:38.056Z
 */

import { createServer } from 'http';
import { archiveTask, getArchivedTasks } from '../task/index.js';

const tasks = new Map();

const server = createServer((req, res) => {
  const path = req.url || '/';
  
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }
  
  // Get all tasks
  if (path === '/api/tasks' && req.method === 'GET') {
    const all = Array.from(tasks.values());
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(all));
    return;
  }
  
  // Get archived tasks
  if (path === '/api/tasks/archived' && req.method === 'GET') {
    const all = Array.from(tasks.values());
    const archived = all.filter(t => t.status === 'archived');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(archived));
    return;
  }
  
  // Archive a task
  const archiveMatch = path.match(/^\/api\/tasks\/([^\/]+)\/archive$/);
  if (archiveMatch && req.method === 'POST') {
    const id = archiveMatch[1];
    const task = tasks.get(id);
    if (task) {
      task.status = 'archived';
      if (typeof archiveTask === 'function') {
        archiveTask({ id, name: task.title });
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(task));
    } else {
      res.writeHead(404);
      res.end(JSON.stringify({ error: 'Task not found' }));
    }
    return;
  }
  
  // Serve dashboard
  if (path === '/' || path === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(`<!DOCTYPE html>
<html>
<head>
  <title>TaskFlow Dashboard</title>
  <style>
    :root { --base: #1e1e2e; --surface0: #313244; --text: #cdd6f4; --blue: #89b4fa; }
    body { font-family: system-ui, sans-serif; background: var(--base); color: var(--text); margin: 0; padding: 24px; }
    .tab-archived { opacity: 0.7; }
    .badge-archived { background: var(--surface0); text-decoration: line-through; }
  </style>
</head>
<body>
  <h1>TaskFlow Dashboard</h1>
  <div id="tabs">
    <button onclick="showTab('active')">Active</button>
    <button onclick="showTab('archived')">Archived</button>
  </div>
  <div id="active-tasks"></div>
  <div id="archived-tasks" style="display:none"></div>
  
  <script>
    let tasks = [];
    let currentTab = 'active';
    
    async function loadTasks() {
      const [active, archived] = await Promise.all([
        fetch('/api/tasks').then(r => r.json()),
        fetch('/api/tasks/archived').then(r => r.json())
      ]);
      tasks = [...active, ...archived];
      renderTasks();
    }
    
    function showTab(tab) {
      currentTab = tab;
      document.getElementById('active-tasks').style.display = tab === 'active' ? 'block' : 'none';
      document.getElementById('archived-tasks').style.display = tab === 'archived' ? 'block' : 'none';
      renderTasks();
    }
    
    function renderTasks() {
      const container = document.getElementById(currentTab + '-tasks');
      const filtered = tasks.filter(t => 
        currentTab === 'active' ? t.status !== 'archived' : t.status === 'archived'
      );
      
      container.innerHTML = filtered.map(t => 
        '<div class="task-card ' + (t.status === 'archived' ? 'tab-archived' : '') + '">' +
          '<span class="badge-' + t.status + '">' + t.status + '</span>' +
          '<h3>' + t.title + '</h3>' +
          '<p>' + (t.description || '') + '</p>' +
          (t.status !== 'archived' 
            ? '<button onclick="archiveTask(' + JSON.stringify(t.id) + ')">Archive</button>'
            : '<button onclick="restoreTask(' + JSON.stringify(t.id) + ')">Restore</button>'
          ) +
        '</div>'
      ).join('');
    }
    
    async function archiveTask(id) {
      await fetch('/api/tasks/' + encodeURIComponent(id) + '/archive', { method: 'POST' });
      await loadTasks();
    }
    
    async function restoreTask(id) {
      await fetch('/api/tasks/' + encodeURIComponent(id) + '/restore', { method: 'POST' });
      await loadTasks();
    }
    
    loadTasks();
  </script>
</body>
</html>`);
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000, () => {
  console.log('🚀 TaskFlow Dashboard');
  console.log('   Using:', ["process","setPriority","filterByPriority","setStatus","filterByStatus","assignTask","unassignTask","getUnassignedTasks","getCompletedTasks","archiveTask","getArchivedTasks","list","a","addTags","removeTags","getActiveTasks","setDeadline","getOverdueTasks","isTasks","getTaskss","searchTasks","bulk","deleteTask","editTask"]);
});
