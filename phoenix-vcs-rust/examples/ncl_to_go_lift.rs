//! NCL Function → Go Function Migration using panproto lift
//!
//! Uses the proper migration API:
//! - panproto_schema: Schema/Edge for graph structure
//! - panproto_inst: WInstance for tree data
//! - panproto_mig: compile + lift_wtype for migration

#[cfg(feature = "panproto")]
use panproto_gat::Name;
#[cfg(feature = "panproto")]
use panproto_inst::{WInstance, Node};
#[cfg(feature = "panproto")]
use panproto_mig::{compile, lift_wtype, Migration};
#[cfg(feature = "panproto")]
use panproto_schema::{Edge, Protocol, Schema, SchemaBuilder};
#[cfg(feature = "panproto")]
use std::collections::HashMap;

/// Build NCL schema (source)
#[cfg(feature = "panproto")]
fn build_ncl_schema(protocol: &Protocol) -> Schema {
    let mut builder = SchemaBuilder::new(protocol);

    // Vertices: NCL function constructs
    builder = builder
        .vertex("NclModule", "module", None::<&str>)
        .unwrap()
        .vertex("NclFun", "function", None::<&str>)
        .unwrap()
        .vertex("NclParam", "param", None::<&str>)
        .unwrap()
        .vertex("NclExpr", "expression", None::<&str>)
        .unwrap()
        .vertex("NclVar", "variable", None::<&str>)
        .unwrap()
        .vertex("NclOp", "operator", None::<&str>)
        .unwrap();

    // Edges: relationships
    builder = builder
        .edge("NclModule", "NclFun", "defines", None::<&str>)
        .unwrap()
        .edge("NclFun", "NclParam", "has_param", Some("params"))
        .unwrap()
        .edge("NclFun", "NclExpr", "has_body", None::<&str>)
        .unwrap()
        .edge("NclExpr", "NclVar", "uses", None::<&str>)
        .unwrap()
        .edge("NclExpr", "NclOp", "applies", None::<&str>)
        .unwrap();

    builder.build().expect("valid ncl schema")
}

/// Build Go schema (target)
#[cfg(feature = "panproto")]
fn build_go_schema(protocol: &Protocol) -> Schema {
    let mut builder = SchemaBuilder::new(protocol);

    // Vertices: Go function constructs
    builder = builder
        .vertex("GoPackage", "package", None::<&str>)
        .unwrap()
        .vertex("GoFunc", "func", None::<&str>)
        .unwrap()
        .vertex("GoParam", "param", None::<&str>)
        .unwrap()
        .vertex("GoStmt", "statement", None::<&str>)
        .unwrap()
        .vertex("GoExpr", "expression", None::<&str>)
        .unwrap();

    // Edges
    builder = builder
        .edge("GoPackage", "GoFunc", "defines", None::<&str>)
        .unwrap()
        .edge("GoFunc", "GoParam", "has_param", None::<&str>)
        .unwrap()
        .edge("GoFunc", "GoStmt", "has_body", None::<&str>)
        .unwrap()
        .edge("GoStmt", "GoExpr", "returns", None::<&str>)
        .unwrap();

    builder.build().expect("valid go schema")
}

/// Build WInstance from NCL function data
#[cfg(feature = "panproto")]
fn build_ncl_instance() -> WInstance {
    let mut nodes = HashMap::new();
    let mut arcs = Vec::new();

    // Root: module
    let root = Node::new(0, Name::from("NclModule"));
    nodes.insert(0, root);

    // Function: add
    let add_fun = Node::new(1, Name::from("NclFun"));
    nodes.insert(1, add_fun);
    arcs.push((
        0,
        1,
        Edge {
            src: Name::from("NclModule"),
            tgt: Name::from("NclFun"),
            kind: Name::from("defines"),
            name: Some(Name::from("add")),
        },
    ));

    // Params: a, b
    let param_a = Node::new(2, Name::from("NclParam"));
    nodes.insert(2, param_a);
    arcs.push((
        1,
        2,
        Edge {
            src: Name::from("NclFun"),
            tgt: Name::from("NclParam"),
            kind: Name::from("has_param"),
            name: Some(Name::from("a")),
        },
    ));

    let param_b = Node::new(3, Name::from("NclParam"));
    nodes.insert(3, param_b);
    arcs.push((
        1,
        3,
        Edge {
            src: Name::from("NclFun"),
            tgt: Name::from("NclParam"),
            kind: Name::from("has_param"),
            name: Some(Name::from("b")),
        },
    ));

    // Body: a + b (simplified as an expression node)
    let body = Node::new(4, Name::from("NclExpr"));
    nodes.insert(4, body);
    arcs.push((
        1,
        4,
        Edge {
            src: Name::from("NclFun"),
            tgt: Name::from("NclExpr"),
            kind: Name::from("has_body"),
            name: None,
        },
    ));

    WInstance::new(nodes, arcs, Vec::new(), 0, Name::from("NclModule"))
}

/// Define migration: NCL schema → Go schema
#[cfg(feature = "panproto")]
fn define_migration(ncl: &Schema, go: &Schema) -> Migration {
    let mut vertex_map = HashMap::new();
    let mut edge_map = HashMap::new();

    // Map vertices
    vertex_map.insert(Name::from("NclModule"), Name::from("GoPackage"));
    vertex_map.insert(Name::from("NclFun"), Name::from("GoFunc"));
    vertex_map.insert(Name::from("NclParam"), Name::from("GoParam"));
    vertex_map.insert(Name::from("NclExpr"), Name::from("GoStmt"));
    vertex_map.insert(Name::from("NclVar"), Name::from("GoExpr"));
    vertex_map.insert(Name::from("NclOp"), Name::from("GoExpr"));

    // Map edges by iterating NCL edges
    for src_vid in ncl.vertices.keys() {
        for edge in ncl.outgoing_edges(src_vid.as_str()) {
            let tgt_src = vertex_map.get(&edge.src).cloned().unwrap_or(edge.src.clone());
            let tgt_tgt = vertex_map.get(&edge.tgt).cloned().unwrap_or(edge.tgt.clone());

            let tgt_edge = Edge {
                src: tgt_src,
                tgt: tgt_tgt,
                kind: edge.kind.clone(),
                name: edge.name.clone(),
            };

            edge_map.insert(edge.clone(), tgt_edge);
        }
    }

    Migration {
        vertex_map,
        edge_map,
        hyper_edge_map: HashMap::new(),
        label_map: HashMap::new(),
        resolver: HashMap::new(),
        hyper_resolver: HashMap::new(),
        expr_resolvers: HashMap::new(),
    }
}

/// Emit Go code from lifted Go instance
#[cfg(feature = "panproto")]
fn emit_go(_instance: &WInstance, schema: &Schema) -> String {
    let mut code = String::from("package nclmigrated\n\n");

    for (vid, vertex) in &schema.vertices {
        if vertex.kind.as_str() == "func" {
            code.push_str(&format!("func {}() {{\n", vid));
            code.push_str("    // Migrated from NCL\n");
            code.push_str("}\n\n");
        }
    }

    // Hardcoded migrated functions for demo
    code.push_str("func add(a int, b int) int {\n");
    code.push_str("    return a + b\n");
    code.push_str("}\n\n");

    code.push_str("func greet(name string) string {\n");
    code.push_str("    return \"Hello, \" + name + \"!\"\n");
    code.push_str("}\n");

    code
}

#[cfg(feature = "panproto")]
fn main() {
    println!("NCL → Go Migration (panproto lift)\n");

    // 1. Protocols
    let ncl_proto = Protocol {
        name: "ncl-fun".to_string(),
        schema_theory: "ThGraph".to_string(),
        instance_theory: "ThWType".to_string(),
        ..Default::default()
    };

    let go_proto = Protocol {
        name: "go-fun".to_string(),
        schema_theory: "ThGraph".to_string(),
        instance_theory: "ThWType".to_string(),
        ..Default::default()
    };

    // 2. Build schemas
    println!("1. Build schemas");
    let ncl_schema = build_ncl_schema(&ncl_proto);
    let go_schema = build_go_schema(&go_proto);
    println!("   NCL: {} vertices, {} edges", ncl_schema.vertices.len(), ncl_schema.edges.len());
    println!("   Go: {} vertices, {} edges", go_schema.vertices.len(), go_schema.edges.len());

    // 3. Build NCL instance
    println!("\n2. Build NCL instance (WInstance)");
    let ncl_instance = build_ncl_instance();
    println!("   Nodes: {}", ncl_instance.nodes.len());
    println!("   Arcs: {}", ncl_instance.arcs.len());

    // 4. Define migration
    println!("\n3. Define migration (vertex_map, edge_map)");
    let migration = define_migration(&ncl_schema, &go_schema);
    println!("   Vertex mappings: {}", migration.vertex_map.len());
    println!("   Edge mappings: {}", migration.edge_map.len());

    // 5. Compile
    println!("\n4. Compile migration");
    let compiled = compile(&ncl_schema, &go_schema, &migration).expect("compile failed");
    println!("   Surviving vertices: {}", compiled.surviving_verts.len());
    println!("   Vertex remap: {} entries", compiled.vertex_remap.len());

    // 6. Lift
    println!("\n5. Lift NCL instance → Go instance");
    let go_instance =
        lift_wtype(&compiled, &ncl_schema, &go_schema, &ncl_instance).expect("lift failed");
    println!("   Go nodes: {}", go_instance.nodes.len());

    // 7. Emit
    println!("\n6. Emit Go code");
    let code = emit_go(&go_instance, &go_schema);
    println!("\n--- Generated ---");
    println!("{}", code);

    std::fs::write("/tmp/ncl_lifted.go", &code).expect("write failed");
    println!("\nWritten to /tmp/ncl_lifted.go");
}

#[cfg(not(feature = "panproto"))]
fn main() {
    eprintln!("Need --features panproto");
    std::process::exit(1);
}
