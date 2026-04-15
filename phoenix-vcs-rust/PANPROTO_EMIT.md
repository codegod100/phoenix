# How panproto Emit Works

## Overview

In panproto, **emit** is the dual of **parse**. While parse converts native formats to panproto's internal representation, emit converts internal representations back to native formats.

```
┌─────────────────────────────────────────────────────────────────┐
│                     BIDIRECTIONAL PIPELINE                      │
│                                                                 │
│   Schema Level (panproto-protocols)                             │
│   ─────────────────────────────────                               │
│   Native spec (.proto, .json, .sql)                             │
│        ↓ parse_*                                                  │
│   Schema (internal graph representation)                          │
│        ↓ emit_*                                                   │
│   Native spec (round-tripped)                                   │
│                                                                 │
│   Instance Level (panproto-io)                                  │
│   ─────────────────────────────                                 │
│   Raw data (bytes)                                              │
│        ↓ parse_wtype                                              │
│   WInstance/FInstance (typed data graph)                        │
│        ↓ emit_wtype                                               │
│   Raw data (round-tripped)                                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Two Levels of Emit

### 1. Schema-Level Emit (`panproto-protocols`)

Converts a `Schema` (graph of types, fields, constraints) back to native format syntax.

```rust
// Function signature pattern
fn emit_*(schema: &Schema) -> Result<String, ProtocolError>

// Examples:
emit_protobuf(schema)     -> String  // .proto file content
emit_json_schema(schema)  -> String  // JSON Schema document
emit_sql(schema)          -> String  // SQL DDL statements
emit_graphql_sdl(schema)  -> String  // GraphQL schema definition
```

### 2. Instance-Level Emit (`panproto-io`)

Converts a `WInstance` or `FInstance` (data graph) back to raw format bytes.

```rust
// Function signature
fn emit_wtype(
    protocol: ProtocolRef,
    schema: &Schema,
    instance: &WInstance
) -> Result<Vec<u8>, ProtocolError>

// The choice of WInstance vs FInstance depends on the protocol's instance_theory field
```

## The Complete Migration Pipeline

Emit appears at the end of the migration pipeline:

```
┌─────────────┐    parse_*     ┌─────────────┐   mig compile   ┌─────────────────┐
│  Native     │ ─────────────→ │   Schema    │ ─────────────→│ CompiledMigration│
│  Spec v1    │                │     v1      │               │   (lens)        │
└─────────────┘                └─────────────┘               └─────────────────┘
                                                                       │
                              ┌────────────────────────────────────────┘
                              ↓ apply (restrict/extend)
┌─────────────┐    emit_*    ┌─────────────┐
│  Native     │ ←─────────── │   Schema    │
│  Spec v2    │              │     v2      │
└─────────────┘              └─────────────┘

┌─────────────┐   parse_wtype  ┌─────────────┐  inst restrict  ┌─────────────┐
│  Raw Data   │ ──────────────→│  Instance   │ ───────────────→│  Instance   │
│   v1        │                │     v1      │                 │     v2      │
└─────────────┘                └─────────────┘                 └─────────────┘
                                                                      │
                              ┌───────────────────────────────────────┘
                              ↓ emit_wtype
                        ┌─────────────┐
                        │  Raw Data   │
                        │   v2        │
                        └─────────────┘
```

## How Emit Works Internally

### Schema Emit Algorithm

```rust
fn emit_protobuf(schema: &Schema) -> Result<String, ProtocolError> {
    let mut output = String::new();
    
    // 1. Find root vertices (types not referenced by other types)
    let roots = schema.find_root_vertices();
    
    // 2. Topological sort - emit in dependency order
    let sorted = topological_sort(roots, schema);
    
    // 3. For each vertex, emit native syntax
    for vertex in sorted {
        match vertex.kind {
            VertexKind::Message => {
                // Emit: message TypeName { ... }
                output.push_str(&emit_message(&vertex, schema)?);
            }
            VertexKind::Enum => {
                // Emit: enum TypeName { ... }
                output.push_str(&emit_enum(&vertex, schema)?);
            }
            // ... other vertex kinds
        }
    }
    
    Ok(output)
}

fn emit_message(vertex: &Vertex, schema: &Schema) -> Result<String, ProtocolError> {
    let mut fields = Vec::new();
    
    // Follow edges to find fields
    for edge in schema.edges_from(vertex.id) {
        if edge.kind == EdgeKind::Field {
            let field_type = schema.vertex(edge.target);
            fields.push(format!(
                "  {} {} = {};",
                emit_type(field_type)?,
                edge.label,
                edge.field_number
            ));
        }
    }
    
    Ok(format!(
        "message {} {{\n{}\n}}\n",
        vertex.name,
        fields.join("\n")
    ))
}
```

### Instance Emit Algorithm

```rust
fn emit_json(
    schema: &Schema,
    instance: &WInstance
) -> Result<Vec<u8>, ProtocolError> {
    // 1. Find the root node in the instance
    let root = instance.find_root();
    
    // 2. Traverse the instance graph, emitting JSON
    let json_value = emit_json_node(root, instance, schema)?;
    
    // 3. Serialize to bytes
    Ok(serde_json::to_vec(&json_value)?)
}

fn emit_json_node(
    node_id: NodeId,
    instance: &WInstance,
    schema: &Schema
) -> Result<JsonValue, ProtocolError> {
    let node = &instance.nodes[node_id];
    
    match node.wtype {
        WType::Record => {
            let mut obj = serde_json::Map::new();
            
            // Emit each field
            for (field_name, child_id) in &node.fields {
                let value = emit_json_node(*child_id, instance, schema)?;
                obj.insert(field_name.clone(), value);
            }
            
            // Include extra fields not in schema (preservation)
            for (key, value) in &node.extra_fields {
                obj.insert(key.clone(), value.clone());
            }
            
            Ok(JsonValue::Object(obj))
        }
        WType::List => {
            let mut arr = Vec::new();
            for child_id in &node.elements {
                arr.push(emit_json_node(*child_id, instance, schema)?);
            }
            Ok(JsonValue::Array(arr))
        }
        WType::String => Ok(JsonValue::String(node.value.clone())),
        WType::Int => Ok(JsonValue::Number(node.value.parse()?)),
        // ... other primitive types
    }
}
```

## Key Properties

### 1. **Round-Trip Property**

Parse and Emit are inverses (approximately):

```rust
let original = "... some proto file ...";
let schema = parse_protobuf(original)?;
let emitted = emit_protobuf(&schema)?;

// Should be structurally equivalent
assert!(structurally_equivalent(original, emitted));
```

### 2. **Commutativity**

The diagram commutes (Spivak 2012):

```
Schema v1 ──mig compile──→ Schema v2 ──emit_*──→ Native v2
     │                                        ↑
     │parse_*                                  │emit_*
     ↓                                        │
   Native v1 ──manual migration───→ Native v2 │

// Or at instance level:
Instance v1 ──restrict──→ Instance v2 ──emit_wtype──→ Raw v2
     │                                              ↑
     │parse_wtype                                   │emit_wtype
     ↓                                              │
   Raw v1 ──manual migration────────────────────────┘
```

### 3. **Extra Field Preservation**

Emit preserves fields not in the schema:

```rust
// If a JSON document has extra fields...
{ "name": "Alice", "age": 30, "custom_field": "value" }

// And the schema only knows about "name" and "age"...

// Parse includes extra_field in Node::extra_fields
let instance = parse_wtype(json_protocol, schema, json_bytes)?;

// Emit re-includes extra_field in the output
let output = emit_wtype(json_protocol, schema, &instance)?;
// → { "name": "Alice", "age": 30, "custom_field": "value" }
```

## Relation to Our Code Generation

Our bundle code generation is **similar to but different from** panproto emit:

| Aspect | panproto Emit | Our Bundle Code Generation |
|--------|---------------|---------------------------|
| Input | Schema / Instance | BundleConfig (Rust struct) |
| Output | Native format (JSON, Protobuf, etc.) | Target language code (TypeScript, Python, etc.) |
| Round-trip | Yes (parse ∘ emit ≈ id) | No (code can't be parsed back to BundleConfig) |
| Theory-driven | Yes (algebraic models) | Partially (Expr evaluation) |
| Format | Data format | Programming language |

### What We Could Do

We could theoretically use panproto's emit pattern:

```rust
// Instead of:
format!("app.get('{}', ...)", path)

// We could:
let schema = build_schema_from_config(config);
let typescript_emitter = TypeScriptCodeEmitter::new();
typescript_emitter.emit(&schema)
```

Where `TypeScriptCodeEmitter` would be a protocol in panproto's sense:

```rust
// Schema-level: TypeScript module structure
impl Protocol for TypeScriptCode {
    fn parse(input: &str) -> Result<Schema, Error> {
        // Parse TypeScript code back to schema (hard!)
    }
    
    fn emit(schema: &Schema) -> Result<String, Error> {
        // Emit TypeScript code from schema
        Ok(generate_typescript_code(schema))
    }
}
```

But this would require:
1. Defining a schema for TypeScript code structure
2. Building a parser for TypeScript
3. Creating a proper emitter

Our current approach is simpler: `format!()` with structure verification via Expr evaluation.

## Summary

**panproto emit** is the dual of parse:
- **Schema level**: Converts `Schema` to native format text (`.proto`, `.json`, etc.)
- **Instance level**: Converts `WInstance`/`FInstance` to raw data bytes

It guarantees round-trip property and commutativity with migrations, enabling reliable data transformation across formats.

Our bundle code generation is conceptually similar but practically different - we emit **program code** rather than **data**, and we don't (yet) support round-trip parsing.
