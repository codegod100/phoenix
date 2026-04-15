// Lit Web Components Bundle - emit_with_protocol Code Generation
//
// Uses panproto-parse Schema building + emit_with_protocol for code generation:
//   Config ──► Schema ──► emit_with_protocol("typescript") ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;

use crate::pipeline::bundle_stack::BundleConfig;
use crate::codegen::emit_bundle::{EmitBuilder, Position, statement_rules, create_protocol, emit_schema};

/// Generate all files for the Lit web components bundle using emit_with_protocol
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    let config = parse_spec_to_config(spec_content);
    let mut files = HashMap::new();
    
    // Generate package.json via emit_with_protocol
    let package_json = generate_package_json_emit(&config);
    files.insert(PathBuf::from("package.json"), package_json);
    
    // Generate tsconfig.json (static)
    files.insert(PathBuf::from("tsconfig.json"), lit_tsconfig().to_string());
    
    // Generate vite.config.ts (static)
    files.insert(PathBuf::from("vite.config.ts"), lit_vite_config().to_string());
    
    // Generate src/main.ts via emit_with_protocol
    let main_ts = generate_main_ts_emit(&config);
    files.insert(PathBuf::from("src/main.ts"), main_ts);
    
    // Generate flake.nix via emit_with_protocol
    let flake_nix = generate_flake_nix_emit(&config);
    files.insert(PathBuf::from("flake.nix"), flake_nix);
    
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

/// Generate src/main.ts using emit_with_protocol
fn generate_main_ts_emit(config: &BundleConfig) -> String {
    let obj_kinds = vec![
        "program".to_string(),
        "comment".to_string(),
        "import_statement".to_string(),
        "expression_statement".to_string(),
        "class_definition".to_string(),
    ];
    
    let protocol = create_protocol("typescript", obj_kinds, statement_rules());
    
    let mut builder = EmitBuilder::new(&protocol, "typescript");
    
    // Header
    let header = "// Generated via emit_with_protocol\n\n";
    builder = builder.vertex("header", "comment", Some(header)).unwrap();
    
    // Imports
    let imports = "import { LitElement, html, css } from 'lit';\nimport { customElement, property } from 'lit/decorators.js';\n\n";
    builder = builder.vertex("imports", "import_statement", Some(imports)).unwrap();
    builder = builder.edge("header", "imports", "next").unwrap();
    
    // Component class
    let component_code = format_component(config);
    builder = builder.vertex("component", "class_definition", Some(&component_code)).unwrap();
    builder = builder.edge("imports", "component", "next").unwrap();
    
    // Build and emit
    let schema = builder.build().unwrap();
    emit_schema(&schema, "typescript").unwrap()
}

fn generate_flake_nix_emit(config: &BundleConfig) -> String {
    format_flake_nix(config)
}

fn format_package_json(config: &BundleConfig) -> String {
    format!(r#"{{
  "name": "{}",
  "version": "{}",
  "description": "{}",
  "type": "module",
  "scripts": {{
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }},
  "dependencies": {{
    "lit": "^3.0.0"
  }},
  "devDependencies": {{
    "typescript": "^5.2.0",
    "vite": "^5.0.0"
  }}
}}"#,
        config.project_name.to_lowercase().replace(" ", "-").replace("_", "-"),
        config.version,
        config.project_description.as_deref().unwrap_or("Lit web components")
    )
}

fn format_component(config: &BundleConfig) -> String {
    let class_name = config.project_name.replace(" ", "").replace("-", "").replace("_", "");
    
    format!(r#"@customElement('{}-element')
export class {}Element extends LitElement {{
  static styles = css`
    :host {{
      display: block;
      padding: 16px;
    }}
  `;

  @property() name = 'World';

  render() {{
    return html`<h1>Hello, ${{this.name}}!</h1>`;
  }}
}}

export default {}Element;
"#,
        config.project_name.to_lowercase().replace(" ", "-").replace("_", "-"),
        class_name,
        class_name
    )
}

fn format_flake_nix(config: &BundleConfig) -> String {
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
        config.project_description.as_deref().unwrap_or("Lit web components")
    )
}

fn lit_tsconfig() -> &'static str {
    r#"{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}"#
}

fn lit_vite_config() -> &'static str {
    r#"import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    lib: {
      entry: 'src/main.ts',
      formats: ['es']
    }
  }
});
"#
}
