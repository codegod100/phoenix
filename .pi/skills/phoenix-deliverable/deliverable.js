#!/usr/bin/env node
/**
 * Phoenix Deliverable Generator
 * 
 * Uses panproto GAT to compute deliverables as colimits of domain theories.
 * 
 * Usage: node deliverable.js <project-path> [--detect | --type <type>]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// ============================================================================
// MAIN
// ============================================================================

async function main() {
  const projectPath = process.argv[2];
  const type = getArg('--type') || (hasArg('--detect') ? 'detect' : null);
  const force = hasArg('--force');
  
  if (!projectPath) {
    console.error('Usage: node deliverable.js <project-path> [--detect | --type <type>]');
    process.exit(1);
  }
  
  console.log(`🎯 Phoenix Deliverable Generator`);
  console.log(`   Project: ${projectPath}`);
  
  // Initialize panproto
  const panproto = await initializePanproto();
  
  // Load context
  const ctx = await loadContext(projectPath, panproto);
  
  // Determine type
  if (type === 'detect') {
    ctx.type = detectType(ctx);
    console.log(`   Type: ${ctx.type} (detected)`);
  } else if (type) {
    ctx.type = type;
    console.log(`   Type: ${ctx.type} (explicit)`);
  } else {
    console.error('   Error: Must specify --detect or --type');
    process.exit(1);
  }
  
  // Filter IUs relevant to this deliverable type
  ctx.ius = filterRelevantIUs(ctx.ius, ctx.type, ctx.canonical);
  console.log(`   IUs: ${ctx.ius.length} relevant domains`);
  console.log();
  
  // Check for existing deliverable
  const traceFile = join(ctx.outputDir, '.phoenix-deliverable.json');
  if (existsSync(traceFile) && !force) {
    const trace = JSON.parse(readFileSync(traceFile, 'utf8'));
    const currentHash = await hashIUs(ctx.ius);
    if (trace.iuHash === currentHash && trace.type === ctx.type) {
      console.log(`   ✓ Deliverable up to date (${currentHash.slice(0, 16)})`);
      console.log(`   Use --force to regenerate`);
      process.exit(0);
    }
    console.log(`   ⚠ IUs changed, regenerating...`);
  }
  
  // Compute colimit conceptually
  console.log(`Step 1: Computing colimit of ${ctx.ius.length} domain theories...`);
  const colimitOps = computeColimitConceptually(ctx);
  console.log(`   ✓ Colimit: ${colimitOps.length} operations`);
  
  // Validate spec compliance
  console.log(`Step 2: Validating against ${ctx.canonical.nodes.length} canonical requirements...`);
  const violations = validateSpecCompliance(ctx, colimitOps);
  if (violations.length > 0) {
    console.error(`   ❌ Spec violations:`);
    violations.forEach(v => console.error(`      - ${v}`));
    process.exit(1);
  }
  console.log(`   ✓ All requirements satisfied`);
  
  // Generate code
  console.log(`Step 3: Generating deliverable...`);
  const outputs = generateDeliverable(ctx, colimitOps);
  
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
}

// ============================================================================
// PANPROTO INITIALIZATION
// ============================================================================

async function initializePanproto() {
  // The panproto skill is a CLI tool - we can't import it directly
  // without triggering its CLI. Instead, we use conceptual mode
  // until panproto exposes a library interface.
  
  console.log(`   WASM: Using conceptual mode (panproto GAT library not exposed)`);
  return createMockPanproto();
}

function createMockPanproto() {
  return {
    conceptualMode: true,
    TheoryBuilder: class MockTheoryBuilder {
      constructor(name) { 
        this.name = name; 
        this.ops = []; 
        this.sorts = [];
      }
      sort(name) { 
        this.sorts.push(name);
        return this; 
      }
      op(name, inputs, output) { 
        this.ops.push({ name, inputs, output }); 
        return this; 
      }
      build() { 
        return { name: this.name, ops: this.ops, sorts: this.sorts }; 
      }
    },
    colimit: (t1, t2, base) => ({ 
      name: `colimit(${t1.name}, ${t2.name})`,
      ops: [...(t1.ops || []), ...(t2.ops || [])],
      sorts: [...new Set([...(t1.sorts || []), ...(t2.sorts || [])])]
    })
  };
}

// ============================================================================
// CONTEXT LOADING
// ============================================================================

async function loadContext(projectPath, panproto) {
  const graphsDir = join(projectPath, '.phoenix', 'graphs');
  
  if (!existsSync(graphsDir)) {
    throw new Error(`No graphs directory: ${graphsDir}`);
  }
  
  const iusPath = join(graphsDir, 'ius.json');
  const canonicalPath = join(graphsDir, 'canonical.json');
  
  const iusData = JSON.parse(readFileSync(iusPath, 'utf8'));
  const canonicalData = existsSync(canonicalPath) 
    ? JSON.parse(readFileSync(canonicalPath, 'utf8'))
    : { nodes: [] };
  
  return {
    type: '',
    projectPath,
    outputDir: join(projectPath, 'src', 'generated', 'deliverable'),
    ius: iusData.ius || [],
    canonical: canonicalData,
    panproto,
  };
}

function detectType(ctx) {
  const sourceFiles = ctx.ius.flatMap(iu => 
    iu.source_canon_ids.map(canonId => {
      const node = ctx.canonical.nodes.find(n => n.canon_id === canonId);
      return node?.source_file || '';
    })
  );
  
  if (sourceFiles.some(f => f.includes('web-dashboard'))) return 'web-dashboard';
  if (sourceFiles.some(f => f.includes('cli'))) return 'cli-tool';
  if (sourceFiles.some(f => f.includes('api'))) return 'api-service';
  return 'library';
}

function filterRelevantIUs(allIUs, type, canonical) {
  const patterns = {
    'web-dashboard': ['web-dashboard', 'dashboard', 'task', 'confirmation', 'edit', 'delete', 'create', 'archive', 'bulk', 'search', 'analytics'],
    'cli-tool': ['cli', 'command', 'task'],
    'api-service': ['api', 'rest', 'task'],
    'library': [],
  };
  
  const relevant = patterns[type] || [];
  const canonToFile = new Map(canonical.nodes.map(n => [n.canon_id, n.source_file]));
  
  return allIUs.filter(iu => {
    return iu.source_canon_ids.some(canonId => {
      const sourceFile = canonToFile.get(canonId) || '';
      return relevant.some(pattern => 
        sourceFile.includes(pattern) || iu.name.toLowerCase().includes(pattern)
      );
    });
  });
}

// ============================================================================
// COLIMIT COMPUTATION
// ============================================================================

function computeColimitConceptually(ctx) {
  const { TheoryBuilder } = ctx.panproto;
  const domainTheories = [];
  
  for (const iu of ctx.ius) {
    const nodes = iu.source_canon_ids
      .map(id => ctx.canonical.nodes.find(n => n.canon_id === id))
      .filter(Boolean);
    
    const theory = buildTheoryFromIU(iu, nodes, TheoryBuilder);
    domainTheories.push(theory);
  }
  
  const sharedBase = buildSharedBase(ctx.type, TheoryBuilder);
  
  // Compute colimit (conceptually)
  const colimitOps = [];
  
  for (const theory of domainTheories) {
    if (theory.ops) {
      colimitOps.push(...theory.ops);
    }
  }
  
  if (sharedBase.ops) {
    colimitOps.push(...sharedBase.ops);
  }
  
  return colimitOps;
}

function buildTheoryFromIU(iu, nodes, TheoryBuilder) {
  const name = iu.name.replace(/\s+/g, '');
  const builder = new TheoryBuilder(name);
  
  for (const export_ of iu.boundary?.exports || []) {
    builder.op(export_, [['input', 'any']], 'any');
  }
  
  for (const node of nodes) {
    const ops = requirementsToOperations(node.statement);
    for (const op of ops) {
      builder.op(op.name, op.inputs, op.output);
    }
  }
  
  return builder.build();
}

function buildSharedBase(type, TheoryBuilder) {
  const name = type.replace(/-([a-z])/g, (_, c) => c.toUpperCase()) + 'Base';
  const builder = new TheoryBuilder(name);
  
  builder.op('render', [['props', 'any'], ['state', 'any']], 'Component');
  builder.op('handleEvent', [['event', 'any'], ['state', 'any']], 'State');
  
  if (type === 'web-dashboard') {
    builder.op('handleRequest', [['request', 'any'], ['state', 'any']], 'Response');
  }
  
  return builder.build();
}

function requirementsToOperations(statement) {
  const ops = [];
  const lower = (statement || '').toLowerCase();
  
  if (lower.includes('modal') && lower.includes('confirm')) {
    ops.push({
      name: 'showConfirmationModal',
      inputs: [['message', 'string'], ['onConfirm', 'function']],
      output: 'void'
    });
  }
  
  if (lower.includes('edit') && lower.includes('not') && lower.includes('modal')) {
    ops.push({
      name: 'enterInlineEdit',
      inputs: [['id', 'string']],
      output: 'EditState'
    });
  }
  
  if (lower.includes('archive')) {
    ops.push({ name: 'archiveItem', inputs: [['id', 'string']], output: 'void' });
    ops.push({ name: 'restoreItem', inputs: [['id', 'string']], output: 'void' });
  }
  
  if (lower.includes('bulk')) {
    ops.push({ name: 'selectItems', inputs: [['ids', 'string[]']], output: 'void' });
    ops.push({ name: 'bulkDelete', inputs: [['ids', 'string[]']], output: 'void' });
  }
  
  return ops;
}

// ============================================================================
// VALIDATION
// ============================================================================

function validateSpecCompliance(ctx, colimitOps) {
  const violations = [];
  
  for (const node of ctx.canonical.nodes) {
    const requiredOps = requirementsToOperations(node.statement);
    
    for (const reqOp of requiredOps) {
      const hasOp = colimitOps.some(op => op.name === reqOp.name);
      if (!hasOp) {
        violations.push(`${node.short_id}: Missing operation ${reqOp.name}`);
      }
    }
  }
  
  return violations;
}

// ============================================================================
// CODE GENERATION
// ============================================================================

function generateDeliverable(ctx, colimitOps) {
  switch (ctx.type) {
    case 'web-dashboard':
      return generateWebDashboard(ctx, colimitOps);
    case 'cli-tool':
      return generateCliTool(ctx, colimitOps);
    case 'api-service':
      return generateApiService(ctx, colimitOps);
    default:
      return generateLibrary(ctx, colimitOps);
  }
}

function generateWebDashboard(ctx, colimitOps) {
  const iuImports = ctx.ius.map(iu => {
    const domain = iu.name.toLowerCase().replace(/\s+/g, '-');
    const exports = iu.boundary?.exports?.join(', ') || '';
    return `import { ${exports} } from '../${domain}/index.js';`;
  }).join('\n');
  
  const modalOps = colimitOps.filter(o => o.name.includes('Modal'));
  const editOps = colimitOps.filter(o => o.name.includes('Edit'));
  const archiveOps = colimitOps.filter(o => o.name.includes('archive') || o.name.includes('restore'));
  const bulkOps = colimitOps.filter(o => o.name.includes('bulk') || o.name.includes('select'));
  const crudOps = colimitOps.filter(o => !o.name.match(/Modal|Edit|archive|restore|bulk|select/));
  
  const server = `#!/usr/bin/env node
/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-colimit: ${ctx.ius.map(iu => iu.id.slice(0, 16)).join(',')}
 * @phoenix-operations: ${colimitOps.map(o => o.name).join(',')}
 * @phoenix-generated: ${new Date().toISOString()}
 * 
 * THIS FILE IS GENERATED - DO NOT EDIT DIRECTLY
 * Regenerate: node .pi/skills/phoenix-deliverable/deliverable.js ${ctx.projectPath} --type web-dashboard
 */

import { createServer } from 'http';
${iuImports}

// Generated from colimit theory operations
const OPERATIONS = {
  // Modal operations
${modalOps.map(o => `  ${o.name}: ${JSON.stringify(o)},`).join('\n')}
  
  // Edit operations  
${editOps.map(o => `  ${o.name}: ${JSON.stringify(o)},`).join('\n')}
  
  // Archive operations
${archiveOps.map(o => `  ${o.name}: ${JSON.stringify(o)},`).join('\n')}
  
  // Bulk operations
${bulkOps.map(o => `  ${o.name}: ${JSON.stringify(o)},`).join('\n')}
  
  // CRUD operations
${crudOps.map(o => `  ${o.name}: ${JSON.stringify(o)},`).join('\n')}
};

const server = createServer((req, res) => {
  console.log(\`\${req.method} \${req.url}\`);
  
  res.setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify({ 
    status: 'ok', 
    operations: Object.keys(OPERATIONS),
    theory: 'colimit(${ctx.ius.map(iu => iu.name).join(', ')})'
  }));
});

server.listen(3000, () => {
  console.log('🚀 Generated from colimit of ${ctx.ius.length} domain theories');
  console.log('   Operations:', Object.keys(OPERATIONS).join(', '));
});
`;

  const store = `/**
 * @phoenix-deliverable: web-dashboard
 * @phoenix-colimit: store
 * @phoenix-ius: ${ctx.ius.map(iu => iu.id.slice(0, 16)).join(',')}
 * @phoenix-generated: ${new Date().toISOString()}
 */

${iuImports}

// Colimit operations
${colimitOps.map(op => `
/**
 * @phoenix-operation: ${op.name}
 * @phoenix-inputs: ${op.inputs.map(i => i[0]).join(', ')}
 * @phoenix-output: ${op.output}
 */
export function ${op.name}(${op.inputs.map(i => `${i[0]}: ${i[1]}`).join(', ')}) {
  throw new Error('Implement: ${op.name}');
}`).join('\n')}
`;

  return {
    'server.ts': server,
    'store.ts': store,
  };
}

function generateCliTool(ctx, colimitOps) {
  return {
    'cli.ts': `#!/usr/bin/env node
// @phoenix-deliverable: cli-tool
// @phoenix-generated: ${new Date().toISOString()}

import { program } from 'commander';

${colimitOps.map(op => `
program
  .command('${op.name}')
  .description('Colimit operation: ${op.name}')
  .action(() => {
    console.log('Executing: ${op.name}');
  });`).join('\n')}

program.parse();
`,
  };
}

function generateApiService(ctx, colimitOps) {
  return {
    'api.ts': `// @phoenix-deliverable: api-service
// @phoenix-generated: ${new Date().toISOString()}

import express from 'express';
const app = express();

${colimitOps.map(op => `
// @phoenix-operation: ${op.name}
app.post('/api/${op.name}', (req, res) => {
  res.json({ operation: '${op.name}', status: 'from-colimit' });
});`).join('\n')}

app.listen(3000);
`,
  };
}

function generateLibrary(ctx, colimitOps) {
  return {
    'index.ts': `// @phoenix-deliverable: library
// @phoenix-generated: ${new Date().toISOString()}

${colimitOps.map(op => `
export function ${op.name}(${op.inputs.map(i => `${i[0]}: ${i[1]}`).join(', ')}) {
  return {} as ${op.output};
}`).join('\n')}
`,
  };
}

// ============================================================================
// TRACEABILITY
// ============================================================================

async function writeTraceability(ctx, colimitOps, outputs) {
  const iuHash = await hashIUs(ctx.ius);
  
  const trace = {
    type: ctx.type,
    generatedAt: new Date().toISOString(),
    iuHash,
    theory: {
      name: ctx.type,
      domains: ctx.ius.map(iu => ({ id: iu.id.slice(0, 16), name: iu.name })),
      colimit: {
        operationCount: colimitOps.length,
        operations: colimitOps.map(o => o.name),
      },
    },
    canonicalRequirements: ctx.canonical.nodes.map(n => n.short_id),
    outputs: Object.keys(outputs),
  };
  
  const tracePath = join(ctx.outputDir, '.phoenix-deliverable.json');
  writeFileSync(tracePath, JSON.stringify(trace, null, 2));
  console.log(`   ✓ Trace: .phoenix-deliverable.json`);
}

async function hashIUs(ius) {
  const { createHash } = await import('crypto');
  const data = ius.map(iu => `${iu.id}:${iu.name}`).sort().join(';');
  return createHash('sha256').update(data).digest('hex').slice(0, 16);
}

// ============================================================================
// UTILITIES
// ============================================================================

function getArg(name) {
  const idx = process.argv.indexOf(name);
  return idx >= 0 ? process.argv[idx + 1] : undefined;
}

function hasArg(name) {
  return process.argv.includes(name);
}

// ============================================================================
// RUN
// ============================================================================

main().catch(err => {
  console.error('Error:', err.message);
  console.error(err.stack);
  process.exit(1);
});
