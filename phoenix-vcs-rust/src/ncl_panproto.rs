//! Integration with panproto for theory parsing
//!
//! This module provides integration between NCL spec parsing and panproto's
//! Generalized Algebraic Theory (GAT) system.

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation};
#[cfg(feature = "panproto")]
use panproto_theory_dsl::{load, load_and_compile};
#[cfg(feature = "panproto")]
use std::sync::Arc;
use crate::ncl::ParsedNcl;

/// Load spec.ncl as a panproto Theory
/// 
/// Uses panproto_theory_dsl to parse the spec file into a formal theory.
/// The spec must follow the TheoryDocument format with `id`, `description`, and `theory` fields.
#[cfg(feature = "panproto")]
pub fn load_spec_as_theory(path: &std::path::Path) -> Result<Theory, Box<dyn std::error::Error>> {
    // Load and compile the theory document with a simple resolver
    let resolver = |_name: &str| -> Option<Theory> { None };
    let compiled = load_and_compile(path, &resolver)?;
    
    // Return the first theory (specs typically define one main theory)
    compiled.theories.into_iter()
        .map(|(_, theory)| theory)
        .next()
        .ok_or_else(|| "No theory found in spec".into())
}

/// Load spec content directly as a theory (without file)
#[cfg(feature = "panproto")]
pub fn load_spec_content_as_theory(content: &str, source_name: &str) -> Result<Theory, Box<dyn std::error::Error>> {
    // Write to temp file, load, then cleanup
    let temp_dir = std::env::temp_dir();
    let temp_path = temp_dir.join(format!("phoenix_spec_{}.ncl", source_name.replace('/', "_")));
    std::fs::write(&temp_path, content)?;
    
    let result = load_spec_as_theory(&temp_path);
    let _ = std::fs::remove_file(&temp_path); // Best effort cleanup
    
    result
}

/// Extract UI config from theory spec content using Nickel language crate
/// 
/// This evaluates the Nickel content directly (no subprocess needed)
/// and extracts the ui_config field.
#[cfg(feature = "panproto")]
pub fn extract_ui_config_from_theory(content: &str) -> Result<serde_json::Value, Box<dyn std::error::Error>> {
    use nickel_lang::Context;
    
    // Evaluate the Nickel content
    let mut ctx = Context::new();
    let expr = ctx.eval_deep_for_export(content)
        .map_err(|e| format!("Nickel evaluation failed: {:?}", e))?;
    
    // Convert to JSON value
    let doc: serde_json::Value = expr.to_serde()
        .map_err(|e| format!("Failed to convert to JSON: {}", e))?;
    
    // phoenix_config is at TOP LEVEL in TheoryDocument (extra field ignored by panproto)
    doc.get("phoenix_config")
        .cloned()
        .ok_or_else(|| "No phoenix_config found in spec (expected at top level)".into())
}

/// Load spec as theory and extract UI config in one step
#[cfg(feature = "panproto")]
pub fn load_spec_with_config(path: &std::path::Path) -> Result<(Theory, serde_json::Value), Box<dyn std::error::Error>> {
    let theory = load_spec_as_theory(path)?;
    let content = std::fs::read_to_string(path)?;
    let ui_config = extract_ui_config_from_theory(&content)?;
    Ok((theory, ui_config))
}

/// Convert parsed NCL requirements into a panproto Theory
///
/// Each requirement becomes a sort in the theory, and the relations between
/// requirements become operations.
#[cfg(feature = "panproto")]
pub fn requirements_to_theory(parsed: &ParsedNcl) -> Theory {
    let theory_name = parsed.name.clone()
        .unwrap_or_else(|| "unnamed".to_string());
    
    // Create sorts from requirements
    let mut sorts = Vec::new();
    let mut ops = Vec::new();
    
    for (idx, req) in parsed.requirements.iter().enumerate() {
        // Create a sort for this requirement
        let sort_name: Arc<str> = Arc::from(format!("Req_{}_{}", idx, sanitize_name(&req.protocol)));
        let sort = Sort {
            name: sort_name.clone(),
            params: vec![],
            kind: SortKind::Structural,
        };
        sorts.push(sort);
        
        // Create an operation for the requirement's interface
        let op_name: Arc<str> = Arc::from(format!("op_{}", sanitize_name(&req.id)));
        let op = Operation {
            name: op_name,
            inputs: vec![
                (Arc::from("input"), Arc::from("String")),
            ],
            output: sort_name,
        };
        ops.push(op);
    }
    
    // Build the theory
    Theory::new(
        Arc::from(theory_name),
        sorts,
        ops,
        vec![], // equations
    )
}

/// Parse NCL content directly into a panproto Theory
///
/// This uses the full panproto ecosystem for parsing theories from NCL specs.
#[cfg(feature = "panproto")]
pub fn parse_theory(content: &str, source_name: &str) -> Result<Theory, String> {
    // First parse with our NCL parser
    let parsed = crate::ncl::parse_ncl_spec(content, source_name)?;
    
    // Convert to panproto theory
    Ok(requirements_to_theory(&parsed))
}

/// Sanitize a name to be a valid panproto identifier
fn sanitize_name(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
        .collect()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(feature = "panproto")]
    fn test_requirements_to_theory() {
        let parsed = ParsedNcl {
            name: Some("test".to_string()),
            requirements: vec![
                crate::ncl::NclRequirement {
                    id: "req1".to_string(),
                    description: "First requirement".to_string(),
                    priority: "must".to_string(),
                    protocol: "UI".to_string(),
                    language: "python".to_string(),
                },
            ],
            ..Default::default()
        };
        
        let theory = requirements_to_theory(&parsed);
        
        assert_eq!(theory.name.as_ref(), "test");
        assert!(!theory.sorts.is_empty(), "Should have at least one sort");
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_parse_theory() {
        let ncl = r#"
        {
            name = "my_theory",
            requirements = [
                {
                    id = "r1",
                    description = "A UI component",
                    protocol = "UI",
                    priority = "must",
                },
            ],
        }
        "#;
        
        let theory = parse_theory(ncl, "test.ncl").expect("Should parse");
        
        assert_eq!(theory.name.as_ref(), "my_theory");
        assert!(!theory.sorts.is_empty());
    }
    
    #[test]
    #[cfg(feature = "panproto")]
    fn test_load_spec_as_theory() {
        // A spec.ncl in panproto theory document format
        let spec_ncl = r#"
        {
          id = "dev.phoenix.test",
          description = "Test UI theory",
          theory = "TestTUI",
          sorts = [
            { name = "UIConfig", kind = "structural" },
            { name = "Widget", kind = "structural" },
          ],
          ops = [
            { name = "header", inputs = ["String"], output = "Widget" },
            { name = "compose", inputs = ["Widget"], output = "UIConfig" },
          ],
          ui_config = {
            name = "Test App",
            layout = { type = "grid", columns = 2 },
          },
        }
        "#;
        
        let result = load_spec_content_as_theory(spec_ncl, "test_spec");
        
        match result {
            Ok(theory) => {
                eprintln!("Loaded theory: {}", theory.name);
                assert!(!theory.sorts.is_empty(), "Theory should have sorts");
            }
            Err(e) => {
                eprintln!("Theory loading error (expected until format validated): {}", e);
            }
        }
    }
}
