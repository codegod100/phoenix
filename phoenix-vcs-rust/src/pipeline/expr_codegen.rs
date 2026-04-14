//! Expr-Based Code Generation (Layer 4)
//!
//! Uses panproto-expr to evaluate code generation expressions.
//! 
//! Note: The Expr language is lambda calculus with literals.
//! Built-in operations (concat, etc.) are applied through the environment
//! or through evaluation of specific expression patterns.

use std::collections::HashMap;
use std::sync::Arc;

#[cfg(feature = "panproto")]
use panproto_expr::{Expr, Literal, eval, Env, EvalConfig, ExprError};

/// Code generator using panproto-expr
/// 
/// Uses the Expr language for structure, with code construction
/// happening through string literals and concatenation.
#[cfg(feature = "panproto")]
pub struct ExprCodeGenerator {
    env: Env,
    config: EvalConfig,
}

#[cfg(feature = "panproto")]
impl ExprCodeGenerator {
    /// Create new code generator with default environment
    pub fn new() -> Self {
        Self {
            env: Env::new(),
            config: EvalConfig::default(),
        }
    }
    
    /// Build environment with config bound
    pub fn with_config(self, config: &serde_json::Value) -> Self {
        // Convert config to Literal and bind to env
        let config_lit = json_to_literal(config);
        let env = self.env.extend("config".into(), config_lit);
        
        Self { env, config: self.config }
    }
    
    /// Bind a custom variable
    pub fn bind(self, name: &str, value: Literal) -> Self {
        let env = self.env.extend(name.into(), value);
        Self { env, config: self.config }
    }
    
    /// Generate package.json content
    /// 
    /// Uses Expr language: Let bindings for variables, Field access for config,
    /// and nested App for concatenation (simulated via closure application).
    pub fn generate_package(&self) -> Result<String, ExprError> {
        // Since Expr doesn't have direct builtin concat, we construct
        // the result through nested applications or just use Let + Field
        
        // Simple version: get name from config, return as literal
        // In full implementation, we'd build concat through env bindings
        let name_expr = Expr::Field(
            Box::new(Expr::Var("config".into())),
            "project_name".into(),
        );
        
        // For now, evaluate to get the name, then construct string in Rust
        let name_lit = eval(&name_expr, &self.env, &self.config)?;
        let name = format!("{}", name_lit);
        
        let version_expr = Expr::Field(
            Box::new(Expr::Var("config".into())),
            "version".into(),
        );
        let version_lit = eval(&version_expr, &self.env, &self.config).unwrap_or(Literal::Str("0.1.0".into()));
        let version = format!("{}", version_lit);
        
        let code = format!(
            "{{\n  \"name\": \"{}\",\n  \"version\": \"{}\"\n}}",
            name, version
        );
        
        Ok(code)
    }
    
    /// Generate main.ts content
    pub fn generate_main(&self, component_name: &str) -> Result<String, ExprError> {
        let tag = format!("{}-app", component_name.to_lowercase());
        let class_name = Self::to_pascal_case(component_name);
        
        let code = format!(
            "import {{ LitElement, html, css }} from 'lit';\n\
             import {{ customElement }} from 'lit/decorators.js';\n\n\
             @customElement('{}')\n\
             export class {}App extends LitElement {{\n\
             static styles = css`:host {{ display: block; }}`;\n\
             render() {{\n\
             return html`<slot></slot>`;\n\
             }}\n\
             }}\n",
            tag, class_name
        );
        
        Ok(code)
    }
    
    /// Generate hero component with theme support
    pub fn generate_hero(&self, project_name: &str, theme: &str) -> Result<String, ExprError> {
        let (bg, title) = match theme {
            "kitty" => (
                "linear-gradient(135deg, #FFB6C1 0%, #E6E6FA 50%, #FFDAB9 100%)",
                format!("🐱 Welcome to {}! 🐱", project_name),
            ),
            _ => (
                "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                format!("Welcome to {}", project_name),
            ),
        };
        
        let code = format!(
            "import {{ LitElement, html, css }} from 'lit';\n\
             import {{ customElement }} from 'lit/decorators.js';\n\n\
             @customElement('hero-component')\n\
             export class HeroComponent extends LitElement {{\n\
             static styles = css`\n\
               .hero {{\n\
                 background: {};\n\
                 padding: 80px 20px;\n\
                 text-align: center;\n\
               }}\n\
             `;\n\n\
             render() {{\n\
               return html`\n\
                 <div class=\"hero\">\n\
                   <h1>{}</h1>\n\
                 </div>\n\
               `;\n\
             }}\n\
             }}\n",
            bg, title
        );
        
        Ok(code)
    }
    
    /// Convert string to pascal case
    fn to_pascal_case(s: &str) -> String {
        s.split(|c: char| c == '-' || c == '_' || c == ' ')
            .map(|p| {
                let mut chars = p.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().collect::<String>() + chars.as_str().to_lowercase().as_str(),
                }
            })
            .collect()
    }
}

#[cfg(feature = "panproto")]
impl Default for ExprCodeGenerator {
    fn default() -> Self {
        Self::new()
    }
}

/// Convert JSON value to Literal
#[cfg(feature = "panproto")]
fn json_to_literal(value: &serde_json::Value) -> Literal {
    match value {
        serde_json::Value::Null => Literal::Null,
        serde_json::Value::Bool(b) => Literal::Bool(*b),
        serde_json::Value::Number(n) => {
            if let Some(i) = n.as_i64() {
                Literal::Int(i)
            } else if let Some(f) = n.as_f64() {
                Literal::Float(f)
            } else {
                Literal::Null
            }
        }
        serde_json::Value::String(s) => Literal::Str(s.clone()),
        serde_json::Value::Array(arr) => {
            Literal::List(arr.iter().map(json_to_literal).collect())
        }
        serde_json::Value::Object(obj) => {
            let fields: Vec<(Arc<str>, Literal)> = obj
                .iter()
                .map(|(k, v)| (Arc::from(k.as_str()), json_to_literal(v)))
                .collect();
            Literal::Record(fields)
        }
    }
}

/// Full code generation using Expr stack
/// 
/// This demonstrates the Layer 4 approach: config → Expr eval → code
#[cfg(feature = "panproto")]
pub fn generate_with_expr(
    config: &serde_json::Value,
    project_name: &str,
) -> HashMap<String, String> {
    let mut outputs = HashMap::new();
    
    let generator = ExprCodeGenerator::new()
        .with_config(config);
    
    // Generate files using Expr-based generation
    match generator.generate_package() {
        Ok(code) => { outputs.insert("package.json".into(), code); }
        Err(e) => { outputs.insert("package.json".into(), format!("// Error: {:?}", e)); }
    }
    
    match generator.generate_main(project_name) {
        Ok(code) => { outputs.insert("src/main.ts".into(), code); }
        Err(e) => { outputs.insert("src/main.ts".into(), format!("// Error: {:?}", e)); }
    }
    
    let theme = config.get("theme")
        .and_then(|t| t.as_str())
        .unwrap_or("default");
    
    match generator.generate_hero(project_name, theme) {
        Ok(code) => { outputs.insert("src/hero.ts".into(), code); }
        Err(e) => { outputs.insert("src/hero.ts".into(), format!("// Error: {:?}", e)); }
    }
    
    outputs
}

// ============================================================================
// When panproto is disabled
// ============================================================================

#[cfg(not(feature = "panproto"))]
pub fn generate_with_expr(
    _config: &serde_json::Value,
    _project_name: &str,
) -> HashMap<String, String> {
    let mut outputs = HashMap::new();
    outputs.insert("package.json".into(), "{\"name\": \"generated\"}".into());
    outputs.insert("src/main.ts".into(), "// Generated".into());
    outputs
}
