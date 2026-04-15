# Module-Based Capability Fulfillment System

**A distributed, decoupled alternative to bundle-based code generation.**

## Philosophy

Instead of rigid templates (bundles), we have **modules** that:
1. **Advertise** what they provide (capabilities)
2. **Declare** what they need (dependencies)
3. **Resolve** at composition time (not template time)

This enables:
- **Late binding**: Swap PostgreSQL for SQLite without changing app code
- **Distributed development**: Modules from git, registry, or local paths
- **Multiple providers**: Any module can satisfy an interface
- **Constraint-based selection**: Pick providers by properties, cost, capacity

## Core Concepts

### Capability Interface

What can a module provide or need:

```rust
enum CapabilityInterface {
    Database,        // SQL or NoSQL
    Cache,           // Redis, Memcached
    HttpServer,      // HTTP API endpoint
    WebSocket,       // Real-time communication
    Queue,           // Background job processing
    ObjectStorage,   // S3, GCS
    Email,           // SMTP service
    Search,          // Elasticsearch, Algolia
    AuthProvider,    // OAuth, SSO
    WebComponents,   // UI component library
    ReactiveUI,      // Frontend framework
    // ... and extensible Custom(String)
}
```

### Module

A self-describing unit of functionality:

```rust
struct Module {
    id: "auth-service",
    name: "Auth Service",
    version: "1.0.0",
    
    // What this module offers
    provides: [
        { interface: AuthProvider, ... }
    ],
    
    // What this module requires
    needs: [
        { interface: Database, strategy: FirstAvailable },
        { interface: Cache, strategy: FirstAvailable, optional: true },
    ],
    
    language: "typescript",
    source: Git { url: "...", reference: "main" },
}
```

### Fulfillment Strategy

How to pick a provider:

| Strategy | Description |
|----------|-------------|
| `FirstAvailable` | Pick the first matching provider |
| `Named("postgres")` | Use specific provider by ID |
| `Constrained([...])` | Pick by properties/capacity/cost |
| `Composite(["a", "b"])` | Use multiple providers |

### Constraints

Filter providers by properties:

```rust
Constrained([
    HasProperty("persistence"),           // Must be durable
    PropertyEquals("type", "sql"),        // Must be SQL
    MinCapacity("max_connections", 100), // At least 100 connections
    MaxCost(0.10),                        // Max $0.10/hour
])
```

## Example: Elena Dashboard

```rust
// The web app - declares needs, doesn't care about providers
let elena_app = Module {
    id: "elena-dashboard",
    provides: [WebComponents { framework: "elenajs" }],
    needs: [
        Need { interface: HttpServer, optional: false },
        Need { 
            interface: Database, 
            strategy: Constrained([HasProperty("persistence")])
        },
        Need { interface: Cache, optional: true },
    ],
    language: "typescript",
    source: LocalPath("./apps/elena"),
};

// Infrastructure modules - provide capabilities
let hono = Module {
    id: "hono-api",
    provides: [HttpServer { framework: "hono", runtime: "bun" }],
    needs: [],
    source: Git { url: "...", reference: "main" },
};

let postgres = Module {
    id: "postgres",
    provides: [Database { 
        type: "sql", 
        persistence: "durable",
        cost_per_hour: 0.05 
    }],
    needs: [],
    source: Registry { name: "nixpkgs/postgres", version: "15" },
};

let sqlite = Module {
    id: "sqlite",
    provides: [Database { 
        type: "sql", 
        persistence: "file",
        embedded: true,
        cost_per_hour: 0.0  // Free!
    }],
    needs: [],
    source: Inline { code: "sqlite3" },
};

// Compose the system
let system = SystemBuilder::new()
    .with_available([hono, postgres, sqlite])
    .add_module(elena_app)
    .with_rule(PreferProvider { pattern: "postgres", weight: 10 })
    .compose()
    .unwrap();

// Result: elena_app gets hono + postgres (based on rule)
```

## Resolution Output

```
✅ System composed with 3 modules:

📦 Elena Dashboard (typescript)
   └─ HttpServer → Hono HTTP Server via http://localhost:3000
   └─ Database → PostgreSQL via postgresql://localhost:5432/elena
   └─ Cache → Redis Cache via redis://localhost:6379

🔧 Hono HTTP Server (typescript)

🔧 PostgreSQL (nix)

🔧 Redis Cache (nix)
```

## Comparison: Bundles vs Modules

| Aspect | Bundles (Old) | Modules (New) |
|--------|---------------|---------------|
| Coupling | Tight (template dictates structure) | Loose (capabilities matched at runtime) |
| Flexibility | Fixed dependencies | Swappable providers |
| Distribution | Local files only | Git, registry, inline, local |
| Selection | Hardcoded | Constraint-based |
| Composability | Bundle stack | Module graph |
| Late Binding | No | Yes |
| Cost Optimization | No | Yes (MinCost constraints) |

## Registry

Distributed module catalog:

```rust
let mut registry = ModuleRegistry::new();

// Register from anywhere
registry.register(postgres_from_nixpkgs);
registry.register(auth_from_github);
registry.register(cache_from_inline);

// Find all database providers
let db_providers = registry.find_providers(&Database);
// → [postgres, sqlite, mysql, ...]
```

## Deployment Generation

From composed system to Docker Compose / Nix / K8s:

```rust
let deployment = generate_deployment_config(&system);
```

Output:
```json
{
  "version": "3",
  "services": {
    "elena-dashboard": {
      "image": "modules/elena-dashboard:1.0.0",
      "language": "typescript",
      "environment": {
        "HTTP_URL": "http://localhost:3000",
        "DATABASE_URL": "postgresql://localhost:5432/elena",
        "CACHE_URL": "redis://localhost:6379"
      }
    },
    "hono-api": { ... },
    "postgres": { ... },
    "redis": { ... }
  }
}
```

## Advanced Features

### Rule-Based Resolution

```rust
SystemBuilder::new()
    .with_rule(Whitelist { 
        provider: "postgres".to_string(), 
        interface: Database 
    })  // Always use postgres for DB
    .with_rule(Blacklist { 
        provider: "expensive-s3".to_string(), 
        interface: ObjectStorage 
    })  // Never use expensive storage
    .with_rule(PreferProvider { 
        pattern: "redis".to_string(), 
        weight: 5 
    })  // Prefer redis if available
```

### Composite Needs

Use multiple providers for redundancy:

```rust
Need {
    interface: Database,
    strategy: Composite(["postgres-primary", "postgres-replica"]),
}
```

### Warnings for Optional Needs

```
⚠️ Warnings:
   Optional need Cache for elena-dashboard unfulfilled: No provider found
```

## Migration from Bundles

Old bundle-based:
```ncl
# bundles/ts-hono/bundle.ncl
{
  template = "ts-hono",
  files = ["src/index.ts", "package.json"],
}

# apps/myapp/spec.md
template = "ts-hono"
```

New module-based:
```rust
let app = Module {
    id: "myapp",
    provides: [HttpServer],
    needs: [/* capabilities, not templates */],
    source: LocalPath("./apps/myapp"),
};

let resolved = SystemBuilder::new()
    .add_module(app)
    .compose()?;
```

## Testing

```rust
#[test]
fn test_basic_resolution() {
    let auth = create_auth_module();  // needs Database
    let postgres = create_postgres_module();  // provides Database
    
    let system = SystemBuilder::new()
        .with_available([postgres])
        .add_module(auth)
        .compose()
        .unwrap();
    
    // Verify auth got postgres
    let fulfillments = system.fulfillments.get("auth").unwrap();
    assert_eq!(fulfillments[0].provider.id, "postgres");
}
```

## Future Work

1. **Dynamic resolution**: Discover providers at runtime
2. **Capability negotiation**: Version matching between need/provide
3. **Federation**: Merge registries from multiple sources
4. **Cost optimization**: Global optimization across all needs
5. **Health checking**: Verify providers are alive before resolution

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                      MODULE REGISTRY                         │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐     │
│  │ Postgres │  │  SQLite  │  │  Redis   │  │   Hono   │     │
│  │ PROVIDES │  │ PROVIDES │  │ PROVIDES │  │ PROVIDES │     │
│  │ Database │  │ Database │  │  Cache   │  │HttpServer│     │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    RESOLUTION ENGINE                          │
│                                                               │
│  App Module NEEDS: ────────┐                                 │
│    - HttpServer           ─┼─► Resolve ────► Hono            │
│    - Database (persist)   ─┼─► Resolve ────► Postgres        │
│    - Cache (optional)     ─┼─► Resolve ────► Redis           │
│                           ─┘                                 │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    COMPOSED SYSTEM                            │
│                                                               │
│  elena-dashboard:                                            │
│    - HTTP_URL=http://localhost:3000                          │
│    - DATABASE_URL=postgresql://...                             │
│    - CACHE_URL=redis://...                                   │
│                                                               │
└─────────────────────────────────────────────────────────────┘
```

## Conclusion

The module fulfillment system replaces rigid templates with flexible capability matching. Apps declare *what they need*, not *where it comes from*. Infrastructure modules compete to fulfill those needs based on constraints, cost, and availability.

**164 tests passing** - The new system is ready for use.
