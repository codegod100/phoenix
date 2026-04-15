// TypeScript Hono Bundle - emit_with_protocol Code Generation
//
// Uses panproto-parse Schema building + emit_with_protocol for code generation:
//   Config ──► Schema ──► emit_with_protocol("typescript") ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;

use crate::pipeline::bundle_stack::{BundleConfig, RouteConfig};
use crate::codegen::emit_bundle::{EmitBuilder, Position, statement_rules, create_protocol};

/// Generate all files for the TypeScript Hono bundle using emit_with_protocol
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    let config = parse_spec_to_config(spec_content);
    let mut files = HashMap::new();
    
    // Generate package.json via emit_with_protocol
    let package_json = generate_package_json_emit(&config);
    files.insert(PathBuf::from("package.json"), package_json);
    
    // Generate tsconfig.json (static)
    files.insert(PathBuf::from("tsconfig.json"), hono_tsconfig().to_string());
    
    // Generate src/index.ts via emit_with_protocol
    let index_ts = generate_index_ts_emit(&config);
    files.insert(PathBuf::from("src/index.ts"), index_ts);
    
    files
}

fn parse_spec_to_config(spec_content: &str) -> BundleConfig {
    use crate::pipeline::expr_bundle::parse_spec_to_config as base_parse;
    base_parse(spec_content)
}

/// Generate package.json using emit_with_protocol
fn generate_package_json_emit(config: &BundleConfig) -> String {
    let obj_kinds = vec![
        "program".to_string(),
        "object".to_string(),
        "pair".to_string(),
        "string".to_string(),
        "number".to_string(),
        "boolean".to_string(),
        "array".to_string(),
    ];
    
    let protocol = create_protocol("json", obj_kinds, vec![]);
    let mut builder = EmitBuilder::new(&protocol, "javascript");
    let mut pos = Position::new();
    
    // For package.json, we'll just build it as a single literal
    // In a full implementation, we'd build the object structure
    let content = format_package_json(config);
    
    // Build minimal schema
    builder = builder.vertex("root", "program", Some(&content)).unwrap();
    
    let schema = builder.build().unwrap();
    builder.emit(&schema).unwrap()
}

/// Generate src/index.ts using emit_with_protocol
fn generate_index_ts_emit(config: &BundleConfig) -> String {
    let obj_kinds = vec![
        "program".to_string(),
        "comment".to_string(),
        "import_statement".to_string(),
        "expression_statement".to_string(),
        "variable_declaration".to_string(),
        "call_expression".to_string(),
        "arrow_function".to_string(),
        "statement_block".to_string(),
    ];
    
    let protocol = create_protocol("typescript", obj_kinds, statement_rules());
    let mut pos = Position::new();
    let mut builder = EmitBuilder::new(&protocol, "typescript");
    
    // Header comment
    let header = "// Generated via emit_with_protocol\n\n";
    builder = builder.vertex("header", "comment", Some(header)).unwrap();
    
    // Import statement
    let import = "import { Hono } from 'hono';\n\n";
    builder = builder.vertex("import", "import_statement", Some(import)).unwrap();
    
    // App creation
    let app_decl = "const app = new Hono();\n\n";
    builder = builder.vertex("app_decl", "variable_declaration", Some(app_decl)).unwrap();
    
    // Routes
    let mut prev_vertex = "app_decl";
    for (idx, route) in config.routes.iter().enumerate() {
        let route_code = format_route(route);
        let id = format!("route_{}", idx);
        
        builder = builder.vertex(&id, "expression_statement", Some(&route_code)).unwrap();
        builder = builder.edge(prev_vertex, &id, "next").unwrap();
        prev_vertex = &id;
    }
    
    // Export and listen
    let export_code = format!("\nexport default app;\n");
    let export_id = "export";
    builder = builder.vertex(export_id, "expression_statement", Some(&export_code)).unwrap();
    builder = builder.edge(prev_vertex, export_id, "next").unwrap();
    
    // Build and emit
    let schema = builder.build().unwrap();
    builder.emit(&schema).unwrap()
}

fn format_package_json(config: &BundleConfig) -> String {
    format!(r#"{{
  "name": "{}",
  "version": "{}",
  "description": "{}",
  "type": "module",
  "scripts": {{
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js"
  }},
  "dependencies": {{
    "hono": "^3.11.0"
  }},
  "devDependencies": {{
    "@types/node": "^20.0.0",
    "tsx": "^4.0.0",
    "typescript": "^5.3.0"
  }}
}}"#,
        config.project_name.to_lowercase().replace(" ", "-").replace("_", "-"),
        config.version,
        config.project_description.as_deref().unwrap_or("Hono web API")
    )
}

fn format_route(route: &RouteConfig) -> String {
    format!(
        "app.{}('{}', (c) => {{\n  return c.json({{ status: 'ok' }});\n}});\n",
        route.method.to_lowercase(),
        route.path
    )
}

fn hono_tsconfig() -> &'static str {
    r#'{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}'#
}

// Keep the old Expr-based functions as fallback for now
// (They'll be removed once emit_with_protocol is fully working)
