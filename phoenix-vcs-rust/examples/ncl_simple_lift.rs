//! NCL → Go using native parse + lift

use tree_sitter::{Node, Parser};
#[cfg(feature = "panproto")]
use panproto_mig::{compile, lift_wtype, Migration};
#[cfg(feature = "panproto")]
use panproto_schema::{SchemaBuilder, Protocol};
#[cfg(feature = "panproto")]
use panproto_inst::{WInstance, Node as PNode};
#[cfg(feature = "panproto")]
use panproto_gat::Name;
#[cfg(feature = "panproto")]
use std::collections::HashMap;

/// Extract NCL functions directly using tree-sitter
fn parse_ncl_functions(content: &str) -> Vec<(String, String, String)> {
    let mut parser = Parser::new();
    parser.set_language(&tree_sitter_nickel::LANGUAGE.into()).expect("language");
    
    let tree = parser.parse(content, None).expect("parse");
    let root = tree.root_node();
    
    let mut funcs = vec![];
    extract_funcs_from_node(root, content, &mut funcs);
    funcs
}

fn extract_funcs_from_node(node: Node, source: &str, funcs: &mut Vec<(String, String, String)>) {
    if node.kind() == "field_def" {
        // Extract field name
        let raw_name = extract_node_text(node, source, "field_path_elem");
        let name = raw_name.strip_prefix("func_").unwrap_or(&raw_name).to_string();
        
        // Check if value is a fun_expr
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "term" || child.kind() == "uni_term" {
                let text = node_text(child, source).unwrap_or_default();
                if text.contains("fun ") && text.contains("=>") {
                    // Extract params and body
                    let (params, body) = parse_fun_expr(&text);
                    funcs.push((name.clone(), params, body));
                }
            }
        }
    }
    
    // Recurse
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        extract_funcs_from_node(child, source, funcs);
    }
}

fn extract_node_text(node: Node, source: &str, kind: &str) -> String {
    // Find any node with matching kind and return its text
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == kind {
            return node_text(child, source).unwrap_or_default().replace('"', "");
        }
        // Recurse
        let mut inner = child.walk();
        for grandchild in child.children(&mut inner) {
            if grandchild.kind() == kind {
                return node_text(grandchild, source).unwrap_or_default().replace('"', "");
            }
            // One more level
            let mut inner2 = grandchild.walk();
            for gg in grandchild.children(&mut inner2) {
                if gg.kind() == kind {
                    return node_text(gg, source).unwrap_or_default().replace('"', "");
                }
            }
        }
    }
    String::new()
}

fn node_text(node: Node, source: &str) -> Option<String> {
    Some(source[node.start_byte()..node.end_byte()].to_string())
}

fn parse_fun_expr(text: &str) -> (String, String) {
    // Parse "fun a b => a + b"
    let rest = text.trim();
    let params = if let Some(start) = rest.find("fun ") {
        let after = &rest[start + 4..];
        if let Some(arr) = after.find("=>") {
            after[..arr].trim().to_string()
        } else {
            String::new()
        }
    } else {
        String::new()
    };
    
    let body = if let Some(arr) = rest.find("=>") {
        rest[arr + 2..].trim().to_string()
    } else {
        String::new()
    };
    
    (params, body)
}

fn main() {
    let ncl = r#"{ func_add = fun a b => a + b }"#;
    std::fs::write("/tmp/f.ncl", ncl).unwrap();
    
    // 1. Parse NCL functions
    let funcs = parse_ncl_functions(ncl);
    println!("Parsed {} functions: {:?}", funcs.len(), funcs.iter().map(|(n, _, _)| n).collect::<Vec<_>>());

    #[cfg(feature = "panproto")] {
        // 2. Build schemas from parsed
        let src = build_src_schema(&funcs);
        let tgt = build_tgt_schema(&funcs);
        
        // 3. Map vertices
        let mut vm = HashMap::new();
        vm.insert("ncl_root".into(), "go_root".into());
        for (name, _, _) in &funcs {
            vm.insert(format!("ncl_{}", name).into(), format!("go_{}", name).into());
        }
        
        let mig = Migration {
            vertex_map: vm,
            edge_map: HashMap::new(),
            hyper_edge_map: HashMap::new(),
            label_map: HashMap::new(),
            resolver: HashMap::new(),
            hyper_resolver: HashMap::new(),
            expr_resolvers: HashMap::new(),
        };
        
        // 4. Compile + Lift
        let compiled = compile(&src, &tgt, &mig).expect("compile");
        let inst = build_instance(&funcs);
        let _go_inst = lift_wtype(&compiled, &src, &tgt, &inst).expect("lift");
        
        // 5. Emit Go
        emit_go(&funcs);
    }
    
    #[cfg(not(feature = "panproto"))] {
        println!("Need --features panproto");
        for (name, params, body) in &funcs {
            println!("  {}: fun {} => {}", name, params, body);
        }
    }
    
    std::fs::remove_file("/tmp/f.ncl").ok();
}

#[cfg(feature = "panproto")]
fn build_src_schema(funcs: &[(String, String, String)]) -> panproto_schema::Schema {
    let mut b = SchemaBuilder::new(&Protocol::default());
    b = b.vertex("ncl_root", "ncl_mod", None::<&str>).unwrap();
    
    for (name, _, _) in funcs {
        b = b.vertex(&format!("ncl_{}", name), "ncl_fun", Some(name)).unwrap();
        b = b.edge("ncl_root", &format!("ncl_{}", name), "defines", Some(name)).unwrap();
    }
    
    b.build().expect("build")
}

#[cfg(feature = "panproto")]
fn build_tgt_schema(funcs: &[(String, String, String)]) -> panproto_schema::Schema {
    let mut b = SchemaBuilder::new(&Protocol::default());
    b = b.vertex("go_root", "go_pkg", Some("main")).unwrap();
    
    for (name, _, _) in funcs {
        b = b.vertex(&format!("go_{}", name), "go_func", Some(name)).unwrap();
        b = b.edge("go_root", &format!("go_{}", name), "defines", Some(name)).unwrap();
    }
    
    b.build().expect("build")
}

#[cfg(feature = "panproto")]
fn build_instance(funcs: &[(String, String, String)]) -> WInstance {
    let mut nodes = HashMap::new();
    nodes.insert(0, PNode::new(0, Name::from("ncl_root")));
    
    for (i, _) in funcs.iter().enumerate() {
        nodes.insert((i + 1) as u32, PNode::new((i + 1) as u32, Name::from("ncl_fun")));
    }
    
    WInstance::new(nodes, vec![], vec![], 0, Name::from("ncl_root"))
}

fn emit_go(funcs: &[(String, String, String)]) {
    println!("\nEmitted Go:\npackage main\n");
    
    for (name, params, body) in funcs {
        // Convert params to Go style
        let go_params: Vec<String> = params.split_whitespace()
            .map(|p| format!("{} int", p))
            .collect();
        
        // Convert body (NCL ++ to Go +)
        let go_body = body.replace("++", "+");
        
        println!("func {}({}) int {{", name, go_params.join(", "));
        println!("    return {}", go_body);
        println!("}}\n");
    }
}
