// Python Flask Bundle - emit_with_protocol Code Generation
//
// Uses panproto-parse Schema building + emit_with_protocol for code generation:
//   Config ──► Schema ──► emit_with_protocol("python") ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;

use crate::pipeline::bundle_stack::BundleConfig;
use crate::codegen::emit_bundle::{EmitBuilder, Position, statement_rules, create_protocol, emit_schema};

/// Generate all files for the Python Flask bundle using emit_with_protocol
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    let config = parse_spec_to_config(spec_content);
    let mut files = HashMap::new();
    
    // Generate app.py via emit_with_protocol
    let app_py = generate_app_py_emit(&config);
    files.insert(PathBuf::from("app.py"), app_py);
    
    // Generate pyproject.toml
    let pyproject = generate_pyproject_emit(&config);
    files.insert(PathBuf::from("pyproject.toml"), pyproject);
    
    files
}

fn parse_spec_to_config(spec_content: &str) -> BundleConfig {
    use crate::pipeline::expr_bundle::parse_spec_to_config as base_parse;
    base_parse(spec_content)
}

/// Generate app.py using emit_with_protocol
fn generate_app_py_emit(config: &BundleConfig) -> String {
    let obj_kinds = vec![
        "program".to_string(),
        "comment".to_string(),
        "import_statement".to_string(),
        "expression_statement".to_string(),
        "function_definition".to_string(),
        "decorated_definition".to_string(),
    ];
    
    let protocol = create_protocol("python", obj_kinds, statement_rules());
    
    let mut builder = EmitBuilder::new(&protocol, "python");
    
    // Header comment
    let header = "# Generated via emit_with_protocol\n\n";
    builder = builder.vertex("header", "comment", Some(header)).unwrap();
    
    // Imports
    let imports = "from flask import Flask, jsonify\n\n";
    builder = builder.vertex("imports", "import_statement", Some(imports)).unwrap();
    builder = builder.edge("header", "imports", "next").unwrap();
    
    // App creation
    let app_create = "app = Flask(__name__)\n\n";
    builder = builder.vertex("app_create", "expression_statement", Some(app_create)).unwrap();
    builder = builder.edge("imports", "app_create", "next").unwrap();
    
    // Routes
    let mut prev = "app_create".to_string();
    for (idx, route) in config.routes.iter().enumerate() {
        let route_code = format_route(route);
        let id = format!("route_{}", idx);
        
        builder = builder.vertex(&id, "function_definition", Some(&route_code)).unwrap();
        builder = builder.edge(&prev, &id, "next").unwrap();
        prev = id;
    }
    
    // Main block
    let main_code = "\nif __name__ == '__main__':\n    app.run(debug=True, port=5000)\n";
    
    builder = builder.vertex("main", "expression_statement", Some(&main_code)).unwrap();
    builder = builder.edge(&prev, "main", "next").unwrap();
    
    // Build and emit
    let schema = builder.build().unwrap();
    emit_schema(&schema, "python").unwrap()
}

fn generate_pyproject_emit(config: &BundleConfig) -> String {
    format_pyproject(config)
}

fn format_route(route: &crate::pipeline::bundle_stack::RouteConfig) -> String {
    let handler_name = route.path.trim_start_matches('/')
        .replace(['/', '-'], "_")
        .to_lowercase();
    
    format!(
        "@app.route('{}', methods=['{}'])\ndef {}():\n    return jsonify({{}})\n\n",
        route.path,
        route.method,
        handler_name
    )
}

fn format_pyproject(config: &BundleConfig) -> String {
    format!(r#"[build-system]
requires = ["setuptools>=45", "wheel"]
build-backend = "setuptools.build_meta"

[project]
name = "{}"
version = "{}"
description = "{}"
dependencies = [
    "flask>=2.0.0",
]

[project.scripts]
{} = "app:main"
"#,
        config.project_name.to_lowercase().replace(" ", "_").replace("-", "_"),
        config.version,
        config.project_description.as_deref().unwrap_or("Flask web API"),
        config.project_name.to_lowercase().replace(" ", "_").replace("-", "_")
    )
}
