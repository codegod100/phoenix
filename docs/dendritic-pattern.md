# Dendritic Configuration Pattern for Phoenix

## The Buffet Analogy

Like a salad bar: start with empty plate, add exactly what you need.

```
Nix:       { pkgs, ... }: { environment.systemPackages = [ pkgs.git pkgs.vim ]; }
Phoenix:   { capabilities }: [ rest-api web-ui sqlite-persist ]
```

## Dendritic Growth Pattern

```
                    [core]
                      │
        ┌─────────────┼─────────────┐
        │             │             │
    [rest-api]   [cli-tool]    [queue-worker]
        │
   ┌────┴────┐
   │         │
[web-ui] [react-ssr]
   │
[tailwind]
```

Each node adds capabilities. Parent capabilities flow down, children can override.

## Configuration as Dendrite

### Project Level (Root)
```json
{
  "capabilities": ["rest-api", "sqlite-persist"],
  "llm": { "provider": "fireworks" }
}
```

### Service Level (Branch)
```json
{
  "services": {
    "app": {
      "capabilities": ["+web-ui", "+typescript-client"],
      // Inherits: rest-api, sqlite-persist
      // Adds: web-ui, typescript-client
    },
    "worker": {
      "capabilities": ["-web-ui", "+queue-processor"],
      // Inherits: rest-api, sqlite-persist
      // Removes: web-ui (headless)
      // Adds: queue-processor
    }
  }
}
```

### IU Level (Leaf)
```json
{
  "ius": {
    "Items": {
      // Uses service defaults
    },
    "Items Dashboard": {
      "capabilities": ["-web-ui", "+web-components"],
      // Override: use Chad's TS classes instead of static HTML
    },
    "Report Generator": {
      "capabilities": ["+file-generation", "-sqlite-persist"],
      // Adds: CSV/PDF export
      // Removes: DB (stateless file processor)
    }
  }
}
```

## The `+` and `-` Syntax (Nix-Style)

```typescript
// Nix: environment.systemPackages = with pkgs; [ git vim ] ++ [ customPkg ];
// Phoenix capabilities work the same way:

"capabilities": [
  "rest-api",           // base
  "+web-ui",           // additive (explicit, but optional)
  "-unit-tests",       // remove (opt-out of default)
  "+e2e-tests"         // add different test type
]
```

Or the list form for clarity:
```json
{
  "capabilities": {
    "base": ["rest-api", "sqlite-persist", "unit-tests"],
    "add": ["web-ui", "typescript-client"],
    "remove": ["unit-tests"],
    "override": {
      "web-ui": { "css": "tailwind" }
    }
  }
}
```

## Dendritic Module Resolution

```typescript
// src/capabilities/dendritic.ts

export function resolveDendritic(
  rootCaps: string[],                    // Project level
  serviceModifiers?: Modifiers,          // Service branch
  iuModifiers?: Modifiers                // IU leaf
): ResolvedCapabilities {
  
  // 1. Start with root
  let resolved = [...rootCaps];
  
  // 2. Apply service modifiers
  if (serviceModifiers) {
    resolved = applyModifiers(resolved, serviceModifiers);
  }
  
  // 3. Apply IU modifiers (most specific)
  if (iuModifiers) {
    resolved = applyModifiers(resolved, iuModifiers);
  }
  
  // 4. Resolve dependencies (transitive closure)
  resolved = addTransitiveDeps(resolved);
  
  // 5. Remove conflicts
  resolved = removeConflicts(resolved);
  
  return resolved;
}

function applyModifiers(
  base: string[],
  mods: Modifiers
): string[] {
  let result = [...base];
  
  // Remove
  for (const cap of (mods.remove || [])) {
    result = result.filter(c => c !== cap.replace(/^-/, ''));
  }
  
  // Add
  for (const cap of (mods.add || [])) {
    const clean = cap.replace(/^\+/, '');
    if (!result.includes(clean)) {
      result.push(clean);
    }
  }
  
  return result;
}
```

## Real-World Example: Multi-Service Project

### SettleUp App (Split Architecture)

```json
{
  "capabilities": ["rest-api"],
  
  "services": {
    "api": {
      "capabilities": ["+sqlite-persist", "+authentication", "+unit-tests"]
    },
    "web": {
      "capabilities": ["+web-ui", "+typescript-client"]
    },
    "worker": {
      "capabilities": ["+queue-processor", "+email-sender", "-web-ui"]
    },
    "admin": {
      "capabilities": ["+web-ui", "+react-ssr", "+prisma-orm"]
      // Different UI approach for admin panel
    }
  },
  
  "ius": {
    "Settlements": {
      "service": "api",
      "capabilities": ["+webhook-receiver"]
    },
    "Settlement Dashboard": {
      "service": "admin",
      "capabilities": ["+real-time-charts"]
    },
    "Balance Calculator": {
      "service": "worker",
      "capabilities": ["+file-generation"],
      // Exports CSV reports, no DB needed (reads from API)
    }
  }
}
```

## Dendritic Growth in Practice

### Starting Simple
```bash
$ phoenix init my-app
$ phoenix config capabilities=rest-api
# Generates: Basic Hono API only
```

### Adding UI
```bash
$ phoenix config capabilities+=web-ui
# Adds: HTML file generation, static serving
# Keeps: REST API
# Server updated to serve both
```

### Adding Client
```bash
$ phoenix config capabilities+=typescript-client
# Adds: Client.ts generation
# UI now uses typed client instead of raw fetch
```

### Splitting Services
```bash
$ phoenix config services.api.capabilities+=queue-processor
$ phoenix config services.web.capabilities-=sqlite-persist
# API has DB, Web is stateless
```

### Per-IU Override
```bash
$ phoenix config ius."Analytics".capabilities+=file-generation
# Just this IU gets CSV export
```

## Visualizing the Tree

```
Project: my-app
├── Capabilities: [rest-api]
│
├── Service: api
│   ├── Capabilities: [rest-api, sqlite-persist, auth]
│   │
│   └── IUs:
│       ├── Users (inherits: api caps)
│       ├── Orders (inherits: api caps)
│       └── Reports (+file-generation, -sqlite-persist)
│           // Stateless, just calls other APIs
│
├── Service: web
│   ├── Capabilities: [rest-api, web-ui, typescript-client]
│   │
│   └── IUs:
│       ├── Landing Page (static HTML)
│       ├── Dashboard (+realtime-charts)
│       └── Admin Panel (+react-ssr, +prisma-orm)
│           // Different stack, but same spec-driven
│
└── Service: worker
    ├── Capabilities: [queue-processor, email-sender]
    └── IUs:
        └── Notification Processor (headless)
```

## Nix-Style `with` Pattern

```json
{
  "with": "full-stack-crud",
  "capabilities": {
    "add": ["openapi-spec"],
    "remove": ["unit-tests"],
    "override": {
      "web-ui": { "css": "tailwind" }
    }
  }
}
```

Equivalent to:
```nix
{ config, pkgs, ... }: with pkgs; [
  git vim nodejs
] ++ [ customPkg ] ++ (optionals config.enableX [ xorg.xorgserver ])
```

## Capability Inheritance Chain

```typescript
// Resolution order (most specific wins)
const iuCaps = resolveChain([
  defaults,              // Phoenix built-in defaults
  projectCapabilities,    // .phoenix/config.json root
  serviceModifiers[service],  // Service branch
  iuModifiers[iuName]    // IU leaf
]);
```

Example resolution:
```
Defaults:       [rest-api, unit-tests]
Project:        [rest-api, sqlite-persist, unit-tests]
Service (web):  [rest-api, sqlite-persist, unit-tests, web-ui]
IU (Dashboard): [rest-api, sqlite-persist, web-ui, realtime-charts]
                                           ^ -unit-tests (opt-out)
```

## Why Dendritic > Monolithic

| Scenario | Monolithic | Dendritic |
|----------|-----------|-----------|
| Simple API | `web-api` (bloated) | `rest-api` only |
| API + DB | `web-api` (forced UI) | `rest-api, sqlite-persist` |
| API + UI | `web-api` (exactly) | `rest-api, web-ui` (explicit) |
| Complex Game | Wrong architecture? | `rest-api, web-components, websocket` |
| Admin Panel | Same stack? | `rest-api, react-ssr` (different UI) |
| Microservices | Multiple projects | One project, service-level caps |

## The Killer Feature: Capability Stores

Like Nix channels, Phoenix could have:

```bash
# Official store
$ phoenix capabilities --store=official

# Community store
$ phoenix capabilities --store=community

# Private store (enterprise)
$ phoenix capabilities --store=https://internal.company.com/phoenix-store

# Install from any store
$ phoenix add-capability @community/graphql-federation
```

## Implementation Sketch

```typescript
// src/config/dendritic.ts

interface DendriticConfig {
  // Root capabilities
  capabilities: CapabilitySpec[];
  
  // Service branches
  services?: Record<string, {
    capabilities: CapabilitySpec[];
  }>;
  
  // IU leaves
  ius?: Record<string, {
    service?: string;
    capabilities: CapabilitySpec[];
  }>;
}

type CapabilitySpec = 
  | string           // "rest-api" or "+rest-api"
  | { 
      name: string;
      add?: string[];
      remove?: string[];
      params?: Record<string, unknown>;
    };

// Resolution
export function resolveCapabilities(
  config: DendriticConfig,
  context: { service?: string; iu?: string }
): string[] {
  const chain: CapabilitySpec[][] = [
    config.capabilities,  // root
  ];
  
  if (context.service && config.services?.[context.service]) {
    chain.push(config.services[context.service].capabilities);
  }
  
  if (context.iu && config.ius?.[context.iu]) {
    chain.push(config.ius[context.iu].capabilities);
  }
  
  return chain.reduce(applyLayer, []);
}
```

## Summary

The dendritic pattern gives Phoenix:

1. **Precision**: Only generate what's needed
2. **Flexibility**: Mix and match any combination
3. **Growth**: Start simple, add complexity incrementally
4. **Override**: Fix edge cases without changing everything
5. **Community**: Share capability modules like Nix packages

**No more guessing** if `web-api` is right. Just pick: `rest-api`, `sqlite-persist`, `web-ui` — or any other combination.
