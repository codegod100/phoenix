# 3-Way Bidirectional Lens Chain: spec.md ↔ spec.ncl ↔ code

## The Complete Lens Architecture

```
                    ┌─────────────────────────────────────────────────────────┐
                    │                    DESIGN LAYER                            │
                    │  spec.md (Human-readable requirements)                    │
                    │  ─────────────────────────────────────                   │
                    │  # user-service                                          │
                    │  - `GET /api/users` - List users                         │
                    │  - `POST /api/users` - Create user                       │
                    └─────────────────────────────────────────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │  LENS A             │
                              │  spec.md↔spec.ncl   │
                              │                     │
                              │  Layer 1: Theory    │
                              │  Layer 2: Schema    │
                              │  Layer 3: Lens      │
                              │  Layer 4: Generator │
                              └──────────┬──────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                 SPECIFICATION LAYER                      │
                    │  spec.ncl (Formal Nickel specification)                 │
                    │  ─────────────────────────────────────                   │
                    │  {                                                       │
                    │    project_name = "user-service"                         │
                    │    routes = [                                            │
                    │      { method = "GET", path = "/api/users" }           │
                    │    ]                                                      │
                    │  }                                                        │
                    └─────────────────────────────────────────────────────────┘
                                         │
                              ┌──────────┴──────────┐
                              │  LENS B             │
                              │  spec.ncl↔code      │
                              │                     │
                              │  Layer 1: Theory    │
                              │  Layer 2: Schema    │
                              │  Layer 3: Lens      │
                              │  Layer 4: Generator │
                              └──────────┬──────────┘
                                         │
                                         ▼
                    ┌─────────────────────────────────────────────────────────┐
                    │                 CODE LAYER                                │
                    │  app.js (Generated/Edited JavaScript)                    │
                    │  ─────────────────────────────────────                   │
                    │  app.get('/api/users', (req, res) => {                 │
                    │    res.json({ users: [] });                              │
                    │  });                                                     │
                    └─────────────────────────────────────────────────────────┘
```

## Bidirectional Operations

### LENS A: spec.md ↔ spec.ncl
```rust
// Forward: spec.md → spec.ncl
$ phoenix parse
[Layer 1] Theory: ThNaturalLanguage
[Layer 2] Schema: 4 vertices, 3 edges
[Layer 3] Lens: extracted 5 fields
[Layer 4] Generator: 72 lines
✅ spec.ncl generated

// Backward: spec.ncl → spec.md  
$ phoenix doc --to-spec
[Layer 3] Lens.put() generating markdown
✅ spec.md regenerated

// Compare: detect drift
$ phoenix compare
✅ spec.md and spec.ncl are in sync
// or
🔴 project_name mismatch: "user-service" vs "super-api"
```

### LENS B: spec.ncl ↔ code
```rust
// Forward: spec.ncl → code
$ phoenix pipeline
[Layer 1] Theory: NodejsExpressServer
[Layer 2] Schema: validated route graph
[Layer 3] Lens: expanding templates
[Layer 4] Generator: writing app.js, package.json
✅ Code generated

// Backward: code → spec.ncl (sync)
$ phoenix sync --diff
🟢 ADDED: GET /health route
🟡 MODIFIED: POST /api/users response
🔴 REMOVED: GET /api/items
💡 Run `phoenix sync --apply` to update spec.ncl
```

## Complete Round-Trip Examples

### Example 1: Edit spec.md, regenerate everything
```bash
# 1. Edit spec.md - add new route
$ echo "- \`GET /api/health\` - Health check" >> spec.md

# 2. Forward A: spec.md → spec.ncl
$ phoenix parse
✅ spec.ncl updated with new route

# 3. Forward B: spec.ncl → code  
$ phoenix pipeline
✅ app.js regenerated with health endpoint
```

### Example 2: Edit code, sync back to spec
```bash
# 1. Edit app.js - add PUT route
$ cat >> app.js << 'EOF'
app.put('/api/users/:id', (req, res) => {
  res.json({ updated: true });
});
EOF

# 2. Backward B: code → spec.ncl
$ phoenix sync --diff
🟢 Detected: PUT /api/users/:id
💡 Suggested: Add to phoenix_config.routes

$ phoenix sync --apply
✅ spec.ncl updated with PUT route

# 3. Backward A: spec.ncl → spec.md
$ phoenix doc --to-spec
✅ spec.md updated with new route documentation
```

### Example 3: Full cycle verification
```bash
# Verify all three are in sync
$ phoenix compare && phoenix sync --diff
✅ spec.md ↔ spec.ncl: In sync
✅ spec.ncl ↔ code: No drift detected
🎯 All 3 formats are consistent!
```

## The Lens Laws

For a true bidirectional lens, these must hold:

### 1. GetPut Law
```
put(get(spec.md), spec.md) = spec.md
```
Parsing then generating gives back original.

### 2. PutGet Law  
```
get(put(spec.ncl_values, spec.md)) = spec.ncl_values
```
Generating then parsing gives the values used.

### 3. Round-trip fidelity
```rust
spec_md --[parse]--> spec_ncl --[generate]--> code --[sync]--> spec_ncl' --[to-md]--> spec_md'

assert_eq!(normalize(spec_md), normalize(spec_md'))
// Comments and whitespace may differ
// But semantic content must match
```

## Implementation Status

| Lens | Direction | Status | Command |
|------|-----------|--------|---------|
| **A** | spec.md → spec.ncl | ✅ Working | `phoenix parse` |
| **A** | spec.ncl → spec.md | ✅ Working | `phoenix doc --to-spec` |
| **A** | Compare | ✅ Working | `phoenix compare` |
| **B** | spec.ncl → code | ✅ Working | `phoenix pipeline` |
| **B** | code → spec.ncl | ⚠️ Partial | `phoenix sync --diff/--apply` |
| **B** | Compare | ✅ Working | `phoenix sync --diff` |

## Next Steps for Full Lens B

To complete bidirectional code↔spec.ncl:

1. **Extend route detection** to all bundles (Express ✅, Flask, Hono, etc.)
2. **Add AST parsing** (tree-sitter) instead of regex
3. **Implement full put()** for spec.ncl generation from code
4. **Add model/field detection** from generated code

## Demo Commands

```bash
# Show all 3 formats side-by-side
$ echo "=== spec.md ===" && head -20 spec.md && \
  echo "=== spec.ncl ===" && head -20 spec.ncl && \
  echo "=== app.js ===" && head -20 app.js

# Verify bidirectional consistency
$ phoenix compare  # spec.md ↔ spec.ncl
$ phoenix sync --diff  # code ↔ spec.ncl

# Full regeneration
$ phoenix parse && phoenix pipeline

# Full upstream sync  
$ phoenix sync --apply && phoenix doc --to-spec
```
