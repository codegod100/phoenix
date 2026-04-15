//! TypeScript code generator using panproto-parse
//!
//! This implementation builds a full panproto Schema and uses emit() for code generation.
//!
//! NOTE: SchemaBuilder has a consuming API - methods take ownership and return ownership.
//! This requires careful chaining or reassigning the builder at each step.

use super::*;
use panproto_parse::ParserRegistry;
use panproto_schema::{EdgeRule, Protocol, SchemaBuilder};
use panproto_gat::Name;

/// TypeScript code generator that builds a full AST Schema
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
    
    /// Build full Schema and emit using panproto-parse
    fn generate(&self) -> Result<String, CodeGenError> {
        // Create the TypeScript protocol
        let protocol = create_typescript_protocol();
        
        // Start building the Schema
        let mut builder = SchemaBuilder::new(&protocol);
        
        // Create program root vertex
        let program_id = "program";
        builder = builder.vertex(program_id, "program", None)
            .map_err(|e| CodeGenError(format!("Failed to create program: {}", e)))?;
        
        // Build all vertices and edges, tracking the builder state
        let mut vertex_ids: Vec<String> = vec![];
        
        // Add imports
        for imp in &self.imports {
            let (id, b) = build_import(builder, imp)?;
            builder = b;
            vertex_ids.push(id);
        }
        
        // Add blank line if needed
        if !self.imports.is_empty() && !self.routes.is_empty() {
            let blank_id = "blank";
            builder = builder.vertex(blank_id, "comment", None)
                .map_err(|e| CodeGenError(format!("Failed to create blank: {}", e)))?;
            builder = builder.constraint(blank_id, "content", "");
            vertex_ids.push(blank_id.to_string());
        }
        
        // Add routes
        for (idx, route) in self.routes.iter().enumerate() {
            let route_id = format!("route_{}", idx);
            let (id, b) = build_route(builder, &route_id, route)?;
            builder = b;
            vertex_ids.push(id);
        }
        
        // Link vertices in sequence
        if !vertex_ids.is_empty() {
            // First vertex connects to program
            builder = builder.edge(program_id, &vertex_ids[0], "statement", None)
                .map_err(|e| CodeGenError(format!("Failed to link first: {}", e)))?;
            
            // Rest connect via next edges
            for i in 0..vertex_ids.len() - 1 {
                builder = builder.edge(&vertex_ids[i], &vertex_ids[i + 1], "next", None)
                    .map_err(|e| CodeGenError(format!("Failed to link {}->{}: {}", i, i+1, e)))?;
            }
        }
        
        // Build the schema
        let schema = builder.build()
            .map_err(|e| CodeGenError(format!("Failed to build schema: {}", e)))?;
        
        // Emit using panproto-parse or fallback
        let registry = ParserRegistry::new();
        
        if registry.protocol_names().any(|p| p == "typescript") {
            match registry.emit_with_protocol("typescript", &schema) {
                Ok(bytes) => String::from_utf8(bytes)
                    .map_err(|e| CodeGenError(format!("UTF-8 error: {}", e))),
                Err(_) => Ok(manual_emit(&schema)),
            }
        } else {
            Ok(manual_emit(&schema))
        }
    }
}

/// Build an import statement, returning (vertex_id, builder)
fn build_import(
    mut b: SchemaBuilder,
    imp: &ImportDef,
) -> Result<(String, SchemaBuilder), CodeGenError> {
    let id = format!("import_{}", imp.path.replace(['/', '-', '.'], "_"));
    
    b = b.vertex(&id, "import_statement", None)
        .map_err(|e| CodeGenError(format!("Failed to create import: {}", e)))?;
    b = b.constraint(&id, "source", &imp.path);
    b = b.constraint(&id, "items", &imp.items.join(","));
    
    Ok((id, b))
}

/// Build a route statement, returning (vertex_id, builder)
fn build_route(
    mut b: SchemaBuilder,
    stmt_id: &str,
    route: &RouteDef,
) -> Result<(String, SchemaBuilder), CodeGenError> {
    // expression_statement
    b = b.vertex(stmt_id, "expression_statement", None)
        .map_err(|e| CodeGenError(format!("Failed to create route stmt: {}", e)))?;
    
    // call_expression: app.METHOD('path', (c) => { ... })
    let call_id = format!("{}_call", stmt_id);
    b = b.vertex(&call_id, "call_expression", None)
        .map_err(|e| CodeGenError(format!("Failed to create call: {}", e)))?;
    b = b.edge(stmt_id, &call_id, "expression", None)
        .map_err(|e| CodeGenError(format!("Failed to link call: {}", e)))?;
    
    // member_expression: app.METHOD
    let member_id = format!("{}_member", stmt_id);
    b = b.vertex(&member_id, "member_expression", None)
        .map_err(|e| CodeGenError(format!("Failed to create member: {}", e)))?;
    b = b.edge(&call_id, &member_id, "function", None)
        .map_err(|e| CodeGenError(format!("Failed to link member: {}", e)))?;
    
    // identifier: app
    let app_id = format!("{}_app", stmt_id);
    b = b.vertex(&app_id, "identifier", None)
        .map_err(|e| CodeGenError(format!("Failed to create app: {}", e)))?;
    b = b.constraint(&app_id, "name", "app");
    b = b.edge(&member_id, &app_id, "object", None)
        .map_err(|e| CodeGenError(format!("Failed to link app: {}", e)))?;
    
    // property_identifier: METHOD
    let method_id = format!("{}_method", stmt_id);
    b = b.vertex(&method_id, "property_identifier", None)
        .map_err(|e| CodeGenError(format!("Failed to create method: {}", e)))?;
    b = b.constraint(&method_id, "name", &route.method.to_lowercase());
    b = b.edge(&member_id, &method_id, "property", None)
        .map_err(|e| CodeGenError(format!("Failed to link method: {}", e)))?;
    
    // string argument: 'path'
    let path_id = format!("{}_path", stmt_id);
    b = b.vertex(&path_id, "string", None)
        .map_err(|e| CodeGenError(format!("Failed to create path: {}", e)))?;
    b = b.constraint(&path_id, "value", &route.path);
    b = b.edge(&call_id, &path_id, "arguments", None)
        .map_err(|e| CodeGenError(format!("Failed to link path: {}", e)))?;
    
    // arrow function: (c) => { ... }
    let arrow_id = format!("{}_arrow", stmt_id);
    b = b.vertex(&arrow_id, "arrow_function", None)
        .map_err(|e| CodeGenError(format!("Failed to create arrow: {}", e)))?;
    b = b.edge(&call_id, &arrow_id, "arguments", None)
        .map_err(|e| CodeGenError(format!("Failed to link arrow: {}", e)))?;
    
    // parameter: c
    let param_id = format!("{}_param", stmt_id);
    b = b.vertex(&param_id, "identifier", None)
        .map_err(|e| CodeGenError(format!("Failed to create param: {}", e)))?;
    b = b.constraint(&param_id, "name", "c");
    b = b.edge(&arrow_id, &param_id, "parameters", None)
        .map_err(|e| CodeGenError(format!("Failed to link param: {}", e)))?;
    
    // statement_block: { ... }
    let block_id = format!("{}_block", stmt_id);
    b = b.vertex(&block_id, "statement_block", None)
        .map_err(|e| CodeGenError(format!("Failed to create block: {}", e)))?;
    b = b.edge(&arrow_id, &block_id, "body", None)
        .map_err(|e| CodeGenError(format!("Failed to link block: {}", e)))?;
    
    // Add statements
    let mut stmt_ids: Vec<String> = vec![];
    for (idx, stmt) in route.body.iter().enumerate() {
        let stmt_id = format!("{}_stmt_{}", block_id, idx);
        let (id, builder) = build_statement(b, &stmt_id, stmt)?;
        b = builder;
        stmt_ids.push(id);
    }
    
    // Link statements within block
    if !stmt_ids.is_empty() {
        b = b.edge(&block_id, &stmt_ids[0], "statement", None)
            .map_err(|e| CodeGenError(format!("Failed to link first stmt: {}", e)))?;
        
        for i in 0..stmt_ids.len() - 1 {
            b = b.edge(&stmt_ids[i], &stmt_ids[i + 1], "next", None)
                .map_err(|e| CodeGenError(format!("Failed to link stmts: {}", e)))?;
        }
    }
    
    Ok((stmt_id.to_string(), b))
}

/// Build a statement, returning (vertex_id, builder)
fn build_statement(
    mut b: SchemaBuilder,
    stmt_id: &str,
    stmt: &Statement,
) -> Result<(String, SchemaBuilder), CodeGenError> {
    match stmt {
        Statement::Return(expr) => {
            b = b.vertex(stmt_id, "return_statement", None)
                .map_err(|e| CodeGenError(format!("Failed to create return: {}", e)))?;
            
            let expr_id = format!("{}_expr", stmt_id);
            let (expr_id_ret, builder) = build_expression(b, &expr_id, expr)?;
            b = builder;
            b = b.edge(stmt_id, &expr_id_ret, "expression", None)
                .map_err(|e| CodeGenError(format!("Failed to link return: {}", e)))?;
        }
        _ => {
            // For now, just create empty statement for other types
            b = b.vertex(stmt_id, "expression_statement", None)
                .map_err(|e| CodeGenError(format!("Failed to create stmt: {}", e)))?;
        }
    }
    
    Ok((stmt_id.to_string(), b))
}

/// Build an expression, returning (vertex_id, builder)
fn build_expression(
    mut b: SchemaBuilder,
    expr_id: &str,
    expr: &Expression,
) -> Result<(String, SchemaBuilder), CodeGenError> {
    match expr {
        Expression::Ident(name) => {
            b = b.vertex(expr_id, "identifier", None)
                .map_err(|e| CodeGenError(format!("Failed to create ident: {}", e)))?;
            b = b.constraint(expr_id, "name", name);
        }
        Expression::String(s) => {
            b = b.vertex(expr_id, "string", None)
                .map_err(|e| CodeGenError(format!("Failed to create string: {}", e)))?;
            b = b.constraint(expr_id, "value", s);
        }
        Expression::Number(n) => {
            b = b.vertex(expr_id, "number", None)
                .map_err(|e| CodeGenError(format!("Failed to create number: {}", e)))?;
            b = b.constraint(expr_id, "value", &n.to_string());
        }
        Expression::Bool(true) => {
            b = b.vertex(expr_id, "true", None)
                .map_err(|e| CodeGenError(format!("Failed to create true: {}", e)))?;
        }
        Expression::Bool(false) => {
            b = b.vertex(expr_id, "false", None)
                .map_err(|e| CodeGenError(format!("Failed to create false: {}", e)))?;
        }
        Expression::Object(pairs) => {
            b = b.vertex(expr_id, "object", None)
                .map_err(|e| CodeGenError(format!("Failed to create object: {}", e)))?;
            
            for (idx, (key, val)) in pairs.iter().enumerate() {
                let pair_id = format!("{}_pair_{}", expr_id, idx);
                b = b.vertex(&pair_id, "pair", None)
                    .map_err(|e| CodeGenError(format!("Failed to create pair: {}", e)))?;
                b = b.edge(expr_id, &pair_id, "pair", None)
                    .map_err(|e| CodeGenError(format!("Failed to link pair: {}", e)))?;
                
                let key_id = format!("{}_key_{}", expr_id, idx);
                b = b.vertex(&key_id, "property_identifier", None)
                    .map_err(|e| CodeGenError(format!("Failed to create key: {}", e)))?;
                b = b.constraint(&key_id, "name", key);
                b = b.edge(&pair_id, &key_id, "key", None)
                    .map_err(|e| CodeGenError(format!("Failed to link key: {}", e)))?;
                
                let val_id = format!("{}_val_{}", expr_id, idx);
                let (val_id_ret, builder) = build_expression(b, &val_id, val)?;
                b = builder;
                b = b.edge(&pair_id, &val_id_ret, "value", None)
                    .map_err(|e| CodeGenError(format!("Failed to link value: {}", e)))?;
            }
        }
        Expression::Member(obj, prop) => {
            b = b.vertex(expr_id, "member_expression", None)
                .map_err(|e| CodeGenError(format!("Failed to create member: {}", e)))?;
            
            let obj_id = format!("{}_obj", expr_id);
            let (obj_id_ret, builder) = build_expression(b, &obj_id, obj)?;
            b = builder;
            b = b.edge(expr_id, &obj_id_ret, "object", None)
                .map_err(|e| CodeGenError(format!("Failed to link member obj: {}", e)))?;
            
            let prop_id = format!("{}_prop", expr_id);
            b = b.vertex(&prop_id, "property_identifier", None)
                .map_err(|e| CodeGenError(format!("Failed to create prop: {}", e)))?;
            b = b.constraint(&prop_id, "name", prop);
            b = b.edge(expr_id, &prop_id, "property", None)
                .map_err(|e| CodeGenError(format!("Failed to link prop: {}", e)))?;
        }
        Expression::Call(func, args) => {
            b = b.vertex(expr_id, "call_expression", None)
                .map_err(|e| CodeGenError(format!("Failed to create call: {}", e)))?;
            
            let func_id = format!("{}_func", expr_id);
            let (func_id_ret, builder) = build_expression(b, &func_id, func)?;
            b = builder;
            b = b.edge(expr_id, &func_id_ret, "function", None)
                .map_err(|e| CodeGenError(format!("Failed to link call func: {}", e)))?;
            
            for (idx, arg) in args.iter().enumerate() {
                let arg_id = format!("{}_arg_{}", expr_id, idx);
                let (arg_id_ret, builder) = build_expression(b, &arg_id, arg)?;
                b = builder;
                b = b.edge(expr_id, &arg_id_ret, "arguments", None)
                    .map_err(|e| CodeGenError(format!("Failed to link arg: {}", e)))?;
            }
        }
        Expression::Arrow(_params, _body) => {
            // Simplified - just create placeholder
            b = b.vertex(expr_id, "arrow_function", None)
                .map_err(|e| CodeGenError(format!("Failed to create arrow: {}", e)))?;
        }
    }
    
    Ok((expr_id.to_string(), b))
}

/// Manual emit when panproto emit is not available
fn manual_emit(schema: &panproto_schema::Schema) -> String {
    let mut output = String::new();
    output.push_str("// Generated via panproto-parse Schema (manual emit)\n\n");
    
    // Find program vertex and emit statements
    for (name, vertex) in &schema.vertices {
        if vertex.kind.as_ref() == "program" {
            let mut stmts: Vec<(String, String)> = vec![];
            
            // Collect all directly connected statements
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == name.as_ref() && edge.kind.as_ref() == "statement" {
                    if let Some(target) = schema.vertices.get(&edge.tgt) {
                        let content = emit_vertex(schema, target);
                        stmts.push((edge.tgt.to_string(), content));
                    }
                }
            }
            
            // Follow next edges from those statements
            let mut all_stmts = stmts.clone();
            let mut to_process: Vec<String> = stmts.iter().map(|(id, _)| id.clone()).collect();
            let mut processed: std::collections::HashSet<String> = to_process.iter().cloned().collect();
            
            while let Some(current_id) = to_process.pop() {
                for (edge, _) in &schema.edges {
                    if edge.src.as_ref() == current_id.as_str() && edge.kind.as_ref() == "next" {
                        let target_id = edge.tgt.to_string();
                        if !processed.contains(&target_id) {
                            if let Some(target) = schema.vertices.get(&edge.tgt) {
                                let content = emit_vertex(schema, target);
                                all_stmts.push((target_id.clone(), content));
                                to_process.push(target_id.clone());
                                processed.insert(target_id);
                            }
                        }
                    }
                }
            }
            
            // Output all non-empty statements
            for (_, content) in all_stmts {
                if !content.is_empty() {
                    output.push_str(&content);
                }
            }
        }
    }
    
    // If we didn't generate anything useful, show debug info
    if output.lines().filter(|l| !l.starts_with("//")).count() == 0 {
        output.push_str("// Debug - Schema structure:\n");
        output.push_str(&format!("// Vertices: {}\n", schema.vertices.len()));
        for (id, v) in &schema.vertices {
            output.push_str(&format!("//   {}: {}\n", id, v.kind));
        }
    }
    
    output
}

/// Emit a single vertex to string
fn emit_vertex(schema: &panproto_schema::Schema, vertex: &panproto_schema::Vertex) -> String {
    match vertex.kind.as_ref() {
        "import_statement" => {
            let source = get_constraint(schema, &vertex.id, "source").unwrap_or_else(|| "unknown".to_string());
            let items_str = get_constraint(schema, &vertex.id, "items").unwrap_or_default();
            let items: Vec<&str> = items_str.split(',').collect();
            format!("import {{ {items} }} from '{source}';\n", 
                items = items.join(", "),
                source = source
            )
        }
        "expression_statement" => {
            // Find the expression
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() && edge.kind.as_ref() == "expression" {
                    if let Some(target) = schema.vertices.get(&edge.tgt) {
                        return emit_vertex(schema, target);
                    }
                }
            }
            String::new()
        }
        "call_expression" => {
            let mut func_str = String::new();
            let mut args: Vec<String> = vec![];
            
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() {
                    match edge.kind.as_ref() {
                        "function" => {
                            if let Some(target) = schema.vertices.get(&edge.tgt) {
                                func_str = emit_vertex(schema, target);
                            }
                        }
                        "arguments" => {
                            if let Some(target) = schema.vertices.get(&edge.tgt) {
                                args.push(emit_vertex(schema, target));
                            }
                        }
                        _ => {}
                    }
                }
            }
            
            format!("{}({});\n", func_str, args.join(", "))
        }
        "member_expression" => {
            let mut obj_str = String::new();
            let mut prop_str = String::new();
            
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() {
                    match edge.kind.as_ref() {
                        "object" => {
                            if let Some(target) = schema.vertices.get(&edge.tgt) {
                                obj_str = emit_vertex(schema, target);
                            }
                        }
                        "property" => {
                            if let Some(target) = schema.vertices.get(&edge.tgt) {
                                prop_str = get_constraint(schema, &target.id, "name")
                                    .unwrap_or_else(|| target.id.to_string());
                            }
                        }
                        _ => {}
                    }
                }
            }
            
            format!("{}.{}", obj_str, prop_str)
        }
        "identifier" => {
            get_constraint(schema, &vertex.id, "name")
                .unwrap_or_else(|| "id".to_string())
        }
        "property_identifier" => {
            get_constraint(schema, &vertex.id, "name")
                .unwrap_or_else(|| "prop".to_string())
        }
        "string" => {
            let val = get_constraint(schema, &vertex.id, "value")
                .unwrap_or_default();
            format!("'{}'", val)
        }
        "number" => {
            get_constraint(schema, &vertex.id, "value")
                .unwrap_or_else(|| "0".to_string())
        }
        "object" => {
            let mut pairs: Vec<String> = vec![];
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() && edge.kind.as_ref() == "pair" {
                    if let Some(target) = schema.vertices.get(&edge.tgt) {
                        let mut key_str = String::new();
                        let mut val_str = String::new();
                        
                        for (pair_edge, _) in &schema.edges {
                            if pair_edge.src.as_ref() == target.id.as_ref() {
                                match pair_edge.kind.as_ref() {
                                    "key" => {
                                        if let Some(k) = schema.vertices.get(&pair_edge.tgt) {
                                            key_str = get_constraint(schema, &k.id, "name")
                                                .unwrap_or_else(|| "key".to_string());
                                        }
                                    }
                                    "value" => {
                                        if let Some(v) = schema.vertices.get(&pair_edge.tgt) {
                                            val_str = emit_vertex(schema, v);
                                        }
                                    }
                                    _ => {}
                                }
                            }
                        }
                        
                        pairs.push(format!("{}: {}", key_str, val_str));
                    }
                }
            }
            
            format!("{{ {} }}", pairs.join(", "))
        }
        "return_statement" => {
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() && edge.kind.as_ref() == "expression" {
                    if let Some(target) = schema.vertices.get(&edge.tgt) {
                        let expr = emit_vertex(schema, target);
                        return format!("  return {};\n", expr);
                    }
                }
            }
            "  return;\n".to_string()
        }
        "statement_block" => {
            let mut stmts: Vec<String> = vec![];
            
            // Collect all statements (direct or via next chain)
            let mut seen: std::collections::HashSet<String> = std::collections::HashSet::new();
            
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() && edge.kind.as_ref() == "statement" {
                    if let Some(target) = schema.vertices.get(&edge.tgt) {
                        let id = target.id.to_string();
                        if !seen.contains(&id) {
                            stmts.push(emit_vertex(schema, target));
                            seen.insert(id);
                        }
                    }
                }
            }
            
            // Follow next edges
            let mut current = None;
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() && edge.kind.as_ref() == "statement" {
                    current = Some(edge.tgt.to_string());
                    break;
                }
            }
            
            while let Some(ref curr_id) = current {
                let mut found_next = false;
                for (edge, _) in &schema.edges {
                    if edge.src.as_ref() == curr_id.as_str() && edge.kind.as_ref() == "next" {
                        let next_id = edge.tgt.to_string();
                        if let Some(target) = schema.vertices.get(&edge.tgt) {
                            if !seen.contains(&next_id) {
                                stmts.push(emit_vertex(schema, target));
                                seen.insert(next_id.clone());
                            }
                        }
                        current = Some(next_id);
                        found_next = true;
                        break;
                    }
                }
                if !found_next {
                    break;
                }
            }
            
            format!("\n{}\n", stmts.join(""))
        }
        "arrow_function" => {
            let mut params: Vec<String> = vec![];
            let mut body_str = String::new();
            
            for (edge, _) in &schema.edges {
                if edge.src.as_ref() == vertex.id.as_ref() {
                    match edge.kind.as_ref() {
                        "parameters" => {
                            if let Some(target) = schema.vertices.get(&edge.tgt) {
                                let param_name = get_constraint(schema, &target.id, "name")
                                    .unwrap_or_else(|| "p".to_string());
                                params.push(param_name);
                            }
                        }
                        "body" => {
                            if let Some(target) = schema.vertices.get(&edge.tgt) {
                                body_str = emit_vertex(schema, target);
                            }
                        }
                        _ => {}
                    }
                }
            }
            
            format!("({}) => {{{}}}", params.join(", "), body_str)
        }
        "comment" => "\n".to_string(),
        _ => String::new(),
    }
}

/// Get a constraint value for a vertex
fn get_constraint(schema: &panproto_schema::Schema, vertex_id: &Name, sort: &str) -> Option<String> {
    schema.constraints.get(vertex_id)
        .and_then(|constraints| {
            constraints.iter()
                .find(|c| c.sort.as_ref() == sort)
                .map(|c| c.value.clone())
        })
}

/// Create a minimal TypeScript protocol
fn create_typescript_protocol() -> Protocol {
    Protocol {
        name: "typescript-codegen".to_string(),
        schema_theory: "typescript".to_string(),
        instance_theory: "raw_file".to_string(),
        schema_composition: None,
        instance_composition: None,
        edge_rules: vec![
            EdgeRule {
                edge_kind: "statement".to_string(),
                src_kinds: vec!["program".to_string(), "statement_block".to_string()],
                tgt_kinds: vec!["import_statement".to_string(), "expression_statement".to_string(), "return_statement".to_string()],
            },
            EdgeRule {
                edge_kind: "next".to_string(),
                src_kinds: vec!["import_statement".to_string(), "expression_statement".to_string(), "comment".to_string()],
                tgt_kinds: vec!["import_statement".to_string(), "expression_statement".to_string(), "return_statement".to_string(), "comment".to_string()],
            },
            EdgeRule {
                edge_kind: "expression".to_string(),
                src_kinds: vec!["expression_statement".to_string(), "return_statement".to_string()],
                tgt_kinds: vec!["call_expression".to_string(), "member_expression".to_string(), "identifier".to_string(), "string".to_string(), "number".to_string(), "object".to_string(), "arrow_function".to_string()],
            },
            EdgeRule {
                edge_kind: "function".to_string(),
                src_kinds: vec!["call_expression".to_string()],
                tgt_kinds: vec!["member_expression".to_string(), "identifier".to_string()],
            },
            EdgeRule {
                edge_kind: "arguments".to_string(),
                src_kinds: vec!["call_expression".to_string()],
                tgt_kinds: vec!["string".to_string(), "number".to_string(), "object".to_string(), "arrow_function".to_string(), "identifier".to_string()],
            },
            EdgeRule {
                edge_kind: "object".to_string(),
                src_kinds: vec!["member_expression".to_string()],
                tgt_kinds: vec!["identifier".to_string()],
            },
            EdgeRule {
                edge_kind: "property".to_string(),
                src_kinds: vec!["member_expression".to_string()],
                tgt_kinds: vec!["property_identifier".to_string()],
            },
            EdgeRule {
                edge_kind: "pair".to_string(),
                src_kinds: vec!["object".to_string()],
                tgt_kinds: vec!["pair".to_string()],
            },
            EdgeRule {
                edge_kind: "key".to_string(),
                src_kinds: vec!["pair".to_string()],
                tgt_kinds: vec!["property_identifier".to_string(), "string".to_string()],
            },
            EdgeRule {
                edge_kind: "value".to_string(),
                src_kinds: vec!["pair".to_string()],
                tgt_kinds: vec!["string".to_string(), "number".to_string(), "identifier".to_string(), "object".to_string()],
            },
            EdgeRule {
                edge_kind: "parameters".to_string(),
                src_kinds: vec!["arrow_function".to_string()],
                tgt_kinds: vec!["identifier".to_string()],
            },
            EdgeRule {
                edge_kind: "body".to_string(),
                src_kinds: vec!["arrow_function".to_string()],
                tgt_kinds: vec!["statement_block".to_string()],
            },
        ],
        obj_kinds: vec![
            "program".to_string(),
            "import_statement".to_string(),
            "expression_statement".to_string(),
            "return_statement".to_string(),
            "call_expression".to_string(),
            "member_expression".to_string(),
            "arrow_function".to_string(),
            "statement_block".to_string(),
            "object".to_string(),
            "pair".to_string(),
            "identifier".to_string(),
            "property_identifier".to_string(),
            "string".to_string(),
            "number".to_string(),
            "comment".to_string(),
            "true".to_string(),
            "false".to_string(),
        ],
        constraint_sorts: vec![
            "name".to_string(),
            "value".to_string(),
            "source".to_string(),
            "items".to_string(),
            "content".to_string(),
            "let_name".to_string(),
        ],
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
        
        assert!(code.contains("Generated via panproto-parse Schema"));
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
    
    #[test]
    fn test_schema_structure() {
        let mut gen = TypeScriptGenerator::new();
        
        gen.route("GET", "/test").returns_json(vec![]);
        
        // Build schema directly to verify structure
        let protocol = create_typescript_protocol();
        let mut builder = SchemaBuilder::new(&protocol);
        
        let program_id = "program";
        builder = builder.vertex(program_id, "program", None).unwrap();
        
        let route = &gen.routes[0];
        let (stmt_id, b) = build_route(builder, "route_stmt", route).unwrap();
        builder = b;
        builder = builder.edge(program_id, &stmt_id, "statement", None).unwrap();
        
        let schema = builder.build().unwrap();
        
        // Verify schema structure
        assert!(schema.vertices.values().any(|v| v.kind.as_ref() == "program"));
        assert!(schema.vertices.values().any(|v| v.kind.as_ref() == "call_expression"));
        assert!(schema.vertices.values().any(|v| v.kind.as_ref() == "arrow_function"));
        
        println!("Schema has {} vertices, {} edges", schema.vertices.len(), schema.edges.len());
        
        // Should have multiple vertices for a single route
        assert!(schema.vertices.len() >= 10, "Expected at least 10 vertices, got {}", schema.vertices.len());
    }
}
