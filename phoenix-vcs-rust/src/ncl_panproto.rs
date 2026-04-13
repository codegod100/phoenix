//! Integration with panproto for theory parsing
//!
//! This module provides integration between NCL spec parsing and panproto's
//! Generalized Algebraic Theory (GAT) system.

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation};
#[cfg(feature = "panproto")]
use std::sync::Arc;
use crate::ncl::ParsedNcl;

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
}
