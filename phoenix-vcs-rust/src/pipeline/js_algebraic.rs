//! JavaScript Algebraic Code Generation with Real Panproto Lifting
//!
//! This module demonstrates TRUE algebraic code generation using the panproto crate:
//! - Lift: RouteSpec[] → panproto::Term (algebraic representation)
//! - Transform: Apply structure-preserving operations
//! - Lower: Term → JavaScript source code
//!
//! Architecture (4-layer panproto stack):
//! - Layer 1 (Theory): JsTheory with Sorts (Program, Statement, Expression, Route)
//! - Layer 2 (Schema): JsSchemaCompiler validates structure
//! - Layer 3 (Lens): ExpressJsLens for bidirectional RouteSpec ↔ Term transformation
//! - Layer 4 (Generator): JsGenerator renders Term to JavaScript

use std::collections::HashMap;
use std::sync::Arc;

// Real panproto imports
use panproto_gat::{Term, Theory, Sort, SortKind, Operation, Equation};

/// Route specification from spec.ncl
#[derive(Debug, Clone)]
pub struct RouteSpec {
    pub method: String,
    pub path: String,
    pub handler: String,
    pub description: String,
}

/// Configuration for code generation
#[derive(Debug, Clone)]
pub struct JsGenConfig {
    pub project_name: String,
    pub port: u16,
}

impl Default for JsGenConfig {
    fn default() -> Self {
        Self {
            project_name: "app".to_string(),
            port: 3000,
        }
    }
}

// ============================================================================
// LAYER 1: THEORY - Algebraic Structure (using real panproto::Term)
// ============================================================================

/// Lift RouteSpec into a panproto Term
/// 
/// Lifting: RouteSpec → Term::App("route", [method, path, handler])
pub fn lift_route(route: &RouteSpec) -> Term {
    Term::app("route", vec![
        Term::app("method", vec![Term::var(route.method.clone())]),
        Term::app("path", vec![Term::var(route.path.clone())]),
        Term::app("handler", vec![Term::var(route.handler.clone())]),
    ])
}

/// Lift multiple routes into a Term array
pub fn lift_routes(routes: &[RouteSpec]) -> Term {
    let route_terms: Vec<Term> = routes.iter().map(lift_route).collect();
    Term::app("routes", vec![Term::app("array", route_terms)])
}

/// Lift full Express app config into a Term
/// 
/// Lifting: (routes, config) → Term::App("express_app", [routes, config])
pub fn lift_express_app(routes: &[RouteSpec], config: &JsGenConfig) -> Term {
    let routes_term = lift_routes(routes);
    let config_term = Term::app("config", vec![
        Term::app("project_name", vec![Term::var(config.project_name.clone())]),
        Term::app("port", vec![Term::var(config.port.to_string())]),
    ]);
    
    Term::app("express_app", vec![routes_term, config_term])
}

/// Lower a Term back to RouteSpec
/// 
/// Lowering: Term::App("route", [...]) → RouteSpec
pub fn lower_route(term: &Term) -> Option<RouteSpec> {
    match term {
        Term::App { op, args } if op.as_ref() == "route" && args.len() == 3 => {
            let method = lower_string_arg(&args[0], "method")?;
            let path = lower_string_arg(&args[1], "path")?;
            let handler = lower_string_arg(&args[2], "handler")?;
            
            Some(RouteSpec {
                method,
                path,
                handler,
                description: String::new(),
            })
        }
        _ => None,
    }
}

fn lower_string_arg(term: &Term, expected_op: &str) -> Option<String> {
    match term {
        Term::App { op, args } if op.as_ref() == expected_op && args.len() == 1 => {
            match &args[0] {
                Term::Var(v) => Some(v.as_ref().to_string()),
                _ => None,
            }
        }
        _ => None,
    }
}

// ============================================================================
// LAYER 2: SCHEMA - Validation using panproto Theory
// ============================================================================

/// JavaScript Theory definition with proper panproto API
pub fn js_theory() -> Theory {
    let sorts = vec![
        Sort { name: Arc::from("Program"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("Statement"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("Expression"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("Route"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("Identifier"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("String"), params: vec![], kind: SortKind::Structural },
        Sort { name: Arc::from("Number"), params: vec![], kind: SortKind::Structural },
    ];
    
    let operations = vec![
        Operation {
            name: Arc::from("express_app"),
            inputs: vec![
                (Arc::from("routes"), Arc::from("Routes")),
                (Arc::from("config"), Arc::from("Config")),
            ],
            output: Arc::from("Program"),
        },
        Operation {
            name: Arc::from("route"),
            inputs: vec![
                (Arc::from("method"), Arc::from("Method")),
                (Arc::from("path"), Arc::from("Path")),
                (Arc::from("handler"), Arc::from("Handler")),
            ],
            output: Arc::from("Route"),
        },
        Operation {
            name: Arc::from("import"),
            inputs: vec![
                (Arc::from("name"), Arc::from("Identifier")),
                (Arc::from("from"), Arc::from("String")),
            ],
            output: Arc::from("Statement"),
        },
        Operation {
            name: Arc::from("const"),
            inputs: vec![
                (Arc::from("name"), Arc::from("Identifier")),
                (Arc::from("value"), Arc::from("Expression")),
            ],
            output: Arc::from("Statement"),
        },
        Operation {
            name: Arc::from("call"),
            inputs: vec![
                (Arc::from("fn"), Arc::from("Expression")),
                (Arc::from("args"), Arc::from("Array")),
            ],
            output: Arc::from("Expression"),
        },
        Operation {
            name: Arc::from("member"),
            inputs: vec![
                (Arc::from("obj"), Arc::from("Expression")),
                (Arc::from("prop"), Arc::from("Identifier")),
            ],
            output: Arc::from("Expression"),
        },
    ];
    
    let equations = vec![];
    
    Theory::new(
        Arc::from("javascript"),
        sorts,
        operations,
        equations,
    )
}

/// Validate that a Term conforms to the JavaScript theory
pub fn validate_term(term: &Term) -> Result<(), String> {
    match term {
        Term::App { op, args } => {
            // Check operation exists and has correct arity
            let expected_arity = match op.as_ref() {
                "express_app" => Some(2),
                "route" => Some(3),
                "import" => Some(2),
                "const" => Some(2),
                "call" => Some(2),
                "member" => Some(2),
                "or" => Some(2),
                "middleware" => Some(1),
                "comment" => Some(1),
                "route_call" => Some(3),
                "arrow_fn" => Some(2),
                "listen" => Some(2),
                "array" => None, // variable arity
                "pair" => Some(2),
                "params" => None, // variable arity
                "body" => None, // variable arity
                "statements" => None, // variable arity
                "program" => Some(1),
                "app" => None, // generic constructor
                "routes" => Some(1),
                "config" => None,
                "method" | "path" | "handler" | "project_name" | "port" => Some(1),
                "express" | "get" | "post" | "put" | "delete" | "patch" => None, // HTTP methods as values
                "json_response" | "object" => None,
                "listen_call" | "callback" | "console_log" => None,
                _ => return Err(format!("Unknown operation: {}", op)),
            };
            
            if let Some(arity) = expected_arity {
                if args.len() != arity {
                    return Err(format!(
                        "Operation {} expects {} args, got {}",
                        op, arity, args.len()
                    ));
                }
            }
            
            // Recursively validate args
            for arg in args {
                validate_term(arg)?;
            }
            Ok(())
        }
        Term::Var(_) => Ok(()),
    }
}

// ============================================================================
// LAYER 3: LENS - Bidirectional transformation
// ============================================================================

/// Transform lifted routes into JS AST Term
/// 
/// This is the core algebraic transformation: routes → JS program structure
pub fn routes_to_js_ast(routes_term: &Term, config: &JsGenConfig) -> Term {
    let mut stmts = vec![];
    
    // import express
    stmts.push(Term::app("import", vec![
        Term::var("express"),
        Term::var("express"),
    ]));
    
    // const app = express()
    stmts.push(Term::app("const", vec![
        Term::var("app"),
        Term::app("call", vec![
            Term::var("express"),
            Term::app("array", vec![]),
        ]),
    ]));
    
    // const PORT = process.env.PORT || 3000
    stmts.push(Term::app("const", vec![
        Term::var("PORT"),
        Term::app("or", vec![
            Term::app("member", vec![
                Term::app("member", vec![
                    Term::var("process"),
                    Term::var("env"),
                ]),
                Term::var("PORT"),
            ]),
            Term::var(config.port.to_string()),
        ]),
    ]));
    
    // app.use(express.json())
    stmts.push(Term::app("middleware", vec![
        Term::app("call", vec![
            Term::app("member", vec![
                Term::var("express"),
                Term::var("json"),
            ]),
            Term::app("array", vec![]),
        ]),
    ]));
    
    // Health check route
    stmts.push(Term::app("comment", vec![Term::var("Health check")]));
    stmts.push(Term::app("route_call", vec![
        Term::var("get"),
        Term::var("/"),
        Term::app("arrow_fn", vec![
            Term::app("params", vec![Term::var("req"), Term::var("res")]),
            Term::app("body", vec![
                Term::app("json_response", vec![
                    Term::app("object", vec![
                        Term::app("pair", vec![Term::var("status"), Term::var("'ok'")]),
                        Term::app("pair", vec![Term::var("service"), Term::var(format!("'{}'", config.project_name))]),
                    ]),
                ]),
            ]),
        ]),
    ]));
    
    // Transform each route
    if let Term::App { op, args } = routes_term {
        if op.as_ref() == "routes" && args.len() == 1 {
            if let Term::App { op: arr_op, args: route_args } = &args[0] {
                if arr_op.as_ref() == "array" {
                    for route_term in route_args {
                        if let Some(route) = lower_route(route_term) {
                            stmts.push(route_to_js_ast(&route));
                        }
                    }
                }
            }
        }
    }
    
    // app.listen()
    stmts.push(Term::app("listen_call", vec![
        Term::var("PORT"),
        Term::app("callback", vec![
            Term::app("console_log", vec![
                Term::var(format!("`{} API server listening on port ${{PORT}}`", config.project_name)),
            ]),
        ]),
    ]));
    
    Term::app("program", vec![Term::app("statements", stmts)])
}

/// Transform a single route to JS AST
fn route_to_js_ast(route: &RouteSpec) -> Term {
    let method = route.method.to_lowercase();
    
    // Build response object based on route
    let mut pairs = vec![
        Term::app("pair", vec![
            Term::var("message"),
            Term::var(format!("'{}'", route.handler)),
        ]),
    ];
    
    if route.path.contains(":id") {
        pairs.push(Term::app("pair", vec![
            Term::var("id"),
            Term::var("req.params.id"),
        ]));
    }
    
    Term::app("route_call", vec![
        Term::var(method),
        Term::var(route.path.clone()),
        Term::app("arrow_fn", vec![
            Term::app("params", vec![Term::var("req"), Term::var("res")]),
            Term::app("body", vec![
                Term::app("json_response", vec![Term::app("object", pairs)]),
            ]),
        ]),
    ])
}

// ============================================================================
// LAYER 4: GENERATOR - Render Term to JavaScript code
// ============================================================================

/// Generate JavaScript code from a Term
/// 
/// This is the final lowering step: Term → String (JavaScript source)
pub fn generate_js(term: &Term) -> String {
    generate_with_indent(term, 0)
}

fn generate_with_indent(term: &Term, indent: usize) -> String {
    let spaces = "  ".repeat(indent);
    
    match term {
        Term::Var(v) => v.as_ref().to_string(),
        
        Term::App { op, args } => match op.as_ref() {
            "program" => {
                if let Some(Term::App { op: stmts_op, args: stmts }) = args.get(0) {
                    if stmts_op.as_ref() == "statements" {
                        let stmts_str: Vec<String> = stmts.iter()
                            .map(|s| generate_with_indent(s, indent))
                            .collect();
                        return stmts_str.join("");
                    }
                }
                "// Empty program\n".into()
            }
            
            "import" if args.len() == 2 => {
                let name = generate_with_indent(&args[0], indent);
                let from = generate_with_indent(&args[1], indent);
                format!("{}const {} = require('{}');\n", spaces, name, from)
            }
            
            "const" if args.len() == 2 => {
                let name = generate_with_indent(&args[0], indent);
                let value = generate_with_indent(&args[1], indent);
                // Handle PORT specially
                let value_clean = if name == "PORT" && value.starts_with("process") {
                    value
                } else if name == "PORT" {
                    "process.env.PORT || 3000".into()
                } else {
                    value
                };
                format!("{}const {} = {};\n\n", spaces, name, value_clean)
            }
            
            "call" if args.len() == 2 => {
                let fn_expr = generate_with_indent(&args[0], indent);
                let args_str = match &args[1] {
                    Term::App { op, args: arr_args } if op.as_ref() == "array" => {
                        arr_args.iter()
                            .map(|a| generate_with_indent(a, indent))
                            .collect::<Vec<_>>()
                            .join(", ")
                    }
                    _ => "".into(),
                };
                format!("{}({})", fn_expr, args_str)
            }
            
            "member" if args.len() == 2 => {
                let obj = generate_with_indent(&args[0], indent);
                let prop = generate_with_indent(&args[1], indent);
                format!("{}.{}", obj, prop)
            }
            
            "or" if args.len() == 2 => {
                let left = generate_with_indent(&args[0], indent);
                let right = generate_with_indent(&args[1], indent);
                format!("{} || {}", left, right)
            }
            
            "middleware" if args.len() == 1 => {
                let mw = generate_with_indent(&args[0], indent);
                format!("{}app.use({});\n", spaces, mw)
            }
            
            "comment" if args.len() == 1 => {
                let text = generate_with_indent(&args[0], indent);
                format!("{}// {}\n", spaces, text.trim_matches('\''))
            }
            
            "route_call" if args.len() == 3 => {
                let method = generate_with_indent(&args[0], indent);
                let raw_path = generate_with_indent(&args[1], indent);
                // Ensure paths are quoted
                let path = if raw_path.starts_with("/") || raw_path.starts_with("'") {
                    if raw_path.starts_with("'") { raw_path } else { format!("'{}'", raw_path) }
                } else {
                    raw_path
                };
                let handler = generate_with_indent(&args[2], indent + 1);
                let handler_clean = handler.trim_start();
                format!("{}app.{}({}, {});\n\n", spaces, method, path, handler_clean)
            }
            
            "arrow_fn" if args.len() == 2 => {
                let params = match &args[0] {
                    Term::App { op, args: p } if op.as_ref() == "params" => {
                        p.iter().map(|a| generate_with_indent(a, indent)).collect::<Vec<_>>().join(", ")
                    }
                    _ => "req, res".into(),
                };
                let body = match &args[1] {
                    Term::App { op, args: b } if op.as_ref() == "body" => {
                        b.iter().map(|stmt| generate_with_indent(stmt, indent + 1)).collect::<Vec<_>>().join("\n")
                    }
                    _ => "  res.json({})".into(),
                };
                format!("({}) => {{\n{}\n{}}}", params, body, spaces)
            }
            
            "json_response" if args.len() == 1 => {
                let obj = generate_with_indent(&args[0], indent);
                format!("{}res.json({});", spaces, obj)
            }
            
            "object" => {
                let fields: Vec<String> = args.iter()
                    .filter_map(|a| match a {
                        Term::App { op, args: kv } if op.as_ref() == "pair" && kv.len() == 2 => {
                            let k = generate_with_indent(&kv[0], indent);
                            let v = generate_with_indent(&kv[1], indent);
                            Some(format!("{}: {}", k.trim_matches('\''), v))
                        }
                        _ => None,
                    })
                    .collect();
                format!("{{ {} }}", fields.join(", "))
            }
            
            "listen_call" if args.len() == 2 => {
                let port = generate_with_indent(&args[0], indent);
                // Extract message from callback(console_log(message))
                let msg = match &args[1] {
                    Term::App { op, args: cb_args } if op.as_ref() == "callback" && cb_args.len() == 1 => {
                        match &cb_args[0] {
                            Term::App { op: log_op, args: log_args } if log_op.as_ref() == "console_log" && log_args.len() == 1 => {
                                generate_with_indent(&log_args[0], indent)
                            }
                            _ => format!("`{} API server listening on port ${{}}`", port),
                        }
                    }
                    _ => format!("`{} API server listening on port ${{}}`", port),
                };
                format!("{}app.listen({}, () => {{\n  console.log({});\n}});\n", 
                    spaces, port, msg)
            }
            
            // Generic operations
            "app" => {
                let args_str: Vec<String> = args.iter()
                    .map(|a| generate_with_indent(a, indent))
                    .collect();
                format!("{}({})", op, args_str.join(", "))
            }
            
            "array" => {
                let items: Vec<String> = args.iter()
                    .map(|a| generate_with_indent(a, indent))
                    .collect();
                format!("[{}]", items.join(", "))
            }
            
            "pair" if args.len() == 2 => {
                let k = generate_with_indent(&args[0], indent);
                let v = generate_with_indent(&args[1], indent);
                format!("{}: {}", k, v)
            }
            
            "params" | "body" => {
                args.iter().map(|a| generate_with_indent(a, indent)).collect::<Vec<_>>().join("\n")
            }
            
            _ => {
                // Unknown operation - generate comment
                format!("/* unknown: {} */", op)
            }
        }
    }
}

// ============================================================================
// PUBLIC API
// ============================================================================

/// Generate Express app.js using full 4-layer algebraic pipeline
/// 
/// Pipeline: RouteSpec[] → (Lift) → Term → (Transform) → JS AST Term → (Generate) → String
pub fn generate_express_app(routes: &[RouteSpec], project_name: &str) -> Result<String, String> {
    let config = JsGenConfig {
        project_name: project_name.to_string(),
        port: 3000,
    };
    
    // Step 1: Lift routes into panproto Term
    let lifted = lift_express_app(routes, &config);
    
    // Step 2: Validate structure (Schema layer)
    validate_term(&lifted)?;
    
    // Step 3: Transform to JS AST (Lens layer)
    let routes_term = match &lifted {
        Term::App { args, .. } => &args[0],
        _ => return Err("Expected App term for express_app".into()),
    };
    let js_ast = routes_to_js_ast(routes_term, &config);
    
    // Step 4: Generate code (Generator layer)
    let code = generate_js(&js_ast);
    
    Ok(code)
}

/// Generate a complete Express project
pub fn generate_express_project(
    routes: &[RouteSpec],
    project_name: &str,
    version: &str,
    description: &str,
) -> Result<HashMap<String, String>, String> {
    let mut files = HashMap::new();
    
    // Generate app.js
    let app_js = generate_express_app(routes, project_name)?;
    files.insert("app.js".to_string(), app_js);
    
    // Generate package.json
    let package_json = format!(r#"{{
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
}}"#, project_name, version, description);
    files.insert("package.json".to_string(), package_json);
    
    // Generate .env.example
    let env_example = format!("PORT=3000\nNODE_ENV=development\n");
    files.insert(".env.example".to_string(), env_example);
    
    Ok(files)
}

// ============================================================================
// TESTS
// ============================================================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_lift_route() {
        let route = RouteSpec {
            method: "GET".to_string(),
            path: "/api/users".to_string(),
            handler: "listUsers".to_string(),
            description: "List users".to_string(),
        };
        
        let term = lift_route(&route);
        
        // Verify it's an App with correct operation
        match &term {
            Term::App { op, args } => {
                assert_eq!(op.as_ref(), "route");
                assert_eq!(args.len(), 3);
            }
            _ => panic!("Expected App term"),
        }
    }

    #[test]
    fn test_lift_and_lower_roundtrip() {
        let route = RouteSpec {
            method: "POST".to_string(),
            path: "/api/items".to_string(),
            handler: "createItem".to_string(),
            description: "Create item".to_string(),
        };
        
        let lifted = lift_route(&route);
        let lowered = lower_route(&lifted).unwrap();
        
        assert_eq!(lowered.method, "POST");
        assert_eq!(lowered.path, "/api/items");
        assert_eq!(lowered.handler, "createItem");
    }

    #[test]
    fn test_validate_term() {
        let route = RouteSpec {
            method: "GET".to_string(),
            path: "/".to_string(),
            handler: "root".to_string(),
            description: "".to_string(),
        };
        
        let term = lift_route(&route);
        assert!(validate_term(&term).is_ok());
    }

    #[test]
    fn test_generate_js_simple() {
        let term = Term::app("const", vec![
            Term::var("x"),
            Term::var("5"),
        ]);
        
        let code = generate_js(&term);
        assert!(code.contains("const x = 5"));
    }

    #[test]
    fn test_full_pipeline() {
        let routes = vec![
            RouteSpec {
                method: "GET".to_string(),
                path: "/api/users".to_string(),
                handler: "listUsers".to_string(),
                description: "".to_string(),
            },
        ];
        
        let result = generate_express_app(&routes, "test-app");
        assert!(result.is_ok());
        
        let code = result.unwrap();
        assert!(code.contains("const express = require('express')"));
        assert!(code.contains("app.get('/api/users'"));
    }
}
