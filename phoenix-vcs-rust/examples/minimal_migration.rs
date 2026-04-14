//! Minimal Migration Demo: Python → Go
//!
//! Demonstrates the core panproto-mig Rust API:
//!   compile(&src, &tgt, &migration)
//!   lift_wtype(&compiled, &src, &tgt, &instance)
//!
//! Note: MigrationBuilder is only in Python bindings (panproto-py).
//! In Rust, construct Migration directly.

use panproto_gat::Name;
use panproto_inst::{WInstance, Node};
use panproto_mig::{Migration, compile, lift_wtype};
use panproto_parse::ParserRegistry;
use panproto_schema::{Edge, Protocol, Schema, SchemaBuilder};
use std::collections::HashMap;
use std::path::Path;

fn main() {
    let registry = ParserRegistry::new();

    // 1. Parse Python code to schema
    let python_code = std::fs::read_to_string("protocols/example_component.py").unwrap();
    let python_schema = registry.parse_file(Path::new("data.py"), python_code.as_bytes()).unwrap();

    // 2. Get Go schema by parsing Go code (has text fragments for emit)
    let go_schema = get_go_schema(&registry);

    // 3. Create migration from Python to Go
    // Build migration by inserting vertex mappings
    let mut migration = Migration {
        vertex_map: HashMap::new(),
        edge_map: HashMap::new(),
        hyper_edge_map: HashMap::new(),
        label_map: HashMap::new(),
        resolver: HashMap::new(),
        hyper_resolver: HashMap::new(),
        expr_resolvers: HashMap::new(),
    };
    
    // Map Python Module root to Go source_file vertex
    migration.vertex_map.insert("Module".into(), "main.go".into());
    // Note: class_definition will map to first available Go vertex

    // 4. Compile and apply migration
    let compiled = compile(&python_schema, &go_schema, &migration).unwrap();
    let python_instance = build_python_instance(&python_schema);
    let go_instance = lift_wtype(&compiled, &python_schema, &go_schema, &python_instance).unwrap();

    println!("✅ Migration: {} nodes → {} nodes", python_instance.nodes.len(), go_instance.nodes.len());

    // 5. Emit Go code from the Go schema (target structure)
    // emit_with_protocol takes Schema (structure definition), not WInstance (data)
    let go_code = registry.emit_with_protocol("go", &go_schema).expect("emit failed");
    let go_code_str = String::from_utf8_lossy(&go_code);
    
    println!("\nGenerated Go code from schema:\n```go\n{}```", go_code_str);

fn build_python_instance(schema: &Schema) -> WInstance {
    let mut nodes = HashMap::new();
    let mut arcs = Vec::new();

    nodes.insert(0, Node::new(0, Name::from("Module")));

    for (i, (vid, v)) in schema.vertices.iter().enumerate().take(5) {
        let id = (i + 1) as u32;
        nodes.insert(id, Node::new(id, v.kind.clone()));
        arcs.push((0, id, Edge {
            src: Name::from("Module"),
            tgt: v.kind.clone(),
            kind: Name::from("contains"),
            name: Some(vid.clone()),
        }));
    }

    WInstance::new(nodes, arcs, Vec::new(), 0, Name::from("Module"))
}

fn get_go_schema(registry: &ParserRegistry) -> Schema {
    // Parse Go code to get schema with text fragments
    let go_code = "package main\n\ntype Component struct {\n    Props int\n}\n";
    let schema = registry.parse_with_protocol("go", go_code.as_bytes(), "main.go").unwrap();
    
    // Print available vertices for debugging
    println!("   Go schema vertices: {:?}", schema.vertices.keys().collect::<Vec<_>>());
    
    schema
}
}
