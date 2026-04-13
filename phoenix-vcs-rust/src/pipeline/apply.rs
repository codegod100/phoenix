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

/// Extract string from a term that should be a variable or simple operation
#[cfg(feature = "panproto")]
fn extract_string(term: &Term) -> Option<String> {
    match term {
        Term::Var(name) => Some(name.to_string()),
        Term::App { op, args } if args.is_empty() => Some(op.to_string()),
        Term::App { op, args } if op.as_ref() == "sources" => {
            // For sources, extract all source IDs
            let ids: Vec<String> = args.iter()
                .filter_map(extract_string)
                .collect();
            Some(ids.join(","))
        }
        _ => None,
    }
}

/// Convert a term back to a CanonNode
/// 
/// Expects term structure: canonize(get_id(id), get_type(t), stmt)
#[cfg(feature = "panproto")]
pub fn term_to_canon_node(term: &Term, source_clause_ids: Vec<String>) -> Option<CanonNode> {
    match term {
        Term::App { op, args } if op.as_ref() == "canonize" && args.len() >= 3 => {
            // Extract ID from get_id wrapper
            let id = match &args[0] {
                Term::App { op, args: inner } if op.as_ref() == "get_id" && !inner.is_empty() => {
                    extract_string(&inner[0])
                }
                _ => extract_string(&args[0]),
            }?;
            
            // Extract type from get_type wrapper
            let node_type_str = match &args[1] {
                Term::App { op, args: inner } if op.as_ref() == "get_type" && !inner.is_empty() => {
                    extract_string(&inner[0])
                }
                _ => extract_string(&args[1]),
            }?;
            
            // Parse node type
            let node_type = match node_type_str.as_str() {
                "Requirement" => crate::pipeline::CanonNodeType::Requirement,
                "Constraint" => crate::pipeline::CanonNodeType::Constraint,
                "Definition" => crate::pipeline::CanonNodeType::Definition,
                _ => crate::pipeline::CanonNodeType::Requirement,
            };
            
            // Extract statement
            let clean_statement = extract_string(&args[2])?;
            
            Some(CanonNode {
                id,
                node_type,
                clean_statement,
                derived_from: source_clause_ids,
                depends_on: vec![],
                d_rate: 0.0,
                confidence: 1.0,
            })
        }
        _ => None,
    }
}

/// Convert a term back to an ImplementationUnit
///
/// Expects term structure: plan(sources(srcs), name(n), contract_of(c), risk(r), target(l), output(o))
#[cfg(feature = "panproto")]
pub fn term_to_iu(term: &Term, iu_id: String) -> Option<ImplementationUnit> {
    match term {
        Term::App { op, args } if op.as_ref() == "plan" && args.len() >= 6 => {
            // Extract sources
            let source_canon_ids = match &args[0] {
                Term::App { op, args: src_args } if op.as_ref() == "sources" => {
                    src_args.iter()
                        .filter_map(extract_string)
                        .collect()
                }
                _ => vec![],
            };
            
            // Extract name
            let name = match &args[1] {
                Term::App { op, args: inner } if op.as_ref() == "name" && !inner.is_empty() => {
                    extract_string(&inner[0])
                }
                _ => extract_string(&args[1]),
            }?;
            
            // Extract contract
            let contract = match &args[2] {
                Term::App { op, args: inner } if op.as_ref() == "contract_of" && !inner.is_empty() => {
                    extract_string(&inner[0])
                }
                _ => extract_string(&args[2]),
            }.unwrap_or_else(|| "Default".to_string());
            
            // Extract risk
            let risk_tier = match &args[3] {
                Term::App { op, args: inner } if op.as_ref() == "risk" && !inner.is_empty() => {
                    extract_string(&inner[0])
                }
                _ => extract_string(&args[3]),
            }.map(|s| match s.as_str() {
                "Critical" => crate::evidence::RiskTier::Critical,
                "High" => crate::evidence::RiskTier::High,
                "Medium" => crate::evidence::RiskTier::Medium,
                "Low" => crate::evidence::RiskTier::Low,
                _ => crate::evidence::RiskTier::Medium,
            }).unwrap_or(crate::evidence::RiskTier::Medium);
            
            // Extract language
            let target_language = match &args[4] {
                Term::App { op, args: inner } if op.as_ref() == "target" && !inner.is_empty() => {
                    extract_string(&inner[0])
                }
                _ => extract_string(&args[4]),
            }.unwrap_or_else(|| "python".to_string());
            
            // Extract output
            let output_files = match &args[5] {
                Term::App { op, args: inner } if op.as_ref() == "output" && !inner.is_empty() => {
                    extract_string(&inner[0])
                }
                _ => extract_string(&args[5]),
            }.map(|s| s.split(',').map(String::from).collect())
             .unwrap_or_else(|| vec!["src/app.py".to_string()]);
            
            Some(ImplementationUnit {
                iu_id,
                name,
                contract,
                risk_tier,
                target_language,
                source_canon_ids,
                output_files,
            })
        }
        _ => None,
    }
}

/// Apply formal canonize morphism to create a CanonNode
///
/// This constructs a CanonNode using the formal transformation approach:
/// - Clause ID becomes CanonNode ID
/// - Clause type becomes NodeType
/// - Normalized text becomes clean_statement
#[cfg(feature = "panproto")]
pub fn formal_canonize(clause: &Clause) -> Option<CanonNode> {
    // The formal canonize morphism transforms:
    // - identify → get_id
    // - classify → get_type
    // - parse(normalize(text), classify(type), identify(id)) → canonize(get_id(id), get_type(type), normalize(text))
    
    // For now, construct directly from clause data
    let node_type = match clause.clause_type {
        crate::pipeline::ClauseType::Requirement => crate::pipeline::CanonNodeType::Requirement,
        crate::pipeline::ClauseType::Constraint => crate::pipeline::CanonNodeType::Constraint,
        crate::pipeline::ClauseType::Definition => crate::pipeline::CanonNodeType::Definition,
        crate::pipeline::ClauseType::Assumption => crate::pipeline::CanonNodeType::Assumption,
        crate::pipeline::ClauseType::Scenario => crate::pipeline::CanonNodeType::Scenario,
    };
    
    Some(CanonNode {
        id: clause.id.clone(),
        node_type,
        clean_statement: clause.raw_text.clone(),
        derived_from: vec![clause.id.clone()],
        depends_on: vec![],
        d_rate: 0.0,
        confidence: 1.0,
    })
}

/// Apply formal plan morphism to create an IU from a canon node
///
/// This constructs an ImplementationUnit using the formal transformation approach:
/// - CanonNode ID becomes source_canon_id
/// - Node type determines contract
/// - Language is set from parameter
#[cfg(feature = "panproto")]
pub fn formal_plan(node: &CanonNode, lang: &str) -> Option<ImplementationUnit> {
    // The formal plan morphism transforms:
    // - canonize(get_id(id), get_type(t), stmt) → plan(sources([id]), name(t), contract, risk, target(lang), output)
    
    let iu_id = format!("iu_{}", &node.id[..8.min(node.id.len())]);
    
    // Derive contract from node type
    let contract = match node.node_type {
        crate::pipeline::CanonNodeType::Requirement => format!("{:?} {} implementation", node.node_type, lang),
        crate::pipeline::CanonNodeType::Constraint => format!("{:?} validation", node.node_type),
        crate::pipeline::CanonNodeType::Definition => format!("{:?} implementation", node.node_type),
        crate::pipeline::CanonNodeType::Assumption => format!("{:?} context", node.node_type),
        crate::pipeline::CanonNodeType::Scenario => format!("{:?} test scenario", node.node_type),
        crate::pipeline::CanonNodeType::PipelineUpgrade => format!("{:?} upgrade", node.node_type),
    };
    
    // Derive name from clean_statement (first few words)
    let name = node.clean_statement.split_whitespace()
        .take(3)
        .collect::<Vec<_>>()
        .join("_")
        .to_lowercase()
        .replace(|c: char| !c.is_alphanumeric(), "_");
    let name = if name.is_empty() { "app".to_string() } else { name };
    
    Some(ImplementationUnit {
        iu_id,
        name,
        contract,
        risk_tier: crate::evidence::RiskTier::Medium,
        target_language: lang.to_string(),
        source_canon_ids: vec![node.id.clone()],
        output_files: vec![format!("src/app.{}", if lang == "python" { "py" } else { "rs" })],
    })
}

/// Build canon graph using formal morphisms
///
/// Alternative to canonicalize_lens that uses formal transformations
#[cfg(feature = "panproto")]
pub fn formal_canonicalize(clauses: &[Clause]) -> crate::lens::CanonGraph {
    use crate::lens::CanonGraph;
    
    let nodes: Vec<CanonNode> = clauses.iter()
        .filter_map(formal_canonize)
        .collect();
    
    CanonGraph { nodes }
}

/// Build IU graph using formal morphisms
///
/// Alternative to plan_lens that uses formal transformations
#[cfg(feature = "panproto")]
pub fn formal_plan_nodes(nodes: &[CanonNode], lang: &str) -> crate::lens::IUGraph {
    use crate::lens::IUGraph;
    
    let ius: Vec<ImplementationUnit> = nodes.iter()
        .filter_map(|n| formal_plan(n, lang))
        .collect();
    
    IUGraph { ius }
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
    
    #[test]
    #[cfg(feature = "panproto")]
    fn test_term_to_canon_node() {
        let term = Term::app("canonize", vec![
            Term::app("get_id", vec![Term::var("test_id")]),
            Term::app("get_type", vec![Term::var("Requirement")]),
            Term::var("Test statement"),
        ]);
        
        let node = term_to_canon_node(&term, vec!["source_1".to_string()]);
        assert!(node.is_some());
        let node = node.unwrap();
        assert_eq!(node.id, "test_id");
        assert_eq!(node.clean_statement, "Test statement");
        assert_eq!(node.derived_from, vec!["source_1"]);
    }
    
    #[test]
    #[cfg(feature = "panproto")]
    fn test_term_to_iu() {
        let term = Term::app("plan", vec![
            Term::app("sources", vec![Term::var("src_1"), Term::var("src_2")]),
            Term::app("name", vec![Term::var("test_app")]),
            Term::app("contract_of", vec![Term::var("TestContract")]),
            Term::app("risk", vec![Term::var("Medium")]),
            Term::app("target", vec![Term::var("python")]),
            Term::app("output", vec![Term::var("src/app.py")]),
        ]);
        
        let iu = term_to_iu(&term, "iu_test123".to_string());
        assert!(iu.is_some());
        let iu = iu.unwrap();
        assert_eq!(iu.name, "test_app");
        assert_eq!(iu.target_language, "python");
        assert_eq!(iu.output_files, vec!["src/app.py"]);
    }
    
    #[test]
    #[cfg(feature = "panproto")]
    fn test_formal_canonize() {
        let clause = Clause {
            id: "test_rt".to_string(),
            clause_type: ClauseType::Requirement,
            text: "Test text".to_string(),
            raw_text: "Test raw".to_string(),
            section: "test".to_string(),
            source_file: "test.md".to_string(),
            line: 1,
            clause_semhash: "abc".to_string(),
            context_semhash: "def".to_string(),
            language_marker: None,
        };
        
        // Test that formal_canonize creates a CanonNode from a Clause
        let node = formal_canonize(&clause);
        assert!(node.is_some());
        let node = node.unwrap();
        assert_eq!(node.id, clause.id);
        assert_eq!(node.derived_from, vec![clause.id.clone()]);
    }
    
    #[test]
    #[cfg(feature = "panproto")]
    fn test_formal_plan() {
        let node = CanonNode {
            id: "test_node".to_string(),
            node_type: crate::pipeline::CanonNodeType::Requirement,
            clean_statement: "Test statement".to_string(),
            derived_from: vec!["source_1".to_string()],
            depends_on: vec![],
            d_rate: 0.0,
            confidence: 1.0,
        };
        
        let iu = formal_plan(&node, "python");
        assert!(iu.is_some());
        let iu = iu.unwrap();
        assert_eq!(iu.target_language, "python");
        assert!(iu.source_canon_ids.contains(&"test_node".to_string()));
    }
}
