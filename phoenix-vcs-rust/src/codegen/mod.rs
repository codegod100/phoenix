//! High-level Code Generation DSL for panproto-parse
//!
//! This trait provides a fluent API that abstracts away low-level Schema construction
//! while still producing full panproto Schemas for round-trip capable code generation.

pub mod capability_bundle;
pub mod capability_demo;
pub mod devenv;
pub mod emit_bundle;
pub mod typescript;

pub use typescript::TypeScriptGenerator;

/// High-level code generation trait
///
/// Implement this for each target language (TypeScript, Python, Rust, etc.)
/// The trait provides a fluent API that abstracts away the low-level
/// panproto Schema construction.
pub trait CodeGenerator {
    /// Add an HTTP route handler
    fn route(&mut self, method: &str, path: &str) -> RouteBuilder<'_, Self> 
    where 
        Self: Sized;
    
    /// Add an import statement
    fn import(&mut self, path: &str, items: &[&str]) -> &mut Self;
    
    /// Generate the final code
    fn generate(&self) -> Result<String, CodeGenError>;
}

/// Builder for route handlers
pub struct RouteBuilder<'a, G: CodeGenerator + ?Sized> {
    pub(crate) gen: &'a mut G,
    pub(crate) method: String,
    pub(crate) path: String,
}

/// A statement in a handler body
#[derive(Debug, Clone)]
pub enum Statement {
    /// Return a value
    Return(Expression),
    /// Declare a variable
    Let(String, Expression),
    /// Expression as statement
    Expr(Expression),
}

/// An expression
#[derive(Debug, Clone)]
pub enum Expression {
    /// Identifier
    Ident(String),
    /// String literal
    String(String),
    /// Number literal
    Number(f64),
    /// Boolean literal
    Bool(bool),
    /// Object literal
    Object(Vec<(String, Expression)>),
    /// Member access (obj.property)
    Member(Box<Expression>, String),
    /// Function call
    Call(Box<Expression>, Vec<Expression>),
    /// Arrow function
    Arrow(Vec<String>, Vec<Statement>),
}

/// Handler body builder
pub struct Handler {
    pub(crate) stmts: Vec<Statement>,
}

impl Handler {
    /// Add a return statement with a JSON object
    pub fn return_json(&mut self, pairs: Vec<(&str, Expression)>) {
        let obj = Expression::Object(
            pairs.into_iter()
                .map(|(k, v)| (k.to_string(), v))
                .collect()
        );
        self.stmts.push(Statement::Return(obj));
    }
    
    /// Add an expression statement
    pub fn call(&mut self, expr: Expression) {
        self.stmts.push(Statement::Expr(expr));
    }
}

/// Error type for code generation
#[derive(Debug)]
pub struct CodeGenError(pub String);

impl std::fmt::Display for CodeGenError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "CodeGenError: {}", self.0)
    }
}

impl std::error::Error for CodeGenError {}
