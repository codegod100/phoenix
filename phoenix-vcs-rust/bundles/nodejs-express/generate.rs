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
    
    if let Ok(value) = serde_json::from_str::<serde_json::Value>(spec_content) {
        if let Some(api) = value.get("api") {
            if let Some(endpoints) = api.get("endpoints").and_then(|e| e.as_array()) {
                for ep in endpoints {
                    if let (Some(method), Some(path)) = (
                        ep.get("method").and_then(|m| m.as_str()),
                        ep.get("path").and_then(|p| p.as_str()),
                    ) {
                        let handler = ep.get("handler")
                            .and_then(|h| h.as_str())
                            .map(|s| s.to_string())
                            .unwrap_or_else(|| format!("{}Handler", method));
                        routes.push((method.to_uppercase(), path.to_string(), handler));
                    }
                }
            }
        }
    }
    
    if routes.is_empty() {
        routes.push(("GET".into(), "/".to_string(), "rootHandler".into()));
    }
    
    routes
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
