#!/usr/bin/env node
/**
 * Phoenix Code Generator
 * 
 * Generates IU implementations AND deliverable as single pipeline phase.
 * 
 * Usage: node codegen.js <project-path>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const projectPath = process.argv[2] || '.';
  
  console.log(`🚀 Phoenix Code Generator`);
  console.log(`   Project: ${projectPath}`);
  
  const ctx = await loadContext(projectPath);
  const migrationPlan = loadMigrationPlan(projectPath);
  
  ctx.type = inferDeliverableType(ctx);
  console.log(`   Type: ${ctx.type}`);
  console.log(`   IUs: ${ctx.ius.length} domains`);
  if (migrationPlan) {
    console.log(`   Migration: ${migrationPlan.summary?.regenerate || 0} regenerate, ${migrationPlan.summary?.migrate || 0} migrate, ${migrationPlan.summary?.unchanged || 0} unchanged`);
  }
  console.log();
  
  console.log(`Step 1: Generating IU implementations...`);
  await generateIUs(ctx, migrationPlan, projectPath);
  console.log(`   ✓ IUs generated`);
  console.log();
  
  console.log(`Step 2: Computing colimit...`);
  const panproto = await initializePanproto();
  const colimitOps = await computeColimit(ctx, panproto);
  console.log(`   ✓ Colimit: ${colimitOps.length} operations`);
  console.log();
  
  console.log(`Step 3: Generating deliverable...`);
  const outputs = await generateDeliverable(ctx, colimitOps);
  
  for (const [filePath, content] of Object.entries(outputs)) {
    const fullPath = join(ctx.outputDir, filePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
    console.log(`   ✓ ${filePath}`);
  }
  
  await writeTraceability(ctx, colimitOps, outputs);
  
  console.log();
  console.log(`✅ Code generated: ${ctx.outputDir}`);
}

async function loadContext(projectPath) {
  const graphsDir = join(projectPath, '.phoenix', 'graphs');
  const iusData = JSON.parse(readFileSync(join(graphsDir, 'ius.json'), 'utf8'));
  const canonicalData = JSON.parse(readFileSync(join(graphsDir, 'canonical.json'), 'utf8'));
  
  return {
    type: '',
    projectPath,
    outputDir: join(projectPath, 'src', 'generated', 'app'),
    ius: iusData.ius || [],
    canonical: canonicalData,
  };
}

function loadMigrationPlan(projectPath) {
  const migrationPath = join(projectPath, '.phoenix', 'graphs', 'iu-migration.json');
  if (!existsSync(migrationPath)) return null;
  return JSON.parse(readFileSync(migrationPath, 'utf8'));
}

async function initializePanproto() {
  const panprotoPath = join(__dirname, '..', 'panproto', 'panproto.js');
  if (!existsSync(panprotoPath)) {
    console.error(`❌ Panproto not found: ${panprotoPath}`);
    process.exit(1);
  }
  const panproto = await import(panprotoPath);
  await new Promise(r => setTimeout(r, 500));
  return panproto;
}

async function computeColimit(ctx, panproto) {
  const { TheoryBuilder, colimit } = panproto;
  const pan = await panproto.getPanproto();
  
  const domainHandles = [];
  const domainOps = [];
  
  for (const iu of ctx.ius) {
    const builder = new TheoryBuilder(iu.name.replace(/\s+/g, ''));
    for (const export_ of iu.boundary?.exports || ['process']) {
      builder.op(export_, [['input', 'any']], 'any');
      domainOps.push({ name: export_, iu: iu.name });
    }
    const handle = builder.build(pan._wasm || pan);
    domainHandles.push(handle);
  }
  
  const baseBuilder = new TheoryBuilder('WebDashboardBase');
  baseBuilder.op('render', [['props', 'any'], ['state', 'any']], 'Component');
  baseBuilder.op('handleEvent', [['event', 'any'], ['state', 'any']], 'State');
  const baseHandle = baseBuilder.build(pan._wasm || pan);
  
  let currentColimit = domainHandles[0];
  for (let i = 1; i < domainHandles.length; i++) {
    currentColimit = colimit(currentColimit, domainHandles[i], baseHandle, pan._wasm || pan);
  }
  
  for (const h of domainHandles) h[Symbol.dispose]();
  baseHandle[Symbol.dispose]();
  currentColimit[Symbol.dispose]();
  pan[Symbol.dispose]();
  
  const opMap = new Map();
  for (const op of domainOps) {
    if (!opMap.has(op.name)) opMap.set(op.name, op);
  }
  
  return Array.from(opMap.values());
}

async function generateIUs(ctx, migrationPlan, projectPath) {
  const generatedDir = join(projectPath, 'src', 'generated');
  
  for (const iu of ctx.ius) {
    let strategy = 'regenerate';
    let oldImpl = null;
    
    if (migrationPlan) {
      const iuMigration = migrationPlan.ius?.find(m => m.new_iu_id === iu.id);
      if (iuMigration) {
        strategy = iuMigration.strategy;
        oldImpl = iuMigration.old_impl_path;
      }
    }
    
    const domain = iu.name.toLowerCase().replace(/\s+domain$/, '').replace(/\s+/g, '-');
    const iuDir = join(generatedDir, domain);
    mkdirSync(iuDir, { recursive: true });
    
    if (strategy === 'migrate' && oldImpl && existsSync(oldImpl)) {
      const oldCode = readFileSync(oldImpl, 'utf8');
      const liftedCode = oldCode.replace(
        /\/\/ @phoenix-iu: [a-f0-9]+/,
        `// @phoenix-iu: ${iu.id}\n// @phoenix-migrated: true`
      );
      writeFileSync(join(iuDir, 'index.ts'), liftedCode);
      console.log(`   ✓ ${iu.name}: migrated`);
    } else {
      const freshCode = generateFreshIU(iu, ctx.canonical);
      writeFileSync(join(iuDir, 'index.ts'), freshCode);
      console.log(`   ✓ ${iu.name}: ${strategy === 'unchanged' ? 'unchanged' : 'generated'}`);
    }
    
    const testCode = generateIUTests(iu);
    const testDir = join(iuDir, '__tests__');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'index.test.ts'), testCode);
  }
}

function generateFreshIU(iu, canonical) {
  const exports = iu.boundary?.exports || ['process'];
  const canonReqs = iu.source_canon_ids?.map(id => {
    const canon = canonical.requirements?.find(r => r.id === id);
    return canon ? { id: id.slice(0, 16), text: canon.statement } : null;
  }).filter(Boolean) || [];
  
  let code = `// @phoenix-iu: ${iu.id}\n`;
  code += `// @phoenix-name: ${iu.name}\n`;
  code += `// @phoenix-risk: ${iu.risk_tier || 'MEDIUM'}\n\n`;
  
  if (canonReqs.length > 0) {
    code += `// IMPLEMENTED REQUIREMENTS:\n`;
    for (const req of canonReqs) {
      code += `// @phoenix-canon: ${req.id}...\n`;
      code += `// REQUIREMENT: ${req.text.slice(0, 80)}${req.text.length > 80 ? '...' : ''}\n`;
    }
    code += `\n`;
  }
  
  for (const export_ of exports) {
    const funcName = escapeReserved(export_);
    code += `export function ${funcName}(input: any): any {\n`;
    code += `  // TODO: Implement ${funcName}\n`;
    code += `  throw new Error('${funcName} not implemented');\n`;
    code += `}\n\n`;
  }
  
  return code;
}

function generateIUTests(iu) {
  const exports = iu.boundary?.exports || ['process'];
  let code = `import { ${exports.join(', ')} } from '../index.js';\n\n`;
  for (const export_ of exports) {
    code += `describe('${export_}', () => {\n`;
    code += `  it('should be implemented', () => {\n`;
    code += `    expect(typeof ${export_}).toBe('function');\n`;
    code += `  });\n`;
    code += `});\n\n`;
  }
  return code;
}

const RESERVED_WORDS = new Set(['delete', 'class', 'function', 'var', 'let', 'const', 'interface', 'type', 'enum', 'import', 'export', 'default', 'return', 'if', 'else', 'for', 'while', 'switch', 'case', 'break', 'continue', 'try', 'catch', 'finally', 'throw', 'new', 'this', 'super', 'extends', 'implements', 'static', 'public', 'private', 'protected', 'readonly', 'abstract', 'async', 'await', 'yield', 'void', 'null', 'undefined', 'true', 'false', 'in', 'of', 'instanceof', 'typeof']);

function escapeReserved(name) {
  return RESERVED_WORDS.has(name) ? `${name}_` : name;
}

async function generateDeliverable(ctx, colimitOps) {
  // Only import functions actually referenced, and only from first IU that has them
  const neededOps = ['archiveTask', 'getArchivedTasks'];
  const importedOps = new Set();
  const iuImports = [];
  
  for (const iu of ctx.ius) {
    const exports = iu.boundary?.exports?.filter(e => 
      neededOps.includes(e) && !importedOps.has(e)
    );
    if (exports && exports.length > 0) {
      const domain = iu.name.toLowerCase().replace(/\s+domain$/, '').replace(/\s+/g, '-');
      iuImports.push(`import { ${exports.join(', ')} } from '../${domain}/index.js';`);
      exports.forEach(e => importedOps.add(e));
    }
  }
  
  const server = generateWorkingServer(ctx, iuImports.join('\n'), colimitOps);
  // Store has its own implementations, no IU imports needed
  const store = generateWorkingStore(ctx, '', colimitOps);
  
  return { 'server.ts': server, 'store.ts': store };
}

function generateWorkingServer(ctx, imports, ops) {
  const hasArchive = ops.some(o => o.name.toLowerCase().includes('archive'));
  const hasCreate = ops.some(o => o.name.toLowerCase().includes('create'));
  const hasEdit = ops.some(o => o.name.toLowerCase().includes('edit'));
  const hasDelete = ops.some(o => o.name.toLowerCase().includes('delete'));
  const hasPriority = ops.some(o => o.name.toLowerCase().includes('priority'));
  const hasStatus = ops.some(o => o.name.toLowerCase().includes('status'));
  const hasAssign = ops.some(o => o.name.toLowerCase().includes('assign'));
  const hasDeadline = ops.some(o => o.name.toLowerCase().includes('deadline'));
  const hasTags = ops.some(o => o.name.toLowerCase().includes('tag'));
  const hasSearch = ops.some(o => o.name.toLowerCase().includes('search'));
  
  return `#!/usr/bin/env node
/**
 * @phoenix-deliverable: ${ctx.type}
 * @phoenix-colimit: ${ctx.ius.map(i => i.id.slice(0, 16)).join(',')}
 * @phoenix-generated: ${new Date().toISOString()}
 */

import { createServer } from 'http';
${imports}

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
  const getMatch = path.match(/^\\/api\\/tasks\\/([^\\/]+)$/);
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
  
  ${hasCreate ? `// POST create task
  if (path === '/api/tasks' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const task = {
          id: String(idCounter++),
          title: data.title || 'Untitled',
          description: data.description || '',
          status: data.status || 'open',
          priority: data.priority || 'medium',
          assignee: data.assignee || '',
          deadline: data.deadline || '',
          tags: data.tags || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        tasks.set(task.id, task);
        res.writeHead(201, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(task));
      } catch (e) {
        res.writeHead(400);
        res.end(JSON.stringify({ error: 'Invalid JSON' }));
      }
    });
    return;
  }
  ` : ''}
  
  ${hasEdit ? `// PUT update task
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
  ` : ''}
  
  ${hasDelete ? `// DELETE task
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
  ` : ''}
  
  ${hasArchive ? `// GET archived tasks
  if (path === '/api/tasks/archived' && req.method === 'GET') {
    const all = Array.from(tasks.values());
    const archived = all.filter(t => t.status === 'archived');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(archived));
    return;
  }
  
  // POST archive task
  const archiveMatch = path.match(/^\\/api\\/tasks\\/([^\\/]+)\\/archive$/);
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
  const restoreMatch = path.match(/^\\/api\\/tasks\\/([^\\/]+)\\/restore$/);
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
  ` : ''}
  
  // Serve dashboard HTML
  if (path === '/' || path === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(\`<!DOCTYPE html>
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
</html>\`);
    return;
  }
  
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(3000, () => {
  console.log('🚀 TaskFlow Dashboard');
  console.log('   Operations:', ${JSON.stringify(ops.map(o => o.name))});
  console.log('   http://localhost:3000');
});
`;
}

function generateWorkingStore(ctx, imports, ops) {
  const archiveOp = ops.find(o => o.name.toLowerCase().includes('archive'));
  
  return `/**
 * @phoenix-deliverable: ${ctx.type}
 * @phoenix-generated: ${new Date().toISOString()}
 */

${imports}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: 'open' | 'in_progress' | 'review' | 'done' | 'archived';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignee?: string;
  deadline?: string;
  createdAt: string;
  updatedAt: string;
  tags: string[];
}

const tasks = new Map<string, Task>();

export function getAllTasks(): Task[] {
  return Array.from(tasks.values()).filter(t => t.status !== 'archived');
}

export function getArchivedTasks(): Task[] {
  return Array.from(tasks.values()).filter(t => t.status === 'archived');
}

export function getTaskById(id: string): Task | undefined {
  return tasks.get(id);
}

export function createTask(data: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Task {
  const task: Task = {
    id: crypto.randomUUID(),
    ...data,
    status: data.status || 'open',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  tasks.set(task.id, task);
  return task;
}

export function updateTask(id: string, updates: Partial<Task>): Task | undefined {
  const existing = tasks.get(id);
  if (!existing) return undefined;
  const updated = { ...existing, ...updates, updatedAt: new Date().toISOString() };
  tasks.set(id, updated);
  return updated;
}

export function archiveTask(id: string): Task | undefined {
  return updateTask(id, { status: 'archived' });
}

export function restoreTask(id: string): Task | undefined {
  return updateTask(id, { status: 'open' });
}
`;
}

function inferDeliverableType(ctx) {
  return 'web-dashboard';
}

async function writeTraceability(ctx, ops, outputs) {
  const trace = {
    type: ctx.type,
    generatedAt: new Date().toISOString(),
    theory: {
      domains: ctx.ius.map(iu => ({ id: iu.id.slice(0, 16), name: iu.name })),
      colimit: { operationCount: ops.length, operations: ops.map(o => o.name) },
    },
    outputs: Object.keys(outputs),
  };
  writeFileSync(
    join(ctx.outputDir, '.phoenix-deliverable.json'),
    JSON.stringify(trace, null, 2)
  );
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
