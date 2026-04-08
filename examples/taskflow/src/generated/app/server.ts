#!/usr/bin/env node
/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-colimit: 29eaf5668c0afbf2,7cce149b135824bc,169b3c51a6e13ea8,d46cdcd2f55a1f02,013287c893c1bba6,5d746ac1128920d7,fa4e979e652ff753,92d0c760174e68f5,fc1780770cf0e487,8f7a7e1c526a8fc3,f56c1390c9aa63a5,e9b69935bcb82130,eb7c109efd2e8536,12c44af604f1ae2d,7bde30d9da55ca74,8ae5c45f3147f2a0,1b10421cf0b4c927,b0512ab0394066ac,a2326ea173747bc5,c73fdbc477cf950a,b25d38068f5a68a7,fa4c83036ec9c9a9,379356eb108fd53b,2ff32cc95412bbeb,f5ffe871e50a8aa8
 * @phoenix-generated: 2026-04-08T20:13:28.060Z
 * 
 * THIS FILE IS GENERATED - imports and uses IU implementations
 */

import { createServer } from 'http';
import { process } from './metrics/index.js';
import { setPriority, filterByPriority, setStatus } from './priority/index.js';
import { assignTask, unassignTask, getUnassignedTasks } from './team/index.js';
import { setPriority, filterByPriority, getCompletedTasks } from './task/index.js';
import { assignTask, unassignTask, getUnassignedTasks } from './assignment/index.js';
import { isTasks, getTaskss, searchTasks } from './search/index.js';
import { setDeadline, getOverdueTasks, list } from './deadline/index.js';
import { setStatus, filterByStatus } from './status/index.js';
import { isTasks, getTaskss, getArchivedTasks } from './archive/index.js';
import { process } from './page/index.js';
import { setPriority, filterByPriority, setStatus } from './catppuccin/index.js';
import { process } from './base/index.js';
import { bulk, a } from './bulk/index.js';
import { deleteTask } from './delete/index.js';
import { process } from './confirmation/index.js';
import { setDeadline, getOverdueTasks, setPriority } from './create/index.js';
import { process } from './inline/index.js';
import { editTask, assignTask, unassignTask } from './edit/index.js';
import { process } from './component/index.js';
import { setStatus, filterByStatus } from './event/index.js';
import { getArchivedTasks } from './state/index.js';
import { getArchivedTasks, setStatus, filterByStatus } from './ui/index.js';
import { process } from './integration/index.js';
import { getOverdueTasks } from './overdue/index.js';
import { process } from './data/index.js';

// Data store (in-memory, replace with DB in production)
const tasks = new Map();

// Archive endpoint - uses Archive Domain IU
if (path === '/api/tasks/archived' && req.method === 'GET') {
  // Get all tasks and filter archived
  const all = Array.from(tasks.values());
  const archived = all.filter(t => t.status === 'archived');
  res.end(JSON.stringify(archived));
  return;
}

// Archive action - uses archiveTask from Archive Domain
if (path.match(/^/api/tasks/([^/]+)/archive$/) && req.method === 'POST') {
  const id = path.match(/^/api/tasks/([^/]+)/archive$/)[1];
  const task = tasks.get(id);
  if (task) {
    task.status = 'archived';
    // Call IU function if available
    if (typeof archiveTask === 'function') {
      archiveTask({ id, name: task.title });
    }
    res.end(JSON.stringify(task));
  } else {
    res.writeHead(404);
    res.end('{}');
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
    /* Catppuccin Mocha theme */
    :root {
      --base: #1e1e2e;
      --surface0: #313244;
      --text: #cdd6f4;
      --blue: #89b4fa;
    }
    body {
      font-family: system-ui, sans-serif;
      background: var(--base);
      color: var(--text);
      margin: 0;
      padding: 24px;
    }
    /* Archive tab styling */
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
      // Load both active and archived
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
      
      container.innerHTML = filtered.map(t => `
        <div class="task-card ${t.status === 'archived' ? 'tab-archived' : ''}">
          <span class="badge-${t.status}">${t.status}</span>
          <h3>${t.title}</h3>
          <p>${t.description || ''}</p>
          ${t.status !== 'archived' 
            ? `<button onclick="archiveTask('${t.id}')">Archive</button>`
            : `<button onclick="restoreTask('${t.id}')">Restore</button>`
          }
        </div>
      `).join('');
    }
    
    async function archiveTask(id) {
      await fetch(`/api/tasks/${id}/archive`, { method: 'POST' });
      await loadTasks();
    }
    
    async function restoreTask(id) {
      await fetch(`/api/tasks/${id}/restore`, { method: 'POST' });
      await loadTasks();
    }
    
    loadTasks();
  </script>
</body>
</html>`);
  return;
}

server.listen(3000, () => {
  console.log('🚀 TaskFlow Dashboard');
  console.log('   Using IU implementations:', ["process","setPriority","filterByPriority","setStatus","filterByStatus","assignTask","unassignTask","getUnassignedTasks","getCompletedTasks","archiveTask","getArchivedTasks","list","a","addTags","removeTags","getActiveTasks","setDeadline","getOverdueTasks","isTasks","getTaskss","searchTasks","bulk","deleteTask","editTask"]);
});
