//! Bundle code generation helpers using panproto-parse emit_with_protocol
//!
//! Provides utilities for building position-tracked Schemas and emitting code
//! via the official panproto-parse emitters.

use panproto_parse::ParserRegistry;
use panproto_schema::{EdgeRule, Protocol, Schema, SchemaBuilder};
use crate::pipeline::bundle_stack::{BundleConfig, RouteConfig};

/// Position tracker for schema building
#[derive(Debug, Clone, Copy)]
pub struct Position {
    pos: usize,
}

impl Position {
    pub fn new() -> Self {
        Self { pos: 0 }
    }
    
    /// Get current position and advance
    pub fn advance(&mut self, bytes: usize) -> usize {
        let current = self.pos;
        self.pos += bytes;
        current
    }
    
    pub fn current(&self) -> usize {
        self.pos
    }
}

/// Builder for creating position-tracked schemas
pub struct EmitBuilder {
    builder: SchemaBuilder,
    pos: Position,
    protocol_name: String,
}

impl EmitBuilder {
    /// Create new builder for a protocol
    pub fn new(protocol: &Protocol, protocol_name: &str) -> Self {
        Self {
            builder: SchemaBuilder::new(protocol),
            pos: Position::new(),
            protocol_name: protocol_name.to_string(),
        }
    }
    
    /// Add a vertex with position and optional literal text
    pub fn vertex(
        mut self,
        id: &str,
        kind: &str,
        text: Option<&str>,
    ) -> Result<Self, String> {
        let start = self.pos.current();
        
        self.builder = self.builder.vertex(id, kind, None)
            .map_err(|e| format!("Failed to create vertex {}: {}", id, e))?;
        
        self.builder = self.builder.constraint(id, "start-byte", &start.to_string());
        
        if let Some(t) = text {
            self.builder = self.builder.constraint(id, "literal-value", t);
            self.pos.advance(t.len());
        }
        
        Ok(self)
    }
    
    /// Add an edge between vertices
    pub fn edge(
        mut self,
        src: &str,
        tgt: &str,
        kind: &str,
    ) -> Result<Self, String> {
        self.builder = self.builder.edge(src, tgt, kind, None)
            .map_err(|e| format!("Failed to add edge {}->{}: {}", src, tgt, e))?;
        Ok(self)
    }
    
    /// Build the schema
    pub fn build(self) -> Result<Schema, String> {
        self.builder.build()
            .map_err(|e| format!("Failed to build schema: {}", e))
    }
}

/// Emit schema using a protocol
pub fn emit_schema(schema: &Schema, protocol_name: &str) -> Result<String, String> {
    let registry = ParserRegistry::new();
    
    if registry.protocol_names().any(|p| p == protocol_name) {
        match registry.emit_with_protocol(protocol_name, schema) {
            Ok(bytes) => String::from_utf8(bytes)
                .map_err(|e| format!("UTF-8 error: {}", e)),
            Err(e) => {
                eprintln!("emit_with_protocol failed (using manual): {}", e);
                Ok(manual_emit(schema))
            }
        }
    } else {
        Ok(manual_emit(schema))
    }
}

/// Manual emit fallback - collects fragments by position
fn manual_emit(schema: &Schema) -> String {
    let mut fragments: Vec<(usize, String)> = vec![];
    
    for (_vertex_id, constraints) in &schema.constraints {
        let start = constraints.iter()
            .find(|c| c.sort.as_ref() == "start-byte")
            .and_then(|c| c.value.parse::<usize>().ok())
            .unwrap_or(0);
        
        if let Some(lit) = constraints.iter()
            .find(|c| c.sort.as_ref() == "literal-value") {
            fragments.push((start, lit.value.clone()));
        }
    }
    
    fragments.sort_by_key(|(pos, _)| *pos);
    fragments.into_iter().map(|(_, text)| text).collect()
}

/// Create standard protocol for a language
pub fn create_protocol(
    name: &str,
    obj_kinds: Vec<String>,
    edge_rules: Vec<EdgeRule>,
) -> Protocol {
    let mut constraint_sorts = vec![
        "literal-value".to_string(),
        "start-byte".to_string(),
        "end-byte".to_string(),
    ];
    
    // Add interstitial constraints
    for i in 0..10 {
        constraint_sorts.push(format!("interstitial-{}", i));
        constraint_sorts.push(format!("interstitial-{}-start-byte", i));
    }
    
    Protocol {
        name: format!("{}-codegen", name),
        schema_theory: format!("Th{}FullAST", capitalize(name)),
        instance_theory: format!("Th{}Instance", capitalize(name)),
        schema_composition: None,
        instance_composition: None,
        obj_kinds,
        edge_rules,
        constraint_sorts,
        has_order: true,
        ..Default::default()
    }
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    chars.next().map_or_else(String::new, |c| {
        c.to_uppercase().collect::<String>() + chars.as_str()
    })
}

/// Standard statement edge rules
pub fn statement_rules() -> Vec<EdgeRule> {
    let statement_kinds = vec![
        "comment".to_string(),
        "import_statement".to_string(),
        "expression_statement".to_string(),
        "variable_declaration".to_string(),
        "function_definition".to_string(),
        "class_definition".to_string(),
        "decorated_definition".to_string(),
    ];
    
    vec![
        EdgeRule {
            edge_kind: "statement".to_string(),
            src_kinds: vec!["program".to_string()],
            tgt_kinds: statement_kinds.clone(),
        },
        EdgeRule {
            edge_kind: "next".to_string(),
            src_kinds: statement_kinds.clone(),
            tgt_kinds: statement_kinds.clone(),
        },
    ]
}

/// Generate code for a bundle using emit_with_protocol
/// 
/// This is the main entry point for bundle code generation.
/// It builds a position-tracked schema and emits via the official emitter.
pub fn generate_with_emit(
    config: &BundleConfig,
    protocol_name: &str,
    build_fn: impl Fn(&BundleConfig, &mut Position, &mut SchemaBuilder) -> Result<(), String>,
) -> Result<String, String> {
    let obj_kinds = vec![
        "program".to_string(),
        "comment".to_string(),
        "import_statement".to_string(),
        "expression_statement".to_string(),
        "function_definition".to_string(),
    ];
    
    let protocol = create_protocol(protocol_name, obj_kinds, statement_rules());
    let mut builder = SchemaBuilder::new(&protocol);
    let mut pos = Position::new();
    
    // Build program root
    let start = pos.advance(0);
    builder = builder.vertex("program", "program", None)
        .map_err(|e| format!("Failed to create program: {}", e))?;
    builder = builder.constraint("program", "start-byte", &start.to_string());
    
    // Call the language-specific build function
    build_fn(config, &mut pos, &mut builder)?;
    
    // Build and emit
    let schema = builder.build()
        .map_err(|e| format!("Failed to build schema: {}", e))?;
    
    let registry = ParserRegistry::new();
    if registry.protocol_names().any(|p| p == protocol_name) {
        match registry.emit_with_protocol(protocol_name, &schema) {
            Ok(bytes) => String::from_utf8(bytes)
                .map_err(|e| format!("UTF-8 error: {}", e)),
            Err(e) => {
                eprintln!("emit_with_protocol failed (using manual): {}", e);
                Ok(manual_emit(&schema))
            }
        }
    } else {
        Ok(manual_emit(&schema))
    }
}

/// Helper to build route text for various languages
pub fn build_route_code(route: &RouteConfig, lang: &str) -> String {
    match lang {
        "python" => format!(
            "@app.route('{}', methods=['{}'])\ndef {}():\n    return jsonify({{}})\n",
            route.path,
            route.method,
            route.handler_name()
        ),
        "javascript" | "typescript" => format!(
            "app.{}('{}', (req, res) => {{\n  res.json({{}});\n}});\n",
            route.method.to_lowercase(),
            route.path
        ),
        _ => format!("// Route: {} {}\n", route.method, route.path),
    }
}

trait RouteConfigExt {
    fn handler_name(&self) -> String;
}

impl RouteConfigExt for RouteConfig {
    fn handler_name(&self) -> String {
        self.path.trim_start_matches('/')
            .replace(['/', '-'], "_")
            .to_lowercase()
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_available_protocols() {
        let registry = ParserRegistry::new();
        let protocols: Vec<_> = registry.protocol_names().collect();
        
        println!("Available protocols: {:?}", protocols);
        
        // Check that our bundles' protocols are available
        assert!(protocols.contains(&"typescript"), "typescript protocol should be available");
        assert!(protocols.contains(&"python"), "python protocol should be available");
        
        // Note: javascript protocol may or may not be available depending on features
        // If it's not available, emit_schema will fall back to manual_emit
        if protocols.contains(&"javascript") {
            println!("JavaScript protocol is available");
        } else {
            println!("JavaScript protocol NOT available - will use manual fallback");
        }
    }

    #[test]
    fn test_typescript_emit() {
        let obj_kinds = vec![
            "program".to_string(),
            "import_statement".to_string(),
            "expression_statement".to_string(),
        ];
        
        let protocol = create_protocol("typescript", obj_kinds, statement_rules());
        let mut builder = EmitBuilder::new(&protocol, "typescript");
        
        builder = builder.vertex("import", "import_statement", Some("import { Hono } from 'hono';\n")).unwrap();
        
        let schema = builder.build().unwrap();
        let result = emit_schema(&schema, "typescript").unwrap();
        
        println!("TypeScript emit result:\n{}", result);
        assert!(result.contains("import"));
        assert!(result.contains("Hono"));
    }

    #[test]
    fn test_python_emit() {
        let obj_kinds = vec![
            "program".to_string(),
            "import_statement".to_string(),
            "function_definition".to_string(),
        ];
        
        let protocol = create_protocol("python", obj_kinds, statement_rules());
        let mut builder = EmitBuilder::new(&protocol, "python");
        
        builder = builder.vertex("import", "import_statement", Some("from flask import Flask\n")).unwrap();
        
        let schema = builder.build().unwrap();
        let result = emit_schema(&schema, "python").unwrap();
        
        println!("Python emit result:\n{}", result);
        assert!(result.contains("from flask") || result.contains("import"));
    }
}
