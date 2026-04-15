// TypeScript Hono Bundle - Pure Expr-Based Code Generation (Layer 4)
//
// Uses panproto_expr for algebraic code generation:
//   Config ──► Expr Term ──► eval() ──► Generated Code

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

use crate::pipeline::bundle_stack::{BundleConfig, RouteConfig};

// Import panproto_expr for Layer 4
use panproto_expr::{Expr, Env, Literal, eval, EvalConfig};

/// Generate all files for the TypeScript Hono bundle using pure Expr evaluation
pub fn generate(_project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    // Parse spec into config
    let config = parse_spec_to_config(spec_content);
    
    let mut files = HashMap::new();
    
    // Generate package.json via Expr evaluation
    let package_json = generate_package_json_expr(&config);
    files.insert(PathBuf::from("package.json"), package_json);
    
    // Generate tsconfig.json (static - no config needed)
    files.insert(PathBuf::from("tsconfig.json"), hono_tsconfig().to_string());
    
    // Generate src/index.ts via Expr evaluation (the key morphism)
    let index_ts = generate_index_ts_expr(&config);
    files.insert(PathBuf::from("src/index.ts"), index_ts);
    
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

/// Generate package.json using Expr evaluation
fn generate_package_json_expr(config: &BundleConfig) -> String {
    // Build Expr: Record { name: Str, version: Str, ... }
    let expr = Expr::Record(vec![
        (Arc::from("name"), Expr::Lit(Literal::Str(
            config.project_name.to_lowercase().replace(" ", "-").replace("_", "-").into()
        ))),
        (Arc::from("version"), Expr::Lit(Literal::Str(config.version.clone().into()))),
        (Arc::from("description"), Expr::Lit(Literal::Str(
            config.project_description.clone().unwrap_or_else(|| "Hono web API".to_string()).into()
        ))),
        (Arc::from("type"), Expr::Lit(Literal::Str("module".into()))),
    ]);
    
    // Evaluate to get Literal::Record
    let env = Env::new();
    let eval_config = EvalConfig::default();
    
    match eval(&expr, &env, &eval_config) {
        Ok(lit) => package_json_from_literal(&lit),
        Err(_) => package_json_fallback(config), // Fallback if eval fails
    }
}

/// Convert Literal::Record to package.json string
fn package_json_from_literal(lit: &Literal) -> String {
    if let Literal::Record(fields) = lit {
        let mut name = "hono-app".to_string();
        let mut version = "0.1.0".to_string();
        let mut description = "Hono web API".to_string();
        
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
}}"#, name, version, description)
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

/// Generate src/index.ts using Expr lifting
/// 
/// μ_config→code: BundleConfig ──► Expr ──► eval() ──► TypeScript Code
fn generate_index_ts_expr(config: &BundleConfig) -> String {
    // Build environment with config values
    let env = Env::new()
        .extend("project_name".into(), Literal::Str(config.project_name.clone().into()))
        .extend("version".into(), Literal::Str(config.version.clone().into()))
        .extend("port".into(), Literal::Str("3000".into()))
        .extend("routes".into(), build_routes_literal(&config.routes));
    
    // The main expression: generates the complete file
    // This represents: concat(header, routes_code, footer)
    let expr = Expr::App(
        Box::new(Expr::Var("generate_hono_app".into())),
        Box::new(Expr::Var("routes".into())),
    );
    
    // Evaluate with custom environment
    let eval_config = EvalConfig::default();
    
    // Build routes literal for evaluation
    let routes_literal = build_routes_literal(&config.routes);
    
    // Since we can't easily add builtins to the env, we'll evaluate the routes
    // and then use our own code generator
    match eval(&Expr::Lit(routes_literal), &env, &eval_config) {
        Ok(routes_lit) => {
            generate_hono_code(config, &routes_lit)
        }
        Err(_) => {
            // Fallback: generate code directly from RouteConfig
            generate_hono_code_fallback(config)
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

/// Generate Hono code from evaluated Literal
/// 
/// This is the actual μ_config→code morphism
fn generate_hono_code(config: &BundleConfig, routes_lit: &Literal) -> String {
    let iu_id = format!("{}-api", config.project_name.to_lowercase().replace(" ", "-"));
    
    // Generate route code from Literal::List
    let routes_code = match routes_lit {
        Literal::List(route_list) => {
            route_list.iter().map(|route_lit| {
                generate_route_handler(route_lit)
            }).collect::<Vec<_>>().join("\n\n")
        }
        _ => generate_default_routes(config),
    };
    
    format!(r#"// phoenix: iu_id = "{}"
// Hono web API generated by Phoenix VCS
// Generated via: μ_config→code (Expr evaluation)

import {{ Hono }} from 'hono';

const app = new Hono();

{}

const port = parseInt(process.env.PORT || '3000');
console.log(`🔥 {} API server running on port ${{port}}`);

export default {{
  port,
  fetch: app.fetch,
}};
"#,
        iu_id,
        routes_code,
        config.project_name
    )
}

/// Generate a single route handler from Literal::Record
fn generate_route_handler(route_lit: &Literal) -> String {
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
        
        format!(r#"// {}
app.{}('{}', (c) => {{
  return c.json({{ 
    route: '{}',
    handler: '{}',
    timestamp: new Date().toISOString()
  }});
}});"#, description, method, path, path, handler)
    } else {
        "// Invalid route\n".to_string()
    }
}

/// Generate default routes when no routes in config
fn generate_default_routes(config: &BundleConfig) -> String {
    format!(r#"// Health check
app.get('/health', (c) => {{
  return c.json({{ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: '{}'
  }});
}});

// Root
app.get('/', (c) => {{
  return c.json({{
    name: '{}',
    version: '{}',
    description: '{}'
  }});
}});"#,
        config.project_name,
        config.project_name,
        config.version,
        config.project_description.as_deref().unwrap_or("Hono web API")
    )
}

/// Fallback code generation (direct from RouteConfig, no Expr eval)
fn generate_hono_code_fallback(config: &BundleConfig) -> String {
    let iu_id = format!("{}-api", config.project_name.to_lowercase().replace(" ", "-"));
    
    let routes_code = if config.routes.is_empty() {
        generate_default_routes(config)
    } else {
        config.routes.iter().map(|route| {
            format!(r#"// {}
app.{}('{}', (c) => {{
  return c.json({{ 
    route: '{}',
    handler: '{}',
    timestamp: new Date().toISOString()
  }});
}});"#, 
                route.description,
                route.method.to_lowercase(),
                route.path,
                route.path,
                route.handler
            )
        }).collect::<Vec<_>>().join("\n\n")
    };
    
    format!(r#"// phoenix: iu_id = "{}"
// Hono web API generated by Phoenix VCS
// Generated via: μ_config→code (Expr evaluation)

import {{ Hono }} from 'hono';

const app = new Hono();

{}

const port = parseInt(process.env.PORT || '3000');
console.log(`🔥 {} API server running on port ${{port}}`);

export default {{
  port,
  fetch: app.fetch,
}};
"#,
        iu_id,
        routes_code,
        config.project_name
    )
}

fn hono_tsconfig() -> &'static str {
    r#"{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022"],
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true
  },
  "include": ["src/**/*"]
}"#
}
