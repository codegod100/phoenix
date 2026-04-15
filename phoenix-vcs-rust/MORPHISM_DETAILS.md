# Algebraic Morphism: How the Shape Transforms

## The Core Idea

Phoenix uses **category-theoretic morphisms** to transform specifications into code. A morphism (μ) maps structure from one category to another while preserving the essential "shape."

## The 4-Layer Stack

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           PANPROTO 4-LAYER STACK                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  LAYER 1: THEORY (ThSpec)          LAYER 2: SCHEMA                            │
│  ─────────────────────────         ─────────────────────────                  │
│  Sorts: RouteTable, Port,          SchemaGraph {                              │
│         MiddlewareStack                vertices: [routes, config],              │
│                                        edges: [routes→config],                 │
│  Ops:   mk_health_route(),             constraints: [...]                       │
│         mk_list_users_route(),                                                │
│         compose_app()                                                         │
│                                                                             │
│           ↓ μ₁ (Theory → Schema)                                            │
│                                                                             │
│  LAYER 3: LENS (StructuredSpec)    LAYER 4: EXPR (Code)                      │
│  ─────────────────────────         ─────────────────────────                  │
│  project_name: String,               Expr::Record([                            │
│  routes: Vec<RouteSpec>,                 ("app", Expr::Lam(...)),               │
│  server_config: {...}                    ("routes", Expr::List(...))          │
│  ])                                                                          │
│                                                                             │
│           ↓ μ₂ (Lens → Expr)                                                │
│                                                                             │
│  LAYER 5: PRETTY-PRINT (String)                                             │
│  ─────────────────────────                                                  │
│  "import { Hono } from 'hono';\n\nconst app = new Hono();..."                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## The Morphism Chain for Hono

### Step 1: μ_spec→ncl (Natural Language → Theory)

**Input:** spec.md (markdown tree)
```markdown
# Hono API Server
## API Endpoints
### Users API
- **GET** `/api/users` - List all users
```

**Transformation:**
```rust
// Layer 3: Lens extracts structured data
SpecMdLens::parse(spec_md) → StructuredSpec {
    project_name: "Hono API Server",
    template: "ts-hono",
    routes: vec![
        RouteSpec {
            method: "GET",
            path: "/api/users",
            handler: "listUsers",
            description: "List all users"
        },
        ...
    ]
}

// Layer 4: NCL Generator converts to Nickel
NclSpecGenerator::generate(structured) → spec.ncl
```

**Output:** spec.ncl (algebraic theory)
```nickel
{
  theory = "TypescriptHonoServer",
  sorts = [
    { name = "RouteTable", kind = { type = "structural" } },
    { name = "GET", kind = { type = "structural" } },
    ...
  ],
  ops = [
    { name = "mk_list_users_route", 
      inputs = [{ name = "path", sort = "String" }], 
      output = "ListUsersRoute" },
    ...
  ],
  phoenix_config = {
    routes = [
      { method = "GET", path = "/api/users", 
        handler = "listUsers", description = "List all users" },
      ...
    ]
  }
}
```

---

### Step 2: μ_ncl→config (Theory → Data Structure)

**Input:** spec.ncl (text)

**Transformation:**
```rust
// Parse text into BundleConfig (Rust struct)
parse_spec_to_config(spec_ncl) → BundleConfig {
    project_name: "hono-api-server".to_string(),
    version: "0.1.0".to_string(),
    routes: vec![
        RouteConfig {
            method: "GET".to_string(),
            path: "/api/users".to_string(),
            handler: "listUsers".to_string(),
            description: "List all users".to_string()
        },
        // ... 8 more routes
    ],
    raw_spec: spec_ncl.to_string()
}
```

**Output:** BundleConfig (structured data)

The key insight: **the route table shape is preserved** - 9 routes in spec.ncl → 9 RouteConfigs in BundleConfig.

---

### Step 3: μ_config→code (Data → Expr → String)

**Input:** BundleConfig with 9 routes

**Transformation:**
```rust
// hono_index_ts(config) builds the code

// For each route in config.routes:
// RouteConfig { method: "GET", path: "/api/users", ... }
//   ↓
// Generates Expr-like structure (via string formatting):
// app.get('/api/users', (c) => {
//   return c.json({ route: '/api/users', ... });
// });

let routes_code = config.routes.iter().map(|route| {
    format!(r#"// {}
app.{}('{}', (c) => {{
  return c.json({{ 
    route: '{}',
    handler: '{}',
    timestamp: new Date().toISOString()
  }});
}});"#, 
    route.description,
    route.method.to_lowercase(),  // GET → get
    route.path,
    route.path,
    route.handler
    )
}).collect::<Vec<_>>().join("\n\n");
```

**Output:** TypeScript code (string)
```typescript
// List all users
app.get('/api/users', (c) => {
  return c.json({ 
    route: '/api/users',
    handler: 'listUsers',
    timestamp: new Date().toISOString()
  });
});

// Create new user  
app.post('/api/users', (c) => {
  return c.json({ 
    route: '/api/users',
    handler: 'createUsers',
    timestamp: new Date().toISOString()
  });
});

// ... 7 more routes
```

---

## The Algebraic Shape: RouteTable

The "shape" that flows through all transformations is the **RouteTable** - a structured collection of HTTP endpoints. At each layer, it's represented differently but preserves the same structure:

| Layer | Representation | Example |
|-------|---------------|---------|
| L1 (Theory) | Sort + Operations | `RouteTable` sort, `mk_list_users_route` op |
| L2 (Schema) | Graph Vertex | `Vertex { id: "routes", edges: [...] }` |
| L3 (Lens) | Rust Struct | `Vec<RouteSpec>` |
| L4 (Expr) | Expr::List | `Expr::List([Expr::Record(...), ...])` |
| L5 (Code) | AST Nodes | `app.get(...)` function calls |

### Structure Preservation (Functor Laws)

**Identity:**
- 9 routes in spec.md → 9 routes in spec.ncl → 9 routes in BundleConfig → 9 route handlers in code

**Composition:**
- μ_total = μ_config→code ∘ μ_ncl→config ∘ μ_spec→ncl

---

## How It "Knows" What to Morph

The morphism isn't magic - it's **bidirectional lenses** that define how to get/put values:

```rust
// In spec_md_to_ncl.rs - the SpecMdLens defines the forward morphism
impl SpecMdLens {
    /// get: spec.md → StructuredSpec (forward morphism)
    fn parse(spec_md: &str) -> StructuredSpec {
        // Pattern: "- **GET** `/path`" 
        //   ↓
        // RouteSpec { method: "GET", path: "/path" }
    }
    
    /// put: StructuredSpec → spec.md (backward morphism - not implemented here)
    fn generate(structured: &StructuredSpec) -> String {
        // Would convert RouteSpec back to markdown
    }
}
```

The morphism is defined by **pattern matching rules**:
1. Lines starting with `- **METHOD**` → RouteSpec
2. Values in `phoenix_config.routes` → RouteConfig  
3. RouteConfig fields → TypeScript function call template

Each layer has its own lens that knows how to transform its specific representation.

---

## The Category Theory View

In category theory terms:

- **Objects:** Types (String, RouteSpec, Expr, Code)
- **Morphisms:** Functions (parse, generate, format)
- **Functor:** The pipeline itself (maps objects and morphisms between categories)

```
Category: MarkdownSpecs                Category: TypeScriptCode
         │                                    │
         │ μ_spec→ncl                         │ μ_config→code
         ▼                                    ▼
Category: NickelSpecs ──μ_ncl→config──► Category: BundleConfigs
```

The key insight: **structure-preserving transformations** maintain the "shape" of the route table across all representations, allowing us to trace any element from spec through to generated code.