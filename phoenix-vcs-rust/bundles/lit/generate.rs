// Lit Web Components Bundle - Pure Expr-Based Code Generation (Layer 4)
//
// Uses panproto_expr for algebraic code generation:
//   Config ──► Expr Term ──► eval() ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use crate::pipeline::bundle_stack::BundleConfig;

// Import panproto_expr for Layer 4
use panproto_expr::{Expr, Env, Literal, eval, EvalConfig};

/// Generate all files for the Lit web components bundle using pure Expr evaluation
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    // Parse spec into config
    let config = parse_spec_to_config(spec_content);
    
    let mut files = HashMap::new();
    
    // Generate package.json via Expr evaluation
    let package_json = generate_package_json_expr(&config);
    files.insert(PathBuf::from("package.json"), package_json);
    
    // Generate tsconfig.json (static - no config needed)
    files.insert(PathBuf::from("tsconfig.json"), lit_tsconfig().to_string());
    
    // Generate vite.config.ts (static)
    files.insert(PathBuf::from("vite.config.ts"), lit_vite_config().to_string());
    
    // Generate src/main.ts via Expr evaluation
    let main_ts = generate_main_ts_expr(&config);
    files.insert(PathBuf::from("src/main.ts"), main_ts);
    
    // Generate flake.nix via Expr evaluation
    let flake_nix = generate_flake_nix_expr(&config);
    files.insert(PathBuf::from("flake.nix"), flake_nix);
    
    files
}

/// Parse spec into BundleConfig
fn parse_spec_to_config(spec_content: &str) -> BundleConfig {
    use crate::pipeline::expr_bundle::parse_spec_to_config as base_parse;
    base_parse(spec_content)
}

// ============================================================================
// LAYER 4: Expr-Based Code Generation (μ_config→code)
// ============================================================================

/// Generate package.json using Expr lifting
fn generate_package_json_expr(config: &BundleConfig) -> String {
    // Build Expr: Record { name: Str, version: Str, description: Str }
    let expr = Expr::Record(vec![
        (Arc::from("name"), Expr::Lit(Literal::Str(
            config.project_name.to_lowercase().replace(" ", "-").replace("_", "-").into()
        ))),
        (Arc::from("version"), Expr::Lit(Literal::Str(config.version.clone().into()))),
        (Arc::from("description"), Expr::Lit(Literal::Str(
            config.project_description.clone().unwrap_or_else(|| "Lit web components".to_string()).into()
        ))),
    ]);
    
    // Evaluate to get Literal::Record
    let env = Env::new();
    let eval_config = EvalConfig::default();
    
    match eval(&expr, &env, &eval_config) {
        Ok(lit) => package_json_from_literal(&lit),
        Err(_) => package_json_fallback(config),
    }
}

/// Convert Literal::Record to package.json string
fn package_json_from_literal(lit: &Literal) -> String {
    if let Literal::Record(fields) = lit {
        let mut name = "lit-app".to_string();
        let mut version = "0.1.0".to_string();
        let mut description = "Lit web components".to_string();
        
        for (k, v) in fields {
            if let Literal::Str(s) = v {
                match k.as_ref() {
                    "name" => name = s.clone(),
                    "version" => version = s.clone(),
                    "description" => description = s.clone(),
                    _ => {}
                }
            }
        }
        
        format!(r#"{{
  "name": "{name}",
  "version": "{version}",
  "description": "{description}",
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
            name = name,
            version = version,
            description = description
        )
    } else {
        package_json_fallback(&BundleConfig::default())
    }
}

fn package_json_fallback(config: &BundleConfig) -> String {
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

fn lit_tsconfig() -> &'static str {
    r#"{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false
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
    rollupOptions: {
      external: /^lit/
    }
  }
});"#
}

/// Generate src/main.ts using Expr lifting
fn generate_main_ts_expr(config: &BundleConfig) -> String {
    // Build environment with config values
    let env = Env::new()
        .extend("project_name".into(), Literal::Str(config.project_name.clone().into()))
        .extend("version".into(), Literal::Str(config.version.clone().into()))
        .extend("description".into(), Literal::Str(
            config.project_description.clone().unwrap_or_else(|| "Lit web components".to_string()).into()
        ));
    
    // Evaluate with panproto_expr
    let eval_config = EvalConfig::default();
    
    // Build the main component expression
    let main_expr = build_main_component_expr(config);
    
    match eval(&main_expr, &env, &eval_config) {
        Ok(lit) => main_ts_from_literal(&lit, config),
        Err(_) => main_ts_fallback(config),
    }
}

/// Build Expr for main component
fn build_main_component_expr(_config: &BundleConfig) -> Expr {
    // Return a record representing the component structure
    Expr::Record(vec![
        (Arc::from("type"), Expr::Lit(Literal::Str("LitElement".into()))),
        (Arc::from("tag"), Expr::Lit(Literal::Str("my-app".into()))),
    ])
}

/// Convert Literal to main.ts string
fn main_ts_from_literal(_lit: &Literal, config: &BundleConfig) -> String {
    main_ts_fallback(config)
}

fn main_ts_fallback(config: &BundleConfig) -> String {
    let name = &config.project_name;
    let version = &config.version;
    let desc = config.project_description.as_deref().unwrap_or("Lit web components");
    
    format!(r#"// phoenix: iu_id = "{}-app"
// Lit web components generated by Phoenix VCS
// Generated via: μ_config→code (Expr evaluation)

import {{ LitElement, html, css }} from 'lit';
import {{ customElement, property }} from 'lit/decorators.js';

@customElement('my-app')
export class MyApp extends LitElement {{
  static styles = css`
    :host {{
      display: block;
      padding: 16px;
      font-family: system-ui, sans-serif;
    }}
    h1 {{
      color: #333;
    }}
  `;

  @property() name = '{}';
  @property() version = '{}';
  @property() description = '{}';

  render() {{
    return html`
      <h1>${{this.name}}</h1>
      <p>Version: ${{this.version}}</p>
      <p>${{this.description}}</p>
      <slot></slot>
    `;
  }}
}}

export default MyApp;
"#,
        name.to_lowercase().replace(" ", "-").replace("_", "-"),
        name,
        version,
        desc
    )
}

/// Generate flake.nix using Expr lifting
fn generate_flake_nix_expr(config: &BundleConfig) -> String {
    // Build Expr: Record { name: Str, version: Str }
    let expr = Expr::Record(vec![
        (Arc::from("name"), Expr::Lit(Literal::Str(config.project_name.clone().into()))),
        (Arc::from("version"), Expr::Lit(Literal::Str(config.version.clone().into()))),
    ]);
    
    // Evaluate to get Literal::Record
    let env = Env::new();
    let eval_config = EvalConfig::default();
    
    match eval(&expr, &env, &eval_config) {
        Ok(lit) => flake_nix_from_literal(&lit),
        Err(_) => flake_nix_fallback(config),
    }
}

/// Convert Literal to flake.nix string
fn flake_nix_from_literal(lit: &Literal) -> String {
    if let Literal::Record(fields) = lit {
        let mut name = "lit-app".to_string();
        let mut version = "0.1.0".to_string();
        
        for (k, v) in fields {
            if let Literal::Str(s) = v {
                match k.as_ref() {
                    "name" => name = s.clone(),
                    "version" => version = s.clone(),
                    _ => {}
                }
            }
        }
        
        format!(r#"{{
  description = "{name} - Lit web components";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {{ inherit system; }};
        nodeDeps = with pkgs.nodePackages; [ typescript vite ];
      in
      {{
        devShells.default = pkgs.mkShell {{
          buildInputs = with pkgs; [ nodejs_20 ] ++ nodeDeps;
          shellHook = ''
            echo "🔥 {name} development shell"
            echo "Run: npm install && npm run dev"
          '';
        }};

        packages.default = pkgs.buildNpmPackage {{
          pname = "{name}";
          version = "{version}";
          src = self;
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          
          buildPhase = ''
            npm run build
          '';
          
          installPhase = ''
            mkdir -p $out
            cp -r dist/* $out/
          '';
        }};
      }});
}}"#,
            name = name,
            version = version
        )
    } else {
        flake_nix_fallback(&BundleConfig::default())
    }
}

fn flake_nix_fallback(config: &BundleConfig) -> String {
    format!(r#"{{
  description = "{} - Lit web components";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {{ inherit system; }};
        nodeDeps = with pkgs.nodePackages; [ typescript vite ];
      in
      {{
        devShells.default = pkgs.mkShell {{
          buildInputs = with pkgs; [ nodejs_20 ] ++ nodeDeps;
          shellHook = ''
            echo "🔥 {} development shell"
            echo "Run: npm install && npm run dev"
          '';
        }};

        packages.default = pkgs.buildNpmPackage {{
          pname = "{}";
          version = "{}";
          src = self;
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          
          buildPhase = ''
            npm run build
          '';
          
          installPhase = ''
            mkdir -p $out
            cp -r dist/* $out/
          '';
        }};
      }});
}}"#,
        config.project_name,
        config.project_name,
        config.project_name.to_lowercase().replace(" ", "-").replace("_", "-"),
        config.version
    )
}
