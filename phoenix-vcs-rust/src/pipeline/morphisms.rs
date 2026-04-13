//! Formal panproto morphisms for code generation
//!
//! This module integrates panproto's GAT (Generalized Algebraic Theory) system
//! with Phoenix's NCL spec parsing to enable formal, verifiable code generation
//! via TheoryMorphisms.

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, TheoryMorphism};
#[cfg(feature = "panproto")]
use std::collections::HashMap;
#[cfg(feature = "panproto")]
use std::sync::Arc;
use crate::ncl::ParsedNcl;

/// A formal morphism from NCL specs to code
///
/// This wraps panproto's TheoryMorphism with Phoenix-specific
/// metadata for code generation.
#[derive(Debug, Clone)]
pub struct CodeMorphism {
    /// The underlying panproto theory morphism
    #[cfg(feature = "panproto")]
    pub morphism: TheoryMorphism,
    /// Target language (python, rust, etc.)
    pub target_language: String,
    /// Output file path
    pub output_path: String,
    /// Generated code content
    pub code: Option<String>,
}

/// Create a theory morphism from NCL requirements to code
///
/// This creates a formal mapping between the "Requirement" sorts
/// in the NCL theory and the "Code" sorts in the target language theory.
#[cfg(feature = "panproto")]
pub fn create_ncl_to_code_morphism(
    ncl_theory: &Theory,
    target_lang: &str,
) -> anyhow::Result<TheoryMorphism> {
    // Domain: NCL theory (with Requirement sorts)
    // Codomain: Code theory (with Code, Function, Class sorts)
    
    let codomain_name = format!("{}_code", target_lang);
    
    // Build sort mapping: Requirement → CodeUnit
    let mut sort_map = HashMap::new();
    for sort in &ncl_theory.sorts {
        if sort.name.starts_with("Req_") {
            // Map requirement sorts to code units
            sort_map.insert(
                Arc::clone(&sort.name),
                Arc::from("CodeUnit"),
            );
        }
    }
    
    // Build operation mapping: op_req_* → generate_code
    let mut op_map = HashMap::new();
    for op in &ncl_theory.ops {
        if op.name.starts_with("op_") {
            // Map requirement operations to code generation
            op_map.insert(
                Arc::clone(&op.name),
                Arc::from("generate_code"),
            );
        }
    }
    
    let morphism = TheoryMorphism::new(
        format!("ncl_to_{}", target_lang),
        Arc::clone(&ncl_theory.name),
        Arc::from(codomain_name),
        sort_map,
        op_map,
    );
    
    Ok(morphism)
}

/// Generate code using formal theory morphism
///
/// This applies the theory morphism to transform requirements
/// into code structure, then uses LLM to fill in implementation.
#[cfg(feature = "panproto")]
pub fn generate_with_morphism(
    parsed: &ParsedNcl,
    target_lang: &str,
    _llm_config: &crate::llm::LlmConfig,
) -> anyhow::Result<Vec<CodeMorphism>> {
    let theory = parsed.to_panproto_theory();
    let morphism = create_ncl_to_code_morphism(&theory, target_lang)?;
    
    let mut results = Vec::new();
    
    // Each requirement becomes a code morphism
    for req in &parsed.requirements {
        let code_morphism = CodeMorphism {
            morphism: morphism.clone(),
            target_language: target_lang.to_string(),
            output_path: format!("src/{}.py", sanitize_filename(&req.id)),
            code: None,
        };
        results.push(code_morphism);
    }
    
    Ok(results)
}

/// Sanitize a string for use as a filename
fn sanitize_filename(name: &str) -> String {
    name.chars()
        .map(|c| if c.is_alphanumeric() || c == '_' { c } else { '_' })
        .collect::<String>()
        .to_lowercase()
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(feature = "panproto")]
    fn test_create_morphism() {
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
        
        let theory = parsed.to_panproto_theory();
        let morphism = create_ncl_to_code_morphism(&theory, "python")
            .expect("Should create morphism");
        
        assert_eq!(morphism.domain.as_ref(), "test");
        assert_eq!(morphism.codomain.as_ref(), "python_code");
        assert!(!morphism.sort_map.is_empty(), "Should have sort mappings");
    }
}
