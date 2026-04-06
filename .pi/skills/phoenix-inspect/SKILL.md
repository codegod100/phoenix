---
name: phoenix-inspect
description: Visual inspection tool for Phoenix projects. Generates HTML report showing spec → canonical → IU → code traceability, dependency graphs, and heat maps.
---

# Phoenix Inspect

Visual inspection and exploration of Phoenix project structure.

## When to Use

- To visualize spec → code traceability
- To understand requirement dependencies
- To explore IU relationships
- To share project structure with team
- To debug planning/regeneration issues

## Usage

```bash
/skill:phoenix-inspect           # Generate HTML report
/skill:phoenix-inspect --serve   # Generate and start server
/skill:phoenix-inspect --open    # Open in browser
/skill:phoenix-inspect --export  # Export as static site
```

## What It Generates

Interactive HTML report with:
1. **Overview dashboard** - Pipeline status, coverage metrics
2. **Spec explorer** - Navigate original spec with clause highlighting
3. **Canonical graph** - Requirement nodes with relationships
4. **IU breakdown** - Contracts, invariants, risk tiers
5. **Code traceability** - Click requirement → see implementation
6. **Dependency graph** - IU dependencies visualized
7. **Heat map** - Which specs affect which files
8. **Drift visualization** - Sync status of all files

## Implementation Steps

### Step 1: Load All Data

```typescript
const { root, phoenixDir } = requireProjectRoot();

const data = {
  spec: readGraph<SpecGraph>(phoenixDir, 'spec'),
  canonical: readGraph<CanonicalGraph>(phoenixDir, 'canonical'),
  ius: readGraph<IUGraph>(phoenixDir, 'ius'),
  manifest: loadManifest(phoenixDir),
  state: loadState(phoenixDir)
};
```

### Step 2: Build Traceability Matrix

```typescript
interface TraceabilityEntry {
  specClause: Clause;
  canonicalNode: CanonicalNode | null;
  implementingIU: ImplementationUnit | null;
  outputFiles: string[];
  status: 'traced' | 'orphan' | 'unimplemented';
}

function buildTraceability(data: LoadedData): TraceabilityEntry[] {
  const entries: TraceabilityEntry[] = [];
  
  for (const [docId, doc] of Object.entries(data.spec?.documents || {})) {
    for (const clause of doc.clauses) {
      // Find canonical node
      const canonNode = Object.values(data.canonical?.nodes || {})
        .find(n => n.source_clause_ids.includes(clause.id));
      
      // Find implementing IU
      const iu = data.ius?.ius.find(i => 
        i.source_canon_ids.includes(canonNode?.canon_id || '')
      );
      
      entries.push({
        specClause: clause,
        canonicalNode: canonNode || null,
        implementingIU: iu || null,
        outputFiles: iu?.output_files || [],
        status: iu ? 'traced' : (canonNode ? 'unimplemented' : 'orphan')
      });
    }
  }
  
  return entries;
}
```

### Step 3: Generate HTML Report

```typescript
function generateHTML(data: LoadedData, traces: TraceabilityEntry[]): string {
  return `<!DOCTYPE html>
<html>
<head>
  <title>Phoenix Inspect - ${basename(root)}</title>
  <style>
    /* Dark theme matching Phoenix design system */
    :root {
      --bg-base: #1e1e2e;
      --bg-mantle: #181825;
      --surface: #313244;
      --text: #cdd6f4;
      --text-secondary: #a6adc8;
      --accent: #89b4fa;
      --success: #a6e3a1;
      --warning: #f9e2af;
      --error: #f38ba8;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      background: var(--bg-base);
      color: var(--text);
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    
    .header {
      background: var(--bg-mantle);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .header h1 {
      margin: 0;
      color: var(--accent);
    }
    
    .metrics {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 16px;
      margin-bottom: 20px;
    }
    
    .metric-card {
      background: var(--surface);
      padding: 16px;
      border-radius: 8px;
    }
    
    .metric-value {
      font-size: 2em;
      font-weight: bold;
      color: var(--accent);
    }
    
    .section {
      background: var(--surface);
      padding: 20px;
      border-radius: 8px;
      margin-bottom: 20px;
    }
    
    .section h2 {
      margin-top: 0;
      color: var(--accent);
      border-bottom: 1px solid var(--bg-mantle);
      padding-bottom: 10px;
    }
    
    /* Traceability table */
    .trace-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .trace-table th {
      text-align: left;
      padding: 12px;
      background: var(--bg-mantle);
      color: var(--text-secondary);
      font-weight: 600;
    }
    
    .trace-table td {
      padding: 12px;
      border-bottom: 1px solid var(--bg-mantle);
    }
    
    .trace-table tr:hover {
      background: rgba(137, 180, 250, 0.1);
    }
    
    .status-traced { color: var(--success); }
    .status-orphan { color: var(--warning); }
    .status-unimplemented { color: var(--error); }
    
    /* IU cards */
    .iu-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
    }
    
    .iu-card {
      background: var(--bg-mantle);
      padding: 16px;
      border-radius: 8px;
      border-left: 4px solid var(--accent);
    }
    
    .iu-card.high-risk { border-left-color: var(--error); }
    .iu-card.medium-risk { border-left-color: var(--warning); }
    .iu-card.low-risk { border-left-color: var(--success); }
    
    .iu-name {
      font-weight: 600;
      font-size: 1.1em;
      margin-bottom: 8px;
    }
    
    .iu-meta {
      color: var(--text-secondary);
      font-size: 0.9em;
    }
    
    .iu-invariants {
      margin-top: 12px;
      font-size: 0.85em;
    }
    
    .iu-invariants li {
      margin: 4px 0;
    }
    
    /* Dependency graph visualization */
    .dep-graph {
      display: flex;
      flex-wrap: wrap;
      gap: 20px;
    }
    
    .dep-node {
      background: var(--bg-mantle);
      padding: 12px 20px;
      border-radius: 20px;
      position: relative;
    }
    
    .dep-node::after {
      content: '→';
      position: absolute;
      right: -20px;
      color: var(--text-secondary);
    }
    
    /* File status */
    .file-list {
      display: grid;
      gap: 8px;
    }
    
    .file-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 8px 12px;
      background: var(--bg-mantle);
      border-radius: 4px;
    }
    
    .file-status {
      width: 8px;
      height: 8px;
      border-radius: 50%;
    }
    
    .file-status.sync { background: var(--success); }
    .file-status.drift { background: var(--error); }
    .file-status.orphan { background: var(--warning); }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔥 Phoenix Inspect</h1>
    <p>${basename(root)} - Pipeline visualization</p>
  </div>
  
  <!-- Metrics Dashboard -->
  <div class="metrics">
    <div class="metric-card">
      <div class="metric-value">${Object.keys(data.spec?.documents || {}).length}</div>
      <div>Spec Files</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${Object.keys(data.canonical?.nodes || {}).length}</div>
      <div>Canonical Nodes</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${data.ius?.ius?.length || 0}</div>
      <div>Implementation Units</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${Object.keys(data.manifest?.files || {}).length}</div>
      <div>Generated Files</div>
    </div>
    <div class="metric-card">
      <div class="metric-value">${Math.round((traces.filter(t => t.status === 'traced').length / traces.length) * 100)}%</div>
      <div>Traceability</div>
    </div>
  </div>
  
  <!-- IU Overview -->
  <div class="section">
    <h2>Implementation Units</h2>
    <div class="iu-grid">
      ${data.ius?.ius.map(iu => `
        <div class="iu-card ${iu.risk_tier}-risk">
          <div class="iu-name">${iu.name}</div>
          <div class="iu-meta">
            ${iu.kind} • ${iu.risk_tier} risk • ${iu.source_canon_ids.length} requirements
          </div>
          <div class="iu-invariants">
            <strong>Invariants:</strong>
            <ul>
              ${iu.contract.invariants.map(inv => `<li>${inv}</li>`).join('')}
            </ul>
          </div>
          <div class="iu-files">
            ${iu.output_files.map(f => `<code>${f}</code>`).join('<br>')}
          </div>
        </div>
      `).join('')}
    </div>
  </div>
  
  <!-- Traceability Matrix -->
  <div class="section">
    <h2>Traceability Matrix</h2>
    <table class="trace-table">
      <thead>
        <tr>
          <th>Spec Clause</th>
          <th>Type</th>
          <th>Canonical</th>
          <th>IU</th>
          <th>Files</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        ${traces.map(t => `
          <tr>
            <td>${t.specClause.text.slice(0, 60)}...</td>
            <td>${t.specClause.type}</td>
            <td>${t.canonicalNode ? '✓' : '✗'}</td>
            <td>${t.implementingIU?.name || '-'}</td>
            <td>${t.outputFiles.length}</td>
            <td class="status-${t.status}">${t.status}</td>
          </tr>
        `).join('')}
      </tbody>
    </table>
  </div>
  
  <!-- File Status -->
  <div class="section">
    <h2>Generated Files</h2>
    <div class="file-list">
      ${Object.entries(data.manifest?.files || {}).map(([path, entry]) => {
        // Check if file exists and hash matches
        const fullPath = join(root, path);
        let status = 'sync';
        if (!existsSync(fullPath)) {
          status = 'missing';
        } else {
          const currentHash = computeFileHash(fullPath);
          if (currentHash !== entry.hash) status = 'drift';
        }
        return `
          <div class="file-item">
            <div class="file-status ${status}"></div>
            <code>${path}</code>
            <span>${entry.iu_id.slice(0, 8)}...</span>
          </div>
        `;
      }).join('')}
    </div>
  </div>
  
  <script>
    // Interactive features would go here
    // - Click IU to highlight related clauses
    // - Filter traceability table
    // - Expand/collapse sections
  </script>
</body>
</html>`;
}
```

### Step 4: Write Output

```typescript
const outputPath = join(phoenixDir, 'inspect.html');
writeFileSync(outputPath, html, 'utf8');
console.log(`Report generated: ${outputPath}`);
```

### Step 5: Optional Server

For `--serve` mode:

```typescript
if (args.includes('--serve')) {
  const server = Bun.serve({
    port: 3456,
    fetch(req) {
      const url = new URL(req.url);
      if (url.pathname === '/') {
        return new Response(html, {
          headers: { 'Content-Type': 'text/html' }
        });
      }
      return new Response('Not Found', { status: 404 });
    }
  });
  
  console.log(`Inspector running at http://localhost:${server.port}`);
  
  if (args.includes('--open')) {
    await $`open http://localhost:${server.port}`;
  }
}
```

## Report Sections

1. **Overview** - Key metrics at a glance
2. **IUs** - Card view of all IUs with invariants
3. **Traceability** - Full spec → code mapping table
4. **Dependencies** - Visual graph of IU relationships
5. **Files** - Sync status of all generated files
6. **Coverage** - Which requirements are implemented

## Interactive Features

- Click clause → see canonical node + implementation
- Click IU → see all related requirements
- Filter by status (traced/orphan/unimplemented)
- Search across all content
- Export as JSON for programmatic use

## Prerequisites

- Phoenix project with at least ingest complete

## Output

`.phoenix/inspect.html` - Self-contained HTML report

## See Also

- /skill:phoenix-status - Text status
- /skill:phoenix-drift - Drift details
