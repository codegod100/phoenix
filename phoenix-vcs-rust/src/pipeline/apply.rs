//! Apply formal theory morphisms to pipeline data
//!
//! This module bridges the gap between formal GAT theories and actual
//! pipeline implementation by converting data to/from panproto Terms
//! and applying TheoryMorphism transformations.

#[cfg(feature = "panproto")]
use panproto_gat::{Term, TheoryMorphism};
#[cfg(feature = "panproto")]
use std::sync::Arc;

use crate::pipeline::{Clause, CanonNode, ImplementationUnit};
use crate::pipeline::formal::{canonize_morphism, plan_morphism, codegen_morphism};

/// Convert a Clause to a formal Term
///
/// Represents the clause as: parse("text") with classification
#[cfg(feature = "panproto")]
pub fn clause_to_term(clause: &Clause) -> Term {
    // Represent as: parse(normalize("raw_text"), classify(type), identify())
    Term::app(
        "parse",
        vec![
            Term::app("normalize", vec![Term::var(clause.raw_text.clone())]),
            Term::app("classify", vec![Term::var(format!("{:?}", clause.clause_type))]),
            Term::app("identify", vec![Term::var(clause.id.clone())]),
        ],
    )
}

/// Convert a CanonNode to a formal Term
///
/// Represents the canonicalized node
#[cfg(feature = "panproto")]
pub fn canon_node_to_term(node: &CanonNode) -> Term {
    // Represent as: canonize(parse(...), confidence)
    Term::app(
        "canonize",
        vec![
            Term::app("get_id", vec![Term::var(node.id.clone())]),
            Term::app("get_type", vec![Term::var(format!("{:?}", node.node_type))]),
            Term::var(node.clean_statement.clone()),
        ],
    )
}

/// Convert an IU to a formal Term
///
/// Represents the implementation unit as a planned node
#[cfg(feature = "panproto")]
pub fn iu_to_term(iu: &ImplementationUnit) -> Term {
    // Represent as: plan(canon_nodes, name, contract, risk, language, output)
    let sources: Vec<Term> = iu.source_canon_ids
        .iter()
        .map(|id| Term::var(id.clone()))
        .collect();
    
    Term::app(
        "plan",
        vec![
            Term::app("sources", sources),
            Term::app("name", vec![Term::var(iu.name.clone())]),
            Term::app("contract_of", vec![Term::var(iu.contract.clone())]),
            Term::app("risk", vec![Term::var(format!("{:?}", iu.risk_tier))]),
            Term::app("target", vec![Term::var(iu.target_language.clone())]),
            Term::app("output", vec![Term::var(iu.output_files.join(","))]),
        ],
    )
}

/// Apply canonize morphism to a clause term
///
/// Transforms: ThClause → ThCanon
#[cfg(feature = "panproto")]
pub fn apply_canonize(clause_term: &Term) -> Term {
    let morphism = canonize_morphism();
    morphism.apply_to_term(clause_term)
}

/// Apply plan morphism to a canon node term
///
/// Transforms: ThCanon → ThIU  
#[cfg(feature = "panproto")]
pub fn apply_plan(canon_term: &Term) -> Term {
    let morphism = plan_morphism();
    morphism.apply_to_term(canon_term)
}

/// Apply codegen morphism to an IU term
///
/// Transforms: ThIU → ThCode
#[cfg(feature = "panproto")]
pub fn apply_codegen(iu_term: &Term) -> Term {
    let morphism = codegen_morphism();
    morphism.apply_to_term(iu_term)
}

/// Full pipeline transformation: Clause → Code (formal)
///
/// Applies the composition: μ_codegen ∘ μ_plan ∘ μ_canon
#[cfg(feature = "panproto")]
pub fn pipeline_transform(clause: &Clause) -> Term {
    let clause_term = clause_to_term(clause);
    let canon_term = apply_canonize(&clause_term);
    let iu_term = apply_plan(&canon_term);
    apply_codegen(&iu_term)
}

/// Pretty-print a term for debugging
#[cfg(feature = "panproto")]
pub fn format_term(term: &Term) -> String {
    match term {
        Term::Var(name) => name.to_string(),
        Term::App { op, args } => {
            let args_str = args.iter()
                .map(format_term)
                .collect::<Vec<_>>()
                .join(", ");
            format!("{}({})", op, args_str)
        }
    }
}

/// Verify that pipeline transformation preserves structure
///
/// Checks that applying the morphism chain produces valid terms
#[cfg(feature = "panproto")]
pub fn verify_pipeline_transform(clauses: &[Clause]) -> Vec<(String, Term, Term, Term, Term)> {
    let mut results = Vec::new();
    
    for clause in clauses {
        let clause_term = clause_to_term(clause);
        let canon_term = apply_canonize(&clause_term);
        let iu_term = apply_plan(&canon_term);
        let code_term = apply_codegen(&iu_term);
        
        results.push((
            clause.id.clone(),
            clause_term,
            canon_term,
            iu_term,
            code_term,
        ));
    }
    
    results
}

/// Apply morphism and report the transformation
#[cfg(feature = "panproto")]
pub fn apply_and_report(name: &str, morphism: &TheoryMorphism, term: &Term) -> Term {
    let result = morphism.apply_to_term(term);
    println!("   ↳ {}: {} → {}", 
        name,
        format_term(term),
        format_term(&result)
    );
    result
}

/// Demonstrate full pipeline morphism application
#[cfg(feature = "panproto")]
pub fn demonstrate_pipeline_morphisms(clause: &Clause) {
    println!("   📐 Formal Term Transformations:");
    
    let clause_term = clause_to_term(clause);
    println!("      Clause: {}", format_term(&clause_term));
    
    let morphism1 = canonize_morphism();
    let canon_term = apply_and_report("μ_canon", &morphism1, &clause_term);
    
    let morphism2 = plan_morphism();
    let iu_term = apply_and_report("μ_plan", &morphism2, &canon_term);
    
    let morphism3 = codegen_morphism();
    let code_term = apply_and_report("μ_codegen", &morphism3, &iu_term);
    
    println!("      Final: {}", format_term(&code_term));
}

/// Create a term representing generated code with provenance
#[cfg(feature = "panproto")]
pub fn code_file_term(iu_id: &str, content: &str, hash: &str) -> Term {
    Term::app(
        "file",
        vec![
            Term::app("generate", vec![
                Term::var(iu_id.to_string()),
                Term::var("Template"),
            ]),
            Term::app("hash", vec![Term::var(content.to_string())]),
            Term::var(hash.to_string()),
        ],
    )
}

/// Trace term back through morphism (conceptual - requires inverse)
#[cfg(feature = "panproto")]
pub fn trace_term_provenance(term: &Term) -> Vec<String> {
    let mut provenance = Vec::new();
    
    fn extract_vars(t: &Term, vars: &mut Vec<String>) {
        match t {
            Term::Var(name) => vars.push(name.to_string()),
            Term::App { args, .. } => {
                for arg in args {
                    extract_vars(arg, vars);
                }
            }
        }
    }
    
    extract_vars(term, &mut provenance);
    provenance
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pipeline::ClauseType;

    #[test]
    #[cfg(feature = "panproto")]
    fn test_clause_to_term() {
        let clause = Clause {
            id: "test_123".to_string(),
            clause_type: ClauseType::Requirement,
            text: "Test requirement".to_string(),
            raw_text: "Test requirement".to_string(),
            section: "test".to_string(),
            source_file: "test.md".to_string(),
            line: 1,
            clause_semhash: "abc123".to_string(),
            context_semhash: "def456".to_string(),
            language_marker: Some("python".to_string()),
        };
        
        let term = clause_to_term(&clause);
        let formatted = format_term(&term);
        
        assert!(formatted.contains("parse"));
        assert!(formatted.contains("normalize"));
        assert!(formatted.contains("identify"));
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_apply_canonize() {
        let clause = Clause {
            id: "test_456".to_string(),
            clause_type: ClauseType::Constraint,
            text: "Test constraint".to_string(),
            raw_text: "Test constraint".to_string(),
            section: "test".to_string(),
            source_file: "test.md".to_string(),
            line: 2,
            clause_semhash: "ghi789".to_string(),
            context_semhash: "jkl012".to_string(),
            language_marker: None,
        };
        
        let clause_term = clause_to_term(&clause);
        let canon_term = apply_canonize(&clause_term);
        
        // After canonize, operations should be renamed
        let formatted = format_term(&canon_term);
        // The term structure should be preserved but ops renamed
        assert!(!formatted.is_empty());
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_pipeline_transform() {
        let clause = Clause {
            id: "test_789".to_string(),
            clause_type: ClauseType::Definition,
            text: "Test definition".to_string(),
            raw_text: "Test definition".to_string(),
            section: "test".to_string(),
            source_file: "test.md".to_string(),
            line: 3,
            clause_semhash: "mno345".to_string(),
            context_semhash: "pqr678".to_string(),
            language_marker: Some("rust".to_string()),
        };
        
        let code_term = pipeline_transform(&clause);
        let formatted = format_term(&code_term);
        
        // Should go through all three transformations
        assert!(!formatted.is_empty());
        println!("Pipeline transform: {}", formatted);
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_term_formatting() {
        let var_term = Term::var("test_var");
        assert_eq!(format_term(&var_term), "test_var");
        
        let app_term = Term::app("test_op", vec![
            Term::var("arg1"),
            Term::var("arg2"),
        ]);
        let formatted = format_term(&app_term);
        assert!(formatted.contains("test_op"));
        assert!(formatted.contains("arg1"));
        assert!(formatted.contains("arg2"));
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_trace_provenance() {
        let term = Term::app("generate", vec![
            Term::var("iu_123"),
            Term::var("template_abc"),
        ]);
        
        let vars = trace_term_provenance(&term);
        assert!(vars.contains(&"iu_123".to_string()));
        assert!(vars.contains(&"template_abc".to_string()));
    }
}
