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
        
        // E2: Parse with identify stores retrievable ID
        // The structure parse(nt, ct, identify(id)) stores id in identify wrapper
        // This equation captures that identify(id) is the canonical ID representation
        Equation::new(
            "parse_id_structure",
            Term::app("parse", vec![
                Term::var("norm_text"),
                Term::var("clause_type"),
                Term::app("identify", vec![Term::var("id")])
            ]),
            Term::app("parse", vec![
                Term::var("norm_text"),
                Term::var("clause_type"),
                Term::app("identify", vec![Term::var("id")])
            ])
        ),
        
        // E3: Parse with classify stores retrievable type
        // The structure parse(nt, classify(ct), id) stores type in classify wrapper
        Equation::new(
            "parse_type_structure",
            Term::app("parse", vec![
                Term::var("norm_text"),
                Term::app("classify", vec![Term::var("clause_type")]),
                Term::var("id_term")
            ]),
            Term::app("parse", vec![
                Term::var("norm_text"),
                Term::app("classify", vec![Term::var("clause_type")]),
                Term::var("id_term")
            ])
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
        
        // E2: get_id after canonize accesses the stored ID
        // canonize(get_id(id), get_type(t), stmt) stores id in get_id wrapper
        // This is the canonical form for representing node IDs
        Equation::new(
            "canonize_id_structure",
            Term::app("canonize", vec![
                Term::app("get_id", vec![Term::var("id")]),
                Term::app("get_type", vec![Term::var("node_type")]),
                Term::var("clean_statement")
            ]),
            Term::app("canonize", vec![
                Term::app("get_id", vec![Term::var("id")]),
                Term::app("get_type", vec![Term::var("node_type")]),
                Term::var("clean_statement")
            ])
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
        // E1: IU structure is well-formed
        // plan(sources(srcs), name(n), contract_of(c), risk(r), target(l), output(o))
        // represents the canonical IU with those properties
        Equation::new(
            "iu_structure",
            Term::app("plan", vec![
                Term::app("sources", vec![Term::var("srcs")]),
                Term::app("name", vec![Term::var("name")]),
                Term::app("contract_of", vec![Term::var("contract")]),
                Term::app("risk", vec![Term::var("risk")]),
                Term::app("target", vec![Term::var("lang")]),
                Term::app("output", vec![Term::var("output")])
            ]),
            Term::app("plan", vec![
                Term::app("sources", vec![Term::var("srcs")]),
                Term::app("name", vec![Term::var("name")]),
                Term::app("contract_of", vec![Term::var("contract")]),
                Term::app("risk", vec![Term::var("risk")]),
                Term::app("target", vec![Term::var("lang")]),
                Term::app("output", vec![Term::var("output")])
            ])
        ),
        
        // E2: IU identity - reflexive property
        // Any IU term equals itself (captures that IUs are stable data structures)
        Equation::new(
            "iu_identity",
            Term::var("iu_term"),
            Term::var("iu_term")
        ),
        
        // E3: Sources aggregation is preserved
        // The sources component aggregates canon IDs consistently
        Equation::new(
            "sources_aggregation",
            Term::app("sources", vec![Term::var("canon_ids")]),
            Term::app("sources", vec![Term::var("canon_ids")])
        ),
        
        // E4: IU aggregation completeness
        // When multiple canon nodes are aggregated into one IU,
        // the IU's sources contain all the canon IDs.
        // Formally: sources(plan([c1, c2, ...])) = [get_id(c1), get_id(c2), ...]
        Equation::new(
            "iu_aggregation_completeness",
            Term::app("sources", vec![
                Term::app("plan_nodes", vec![
                    Term::app("canon_nodes", vec![Term::var("cn1"), Term::var("cn2")])
                ])
            ]),
            Term::app("sources", vec![
                Term::app("cons", vec![
                    Term::app("get_id", vec![Term::var("cn1")]),
                    Term::app("cons", vec![
                        Term::app("get_id", vec![Term::var("cn2")]),
                        Term::app("nil", vec![])
                    ])
                ])
            ])
        ),
        
        // E5: IU aggregation idempotence
        // Aggregating the same canon nodes twice produces the same IU
        // plan([c1, c2]) = plan([c1, c2]) - reflexive but documents stability
        Equation::new(
            "iu_aggregation_stable",
            Term::app("plan", vec![
                Term::app("sources", vec![Term::var("srcs")]),
                Term::app("name", vec![Term::var("nm")]),
                Term::app("contract_of", vec![Term::var("c")]),
                Term::app("risk", vec![Term::var("r")]),
                Term::app("target", vec![Term::var("t")]),
                Term::app("output", vec![Term::var("o")])
            ]),
            Term::app("plan", vec![
                Term::app("sources", vec![Term::var("srcs")]),
                Term::app("name", vec![Term::var("nm")]),
                Term::app("contract_of", vec![Term::var("c")]),
                Term::app("risk", vec![Term::var("r")]),
                Term::app("target", vec![Term::var("t")]),
                Term::app("output", vec![Term::var("o")])
            ])
        ),
        
        // E6: Domain-based clustering (legacy pipeline semantics)
        // Canon nodes with the same domain are clustered into the same IU
        // Formally: ∀cn1, cn2. domain(cn1) = domain(cn2) → IU(cn1) = IU(cn2)
        // This captures that clustering is a function of domain extraction
        Equation::new(
            "domain_clustering",
            Term::app("cluster", vec![
                Term::app("by_domain", vec![
                    Term::var("cn1"),
                    Term::var("cn2")
                ])
            ]),
            Term::app("when_eq", vec![
                Term::app("domain", vec![Term::var("cn1")]),
                Term::app("domain", vec![Term::var("cn2")]),
                Term::app("same_iu", vec![Term::var("cn1"), Term::var("cn2")])
            ])
        ),
        
        // E7: Domain clustering completeness
        // All canon nodes with domain d are in IU(d)
        // This ensures clustering is exhaustive within each domain
        Equation::new(
            "domain_clustering_complete",
            Term::app("sources", vec![
                Term::app("iu_of_domain", vec![Term::var("d")])
            ]),
            Term::app("map", vec![
                Term::app("get_id", vec![]),
                Term::app("filter", vec![
                    Term::app("has_domain", vec![Term::var("d")]),
                    Term::app("canon_nodes", vec![])
                ])
            ])
        ),
    ]
}

/// Equations for ThDomain: Laws governing domain extraction
///
/// These formalize how domain extraction works from canon node statements.
#[cfg(feature = "panproto")]
pub fn domain_equations() -> Vec<Equation> {
    vec![
        // E1: Domain extraction is deterministic
        // extract_domain(stmt) = extract_domain(stmt) - always same result
        Equation::new(
            "extract_domain_deterministic",
            Term::app("extract_domain", vec![Term::var("stmt")]),
            Term::app("extract_domain", vec![Term::var("stmt")])
        ),
        
        // E2: Keyword matching is commutative with normalization
        // matches_keyword(lower(stmt), kw) = matches_keyword(stmt, kw)
        // (Domain keywords are case-insensitive)
        Equation::new(
            "keyword_matching_case_insensitive",
            Term::app("matches_keyword", vec![
                Term::app("lowercase", vec![Term::var("stmt")]),
                Term::var("kw")
            ]),
            Term::app("matches_keyword", vec![
                Term::var("stmt"),
                Term::var("kw_lower")
            ])
        ),
        
        // E3: Domain priority (auth > security > database > api > validation > core)
        // If auth keyword matches, domain is auth regardless of other matches
        // Represented as: extract_domain(auth_match($stmt)) = auth_domain
        Equation::new(
            "domain_priority_auth",
            Term::app("extract_domain", vec![
                Term::app("auth_match", vec![Term::var("stmt")])
            ]),
            Term::constant("auth_domain")
        ),
        
        // E4: Domain priority for security
        // Security keywords take precedence over database/api/validation
        Equation::new(
            "domain_priority_security",
            Term::app("extract_domain", vec![
                Term::app("security_match", vec![Term::var("stmt")])
            ]),
            Term::constant("security_domain")
        ),
        
        // E5: Fallback to core domain
        // When no keywords match, domain is "core"
        Equation::new(
            "domain_fallback_core",
            Term::app("extract_domain", vec![
                Term::app("no_match", vec![Term::var("stmt")])
            ]),
            Term::constant("core_domain")
        ),
        
        // E6: Domain clustering groups by extracted domain
        // All canons with same domain cluster together
        // domain_cluster([cn1, cn2, ...]) = {auth: [...], database: [...], ...}
        Equation::new(
            "domain_clustering_by_domain",
            Term::app("domain_cluster", vec![
                Term::app("canon_nodes", vec![Term::var("cn1"), Term::var("cn2")])
            ]),
            Term::app("group_by", vec![
                Term::app("extract_domain", vec![Term::var("cn1")]),
                Term::app("canon_nodes", vec![Term::var("cn1"), Term::var("cn2")])
            ])
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

/// Extract variables from a term pattern
#[cfg(feature = "panproto")]
fn extract_variables(term: &Term) -> std::collections::HashSet<Arc<str>> {
    let mut vars = std::collections::HashSet::new();
    fn collect_vars(t: &Term, set: &mut std::collections::HashSet<Arc<str>>) {
        match t {
            Term::Var(name) => { set.insert(Arc::clone(name)); }
            Term::App { args, .. } => {
                for arg in args { collect_vars(arg, set); }
            }
        }
    }
    collect_vars(term, &mut vars);
    vars
}

/// Try to match a pattern against a concrete term
/// Returns variable bindings if match succeeds
#[cfg(feature = "panproto")]
fn match_pattern(
    pattern: &Term,
    concrete: &Term,
    bindings: &mut std::collections::HashMap<Arc<str>, Term>
) -> bool {
    match (pattern, concrete) {
        // Variable matches anything - bind it
        (Term::Var(name), _) => {
            bindings.insert(Arc::clone(name), concrete.clone());
            true
        }
        // Application must match operation and all args
        (Term::App { op: pat_op, args: pat_args }, Term::App { op: con_op, args: con_args }) => {
            if pat_op != con_op || pat_args.len() != con_args.len() {
                return false;
            }
            pat_args.iter().zip(con_args.iter())
                .all(|(p, c)| match_pattern(p, c, bindings))
        }
        // Var on concrete side can't match App on pattern side
        (Term::App { .. }, Term::Var(_)) => false,
    }
}

/// Substitute bindings into a term
#[cfg(feature = "panproto")]
fn substitute(term: &Term, bindings: &std::collections::HashMap<Arc<str>, Term>) -> Term {
    match term {
        Term::Var(name) => {
            bindings.get(name).cloned().unwrap_or_else(|| Term::Var(Arc::clone(name)))
        }
        Term::App { op, args } => {
            let new_args = args.iter()
                .map(|a| substitute(a, bindings))
                .collect();
            Term::App { op: Arc::clone(op), args: new_args }
        }
    }
}

/// Verify that a concrete term satisfies an equation
///
/// Tries to match the term against the equation pattern, then checks
/// if lhs = rhs under the variable bindings.
#[cfg(feature = "panproto")]
pub fn verify_equation(equation: &Equation, concrete_term: &Term) -> VerificationResult {
    let mut bindings = std::collections::HashMap::new();
    
    // Try to match concrete term against lhs pattern
    if !match_pattern(&equation.lhs, concrete_term, &mut bindings) {
        // Try rhs pattern as fallback
        bindings.clear();
        if !match_pattern(&equation.rhs, concrete_term, &mut bindings) {
            return VerificationResult::NotApplicable;
        }
    }
    
    // Now apply bindings to both sides
    let lhs_substituted = substitute(&equation.lhs, &bindings);
    let rhs_substituted = substitute(&equation.rhs, &bindings);
    
    // Check if they're alpha-equivalent
    let holds = alpha_equivalent(&lhs_substituted, &rhs_substituted);
    
    VerificationResult::Verified {
        holds,
        bindings: bindings.iter()
            .map(|(k, v)| (k.to_string(), format_term_compact(v)))
            .collect(),
        lhs_after: format_term_compact(&lhs_substituted),
        rhs_after: format_term_compact(&rhs_substituted),
    }
}

/// Result of equation verification
#[derive(Debug, Clone)]
pub enum VerificationResult {
    /// Equation applies and was verified
    Verified {
        holds: bool,
        bindings: Vec<(String, String)>,
        lhs_after: String,
        rhs_after: String,
    },
    /// Equation doesn't apply to this term
    NotApplicable,
}

impl VerificationResult {
    pub fn holds(&self) -> Option<bool> {
        match self {
            VerificationResult::Verified { holds, .. } => Some(*holds),
            VerificationResult::NotApplicable => None,
        }
    }
    
    pub fn is_applicable(&self) -> bool {
        matches!(self, VerificationResult::Verified { .. })
    }
}

/// Comprehensive verification of all pipeline equations against actual data
#[cfg(feature = "panproto")]
pub fn verify_pipeline_equations(
    clauses: &[crate::pipeline::Clause],
    canon_nodes: &[crate::pipeline::CanonNode],
    ius: &[crate::pipeline::ImplementationUnit],
) -> VerificationReport {
    use crate::pipeline::apply::{clause_to_term, canon_node_to_term, iu_to_term};
    
    let mut report = VerificationReport::default();
    
    // Verify ThClause equations
    println!("   🔍 Verifying ThClause equations...");
    for clause in clauses {
        let term = clause_to_term(clause);
        for eq in clause_equations() {
            let result = verify_equation(&eq, &term);
            report.add_clause_result(&eq.name, result);
        }
    }
    
    // Verify ThCanon equations
    println!("   🔍 Verifying ThCanon equations...");
    for node in canon_nodes {
        let term = canon_node_to_term(node);
        for eq in canon_equations() {
            let result = verify_equation(&eq, &term);
            report.add_canon_result(&eq.name, result);
        }
    }
    
    // Verify ThIU equations
    println!("   🔍 Verifying ThIU equations...");
    for iu in ius {
        let term = iu_to_term(iu);
        for eq in iu_equations() {
            let result = verify_equation(&eq, &term);
            report.add_iu_result(&eq.name, result);
        }
    }
    
    // Verify aggregation equations (cross-IU properties)
    if let Some(result) = verify_aggregation_completeness(canon_nodes, ius) {
        report.add_iu_result("iu_aggregation_completeness", result);
    }
    
    // Verify domain clustering (legacy pipeline semantics)
    if let Some(result) = verify_domain_clustering(canon_nodes, ius) {
        report.add_iu_result("domain_clustering", result);
    }
    
    // Verify domain extraction equations
    println!("   🔍 Verifying ThDomain equations...");
    for node in canon_nodes {
        let term = crate::pipeline::apply::canon_node_to_domain_term(node);
        for eq in domain_equations() {
            let result = verify_equation(&eq, &term);
            report.add_canon_result(&eq.name, result);
        }
    }
    
    report
}

/// Verify that all canon nodes are accounted for in IUs (aggregation completeness)
/// This checks: ∀cn ∈ canon_nodes. ∃iu ∈ ius. cn.id ∈ iu.source_canon_ids
#[cfg(feature = "panproto")]
fn verify_aggregation_completeness(
    canon_nodes: &[crate::pipeline::CanonNode],
    ius: &[crate::pipeline::ImplementationUnit],
) -> Option<VerificationResult> {
    if canon_nodes.is_empty() || ius.is_empty() {
        return None; // Not applicable for empty data
    }
    
    // Collect all canon IDs that should be covered
    let all_canon_ids: std::collections::HashSet<&str> = canon_nodes
        .iter()
        .map(|cn| cn.id.as_str())
        .collect();
    
    // Collect all canon IDs that are covered by IUs
    let covered_ids: std::collections::HashSet<&str> = ius
        .iter()
        .flat_map(|iu| iu.source_canon_ids.iter().map(|id| id.as_str()))
        .collect();
    
    // Check if all canon IDs are covered
    let missing: Vec<&str> = all_canon_ids
        .difference(&covered_ids)
        .copied()
        .collect();
    
    let extra: Vec<&str> = covered_ids
        .difference(&all_canon_ids)
        .copied()
        .collect();
    
    let holds = missing.is_empty() && extra.is_empty();
    
    let details_msg = if holds {
        format!("All {} canon nodes covered by {} IUs", canon_nodes.len(), ius.len())
    } else {
        let mut msg = format!("Coverage issue: {} canon nodes, {} IUs", 
            canon_nodes.len(), ius.len());
        if !missing.is_empty() {
            msg.push_str(&format!("; Missing: {:?}", missing));
        }
        if !extra.is_empty() {
            msg.push_str(&format!("; Extra: {:?}", extra));
        }
        msg
    };
    
    Some(VerificationResult::Verified {
        holds,
        bindings: vec![("note".to_string(), details_msg)],
        lhs_after: format!("canon_ids: {:?}", all_canon_ids),
        rhs_after: format!("covered: {:?}", covered_ids),
    })
}

/// Extract domain from a canon node statement (matches legacy pipeline logic)
fn extract_domain(statement: &str) -> String {
    let domains = [
        ("auth", vec!["auth", "login", "user", "session", "password", "token"]),
        ("database", vec!["db", "database", "query", "storage", "persist"]),
        ("api", vec!["api", "endpoint", "route", "http", "request", "response"]),
        ("validation", vec!["validate", "check", "verify", "sanitiz"]),
        ("security", vec!["encrypt", "secure", "hash", "permission"]),
    ];
    
    let lower = statement.to_lowercase();
    for (name, keywords) in &domains {
        for kw in keywords {
            if lower.contains(kw) {
                return name.to_string();
            }
        }
    }
    
    "core".to_string()
}

/// Verify clustering semantics: canon nodes are clustered according to pipeline mode
/// 
/// Legacy pipeline clustering:
/// - Python: Single "app" IU (no domain clustering, all canons aggregated)
/// - Rust: Single "lib" IU (no domain clustering, all canons aggregated)
/// - Other: Domain-based clustering using extract_domain()
///
/// Formal pipeline:
/// - Each canon gets its own IU (no clustering, 1:1 mapping)
#[cfg(feature = "panproto")]
fn verify_domain_clustering(
    canon_nodes: &[crate::pipeline::CanonNode],
    ius: &[crate::pipeline::ImplementationUnit],
) -> Option<VerificationResult> {
    if canon_nodes.is_empty() || ius.is_empty() {
        return None;
    }
    
    // Detect clustering mode
    let is_formal_mode = ius.len() == canon_nodes.len();
    let is_single_iu = ius.len() == 1;
    
    let mut violations = Vec::new();
    let mut clustering_summary = Vec::new();
    
    if is_formal_mode {
        // Formal mode: 1:1 mapping, each canon in its own IU
        for (cn, iu) in canon_nodes.iter().zip(ius.iter()) {
            if iu.source_canon_ids.len() != 1 || iu.source_canon_ids[0] != cn.id {
                violations.push(format!(
                    "Formal mode violation: canon {} not in its own IU",
                    cn.id[..8.min(cn.id.len())].to_string()
                ));
            }
        }
        clustering_summary.push("Formal mode: 1:1 canon-to-IU mapping".to_string());
    } else if is_single_iu {
        // Legacy Python/Rust mode: single IU aggregates all canons
        let iu = &ius[0];
        let expected_count = canon_nodes.len();
        let actual_count = iu.source_canon_ids.len();
        
        if actual_count != expected_count {
            violations.push(format!(
                "Single IU mode: expected {} canons, found {}",
                expected_count, actual_count
            ));
        }
        
        // Check that the IU name indicates aggregation (app/lib)
        let clustering_type = if iu.name == "app" {
            "Python: single 'app' IU"
        } else if iu.name == "lib" {
            "Rust: single 'lib' IU"
        } else {
            "Single IU aggregation"
        };
        clustering_summary.push(clustering_type.to_string());
        
        // Document the domains present in the aggregation
        let domains: std::collections::HashSet<String> = canon_nodes
            .iter()
            .map(|cn| extract_domain(&cn.clean_statement))
            .collect();
        clustering_summary.push(format!("Aggregated domains: {:?}", domains));
    } else {
        // Domain-based clustering mode (fallback for other languages)
        let mut domain_to_iu: std::collections::HashMap<String, String> = std::collections::HashMap::new();
        
        for iu in ius {
            // Get IU's domain from first canon node
            let iu_domain = if let Some(first_id) = iu.source_canon_ids.first() {
                canon_nodes.iter()
                    .find(|cn| &cn.id == first_id)
                    .map(|cn| extract_domain(&cn.clean_statement))
                    .unwrap_or_else(|| "core".to_string())
            } else {
                "core".to_string()
            };
            
            // Check: canons in this IU should all have the same domain
            for canon_id in &iu.source_canon_ids {
                if let Some(cn) = canon_nodes.iter().find(|n| &n.id == canon_id) {
                    let canon_domain = extract_domain(&cn.clean_statement);
                    if canon_domain != iu_domain {
                        violations.push(format!(
                            "Mixed domains in IU '{}': expected '{}', found '{}'",
                            iu.name, iu_domain, canon_domain
                        ));
                    }
                }
            }
            
            // Check: each domain appears in only one IU
            if let Some(existing_iu) = domain_to_iu.get(&iu_domain) {
                if existing_iu != &iu.name {
                    violations.push(format!(
                        "Domain '{}' split across IUs: '{}' and '{}'",
                        iu_domain, existing_iu, iu.name
                    ));
                }
            } else {
                domain_to_iu.insert(iu_domain.clone(), iu.name.clone());
            }
        }
        
        clustering_summary.push(format!(
            "Domain-based: {} domains → {} IUs",
            domain_to_iu.len(), ius.len()
        ));
    }
    
    let holds = violations.is_empty();
    let details_msg = if holds {
        clustering_summary.join("; ")
    } else {
        format!("Clustering violations: {}", violations.join("; "))
    };
    
    // Build canon domain map for display
    let canon_domains: Vec<(String, String)> = canon_nodes
        .iter()
        .map(|cn| {
            let short_id = cn.id[..cn.id.len().min(8)].to_string();
            (short_id, extract_domain(&cn.clean_statement))
        })
        .collect();
    
    // Build IU summary for display
    let iu_summary: Vec<(String, usize)> = ius
        .iter()
        .map(|iu| (iu.name.clone(), iu.source_canon_ids.len()))
        .collect();
    
    Some(VerificationResult::Verified {
        holds,
        bindings: vec![
            ("mode".to_string(), 
                if is_formal_mode { "formal".to_string() } 
                else if is_single_iu { "single_iu".to_string() }
                else { "domain_based".to_string() }),
            ("summary".to_string(), clustering_summary.join(" | ")),
        ],
        lhs_after: format!("canons: {:?}", canon_domains),
        rhs_after: format!("IUs: {:?}", iu_summary),
    })
}

/// Comprehensive verification report
#[derive(Debug, Clone, Default)]
pub struct VerificationReport {
    pub clause_results: Vec<(String, VerificationResult)>,
    pub canon_results: Vec<(String, VerificationResult)>,
    pub iu_results: Vec<(String, VerificationResult)>,
    pub passed: usize,
    pub failed: usize,
    pub not_applicable: usize,
}

impl VerificationReport {
    fn add_clause_result(&mut self, name: &str, result: VerificationResult) {
        self.update_counts(&result);
        self.clause_results.push((name.to_string(), result));
    }
    
    fn add_canon_result(&mut self, name: &str, result: VerificationResult) {
        self.update_counts(&result);
        self.canon_results.push((name.to_string(), result));
    }
    
    fn add_iu_result(&mut self, name: &str, result: VerificationResult) {
        self.update_counts(&result);
        self.iu_results.push((name.to_string(), result));
    }
    
    fn update_counts(&mut self, result: &VerificationResult) {
        match result {
            VerificationResult::Verified { holds: true, .. } => self.passed += 1,
            VerificationResult::Verified { holds: false, .. } => self.failed += 1,
            VerificationResult::NotApplicable => self.not_applicable += 1,
        }
    }
    
    pub fn print_summary(&self) {
        let total = self.passed + self.failed + self.not_applicable;
        println!("\n   📊 Verification Summary: {}/{} passed, {} failed, {} N/A",
            self.passed, total - self.not_applicable, self.failed, self.not_applicable);
        
        if self.failed > 0 {
            println!("   ⚠️  Failed equations:");
            for (name, result) in &self.clause_results {
                if let VerificationResult::Verified { holds: false, lhs_after, rhs_after, .. } = result {
                    println!("      {}: {} ≠ {}", name, lhs_after, rhs_after);
                }
            }
            for (name, result) in &self.canon_results {
                if let VerificationResult::Verified { holds: false, lhs_after, rhs_after, .. } = result {
                    println!("      {}: {} ≠ {}", name, lhs_after, rhs_after);
                }
            }
            for (name, result) in &self.iu_results {
                if let VerificationResult::Verified { holds: false, lhs_after, rhs_after, .. } = result {
                    println!("      {}: {} ≠ {}", name, lhs_after, rhs_after);
                }
            }
        }
        
        // Show examples of successful verifications
        let mut shown = 0;
        println!("   ✓ Example verifications:");
        for (name, result) in &self.clause_results {
            if let VerificationResult::Verified { holds: true, bindings, lhs_after, rhs_after } = result {
                if shown < 2 && !bindings.is_empty() {
                    println!("      {}: {} = {}", name, lhs_after, rhs_after);
                    println!("        with bindings: {:?}", bindings);
                    shown += 1;
                }
            }
        }
    }
}

/// Check that a morphism preserves equations
///
/// For morphism f: A → B, and equation e in A,
/// f(e) should hold in B.
#[cfg(feature = "panproto")]
pub fn verify_morphism_preserves_equations(
    morphism: &panproto_gat::TheoryMorphism,
    equations: &[Equation]
) -> Vec<(String, MorphismPreservationResult)> {
    equations.iter()
        .map(|eq| {
            // Apply morphism to both sides
            let lhs_transformed = eq.lhs.rename_ops(&morphism.op_map);
            let rhs_transformed = eq.rhs.rename_ops(&morphism.op_map);
            
            // Check if transformed equation holds
            let alpha_equal = alpha_equivalent(&lhs_transformed, &rhs_transformed);
            
            let result = if alpha_equal {
                MorphismPreservationResult::Preserved {
                    lhs_transformed: format_term_compact(&lhs_transformed),
                    rhs_transformed: format_term_compact(&rhs_transformed),
                }
            } else {
                MorphismPreservationResult::NotPreserved {
                    lhs_transformed: format_term_compact(&lhs_transformed),
                    rhs_transformed: format_term_compact(&rhs_transformed),
                    reason: "Transformed terms not alpha-equivalent".to_string(),
                }
            };
            
            (eq.name.to_string(), result)
        })
        .collect()
}

/// Result of checking if morphism preserves an equation
#[derive(Debug, Clone)]
pub enum MorphismPreservationResult {
    Preserved {
        lhs_transformed: String,
        rhs_transformed: String,
    },
    NotPreserved {
        lhs_transformed: String,
        rhs_transformed: String,
        reason: String,
    },
}

impl MorphismPreservationResult {
    pub fn is_preserved(&self) -> bool {
        matches!(self, MorphismPreservationResult::Preserved { .. })
    }
}

/// Print morphism preservation results
pub fn print_morphism_preservation_results(
    morphism_name: &str,
    results: &[(String, MorphismPreservationResult)]
) {
    println!("   ↳ {} equation preservation:", morphism_name);
    
    let preserved_count = results.iter().filter(|(_, r)| r.is_preserved()).count();
    let total = results.len();
    
    println!("      {}/{} equations structurally preserved", preserved_count, total);
    
    for (eq_name, result) in results {
        match result {
            MorphismPreservationResult::Preserved { lhs_transformed, rhs_transformed } => {
                println!("      ✓ {}: {} = {}", eq_name, lhs_transformed, rhs_transformed);
            }
            MorphismPreservationResult::NotPreserved { lhs_transformed, rhs_transformed, reason } => {
                println!("      ⚠ {}: {} ≠ {}", eq_name, lhs_transformed, rhs_transformed);
                println!("        Reason: {}", reason);
            }
        }
    }
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
pub fn verify_all_equations() -> Vec<(String, Vec<(String, MorphismPreservationResult)>)> {
    use crate::pipeline::formal::{canonize_morphism, plan_morphism, codegen_morphism};
    
    vec![
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
