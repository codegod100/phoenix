# Using panproto-parse Instead of format!()

## The Theory

`panproto-parse` provides `AstParser` with `parse()` and `emit()` methods:

```rust
pub trait AstParser: Send + Sync {
    fn parse(&self, source: &[u8], file_path: &str) -> Result<Schema, ParseError>;
    fn emit(&self, schema: &Schema) -> Result<Vec<u8>, ParseError>;
}
```

**Parse**: Source code (TypeScript/Python) → Schema (AST graph)
**Emit**: Schema (AST graph) → Source code (TypeScript/Python)

## What We Would Need

### 1. Build a Schema Representing Code

Instead of:
```rust
format!("app.get('{}', (c) => {{...}})", path)
```

We would build a Schema graph:

```rust
use panproto_schema::{SchemaBuilder, Protocol};
use panproto_parse::ParserRegistry;

// 1. Get TypeScript protocol
let registry = ParserRegistry::new();
let ts_protocol = registry.get_protocol("typescript").unwrap();

// 2. Build schema representing: app.get('/api/users', (c) => {...})
let schema = SchemaBuilder::new(&ts_protocol)
    .vertex("root", "program", None)?
    .vertex("call_expr", "call_expression", None)?
    .vertex("member_expr", "member_expression", None)?
    .vertex("app", "identifier", None)?
    .vertex("get", "property_identifier", None)?
    .vertex("arg0", "string", None)?  // '/api/users'
    .vertex("arg1", "arrow_function", None)?
    .edge("root", "call_expr", "statement", None)?
    .edge("call_expr", "member_expr", "function", None)?
    .edge("member_expr", "app", "object", None)?
    .edge("member_expr", "get", "property", None)?
    .edge("call_expr", "arg0", "arguments", None)?
    .edge("call_expr", "arg1", "arguments", None)?
    // ... more edges for function body
    .build()?;

// 3. Emit TypeScript code
let code_bytes = registry.emit_with_protocol("typescript", &schema)?;
let code = String::from_utf8(code_bytes)?;
// → "app.get('/api/users', (c) => {...})"
```

### 2. Complexity Comparison

| Aspect | format!() | panproto-parse Schema |
|--------|-----------|----------------------|
| **Knowledge needed** | String templates | Full TypeScript AST structure |
| **Vertex count** | 0 (just strings) | ~20-50 per route |
| **Edge count** | 0 | ~30-80 per route |
| **Validation** | None at build time | Protocol validates structure |
| **Round-trip** | ❌ Can't parse back | ✅ Can parse emitted code |
| **Formatting** | Manual | Preserves formatting constraints |

### 3. The TypeScript AST Schema

To emit TypeScript, we need to understand its tree-sitter grammar:

```
program
└── expression_statement
    └── call_expression
        ├── member_expression
        │   ├── identifier ("app")
        │   ├── . (dot)
        │   └── property_identifier ("get")
        ├── arguments
        │   ├── string ("'/api/users'")
        │   └── arrow_function
        │       ├── parameters ("c")
        │       └── statement_block
        │           └── return_statement
        │               └── call_expression
        │                   ├── member_expression
        │                   │   ├── identifier ("c")
        │                   │   ├── .
        │                   │   └── property_identifier ("json")
        │                   └── arguments
        │                       └── object
        │                           ├── pair ("route", "'/api/users'")
        │                           └── pair ("handler", "'listUsers'")
```

That's ~15 vertices and ~20 edges for a single route handler!

### 4. Example: Building a Simple Route

```rust
fn build_route_schema(
    builder: &mut SchemaBuilder,
    method: &str,
    path: &str,
    handler: &str,
) -> Result<(), SchemaError> {
    // app.METHOD('PATH', (c) => {
    //   return c.json({ route: 'PATH', handler: 'HANDLER' });
    // });
    
    // Vertices
    let call_id = format!("call_{}_{}", method, handler);
    let member_id = format!("member_{}_{}", method, handler);
    let app_id = format!("app_{}_{}", method, handler);
    let method_id = format!("method_{}_{}", method, handler);
    let path_lit_id = format!("path_{}_{}", method, handler);
    let arrow_id = format!("arrow_{}_{}", method, handler);
    let param_id = format!("param_{}_{}", method, handler);
    let block_id = format!("block_{}_{}", method, handler);
    let return_id = format!("return_{}_{}", method, handler);
    let json_call_id = format!("json_call_{}_{}", method, handler);
    let c_member_id = format!("c_member_{}_{}", method, handler);
    let c_id = format!("c_{}_{}", method, handler);
    let json_id = format!("json_{}_{}", method, handler);
    let obj_id = format!("obj_{}_{}", method, handler);
    let route_pair_id = format!("route_pair_{}_{}", method, handler);
    let handler_pair_id = format!("handler_pair_{}_{}", method, handler);
    
    // Build vertices
    builder.vertex(&call_id, "call_expression", None)?;
    builder.vertex(&member_id, "member_expression", None)?;
    builder.vertex(&app_id, "identifier", None)?;
    builder.vertex(&method_id, "property_identifier", None)?;
    builder.vertex(&path_lit_id, "string", None)?;  // Constraint for 'path'
    builder.vertex(&arrow_id, "arrow_function", None)?;
    builder.vertex(&param_id, "identifier", None)?;  // "c"
    builder.vertex(&block_id, "statement_block", None)?;
    builder.vertex(&return_id, "return_statement", None)?;
    builder.vertex(&json_call_id, "call_expression", None)?;
    builder.vertex(&c_member_id, "member_expression", None)?;
    builder.vertex(&c_id, "identifier", None)?;
    builder.vertex(&json_id, "property_identifier", None)?;
    builder.vertex(&obj_id, "object", None)?;
    builder.vertex(&route_pair_id, "pair", None)?;
    builder.vertex(&handler_pair_id, "pair", None)?;
    
    // Build edges
    builder.edge(&call_id, &member_id, "function", None)?;
    builder.edge(&member_id, &app_id, "object", None)?;
    builder.edge(&member_id, &method_id, "property", None)?;
    builder.edge(&call_id, &path_lit_id, "arguments", None)?;
    builder.edge(&call_id, &arrow_id, "arguments", None)?;
    builder.edge(&arrow_id, &param_id, "parameters", None)?;
    builder.edge(&arrow_id, &block_id, "body", None)?;
    builder.edge(&block_id, &return_id, "statement", None)?;
    builder.edge(&return_id, &json_call_id, "expression", None)?;
    builder.edge(&json_call_id, &c_member_id, "function", None)?;
    builder.edge(&c_member_id, &c_id, "object", None)?;
    builder.edge(&c_member_id, &json_id, "property", None)?;
    builder.edge(&json_call_id, &obj_id, "arguments", None)?;
    builder.edge(&obj_id, &route_pair_id, "pair", None)?;
    builder.edge(&obj_id, &handler_pair_id, "pair", None)?;
    // ... more for pair key/value edges
    
    // Add constraints for string literals
    // (would need to set the actual string values)
    
    Ok(())
}
```

## Trade-off Analysis

### ✅ Advantages of panproto-parse

1. **Round-trip property**: Can parse emitted code back to Schema
2. **Formatting preservation**: Respects original code style
3. **Validation**: Protocol validates AST structure
4. **Theory-driven**: Uses actual grammar definitions
5. **Language-agnostic**: Same approach for TypeScript, Python, Rust, etc.

### ❌ Disadvantages

1. **Extreme complexity**: ~50 vertices/edges for simple route
2. **Steep learning curve**: Must understand tree-sitter grammars
3. **Verbose**: 100+ lines of code for what `format!()` does in 5
4. **Maintenance burden**: Schema structure changes with grammar updates
5. **Debugging difficulty**: Schema errors vs string template errors

## Practical Assessment

### For Our Use Case

Our bundles generate **application code**, not **data schemas**:

- **Hono/Express/Flask**: Web server frameworks
- **Lit**: Web components  
- **Purpose**: Scaffolding/boilerplate generation

Characteristics:
- One-way generation (don't need to parse back)
- Simple structure (routes → handlers)
- Stable templates (don't change often)
- Custom formatting (we control style)

### Verdict

**Not recommended** for our current use case.

The complexity of building full AST Schemas outweighs the benefits. `format!()` with our Expr evaluation layer provides:
- ✅ Structure preservation (via Literal evaluation)
- ✅ Traced generation (μ_config→code comments)
- ✅ Simplicity (understandable, maintainable)
- ⚠️ No round-trip (acceptable for code scaffolding)

## When WOULD We Use panproto-parse?

1. **Code transformation tools**: Parse → Modify → Emit existing code
2. **Language servers**: Need to understand full AST structure
3. **Refactoring engines**: Complex code migrations
4. **Linting/Analysis**: Deep code understanding required

Example:
```rust
// Parse existing TypeScript
let schema = registry.parse_with_protocol("typescript", source_code)?;

// Apply transformation (e.g., add async/await)
let transformed = add_async_await(schema)?;

// Emit modified code
let new_code = registry.emit_with_protocol("typescript", &transformed)?;
```

## Conclusion

`panproto-parse` is powerful for **round-trip code operations** (parse → modify → emit), but **overkill for one-way code generation**.

Our current approach is the right trade-off:
```
BundleConfig ──► Expr/Literal ──► format!() ──► Code
     │              │              │
     │              │              └── Simple, direct
     │              └── Structure preserved
     └── Source of truth
```

We keep the algebraic structure (Literal) for verification, then use `format!()` for the practical business of generating text.
