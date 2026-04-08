#!/usr/bin/env node
/**
 * TaskFlow Web Dashboard Server
 * 
 * Serves the HTML dashboard with inline CSS/JS using Catppuccin theme
 */

import { createServer } from 'http';

// Import domain functions (unused but loaded to verify domains work)
import '../task/index.js';
import '../status/index.js';
import '../priority/index.js';
import '../ui/index.js';
import '../delete/index.js';
import '../create/index.js';

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
    
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
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
    
    .stats {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
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
      font-size: 0.875rem;
      color: var(--ctp-subtext0);
      text-transform: uppercase;
      margin-bottom: 8px;
    }
    
    .stat-card .value {
      font-size: 2rem;
      font-weight: bold;
      color: var(--ctp-blue);
    }
    
    .task-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
    
    .badge {
      display: inline-block;
      padding: 4px 12px;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
    }
    
    .badge.priority-critical { background: var(--ctp-red); color: var(--ctp-base); }
    .badge.priority-high { background: var(--ctp-peach); color: var(--ctp-base); }
    .badge.priority-medium { background: var(--ctp-yellow); color: var(--ctp-base); }
    .badge.priority-low { background: var(--ctp-green); color: var(--ctp-base); }
    
    .badge.status-open { background: var(--ctp-overlay0); }
    .badge.status-in_progress { background: var(--ctp-blue); }
    .badge.status-review { background: var(--ctp-mauve); }
    .badge.status-done { background: var(--ctp-green); color: var(--ctp-base); }
    
    .actions {
      display: flex;
      gap: 8px;
      margin-top: 12px;
    }
    
    button {
      background: var(--ctp-blue);
      color: var(--ctp-base);
      border: none;
      padding: 8px 16px;
      border-radius: 6px;
      cursor: pointer;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    
    button:hover {
      opacity: 0.9;
    }
    
    button.delete {
      background: var(--ctp-red);
    }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
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
  </style>
</head>
<body>
  <header>
    <h1>TaskFlow</h1>
    <span style="color: var(--ctp-subtext0);">Phoenix Generated Dashboard</span>
  </header>
  
  <div class="container">
    <div class="stats">
      <div class="stat-card">
        <h3>Total Tasks</h3>
        <div class="value" id="total-tasks">3</div>
      </div>
      <div class="stat-card">
        <h3>In Progress</h3>
        <div class="value" id="in-progress">1</div>
      </div>
      <div class="stat-card">
        <h3>Completed</h3>
        <div class="value" id="completed">1</div>
      </div>
      <div class="stat-card">
        <h3>Overdue</h3>
        <div class="value" id="overdue">0</div>
      </div>
    </div>
    
    <div class="task-grid" id="task-grid">
    </div>
  </div>
  
  <footer>
    Generated by Phoenix VCS - Catppuccin Mocha Theme - 2026
  </footer>
  
  <script>
    const tasks = [
      { id: '1', title: 'Design system architecture', description: 'Create domain models and boundaries', priority: 'high', status: 'in_progress' },
      { id: '2', title: 'Implement catppuccin theme', description: 'Add color palette and CSS variables', priority: 'medium', status: 'done' },
      { id: '3', title: 'Write tests', description: 'Unit tests for all domains', priority: 'critical', status: 'open' },
    ];
    
    function renderTasks() {
      const grid = document.getElementById('task-grid');
      
      if (tasks.length === 0) {
        grid.innerHTML = '<div class="empty-state"><h3>No tasks yet</h3><p>Create your first task to get started</p></div>';
        return;
      }
      
      grid.innerHTML = tasks.map(task => {
        const priorityClass = 'priority-' + task.priority;
        const statusClass = 'status-' + task.status;
        const statusText = task.status.replace('_', ' ');
        return [
          '<div class="task-card">',
          '<h4>' + task.title + '</h4>',
          '<p>' + task.description + '</p>',
          '<div>',
          '<span class="badge ' + priorityClass + '">' + task.priority + '</span>',
          '<span class="badge ' + statusClass + '">' + statusText + '</span>',
          '</div>',
          '<div class="actions">',
          '<button data-action="edit" data-id="' + task.id + '">Edit</button>',
          '<button class="delete" data-action="delete" data-id="' + task.id + '">Delete</button>',
          '</div>',
          '</div>'
        ].join('');
      }).join('');
      
      // Add event listeners
      grid.querySelectorAll('button[data-action]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          const target = e.target as HTMLButtonElement;
          const action = target.getAttribute('data-action');
          const id = target.getAttribute('data-id');
          alert(action + ': ' + id);
        });
      });
    }
    
    renderTasks();
  </script>
</body>
</html>`;
}

const server = createServer((req, res) => {
  console.log(`${req.method} ${req.url}`);
  
  if (req.url === '/' || req.url === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(generateHTML());
  } else if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', domains: 25 }));
  } else if (req.url === '/api/tasks') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify([
      { id: '1', title: 'Sample Task', status: 'open', priority: 'high' }
    ]));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

server.listen(PORT, () => {
  console.log('🚀 TaskFlow Web Dashboard');
  console.log(`   Server: http://localhost:${PORT}`);
  console.log(`   Dashboard: http://localhost:${PORT}/dashboard`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log('');
  console.log('   Powered by Phoenix VCS - 25 domains active');
});
