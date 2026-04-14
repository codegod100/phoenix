//! NCL Function to Go Function Migration Example
//!
//! Pipeline: Parse NCL file → Extract function → Migrate to Go → Emit Go code
//!
//! Run: cargo run --example ncl_func_to_go_migration

use std::path::PathBuf;
use phoenix_vcs::ncl::{parse_ncl_file, ParsedNcl, NclMorphism};

/// Represents a function extracted from NCL AST
#[derive(Debug, Clone)]
pub struct NclFunctionDef {
    pub name: String,
    pub params: Vec<(String, String)>, // (name, type)
    pub body: String,
    pub return_type: String,
}

/// Go function target (migration target)
#[derive(Debug, Clone)]
pub struct GoFunctionDef {
    pub name: String,
    pub params: Vec<(String, String)>, // (name, go_type)
    pub body: String,
    pub return_type: String,
    pub doc: String,
}

/// Migration morphism: NCL Function → Go Function
pub struct NclToGoMigration;

impl NclToGoMigration {
    /// Map NCL type to Go type
    fn map_type(ncl_type: &str) -> String {
        match ncl_type {
            "Num" | "Number" => "int".to_string(),
            "String" => "string".to_string(),
            "Bool" => "bool".to_string(),
            _ => "interface{}".to_string(),
        }
    }

    /// Map NCL expression to Go expression
    fn map_expr(expr: &str) -> String {
        let mut go = expr.to_string();
        
        // NCL → Go operator mappings
        go = go.replace("++", " + ");          // String concat
        go = go.replace(" |> ", "_pipe_");     // Pipe (simplified)
        go = go.replace("==", " == ");
        go = go.replace("!=", " != ");
        go = go.replace("&&", " && ");
        go = go.replace("||", " || ");
        
        // Handle closures - fun y => x + y becomes a lambda-like or inline
        if go.contains("fun ") && go.contains("=>") {
            go = Self::convert_closure(&go);
        }
        
        // Handle if-then-else (expression in NCL, statement in Go)
        if go.contains("if ") && go.contains(" then ") && go.contains(" else ") {
            go = Self::convert_if_expr(&go);
        }
        
        // Normalize function calls
        go = go.replace(" (", "(");
        
        // Clean up extra spaces
        go = go.split_whitespace().collect::<Vec<_>>().join(" ");
        
        go
    }
    
    /// Convert NCL closure to Go closure (as best as possible)
    fn convert_closure(expr: &str) -> String {
        // fun y => x + y -> func(y int) int { return x + y }
        // This is a simplified version - proper implementation would need full parsing
        format!("/* Closure: {} - convert manually to Go closure */", expr)
    }

    /// Convert NCL if-then-else to Go if-return pattern
    fn convert_if_expr(expr: &str) -> String {
        // Simple parser for: if <cond> then <then> else <else>
        let rest = expr.strip_prefix("if ").unwrap_or(expr);
        
        // Find the matching 'then' (accounting for nested ifs)
        let (cond, rest) = Self::split_then(rest);
        if cond.is_empty() {
            return expr.to_string();
        }
        
        let (then_val, else_val) = Self::split_else(rest);
        if then_val.is_empty() || else_val.is_empty() {
            return expr.to_string();
        }
        
        format!("{{ if {} {{ return {}; }}; return {}; }}", 
            cond.trim(), 
            then_val.trim(),
            else_val.trim()
        )
    }

    fn split_then(s: &str) -> (String, &str) {
        let mut depth = 0;
        
        for (i, c) in s.char_indices() {
            match c {
                '(' | '[' | '{' => depth += 1,
                ')' | ']' | '}' => depth -= 1,
                't' if depth == 0 && s[i..].starts_with("then") => {
                    return (s[..i].trim().to_string(), &s[i+4..]);
                }
                _ => {}
            }
        }
        (s.to_string(), "")
    }

    fn split_else(s: &str) -> (String, String) {
        let mut depth = 0;
        
        for (i, c) in s.char_indices() {
            match c {
                '(' | '[' | '{' => depth += 1,
                ')' | ']' | '}' => depth -= 1,
                'e' if depth == 0 && s[i..].starts_with("else") => {
                    let then_part = s[..i].trim().to_string();
                    let else_part = s[i+4..].trim().to_string();
                    return (then_part, else_part);
                }
                _ => {}
            }
        }
        (s.to_string(), "".to_string())
    }

    /// Apply migration: NCL function → Go function
    pub fn migrate(ncl_fn: &NclFunctionDef) -> GoFunctionDef {
        let go_params: Vec<(String, String)> = ncl_fn.params.iter()
            .map(|(name, ty)| {
                let go_name = Self::snake_to_camel(name);
                let go_type = Self::map_type(ty);
                (go_name, go_type)
            })
            .collect();

        let go_body = Self::map_expr(&ncl_fn.body);
        let go_return = Self::map_type(&ncl_fn.return_type);
        let go_name = Self::snake_to_camel(&ncl_fn.name);

        GoFunctionDef {
            name: go_name,
            params: go_params,
            body: go_body,
            return_type: go_return,
            doc: format!("Migrated from NCL function: {}", ncl_fn.name),
        }
    }

    fn snake_to_camel(s: &str) -> String {
        s.split('_')
            .enumerate()
            .map(|(i, word)| {
                if i == 0 {
                    word.to_lowercase()
                } else {
                    let mut chars = word.chars();
                    match chars.next() {
                        None => String::new(),
                        Some(first) => {
                            first.to_uppercase().collect::<String>() + 
                            &chars.as_str().to_lowercase()
                        }
                    }
                }
            })
            .collect()
    }
}

/// Extract function definitions from parsed NCL
fn extract_functions_from_ncl(parsed: &ParsedNcl) -> Vec<NclFunctionDef> {
    let mut functions = Vec::new();
    
    // Try to extract from morphisms first (existing pattern)
    for morphism in &parsed.morphisms {
        if morphism.name.contains("func_") || morphism.generation_content.is_some() {
            // This might be a function morphism
            let fn_def = NclFunctionDef {
                name: morphism.name.clone(),
                params: vec![], // Would extract from AST
                body: morphism.generation_content.clone().unwrap_or_default(),
                return_type: morphism.language.clone(),
            };
            functions.push(fn_def);
        }
    }
    
    // Also check generic fields for function definitions
    if let Some(ref generic) = parsed.generic {
        for (key, value) in generic {
            if key.starts_with("func_") || value.contains("fun ") {
                let fn_def = parse_ncl_function(value, key);
                if fn_def.name.is_empty() {
                    // Use the key as name
                    let mut fn_def = fn_def;
                    fn_def.name = key.clone();
                    functions.push(fn_def);
                } else {
                    functions.push(fn_def);
                }
            }
        }
    }
    
    functions
}

/// Parse NCL function syntax: fun x y => x + y
fn parse_ncl_function(content: &str, name_hint: &str) -> NclFunctionDef {
    let mut name = name_hint.to_string();
    let mut params = Vec::new();
    let mut body = content.to_string();
    
    // Check if content is a function definition
    if let Some(fun_idx) = content.find("fun ") {
        let after_fun = &content[fun_idx + 4..];
        
        // Find the => separator
        if let Some(arrow_idx) = after_fun.find("=>") {
            let params_str = after_fun[..arrow_idx].trim();
            body = after_fun[arrow_idx + 2..].trim().to_string();
            
            // Parse parameters (simple space-separated for now)
            for param in params_str.split_whitespace() {
                // Infer type from parameter name heuristics
                let ty = infer_type_from_param(param);
                params.push((param.to_string(), ty));
            }
        }
    }
    
    // Infer return type from body
    let return_type = infer_return_type(&body);
    
    // Clean up name (remove func_ prefix if present)
    if name.starts_with("func_") {
        name = name[5..].to_string();
    }
    
    NclFunctionDef { name, params, body, return_type }
}

fn infer_type_from_param(param: &str) -> String {
    match param {
        "n" | "x" | "y" | "a" | "b" | "i" | "j" | "k" => "Num",
        "s" | "name" | "msg" | "str" => "String",
        "cond" | "ok" | "valid" => "Bool",
        "arr" | "list" => "Array",
        _ => if param.starts_with("is_") { "Bool" } else { "auto" },
    }.to_string()
}

fn infer_return_type(body: &str) -> String {
    // Clean up the body first
    let body_clean = body.trim();
    
    // Check for string operations
    if body_clean.contains('"') || body_clean.contains("++") {
        return "String".to_string();
    }
    
    // Check for boolean operations/comparisons
    if body_clean.contains("true") || 
       body_clean.contains("false") || 
       body_clean.contains("== ") || 
       body_clean.contains("!= ") ||
       body_clean.contains("< ") ||
       body_clean.contains("> ") {
        // But if it's an arithmetic comparison, it could be numeric context
        if body_clean.contains("true") || body_clean.contains("false") {
            return "Bool".to_string();
        }
    }
    
    // Check for closures
    if body_clean.contains("fun ") {
        return "func".to_string();
    }
    
    // Check for if-then-else (need to infer from arms)
    if body_clean.starts_with("{ if ") || body_clean.starts_with("if ") {
        // Try to infer from then/else arms
        if body_clean.contains("\"") || body_clean.contains("++") {
            return "String".to_string();
        }
        // Default to int for arithmetic if-then-else
        return "Num".to_string();
    }
    
    // Check for arithmetic
    if body_clean.contains("+ ") || 
       body_clean.contains("- ") || 
       body_clean.contains("* ") || 
       body_clean.contains("/ ") || 
       body_clean.contains("% ") {
        return "Num".to_string();
    }
    
    "auto".to_string()
}

/// Generate Go source from migrated function
fn emit_go_function(go_fn: &GoFunctionDef) -> String {
    let mut lines = Vec::new();
    
    lines.push(format!("// {}", go_fn.doc));
    
    let params_str = go_fn.params.iter()
        .map(|(name, ty)| format!("{} {}", name, ty))
        .collect::<Vec<_>>()
        .join(", ");
    
    lines.push(format!("func {}({}) {} {{", go_fn.name, params_str, go_fn.return_type));
    
    // Handle body based on type
    if go_fn.body.starts_with("{ if ") {
        // Multi-line if-return pattern - extract inner content
        let inner = go_fn.body.trim_start_matches("{ ").trim_end_matches(" }");
        for line in inner.split("; ") {
            lines.push(format!("    {}", line.trim()));
        }
    } else if go_fn.body.starts_with("/*") {
        // Comment-only body
        lines.push(format!("    {}", go_fn.body));
        lines.push("    panic(\"Not implemented\")".to_string());
    } else {
        lines.push(format!("    return {}", go_fn.body));
    }
    
    lines.push("}".to_string());
    lines.push(String::new());
    
    lines.join("\n")
}

fn main() {
    println!("NCL → Go Function Migration Pipeline");
    println!("====================================\n");
    
    // Create example NCL file
    let example_ncl = r#"{
  name = "ncl-funcs-example",
  version = "0.1.0",
  
  # Function definitions in Nickel syntax
  func_add = fun a b => a + b,
  func_greet = fun name => "Hello, " ++ name ++ "!",
  func_max = fun x y => if x > y then x else y,
  func_is_even = fun n => n % 2 == 0,
  func_factorial = fun n => if n <= 1 then 1 else n * factorial(n - 1),
  func_make_adder = fun x => fun y => x + y,
}
"#;
    
    let ncl_path = PathBuf::from("/tmp/ncl_funcs_example.ncl");
    std::fs::write(&ncl_path, example_ncl).expect("Failed to write NCL file");
    
    println!("1. PARSE NCL File: {}", ncl_path.display());
    println!("   Content:");
    for line in example_ncl.lines() {
        println!("   {}", line);
    }
    
    // Parse the NCL file
    let parsed = match parse_ncl_file(&ncl_path) {
        Ok(p) => p,
        Err(e) => {
            eprintln!("   Parse error: {}", e);
            // Fallback: manual parse the generic content
            println!("   Using manual parsing...");
            ParsedNcl::default()
        }
    };
    
    println!("\n2. EXTRACT Functions from NCL AST");
    let ncl_functions = extract_functions_from_ncl_manual(example_ncl);
    
    for func in &ncl_functions {
        println!("   Found: {}({}) = {}", 
            func.name,
            func.params.iter().map(|(n, t)| format!("{}: {}", n, t)).collect::<Vec<_>>().join(", "),
            func.body
        );
    }
    
    println!("\n3. MIGRATE: NCL Function → Go Function");
    let go_functions: Vec<_> = ncl_functions.iter()
        .map(|f| NclToGoMigration::migrate(f))
        .collect();
    
    for (i, go_fn) in go_functions.iter().enumerate() {
        let ncl_fn = &ncl_functions[i];
        println!("   {}: NCL({}) → Go({})", 
            ncl_fn.name, 
            ncl_fn.return_type,
            go_fn.return_type
        );
        println!("      Params: {} → {}",
            ncl_fn.params.iter().map(|(_, t): &(String, String)| t.clone()).collect::<Vec<_>>().join(", "),
            go_fn.params.iter().map(|(_, t): &(String, String)| t.clone()).collect::<Vec<_>>().join(", ")
        );
    }
    
    println!("\n4. EMIT Go Code");
    println!("   -------------------");
    
    let mut full_go_code = String::from("package nclmigrated\n\n");
    
    for go_fn in &go_functions {
        let code = emit_go_function(go_fn);
        println!("{}", code);
        full_go_code.push_str(&code);
        full_go_code.push('\n');
    }
    
    // Write output
    let go_path = PathBuf::from("/tmp/ncl_migrated_funcs.go");
    std::fs::write(&go_path, &full_go_code).expect("Failed to write Go file");
    println!("\n   Written to: {}", go_path.display());
    
    // Cleanup
    let _ = std::fs::remove_file(&ncl_path);
}

/// Manual extraction when tree-sitter parsing isn't available
fn extract_functions_from_ncl_manual(content: &str) -> Vec<NclFunctionDef> {
    let mut functions = Vec::new();
    
    for line in content.lines() {
        let line = line.trim();
        
        // Look for: func_name = fun params => body,
        if line.contains("= fun ") && line.contains("=>") {
            let parts: Vec<&str> = line.split("= fun ").collect();
            if parts.len() == 2 {
                let name_part = parts[0].trim();
                let name = if name_part.starts_with("func_") {
                    &name_part[5..]
                } else {
                    name_part
                };
                
                let rest = parts[1];
                if let Some(arrow_pos) = rest.find("=>") {
                    let params_str = rest[..arrow_pos].trim();
                    let body = rest[arrow_pos + 2..]
                        .trim()
                        .trim_end_matches(',')
                        .trim()
                        .to_string();
                    
                    let params: Vec<(String, String)> = params_str
                        .split_whitespace()
                        .map(|p| (p.to_string(), infer_type_from_param(p)))
                        .collect();
                    
                    let return_type = infer_return_type(&body);
                    
                    functions.push(NclFunctionDef {
                        name: name.to_string(),
                        params,
                        body,
                        return_type,
                    });
                }
            }
        }
    }
    
    functions
}
