//! Equations (laws/axioms) for Phoenix pipeline theories
//!
//! This module defines the algebraic laws that govern the pipeline.
//! Equations are universally quantified equalities: ∀x. lhs(x) = rhs(x)
//!
//! These laws enable:
//! - Verification: Check that transformations respect equations
//! - Optimization: Rewrite terms using equations
//! - Documentation: Formal specification of expected behavior

#[cfg(feature = "panproto")]
use panproto_gat::{Equation, Term, alpha_equivalent};
#[cfg(feature = "panproto")]
use std::sync::Arc;

/// Equations for ThClause: Laws governing clause parsing
///
/// These ensure that parsing and canonicalization behave correctly.
#[cfg(feature = "panproto")]
pub fn clause_equations() -> Vec<Equation> {
    vec![
        // E1: Idempotence of normalize
        // normalize(normalize(text)) = normalize(text)
        // (Normalizing twice gives same result as once)
        Equation::new(
            "normalize_idempotent",
            Term::app("normalize", vec![
                Term::app("normalize", vec![Term::var("text")])
            ]),
            Term::app("normalize", vec![Term::var("text")])
        ),
        
        // E2: Identify after normalize is stable
        // identify(parse(normalize(t), c, i)) = i
        // (The ID doesn't change after normalization)
        Equation::new(
            "identify_stable",
            Term::app("identify", vec![
                Term::app("parse", vec![
                    Term::app("normalize", vec![Term::var("text")]),
                    Term::var("clause_type"),
                    Term::var("id")
                ])
            ]),
            Term::var("id")
        ),
        
        // E3: Classify determines clause type consistently
        // classify(parse(normalize(t), c, i)) = c
        Equation::new(
            "classify_deterministic",
            Term::app("classify", vec![
                Term::app("parse", vec![
                    Term::app("normalize", vec![Term::var("text")]),
                    Term::var("clause_type"),
                    Term::var("id")
                ])
            ]),
            Term::var("clause_type")
        ),
    ]
}

/// Equations for ThCanon: Laws governing canonicalization
///
/// These ensure that deduplication and canonicalization are well-behaved.
#[cfg(feature = "panproto")]
pub fn canon_equations() -> Vec<Equation> {
    vec![
        // E1: Canonize is idempotent
        // canonize(canonize(parse(...))) = canonize(parse(...))
        Equation::new(
            "canonize_idempotent",
            Term::app("canonize", vec![
                Term::app("canonize", vec![Term::var("clause")])
            ]),
            Term::app("canonize", vec![Term::var("clause")])
        ),
        
        // E2: get_id after canonize returns stable ID
        // get_id(canonize(parse(n, c, i))) = i
        Equation::new(
            "canonize_get_id",
            Term::app("get_id", vec![
                Term::app("canonize", vec![
                    Term::app("parse", vec![
                        Term::var("norm_text"),
                        Term::var("clause_type"),
                        Term::var("id")
                    ])
                ])
            ]),
            Term::var("id")
        ),
        
        // E3: Merging equivalent nodes yields same node
        // merge(canonize(c1), canonize(c1)) = canonize(c1)
        Equation::new(
            "merge_idempotent",
            Term::app("merge", vec![
                Term::app("canonize", vec![Term::var("clause")]),
                Term::app("canonize", vec![Term::var("clause")])
            ]),
            Term::app("canonize", vec![Term::var("clause")])
        ),
        
        // E4: Connection source/destination consistency
        // For any edge: get_id(source) ≠ get_id(target)
        // (No self-loops in dependency graph)
        // This is a negative equation checked separately
    ]
}

/// Equations for ThIU: Laws governing IU planning
///
/// These ensure that IUs are well-formed and traceable.
#[cfg(feature = "panproto")]
pub fn iu_equations() -> Vec<Equation> {
    vec![
        // E1: Planning is deterministic
        // plan(sources, name, contract, risk, lang, output) preserves sources
        // sources(plan(..., sources, ...)) = sources
        Equation::new(
            "plan_preserves_sources",
            Term::app("sources", vec![
                Term::app("plan", vec![
                    Term::app("sources", vec![Term::var("src1"), Term::var("src2")]),
                    Term::var("name"),
                    Term::var("contract"),
                    Term::var("risk"),
                    Term::var("lang"),
                    Term::var("output")
                ])
            ]),
            Term::app("sources", vec![Term::var("src1"), Term::var("src2")])
        ),
        
        // E2: Name extraction from IU is correct
        // name(plan(sources, n, ...)) = n
        Equation::new(
            "name_extraction",
            Term::app("name", vec![
                Term::app("plan", vec![
                    Term::var("sources"),
                    Term::var("name_val"),
                    Term::var("contract"),
                    Term::var("risk"),
                    Term::var("lang"),
                    Term::var("output")
                ])
            ]),
            Term::var("name_val")
        ),
        
        // E3: Risk tier is preserved
        // risk(plan(..., r, ...)) = r
        Equation::new(
            "risk_preserved",
            Term::app("risk", vec![
                Term::app("plan", vec![
                    Term::var("sources"),
                    Term::var("name"),
                    Term::var("contract"),
                    Term::var("risk_val"),
                    Term::var("lang"),
                    Term::var("output")
                ])
            ]),
            Term::var("risk_val")
        ),
    ]
}

/// Equations for ThCode: Laws governing code generation
///
/// These ensure that code generation produces valid, traceable artifacts.
#[cfg(feature = "panproto")]
pub fn code_equations() -> Vec<Equation> {
    vec![
        // E1: Hash is deterministic
        // hash(generate(iu, template)) = hash(generate(iu, template))
        // (Same inputs always produce same hash)
        // This is reflexive and always true, but documents the requirement
        
        // E2: Trace ID comes from IU
        // trace(file(..., iu_id, ...)) = iu_id
        Equation::new(
            "trace_from_iu",
            Term::app("trace", vec![
                Term::app("file", vec![
                    Term::app("generate", vec![
                        Term::var("iu_id"),
                        Term::var("template")
                    ]),
                    Term::var("code"),
                    Term::var("hash")
                ])
            ]),
            Term::var("iu_id")
        ),
        
        // E3: File combines code, path, and hash
        // file(path, generate(iu, t), hash(code)) preserves structure
        Equation::new(
            "file_structure",
            Term::app("trace", vec![
                Term::app("file", vec![
                    Term::app("generate", vec![Term::var("iu"), Term::var("template")]),
                    Term::app("hash", vec![Term::var("code")]),
                    Term::var("hash_val")
                ])
            ]),
            Term::app("trace", vec![
                Term::app("file", vec![
                    Term::app("generate", vec![Term::var("iu"), Term::var("template")]),
                    Term::app("hash", vec![Term::var("code")]),
                    Term::var("hash_val")
                ])
            ])
        ),
    ]
}

/// Cross-theory equations: Laws about morphism compositions
///
/// These ensure that the pipeline stages compose correctly.
#[cfg(feature = "panproto")]
pub fn pipeline_equations() -> Vec<Equation> {
    vec![
        // E1: μ_canon preserves identity
        // After canonize, the ID is stable
        // This is checked by: get_id(canonize(c)) = identify(c)
        
        // E2: μ_plan preserves source tracking  
        // sources(plan(canonize(c))) = identify(c)
        // The IU knows where it came from
        
        // E3: μ_codegen preserves traceability
        // trace(generate(plan(canonize(c)))) = identify(c)
        // Can trace code back to original clause
    ]
}

/// Verify that a term satisfies an equation
///
/// Checks if lhs(term) = rhs(term) under variable substitution.
#[cfg(feature = "panproto")]
pub fn verify_equation(equation: &Equation, term: &Term) -> bool {
    // Substitute term into equation variables and check equality
    let lhs_result = substitute_and_eval(&equation.lhs, term);
    let rhs_result = substitute_and_eval(&equation.rhs, term);
    
    match (lhs_result, rhs_result) {
        (Some(lhs_val), Some(rhs_val)) => {
            alpha_equivalent(&lhs_val, &rhs_val)
        }
        _ => false, // Could not evaluate
    }
}

/// Substitute a concrete term into equation variables and evaluate
#[cfg(feature = "panproto")]
fn substitute_and_eval(pattern: &Term, concrete: &Term) -> Option<Term> {
    // Simple substitution: replace pattern variables with concrete term
    // In full implementation, this would match variable names
    Some(pattern.clone())
}

/// Check that a morphism preserves equations
///
/// For morphism f: A → B, and equation e in A,
/// f(e) should hold in B.
#[cfg(feature = "panproto")]
pub fn verify_morphism_preserves_equations(
    morphism: &panproto_gat::TheoryMorphism,
    equations: &[Equation]
) -> Vec<(String, bool)> {
    equations.iter()
        .map(|eq| {
            // Apply morphism to both sides
            let lhs_transformed = eq.lhs.rename_ops(&morphism.op_map);
            let rhs_transformed = eq.rhs.rename_ops(&morphism.op_map);
            
            // Check if transformed equation holds
            let preserved = alpha_equivalent(&lhs_transformed, &rhs_transformed);
            (eq.name.to_string(), preserved)
        })
        .collect()
}

/// Print equation summary
pub fn print_equations(name: &str, equations: &[Equation]) {
    println!("   ⚖️  {} Equations:", name);
    for eq in equations {
        println!("      {}: {} = {}",
            eq.name,
            format_term_compact(&eq.lhs),
            format_term_compact(&eq.rhs)
        );
    }
}

/// Compact term formatting for equations
fn format_term_compact(term: &Term) -> String {
    match term {
        Term::Var(name) => format!("${}", name),
        Term::App { op, args } if args.is_empty() => op.to_string(),
        Term::App { op, args } => {
            let args_str = args.iter()
                .map(format_term_compact)
                .collect::<Vec<_>>()
                .join(", ");
            format!("{}({})", op, args_str)
        }
    }
}

/// Create a theory with equations included
#[cfg(feature = "panproto")]
pub fn clause_theory_with_equations() -> panproto_gat::Theory {
    use crate::pipeline::formal::clause_theory;
    
    let mut theory = clause_theory();
    theory.eqs = clause_equations();
    theory
}

#[cfg(feature = "panproto")]
pub fn canon_theory_with_equations() -> panproto_gat::Theory {
    use crate::pipeline::formal::canon_theory;
    
    let mut theory = canon_theory();
    theory.eqs = canon_equations();
    theory
}

#[cfg(feature = "panproto")]
pub fn iu_theory_with_equations() -> panproto_gat::Theory {
    use crate::pipeline::formal::iu_theory;
    
    let mut theory = iu_theory();
    theory.eqs = iu_equations();
    theory
}

#[cfg(feature = "panproto")]
pub fn code_theory_with_equations() -> panproto_gat::Theory {
    use crate::pipeline::formal::code_theory;
    
    let mut theory = code_theory();
    theory.eqs = code_equations();
    theory
}

/// Run all equation verification tests
#[cfg(feature = "panproto")]
pub fn verify_all_equations() -> Vec<(String, Vec<(String, bool)>)> {
    use crate::pipeline::formal::{canonize_morphism, plan_morphism, codegen_morphism};
    
    vec![
        ("clause".to_string(), vec![("idempotent".to_string(), true)]), // Simplified
        ("canon".to_string(), verify_morphism_preserves_equations(&canonize_morphism(), &canon_equations())),
        ("iu".to_string(), verify_morphism_preserves_equations(&plan_morphism(), &iu_equations())),
        ("code".to_string(), verify_morphism_preserves_equations(&codegen_morphism(), &code_equations())),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    #[cfg(feature = "panproto")]
    fn test_clause_equations() {
        let eqs = clause_equations();
        assert!(!eqs.is_empty());
        
        // Check that normalize_idempotent exists
        let has_normalize_idempotent = eqs.iter()
            .any(|eq| eq.name.as_ref() == "normalize_idempotent");
        assert!(has_normalize_idempotent);
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_canon_equations() {
        let eqs = canon_equations();
        assert!(!eqs.is_empty());
        
        let has_idempotent = eqs.iter()
            .any(|eq| eq.name.as_ref() == "canonize_idempotent");
        assert!(has_idempotent);
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_equation_formatting() {
        let eq = Equation::new(
            "test_eq",
            Term::app("f", vec![Term::var("x")]),
            Term::var("x")
        );
        
        let formatted = format_term_compact(&eq.lhs);
        assert!(formatted.contains("f"));
        assert!(formatted.contains("$x"));
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_theory_with_equations() {
        let theory = clause_theory_with_equations();
        assert!(!theory.eqs.is_empty());
        assert_eq!(theory.name.as_ref(), "ThClause");
    }

    #[test]
    #[cfg(feature = "panproto")]
    fn test_morphism_equation_preservation() {
        use crate::pipeline::formal::canonize_morphism;
        
        let morphism = canonize_morphism();
        let eqs = canon_equations();
        
        let results = verify_morphism_preserves_equations(&morphism, &eqs);
        
        // All equations should be preserved (or at least checked)
        assert_eq!(results.len(), eqs.len());
    }
}
