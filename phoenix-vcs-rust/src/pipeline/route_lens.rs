//! Layer 3: Lens - Bidirectional Route Transformations
//!
//! Implements lens-style bidirectional sync:
//!   get: spec → view (extract routes)
//!   put: view → spec (merge routes back)

use std::collections::HashMap;
use panproto_lens::Complement;

use super::route_schema::{
    RouteSchema, Endpoint, HttpMethod, Handler, ResponseDef, ResponseBody,
    parse_express_routes
};

/// Route lens for bidirectional sync
pub struct RouteLens;

impl RouteLens {
    /// Backward: Put routes back into spec (put direction)
    /// 
    /// Uses complement pattern:
    /// - Extract complement (non-route parts) from original spec
    /// - Merge with new view (routes from code)
    /// - Return new complete spec
    pub fn put(code_schema: &RouteSchema, spec_content: &str) -> String {
        Self::put_impl(code_schema, spec_content)
    }
    
    /// Implementation of put (shared)
    fn put_impl(code_schema: &RouteSchema, spec_content: &str) -> String {
        // Parse current spec to identify complement (non-route parts)
        let (before_routes, _old_routes, after_routes) = Self::split_spec(spec_content);
        
        // Generate new routes array (the new "view")
        let new_routes = Self::generate_routes_array(code_schema);
        
        // Merge: complement + new view = new source
        format!("{}\n{}\n{}", before_routes, new_routes, after_routes)
    }
    
    /// Forward: Extract routes from spec (get direction)
    pub fn get_from_spec(spec_content: &str) -> RouteSchema {
        let mut schema = RouteSchema::new();
        
        // Parse Nickel format routes from spec.ncl
        for line in spec_content.lines() {
            let trimmed = line.trim();
            if trimmed.contains("method =") && trimmed.contains("path =") {
                if let (Some(method_str), Some(path)) = (
                    Self::extract_quoted(trimmed, "method ="),
                    Self::extract_quoted(trimmed, "path =")
                ) {
                    let method = HttpMethod::from_str(&method_str)
                        .unwrap_or(HttpMethod::GET);
                    
                    schema.endpoints.push(Endpoint {
                        method,
                        path,
                        handler: Handler::Unknown,
                        response: ResponseDef {
                            content_type: "application/json".into(),
                            body: ResponseBody::Empty,
                            status_code: 200,
                        },
                        middleware: vec![],
                    });
                }
            }
        }
        
        schema
    }
    
    /// Forward: Extract routes from code (get direction)
    pub fn get_from_code(code: &HashMap<String, String>) -> RouteSchema {
        let app_js = code.get("app.js").cloned().unwrap_or_default();
        parse_express_routes(&app_js)
    }
    
    /// Backward: Put routes back into spec (put direction)
    /// 
    /// Uses complement pattern:
    
    /// Split spec into (before_routes, routes_section, after_routes)
    fn split_spec(spec_content: &str) -> (String, String, String) {
        if let Some(start) = spec_content.find("routes = [") {
            // Find end of routes array
            let mut bracket_depth = 1;
            let mut end = start + "routes = [".len();
            
            for (i, c) in spec_content[start + "routes = [".len()..].chars().enumerate() {
                match c {
                    '[' => bracket_depth += 1,
                    ']' => {
                        bracket_depth -= 1;
                        if bracket_depth == 0 {
                            end = start + "routes = [".len() + i + 1;
                            break;
                        }
                    }
                    _ => {}
                }
            }
            
            let before = spec_content[..start].trim_end().to_string();
            let routes = spec_content[start..end].to_string();
            let after = spec_content[end..].trim_start().to_string();
            
            (before, routes, after)
        } else {
            // No routes found, return whole spec as "before"
            (spec_content.to_string(), String::new(), String::new())
        }
    }
    
    /// Generate routes array in Nickel format
    fn generate_routes_array(schema: &RouteSchema) -> String {
        let mut result = String::from("  routes = [\n");
        
        for endpoint in &schema.endpoints {
            let method_str = endpoint.method.as_str();
            
            // Generate handler name from path and method
            let handler = Self::generate_handler_name(&endpoint.path, method_str);
            
            result.push_str(&format!(
                "    {{ method = \"{}\", path = \"{}\", handler = \"{}\", description = \"{} {} endpoint\" }},\n",
                method_str,
                endpoint.path,
                handler,
                method_str,
                endpoint.path
            ));
        }
        
        result.push_str("  ],\n");
        result
    }
    
    /// Generate handler name from path and method
    fn generate_handler_name(path: &str, method: &str) -> String {
        // /api/users/:id → updateUsersByid (with method prefix)
        let clean = path.trim_start_matches('/').replace("/", "_").replace(":", "");
        let camel = clean.split('_')
            .filter(|s| !s.is_empty())
            .map(|s| {
                let mut c = s.chars();
                match c.next() {
                    None => String::new(),
                    Some(f) => f.to_uppercase().collect::<String>() + c.as_str(),
                }
            })
            .collect::<String>();
        
        format!("{}{}", method.to_lowercase(), camel)
    }
    
    /// Extract quoted string after prefix
    fn extract_quoted(line: &str, prefix: &str) -> Option<String> {
        line.find(prefix).and_then(|pos| {
            let after = &line[pos + prefix.len()..];
            after.find('"').and_then(|start| {
                let after_start = &after[start + 1..];
                after_start.find('"').map(|end| {
                    after_start[..end].to_string()
                })
            })
        })
    }
    
    /// Format diff for display
    pub fn format_diff(diff: &super::route_schema::SchemaDiff) -> String {
        let mut output = String::new();
        
        if diff.is_empty() {
            output.push_str("✅ No route changes detected.\n");
            return output;
        }
        
        if !diff.added.is_empty() {
            output.push_str(&format!("🟢 ADDED ({}):\n", diff.added.len()));
            for ep in &diff.added {
                output.push_str(&format!("  + {} {}\n", ep.method.as_str(), ep.path));
            }
        }
        
        if !diff.removed.is_empty() {
            output.push_str(&format!("🔴 REMOVED ({}):\n", diff.removed.len()));
            for ep in &diff.removed {
                output.push_str(&format!("  - {} {}\n", ep.method.as_str(), ep.path));
            }
        }
        
        if !diff.modified.is_empty() {
            output.push_str(&format!("🟡 MODIFIED ({}):\n", diff.modified.len()));
            for change in &diff.modified {
                output.push_str(&format!("  ~ {} {} (response changed)\n", 
                    change.method.as_str(), change.path));
            }
        }
        
        output
    }
}

/// Sync engine using lens get/put
pub struct RouteSyncEngine;

impl RouteSyncEngine {
    pub fn new() -> Self {
        Self
    }
    
    /// Detect changes: get from code, get from spec, compare
    pub fn detect_changes(&self, code: &HashMap<String, String>, spec_content: &str) -> super::route_schema::SchemaDiff {
        let code_schema = RouteLens::get_from_code(code);
        let spec_schema = RouteLens::get_from_spec(spec_content);
        
        code_schema.diff(&spec_schema)
    }
    
    /// Sync: put code routes back into spec
    pub fn sync_to_spec(&self, code_schema: &RouteSchema, spec_content: &str) -> String {
        RouteLens::put(code_schema, spec_content)
    }
}

/// Complement for route sync - stores non-route parts of spec
pub struct RouteComplement {
    pub before_routes: String,
    pub after_routes: String,
}

impl RouteComplement {
    /// Create complement from spec by extracting non-route parts
    /// Also returns current schema (view)
    pub fn from_spec(spec_content: &str) -> (RouteSchema, Self) {
        let schema = RouteLens::get_from_spec(spec_content);
        let (before, _, after) = RouteLens::split_spec(spec_content);
        
        (schema, Self {
            before_routes: before,
            after_routes: after,
        })
    }
    
    /// Merge view with complement to create new source
    pub fn merge(&self, view: &RouteSchema) -> String {
        let routes_array = RouteLens::generate_routes_array(view);
        format!("{}\n{}\n{}", self.before_routes, routes_array, self.after_routes)
    }
}

// Re-export for compatibility
pub use RouteLens as Lens;

// ============================================================================
// COMPOSED LENS: Full Bidirectional Spec ↔ Code
// ============================================================================

/// Composed lens for spec.md ↔ code round-trip editing
/// 
/// Chains multiple lenses:
/// 1. SpecMdLens: spec.md ↔ spec.ncl  (4-layer transformation)
/// 2. RouteLens: spec.ncl ↔ RouteSchema  (extract/merge routes)
/// 3. CodeLens: RouteSchema ↔ code  (generate/parse)
/// 
/// This enables true bidirectional editing: edit any layer, sync to others
pub struct ComposedPipelineLens {
    /// Layer 1-2: spec.md ↔ spec.ncl
    pub spec_md_lens: Box<dyn LensTrait>,
    /// Layer 3: spec.ncl ↔ RouteSchema  
    pub route_lens: RouteLens,
    /// Layer 4: RouteSchema ↔ code
    pub code_lens: Box<dyn LensTrait>,
}

/// Trait for composable lenses
pub trait LensTrait {
    /// Forward: get from source
    fn get(&self, source: &str) -> String;
    /// Backward: put to source
    fn put(&self, view: &str, source: &str) -> String;
}

impl ComposedPipelineLens {
    /// Create new composed lens
    pub fn new() -> Self {
        Self {
            spec_md_lens: Box::new(SpecMdLens::new()),
            route_lens: RouteLens,
            code_lens: Box::new(CodeLens::new()),
        }
    }
    
    /// Full forward: spec.md → code
    /// 
    /// Runs: spec.md →(get)→ spec.ncl →(get)→ RouteSchema →(get)→ code
    pub fn forward(&self, spec_md: &str) -> String {
        // Step 1: spec.md → spec.ncl
        let spec_ncl = self.spec_md_lens.get(spec_md);
        
        // Step 2: spec.ncl → RouteSchema
        let route_schema = RouteLens::get_from_spec(&spec_ncl);
        
        // Step 3: RouteSchema → code
        let mut code_map = HashMap::new();
        let code = self.generate_code(&route_schema);
        code_map.insert("app.js".to_string(), code.clone());
        
        code
    }
    
    /// Generate code from RouteSchema
    fn generate_code(&self, schema: &RouteSchema) -> String {
        let mut lines = vec![
            "const express = require('express');".to_string(),
            "".to_string(),
            "const app = express();".to_string(),
            "".to_string(),
        ];
        
        for ep in &schema.endpoints {
            let method_str = ep.method.as_str().to_lowercase();
            lines.push(format!(
                "app.{}('{}', (req, res) => {{\n  res.json({{ message: 'handler' }});\n}});\n",
                method_str,
                ep.path
            ));
        }
        
        lines.push("".to_string());
        lines.push("app.listen(3000, () => {".to_string());
        lines.push("  console.log(`Server on port ${3000}`);".to_string());
        lines.push("});".to_string());
        
        lines.join("\n")
    }
    
    /// Full backward: code → spec.md
    /// 
    /// Runs: code →(get)→ RouteSchema →(put)→ spec.ncl →(put)→ spec.md
    pub fn backward(&self, code: &str, original_spec_md: &str) -> String {
        // Step 1: code → RouteSchema (parse)
        let mut code_map = HashMap::new();
        code_map.insert("app.js".to_string(), code.to_string());
        let route_schema = RouteLens::get_from_code(&code_map);
        
        // Step 2: Get original spec.ncl for complement
        let original_spec_ncl = self.spec_md_lens.get(original_spec_md);
        
        // Step 3: RouteSchema → spec.ncl (put with complement)
        let new_spec_ncl = RouteLens::put(&route_schema, &original_spec_ncl);
        
        // Step 4: spec.ncl → spec.md (put with complement)
        let new_spec_md = self.spec_md_lens.put(&new_spec_ncl, original_spec_md);
        
        new_spec_md
    }
}

/// Lens for spec.md ↔ spec.ncl (placeholder)
pub struct SpecMdLens;

impl SpecMdLens {
    pub fn new() -> Self { Self }
}

impl LensTrait for SpecMdLens {
    fn get(&self, source: &str) -> String {
        // Would call transform_spec_md_to_ncl
        source.to_string()
    }
    
    fn put(&self, view: &str, source: &str) -> String {
        // Would generate spec.md from spec.ncl + complement
        source.to_string()
    }
}

/// Lens for RouteSchema ↔ code (placeholder)
pub struct CodeLens;

impl CodeLens {
    pub fn new() -> Self { Self }
}

impl LensTrait for CodeLens {
    fn get(&self, source: &str) -> String {
        // Would generate code from schema
        source.to_string()
    }
    
    fn put(&self, view: &str, source: &str) -> String {
        // Would parse code to schema
        source.to_string()
    }
}
