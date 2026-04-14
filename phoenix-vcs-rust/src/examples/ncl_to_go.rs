//! NCL to Go Function Converter
//!
//! Demonstrates parsing Nickel (NCL) function definitions
//! and converting them to equivalent Go code.
//!
//! NCL syntax: fun <params> => <body>
//! Go syntax: func <name>(<params>) <return> { <body> }

/// Represents an NCL function extracted from a spec
#[derive(Debug, Clone)]
pub struct NclFunction {
    pub name: String,
    pub params: Vec<String>,
    pub body: String,
    pub doc: String,
    pub return_type: String,
}

/// Represents a Go function generated from NCL
#[derive(Debug, Clone)]
pub struct GoFunction {
    pub name: String,
    pub params: Vec<GoParam>,
    pub body: String,
    pub doc: String,
    pub return_type: String,
}

/// A Go function parameter with name and type
#[derive(Debug, Clone)]
pub struct GoParam {
    pub name: String,
    pub go_type: String,
}

/// Convert NCL type annotation to Go type
pub fn ncl_type_to_go(ncl_type: &str) -> String {
    match ncl_type {
        "int" | "integer" | "Number" => "int".to_string(),
        "float" | "Float" => "float64".to_string(),
        "string" | "String" => "string".to_string(),
        "bool" | "Bool" => "bool".to_string(),
        t if t.starts_with("func(") => t.to_string(),
        t if t.starts_with("Array ") => {
            let inner = &t[6..];
            format!("[]{}", ncl_type_to_go(inner.trim()))
        }
        _ => "interface{}".to_string(),
    }
}

/// Convert NCL expression to Go expression
pub fn ncl_expr_to_go(expr: &str) -> String {
    let mut go_expr = expr.to_string();
    
    // Replace Nickel operators with Go equivalents
    let replacements = [
        ("++", " + "),         // String concatenation
        ("==", " == "),        // Equality
        ("!=", " != "),        // Not equal
        ("&&", " && "),        // And
        ("||", " || "),        // Or
        ("not ", "!"),         // Not
    ];
    
    for (from, to) in &replacements {
        go_expr = go_expr.replace(from, to);
    }
    
    // Handle Nickel's 'then'/'else' -> Go if statement
    if go_expr.contains("if ") {
        go_expr = convert_if_expression(&go_expr);
    }
    
    // Normalize function calls: factorial (n - 1) -> factorial(n - 1)
    go_expr = go_expr.replace(" (", "(");
    
    // Handle array.foldl -> custom helper
    if go_expr.contains("array.foldl") {
        go_expr = format!("/* TODO: Convert foldl: {} */", go_expr);
    }
    
    go_expr
}

/// Convert Nickel if-then-else to Ternary helper call
fn convert_if_expression(expr: &str) -> String {
    let parts: Vec<&str> = expr.splitn(2, "if ").collect();
    if parts.len() < 2 {
        return expr.to_string();
    }
    
    let after_if = parts[1];
    let then_parts: Vec<&str> = after_if.splitn(2, " then ").collect();
    if then_parts.len() < 2 {
        return expr.to_string();
    }
    
    let cond = then_parts[0].trim();
    let else_parts: Vec<&str> = then_parts[1].splitn(2, " else ").collect();
    if else_parts.len() < 2 {
        return expr.to_string();
    }
    
    let then_val = else_parts[0].trim();
    let else_val = else_parts[1].trim();
    
    format!("Ternary({}, {}, {})", cond, then_val, else_val)
}

/// Infer parameter type from context
fn infer_param_type(param: &str, body: &str) -> String {
    if param == "name" || param == "s" || param.contains("str") {
        "string".to_string()
    } else if param == "arr" || param.starts_with("array") {
        "[]int".to_string()
    } else if body.contains(&format!("{} % 2", param)) {
        "int".to_string()
    } else {
        "int".to_string()
    }
}

/// Convert snake_case to camelCase for Go naming
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
                    Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
                }
            }
        })
        .collect()
}

/// Convert an NCL function definition to Go
pub fn ncl_fn_to_go(ncl_fn: &NclFunction) -> GoFunction {
    let params: Vec<GoParam> = ncl_fn.params.iter().map(|p| {
        let go_type = infer_param_type(p, &ncl_fn.body);
        GoParam {
            name: snake_to_camel(p),
            go_type,
        }
    }).collect();
    
    let body = ncl_expr_to_go(&ncl_fn.body);
    let return_type = ncl_type_to_go(&ncl_fn.return_type);
    
    GoFunction {
        name: snake_to_camel(&ncl_fn.name),
        params,
        body,
        doc: ncl_fn.doc.clone(),
        return_type,
    }
}

/// Generate Go source code from a GoFunction
pub fn generate_go_code(func: &GoFunction) -> String {
    let mut lines = Vec::new();
    
    lines.push(format!("// {} {}", func.name, func.doc));
    
    let params_str = func.params.iter()
        .map(|p| format!("{} {}", p.name, p.go_type))
        .collect::<Vec<_>>()
        .join(", ");
    
    lines.push(format!("func {}({}) {} {{", func.name, params_str, func.return_type));
    
    if func.body.contains("Ternary(") {
        let body = convert_ternary_to_if(&func.body);
        for line in body.lines() {
            lines.push(format!("    {}", line));
        }
    } else if func.body.starts_with("/* TODO") {
        lines.push(format!("    {}", func.body));
        lines.push("    panic(\"Not implemented\")".to_string());
    } else {
        lines.push(format!("    return {}", func.body));
    }
    
    lines.push("}".to_string());
    lines.push(String::new());
    
    lines.join("\n")
}

/// Convert Ternary() helper to Go if statement
fn convert_ternary_to_if(body: &str) -> String {
    let prefix = "Ternary(";
    if let Some(start) = body.find(prefix) {
        let inner = &body[start + prefix.len()..body.len()-1];
        let parts: Vec<&str> = inner.splitn(3, ", ").collect();
        if parts.len() == 3 {
            let cond = parts[0];
            let then_val = parts[1];
            let else_val = parts[2];
            
            return format!(
                "if {} {{
    return {}
}}
return {}",
                cond, then_val, else_val
            );
        }
    }
    format!("return {}", body)
}

/// Generate a complete Go source file from multiple functions
pub fn generate_go_file(package_name: &str, funcs: &[GoFunction]) -> String {
    let mut lines = Vec::new();
    
    lines.push(format!("package {}", package_name));
    lines.push(String::new());
    
    lines.push("// Ternary simulates a ternary operator since Go doesn't have one".to_string());
    lines.push("func Ternary[T any](cond bool, thenVal T, elseVal T) T {".to_string());
    lines.push("    if cond {".to_string());
    lines.push("        return thenVal".to_string());
    lines.push("    }".to_string());
    lines.push("    return elseVal".to_string());
    lines.push("}".to_string());
    lines.push(String::new());
    
    for func in funcs {
        lines.push(generate_go_code(func));
    }
    
    lines.join("\n")
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ncl_type_to_go() {
        assert_eq!(ncl_type_to_go("int"), "int");
        assert_eq!(ncl_type_to_go("string"), "string");
        assert_eq!(ncl_type_to_go("bool"), "bool");
        assert_eq!(ncl_type_to_go("Array int"), "[]int");
    }

    #[test]
    fn test_snake_to_camel() {
        assert_eq!(snake_to_camel("add"), "add");
        assert_eq!(snake_to_camel("is_even"), "isEven");
        assert_eq!(snake_to_camel("sum_array"), "sumArray");
    }

    #[test]
    fn test_add_function_conversion() {
        let ncl_fn = NclFunction {
            name: "add".to_string(),
            params: vec!["a".to_string(), "b".to_string()],
            body: "a + b".to_string(),
            doc: "Add two integers".to_string(),
            return_type: "int".to_string(),
        };
        
        let go_fn = ncl_fn_to_go(&ncl_fn);
        
        assert_eq!(go_fn.name, "add");
        assert_eq!(go_fn.params.len(), 2);
        assert_eq!(go_fn.params[0].name, "a");
        assert_eq!(go_fn.params[0].go_type, "int");
        assert_eq!(go_fn.return_type, "int");
    }

    #[test]
    fn test_max_function_conversion() {
        let ncl_fn = NclFunction {
            name: "max".to_string(),
            params: vec!["x".to_string(), "y".to_string()],
            body: "if x > y then x else y".to_string(),
            doc: "Return the maximum".to_string(),
            return_type: "int".to_string(),
        };
        
        let go_fn = ncl_fn_to_go(&ncl_fn);
        let code = generate_go_code(&go_fn);
        
        assert!(code.contains("func max(x int, y int) int {"));
        assert!(code.contains("if x > y {"));
    }
}
