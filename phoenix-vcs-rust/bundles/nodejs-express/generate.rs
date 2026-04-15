// JavaScript Express Bundle - Pure Expr-Based Code Generation (Layer 4)
//
// Uses panproto_expr for algebraic code generation:
//   Config ──► Expr Term ──► eval() ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use crate::pipeline::bundle_stack::BundleConfig;
use crate::pipeline::bundle_stack::RouteConfig;

// Import panproto_expr for Layer 4
use panproto_expr::{Expr, Env, Literal, eval, EvalConfig};

/// Generate all files for the Node.js Express bundle using pure Expr evaluation
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    // Parse spec into config
    let config = parse_spec_to_config(spec_content);
    
    let mut files = HashMap::new();
    
    // Generate package.json via Expr evaluation
    let package_json = generate_package_json_expr(&config);
    files.insert(PathBuf::from("package.json"), package_json);
    
    // Generate flake.nix via Expr evaluation
    let flake_nix = generate_flake_nix_expr(&config);
    files.insert(PathBuf::from("flake.nix"), flake_nix);
    
    // Generate .env.example (static)
    files.insert(PathBuf::from(".env.example"), env_example().to_string());
    
    // Generate README.md via Expr evaluation
    let readme = generate_readme_expr(&config);
    files.insert(PathBuf::from("README.md"), readme);
    
    // Generate app.js via Expr evaluation (main code)
    let app_js = generate_app_js_expr(&config);
    files.insert(PathBuf::from("app.js"), app_js);
    
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
            config.project_description.clone().unwrap_or_else(|| "Express API server".to_string()).into()
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
        let mut name = "express-app".to_string();
        let mut version = "0.1.0".to_string();
        let mut description = "Express API server".to_string();
        
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
  "main": "app.js",
  "type": "commonjs",
  "scripts": {{
    "start": "node app.js",
    "dev": "node --watch app.js"
  }},
  "dependencies": {{
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }},
  "devDependencies": {{
    "nodemon": "^3.0.0"
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
  "main": "app.js",
  "type": "commonjs",
  "scripts": {{
    "start": "node app.js",
    "dev": "node --watch app.js"
  }},
  "dependencies": {{
    "express": "^4.18.0",
    "cors": "^2.8.5"
  }},
  "devDependencies": {{
    "nodemon": "^3.0.0"
  }}
}}"#,
        config.project_name.to_lowercase().replace(" ", "-").replace("_", "-"),
        config.version,
        config.project_description.as_deref().unwrap_or("Express API server")
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
        let mut name = "express-app".to_string();
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
  description = "{name} - Express API server";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {{ inherit system; }};
      in
      {{
        devShells.default = pkgs.mkShell {{
          buildInputs = with pkgs; [ nodejs_20 ];
          shellHook = ''
            echo "🚀 {name} development shell"
            echo "Run: npm install && npm run dev"
          '';
        }};

        packages.default = pkgs.buildNpmPackage {{
          pname = "{name}";
          version = "{version}";
          src = self;
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          
          buildPhase = ''
            # No build phase needed for Express
          '';
          
          installPhase = ''
            mkdir -p $out
            cp -r . $out/
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
  description = "{} - Express API server";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = import nixpkgs {{ inherit system; }};
      in
      {{
        devShells.default = pkgs.mkShell {{
          buildInputs = with pkgs; [ nodejs_20 ];
          shellHook = ''
            echo "🚀 {} development shell"
            echo "Run: npm install && npm run dev"
          '';
        }};

        packages.default = pkgs.buildNpmPackage {{
          pname = "{}";
          version = "{}";
          src = self;
          npmDepsHash = "sha256-AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";
          
          buildPhase = ''
            # No build phase needed for Express
          '';
          
          installPhase = ''
            mkdir -p $out
            cp -r . $out/
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

fn env_example() -> &'static str {
    r#"# Environment variables
PORT=3000
HOST=0.0.0.0
LOG_LEVEL=info
"#
}

/// Generate README.md using Expr lifting
fn generate_readme_expr(config: &BundleConfig) -> String {
    // Build Expr: Record { name: Str, description: Str }
    let expr = Expr::Record(vec![
        (Arc::from("name"), Expr::Lit(Literal::Str(config.project_name.clone().into()))),
        (Arc::from("description"), Expr::Lit(Literal::Str(
            config.project_description.clone().unwrap_or_else(|| "Express API server".to_string()).into()
        ))),
    ]);
    
    // Evaluate to get Literal::Record
    let env = Env::new();
    let eval_config = EvalConfig::default();
    
    match eval(&expr, &env, &eval_config) {
        Ok(lit) => readme_from_literal(&lit),
        Err(_) => readme_fallback(config),
    }
}

/// Convert Literal to README.md string
fn readme_from_literal(lit: &Literal) -> String {
    if let Literal::Record(fields) = lit {
        let mut name = "Express App".to_string();
        let mut description = "Express API server".to_string();
        
        for (k, v) in fields {
            if let Literal::Str(s) = v {
                match k.as_ref() {
                    "name" => name = s.clone(),
                    "description" => description = s.clone(),
                    _ => {}
                }
            }
        }
        
        format!(r#"# {name}

{description}

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm start
```

## Nix

```bash
nix run
```
"#,
            name = name,
            description = description
        )
    } else {
        readme_fallback(&BundleConfig::default())
    }
}

fn readme_fallback(config: &BundleConfig) -> String {
    format!(r#"# {}

{}

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm start
```

## Nix

```bash
nix run
```
"#,
        config.project_name,
        config.project_description.as_deref().unwrap_or("Express API server")
    )
}

/// Generate app.js using Expr lifting
/// 
/// μ_config→code: BundleConfig ──► Expr ──► eval() ──► JavaScript Code
fn generate_app_js_expr(config: &BundleConfig) -> String {
    // Build environment with config values
    let env = Env::new()
        .extend("project_name".into(), Literal::Str(config.project_name.clone().into()))
        .extend("port".into(), Literal::Str("3000".into()));
    
    // Build routes literal for code generation
    let routes_literal = build_routes_literal(&config.routes);
    
    // Evaluate routes to drive code generation
    let eval_config = EvalConfig::default();
    
    match eval(&Expr::Lit(routes_literal), &env, &eval_config) {
        Ok(routes_lit) => {
            generate_express_code(config, &routes_lit)
        }
        Err(_) => {
            // Fallback: generate code directly from RouteConfig
            generate_express_code_fallback(config)
        }
    }
}

/// Build Literal representing routes list
fn build_routes_literal(routes: &[RouteConfig]) -> Literal {
    let route_literals: Vec<Literal> = routes.iter().map(|r| {
        Literal::Record(vec![
            (Arc::from("method"), Literal::Str(r.method.clone().into())),
            (Arc::from("path"), Literal::Str(r.path.clone().into())),
            (Arc::from("handler"), Literal::Str(r.handler.clone().into())),
            (Arc::from("description"), Literal::Str(r.description.clone().into())),
        ])
    }).collect();
    
    Literal::List(route_literals)
}

/// Generate Express code from evaluated Literal
fn generate_express_code(config: &BundleConfig, routes_lit: &Literal) -> String {
    let name = &config.project_name;
    let port = "3000";
    
    // Generate route handlers from Literal::List
    let routes_code = match routes_lit {
        Literal::List(route_list) => {
            if route_list.is_empty() {
                generate_default_routes_js(name)
            } else {
                route_list.iter().map(|route_lit| {
                    generate_route_handler_js(route_lit, name)
                }).collect::<Vec<_>>().join("\n\n")
            }
        }
        _ => generate_default_routes_js(name),
    };
    
    format!(r#"// phoenix: iu_id = "{}-api"
// Express API generated by Phoenix VCS
// Generated via: μ_config→code (Expr evaluation)

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || {port};

// Middleware
app.use(cors());
app.use(express.json());

{routes_code}

// Start server
app.listen(PORT, () => {{
  console.log(`🚀 {name} API server running on port ${{PORT}}`);
}});
"#,
        name.to_lowercase().replace(" ", "-").replace("_", "-"),
        port = port,
        routes_code = routes_code,
        name = name
    )
}

/// Generate a single route handler from Literal::Record
fn generate_route_handler_js(route_lit: &Literal, project_name: &str) -> String {
    if let Literal::Record(fields) = route_lit {
        let mut method = "get".to_string();
        let mut path = "/".to_string();
        let mut handler = "handler".to_string();
        let mut description = "Route".to_string();
        
        for (k, v) in fields {
            if let Literal::Str(s) = v {
                match k.as_ref() {
                    "method" => method = s.to_lowercase(),
                    "path" => path = s.clone(),
                    "handler" => handler = s.clone(),
                    "description" => description = s.clone(),
                    _ => {}
                }
            }
        }
        
        format!(r#"// {description}
app.{method}('{path}', (req, res) => {{
  res.json({{
    route: '{path}',
    handler: '{handler}',
    timestamp: new Date().toISOString(),
    service: '{project_name}'
  }});
}});"#,
            description = description,
            method = method,
            path = path,
            handler = handler,
            project_name = project_name
        )
    } else {
        "// Invalid route\n".to_string()
    }
}

/// Generate default routes when no routes in config
fn generate_default_routes_js(name: &str) -> String {
    format!(r#"// Health check
app.get('/health', (req, res) => {{
  res.json({{
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: '{name}'
  }});
}});

// Root
app.get('/', (req, res) => {{
  res.json({{
    name: '{name}',
    version: '0.1.0',
    description: 'Express API server'
  }});
}});"#,
        name = name
    )
}

/// Fallback code generation (direct from RouteConfig, no Expr eval)
fn generate_express_code_fallback(config: &BundleConfig) -> String {
    let name = &config.project_name;
    let port = "3000";
    
    let routes_code = if config.routes.is_empty() {
        generate_default_routes_js(name)
    } else {
        config.routes.iter().map(|route| {
            format!(r#"// {description}
app.{method}('{path}', (req, res) => {{
  res.json({{
    route: '{path}',
    handler: '{handler}',
    timestamp: new Date().toISOString(),
    service: '{name}'
  }});
}});"#,
                description = route.description,
                method = route.method.to_lowercase(),
                path = route.path,
                handler = route.handler,
                name = name
            )
        }).collect::<Vec<_>>().join("\n\n")
    };
    
    format!(r#"// phoenix: iu_id = "{}-api"
// Express API generated by Phoenix VCS
// Generated via: μ_config→code (Expr evaluation)

const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || {port};

// Middleware
app.use(cors());
app.use(express.json());

{routes_code}

// Start server
app.listen(PORT, () => {{
  console.log(`🚀 {name} API server running on port ${{PORT}}`);
}});
"#,
        name.to_lowercase().replace(" ", "-").replace("_", "-"),
        port = port,
        routes_code = routes_code,
        name = name
    )
}
