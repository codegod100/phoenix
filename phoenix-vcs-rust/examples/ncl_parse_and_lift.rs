//! Parse NCL file using Phoenix's native parser → Lift to Go → Emit
//!
//! Pipeline: parse_ncl_file (tree-sitter-nickel) → Schema → Migration → Lift → Go

#[cfg(feature = "panproto")]
use panproto_gat::Name;
#[cfg(feature = "panproto")]
use panproto_inst::{Node, WInstance};
#[cfg(feature = "panproto")]
use panproto_mig::{compile, lift_wtype, Migration};
#[cfg(feature = "panproto")]
use panproto_parse::ParserRegistry;
#[cfg(feature = "panproto")]
use panproto_schema::{Edge, Schema, SchemaBuilder};
#[cfg(feature = "panproto")]
use std::collections::HashMap;

/// Parse NCL file using Phoenix's native tree-sitter parser, build Schema
#[cfg(feature = "panproto")]
fn parse_ncl_to_schema(file_path: &std::path::Path) -> Result<Schema, String> {
    use phoenix_vcs::ncl::parse_ncl_file;

    let parsed = parse_ncl_file(file_path)?;
    let mut builder = SchemaBuilder::new(&panproto_schema::Protocol::default());

    // Create module vertex
    builder = builder
        .vertex("module", "ncl_module", None::<&str>)
        .map_err(|e| format!("{:?}", e))?;

    // Extract functions from parsed NCL
    if let Some(ref generic) = parsed.generic {
        for (key, value) in generic {
            // Check if this looks like a function definition
            let is_func = key.starts_with("func_") 
                || (value.contains("fun ") && value.contains("=>"));
            
            if is_func {
                let func_name = if key.starts_with("func_") {
                    &key[5..] // Remove "func_" prefix
                } else {
                    key.as_str()
                };

                // Create function vertex
                let func_vid = format!("func:{}", func_name);
                builder = builder
                    .vertex(&func_vid, "ncl_function", Some(func_name))
                    .map_err(|e| format!("{:?}", e))?;

                // Edge: module defines function
                builder = builder
                    .edge("module", &func_vid, "defines", Some(func_name))
                    .map_err(|e| format!("{:?}", e))?;

                // Parse params from "fun a b => ..."
                if let Some(params_start) = value.find("fun ") {
                    let after_fun = &value[params_start + 4..];
                    if let Some(arrow_pos) = after_fun.find("=>") {
                        let params_str = &after_fun[..arrow_pos];
                        for (i, param) in params_str.split_whitespace().enumerate() {
                            let param_vid = format!("param:{}:{}", func_name, param);
                            builder = builder
                                .vertex(&param_vid, "ncl_param", Some(param))
                                .map_err(|e| format!("{:?}", e))?;

                            // Edge: function has_param param
                            builder = builder
                                .edge(&func_vid, &param_vid, "has_param", Some(&format!("{}", i)))
                                .map_err(|e| format!("{:?}", e))?;
                        }
                    }
                }
            }
        }
    }

    Ok(builder.build().map_err(|e| format!("{:?}", e))?)
}

/// Build WInstance from parsed NCL Schema
#[cfg(feature = "panproto")]
fn build_ncl_instance(schema: &Schema) -> WInstance {
    let mut nodes = HashMap::new();
    let mut arcs = Vec::new();

    // Root node
    nodes.insert(0, Node::new(0, Name::from("module")));

    // Create nodes for each function vertex
    for (i, (vid, vertex)) in schema.vertices.iter().enumerate().skip(1) {
        let node_id = i as u32;
        nodes.insert(node_id, Node::new(node_id, vertex.kind.clone()));

        // Connect to root if it's a function
        if vertex.kind.as_str() == "ncl_function" {
            arcs.push((
                0,
                node_id,
                Edge {
                    src: Name::from("module"),
                    tgt: vertex.kind.clone(),
                    kind: Name::from("defines"),
                    name: Some(vid.clone()),
                },
            ));
        }
    }

    // Connect params to their functions
    for (i, (vid, vertex)) in schema.vertices.iter().enumerate().skip(1) {
        if vertex.kind.as_str() == "ncl_param" {
            let node_id = i as u32;

            // Find parent function from vid (format: param:func_name:param_name)
            let parts: Vec<&str> = vid.split(':').collect();
            if parts.len() >= 2 {
                let func_vid = format!("func:{}", parts[1]);
                if let Some((func_idx, _)) = schema
                    .vertices
                    .iter()
                    .enumerate()
                    .find(|(_, (v, _))| v.as_str() == func_vid)
                {
                    arcs.push((
                        (func_idx + 1) as u32,
                        node_id,
                        Edge {
                            src: Name::from("ncl_function"),
                            tgt: Name::from("ncl_param"),
                            kind: Name::from("has_param"),
                            name: Some(vid.clone()),
                        },
                    ));
                }
            }
        }
    }

    WInstance::new(nodes, arcs, Vec::new(), 0, Name::from("module"))
}

/// Build Go schema (target)
#[cfg(feature = "panproto")]
fn build_go_schema(registry: &ParserRegistry) -> Schema {
    // Use registry to parse Go code for schema
    let go_code = "package main\n\nfunc add(a int, b int) int {\n    return a + b\n}\n\nfunc greet(name string) string {\n    return \"Hello, \" + name + \"!\"\n}\n";
    registry.parse_with_protocol("go", go_code.as_bytes(), "main.go").expect("parse go")
}

/// Define migration: NCL → Go
#[cfg(feature = "panproto")]
fn define_migration(ncl: &Schema, go: &Schema) -> Migration {
    let mut vertex_map = HashMap::new();
    let mut edge_map = HashMap::new();

    // Map NCL vertices to Go vertices
    for (ncl_vid, ncl_vertex) in &ncl.vertices {
        match ncl_vertex.kind.as_str() {
            "ncl_module" => {
                vertex_map.insert(ncl_vid.clone(), Name::from("main.go"));
            }
            "ncl_function" => {
                // Extract function name from vid (format: func:name)
                let func_name = ncl_vid.strip_prefix("func:").unwrap_or(ncl_vid.as_str());
                let go_vid = format!("func:{}", func_name);
                if go.vertices.contains_key(go_vid.as_str()) {
                    vertex_map.insert(ncl_vid.clone(), Name::from(go_vid.as_str()));
                }
            }
            _ => {}
        }
    }

    // Map edges
    for ncl_vid in ncl.vertices.keys() {
        for edge in ncl.outgoing_edges(ncl_vid.as_str()) {
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

/// Emit Go code using registry
#[cfg(feature = "panproto")]
fn emit_go(registry: &ParserRegistry, schema: &Schema) -> String {
    let bytes = registry.emit_with_protocol("go", schema).expect("emit failed");
    String::from_utf8_lossy(&bytes).to_string()
}

#[cfg(feature = "panproto")]
fn main() {
    println!("NCL Parse + Lift Migration\n");

    // 1. Write example NCL file
    let ncl_content = r#"{
  name = "ncl-funcs-example",
  version = "0.1.0",

  func_add = fun a b => a + b,
  func_greet = fun name => "Hello, " ++ name ++ "!",
}"#;

    let ncl_path = std::path::PathBuf::from("/tmp/example_funcs.ncl");
    std::fs::write(&ncl_path, ncl_content).expect("write failed");

    // 2. Parse NCL file to Schema using Phoenix's native parser
    println!("1. Parse NCL file: {}", ncl_path.display());
    let ncl_schema = parse_ncl_to_schema(&ncl_path).expect("parse failed");
    println!("   Vertices: {}", ncl_schema.vertices.len());
    println!("   Edges: {}", ncl_schema.edges.len());

    for (vid, v) in &ncl_schema.vertices {
        println!("   - {}: {:?}", vid, v.kind);
    }

    // 3. Build instance
    println!("\n2. Build NCL WInstance");
    let ncl_instance = build_ncl_instance(&ncl_schema);
    println!("   Nodes: {}", ncl_instance.nodes.len());
    println!("   Arcs: {}", ncl_instance.arcs.len());

    // 4. Get Go schema using registry parser
    println!("\n3. Build Go target schema (via registry)");
    let registry = ParserRegistry::new();
    let go_schema = build_go_schema(&registry);
    println!("   Vertices: {}", go_schema.vertices.len());

    // 5. Define migration
    println!("\n4. Define migration mapping");
    let migration = define_migration(&ncl_schema, &go_schema);
    println!("   Vertex mappings: {}", migration.vertex_map.len());
    println!("   Edge mappings: {}", migration.edge_map.len());

    // 6. Compile
    println!("\n5. Compile migration");
    let compiled = compile(&ncl_schema, &go_schema, &migration).expect("compile failed");
    println!("   Surviving: {}", compiled.surviving_verts.len());

    // 7. Lift
    println!("\n6. Lift to Go instance");
    let go_instance =
        lift_wtype(&compiled, &ncl_schema, &go_schema, &ncl_instance).expect("lift failed");
    println!("   Go nodes: {}", go_instance.nodes.len());

    // 8. Emit
    println!("\n7. Emit Go code");
    let code = emit_go(&registry, &go_schema);
    println!("\n--- Generated ---\n{}", code);

    std::fs::write("/tmp/ncl_parsed_lifted.go", &code).expect("write failed");
    println!("Written to /tmp/ncl_parsed_lifted.go");

    let _ = std::fs::remove_file(&ncl_path);
}

#[cfg(not(feature = "panproto"))]
fn main() {
    eprintln!("Need --features panproto");
}
