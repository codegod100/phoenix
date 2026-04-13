//! Formal GAT theories for the Phoenix pipeline
//!
//! This module defines the pipeline stages as proper panproto GAT theories:
//! - ThClause: Raw parsed requirements
//! - ThCanon: Deduplicated canonical nodes  
//! - ThIU: Implementation units for code generation
//! - ThCode: Generated code artifacts
//!
//! Each theory has sorts (types) and operations (transformations).
//! Morphisms between theories are structure-preserving maps.

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation, TheoryMorphism};
#[cfg(feature = "panproto")]
use std::collections::HashMap;
#[cfg(feature = "panproto")]
use std::sync::Arc;

use crate::pipeline::{Clause, CanonNode, ImplementationUnit};
use crate::identity::{canon_id, clause_semhash, normalize_text};

/// ThClause: Theory of parsed specification clauses
///
/// Sorts:
///   - Clause: A requirement/constraint from the spec
///   - ClauseType: Classification (Requirement, Constraint, etc.)
///   - ClauseText: Normalized text content
///   - Source: Origin file and line
///
/// Operations:
///   - parse: String → Clause
///   - classify: Clause → ClauseType
///   - normalize: String → ClauseText
///   - identify: Clause → CanonId
#[cfg(feature = "panproto")]
pub fn clause_theory() -> Theory {
    Theory::new(
        Arc::from("ThClause"),
        vec![
            Sort { name: Arc::from("Clause"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ClauseType"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ClauseText"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CanonId"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Source"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            Operation {
                name: Arc::from("parse"),
                inputs: vec![(Arc::from("raw"), Arc::from("String"))],
                output: Arc::from("Clause"),
            },
            Operation {
                name: Arc::from("classify"),
                inputs: vec![(Arc::from("clause"), Arc::from("Clause"))],
                output: Arc::from("ClauseType"),
            },
            Operation {
                name: Arc::from("normalize"),
                inputs: vec![(Arc::from("raw"), Arc::from("String"))],
                output: Arc::from("ClauseText"),
            },
            Operation {
                name: Arc::from("identify"),
                inputs: vec![(Arc::from("clause"), Arc::from("Clause"))],
                output: Arc::from("CanonId"),
            },
        ],
        vec![], // equations
    )
}

/// ThCanon: Theory of canonical (deduplicated) nodes
///
/// Sorts:
///   - CanonNode: Unique canonical requirement
///   - NodeType: Classification
///   - NodeText: Normalized content
///   - CanonId: Content-addressed identifier
///   - CanonEdge: Link between nodes
///   - Confidence: Float 0-1
///
/// Operations:
///   - canonize: Clause → CanonNode
///   - merge: CanonNode × CanonNode → CanonNode
///   - connect: CanonNode × CanonNode → CanonEdge
///   - get_id: CanonNode → CanonId
///   - get_type: CanonNode → NodeType
#[cfg(feature = "panproto")]
pub fn canon_theory() -> Theory {
    Theory::new(
        Arc::from("ThCanon"),
        vec![
            Sort { name: Arc::from("CanonNode"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("NodeType"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("NodeText"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CanonId"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CanonEdge"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Confidence"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            Operation {
                name: Arc::from("canonize"),
                inputs: vec![(Arc::from("clause"), Arc::from("Clause"))],
                output: Arc::from("CanonNode"),
            },
            Operation {
                name: Arc::from("merge"),
                inputs: vec![
                    (Arc::from("left"), Arc::from("CanonNode")),
                    (Arc::from("right"), Arc::from("CanonNode")),
                ],
                output: Arc::from("CanonNode"),
            },
            Operation {
                name: Arc::from("connect"),
                inputs: vec![
                    (Arc::from("from"), Arc::from("CanonNode")),
                    (Arc::from("to"), Arc::from("CanonNode")),
                ],
                output: Arc::from("CanonEdge"),
            },
            Operation {
                name: Arc::from("get_id"),
                inputs: vec![(Arc::from("node"), Arc::from("CanonNode"))],
                output: Arc::from("CanonId"),
            },
            Operation {
                name: Arc::from("get_type"),
                inputs: vec![(Arc::from("node"), Arc::from("CanonNode"))],
                output: Arc::from("NodeType"),
            },
        ],
        vec![], // equations
    )
}

/// ThIU: Theory of Implementation Units
///
/// Sorts:
///   - IU: Implementation unit
///   - IUName: Module name
///   - Contract: Specification contract
///   - RiskTier: Safety classification
///   - Language: Target language
///   - OutputPath: File path
///
/// Operations:
///   - plan: CanonNode[] → IU[]
///   - name: IU → IUName
///   - contract_of: IU → Contract
///   - risk: IU → RiskTier
///   - target: IU → Language
///   - output: IU → OutputPath
#[cfg(feature = "panproto")]
pub fn iu_theory() -> Theory {
    Theory::new(
        Arc::from("ThIU"),
        vec![
            Sort { name: Arc::from("IU"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("IUName"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Contract"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("RiskTier"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Language"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("OutputPath"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CanonRef"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            Operation {
                name: Arc::from("plan"),
                inputs: vec![(Arc::from("nodes"), Arc::from("CanonNode"))], // Actually list
                output: Arc::from("IU"),
            },
            Operation {
                name: Arc::from("name"),
                inputs: vec![(Arc::from("iu"), Arc::from("IU"))],
                output: Arc::from("IUName"),
            },
            Operation {
                name: Arc::from("contract_of"),
                inputs: vec![(Arc::from("iu"), Arc::from("IU"))],
                output: Arc::from("Contract"),
            },
            Operation {
                name: Arc::from("risk"),
                inputs: vec![(Arc::from("iu"), Arc::from("IU"))],
                output: Arc::from("RiskTier"),
            },
            Operation {
                name: Arc::from("target"),
                inputs: vec![(Arc::from("iu"), Arc::from("IU"))],
                output: Arc::from("Language"),
            },
            Operation {
                name: Arc::from("output"),
                inputs: vec![(Arc::from("iu"), Arc::from("IU"))],
                output: Arc::from("OutputPath"),
            },
            Operation {
                name: Arc::from("sources"),
                inputs: vec![(Arc::from("iu"), Arc::from("IU"))],
                output: Arc::from("CanonRef"),
            },
        ],
        vec![], // equations
    )
}

/// ThCode: Theory of generated code
///
/// Sorts:
///   - Code: Generated code content
///   - CodeFile: File with metadata
///   - CodeHash: Content hash
///   - TraceId: Trace to source IU
///
/// Operations:
///   - generate: IU × Template → Code
///   - hash: Code → CodeHash
///   - write: CodeFile → IO
///   - trace: Code → TraceId
#[cfg(feature = "panproto")]
pub fn code_theory() -> Theory {
    Theory::new(
        Arc::from("ThCode"),
        vec![
            Sort { name: Arc::from("Code"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CodeFile"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CodeHash"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("TraceId"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Template"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            Operation {
                name: Arc::from("generate"),
                inputs: vec![
                    (Arc::from("iu"), Arc::from("IU")),
                    (Arc::from("template"), Arc::from("Template")),
                ],
                output: Arc::from("Code"),
            },
            Operation {
                name: Arc::from("hash"),
                inputs: vec![(Arc::from("code"), Arc::from("Code"))],
                output: Arc::from("CodeHash"),
            },
            Operation {
                name: Arc::from("file"),
                inputs: vec![
                    (Arc::from("path"), Arc::from("OutputPath")),
                    (Arc::from("code"), Arc::from("Code")),
                    (Arc::from("hash"), Arc::from("CodeHash")),
                ],
                output: Arc::from("CodeFile"),
            },
            Operation {
                name: Arc::from("trace"),
                inputs: vec![(Arc::from("code"), Arc::from("CodeFile"))],
                output: Arc::from("TraceId"),
            },
        ],
        vec![], // equations
    )
}

/// ThDomain: Theory of domain extraction from canon nodes
///
/// Sorts:
///   - Domain: The extracted domain (auth, database, api, validation, security, core)
///   - Keyword: Domain classification keywords
///   - Statement: The text to classify
///
/// Operations:
///   - extract_domain: Statement → Domain
///   - matches_keyword: Statement × Keyword → Bool
///   - get_keywords: Domain → List[Keyword]
#[cfg(feature = "panproto")]
pub fn domain_theory() -> Theory {
    Theory::new(
        Arc::from("ThDomain"),
        vec![
            Sort { name: Arc::from("Domain"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Keyword"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Statement"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("DomainMap"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            Operation {
                name: Arc::from("extract_domain"),
                inputs: vec![(Arc::from("stmt"), Arc::from("Statement"))],
                output: Arc::from("Domain"),
            },
            Operation {
                name: Arc::from("matches_keyword"),
                inputs: vec![
                    (Arc::from("stmt"), Arc::from("Statement")),
                    (Arc::from("kw"), Arc::from("Keyword")),
                ],
                output: Arc::from("Bool"),
            },
            Operation {
                name: Arc::from("get_keywords"),
                inputs: vec![(Arc::from("domain"), Arc::from("Domain"))],
                output: Arc::from("List[Keyword]"),
            },
            Operation {
                name: Arc::from("domain_cluster"),
                inputs: vec![(Arc::from("canons"), Arc::from("List[CanonNode]"))],
                output: Arc::from("DomainMap"),
            },
        ],
        vec![], // equations added via domain_equations()
    )
}

/// μ_domain: TheoryMorphism ThCanon → ThDomain
///
/// Maps canonical nodes to their extracted domains
#[cfg(feature = "panproto")]
pub fn domain_morphism() -> TheoryMorphism {
    let domain = canon_theory();
    let codomain = domain_theory();
    
    let mut sort_map = HashMap::new();
    sort_map.insert(
        Arc::from("CanonNode"),
        Arc::from("Domain"),
    );
    sort_map.insert(
        Arc::from("NodeText"),
        Arc::from("Statement"),
    );
    
    let mut op_map = HashMap::new();
    op_map.insert(
        Arc::from("get_statement"), // From canon node
        Arc::from("extract_domain"),
    );
    
    TheoryMorphism::new(
        Arc::from("μ_domain"),
        Arc::from("ThCanon"),
        Arc::from("ThDomain"),
        sort_map,
        op_map,
    )
}

/// μ_canon: TheoryMorphism ThClause → ThCanon
///
/// Maps clauses to canonical nodes (quotient by semantic equivalence)
#[cfg(feature = "panproto")]
pub fn canonize_morphism() -> TheoryMorphism {
    let domain = clause_theory();
    let codomain = canon_theory();
    
    let mut sort_map = HashMap::new();
    sort_map.insert(
        Arc::from("Clause"),
        Arc::from("CanonNode"),
    );
    sort_map.insert(
        Arc::from("ClauseType"),
        Arc::from("NodeType"),
    );
    sort_map.insert(
        Arc::from("ClauseText"),
        Arc::from("NodeText"),
    );
    sort_map.insert(
        Arc::from("CanonId"),
        Arc::from("CanonId"),
    );
    
    let mut op_map = HashMap::new();
    op_map.insert(
        Arc::from("identify"),
        Arc::from("get_id"),
    );
    op_map.insert(
        Arc::from("classify"),
        Arc::from("get_type"),
    );
    
    TheoryMorphism::new(
        Arc::from("μ_canon"),
        Arc::from("ThClause"),
        Arc::from("ThCanon"),
        sort_map,
        op_map,
    )
}

/// μ_plan: TheoryMorphism ThCanon → ThIU
///
/// Maps canonical nodes to implementation units (partition by concern)
#[cfg(feature = "panproto")]
pub fn plan_morphism() -> TheoryMorphism {
    let domain = canon_theory();
    let codomain = iu_theory();
    
    let mut sort_map = HashMap::new();
    sort_map.insert(
        Arc::from("CanonNode"),
        Arc::from("IU"),
    );
    sort_map.insert(
        Arc::from("CanonId"),
        Arc::from("CanonRef"),
    );
    
    let mut op_map = HashMap::new();
    op_map.insert(
        Arc::from("get_id"),
        Arc::from("sources"),
    );
    op_map.insert(
        Arc::from("get_type"),
        Arc::from("risk"),
    );
    
    TheoryMorphism::new(
        Arc::from("μ_plan"),
        Arc::from("ThCanon"),
        Arc::from("ThIU"),
        sort_map,
        op_map,
    )
}

/// μ_codegen: TheoryMorphism ThIU → ThCode
///
/// Maps implementation units to generated code
#[cfg(feature = "panproto")]
pub fn codegen_morphism() -> TheoryMorphism {
    let domain = iu_theory();
    let codomain = code_theory();
    
    let mut sort_map = HashMap::new();
    sort_map.insert(
        Arc::from("IU"),
        Arc::from("Code"),
    );
    sort_map.insert(
        Arc::from("Contract"),
        Arc::from("Template"),
    );
    sort_map.insert(
        Arc::from("OutputPath"),
        Arc::from("CodeFile"),
    );
    
    let mut op_map = HashMap::new();
    op_map.insert(
        Arc::from("contract_of"),
        Arc::from("generate"),
    );
    op_map.insert(
        Arc::from("output"),
        Arc::from("file"),
    );
    
    TheoryMorphism::new(
        Arc::from("μ_codegen"),
        Arc::from("ThIU"),
        Arc::from("ThCode"),
        sort_map,
        op_map,
    )
}

/// Build instance of ThCanon from actual canon nodes
#[cfg(feature = "panproto")]
pub fn canon_theory_instance(nodes: &[CanonNode]) -> Theory {
    let mut theory = canon_theory();
    
    // Add a sort for each unique node type found
    let mut seen_types = std::collections::HashSet::new();
    for node in nodes {
        let type_name = format!("{:?}", node.node_type);
        if seen_types.insert(type_name.clone()) {
            theory.sorts.push(Sort {
                name: Arc::from(type_name),
                params: vec![],
                kind: SortKind::Structural,
            });
        }
    }
    
    // Add a sort for each specific node
    for (idx, node) in nodes.iter().enumerate() {
        theory.sorts.push(Sort {
            name: Arc::from(format!("Node_{}_{}", idx, &node.id[..8.min(node.id.len())])),
            params: vec![],
            kind: SortKind::Structural,
        });
    }
    
    theory
}

/// Build instance of ThIU from actual implementation units
#[cfg(feature = "panproto")]
pub fn iu_theory_instance(ius: &[ImplementationUnit]) -> Theory {
    let mut theory = iu_theory();
    
    // Add a sort for each specific IU
    for (idx, iu) in ius.iter().enumerate() {
        theory.sorts.push(Sort {
            name: Arc::from(format!("IU_{}_{}", idx, iu.name)),
            params: vec![],
            kind: SortKind::Structural,
        });
    }
    
    // Add operations for each IU
    for (idx, iu) in ius.iter().enumerate() {
        theory.ops.push(Operation {
            name: Arc::from(format!("generate_{}", iu.name)),
            inputs: vec![
                (Arc::from("template"), Arc::from("Template")),
            ],
            output: Arc::from(format!("IU_{}_{}", idx, iu.name)),
        });
    }
    
    theory
}

/// Print formal theory summary
#[cfg(feature = "panproto")]
pub fn print_theory_summary(theory: &Theory, name: &str) {
    println!("   🧮 {}: {} sorts, {} operations", 
        name, theory.sorts.len(), theory.ops.len());
    
    // Show first few sorts
    for sort in theory.sorts.iter().take(5) {
        println!("      Sort: {}", sort.name);
    }
    if theory.sorts.len() > 5 {
        println!("      ... and {} more sorts", theory.sorts.len() - 5);
    }
    
    // Show first few operations
    for op in theory.ops.iter().take(3) {
        println!("      Op: {} → {}", op.name, op.output);
    }
    if theory.ops.len() > 3 {
        println!("      ... and {} more ops", theory.ops.len() - 3);
    }
}

/// Print morphism summary
#[cfg(feature = "panproto")]
pub fn print_morphism_summary(morphism: &TheoryMorphism) {
    println!("   ↳ {}: {} → {} ({} sorts, {} ops)",
        morphism.name,
        morphism.domain,
        morphism.codomain,
        morphism.sort_map.len(),
        morphism.op_map.len()
    );
    
    // Show key mappings
    for (src, tgt) in morphism.sort_map.iter().take(3) {
        println!("      {} → {}", src, tgt);
    }
    if morphism.sort_map.len() > 3 {
        println!("      ... and {} more", morphism.sort_map.len() - 3);
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(feature = "panproto")]
    fn test_clause_theory() {
        let theory = clause_theory();
        assert_eq!(theory.name.as_ref(), "ThClause");
        assert_eq!(theory.sorts.len(), 5);
        assert_eq!(theory.ops.len(), 4);
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_canon_theory() {
        let theory = canon_theory();
        assert_eq!(theory.name.as_ref(), "ThCanon");
        assert_eq!(theory.sorts.len(), 6);
        assert_eq!(theory.ops.len(), 5);
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_iu_theory() {
        let theory = iu_theory();
        assert_eq!(theory.name.as_ref(), "ThIU");
        assert_eq!(theory.sorts.len(), 7);
        assert_eq!(theory.ops.len(), 7);
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_canonize_morphism() {
        let morphism = canonize_morphism();
        assert_eq!(morphism.name.as_ref(), "μ_canon");
        assert_eq!(morphism.domain.as_ref(), "ThClause");
        assert_eq!(morphism.codomain.as_ref(), "ThCanon");
        assert!(!morphism.sort_map.is_empty());
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_plan_morphism() {
        let morphism = plan_morphism();
        assert_eq!(morphism.name.as_ref(), "μ_plan");
        assert_eq!(morphism.domain.as_ref(), "ThCanon");
        assert_eq!(morphism.codomain.as_ref(), "ThIU");
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_codegen_morphism() {
        let morphism = codegen_morphism();
        assert_eq!(morphism.name.as_ref(), "μ_codegen");
        assert_eq!(morphism.domain.as_ref(), "ThIU");
        assert_eq!(morphism.codomain.as_ref(), "ThCode");
    }
}
