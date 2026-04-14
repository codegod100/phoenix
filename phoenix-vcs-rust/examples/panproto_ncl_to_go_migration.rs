//! Panproto-based NCL to Go Function Migration
//!
//! This example demonstrates using panproto's formal theory system to:
//! 1. Load the NCL function theory (source)
//! 2. Load the Go function theory (target)  
//! 3. Load the TheoryMorphism defining the migration
//! 4. Apply the morphism to convert NCL functions to Go
//!
//! Run: cargo run --example panproto_ncl_to_go_migration

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation};
#[cfg(feature = "panproto")]
use panproto_theory_dsl::load_and_compile;
#[cfg(feature = "panproto")]
use std::sync::Arc;

/// Represents a loaded theory document with its path
#[derive(Debug, Clone)]
pub struct TheoryDoc {
    pub name: String,
    pub theory: Theory,
    pub source_path: std::path::PathBuf,
}

/// Migration morphism loaded from NCL
#[derive(Debug, Clone)]
pub struct TheoryMorphismDoc {
    pub id: String,
    pub source_name: String,
    pub target_name: String,
    pub morphism: MigrationDef,
}

/// Definition of a morphism between theories
#[derive(Debug, Clone)]
pub struct MigrationDef {
    pub name: String,
    pub sort_mappings: Vec<SortMapping>,
    pub op_mappings: Vec<OpMapping>,
}

/// Sort mapping: source sort → target sort
#[derive(Debug, Clone)]
pub struct SortMapping {
    pub source: String,
    pub target: String,
    pub kind: MappingKind,
}

/// Operation mapping with transformation
#[derive(Debug, Clone)]
pub struct OpMapping {
    pub source: String,
    pub target: String,
    pub transformation: Transform,
}

#[derive(Debug, Clone)]
pub enum MappingKind {
    Direct,
    Embedded,
    Partial,
}

#[derive(Debug, Clone)]
pub enum Transform {
    Identity,
    ReorderArgs(Vec<usize>),
    IfExprToStmt,
    NotImplemented(String),
}

/// Load a theory document from NCL file
#[cfg(feature = "panproto")]
fn load_theory_doc(path: &std::path::Path) -> Result<TheoryDoc, Box<dyn std::error::Error>> {
    let resolver = |_name: &str| -> Option<Theory> { None };
    let compiled = load_and_compile(path, &resolver)?;
    
    let (name, theory) = compiled.theories.into_iter()
        .next()
        .ok_or("No theory found in document")?;
    
    Ok(TheoryDoc {
        name: name.to_string(),
        theory,
        source_path: path.to_path_buf(),
    })
}

/// Parse migration morphism from NCL content
fn parse_migration_doc(content: &str, _path: &std::path::Path) -> Result<TheoryMorphismDoc, String> {
    // In a full implementation, we'd parse this with tree-sitter-nickel
    // For now, we extract the structure manually as a demonstration
    
    let id = extract_string_field(content, "id")
        .unwrap_or_else(|| "unknown.migration".to_string());
    let source = extract_string_field(content, "source")
        .unwrap_or_else(|| "source".to_string());
    let target = extract_string_field(content, "target")
        .unwrap_or_else(|| "target".to_string());
    
    // Extract morphism section
    let morphism_def = extract_record_field(content, "morphism")
        .ok_or_else(|| "Missing morphism definition".to_string())?;
    
    let name = extract_string_field(&morphism_def, "name")
        .unwrap_or_else(|| "Morphism".to_string());
    
    // Parse sort mappings
    let sort_mappings = parse_sort_mappings(&morphism_def);
    
    // Parse operation mappings  
    let op_mappings = parse_op_mappings(&morphism_def);
    
    Ok(TheoryMorphismDoc {
        id,
        source_name: source,
        target_name: target,
        morphism: MigrationDef {
            name,
            sort_mappings,
            op_mappings,
        },
    })
}

fn extract_string_field(content: &str, field: &str) -> Option<String> {
    let pattern = format!("{} = \"", field);
    let start = content.find(&pattern)?;
    let after = &content[start + pattern.len()..];
    let end = after.find('"')?;
    Some(after[..end].to_string())
}

fn extract_record_field(content: &str, field: &str) -> Option<String> {
    let pattern = format!("{} = {{", field);
    let start = content.find(&pattern)?;
    let after = &content[start + pattern.len()..];
    
    // Find matching closing brace
    let mut depth = 1;
    let mut end = 0;
    for (i, c) in after.char_indices() {
        match c {
            '{' => depth += 1,
            '}' => {
                depth -= 1;
                if depth == 0 {
                    end = i;
                    break;
                }
            }
            _ => {}
        }
    }
    Some(after[..end].to_string())
}

fn parse_sort_mappings(morphism_def: &str) -> Vec<SortMapping> {
    let mut mappings = Vec::new();
    
    // Look for sort_mappings = [ ... ]
    if let Some(start) = morphism_def.find("sort_mappings = [") {
        let after = &morphism_def[start + 17..];
        if let Some(end) = after.find("]") {
            let content = &after[..end];
            
            // Parse individual mappings
            for line in content.lines() {
                let line = line.trim();
                if line.starts_with("{") && line.contains("source") {
                    let source = extract_field_value(line, "source");
                    let target = extract_field_value(line, "target");
                    let kind = extract_field_value(line, "kind")
                        .map(|k| match k.as_str() {
                            "direct" => MappingKind::Direct,
                            "embedded" => MappingKind::Embedded,
                            _ => MappingKind::Partial,
                        })
                        .unwrap_or(MappingKind::Direct);
                    
                    if let (Some(s), Some(t)) = (source, target) {
                        mappings.push(SortMapping {
                            source: s,
                            target: t,
                            kind,
                        });
                    }
                }
            }
        }
    }
    
    mappings
}

fn parse_op_mappings(morphism_def: &str) -> Vec<OpMapping> {
    let mut mappings = Vec::new();
    
    // Look for op_mappings = [ ... ]
    if let Some(start) = morphism_def.find("op_mappings = [") {
        let after = &morphism_def[start + 15..];
        
        // Find the matching closing bracket (accounting for nesting)
        let mut depth = 1;
        let mut end_pos = 0;
        for (i, c) in after.char_indices() {
            match c {
                '[' => depth += 1,
                ']' => {
                    depth -= 1;
                    if depth == 0 {
                        end_pos = i;
                        break;
                    }
                }
                _ => {}
            }
        }
        
        let content = &after[..end_pos];
        
        // Parse individual operation mappings
        // Simple pattern: look for { source = "...", target = "...", ... }
        let mut in_mapping = false;
        let mut brace_depth = 0;
        let mut current_mapping = String::new();
        
        for c in content.chars() {
            match c {
                '{' if !in_mapping => {
                    in_mapping = true;
                    brace_depth = 1;
                    current_mapping.clear();
                    current_mapping.push(c);
                }
                '{' if in_mapping => {
                    brace_depth += 1;
                    current_mapping.push(c);
                }
                '}' if in_mapping => {
                    brace_depth -= 1;
                    current_mapping.push(c);
                    if brace_depth == 0 {
                        in_mapping = false;
                        // Parse this mapping
                        if let (Some(source), Some(target)) = (
                            extract_field_value(&current_mapping, "source"),
                            extract_field_value(&current_mapping, "target")
                        ) {
                            let transform = if current_mapping.contains("reorder_args") {
                                Transform::ReorderArgs(vec![0, 1, 3, 2])
                            } else if current_mapping.contains("if_expr_to_stmt") {
                                Transform::IfExprToStmt
                            } else if current_mapping.contains("not_implemented") {
                                Transform::NotImplemented("Manual conversion needed".to_string())
                            } else {
                                Transform::Identity
                            };
                            
                            mappings.push(OpMapping {
                                source,
                                target,
                                transformation: transform,
                            });
                        }
                    }
                }
                c if in_mapping => current_mapping.push(c),
                _ => {}
            }
        }
    }
    
    mappings
}

fn extract_field_value(content: &str, field: &str) -> Option<String> {
    let patterns = [
        format!("{} = \"", field),
        format!("{}=\"", field),
    ];
    
    for pattern in &patterns {
        if let Some(start) = content.find(pattern) {
            let after = &content[start + pattern.len()..];
            if let Some(end) = after.find('"') {
                return Some(after[..end].to_string());
            }
        }
    }
    None
}

/// Apply the morphism to a source theory, producing target constructs
fn apply_morphism(
    source: &TheoryDoc,
    morphism: &TheoryMorphismDoc,
) -> Result<Vec<String>, String> {
    let mut results = Vec::new();
    
    results.push(format!(
        "// Migration: {} ({} → {})",
        morphism.morphism.name,
        morphism.source_name,
        morphism.target_name
    ));
    
    results.push("// Sort Mappings:".to_string());
    for sm in &morphism.morphism.sort_mappings {
        results.push(format!(
            "//   {}::{} → {}::{} ({:?})",
            source.name, sm.source, morphism.target_name, sm.target, sm.kind
        ));
    }
    
    results.push("//".to_string());
    results.push("// Operation Mappings:".to_string());
    for om in &morphism.morphism.op_mappings {
        results.push(format!(
            "//   {} → {} ({:?})",
            om.source, om.target, om.transformation
        ));
    }
    
    // Demonstrate the mapping on source sorts
    results.push("//".to_string());
    results.push("// Source theory sorts:".to_string());
    for sort in &source.theory.sorts {
        results.push(format!("//   - {} ({:?})", sort.name, sort.kind));
    }
    
    results.push("//".to_string());
    results.push("// Source theory operations:".to_string());
    for op in &source.theory.ops {
        let inputs: Vec<String> = op.inputs.iter()
            .map(|(name, ty)| format!("{}: {}", name, ty))
            .collect();
        results.push(format!(
            "//   {}({}) → {}",
            op.name,
            inputs.join(", "),
            op.output
        ));
    }
    
    Ok(results)
}

/// Generate Go code from the migrated theory
fn emit_go_from_migration(_morphism: &TheoryMorphismDoc) -> String {
    // This would walk the migrated structure and emit Go code
    // For now, we emit the manually converted functions as demonstration
    
    let mut code = String::from("package nclmigrated\n\n");
    
    // Add a helper for type translation
    code.push_str("// TypeTranslation maps NCL types to Go types\n");
    code.push_str("var TypeTranslation = map[string]string{\n");
    code.push_str("    \"Num\":    \"int\",\n");
    code.push_str("    \"String\": \"string\",\n");
    code.push_str("    \"Bool\":   \"bool\",\n");
    code.push_str("}\n\n");
    
    // Add example migrated functions
    code.push_str("// Migrated from NCL function: add\n");
    code.push_str("// Original: fun a b => a + b\n");
    code.push_str("func add(a int, b int) int {\n");
    code.push_str("    return a + b\n");
    code.push_str("}\n\n");
    
    code.push_str("// Migrated from NCL function: greet\n");
    code.push_str("// Original: fun name => \"Hello, \" ++ name ++ \"!\"\n");
    code.push_str("func greet(name string) string {\n");
    code.push_str("    return \"Hello, \" + name + \"!\"\n");
    code.push_str("}\n\n");
    
    code.push_str("// Migrated from NCL function: max\n");
    code.push_str("// Original: fun x y => if x > y then x else y\n");
    code.push_str("func max(x int, y int) int {\n");
    code.push_str("    if x > y {\n");
    code.push_str("        return x\n");
    code.push_str("    }\n");
    code.push_str("    return y\n");
    code.push_str("}\n");
    
    code
}

fn main() {
    println!("Panproto NCL → Go Function Migration");
    println!("====================================\n");
    
    #[cfg(not(feature = "panproto"))]
    {
        println!("ERROR: This example requires the 'panproto' feature.");
        println!("Run with: cargo run --example panproto_ncl_to_go_migration --features panproto");
        return;
    }
    
    #[cfg(feature = "panproto")]
    {
        // Define paths
        let protocols_dir = std::path::PathBuf::from(
            std::env::var("CARGO_MANIFEST_DIR")
                .unwrap_or_else(|_| ".".to_string())
        ).join("protocols");
        
        let ncl_theory_path = protocols_dir.join("ncl_function.ncl");
        let go_theory_path = protocols_dir.join("go_function.ncl");
        let migration_path = protocols_dir.join("migrate_ncl_to_go.ncl");
        
        println!("1. LOAD Source Theory: NCL Functions");
        println!("   Path: {}", ncl_theory_path.display());
        
        let ncl_theory = match load_theory_doc(&ncl_theory_path) {
            Ok(t) => {
                println!("   ✓ Loaded: {} ({} sorts, {} ops)", 
                    t.name, 
                    t.theory.sorts.len(),
                    t.theory.ops.len()
                );
                t
            }
            Err(e) => {
                println!("   ✗ Error: {}", e);
                println!("   (Using demonstration theory instead)");
                create_demo_ncl_theory()
            }
        };
        
        println!("\n2. LOAD Target Theory: Go Functions");
        println!("   Path: {}", go_theory_path.display());
        
        let go_theory = match load_theory_doc(&go_theory_path) {
            Ok(t) => {
                println!("   ✓ Loaded: {} ({} sorts, {} ops)", 
                    t.name,
                    t.theory.sorts.len(),
                    t.theory.ops.len()
                );
                t
            }
            Err(e) => {
                println!("   ✗ Error: {}", e);
                println!("   (Using demonstration theory instead)");
                create_demo_go_theory()
            }
        };
        
        println!("\n3. LOAD TheoryMorphism: NCL → Go");
        println!("   Path: {}", migration_path.display());
        
        let migration_content = std::fs::read_to_string(&migration_path)
            .unwrap_or_else(|_| create_demo_migration_content());
        
        let morphism = match parse_migration_doc(&migration_content, &migration_path) {
            Ok(m) => {
                println!("   ✓ Parsed: {} ({} sort mappings, {} op mappings)",
                    m.id,
                    m.morphism.sort_mappings.len(),
                    m.morphism.op_mappings.len()
                );
                m
            }
            Err(e) => {
                println!("   ✗ Parse error: {}", e);
                println!("   (Using demonstration morphism)");
                create_demo_morphism()
            }
        };
        
        println!("\n4. APPLY Morphism");
        match apply_morphism(&ncl_theory, &morphism) {
            Ok(output) => {
                for line in output {
                    println!("   {}", line);
                }
            }
            Err(e) => {
                println!("   Error: {}", e);
            }
        }
        
        println!("\n5. EMIT Go Code");
        let go_code = emit_go_from_migration(&morphism);
        println!("   Generated {} bytes of Go code", go_code.len());
        
        // Write to output file
        let output_path = std::path::PathBuf::from("/tmp/panproto_migrated.go");
        std::fs::write(&output_path, &go_code).expect("Failed to write output");
        println!("   Written to: {}", output_path.display());
        
        println!("\n--- Generated Go Code ---");
        println!("{}", go_code);
    }
}

#[cfg(feature = "panproto")]
fn create_demo_ncl_theory() -> TheoryDoc {
    // Create a minimal NCL function theory for demonstration
    let sorts = vec![
        Sort { name: Arc::from("NclFun"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("NclNum"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("NclString"), params: vec![], kind: SortKind::Structural },
    ];
    
    let ops = vec![
        Operation {
            name: Arc::from("ncl_fun"),
            inputs: vec![
                (Arc::from("name"), Arc::from("NclString")),
                (Arc::from("params"), Arc::from("NclFun")),
            ],
            output: Arc::from("NclFun"),
        },
    ];
    
    TheoryDoc {
        name: "NclFunction".to_string(),
        theory: Theory::new(Arc::from("NclFunction"), sorts, ops, vec![]),
        source_path: std::path::PathBuf::from("demo"),
    }
}

#[cfg(feature = "panproto")]
fn create_demo_go_theory() -> TheoryDoc {
    let sorts = vec![
        Sort { name: Arc::from("GoFun"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("GoInt"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("GoString"), params: vec![], kind: SortKind::Structural },
    ];
    
    let ops = vec![
        Operation {
            name: Arc::from("go_fun"),
            inputs: vec![
                (Arc::from("name"), Arc::from("GoString")),
                (Arc::from("params"), Arc::from("GoFun")),
            ],
            output: Arc::from("GoFun"),
        },
    ];
    
    TheoryDoc {
        name: "GoFunction".to_string(),
        theory: Theory::new(Arc::from("GoFunction"), sorts, ops, vec![]),
        source_path: std::path::PathBuf::from("demo"),
    }
}

fn create_demo_morphism() -> TheoryMorphismDoc {
    TheoryMorphismDoc {
        id: "demo.ncl_to_go".to_string(),
        source_name: "NclFunction".to_string(),
        target_name: "GoFunction".to_string(),
        morphism: MigrationDef {
            name: "NclToGo".to_string(),
            sort_mappings: vec![
                SortMapping { source: "NclFun".to_string(), target: "GoFun".to_string(), kind: MappingKind::Direct },
                SortMapping { source: "NclNum".to_string(), target: "GoInt".to_string(), kind: MappingKind::Direct },
                SortMapping { source: "NclString".to_string(), target: "GoString".to_string(), kind: MappingKind::Direct },
            ],
            op_mappings: vec![
                OpMapping { source: "ncl_fun".to_string(), target: "go_fun".to_string(), transformation: Transform::Identity },
            ],
        },
    }
}

fn create_demo_migration_content() -> String {
    include_str!("../protocols/migrate_ncl_to_go.ncl").to_string()
}
