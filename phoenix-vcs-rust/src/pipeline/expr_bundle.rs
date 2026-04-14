//! Generic Expr-Based Code Generation for All Bundles
//!
//! This module wraps the Expr layer (Layer 4) to provide a unified
//! code generation interface for all bundles.
//!
//! Architecture:
//!   Bundle Config ──► ExprTerm ──► eval() ──► Generated Code
//!
//! Benefits:
//! - Runtime expression evaluation
//! - Config-driven code generation
//! - Consistent across all bundles

use std::collections::HashMap;
use std::path::PathBuf;

#[cfg(feature = "panproto")]
use panproto_expr::{Expr, Env, Literal, eval};

/// Generic code generator using Expr evaluation
pub struct ExprBundleGenerator {
    /// Bundle name
    pub bundle_name: String,
    /// Files this bundle generates
    pub artifacts: Vec<ArtifactDef>,
}

/// Definition of a generated artifact (file)
pub struct ArtifactDef {
    pub path: PathBuf,
    /// Expr template that generates the content
    pub generator: ArtifactGenerator,
}

/// How to generate an artifact
pub enum ArtifactGenerator {
    /// Static string (no config needed)
    Static(String),
    /// Config-driven Expr template
    Expr(fn(&BundleConfig) -> String),
    /// Template with variable substitution
    Template { template: String, bindings: Vec<String> },
}

// Re-export BundleConfig from bundle_stack for consistency
pub use crate::pipeline::bundle_stack::BundleConfig;

impl ExprBundleGenerator {
    /// Create a new bundle generator
    pub fn new(bundle_name: &str) -> Self {
        Self {
            bundle_name: bundle_name.to_string(),
            artifacts: Vec::new(),
        }
    }
    
    /// Add an artifact to generate
    pub fn with_artifact(mut self, path: &str, generator: ArtifactGenerator) -> Self {
        self.artifacts.push(ArtifactDef {
            path: PathBuf::from(path),
            generator,
        });
        self
    }
    
    /// Generate all artifacts
    pub fn generate(&self, config: &BundleConfig) -> HashMap<PathBuf, String> {
        let mut files = HashMap::new();
        
        for artifact in &self.artifacts {
            let content = match &artifact.generator {
                ArtifactGenerator::Static(s) => s.clone(),
                ArtifactGenerator::Expr(f) => f(config),
                ArtifactGenerator::Template { template, bindings } => {
                    self.eval_template(template, bindings, config)
                }
            };
            
            files.insert(artifact.path.clone(), content);
        }
        
        files
    }
    
    /// Evaluate a template with variable bindings
    fn eval_template(&self, template: &str, bindings: &[String], config: &BundleConfig) -> String {
        let mut result = template.to_string();
        
        for binding in bindings {
            let value = match binding.as_str() {
                "project_name" => &config.project_name,
                "version" => &config.version,
                "description" => config.project_description.as_deref().unwrap_or(""),
                "theme" => config.theme.as_deref().unwrap_or("default"),
                key => config.extra.get(key).map(|s| s.as_str()).unwrap_or(""),
            };
            
            result = result.replace(&format!("{{{{{}}}}}", binding), value);
        }
        
        result
    }
}

// ============================================================================
// Pre-built generators for common bundles
// ============================================================================

/// Lit bundle generator using Expr
pub fn lit_expr_generator() -> ExprBundleGenerator {
    ExprBundleGenerator::new("lit")
        .with_artifact("package.json", ArtifactGenerator::Expr(lit_package_json))
        .with_artifact("tsconfig.json", ArtifactGenerator::Static(lit_tsconfig().to_string()))
        .with_artifact("vite.config.ts", ArtifactGenerator::Static(lit_vite_config().to_string()))
        .with_artifact("src/main.ts", ArtifactGenerator::Expr(lit_main_ts))
        .with_artifact("flake.nix", ArtifactGenerator::Expr(lit_flake_nix))
}

fn lit_package_json(config: &BundleConfig) -> String {
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
    "lit": "^3.1.0"
  }},
  "devDependencies": {{
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }}
}}"#,
        config.project_name,
        config.version,
        config.project_description.as_deref().unwrap_or("Lit Web Components app")
    )
}

fn lit_tsconfig() -> &'static str {
    r#"{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true,
    "moduleResolution": "bundler",
    "allowSyntheticDefaultImports": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true,
    "useDefineForClassFields": false,
    "skipLibCheck": true
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
      formats: ['es'],
      fileName: 'main'
    },
    outDir: 'dist',
    sourcemap: true
  }
});"#
}

fn lit_main_ts(config: &BundleConfig) -> String {
    let theme = config.theme.as_deref().unwrap_or("default");
    let (gradient, emoji) = match theme {
        "kitty" | "kawaii" => ("linear-gradient(135deg, #FFB6C1 0%, #E6E6FA 50%, #FFDAB9 100%)", "🐾"),
        "cyberpunk" => ("linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #16213e 100%)", "⚡"),
        _ => ("linear-gradient(135deg, #667eea 0%, #764ba2 100%)", "🔥"),
    };
    
    format!(r#"import {{ LitElement, html, css }} from 'lit';
import {{ customElement, property }} from 'lit/decorators.js';

@customElement('{}-app')
export class {}App extends LitElement {{
  static styles = css`
    :host {{ display: block; max-width: 800px; margin: 0 auto; padding: 20px; }}
    .hero {{
      background: {};
      padding: 60px 20px;
      text-align: center;
      border-radius: 16px;
      margin-bottom: 24px;
    }}
    .hero::before {{ content: '{}'; font-size: 2rem; opacity: 0.5; }}
    h1 {{ margin: 0; font-size: 2.5rem; }}
  `;
  
  render() {{
    return html`<div class="hero"><h1>Welcome to {}!</h1></div>`;
  }}
}}

console.log('🔥 {} app loaded');"#,
        config.project_name.to_lowercase().replace("-", "_"),
        to_pascal_case(&config.project_name),
        gradient,
        emoji,
        config.project_name,
        config.project_name
    )
}

fn lit_flake_nix(config: &BundleConfig) -> String {
    format!(r#"{{
  description = "{} - Lit Web Components app";
  
  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};
  
  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let pkgs = nixpkgs.legacyPackages.${{system}};
      in {{
        devShells.default = pkgs.mkShell {{
          buildInputs = [ pkgs.nodejs_20 ];
        }};
      }});
}}"#,
        config.project_name
    )
}

/// Node.js Express generator
pub fn nodejs_express_generator() -> ExprBundleGenerator {
    ExprBundleGenerator::new("nodejs-express")
        .with_artifact("package.json", ArtifactGenerator::Expr(express_package_json))
        .with_artifact("app.js", ArtifactGenerator::Expr(express_app_js))
}

fn express_package_json(config: &BundleConfig) -> String {
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
    "nodemon": "^3.0.0"
  }}
}}"#,
        config.project_name,
        config.version,
        config.project_description.as_deref().unwrap_or("Express API server")
    )
}

fn express_app_js(config: &BundleConfig) -> String {
    // Parse routes from raw spec content
    let routes = parse_routes_from_spec(&config.raw_spec);
    
    // Use algebraic 4-layer generation (not string templates!)
    use crate::pipeline::js_algebraic::{generate_express_app, RouteSpec};
    
    let route_specs: Vec<RouteSpec> = routes.into_iter()
        .map(|(method, path, handler)| RouteSpec {
            method,
            path,
            handler,
            description: String::new(),
        })
        .collect();
    
    match generate_express_app(&route_specs, &config.project_name) {
        Ok(code) => code,
        Err(e) => format!("// Algebraic generation error: {}\n// Falling back to template\n{}", 
            e, express_app_js_template(config))
    }
}

fn express_app_js_template(config: &BundleConfig) -> String {
    // Fallback template (original template-based version)
    format!(r#"const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Health check
app.get('/', (req, res) => {{
  res.json({{ status: 'ok', service: '{}' }});
}});

// API routes
app.get('/api/status', (req, res) => {{
  res.json({{ status: 'running', timestamp: new Date().toISOString() }});
}});

app.listen(PORT, () => {{
  console.log(`{} API server listening on port ${{PORT}}`);
}});
"#,
        config.project_name,
        config.project_name
    )
}

/// Parse routes from spec.ncl content
fn parse_routes_from_spec(spec_content: &str) -> Vec<(String, String, String)> {
    let mut routes = Vec::new();
    
    // Look for route definitions in the spec
    // Pattern: { method = "GET", path = "/api/users", handler = "listUsers" }
    for line in spec_content.lines() {
        let trimmed = line.trim();
        // Match lines that look like route definitions
        if trimmed.contains("{") && trimmed.contains("method =") && trimmed.contains("path =") {
            // Extract method
            let method = extract_quoted_after(trimmed, "method =")
                .unwrap_or_else(|| "GET".to_string());
            
            // Extract path  
            let path = extract_quoted_after(trimmed, "path =")
                .unwrap_or_else(|| "/".to_string());
            
            // Extract handler or generate from path
            let handler = extract_quoted_after(trimmed, "handler =")
                .unwrap_or_else(|| generate_handler_name(&path, &method));
            
            routes.push((method, path, handler));
        }
    }
    
    routes
}

fn extract_quoted_after(line: &str, prefix: &str) -> Option<String> {
    line.find(prefix).and_then(|pos| {
        let after_prefix = &line[pos + prefix.len()..];
        // Find the next quoted string
        after_prefix.find('"').map(|quote_pos| {
            let after_first_quote = &after_prefix[quote_pos + 1..];
            after_first_quote.split('"').next().map(|s| s.to_string())
        })?
    })
}

fn generate_handler_name(path: &str, method: &str) -> String {
    // Generate handler name from path and method
    // e.g., /api/users + GET -> getUsers
    // e.g., /api/users/:id + GET -> getUserById
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    
    let method_prefix = method.to_lowercase();
    // e.g., /api/users + GET -> getUsers
    // e.g., /api/users/:id + GET -> getUserById
    let parts: Vec<&str> = path.split('/').filter(|s| !s.is_empty()).collect();
    
    let method_prefix = method.to_lowercase();
    let resource = parts.last()
        .map(|p| p.replace(":", "By").replace("id", "Id"))
        .unwrap_or_else(|| "root".to_string());
    
    // Capitalize first letter of resource
    let mut chars = resource.chars();
    let capitalized = match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
    };
    
    format!("{}{}", method_prefix, capitalized)
}

/// Rust bundle generator
pub fn rust_generator() -> ExprBundleGenerator {
    ExprBundleGenerator::new("rust")
        .with_artifact("Cargo.toml", ArtifactGenerator::Expr(rust_cargo_toml))
        .with_artifact("src/main.rs", ArtifactGenerator::Static(rust_main_rs().to_string()))
}

fn rust_cargo_toml(config: &BundleConfig) -> String {
    format!(r#"[package]
name = "{}"
version = "{}"
edition = "2021"
description = "{}"

[dependencies]
"#,
        config.project_name.replace("-", "_"),
        config.version,
        config.project_description.as_deref().unwrap_or("Rust application")
    )
}

fn rust_main_rs() -> &'static str {
    r#"fn main() {
    println!("Hello from Phoenix-generated Rust app!");
}
"#
}

// ============================================================================
// Generic generation entry points for all bundles
// ============================================================================

/// Generate using Expr-based system for any bundle
pub fn generate_with_expr_bundle(bundle_name: &str, config: &BundleConfig) -> HashMap<PathBuf, String> {
    match bundle_name {
        "lit" => lit_expr_generator().generate(config),
        "nodejs-express" | "express" => nodejs_express_generator().generate(config),
        "rust" => rust_generator().generate(config),
        _ => {
            eprintln!("No Expr generator for bundle: {}", bundle_name);
            HashMap::new()
        }
    }
}

/// Parse spec content to extract BundleConfig
pub fn parse_spec_to_config(spec_content: &str) -> BundleConfig {
    let mut config = BundleConfig::default();
    config.raw_spec = spec_content.to_string();  // CRITICAL: Save raw spec for route parsing!
    
    // Extract project_name
    for line in spec_content.lines() {
        if line.contains("project_name = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.project_name = value;
                break;
            }
        }
    }
    
    // Extract version
    for line in spec_content.lines() {
        if line.contains("version = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.version = value;
                break;
            }
        }
    }
    if config.version.is_empty() {
        config.version = "0.1.0".to_string();
    }
    
    // Extract description
    for line in spec_content.lines() {
        if line.contains("project_description = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.project_description = Some(value);
                break;
            }
        }
    }
    
    // Extract theme
    for line in spec_content.lines() {
        if line.contains("theme = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.theme = Some(value);
                break;
            }
        }
    }
    
    config
}

fn extract_quoted_value(line: &str) -> Option<String> {
    let after_eq = line.split('=').nth(1)?;
    let start = after_eq.find(['"', '\''].as_ref())?;
    let after_start = &after_eq[start + 1..];
    let end = after_start.find(['"', '\''].as_ref())?;
    Some(after_start[..end].to_string())
}

fn to_pascal_case(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
            }
        })
        .collect()
}
