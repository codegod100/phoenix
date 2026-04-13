//! Formal Template Bridge — Connecting GAT theories to template rendering
//!
//! This module provides theory morphisms that transform ImplementationUnits
//! into template variable bindings, with equations that validate the
//! rendered output satisfies the IU contract.
//!
//! The key morphism: μ_template: ThIU → ThTemplateVars
//! Maps: IU → {name: String, title: String, widgets: [...], ...}

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation, TheoryMorphism, Term, Equation};
#[cfg(feature = "panproto")]
use std::collections::HashMap;
#[cfg(feature = "panproto")]
use std::sync::Arc;

use crate::pipeline::ImplementationUnit;
use crate::ncl::CodeTemplate;

/// ThTemplateVars: Theory of template variable bindings
///
/// This theory describes the structure of data that can be
/// bound to template placeholders like {{name}}, {{title}}, etc.
#[cfg(feature = "panproto")]
pub fn template_vars_theory() -> Theory {
    Theory::new(
        Arc::from("ThTemplateVars"),
        vec![
            Sort { name: Arc::from("TemplateVars"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("VarBinding"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("VarName"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("VarValue"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("RenderedCode"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Validation"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            Operation {
                name: Arc::from("bind"),
                inputs: vec![
                    (Arc::from("name"), Arc::from("VarName")),
                    (Arc::from("value"), Arc::from("VarValue")),
                ],
                output: Arc::from("VarBinding"),
            },
            Operation {
                name: Arc::from("make_vars"),
                inputs: vec![
                    (Arc::from("iu_name"), Arc::from("String")),
                    (Arc::from("contract"), Arc::from("String")),
                    (Arc::from("language"), Arc::from("String")),
                ],
                output: Arc::from("TemplateVars"),
            },
            Operation {
                name: Arc::from("render"),
                inputs: vec![
                    (Arc::from("template"), Arc::from("CodeTemplate")),
                    (Arc::from("vars"), Arc::from("TemplateVars")),
                ],
                output: Arc::from("RenderedCode"),
            },
            Operation {
                name: Arc::from("validate"),
                inputs: vec![
                    (Arc::from("rendered"), Arc::from("RenderedCode")),
                    (Arc::from("iu"), Arc::from("IU")),
                ],
                output: Arc::from("Validation"),
            },
        ],
        vec![], // equations added below
    )
}

/// ThTemplate: Theory of code templates with placeholders
#[cfg(feature = "panproto")]
pub fn template_theory() -> Theory {
    Theory::new(
        Arc::from("ThTemplate"),
        vec![
            Sort { name: Arc::from("CodeTemplate"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("TemplateId"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Language"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Framework"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Holes"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            Operation {
                name: Arc::from("load"),
                inputs: vec![(Arc::from("name"), Arc::from("TemplateId"))],
                output: Arc::from("CodeTemplate"),
            },
            Operation {
                name: Arc::from("holes"),
                inputs: vec![(Arc::from("template"), Arc::from("CodeTemplate"))],
                output: Arc::from("Holes"),
            },
            Operation {
                name: Arc::from("compatible"),
                inputs: vec![
                    (Arc::from("template"), Arc::from("CodeTemplate")),
                    (Arc::from("language"), Arc::from("Language")),
                ],
                output: Arc::from("Bool"),
            },
        ],
        vec![],
    )
}

/// OBSOLETE: μ_iu_to_vars removed - use direct spec→code pipeline
#[cfg(feature = "panproto")]
pub fn iu_to_vars_morphism() -> TheoryMorphism {
    panic!("iu_to_vars_morphism is obsolete - use direct spec→code pipeline")
}

/// Template validation equations
/// These enforce that rendered code satisfies IU contracts
#[cfg(feature = "panproto")]
pub fn template_equations() -> Vec<Equation> {
    vec![
        // Equation: The rendered app name MUST equal IU name
        Equation {
            name: Arc::from("name_preservation"),
            lhs: Term::app(
                "extract_app_name",
                vec![Term::app(
                    "render",
                    vec![
                        Term::var(Arc::from("template")),
                        Term::app(
                            "make_vars",
                            vec![
                                Term::var(Arc::from("iu.name")),
                                Term::var(Arc::from("iu.contract")),
                                Term::var(Arc::from("iu.target_language")),
                            ],
                        ),
                    ],
                )],
            ),
            rhs: Term::var(Arc::from("iu.name")),
        },
        // Equation: The rendered code MUST contain IU iu_id in header comment
        Equation {
            name: Arc::from("provenance_marked"),
            lhs: Term::app(
                "contains",
                vec![
                    Term::app(
                        "render",
                        vec![Term::var(Arc::from("template")), Term::var(Arc::from("vars"))],
                    ),
                    Term::var(Arc::from("iu.iu_id")),
                ],
            ),
            rhs: Term::var(Arc::from("true")),
        },
        // Equation: Template language MUST match IU target language
        Equation {
            name: Arc::from("language_compatibility"),
            lhs: Term::app(
                "compatible",
                vec![
                    Term::var(Arc::from("template")),
                    Term::var(Arc::from("iu.target_language")),
                ],
            ),
            rhs: Term::var(Arc::from("true")),
        },
    ]
}

/// μ_template_render: Morphism ThTemplateVars × ThTemplate → ThCode
///
/// This represents the actual rendering operation as a theory morphism.
/// It takes template variables and a template, produces code.
#[cfg(feature = "panproto")]
pub fn template_render_morphism() -> TheoryMorphism {
    let mut sort_map = HashMap::new();
    // TemplateVars + Template → Code
    sort_map.insert(Arc::from("TemplateVars"), Arc::from("Code"));
    sort_map.insert(Arc::from("CodeTemplate"), Arc::from("Code"));
    
    let mut op_map = HashMap::new();
    op_map.insert(
        Arc::from("render"),
        Arc::from("generate"),
    );
    
    TheoryMorphism::new(
        Arc::from("μ_template_render"),
        Arc::from("ThTemplateVars × ThTemplate"),
        Arc::from("ThCode"),
        sort_map,
        op_map,
    )
}

/// OBSOLETE: codegen_morphism_composed removed - use direct spec→code pipeline
#[cfg(feature = "panproto")]
pub fn codegen_morphism_composed() -> TheoryMorphism {
    panic!("codegen_morphism_composed is obsolete - use direct spec→code pipeline")
}

// ============================================================================
// Non-panproto: Actual implementation bridging to real template system
// ============================================================================

/// TemplateVariableBinding: Concrete binding from IU to template vars
#[derive(Debug, Clone)]
pub struct TemplateVariableBinding {
    pub name: String,
    pub title: String,
    pub iu_id: String,
    pub contract: String,
    pub language: String,
    pub framework: Option<String>,
}

impl TemplateVariableBinding {
    /// Create bindings from an ImplementationUnit
    pub fn from_iu(iu: &ImplementationUnit) -> Self {
        Self {
            name: iu.name.clone(),
            title: iu.name.clone(), // Can be customized from contract parsing
            iu_id: iu.iu_id.clone(),
            contract: iu.contract.clone(),
            language: iu.target_language.clone(),
            framework: None,
        }
    }
    
    /// Convert to the HashMap format expected by CodeTemplate::render
    pub fn to_hashmap(&self) -> HashMap<String, String> {
        let mut map = HashMap::new();
        map.insert("name".to_string(), self.name.clone());
        map.insert("Name".to_string(), capitalize_first(&self.name));
        map.insert("title".to_string(), self.title.clone());
        map.insert("iu_id".to_string(), self.iu_id.clone());
        map.insert("contract".to_string(), self.contract.clone());
        map.insert("language".to_string(), self.language.clone());
        map
    }
}

/// Render template with formal validation
/// 
/// This performs the actual template rendering and then validates
/// that the output satisfies the formal equations.
pub fn render_with_validation(
    template: &CodeTemplate,
    iu: &ImplementationUnit,
) -> Result<String, Vec<String>> {
    let binding = TemplateVariableBinding::from_iu(iu);
    let vars = binding.to_hashmap();
    
    // Render the template
    let rendered = template.render(&vars);
    
    // Validate against formal equations
    let mut violations = Vec::new();
    
    // Equation: name_preservation
    if !rendered.contains(&format!("class {}App", capitalize_first(&iu.name)))
        && !rendered.contains(&format!("title = \"{}\"", iu.name))
        && !rendered.contains(&format!("self.title = \"{}\"", iu.name))
    {
        violations.push(format!(
            "name_preservation: Generated code does not contain app name '{}' in class definition or title",
            iu.name
        ));
    }
    
    // Equation: provenance_marked
    if !rendered.contains(&format!("# phoenix: iu_id = \"{}\"", iu.iu_id))
        && !rendered.contains(&format!("iu_id = \"{}\"", iu.iu_id))
    {
        violations.push(format!(
            "provenance_marked: Generated code missing IU ID '{}' in header",
            iu.iu_id
        ));
    }
    
    // Equation: language_compatibility
    let lang_ok = match iu.target_language.as_str() {
        "python" | "py" => {
            rendered.contains("def ") 
                && rendered.contains("import ")
                && !rendered.contains("fn ") // Not Rust
        }
        "rust" | "rs" => {
            rendered.contains("fn ") 
                && rendered.contains("use ")
                && !rendered.contains("def ") // Not Python
        }
        _ => true, // Unknown language, skip validation
    };
    
    if !lang_ok {
        violations.push(format!(
            "language_compatibility: Generated code does not appear to be valid {} code",
            iu.target_language
        ));
    }
    
    if violations.is_empty() {
        Ok(rendered)
    } else {
        Err(violations)
    }
}

/// Formal Template Application
/// 
/// This struct represents a template application as a formal object
/// with provenance tracking.
pub struct FormalTemplateApplication {
    pub template_name: String,
    pub template_hash: String,
    pub iu_id: String,
    pub bindings: TemplateVariableBinding,
    pub rendered_code: String,
    pub validation_result: Result<String, Vec<String>>,
}

impl FormalTemplateApplication {
    /// Create a new formal template application
    pub fn apply(
        template: &CodeTemplate,
        template_name: &str,
        template_hash: &str,
        iu: &ImplementationUnit,
    ) -> Self {
        let binding = TemplateVariableBinding::from_iu(iu);
        let validation_result = render_with_validation(template, iu);
        
        let rendered_code = match &validation_result {
            Ok(code) => code.clone(),
            Err(_) => {
                // Even if validation fails, we still have rendered output
                let vars = binding.to_hashmap();
                template.render(&vars)
            }
        };
        
        Self {
            template_name: template_name.to_string(),
            template_hash: template_hash.to_string(),
            iu_id: iu.iu_id.clone(),
            bindings: binding,
            rendered_code,
            validation_result,
        }
    }
    
    /// Check if this application satisfies all formal equations
    pub fn is_valid(&self) -> bool {
        self.validation_result.is_ok()
    }
    
    /// Get violations if any
    pub fn violations(&self) -> Option<&Vec<String>> {
        match &self.validation_result {
            Err(v) => Some(v),
            Ok(_) => None,
        }
    }
}

fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pipeline::ImplementationUnit;
    use crate::evidence::RiskTier;
    
    fn make_test_iu(name: &str) -> ImplementationUnit {
        ImplementationUnit {
            iu_id: format!("test-iu-{}", name),
            name: name.to_string(),
            contract: format!("Generate {} application", name),
            source_canon_ids: vec![],
            risk_tier: RiskTier::Low,
            target_language: "python".to_string(),
            output_files: vec![format!("{}.py", name)],
            spec_content: None,
        }
    }
    
    #[test]
    fn test_template_binding_from_iu() {
        let iu = make_test_iu("simple-tui");
        let binding = TemplateVariableBinding::from_iu(&iu);
        
        assert_eq!(binding.name, "simple-tui");
        assert_eq!(binding.iu_id, "test-iu-simple-tui");
        assert_eq!(binding.language, "python");
    }
    
    #[test]
    fn test_capitalize_first() {
        assert_eq!(capitalize_first("simple-tui"), "Simple-tui");
        assert_eq!(capitalize_first("DASHBOARD"), "Dashboard");
    }
}
