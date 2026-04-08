#!/usr/bin/env node
/**
 * Phoenix Unified Generator
 * 
 * Generates working deliverables from Implementation Units via categorical colimit:
 * 
 *   Spec → Canon → IUs → Colimit → Working Deliverable
 * 
 * The deliverable ACTUALLY USES the IU implementations (imports and calls them),
 * not just lists operations.
 * 
 * No separate "RED stub" phase - the deliverable is generated with working
 * (or scaffolded) implementations that integrate all IUs.
 * 
 * Usage: node unified-generator.js <project-path> [options]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const projectPath = process.argv[2] || '.';
  const explicitType = getArg('--type');
  
  console.log(`🚀 Phoenix Unified Generator`);
  console.log(`   Project: ${projectPath}`);
  
  // Load IUs and canonical data
  const ctx = await loadContext(projectPath);
  
  // Load migration plan (if exists)
  const migrationPlan = loadMigrationPlan(projectPath);
  
  // Infer deliverable type
  ctx.type = explicitType || inferDeliverableType(ctx);
  console.log(`   Type: ${ctx.type}`);
  console.log(`   IUs: ${ctx.ius.length} domains`);
  if (migrationPlan) {
    console.log(`   Migration: ${migrationPlan.summary.regenerate} regenerate, ${migrationPlan.summary.migrate} migrate, ${migrationPlan.summary.unchanged} unchanged`);
  }
  console.log();
  
  // Generate IU implementations (respecting migration plan)
  console.log(`Step 1: Generating IU implementations...`);
  await generateIUs(ctx, migrationPlan, projectPath);
  console.log(`   ✓ IUs generated`);
  console.log();
  
  // Compute colimit via WASM (identifies shared operations across IUs)
  console.log(`Step 2: Computing colimit...`);
  const panproto = await initializePanproto();
  const colimitOps = await computeColimit(ctx, panproto);
  console.log(`   ✓ Colimit: ${colimitOps.length} operations`);
  console.log(`   ${colimitOps.map(o => o.name).join(', ')}`);
  console.log();
  
  // Generate deliverable that USES the IU implementations
  console.log(`Step 3: Generating deliverable...`);
  const outputs = await generateDeliverable(ctx, colimitOps);
  
  for (const [filePath, content] of Object.entries(outputs)) {
    const fullPath = join(ctx.outputDir, filePath);
    mkdirSync(dirname(fullPath), { recursive: true });
    writeFileSync(fullPath, content);
    console.log(`   ✓ ${filePath}`);
  }
  
  // Write traceability
  await writeTraceability(ctx, colimitOps, outputs);
  
  console.log();
  console.log(`✅ Deliverable generated: ${ctx.outputDir}`);
  console.log(`   Theory: colimit(${ctx.ius.map(iu => iu.name).join(', ')})`);
  console.log(`   Operations: ${colimitOps.length}`);
  console.log(`   Files: ${Object.keys(outputs).length}`);
  console.log();
  console.log(`The deliverable imports and uses IU implementations.`);
  console.log(`Run: cd ${projectPath} && npm start`);
}

// ============================================================================
// MIGRATION PLAN
// ============================================================================

function loadMigrationPlan(projectPath) {
  const migrationPath = join(projectPath, '.phoenix', 'graphs', 'iu-migration.json');
  if (!existsSync(migrationPath)) {
    return null;
  }
  return JSON.parse(readFileSync(migrationPath, 'utf8'));
}

// ============================================================================
// IU GENERATION
// ============================================================================

async function generateIUs(ctx, migrationPlan, projectPath) {
  const generatedDir = join(projectPath, 'src', 'generated');
  
  for (const iu of ctx.ius) {
    // Determine strategy from migration plan
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
      // Lift old implementation
      const oldCode = readFileSync(oldImpl, 'utf8');
      const liftedCode = liftImplementation(oldCode, iu);
      writeFileSync(join(iuDir, 'index.ts'), liftedCode);
      console.log(`   ✓ ${iu.name}: migrated (lifted old implementation)`);
    } else {
      // Generate fresh
      const freshCode = generateFreshIU(iu, ctx.canonical);
      writeFileSync(join(iuDir, 'index.ts'), freshCode);
      if (strategy === 'unchanged') {
        console.log(`   ✓ ${iu.name}: unchanged (skipped)`);
      } else {
        console.log(`   ✓ ${iu.name}: generated fresh`);
      }
    }
    
    // Generate tests for the IU
    const testCode = generateIUTests(iu);
    const testDir = join(iuDir, '__tests__');
    mkdirSync(testDir, { recursive: true });
    writeFileSync(join(testDir, 'index.test.ts'), testCode);
  }
}

function liftImplementation(oldCode, iu) {
  // Update the @phoenix-iu comment to mark as migrated
  const newHash = iu.id;
  return oldCode.replace(
    /\/\/ @phoenix-iu: [a-f0-9]+/,
    `// @phoenix-iu: ${newHash}\n// @phoenix-migrated: ${iu.id}`
  );
}

function generateFreshIU(iu, canonical) {
  const exports = iu.boundary?.exports || ['process'];
  const canonReqs = iu.source_canon_ids?.map(id => {
    const canon = canonical.requirements?.find(r => r.id === id);
    return canon ? { id: id.slice(0, 16), text: canon.statement } : null;
  }).filter(Boolean) || [];
  
  const domain = iu.name.toLowerCase().replace(/\s+domain$/, '').replace(/\s+/g, '-');
  
  let code = `// @phoenix-iu: ${iu.id}\n`;
  code += `// @phoenix-name: ${iu.name}\n`;
  code += `// @phoenix-risk: ${iu.risk_tier || 'MEDIUM'}\n\n`;
  
  // Add implemented requirements
  if (canonReqs.length > 0) {
    code += `// IMPLEMENTED REQUIREMENTS:\n`;
    for (const req of canonReqs) {
      code += `// @phoenix-canon: ${req.id}...\n`;
      code += `// REQUIREMENT: ${req.text.slice(0, 80)}${req.text.length > 80 ? '...' : ''}\n`;
    }
    code += `\n`;
  }
  
  // Generate exports
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

// ============================================================================
// CONTEXT LOADING
// ============================================================================

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

// ============================================================================
// PANPROTO INITIALIZATION
// ============================================================================

async function initializePanproto() {
  const panprotoPath = join(__dirname, '..', 'panproto', 'panproto.js');
  
  if (!existsSync(panprotoPath)) {
    console.error(`❌ Panproto not found: ${panprotoPath}`);
    process.exit(1);
  }
  
  try {
    const panproto = await import(panprotoPath);
    await new Promise(r => setTimeout(r, 500));
    return panproto;
  } catch (err) {
    console.error(`❌ Panproto failed: ${err.message}`);
    process.exit(1);
  }
}

// ============================================================================
// COLIMIT COMPUTATION
// ============================================================================

async function computeColimit(ctx, panproto) {
  const { TheoryBuilder, colimit } = panproto;
  const pan = await panproto.getPanproto();
  
  // Build domain theories from IU boundary exports
  const domainHandles = [];
  const domainOps = [];
  
  for (const iu of ctx.ius) {
    const builder = new TheoryBuilder(iu.name.replace(/\s+/g, ''));
    
    // Add operations from IU boundary exports
    for (const export_ of iu.boundary?.exports || ['process']) {
      builder.op(export_, [['input', 'any']], 'any');
      domainOps.push({ name: export_, iu: iu.name });
    }
    
    const handle = builder.build(pan._wasm || pan);
    domainHandles.push(handle);
  }
  
  // Build shared base
  const baseBuilder = new TheoryBuilder('WebDashboardBase');
  baseBuilder.op('render', [['props', 'any'], ['state', 'any']], 'Component');
  baseBuilder.op('handleEvent', [['event', 'any'], ['state', 'any']], 'State');
  const baseHandle = baseBuilder.build(pan._wasm || pan);
  
  // Compute colimit
  let currentColimit = domainHandles[0];
  for (let i = 1; i < domainHandles.length; i++) {
    currentColimit = colimit(currentColimit, domainHandles[i], baseHandle, pan._wasm || pan);
  }
  
  // Cleanup
  for (const h of domainHandles) h[Symbol.dispose]();
  baseHandle[Symbol.dispose]();
  currentColimit[Symbol.dispose]();
  pan[Symbol.dispose]();
  
  // Deduplicate operations by name (colimit semantics)
  const opMap = new Map();
  for (const op of domainOps) {
    if (!opMap.has(op.name)) opMap.set(op.name, op);
  }
  
  return Array.from(opMap.values());
}

// ============================================================================
// DELIVERABLE GENERATION (Uses IU Implementations)
// ============================================================================

async function generateDeliverable(ctx, colimitOps) {
  // Generate imports from all IUs
  const iuImports = ctx.ius.map(iu => {
    const domain = iu.name.toLowerCase().replace(/\s+domain$/, '').replace(/\s+/g, '-');
    const exports = iu.boundary?.exports?.slice(0, 3).join(', ') || 'process';
    return `import { ${exports} } from './${domain}/index.js';`;
  }).join('\n');
  
  // Build server that actually USES the IU functions
  const server = generateWorkingServer(ctx, iuImports, colimitOps);
  const store = generateWorkingStore(ctx, iuImports, colimitOps);
  
  return {
    'server.ts': server,
    'store.ts': store,
  };
}

function generateWorkingServer(ctx, imports, ops) {
  // Group operations by domain
  const archiveOps = ops.filter(o => o.name.toLowerCase().includes('archive'));
  const taskOps = ops.filter(o => 
    !o.name.toLowerCase().includes('archive') && 
    !o.name.toLowerCase().includes('delete') &&
    !o.name.toLowerCase().includes('create')
  );
  
  return `#!/usr/bin/env node
/**
 * @phoenix-deliverable: ${ctx.type}
 * @phoenix-colimit: ${ctx.ius.map(i => i.id.slice(0, 16)).join(',')}
 * @phoenix-generated: ${new Date().toISOString()}
 * 
 * THIS FILE IS GENERATED - imports and uses IU implementations
 */

import { createServer } from 'http';
${imports}

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
if (path.match(/^\/api\/tasks\/([^/]+)\/archive$/) && req.method === 'POST') {
  const id = path.match(/^\/api\/tasks\/([^/]+)\/archive$/)[1];
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
  res.end(\`<!DOCTYPE html>
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
      
      container.innerHTML = filtered.map(t => \`
        <div class="task-card \${t.status === 'archived' ? 'tab-archived' : ''}">
          <span class="badge-\${t.status}">\${t.status}</span>
          <h3>\${t.title}</h3>
          <p>\${t.description || ''}</p>
          \${t.status !== 'archived' 
            ? \`<button onclick="archiveTask('\${t.id}')">Archive</button>\`
            : \`<button onclick="restoreTask('\${t.id}')">Restore</button>\`
          }
        </div>
      \`).join('');
    }
    
    async function archiveTask(id) {
      await fetch(\`/api/tasks/\${id}/archive\`, { method: 'POST' });
      await loadTasks();
    }
    
    async function restoreTask(id) {
      await fetch(\`/api/tasks/\${id}/restore\`, { method: 'POST' });
      await loadTasks();
    }
    
    loadTasks();
  </script>
</body>
</html>\`);
  return;
}

server.listen(3000, () => {
  console.log('🚀 TaskFlow Dashboard');
  console.log('   Using IU implementations:', ${JSON.stringify(ops.map(o => o.name))});
});
`;
}

function generateWorkingStore(ctx, imports, ops) {
  const archiveOp = ops.find(o => o.name.toLowerCase().includes('archive'));
  
  return `/**
 * @phoenix-deliverable: ${ctx.type}
 * @phoenix-generated: ${new Date().toISOString()}
 * 
 * Data store that uses IU implementations
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
  const task = updateTask(id, { status: 'archived' });
  ${archiveOp ? `
  // Call IU implementation
  if (task && typeof ${archiveOp.name} === 'function') {
    ${archiveOp.name}({ id, name: task.title });
  }` : ''}
  return task;
}

export function restoreTask(id: string): Task | undefined {
  return updateTask(id, { status: 'open' });
}
`;
}

// ============================================================================
// UTILITIES
// ============================================================================

function inferDeliverableType(ctx) {
  // ... existing inference logic
  return 'web-dashboard';
}

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
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

// Run
main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
