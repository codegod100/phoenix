//! Generic module-based code generation using emit_with_protocol
//!
//! This module provides generic functions for reading module source files
//! and generating output using panproto schema emitters.
//!
//! NO APP-SPECIFIC CODE should be here - only generic helpers for:
//! - Reading component files
//! - Building schemas
//! - Emitting code

use std::collections::HashMap;
use std::path::Path;
use crate::codegen::emit_bundle::{EmitBuilder, emit_schema};
use panproto_schema::Protocol;

/// Read a component source file and return its contents
pub fn read_component_source(project_root: &Path, component_name: &str) -> anyhow::Result<String> {
    let comp_path = project_root
        .join("components")
        .join(component_name.replace("-", "-").to_lowercase())
        .join("component.ts");
    
    std::fs::read_to_string(&comp_path)
        .map_err(|e| anyhow::anyhow!("Failed to read component {:?}: {}", comp_path, e))
}

/// Read a module source file
pub fn read_module_source(project_root: &Path, module_name: &str, file_name: &str) -> anyhow::Result<String> {
    let source_path = project_root
        .join("modules")
        .join(module_name)
        .join(file_name);
    
    std::fs::read_to_string(&source_path)
        .map_err(|e| anyhow::anyhow!("Failed to read module source {:?}: {}", source_path, e))
}

/// Generate code by reading component files and wrapping them in a schema
///
/// This is a generic helper - it doesn't know about specific components,
/// it just reads the files and emits them using the provided protocol.
pub fn generate_from_components(
    protocol: &Protocol,
    project_root: &Path,
    component_names: &[String],
    wrapper_template: &str,
) -> anyhow::Result<String> {
    let mut b = EmitBuilder::new(protocol, "generated");
    
    // Read and add each component
    let mut combined_components = String::new();
    for comp_name in component_names {
        match read_component_source(project_root, comp_name) {
            Ok(content) => {
                combined_components.push_str(&content);
                combined_components.push('\n');
            }
            Err(e) => {
                eprintln!("Warning: {}", e);
            }
        }
    }
    
    // Add the combined components as a single vertex
    if !combined_components.is_empty() {
        b = b.vertex("components", "ClassDecl", Some(&combined_components))
            .map_err(|e| anyhow::anyhow!(e))?;
    }
    
    // Add wrapper/app container if provided
    if !wrapper_template.is_empty() {
        b = b.vertex("app", "ClassDecl", Some(wrapper_template))
            .map_err(|e| anyhow::anyhow!(e))?;
    }
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

/// Convert kebab-case to PascalCase
pub fn pascal_case(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
            }
        })
        .collect()
}

/// Convert kebab-case to camelCase
pub fn camel_case(s: &str) -> String {
    let pascal = pascal_case(s);
    let mut chars = pascal.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_lowercase().collect::<String>() + chars.as_str(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_pascal_case() {
        assert_eq!(pascal_case("todo-list"), "TodoList");
        assert_eq!(pascal_case("welcome-card"), "WelcomeCard");
        assert_eq!(pascal_case("elena-app"), "ElenaApp");
    }
    
    #[test]
    fn test_camel_case() {
        assert_eq!(camel_case("todo-list"), "todoList");
        assert_eq!(camel_case("welcome-card"), "welcomeCard");
    }
}
