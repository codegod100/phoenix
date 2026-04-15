# Bundle to Module Decomposition

## Philosophy Change

**Old (Bundles):**
```
Bundle "elena" = Hono + ElenaJS + Postgres + Vite (all hardcoded together)
```

**New (Fine-Grained Modules):**
```
Module "hono-core" provides: HttpFramework
Module "hono-logger" provides: HttpMiddleware, Logging (needs: hono-core)
Module "postgres-core" provides: DatabaseEngine
Module "postgres-pool" provides: Database (needs: postgres-core)
Module "vite-dev-server" provides: DevServer (needs: vite-core, optionally HttpServer)
Module "welcome-card" provides: WebComponent (needs: ComponentFramework)

Composition = Graph of modules with fulfilled needs
```

## Module Dependency Graph

```
┌─────────────────────────────────────────────────────────────────┐
│                        APPLICATION                               │
│                    (elena-dashboard)                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                   HTTP Stack                              │  │
│  │  ┌───────────┐   ┌───────────┐   ┌───────────┐          │  │
│  │  │hono-core  │◄──│hono-logger│   │hono-cors  │          │  │
│  │  │(framework)│   │(middleware│   │(middleware│          │  │
│  │  └─────┬─────┘   └───────────┘   └─────┬─────┘          │  │
│  │        │                                │                │  │
│  │        └────────────────┬───────────────┘                │  │
│  │                         ▼                                  │  │
│  │                 ┌───────────────┐                          │  │
│  │                 │  hono-server  │                          │  │
│  │                 │  (composed)   │                          │  │
│  │                 └───────┬───────┘                          │  │
│  └─────────────────────────┼──────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────┼──────────────────────────────────┐  │
│  │                   Database Stack                            │  │
│  │  ┌───────────────┐     ┌───────────────┐                 │  │
│  │  │ postgres-core  │────►│ postgres-pool  │                 │  │
│  │  │  (engine)      │     │  (pool)       │                 │  │
│  │  └───────────────┘     └───────┬───────┘                 │  │
│  │                                │                          │  │
│  │  ┌───────────────┐     ┌──────▼────────┐                 │  │
│  │  │ sqlite        │     │ pg-migrations  │                 │  │
│  │  │ (alternative) │     │ (optional)     │                 │  │
│  │  └───────────────┘     └────────────────┘                 │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                            │                                     │
│  ┌─────────────────────────┼──────────────────────────────────┐  │
│  │                  Frontend Stack                             │  │
│  │  ┌───────────┐     ┌───────────────┐                     │  │
│  │  │vite-core  │────►│vite-dev-server│                     │  │
│  │  │(bundler)  │     │(dev server)   │                     │  │
│  │  └───────────┘     └───────┬───────┘                     │  │
│  │                            │                              │  │
│  │  ┌───────────┐     ┌───────▼────────┐                    │  │
│  │  │elenajs-core│────►│   Components   │                    │  │
│  │  │(framework) │     │ welcome-card   │                    │  │
│  │  └───────────┘     │ todo-list      │                    │  │
│  │                    │ user-card      │                    │  │
│  │                    └────────────────┘                    │  │
│  └─────────────────────────────────────────────────────────────┘  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Module Files

### HTTP Stack (`modules/hono-*/`)

**hono-core** - Framework foundation
```ncl
provides: [HttpFramework { framework: "hono", type: "minimal" }]
needs: []
```

**hono-logger** - Logging middleware
```ncl
provides: [Logging, HttpMiddleware]
needs: [HttpFramework (hono-core)]
```

**hono-cors** - CORS middleware
```ncl
provides: [HttpMiddleware]
needs: [HttpFramework (hono-core)]
```

**hono-server** - Composed server
```ncl
provides: [HttpServer]
needs: [
  HttpFramework (hono-core),
  HttpMiddleware (hono-logger, optional),
  HttpMiddleware (hono-cors, optional),
  Logging (optional)
]
```

### Database Stack (`modules/postgres-*/`, `modules/sqlite/`)

**postgres-core** - Database engine
```ncl
provides: [DatabaseEngine { flavor: "postgresql" }]
needs: []
```

**postgres-pool** - Connection pooling
```ncl
provides: [Database { type: "pooled" }]
needs: [DatabaseEngine (postgres-core)]
```

**postgres-migrations** - Schema management
```ncl
provides: [DatabaseMigrations, DatabaseLifecycle]
needs: [Database (any postgresql-flavored)]
```

**sqlite** - Alternative embedded database
```ncl
provides: [DatabaseEngine, Database]  # Direct, no pool
needs: []
```

### Frontend Stack (`modules/vite-*/`, `modules/elenajs-*`)

**vite-core** - Build tooling
```ncl
provides: [BuildTool]
needs: []
```

**vite-dev-server** - Development server
```ncl
provides: [DevServer, HttpMiddleware (proxy)]
needs: [
  BuildTool (vite-core),
  HttpServer (optional)  # To proxy API requests
]
```

**elenajs-core** - Component framework
```ncl
provides: [ComponentFramework]
needs: []
```

### UI Components (`components/*/`) - Atomic design

**welcome-card**
```ncl
provides: [WebComponent { tag: "welcome-card" }]
needs: [ComponentFramework]
```

**todo-list**
```ncl
provides: [WebComponent, DataConsumer]
needs: [ComponentFramework, HttpClient]
```

## Compositions (Replacing Bundles)

Old bundle: `template = "elena"`

New compositions from `application_composer.ncl`:

### Production
```ncl
production-fullstack = {
  modules = [
    hono-core, hono-logger, hono-cors, hono-server,  # HTTP
    postgres-core, postgres-pool, postgres-migrations, # DB
    vite-core, vite-dev-server,                       # Build
    elenajs-core,                                     # Framework
    welcome-card, todo-list                           # Components
  ]
  bindings = {
    # Wire up all the dependencies
    hono-logger → hono-core
    hono-cors → hono-core
    hono-server → [hono-core, hono-logger, hono-cors]
    postgres-pool → postgres-core
    postgres-migrations → postgres-pool
    welcome-card → elenajs-core
    todo-list → [elenajs-core, http-client-from-hono]
  }
}
```

### Development (SQLite instead of Postgres)
```ncl
development-fullstack = {
  modules = [
    hono-core, hono-logger, hono-server,
    sqlite,  # ← Single module replaces postgres-* trio
    vite-core, vite-dev-server,
    elenajs-core,
    welcome-card, todo-list
  ]
}
```

### Minimal API (No frontend)
```ncl
minimal-api = {
  modules = [hono-core, hono-logger, hono-server, sqlite]
}
```

### Frontend Only (No backend)
```ncl
frontend-only = {
  modules = [
    vite-core, vite-dev-server,
    elenajs-core,
    welcome-card, todo-list
  ]
}
```

## Key Differences from Bundles

| Aspect | Bundles | Fine-Grained Modules |
|--------|---------|---------------------|
| **Coupling** | Tight: template dictates all | Loose: pick only what you need |
| **Substitution** | Can't swap parts | Swap any module with compatible interface |
| **Dependencies** | Implicit | Explicit: every need declared and fulfilled |
| **Reuse** | Copy-paste from bundle | Compose from registry |
| **Size** | Monolithic | Minimal: only used modules included |
| **Discovery** | Browse bundle list | Search by interface, properties |
| **Override** | Fork bundle | Override single binding |

## Example: Swapping Logger

**Bundles:** Fork entire bundle, modify, maintain separately

**Modules:** Just change one binding:
```ncl
bindings = {
  # Old: hono-logger
  "hono-server".needs.1 = { fulfilled_by = "winston-logger" },
  
  # Or use constraint-based selection
  "hono-server".needs.1 = { 
    strategy = { 
      type = "constrained",
      constraints = [
        { type = "property_equals", property = "format", value = "json" }
      ]
    }
  },
}
```

## Migration Path

1. **Phase 1:** Create fine-grained modules alongside bundles
2. **Phase 2:** Convert bundles to "legacy compositions" in `application_composer.ncl`
3. **Phase 3:** New apps use compositions, old apps use bundles
4. **Phase 4:** Deprecate bundles when all apps migrated

## Registry Structure

```
modules/
├── hono-core/
│   ├── mod.ncl        # Module definition
│   ├── src/           # Implementation (if not npm)
│   └── README.md
├── hono-logger/mod.ncl
├── hono-cors/mod.ncl
├── hono-server/mod.ncl
├── postgres-core/mod.ncl
├── postgres-pool/mod.ncl
├── postgres-migrations/mod.ncl
├── sqlite/mod.ncl
├── vite-core/mod.ncl
├── vite-dev-server/mod.ncl
└── elenajs-core/mod.ncl

components/
├── welcome-card/mod.ncl
├── todo-list/mod.ncl
└── user-card/mod.ncl

src/capability_fulfillment/
├── mod.rs                    # Core fulfillment system
├── application_composer.ncl  # Composition definitions
└── registry.rs               # Module discovery
```

## Next Steps

1. ✅ Define fine-grained modules (done)
2. ⏳ Create module implementations (runtime code)
3. ⏳ Build `phoenix compose` command to resolve compositions
4. ⏳ Generate deployment configs from compositions
5. ⏳ Migrate existing apps from bundles to compositions
6. ⏳ Module registry UI for discovery

## Module Count

| Layer | Modules | Bundle Equivalent |
|-------|---------|-------------------|
| HTTP | 4 (core, logger, cors, server) | 1 bundle |
| Database | 4 (pg-core, pg-pool, pg-mig, sqlite) | 1 bundle |
| Frontend | 3 (vite-core, dev-server, elenajs) | 1 bundle |
| Components | 3+ (per-component modules) | Part of bundle |
| **Total** | **14+ fine-grained** | **3 bundles** |

The 14+ modules compose into unlimited application variations vs 3 fixed bundles.
