//! TypeScript code generator using panproto-parse with position tracking
//!
//! This implementation builds a Schema with text fragments that can be emitted
//! via panproto-parse's official emit_with_protocol.

use super::*;
use panproto_parse::ParserRegistry;
use panproto_schema::{EdgeRule, Protocol, SchemaBuilder};

/// TypeScript code generator that builds position-indexed Schema for emit()
pub struct TypeScriptGenerator {
    routes: Vec<RouteDef>,
    imports: Vec<ImportDef>,
}

#[derive(Debug, Clone)]
struct RouteDef {
    method: String,
    path: String,
    body: Vec<Statement>,
}

#[derive(Debug, Clone)]
struct ImportDef {
    path: String,
    items: Vec<String>,
}

/// Tracks current byte position while building
#[derive(Debug, Clone, Copy)]
struct PositionTracker {
    pos: usize,
}

impl PositionTracker {
    fn new() -> Self {
        Self { pos: 0 }
    }
    
    /// Get current position and advance by bytes
    fn advance(&mut self, bytes: usize) -> usize {
        let current = self.pos;
        self.pos += bytes;
        current
    }
    
    fn current(&self) -> usize {
        self.pos
    }
}

impl TypeScriptGenerator {
    pub fn new() -> Self {
        Self {
            routes: vec![],
            imports: vec![],
        }
    }
}

impl CodeGenerator for TypeScriptGenerator {
    fn route(&mut self, method: &str, path: &str) -> RouteBuilder<'_, Self> {
        RouteBuilder {
            gen: self,
            method: method.to_string(),
            path: path.to_string(),
        }
    }
    
    fn import(&mut self, path: &str, items: &[&str]) -> &mut Self {
        self.imports.push(ImportDef {
            path: path.to_string(),
            items: items.iter().map(|s| s.to_string()).collect(),
        });
        self
    }
    
    /// Build Schema with position data for official emit()
    fn generate(&self) -> Result<String, CodeGenError> {
        let protocol = create_typescript_protocol();
        let mut builder = SchemaBuilder::new(&protocol);
        let mut pos = PositionTracker::new();
        
        // Macro-like helper to add vertex with position
        macro_rules! vtx {
            ($id:expr, $kind:expr, $text:expr) => {{
                let start = pos.current();
                builder = builder.vertex($id, $kind, None)
                    .map_err(|e| CodeGenError(format!("Failed to create {}: {}", $id, e)))?;
                builder = builder.constraint($id, "start-byte", &start.to_string());
                if let Some(t) = $text {
                    builder = builder.constraint($id, "literal-value", t);
                    pos.advance(t.len());
                }
            }};
        }
        
        // Macro-like helper to add edge
        macro_rules! edge {
            ($src:expr, $tgt:expr, $kind:expr) => {{
                builder = builder.edge($src, $tgt, $kind, None)
                    .map_err(|e| CodeGenError(format!("Failed to add edge {}->{}: {}", $src, $tgt, e)))?;
            }};
        }
        
        // Program root (must exist before edges reference it)
        vtx!("program", "program", None);
        
        // Header comment
        vtx!("header", "comment", Some("// Generated via panproto-parse Schema\n\n"));
        
        // Build imports
        let mut prev_stmt: String = "header".to_string();
        for (idx, imp) in self.imports.iter().enumerate() {
            let id = format!("import_{}", idx);
            let text = format!("import {{ {} }} from '{}';\n", 
                imp.items.join(", "), imp.path);
            
            vtx!(&id, "import_statement", Some(&text));
            edge!("program", &id, "statement");
            edge!(&prev_stmt, &id, "next");
            prev_stmt = id;
        }
        
        // Blank line
        if !self.imports.is_empty() && !self.routes.is_empty() {
            let blank_id = "blank".to_string();
            vtx!(&blank_id, "comment", Some("\n"));
            edge!("program", &blank_id, "statement");
            edge!(&prev_stmt, &blank_id, "next");
            prev_stmt = blank_id;
        }
        
        // Build routes
        for (idx, route) in self.routes.iter().enumerate() {
            let id = format!("route_{}", idx);
            let text = generate_route_text(route);
            
            vtx!(&id, "expression_statement", Some(&text));
            edge!("program", &id, "statement");
            edge!(&prev_stmt, &id, "next");
            prev_stmt = id;
        }
        
        // Build and emit
        let schema = builder.build()
            .map_err(|e| CodeGenError(format!("Failed to build schema: {}", e)))?;
        
        let registry = ParserRegistry::new();
        if registry.protocol_names().any(|p| p == "typescript") {
            match registry.emit_with_protocol("typescript", &schema) {
                Ok(bytes) => String::from_utf8(bytes)
                    .map_err(|e| CodeGenError(format!("UTF-8 error: {}", e))),
                Err(e) => {
                    eprintln!("Official emit failed (using manual): {}", e);
                    Ok(manual_emit(&schema))
                }
            }
        } else {
            Ok(manual_emit(&schema))
        }
    }
}

/// Generate the actual text for a route
fn generate_route_text(route: &RouteDef) -> String {
    let mut text = String::new();
    
    // app.METHOD('path', (c) => {
    text.push_str(&format!("app.{}('{}', (c) => {{\n", 
        route.method.to_lowercase(), 
        route.path));
    
    // Body
    for stmt in &route.body {
        match stmt {
            Statement::Return(expr) => {
                text.push_str("  return ");
                text.push_str(&expr_to_string(expr));
                text.push_str(";\n");
            }
            _ => {}
        }
    }
    
    // });
    text.push_str("});\n");
    
    text
}

/// Convert expression to string
fn expr_to_string(expr: &Expression) -> String {
    match expr {
        Expression::Object(pairs) => {
            let mut s = String::new();
            s.push_str("{ ");
            for (i, (k, v)) in pairs.iter().enumerate() {
                s.push_str(&format!("{}: {}", k, expr_to_string(v)));
                if i < pairs.len() - 1 {
                    s.push_str(", ");
                }
            }
            s.push_str(" }");
            s
        }
        Expression::String(s) => format!("'{}'", s),
        Expression::Number(n) => n.to_string(),
        Expression::Ident(name) => name.clone(),
        _ => "null".to_string(),
    }
}

/// Manual emit - collects literal values and interstitials by position
fn manual_emit(schema: &panproto_schema::Schema) -> String {
    let mut fragments: Vec<(usize, String)> = vec![];
    
    // Collect all text fragments with positions
    for (_vertex_id, constraints) in &schema.constraints {
        // Get start byte
        let start = constraints.iter()
            .find(|c| c.sort.as_ref() == "start-byte")
            .and_then(|c| c.value.parse::<usize>().ok())
            .unwrap_or(0);
        
        // Get literal value
        if let Some(lit) = constraints.iter()
            .find(|c| c.sort.as_ref() == "literal-value") {
            fragments.push((start, lit.value.clone()));
        }
        
        // Get interstitials
        for c in constraints {
            let sort = c.sort.as_ref();
            if sort.starts_with("interstitial-") && !sort.ends_with("-start-byte") {
                let pos_sort = format!("{}-start-byte", sort);
                if let Some(pos) = constraints.iter()
                    .find(|c2| c2.sort.as_ref() == pos_sort)
                    .and_then(|c2| c2.value.parse::<usize>().ok()) {
                    fragments.push((pos, c.value.clone()));
                }
            }
        }
    }
    
    // Sort and concatenate
    fragments.sort_by_key(|(pos, _)| *pos);
    
    let mut output = String::new();
    let mut cursor = 0;
    for (pos, text) in fragments {
        // Only add if position is valid
        if pos >= cursor {
            output.push_str(&text);
            cursor = pos + text.len();
        }
    }
    
    if output.is_empty() {
        output.push_str("// No fragments found in schema\n");
    }
    
    output
}

/// Create protocol with all needed kinds and rules
fn create_typescript_protocol() -> Protocol {
    Protocol {
        name: "typescript-codegen".to_string(),
        schema_theory: "ThTypeScriptFullAST".to_string(),
        instance_theory: "ThTypeScriptInstance".to_string(),
        schema_composition: None,
        instance_composition: None,
        obj_kinds: vec![
            "program".to_string(),
            "comment".to_string(),
            "import_statement".to_string(),
            "expression_statement".to_string(),
            "call_expression".to_string(),
            "member_expression".to_string(),
            "identifier".to_string(),
            "property_identifier".to_string(),
            "string".to_string(),
            "number".to_string(),
            "arrow_function".to_string(),
            "statement_block".to_string(),
            "return_statement".to_string(),
            "object".to_string(),
            "pair".to_string(),
        ],
        edge_rules: vec![
            EdgeRule {
                edge_kind: "statement".to_string(),
                src_kinds: vec!["program".to_string()],
                tgt_kinds: vec![
                    "comment".to_string(),
                    "import_statement".to_string(), 
                    "expression_statement".to_string(),
                ],
            },
            EdgeRule {
                edge_kind: "next".to_string(),
                src_kinds: vec![
                    "comment".to_string(),
                    "import_statement".to_string(), 
                    "expression_statement".to_string(),
                ],
                tgt_kinds: vec![
                    "comment".to_string(),
                    "import_statement".to_string(), 
                    "expression_statement".to_string(),
                ],
            },
            EdgeRule {
                edge_kind: "expression".to_string(),
                src_kinds: vec!["expression_statement".to_string(), "return_statement".to_string()],
                tgt_kinds: vec![
                    "call_expression".to_string(),
                    "arrow_function".to_string(),
                    "object".to_string(),
                    "identifier".to_string(),
                    "string".to_string(),
                    "number".to_string(),
                ],
            },
        ],
        constraint_sorts: vec![
            "literal-value".to_string(),
            "start-byte".to_string(),
            "end-byte".to_string(),
            "interstitial-0".to_string(),
            "interstitial-1".to_string(),
            "interstitial-2".to_string(),
            "interstitial-3".to_string(),
            "interstitial-4".to_string(),
            "interstitial-0-start-byte".to_string(),
            "interstitial-1-start-byte".to_string(),
            "interstitial-2-start-byte".to_string(),
            "interstitial-3-start-byte".to_string(),
            "interstitial-4-start-byte".to_string(),
        ],
        has_order: true,
        ..Default::default()
    }
}

// RouteBuilder implementations
impl<'a> RouteBuilder<'a, TypeScriptGenerator> {
    pub fn with_handler<F>(self, f: F) -> &'a mut TypeScriptGenerator
    where 
        F: Fn(&mut Handler)
    {
        let mut handler = Handler { stmts: vec![] };
        f(&mut handler);
        
        self.gen.routes.push(RouteDef {
            method: self.method,
            path: self.path,
            body: handler.stmts,
        });
        
        self.gen
    }
    
    pub fn returns_json(self, obj: Vec<(&str, Expression)>) -> &'a mut TypeScriptGenerator {
        let body = vec![Statement::Return(Expression::Object(
            obj.into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect()
        ))];
        
        self.gen.routes.push(RouteDef {
            method: self.method,
            path: self.path,
            body,
        });
        
        self.gen
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_typescript_codegen() {
        let mut gen = TypeScriptGenerator::new();
        
        gen.import("hono", &["Hono"])
           .route("GET", "/health")
           .returns_json(vec![
               ("status", Expression::String("ok".to_string())),
           ]);
        
        let code = gen.generate().unwrap();
        println!("Generated TypeScript:\n{}", code);
        
        assert!(code.contains("// Generated via panproto-parse Schema"));
        assert!(code.contains("import { Hono } from 'hono';"));
        assert!(code.contains("app.get('/health'"));
        assert!(code.contains("status: 'ok'"));
    }
    
    #[test]
    fn test_with_handler_closure() {
        let mut gen = TypeScriptGenerator::new();
        
        gen.route("GET", "/api/users")
           .with_handler(|h| {
               h.return_json(vec![
                   ("route", Expression::String("/api/users".to_string())),
                   ("handler", Expression::String("listUsers".to_string())),
               ]);
           });
        
        let code = gen.generate().unwrap();
        println!("Generated with closure:\n{}", code);
        
        assert!(code.contains("app.get('/api/users'"));
        assert!(code.contains("route: '/api/users'"));
    }
}
