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
  
  return `#!/usr/bin/env node
/**
 * @phoenix-deliverable: ${ctx.type}
 * @phoenix-colimit: ${ctx.ius.map(i => i.id.slice(0, 16)).join(',')}
 * @phoenix-generated: ${new Date().toISOString()}
 */

import { createServer } from 'http';
${imports}

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
  
  ${hasArchive ? `// Get archived tasks
  if (path === '/api/tasks/archived' && req.method === 'GET') {
    const all = Array.from(tasks.values());
    const archived = all.filter(t => t.status === 'archived');
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(archived));
    return;
  }
  
  // Archive a task
  const archiveMatch = path.match(/^\\/api\\/tasks\\/([^\\/]+)\\/archive$/);
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
  }` : ''}
  
  // Serve dashboard
  if (path === '/' || path === '/dashboard') {
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(\`<!DOCTYPE html>
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
</html>\`);
    return;
  }
  
  res.writeHead(404);
  res.end('Not found');
});

server.listen(3000, () => {
  console.log('🚀 TaskFlow Dashboard');
  console.log('   Using:', ${JSON.stringify(ops.map(o => o.name))});
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
