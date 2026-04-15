// Node.js Express Bundle - emit_with_protocol Code Generation
//
// Uses panproto-parse Schema building + emit_with_protocol for code generation:
//   Config ──► Schema ──► emit_with_protocol("javascript") ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;

use crate::pipeline::bundle_stack::BundleConfig;
use crate::codegen::emit_bundle::{EmitBuilder, Position, statement_rules, create_protocol, emit_schema};

/// Generate all files for the Node.js Express bundle using emit_with_protocol
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    let config = parse_spec_to_config(spec_content);
    let mut files = HashMap::new();
    
    // Generate package.json via emit_with_protocol
    let package_json = generate_package_json_emit(&config);
    files.insert(PathBuf::from("package.json"), package_json);
    
    // Generate flake.nix
    let flake_nix = generate_flake_nix_emit(&config);
    files.insert(PathBuf::from("flake.nix"), flake_nix);
    
    // Generate .env.example
    files.insert(PathBuf::from(".env.example"), env_example().to_string());
    
    // Generate README.md
    let readme = generate_readme_emit(&config);
    files.insert(PathBuf::from("README.md"), readme);
    
    // Generate app.js via emit_with_protocol
    let app_js = generate_app_js_emit(&config);
    files.insert(PathBuf::from("app.js"), app_js);
    
    files
}

fn parse_spec_to_config(spec_content: &str) -> BundleConfig {
    use crate::pipeline::expr_bundle::parse_spec_to_config as base_parse;
    base_parse(spec_content)
}

/// Generate package.json using emit_with_protocol
fn generate_package_json_emit(config: &BundleConfig) -> String {
    format_package_json(config)
}

/// Generate app.js using emit_with_protocol
fn generate_app_js_emit(config: &BundleConfig) -> String {
    let obj_kinds = vec![
        "program".to_string(),
        "comment".to_string(),
        "import_statement".to_string(),
        "expression_statement".to_string(),
        "variable_declaration".to_string(),
    ];
    
    let protocol = create_protocol("javascript", obj_kinds, statement_rules());
    
    let mut builder = EmitBuilder::new(&protocol, "javascript");
    
    // Header
    let header = "// Generated via emit_with_protocol\n\n";
    builder = builder.vertex("header", "comment", Some(header)).unwrap();
    
    // Imports
    let imports = "const express = require('express');\nconst app = express();\n\n";
    builder = builder.vertex("imports", "import_statement", Some(imports)).unwrap();
    builder = builder.edge("header", "imports", "next").unwrap();
    
    // Middleware
    let middleware = "app.use(express.json());\n\n";
    builder = builder.vertex("middleware", "expression_statement", Some(middleware)).unwrap();
    builder = builder.edge("imports", "middleware", "next").unwrap();
    
    // Routes
    let mut prev = "middleware".to_string();
    for (idx, route) in config.routes.iter().enumerate() {
        let route_code = format_route(route);
        let id = format!("route_{}", idx);
        
        builder = builder.vertex(&id, "expression_statement", Some(&route_code)).unwrap();
        builder = builder.edge(&prev, &id, "next").unwrap();
        prev = id;
    }
    
    // Server start
    let start_code = "\nconst PORT = process.env.PORT || 3000;\napp.listen(PORT, () => {\n  console.log(`Server running on port ${{PORT}}`);\n});\n\nmodule.exports = app;\n";
    
    builder = builder.vertex("start", "expression_statement", Some(&start_code)).unwrap();
    builder = builder.edge(&prev, "start", "next").unwrap();
    
    // Build and emit
    let schema = builder.build().unwrap();
    emit_schema(&schema, "javascript").unwrap()
}

fn generate_flake_nix_emit(config: &BundleConfig) -> String {
    format_flake_nix(config)
}

fn generate_readme_emit(config: &BundleConfig) -> String {
    format_readme(config)
}

fn format_package_json(config: &BundleConfig) -> String {
    format!(r#"{{
  "name": "{}",
  "version": "{}",
  "description": "{}",
  "main": "app.js",
  "scripts": {{
    "start": "node app.js",
    "dev": "nodemon app.js"
  }},
  "dependencies": {{
    "express": "^4.18.2"
  }},
  "devDependencies": {{
    "nodemon": "^3.0.1"
  }}
}}"#,
        config.project_name.to_lowercase().replace(" ", "-").replace("_", "-"),
        config.version,
        config.project_description.as_deref().unwrap_or("Express web API")
    )
}

fn format_route(route: &crate::pipeline::bundle_stack::RouteConfig) -> String {
    format!(
        "app.{}('{}', (req, res) => {{\n  res.json({{ message: 'Hello from {} {}' }});\n}});\n",
        route.method.to_lowercase(),
        route.path,
        route.method,
        route.path
    )
}

fn format_flake_nix(config: &BundleConfig) -> String {
    let project_name = config.project_name.to_lowercase().replace(" ", "-").replace("_", "-");
    format!(r#"{{
  description = "{}";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
  }};

  outputs = {{ self, nixpkgs }}: {{
    devShells.default = nixpkgs.legacyPackages.${{builtins.currentSystem}}.mkShell {{
      buildInputs = with nixpkgs.legacyPackages.${{builtins.currentSystem}}; [
        nodejs
      ];
    }};
  }};
}}"#,
        config.project_description.as_deref().unwrap_or("Express web API")
    )
}

fn format_readme(config: &BundleConfig) -> String {
    format!(r#"# {}

{}

## Getting Started

```bash
npm install
npm run dev
```

## API

See spec.md for API documentation.
"#,
        config.project_name,
        config.project_description.as_deref().unwrap_or("Express web API")
    )
}

fn env_example() -> &'static str {
    "PORT=3000\nNODE_ENV=development\n"
}
