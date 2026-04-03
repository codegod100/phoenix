# True Dendritic Pattern for Phoenix (Flake Parts Style)

## Core Insight

**Not**: Hierarchical JSON configuration
**But**: Filesystem tree where directories = modules, auto-discovered

## Nix Dendritic Structure

```
modules/
├── hosts/
│   ├── homeserver [N]/          # [N] = NixOS only
│   │   ├── flake-parts.nix     # "I am a host, import these"
│   │   ├── configuration.nix   # Local config
│   │   ├── services/           # Sub-modules (local)
│   │   │   ├── iperf/
│   │   │   └── syncthing/
│   │   └── users/
│   └── macbook [D]/            # [D] = Darwin only
├── services/
│   ├── iperf [N]/              # Reusable service
│   │   ├── flake-parts.nix     # Contributes to nixosConfigurations
│   │   └── iperf.nix           # Implementation
│   └── ssh [ND]/               # [ND] = Both platforms
├── factory/                    # Meta-modules that generate configs
│   └── user/
└── nix/
    └── flake-parts/            # Library modules
        └── dendritic-tools.nix
```

## Phoenix Dendritic Structure

```
my-app/
├── .phoenix/
│   ├── modules/                    # Dendritic tree
│   │   ├── capabilities/            # Reusable capabilities
│   │   │   ├── rest-api/
│   │   │   │   ├── flake-parts.ts  # "I contribute: templates, prompts, deps"
│   │   │   │   ├── templates/
│   │   │   │   │   └── hono-routes.ts
│   │   │   │   └── prompts/
│   │   │   │       └── extension.txt
│   │   │   ├── web-ui/
│   │   │   │   └── flake-parts.ts  # Contributes HTML templates
│   │   │   ├── web-components/     # Chad's TS class approach
│   │   │   └── sqlite-persist/
│   │   ├── services/              # Service definitions
│   │   │   ├── api [rest-api]/    # [tags] = required capabilities
│   │   │   │   └── flake-parts.ts # Imports: rest-api, sqlite-persist
│   │   │   └── web [web-ui]/
│   │   └── ius/                   # IU-specific
│   │       ├── items/
│   │       │   └── flake-parts.ts # Can override service defaults
│   │       └── items-dashboard [web-components]/
│   │           └── flake-parts.ts # Override: use TS classes not HTML
│   └── flake.nix                  # Entry: imports ./modules
```

## The `flake-parts.ts` Contract

Each module exports its contribution:

```typescript
// .phoenix/modules/capabilities/rest-api/flake-parts.ts
import type { CapabilityModule } from 'phoenix';

export default {
  // Module metadata
  name: 'rest-api',
  tags: ['http-server'],  // Like [N], [D] - what runtime it provides
  
  // What this module provides to the system
  provides: {
    // Templates for code generation
    templates: {
      'hono-routes': './templates/hono-routes.ts',
    },
    // LLM prompt extensions
    prompts: './prompts/extension.txt',
    // NPM packages needed
    dependencies: ['hono', '@hono/node-server', 'zod'],
  },
  
  // Scaffold contribution function
  contribute({ config, inputs }) {
    return {
      // Add server entry code
      serverEntry: `
        import { Hono } from 'hono';
        const app = new Hono();
        ${inputs.mountRoutes}
      `,
      
      // Add type definitions
      types: `
        export type RouteHandler = (c: Context) => Response;
      `,
    };
  },
} satisfies CapabilityModule;
```

## Service Module Composition

```typescript
// .phoenix/modules/services/api/flake-parts.ts
import { defineService } from 'phoenix';
import restApi from '../capabilities/rest-api/flake-parts.js';
import sqlite from '../capabilities/sqlite-persist/flake-parts.js';
import auth from '../capabilities/authentication/flake-parts.js';

export default defineService({
  name: 'api',
  
  // Import other modules (composition!)
  imports: [restApi, sqlite, auth],
  
  // Service-specific configuration
  config: {
    port: 3000,
    database: 'sqlite',
    auth: 'jwt',
  },
  
  // Override/extend imported capabilities
  extend: {
    'rest-api': {
      // Add auth middleware to all routes
      middleware: ['auth.verifyToken'],
    },
  },
});
```

## IU Module Override

```typescript
// .phoenix/modules/ius/items-dashboard/flake-parts.ts
import { defineIU } from 'phoenix';
import webComponents from '../../capabilities/web-components/flake-parts.js';

export default defineIU({
  name: 'Items Dashboard',
  
  // Override: use web-components instead of web-ui
  imports: [webComponents],
  
  // Capability-specific config
  config: {
    'web-components': {
      // Use Chad's TS class approach
      generateClasses: true,
      runtimeAssembly: true,
    },
  },
});
```

## Root Discovery (No Central Config!)

```typescript
// .phoenix/flake.nix equivalent: auto-discovery
// src/discovery/dendritic.ts

export async function discoverModules(root: string): Promise<ModuleTree> {
  const tree: ModuleTree = { capabilities: {}, services: {}, ius: {} };
  
  // Walk the dendritic tree
  const modulesDir = join(root, '.phoenix', 'modules');
  
  // Discover capabilities
  const capsDir = join(modulesDir, 'capabilities');
  for await (const dir of readDirs(capsDir)) {
    const partsPath = join(dir, 'flake-parts.ts');
    if (existsSync(partsPath)) {
      const mod = await import(partsPath);
      tree.capabilities[dir] = mod.default;
    }
  }
  
  // Discover services
  const svcsDir = join(modulesDir, 'services');
  for await (const dir of readDirs(svcsDir)) {
    const partsPath = join(dir, 'flake-parts.ts');
    if (existsSync(partsPath)) {
      const mod = await import(partsPath);
      tree.services[dir] = mod.default;
    }
  }
  
  // Discover IU overrides
  const iusDir = join(modulesDir, 'ius');
  for await (const dir of readDirs(iusDir)) {
    const partsPath = join(dir, 'flake-parts.ts');
    if (existsSync(partsPath)) {
      const mod = await import(partsPath);
      tree.ius[dir] = mod.default;
    }
  }
  
  return tree;
}
```

## Module Resolution (Flake Parts Style)

```typescript
// src/resolution/dendritic.ts

export function resolveModules(tree: ModuleTree): ResolvedSystem {
  // 1. Resolve capability dependencies
  const capabilities = resolveCapabilities(tree.capabilities);
  
  // 2. Resolve service compositions
  const services = tree.services.map(svc => {
    // Service imports capabilities
    const importedCaps = svc.imports.map(name => capabilities[name]);
    
    // Merge configurations (later overrides earlier)
    const mergedConfig = importedCaps.reduce((acc, cap) => ({
      ...acc,
      ...cap.provides,
    }), {});
    
    // Apply service-specific extensions
    const finalConfig = applyExtensions(mergedConfig, svc.extend);
    
    return {
      name: svc.name,
      config: finalConfig,
      entry: generateServiceEntry(finalConfig),
    };
  });
  
  // 3. Resolve IU-specific overrides
  const ius = tree.ius.map(iu => {
    // Find which service this IU belongs to
    const service = findServiceForIU(iu.name, services);
    
    // IU config overrides service defaults
    return {
      name: iu.name,
      service: service.name,
      // Use IU's imports OR inherit from service
      imports: iu.imports || service.imports,
      config: mergeConfigs(service.config, iu.config),
    };
  });
  
  return { capabilities, services, ius };
}
```

## Why This Is Better

| Aspect | Hierarchical Config | True Dendritic |
|--------|--------------------|----------------|
| **Discovery** | Read JSON, parse | Walk tree, import modules |
| **Reusability** | Copy-paste config | Import module from anywhere |
| **Override** | JSON merging rules | Code-level `extend` |
| **Community** | Share snippets | Publish `flake-parts.ts` to npm |
| **Type Safety** | JSON schema | Full TypeScript |
| **IDE Support** | JSON validation | Autocomplete, go-to-definition |

## Example: Adding New Capability

```bash
# Create new capability module
mkdir -p .phoenix/modules/capabilities/graphql-api
cat > .phoenix/modules/capabilities/graphql-api/flake-parts.ts << 'EOF'
import type { CapabilityModule } from 'phoenix';

export default {
  name: 'graphql-api',
  tags: ['http-server', 'api'],
  
  provides: {
    templates: {
      'schema': './templates/schema.ts',
      'resolvers': './templates/resolvers.ts',
    },
    dependencies: ['graphql', 'apollo-server'],
  },
  
  contribute({ inputs }) {
    return {
      serverEntry: `
        import { ApolloServer } from 'apollo-server';
        const server = new ApolloServer({ schema: ${inputs.schema} });
      `,
    };
  },
};
EOF

# Use it in a service
cat > .phoenix/modules/services/api/flake-parts.ts << 'EOF'
import { defineService } from 'phoenix';
import restApi from '../capabilities/rest-api/flake-parts.js';
import graphql from '../capabilities/graphql-api/flake-parts.js';

export default defineService({
  name: 'api',
  imports: [restApi, graphql], // Both!
  config: {
    // REST at /api, GraphQL at /graphql
    mounts: {
      '/api': 'rest-api',
      '/graphql': 'graphql-api',
    },
  },
});
EOF
```

## The Factory Pattern

Like the original Nix dendritic pattern's `factory/` modules:

```typescript
// .phoenix/modules/factory/crud-module/flake-parts.ts
// Generates capability modules dynamically from spec

export default {
  name: 'crud-factory',
  
  // Factory modules read the spec and generate other modules
  async generate(ctx) {
    const spec = await ctx.readSpec();
    
    // For each entity in spec, generate a capability module
    return spec.entities.map(entity => ({
      path: `.phoenix/modules/capabilities/auto/${entity.name}`,
      content: generateCRUDCapability(entity),
    }));
  },
};
```

## Summary

True dendritic pattern for Phoenix:

1. **Filesystem tree** over JSON config
2. **`flake-parts.ts` modules** that export contributions
3. **Auto-discovery** by walking directories
4. **Import-based composition** (not config merging)
5. **Tag system** for platform/runtime compatibility
6. **Factory modules** for code generation
7. **Full TypeScript** throughout

This is how Nix does it, and it's exactly what Phoenix needs.
