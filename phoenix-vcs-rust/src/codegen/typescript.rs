//! TypeScript code generator using panproto-parse

use super::*;
use panproto_schema::SchemaBuilder;

/// TypeScript code generator
pub struct TypeScriptGenerator {
    routes: Vec<RouteDef>,
    imports: Vec<ImportDef>,
}

struct RouteDef {
    method: String,
    path: String,
    body: Vec<Statement>,
}

struct ImportDef {
    path: String,
    items: Vec<String>,
}

impl TypeScriptGenerator {
    pub fn new() -> Self {
        Self {
            routes: vec![],
            imports: vec![],
        }
    }
}

impl CodeGenerator for TypeScriptGenerator {
    fn route(&mut self, method: &str, path: &str) -> RouteBuilder<'_, Self> {
        RouteBuilder {
            gen: self,
            method: method.to_string(),
            path: path.to_string(),
        }
    }
    
    fn import(&mut self, path: &str, items: &[&str]) -> &mut Self {
        self.imports.push(ImportDef {
            path: path.to_string(),
            items: items.iter().map(|s| s.to_string()).collect(),
        });
        self
    }
    
    fn generate(&self) -> Result<String, CodeGenError> {
        // For now, use format!() - but the structure is ready for panproto
        let mut code = String::new();
        
        // Add imports
        for imp in &self.imports {
            code.push_str(&format!(
                "import {{ {} }} from '{}';\n",
                imp.items.join(", "),
                imp.path
            ));
        }
        if !self.imports.is_empty() {
            code.push('\n');
        }
        
        // Add routes
        for route in &self.routes {
            code.push_str(&format!(
                "app.{}('{}', (c) => {{\n",
                route.method.to_lowercase(),
                route.path
            ));
            
            for stmt in &route.body {
                code.push_str(&stmt_to_ts(stmt, 1));
            }
            
            code.push_str("});\n\n");
        }
        
        Ok(code)
    }
}

fn stmt_to_ts(stmt: &Statement, indent: usize) -> String {
    let indent_str = "  ".repeat(indent);
    match stmt {
        Statement::Return(expr) => {
            format!("{}return {};\n", indent_str, expr_to_ts(expr))
        }
        Statement::Let(name, expr) => {
            format!("{}const {} = {};\n", indent_str, name, expr_to_ts(expr))
        }
        Statement::Expr(expr) => {
            format!("{}{};\n", indent_str, expr_to_ts(expr))
        }
    }
}

fn expr_to_ts(expr: &Expression) -> String {
    match expr {
        Expression::Ident(s) => s.clone(),
        Expression::String(s) => format!("'{}'", s),
        Expression::Number(n) => n.to_string(),
        Expression::Bool(b) => b.to_string(),
        Expression::Object(pairs) => {
            let fields: Vec<String> = pairs
                .iter()
                .map(|(k, v)| format!("{}: {}", k, expr_to_ts(v)))
                .collect();
            format!("{{ {} }}", fields.join(", "))
        }
        Expression::Member(obj, prop) => {
            format!("{}.{}(", expr_to_ts(obj), prop)
        }
        Expression::Call(func, args) => {
            let args_str: Vec<String> = args.iter().map(expr_to_ts).collect();
            format!("{}({})", expr_to_ts(func), args_str.join(", "))
        }
        Expression::Arrow(params, body) => {
            let params_str = params.join(", ");
            let body_str: Vec<String> = body.iter()
                .map(|s| stmt_to_ts(s, 0))
                .collect();
            format!("({}) => {{\n{}\n}}", params_str, body_str.join(""))
        }
    }
}

impl<'a> RouteBuilder<'a, TypeScriptGenerator> {
    /// Add a handler using a closure
    pub fn with_handler<F>(self, f: F) -> &'a mut TypeScriptGenerator
    where 
        F: Fn(&mut Handler)
    {
        let mut handler = Handler { stmts: vec![] };
        f(&mut handler);
        
        self.gen.routes.push(RouteDef {
            method: self.method,
            path: self.path,
            body: handler.stmts,
        });
        
        self.gen
    }
    
    /// Quick handler that just returns JSON
    pub fn returns_json(self, obj: Vec<(&str, Expression)>) -> &'a mut TypeScriptGenerator {
        let body = vec![Statement::Return(Expression::Object(
            obj.into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect()
        ))];
        
        self.gen.routes.push(RouteDef {
            method: self.method,
            path: self.path,
            body,
        });
        
        self.gen
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_typescript_codegen() {
        let mut gen = TypeScriptGenerator::new();
        
        gen.import("hono", &["Hono"])
           .route("GET", "/health")
           .returns_json(vec![
               ("status", Expression::String("ok".to_string())),
           ]);
        
        let code = gen.generate().unwrap();
        println!("Generated TypeScript:\n{}", code);
        
        assert!(code.contains("import { Hono } from 'hono';"));
        assert!(code.contains("app.get('/health'"));
        assert!(code.contains("status: 'ok'"));
    }
    
    #[test]
    fn test_with_handler_closure() {
        let mut gen = TypeScriptGenerator::new();
        
        gen.route("GET", "/api/users")
           .with_handler(|h| {
               h.return_json(vec![
                   ("route", Expression::String("/api/users".to_string())),
                   ("handler", Expression::String("listUsers".to_string())),
               ]);
           });
        
        let code = gen.generate().unwrap();
        println!("Generated with closure:\n{}", code);
        
        assert!(code.contains("app.get('/api/users'"));
        assert!(code.contains("route: '/api/users'"));
    }
}
