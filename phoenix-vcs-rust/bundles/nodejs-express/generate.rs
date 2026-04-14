//! JavaScript Express Bundle - Unified Panproto Pipeline
//!
//! Uses the panproto_migration traits for all 4 layers:
//! - Layer 1: GatLift (panproto_gat)
//! - Layer 2: SchemaCompile (panproto_schema + TheoryCompiler)
//! - Layer 3: DataLens (panproto_lens)
//! - Layer 4: ExprGenerate (panproto_expr::eval)

use std::collections::HashMap;
use std::path::PathBuf;

use crate::pipeline::panproto_migration::{
    RouteSpec, JsGenConfig, JsExpressPipeline,
    GatLift, SchemaCompile, DataLens, ExprGenerate, PanprotoPipeline,
};

/// Generate Express app using unified panproto pipeline
pub fn generate_express_app(routes: &[RouteSpec], project_name: &str) -> Result<String, String> {
    let config = JsGenConfig {
        project_name: project_name.to_string(),
        port: 3000,
    };
    
    let pipeline = JsExpressPipeline {
        routes: routes.to_vec(),
        config,
    };
    
    // Execute unified 4-layer pipeline
    pipeline.pipeline(routes.to_vec())
        .map_err(|e| format!("Pipeline failed: {}", e))
}

/// Generate all files for Node.js Express bundle
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    use crate::pipeline::expr_bundle::{parse_spec_to_config, nodejs_express_generator};
    
    let config = parse_spec_to_config(spec_content);
    let mut files = nodejs_express_generator().generate(&config);
    
    // Use unified panproto pipeline for app.js
    let routes = parse_routes_from_spec(spec_content);
    let route_specs: Vec<RouteSpec> = routes.into_iter()
        .map(|(method, path, handler)| RouteSpec {
            method,
            path,
            handler,
            description: String::new(),
        })
        .collect();
    
    match generate_express_app(&route_specs, &config.project_name) {
        Ok(code) => {
            files.insert(PathBuf::from("app.js"), code);
        }
        Err(e) => {
            files.insert(PathBuf::from("app.js"), 
                format!("// Pipeline error: {}\n{}", e, express_fallback(&config)));
        }
    }
    
    files
}

fn parse_routes_from_spec(spec_content: &str) -> Vec<(String, String, String)> {
    let mut routes = vec![];
    
    // Parse Nickel format: routes = [ { method = "GET", path = "/api/users", ... }, ... ]
    // Can be single-line or multi-line
    for line in spec_content.lines() {
        let trimmed = line.trim();
        
        // Single-line format: { method = "GET", path = "/api/users", handler = "listUsers" },
        if trimmed.starts_with("{ method =") && trimmed.contains("path =") {
            if let (Some(method), Some(path)) = (extract_quoted(trimmed, "method ="), extract_quoted(trimmed, "path =")) {
                let handler = extract_quoted(trimmed, "handler =")
                    .unwrap_or_else(|| generate_handler_name(&path, &method));
                routes.push((method, path, handler));
            }
        }
    }
    
    if routes.is_empty() {
        routes.push(("GET".into(), "/".to_string(), "rootHandler".into()));
    }
    
    routes
}

fn extract_quoted(line: &str, prefix: &str) -> Option<String> {
    if let Some(pos) = line.find(prefix) {
        let after = &line[pos + prefix.len()..];
        // Find quoted string
        if let Some(start) = after.find('"') {
            let after_start = &after[start + 1..];
            if let Some(end) = after_start.find('"') {
                return Some(after_start[..end].to_string());
            }
        }
    }
    None
}

fn generate_handler_name(path: &str, method: &str) -> String {
    // Convert path to camelCase handler name
    // e.g., "/api/users" -> "apiUsers" -> "getApiUsers"
    let clean = path.trim_start_matches('/').replace("/", "_").replace(":", "");
    let camel = clean.split('_')
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

fn express_fallback(config: &crate::pipeline::bundle_stack::BundleConfig) -> String {
    format!(r#"const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.get('/', (req, res) => res.json({{ status: 'ok', service: '{}' }}));
app.listen(PORT, () => console.log(`Server on port ${{PORT}}`));
"#, config.project_name)
}
