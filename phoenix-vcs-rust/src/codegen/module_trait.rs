//! Module Generator Trait
//!
//! All code generation modules implement this trait to provide
//! a consistent interface for generating code via emit_with_protocol.

use panproto_schema::{Protocol, SchemaBuilder};
use std::collections::HashMap;

/// Error type for module generation
#[derive(Debug)]
pub struct ModuleError(pub String);

impl std::fmt::Display for ModuleError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "ModuleError: {}", self.0)
    }
}

impl std::error::Error for ModuleError {}

/// Context passed to modules during generation
pub struct GenerationContext {
    /// Project root directory (for reading component source files)
    pub project_root: std::path::PathBuf,
    /// Output directory for generated files
    pub output_dir: std::path::PathBuf,
    /// Server configuration from spec.md
    pub server_config: ServerConfig,
    /// Component configurations from spec.md
    pub component_configs: HashMap<String, serde_json::Value>,
    /// Other parsed metadata from the spec
    pub metadata: HashMap<String, String>,
}

/// Server configuration extracted from spec.md
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub api_port: u16,
    pub vite_port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            api_port: 3000,
            vite_port: 5173,
        }
    }
}

/// Trait for all code generation modules
///
/// Each module (server, client, components, etc.) implements this
/// to provide its generation logic via emit_with_protocol.
pub trait ModuleGenerator {
    /// The name of this module (for logging/debugging)
    fn name(&self) -> &str;
    
    /// The protocol name to use (e.g., "typescript", "nickel", "json")
    fn protocol_name(&self) -> &str;
    
    /// The vertex kinds this module uses
    fn vertex_kinds(&self) -> Vec<String>;
    
    /// Generate code using the provided schema builder
    ///
    /// The implementation should:
    /// 1. Add vertices to the builder using `builder.vertex()`
    /// 2. Return the generated code as a string
    fn generate(&self, context: &GenerationContext) -> Result<String, ModuleError>;
}

/// A generic module that uses emit_with_protocol
pub struct EmitModule<F> {
    name: String,
    protocol: String,
    kinds: Vec<String>,
    generator: F,
}

impl<F> EmitModule<F>
where
    F: Fn(&GenerationContext, &mut SchemaBuilder) -> Result<(), String>,
{
    /// Create a new emit module
    pub fn new(
        name: &str,
        protocol: &str,
        kinds: Vec<String>,
        generator: F,
    ) -> Self {
        Self {
            name: name.to_string(),
            protocol: protocol.to_string(),
            kinds,
            generator,
        }
    }
    
    /// Generate code using emit_with_protocol
    pub fn generate_emit(&self, context: &GenerationContext) -> Result<String, ModuleError> {
        use crate::codegen::emit_bundle::{create_protocol, emit_schema};
        
        // Create protocol
        let protocol = create_protocol(&self.protocol, self.kinds.clone(), vec![])
            .map_err(|e| ModuleError(format!("Failed to create protocol: {}", e)))?;
        
        // Use SchemaBuilder directly
        let mut builder = SchemaBuilder::new(&protocol);
        
        // Let the generator add vertices
        (self.generator)(context, &mut builder)
            .map_err(|e| ModuleError(format!("Generation failed: {}", e)))?;
        
        // Build and emit
        let schema = builder.build()
            .map_err(|e| ModuleError(format!("Schema build failed: {}", e)))?;
        
        emit_schema(&schema, &self.protocol)
            .map_err(|e| ModuleError(format!("Emit failed: {}", e)))
    }
}

/// Orchestrator that runs multiple modules
pub struct GenerationOrchestrator {
    modules: Vec<Box<dyn ModuleGenerator>>,
}

impl GenerationOrchestrator {
    /// Create a new orchestrator
    pub fn new() -> Self {
        Self {
            modules: Vec::new(),
        }
    }
    
    /// Add a module to the pipeline
    pub fn add_module(mut self, module: Box<dyn ModuleGenerator>) -> Self {
        self.modules.push(module);
        self
    }
    
    /// Run all modules and return generated files
    pub fn generate_all(&self, context: &GenerationContext) -> Result<Vec<(String, String)>, ModuleError> {
        let mut results = Vec::new();
        
        for module in &self.modules {
            println!("   Generating: {}", module.name());
            let code = module.generate(context)?;
            results.push((module.name().to_string(), code));
        }
        
        Ok(results)
    }
}

impl Default for GenerationOrchestrator {
    fn default() -> Self {
        Self::new()
    }
}

/// Helper to create a TypeScript module
pub fn typescript_module<F>(
    name: &str,
    generator: F,
) -> EmitModule<F>
where
    F: Fn(&GenerationContext, &mut SchemaBuilder) -> Result<(), String>,
{
    let kinds = vec![
        "ImportDecl".to_string(),
        "VarDecl".to_string(),
        "RouteHandler".to_string(),
        "ExprStmt".to_string(),
        "ClassDecl".to_string(),
        "ExportDefault".to_string(),
    ];
    
    EmitModule::new(name, "typescript", kinds, generator)
}

/// Helper to create a Nickel module
pub fn nickel_module<F>(
    name: &str,
    generator: F,
) -> EmitModule<F>
where
    F: Fn(&GenerationContext, &mut SchemaBuilder) -> Result<(), String>,
{
    let kinds = vec![
        "comment".to_string(),
        "record".to_string(),
        "field".to_string(),
        "array".to_string(),
        "string".to_string(),
        "number".to_string(),
    ];
    
    EmitModule::new(name, "nickel", kinds, generator)
}

/// Helper to create a JSON module
pub fn json_module<F>(
    name: &str,
    generator: F,
) -> EmitModule<F>
where
    F: Fn(&GenerationContext, &mut SchemaBuilder) -> Result<(), String>,
{
    let kinds = vec![
        "Object".to_string(),
        "Pair".to_string(),
        "String".to_string(),
        "Array".to_string(),
        "Number".to_string(),
        "True".to_string(),
        "False".to_string(),
    ];
    
    EmitModule::new(name, "json", kinds, generator)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_server_config_default() {
        let config = ServerConfig::default();
        assert_eq!(config.host, "127.0.0.1");
        assert_eq!(config.api_port, 3000);
        assert_eq!(config.vite_port, 5173);
    }
}
