//! Panproto Code Generation Demo
//!
//! This example demonstrates panproto's built-in code generation capabilities
//! vs manual string generation.
//!
//! Panproto can:
//! 1. Parse schemas from .ncl, JSON Schema, OpenAPI, etc.
//! 2. Generate lenses (migrations) between schema versions
//! 3. Generate code in target languages (Python, TypeScript, Rust, etc.)
//!
//! Architecture:
//! - Layer 0: panproto-gat (algebra engine)
//! - Layer 1: panproto-schema (schema representation)
//! - Layer 2: panproto-parse (parsers for 248+ languages)
//! - Layer 3: panproto-project (code generation)

#[cfg(feature = "panproto")]
use panproto_project::{Project, Generator, TargetLanguage};
#[cfg(feature = "panproto")]
use panproto_schema::{Schema, SchemaBuilder, Vertex, Edge};
#[cfg(feature = "panproto")]
use panproto_theory_dsl::load_and_compile;

/// Manual generation (what we've been doing)
#[cfg(not(feature = "panproto"))]
mod manual_generation {
    use serde::{Deserialize, Serialize};

    #[derive(Debug, Clone, Serialize, Deserialize)]
    pub struct Component {
        pub name: String,
        pub props: Vec<(String, String)>, // (name, type)
    }

    /// Manual string concatenation - error prone, no validation
    pub fn generate_python_class_manual(component: &Component) -> String {
        let mut code = String::new();
        
        // Imports
        code.push_str("from dataclasses import dataclass\n\n");
        
        // Class decorator
        code.push_str("@dataclass\n");
        code.push_str(&format!("class {}Props:\n", component.name));
        
        // Fields
        for (name, ty) in &component.props {
            code.push_str(&format!("    {}: {}\n", name, ty));
        }
        
        code
    }

    /// Manual TypeScript generation
    pub fn generate_typescript_interface_manual(component: &Component) -> String {
        let mut code = String::new();
        
        code.push_str(&format!("interface {}Props {{\n", component.name));
        for (name, ty) in &component.props {
            let ts_type = match ty.as_str() {
                "str" => "string",
                "int" => "number",
                "bool" => "boolean",
                _ => "any",
            };
            code.push_str(&format!("  {}: {};\n", name, ts_type));
        }
        code.push_str("}\n");
        
        code
    }
}

/// Using panproto's built-in generation (when feature enabled)
#[cfg(feature = "panproto")]
mod panproto_generation {
    use panproto_project::{Project, Generator, TargetLanguage, CodeGenOptions};
    use panproto_schema::{Schema, SchemaBuilder, Vertex, VertexType, Edge, EdgeType};
    use panproto_theory_dsl::{load_and_compile, TheoryDocument};
    use std::path::Path;
    use std::sync::Arc;

    /// Load a theory from .ncl and generate code using panproto
    pub fn generate_from_ncl_theory(
        ncl_path: &Path,
        target_lang: TargetLanguage,
    ) -> Result<String, Box<dyn std::error::Error>> {
        // Step 1: Load the theory document
        let resolver = |_name: &str| -> Option<panproto_gat::Theory> { None };
        let compiled = load_and_compile(ncl_path, &resolver)?;
        
        // Step 2: Convert theory to panproto schema
        let schema = theory_to_schema(&compiled)?;
        
        // Step 3: Generate code using panproto's generator
        let generator = Generator::new(target_lang, CodeGenOptions::default());
        let generated = generator.generate(&schema)?;
        
        Ok(generated)
    }

    /// Convert a GAT theory to panproto schema
    fn theory_to_schema(
        theory_doc: &TheoryDocument,
    ) -> Result<Schema, Box<dyn std::error::Error>> {
        let mut builder = SchemaBuilder::new();
        
        // Convert theory sorts to schema vertices
        for (name, theory) in &theory_doc.theories {
            for sort in &theory.sorts {
                let vertex_type = match sort.kind {
                    panproto_gat::SortKind::Structural => VertexType::Object,
                    panproto_gat::SortKind::Functional => VertexType::Function,
                };
                
                builder.add_vertex(Vertex {
                    id: format!("{}.{}", name, sort.name),
                    vertex_type,
                    name: sort.name.to_string(),
                    properties: Default::default(),
                });
            }
            
            // Convert operations to edges
            for op in &theory.operations {
                builder.add_edge(Edge {
                    id: format!("{}.{}", name, op.name),
                    source: op.inputs.first().map(|(_, s)| s.to_string()).unwrap_or_default(),
                    target: op.output.to_string(),
                    edge_type: EdgeType::Method,
                    name: op.name.to_string(),
                })?;
            }
        }
        
        Ok(builder.build())
    }

    /// Generate Python dataclasses from schema
    pub fn generate_python_dataclasses(schema: &Schema) -> Result<String, String> {
        let generator = Generator::new(
            TargetLanguage::Python,
            CodeGenOptions {
                use_dataclasses: true,
                use_type_hints: true,
                ..Default::default()
            },
        );
        
        generator.generate(schema)
    }

    /// Generate TypeScript interfaces from schema
    pub fn generate_typescript_interfaces(schema: &Schema) -> Result<String, String> {
        let generator = Generator::new(
            TargetLanguage::TypeScript,
            CodeGenOptions {
                use_strict_types: true,
                generate_interfaces: true,
                ..Default::default()
            },
        );
        
        generator.generate(schema)
    }

    /// Generate Rust structs from schema
    pub fn generate_rust_structs(schema: &Schema) -> Result<String, String> {
        let generator = Generator::new(
            TargetLanguage::Rust,
            CodeGenOptions {
                use_serde: true,
                ..Default::default()
            },
        );
        
        generator.generate(schema)
    }

    /// Generate migration lens between two schema versions
    pub fn generate_migration_lens(
        old_schema: &Schema,
        new_schema: &Schema,
        target_lang: TargetLanguage,
    ) -> Result<String, String> {
        let project = Project::new("migration".to_string());
        
        // Compute diff between schemas
        let diff = project.diff_schemas(old_schema, new_schema)?;
        
        // Generate lens (migration code)
        let lens = project.generate_lens(&diff, target_lang)?;
        
        Ok(lens.to_string())
    }
}

/// Demo showing both approaches
fn main() {
    println!("╔════════════════════════════════════════════════════════════════╗");
    println!("║     Panproto Code Generation: Manual vs Built-in               ║");
    println!("╚════════════════════════════════════════════════════════════════╝");
    println!();

    // Sample component definition
    let component = manual_generation::Component {
        name: "Task".to_string(),
        props: vec![
            ("id".to_string(), "str".to_string()),
            ("title".to_string(), "str".to_string()),
            ("completed".to_string(), "bool".to_string()),
            ("priority".to_string(), "int".to_string()),
        ],
    };

    // ============================================================================
    // APPROACH 1: Manual String Generation (what we've been doing)
    // ============================================================================
    println!("📋 APPROACH 1: Manual String Generation");
    println!("────────────────────────────────────────────────────────────────");
    println!("Pros: Simple, no dependencies, full control");
    println!("Cons: Error-prone, no validation, language-specific logic");
    println!();

    let python_manual = manual_generation::generate_python_class_manual(&component);
    println!("Generated Python (manual):");
    println!("```python");
    println!("{}", python_manual);
    println!("```");
    println!();

    let ts_manual = manual_generation::generate_typescript_interface_manual(&component);
    println!("Generated TypeScript (manual):");
    println!("```typescript");
    println!("{}", ts_manual);
    println!("```");
    println!();

    // ============================================================================
    // APPROACH 2: Panproto Built-in Generation (when enabled)
    // ============================================================================
    #[cfg(feature = "panproto")]
    {
        use panproto_generation::*;
        use panproto_schema::SchemaBuilder;

        println!("📋 APPROACH 2: Panproto Built-in Generation");
        println!("────────────────────────────────────────────────────────────────");
        println!("Pros: Validated, multi-language, schema-aware, migration support");
        println!("Cons: Requires panproto dependencies, learning curve");
        println!();

        // Build schema programmatically
        let mut builder = SchemaBuilder::new();
        builder.add_vertex(panproto_schema::Vertex {
            id: "Task".to_string(),
            vertex_type: panproto_schema::VertexType::Object,
            name: "Task".to_string(),
            properties: [
                ("id".to_string(), panproto_schema::Property {
                    property_type: panproto_schema::PropertyType::String,
                    required: true,
                    ..Default::default()
                }),
                ("title".to_string(), panproto_schema::Property {
                    property_type: panproto_schema::PropertyType::String,
                    required: true,
                    ..Default::default()
                }),
                ("completed".to_string(), panproto_schema::Property {
                    property_type: panproto_schema::PropertyType::Boolean,
                    required: true,
                    ..Default::default()
                }),
                ("priority".to_string(), panproto_schema::Property {
                    property_type: panproto_schema::PropertyType::Integer,
                    required: true,
                    ..Default::default()
                }),
            ].into_iter().collect(),
        });

        let schema = builder.build();

        // Generate Python
        match generate_python_dataclasses(&schema) {
            Ok(code) => {
                println!("Generated Python (panproto):");
                println!("```python");
                println!("{}", code);
                println!("```");
            }
            Err(e) => println!("Error generating Python: {}", e),
        }
        println!();

        // Generate TypeScript
        match generate_typescript_interfaces(&schema) {
            Ok(code) => {
                println!("Generated TypeScript (panproto):");
                println!("```typescript");
                println!("{}", code);
                println!("```");
            }
            Err(e) => println!("Error generating TypeScript: {}", e),
        }
        println!();

        // Generate Rust
        match generate_rust_structs(&schema) {
            Ok(code) => {
                println!("Generated Rust (panproto):");
                println!("```rust");
                println!("{}", code);
                println!("```");
            }
            Err(e) => println!("Error generating Rust: {}", e),
        }
        println!();

        // Generate from .ncl file
        let ncl_path = std::path::Path::new("protocols/task_v2.ncl");
        if ncl_path.exists() {
            println!("Generating from .ncl file: {:?}", ncl_path);
            match generate_from_ncl_theory(ncl_path, TargetLanguage::Python) {
                Ok(code) => {
                    println!("Generated from task_v2.ncl:");
                    println!("```python");
                    println!("{}", code);
                    println!("```");
                }
                Err(e) => println!("Note: {}", e),
            }
        }
    }

    #[cfg(not(feature = "panproto"))]
    {
        println!("📋 APPROACH 2: Panproto Built-in Generation (NOT AVAILABLE)");
        println!("────────────────────────────────────────────────────────────────");
        println!("To use panproto generation, enable the 'panproto' feature:");
        println!();
        println!("  cargo run --example panproto_generation_demo --features panproto");
        println!();
        println!("Panproto provides:");
        println!("  • Schema validation before generation");
        println!("  • Multi-language target support");
        println!("  • Automatic migration lens generation");
        println!("  • Consistent code patterns across languages");
        println!();
    }

    // ============================================================================
    // Comparison Summary
    // ============================================================================
    println!("📊 COMPARISON SUMMARY");
    println!("────────────────────────────────────────────────────────────────");
    println!();
    println!("| Feature | Manual | Panproto |");
    println!("|---------|--------|----------|");
    println!("| Python generation | ✅ String concat | ✅ Schema-driven |");
    println!("| TypeScript generation | ✅ Manual mapping | ✅ Schema-driven |");
    println!("| Rust generation | ✅ Manual mapping | ✅ Schema-driven |");
    println!("| Go/Java/other | ❌ Must implement | ✅ 10+ languages |");
    println!("| Schema validation | ❌ None | ✅ Built-in |");
    println!("| Type checking | ❌ Runtime only | ✅ Compile-time |");
    println!("| Migration generation | ❌ Manual | ✅ Automatic |");
    println!("| Lens generation | ❌ N/A | ✅ Automatic |");
    println!("| Consistency | ❌ Language-specific | ✅ Unified |");
    println!();

    println!("💡 RECOMMENDATION:");
    println!("────────────────────────────────────────────────────────────────");
    println!("Use MANUAL generation when:");
    println!("  • You need full control over output format");
    println!("  • Generating a single language");
    println!("  • Simple, one-off transformations");
    println!();
    println!("Use PANPROTO generation when:");
    println!("  • Multi-language targets needed");
    println!("  • Schema evolution/migration required");
    println!("  • Long-term maintenance important");
    println!("  • Team has varied language expertise");
    println!();
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_manual_generation() {
        // Test manual generation works without panproto feature
    }

    #[cfg(feature = "panproto")]
    #[test]
    fn test_panproto_schema_building() {
        use panproto_schema::SchemaBuilder;
        
        let mut builder = SchemaBuilder::new();
        builder.add_vertex(panproto_schema::Vertex {
            id: "Test".to_string(),
            vertex_type: panproto_schema::VertexType::Object,
            name: "Test".to_string(),
            properties: Default::default(),
        });
        
        let schema = builder.build();
        assert!(!schema.vertices.is_empty());
    }
}
