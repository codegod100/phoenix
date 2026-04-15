# Algebraic Shape Morphism Chain

## Layer 1: spec.md → spec.ncl (μ_spec→ncl)

**Source Shape (spec.md)** - Natural language tree:
```
SpecDocument
├── Section "Overview"
│   └── Description: "A fast, lightweight REST API..."
├── Section "API Endpoints"
│   ├── Subsection "Health Check"
│   │   └── Route: GET /health
│   ├── Subsection "Users API"
│   │   ├── Route: GET /api/users
│   │   ├── Route: POST /api/users
│   │   └── ...
│   └── ...
└── Section "Template"
    └── template = "ts-hono"
```

**Target Shape (spec.ncl)** - Algebraic Theory:
```nickel
{
  theory = "TypescriptHonoServer",
  sorts = [RouteTable, MiddlewareStack, ...],
  ops = [mk_health_route, mk_list_users_route, ...],
  phoenix_config = {
    routes = [
      { method = "GET", path = "/health", handler = "listHealth", ... },
      ...
    ]
  }
}
```

**The Morphism:**
- Pattern matching on markdown structure
- Extracts typed values (sorts)
- Constructs operations (route constructors)
- Builds structured config (phoenix_config)

---

## Layer 2: spec.ncl → BundleConfig (μ_ncl→config)

**Source Shape (spec.ncl)** - Nickel expression tree:
```
{ method = "GET", path = "/api/users", handler = "listUsers", description = "..." }
```

**Target Shape (BundleConfig)** - Rust struct:
```rust
BundleConfig {
    project_name: "hono-api-server",
    routes: vec![
        RouteConfig { method: "GET", path: "/api/users", handler: "listUsers", ... },
        ...
    ],
    ...
}
```

**The Morphism:**
- Text parsing (line-by-line extraction)
- Value transformation (Nickel string → Rust String)
- Aggregation (collecting routes into Vec)

---

## Layer 3: BundleConfig → Code (μ_config→code)

**Source Shape (BundleConfig)** - Domain-specific data:
```rust
routes: [
    RouteConfig { method: "GET", path: "/api/users", handler: "listUsers", description: "List all users" },
    RouteConfig { method: "POST", path: "/api/users", handler: "createUsers", description: "Create new user" },
    ...
]
```

**Target Shape (TypeScript AST)** - Code term:
```typescript
// Generated from each RouteConfig:
app.get('/api/users', (c) => {
  return c.json({ 
    route: '/api/users',
    handler: 'listUsers',
    timestamp: new Date().toISOString()
  });
});
```

**The Morphism:**
- For each RouteConfig → generate route handler
- Method mapping: GET → app.get(), POST → app.post()
- Path preservation: /api/users → '/api/users'
- Description → code comment

---

## The Complete Morphism Chain

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ALGEBRAIC MORPHISM CHAIN                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   spec.md ───────► spec.ncl ───────► BundleConfig ───────► src/index.ts    │
│      │                │                  │                    │             │
│      │                │                  │                    │             │
│   μ_spec→ncl      μ_ncl→config       μ_config→code            │             │
│      │                │                  │                    │             │
│      ▼                ▼                  ▼                    ▼             │
│   ┌────────┐    ┌────────┐         ┌──────────┐        ┌──────────┐        │
│   │Natural │    │Theory  │         │Bundle    │        │TypeScript│        │
│   │Language│───►│(Sorts, │────────►│Config    │───────►│  Code    │        │
│   │  Tree  │    │  Ops)  │         │(Routes)  │        │ (AST)    │        │
│   └────────┘    └────────┘         └──────────┘        └──────────┘        │
│                                                                             │
│   Pattern         Algebraic              Data              Concrete         │
│   Matching        Structure              Structure         Syntax            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Key Insight: Structure Preservation

At each layer, the **structure is preserved** but transformed:

1. **Routes** stay as routes (9 routes in → 9 routes out)
2. **Methods** stay as methods (GET → GET → app.get())
3. **Paths** stay as paths (/api/users → /api/users → '/api/users')

This is a **functor** in category theory: it maps objects (shapes) and morphisms (transformations) between categories while preserving structure.

The "shape" that moves through is the **RouteTable** - a structured collection of endpoints that gets refined at each layer until it becomes executable code.