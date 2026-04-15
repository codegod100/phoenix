//! Formal GAT theories for the Phoenix pipeline
//!
//! ThSpec has exactly ONE sort: ThPythonTextual
//! The spec.ncl file IS the theory document that defines the code generation theory.
//!
//! Theory hierarchy:
//! - ThSpec: Specification theory (one sort: ThPythonTextual)
//! - ThPythonTextual: Python Textual code generation theory (defined in spec.ncl)
//!   - Sorts: Header, Sidebar, Footer, ListView, Log, etc.
//!   - Operations: header(), sidebar(), compose(), bind_key(), etc.
//! - ThCode: Generated code artifacts
//!
//! Pipeline: ThSpec.load(spec.ncl) → ThPythonTextual → ThCode.generate(ui_config)
//!
//! Each theory has sorts (types) and operations (transformations).
//! Morphisms between theories are structure-preserving maps.


use panproto_gat::{Theory, Sort, SortKind, Operation, TheoryMorphism};

use std::collections::HashMap;

use std::sync::Arc;

use crate::pipeline::{Clause, CanonNode, ImplementationUnit};
use crate::identity::{canon_id, clause_semhash, normalize_text};

// OBSOLETE: ThClause, ThCanon, ThIU theories removed
// Use direct spec→code pipeline with ThPythonTextual and ThNix

/// OBSOLETE: ThUI removed - use ThPythonTextual loaded from spec.ncl
///
/// ThUI was an intermediate theory between spec and code.
/// Now ThSpec directly contains ThPythonTextual as its single sort,
/// and ThPythonTextual's sorts (Header, Sidebar, etc.) come from spec.ncl.

#[deprecated(since = "2.0.0", note = "Use ThPythonTextual loaded from spec.ncl")]
pub fn ui_theory() -> Theory {
    panic!("ThUI is obsolete - ThPythonTextual is loaded from spec.ncl")
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

/// ThSpec: Theory of Phoenix specifications
///
/// ThSpec has exactly ONE sort: ThPythonTextual
/// The spec.ncl file IS the theory document that defines ThPythonTextual.
///
/// Sorts:
///   - ThPythonTextual: The Python Textual code generation theory
///
/// Operations:
///   - load: Path → ThPythonTextual (load theory from spec.ncl)
///   - generate: ThPythonTextual × UIConfig → Code (generate app from theory + instance)

pub fn spec_theory() -> Theory {
    Theory::new(
        Arc::from("ThSpec"),
        vec![
            // ThSpec has exactly ONE sort: the target theory
            Sort { 
                name: Arc::from("ThPythonTextual"), 
                params: vec![], 
                kind: SortKind::Structural 
            },
        ],
        vec![
            Operation {
                name: Arc::from("load"),
                inputs: vec![(Arc::from("path"), Arc::from("Path"))],
                output: Arc::from("ThPythonTextual"),
            },
            Operation {
                name: Arc::from("generate"),
                inputs: vec![
                    (Arc::from("theory"), Arc::from("ThPythonTextual")),
                    (Arc::from("config"), Arc::from("UIConfig")),
                ],
                output: Arc::from("Code"),
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

/// OBSOLETE: μ_domain removed - use direct spec→code pipeline

pub fn domain_morphism() -> TheoryMorphism {
    panic!("domain_morphism is obsolete - use direct spec→code pipeline")
}

/// OBSOLETE: μ_canon removed - use direct spec→code pipeline

pub fn canonize_morphism() -> TheoryMorphism {
    panic!("canonize_morphism is obsolete - use direct spec→code pipeline")
}

/// OBSOLETE: μ_plan removed - use direct spec→code pipeline

pub fn plan_morphism() -> TheoryMorphism {
    panic!("plan_morphism is obsolete - use direct spec→code pipeline")
}

/// OBSOLETE: μ_codegen removed - use direct spec→code pipeline

pub fn codegen_morphism() -> TheoryMorphism {
    panic!("codegen_morphism is obsolete - use direct spec→code pipeline")
}

/// μ_spec→code: TheoryMorphism ThSpec → ThCode
///
/// ThSpec has one sort: ThPythonTextual
/// The morphism composes: load(spec.ncl) → generate(theory, ui_config) → Code
///
/// Sort mapping:
/// - ThPythonTextual → Code (the target theory generates code)
///
/// Operation mapping:
/// - load → read (load theory from file)
/// - generate → generate (apply theory to generate code)

pub fn spec_to_code_morphism() -> TheoryMorphism {
    let _domain = spec_theory();
    let _codomain = code_theory();
    
    let mut sort_map = HashMap::new();
    // ThSpec's single sort maps to Code generation
    sort_map.insert(Arc::from("ThPythonTextual"), Arc::from("Code"));
    
    let mut op_map = HashMap::new();
    // Theory loading maps to file reading
    op_map.insert(Arc::from("load"), Arc::from("read"));
    // Theory application maps to code generation
    op_map.insert(Arc::from("generate"), Arc::from("generate"));
    
    TheoryMorphism::new(
        Arc::from("μ_spec→code"),
        Arc::from("ThSpec"),
        Arc::from("ThCode"),
        sort_map,
        op_map,
    )
}

/// Verification: Check that every SpecSort has a morphism to Code
/// 
/// This prevents "dashboard hallucination" where spec properties
/// don't map to generated code.

pub fn verify_spec_completeness(spec: &crate::pipeline::widget_config::UIConfig, generated_code: &str) -> Vec<String> {
    let mut gaps = vec![];
    
    // Check layout properties
    if let Some(ref layout_type) = spec.layout_type {
        if layout_type == "grid" && !generated_code.contains("grid-") {
            gaps.push(format!("Layout.type='grid' not mapped to CSS grid-* properties"));
        }
    }
    if let Some(cols) = spec.grid_columns {
        if cols > 0 && !generated_code.contains(&format!("grid-template-columns: repeat({},", cols)) {
            gaps.push(format!("Layout.grid_columns={} not in CSS", cols));
        }
    }
    
    // Check widget properties
    for widget in &spec.widgets {
        for (key, val) in &widget.props {
            if !generated_code.contains(key) && !generated_code.contains(val) {
                gaps.push(format!("Widget {}.{}={} not in generated code", 
                    widget.id.as_deref().unwrap_or("?"), key, val));
            }
        }
        // Check for width, height CSS
        if let Some((_, width)) = widget.props.iter().find(|(k, _)| k == "width") {
            if !generated_code.contains(&format!("width: {}", width)) && 
               !generated_code.contains(&format!("width:{}", width)) {
                gaps.push(format!("Widget {}.width={} not in CSS", 
                    widget.id.as_deref().unwrap_or("?"), width));
            }
        }
    }
    
    gaps
}

// OBSOLETE: canon_theory_instance and iu_theory_instance removed
// Use direct spec→code pipeline

/// Print formal theory summary

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

    // OBSOLETE: Tests for ThClause, ThCanon, ThIU removed
    // These theories are no longer used in the v2 direct spec→code pipeline.
    // The pipeline now uses ThPythonTextual and ThNix theories directly.

    #[test]
    
    fn test_code_theory() {
        let theory = code_theory();
        assert_eq!(theory.name.as_ref(), "ThCode");
    }
}
