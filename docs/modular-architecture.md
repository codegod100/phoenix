# Modular Architecture Design (Nix-Inspired)

## Core Concept

Replace monolithic architectures with **capability modules** that compose declaratively.

## Current vs Proposed

### Current (Monolithic)
```typescript
// Pick one architecture
{
  "architecture": "web-api"  // implies everything
}

// Output types detected from spec language (heuristic)
// Risk: Wrong detection, no user control
```

### Proposed (Modular)
```typescript
// Compose capabilities explicitly
{
  "capabilities": [
    "rest-api",      // HTTP endpoints with Hono
    "web-ui",        // HTML pages with forms/tables
    "sqlite-persist", // Database storage
    "typescript-client", // TypeScript API client
    "unit-tests"     // Vitest test suite
  ]
}

// Or shorthand for common stacks
{
  "template": "full-stack-crud" // expands to the above
}
```

## Capability Module System

```typescript
// src/capabilities/index.ts

export interface CapabilityModule {
  name: string;
  description: string;
  
  // What this capability provides
  provides: {
    runtime: 'http-server' | 'database' | 'static-files' | 'cli';
    templates: string[];
    devDependencies?: string[];
  };
  
  // What other capabilities it conflicts with or requires
  conflictsWith?: string[];
  requires?: string[];
  
  // Generate the scaffold contribution
  contribute(ctx: CapabilityContext): ScaffoldContribution;
}

// Example: REST API capability
export const restApi: CapabilityModule = {
  name: 'rest-api',
  description: 'HTTP REST endpoints with Hono framework',
  
  provides: {
    runtime: 'http-server',
    templates: ['hono-routes', 'zod-schemas'],
    devDependencies: ['hono', '@hono/node-server', 'zod']
  },
  
  requires: ['sqlite-persist'], // Need persistence for stateful APIs
  
  contribute(ctx) {
    return {
      serverEntry: `
        import { Hono } from 'hono';
        import { serve } from '@hono/node-server';
        const app = new Hono();
        // Mount routes from registered modules
        ${ctx.mountRoutes}
        serve({ fetch: app.fetch, port: 3000 });
      `,
      moduleTemplate: HONO_MODULE_TEMPLATE,
      promptExtension: HONO_PROMPT_EXTENSION,
    };
  }
};

// Example: Web UI capability
export const webUi: CapabilityModule = {
  name: 'web-ui',
  description: 'Self-contained HTML pages with inline CSS/JS',
  
  provides: {
    runtime: 'static-files',
    templates: ['html-page', 'css-inline', 'js-inline'],
  },
  
  requires: ['rest-api'], // UI needs API to call
  
  contribute(ctx) {
    return {
      // Adds static file serving to server
      serverMiddleware: `
        app.get('/:filepath{.+\\.html}', async (c) => {
          const file = await Bun.file(\`./src/generated/\${c.req.param('filepath')}\`).text();
          return c.html(file);
        });
      `,
      moduleTemplate: HTML_MODULE_TEMPLATE,
      promptExtension: HTML_PROMPT_EXTENSION,
    };
  }
};
```

## Composition Resolution

```typescript
// src/capabilities/resolve.ts

export function resolveCapabilities(
  requested: string[]
): CapabilityModule[] {
  // 1. Expand templates to capabilities
  const expanded = requested.flatMap(r => 
    isTemplate(r) ? expandTemplate(r) : [r]
  );
  
  // 2. Resolve dependencies (transitive closure)
  const withDeps = addTransitiveRequirements(expanded);
  
  // 3. Detect conflicts
  const conflicts = findConflicts(withDeps);
  if (conflicts.length > 0) {
    throw new Error(`Capability conflicts: ${conflicts.join(', ')}`);
  }
  
  // 4. Topologically sort by dependency
  return topologicalSort(withDeps);
}

// Templates are just capability bundles
const templates: Record<string, string[]> = {
  'full-stack-crud': [
    'rest-api', 'web-ui', 'sqlite-persist', 'typescript-client', 'unit-tests'
  ],
  'cli-tool': [
    'cli-interface', 'sqlite-persist', 'unit-tests'
  ],
  'headless-api': [
    'rest-api', 'sqlite-persist', 'unit-tests'
  ],
  'static-site': [
    'web-ui', 'file-storage' // No API, just HTML
  ],
  'realtime-app': [
    'websocket-api', 'web-ui', 'sqlite-persist', 'typescript-client'
  ]
};
```

## User Configuration

```typescript
// .phoenix/config.json - Explicit composition
{
  "capabilities": ["rest-api", "web-ui", "sqlite-persist"],
  "llm": {
    "provider": "fireworks",
    "model": "accounts/fireworks/routers/kimi-k2p5-turbo"
  }
}

// Or use template shorthand
{
  "template": "full-stack-crud",
  "capabilities": ["openapi-spec"] // Add extra to template
}

// Or per-IU override (Chad's complex UI case)
{
  "template": "full-stack-crud",
  "ius": {
    "Game Board": {
      "capabilities": ["rest-api", "web-components", "sqlite-persist"]
      // Uses TS classes instead of static HTML
    }
  }
}
```

## Scaffold Assembly

```typescript
// src/scaffold/modular.ts

export function generateModularScaffold(
  services: ServiceDescriptor[],
  capabilities: CapabilityModule[],
  projectName: string
): ScaffoldResult {
  const files = new Map<string, string>();
  
  // Collect contributions from all capabilities
  const contributions = capabilities.map(c => c.contribute({
    services,
    projectName,
    // Cross-capability communication
    mountRoutes: generateMountCalls(services),
    dbSchema: generateSharedSchema(services),
  }));
  
  // Merge server entry (capabilities contribute middleware)
  files.set('src/server.ts', assembleServerEntry(contributions));
  
  // Merge module templates (capabilities provide different file types)
  for (const svc of services) {
    for (const cap of capabilities) {
      if (cap.provides.templates.includes('hono-routes')) {
        files.set(`src/generated/${svc.dir}/api.ts`, cap.moduleTemplate);
      }
      if (cap.provides.templates.includes('html-page')) {
        files.set(`src/generated/${svc.dir}/ui.html`, cap.moduleTemplate);
      }
      if (cap.provides.templates.includes('ts-client')) {
        files.set(`src/generated/${svc.dir}/client.ts`, cap.moduleTemplate);
      }
    }
  }
  
  return { files };
}
```

## IU-Level Output Control

```typescript
// src/iu-planner/modular.ts

export function planIUOutputs(
  iu: ImplementationUnit,
  globalCaps: string[]
): IUOutput[] {
  // Start with global capabilities
  const caps = [...globalCaps];
  
  // Adjust based on spec content (still heuristic, but overrideable)
  const content = iu.source_canon_nodes.map(n => n.statement).join(' ');
  
  // If spec mentions "real-time", add WebSocket
  if (/\b(real-time|live|websocket|socket\.io)\b/i.test(content)) {
    caps.push('websocket-api');
  }
  
  // If spec mentions "export", add file generation
  if (/\b(export|download|csv|pdf|excel)\b/i.test(content)) {
    caps.push('file-generation');
  }
  
  // Convert capabilities to output files
  return capabilitiesToOutputs(caps, iu);
}

function capabilitiesToOutputs(caps: string[], iu: ImplementationUnit): IUOutput[] {
  const outputs: IUOutput[] = [];
  
  if (caps.includes('rest-api')) {
    outputs.push({
      type: 'api',
      file: `src/generated/${iu.service}/${iu.name.toLowerCase()}.api.ts`,
      template: 'hono-routes'
    });
  }
  
  if (caps.includes('web-ui')) {
    outputs.push({
      type: 'web-ui',
      file: `src/generated/${iu.service}/${iu.name.toLowerCase()}.html`,
      template: 'html-page'
    });
  }
  
  if (caps.includes('web-components')) {
    outputs.push({
      type: 'web-component',
      file: `src/generated/${iu.service}/${iu.name.toLowerCase()}.ui.ts`,
      template: 'ts-ui-classes'
    });
  }
  
  if (caps.includes('typescript-client')) {
    outputs.push({
      type: 'client',
      file: `src/generated/${iu.service}/${iu.name.toLowerCase()}.client.ts`,
      template: 'ts-api-client'
    });
  }
  
  return outputs;
}
```

## CLI Experience

```bash
# List available capabilities
$ phoenix capabilities
Available capabilities:
  rest-api          HTTP REST endpoints (Hono)
  web-ui            Static HTML pages
  web-components    TypeScript UI classes
  sqlite-persist    SQLite database
  postgres-persist  PostgreSQL database
  typescript-client TypeScript API client
  openapi-spec      OpenAPI/Swagger documentation
  cli-interface     Command-line interface
  websocket-api     WebSocket real-time
  file-generation   CSV/PDF/Excel exports
  unit-tests        Vitest test suite
  e2e-tests         Playwright end-to-end tests

# Show templates (predefined capability bundles)
$ phoenix templates
full-stack-crud      [rest-api, web-ui, sqlite-persist, typescript-client, unit-tests]
headless-api         [rest-api, sqlite-persist, unit-tests]
cli-tool             [cli-interface, sqlite-persist, unit-tests]
realtime-dashboard   [websocket-api, web-components, sqlite-persist]
static-site          [web-ui, file-storage]

# Configure project
$ phoenix config template=full-stack-crud
$ phoenix config capabilities+=openapi-spec  # Add to template

# Or explicit list
$ phoenix config capabilities=rest-api,web-ui,sqlite-persist

# Per-IU override (Chad's game board example)
$ phoenix config ius."Game Board".capabilities=rest-api,web-components
```

## Advanced: Capability Parameters

```typescript
// Nix-style parameterized modules
{
  "capabilities": {
    "rest-api": {
      "framework": "hono",      // or "express", "fastify"
      "auth": "jwt"             // or "session", "oauth2"
    },
    "web-ui": {
      "css": "tailwind",        // or "inline", "bootstrap"
      "js": "vanilla"           // or "alpine", "htmx"
    },
    "sqlite-persist": {
      "path": "data/app.db",
      "migrations": "auto"       // or "manual"
    }
  }
}
```

## Why This Wins

| Aspect | Current | Modular |
|--------|---------|---------|
| **Flexibility** | Pick 1 of N architectures | Compose any combination |
| **Override** | None (heuristic only) | Per-IU capability adjustment |
| **New Capability** | Add new architecture | Add single module |
| **Testing** | Test whole architecture | Test capability in isolation |
| **Community** | Hard to share | Easy to publish modules |
| **Migration** | Switch architectures | Add/remove capabilities |

## Implementation Path

1. **Phase 1**: Define `CapabilityModule` interface
2. **Phase 2**: Extract current architectures into modules
3. **Phase 3**: Add capability resolution and assembly
4. **Phase 4**: CLI commands (`phoenix capabilities`, `phoenix templates`)
5. **Phase 5**: Per-IU capability overrides
6. **Phase 6**: Community module registry

This preserves everything we've built (multi-output, Bun, etc.) but makes it **composable** rather than **prescriptive**.
