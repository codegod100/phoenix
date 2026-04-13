//! Phoenix Lenses — Category Theory Implementation
//!
//! Implements bidirectional lenses for the Phoenix pipeline using
//! asymmetric lenses with complement (Diskin et al., 2011).
//!
//! ## Lens Laws (Mathematical Foundations)
//!
//! For a lens L : S ⇄ V with complement C:
//!
//! **GetPut**: `put(get(s), complement(s)) = s`
//!   - Getting then putting back restores original
//!
//! **PutGet**: `get(put(v, c)) = v`  
//!   - Putting then getting gives the new view
//!
//! **Composition**: For L1 : A ⇄ B and L2 : B ⇄ C
//!   - L2 ∘ L1 : A ⇄ C where
//!   - get_{L2∘L1}(a) = get_{L2}(get_{L1}(a))
//!   - put_{L2∘L1}(c, (c1, c2)) = put_{L1}(put_{L2}(c, c2), c1)
//!
//! ## Pipeline as Protolens Chain
//!
//! The Phoenix pipeline is a dependent function from specs to code:
//! ```
//! μ_total : Π(S : ThSpec). Lens(S, Code(S))
//! μ_total = μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest
//! ```

use std::collections::HashMap;
use serde::{Serialize, Deserialize};

use crate::identity::{sha256, normalize_text};

/// Complement: Data discarded by `get`, needed by `put`
///
/// When we project from a richer theory to a simpler one,
/// we capture the "lost" information in the complement.
/// This enables round-trip restoration.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Complement {
    /// Canon IDs from the source
    pub canon_ids: Vec<String>,
    /// Source locations (line numbers, file paths)
    pub provenance: Vec<Provenance>,
    /// D-rate at time of projection
    pub d_rate: f64,
    /// Timestamp of lens application
    pub timestamp: String,
    /// Additional metadata
    pub metadata: HashMap<String, String>,
}

/// Provenance tracking for traceability
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Provenance {
    pub canon_id: String,
    pub source_file: String,
    pub line_number: usize,
}

/// Asymmetric Lens: Bidirectional transformation with complement
///
/// A lens L : Source ⇄ View provides:
/// - `get`: Source → (View, Complement)
/// - `put`: (View, Complement) → Source
///
/// This enables lossless round-trips between theories.
pub struct Lens<Source, View> {
    /// Forward direction: project source to view
    pub get: Box<dyn Fn(&Source) -> (View, Complement)>,
    /// Backward direction: restore source from view
    pub put: Box<dyn Fn(&View, &Complement) -> Source>,
    /// Lens name for debugging
    pub name: &'static str,
    /// Source theory name
    pub src_theory: &'static str,
    /// Target theory name  
    pub tgt_theory: &'static str,
}

/// Lens composition: L2 ∘ L1
///
/// For L1 : A ⇄ B and L2 : B ⇄ C, the composition L2 ∘ L1 : A ⇄ C
/// satisfies:
/// - get(a) = get₂(get₁(a))
/// - put(c, (c1, c2)) = put₁(put₂(c, c2), c1)
///
/// The complement is a pair of the intermediate complements.
pub fn compose<Source, Mid, Target>(
    first: Lens<Source, Mid>,
    second: Lens<Mid, Target>,
) -> Lens<Source, Target> 
where 
    Source: Clone + 'static,
    Mid: Clone + 'static,
    Target: Clone + 'static,
{
    Lens {
        get: Box::new(move |src| {
            let (mid, comp1) = (first.get)(src);
            let (tgt, comp2) = (second.get)(&mid);
            // Combined complement includes both intermediate complements
            let combined = Complement {
                canon_ids: comp1.canon_ids,
                provenance: comp1.provenance,
                d_rate: comp1.d_rate,
                timestamp: comp1.timestamp,
                metadata: {
                    let mut m = comp1.metadata;
                    m.insert("intermediate_d_rate".to_string(), comp2.d_rate.to_string());
                    m
                },
            };
            (tgt, combined)
        }),
        put: Box::new(move |tgt, comp| {
            // First restore intermediate using second lens
            let mid = (second.put)(tgt, comp);
            // Then restore source using first lens
            (first.put)(&mid, comp)
        }),
        name: "composed",
        src_theory: first.src_theory,
        tgt_theory: second.tgt_theory,
    }
}

/// μ_ingest: ThSpec ⇄ ThClause lens
///
/// Forward: Parse markdown specs into content-addressed clauses
/// Backward: Reconstruct spec from clauses (preserving structure)
pub fn ingest_lens() -> Lens<SpecDocument, ClauseGraph> {
    Lens {
        get: Box::new(|spec| {
            let (clauses, prov) = spec.parse_clauses();
            let graph = ClauseGraph { clauses };
            let comp = Complement {
                canon_ids: graph.clauses.iter().map(|c| c.id.clone()).collect(),
                provenance: prov,
                d_rate: 0.0, // No duplicates at this stage
                timestamp: chrono::Utc::now().to_rfc3339(),
                metadata: HashMap::new(),
            };
            (graph, comp)
        }),
        put: Box::new(|graph, comp| {
            // Reconstruct spec from clauses using provenance
            let mut sections: HashMap<String, Vec<&Clause>> = HashMap::new();
            for clause in &graph.clauses {
                sections.entry(clause.section.clone())
                    .or_default()
                    .push(clause);
            }
            
            let content = sections.iter()
                .map(|(section, clauses)| {
                    let mut s = format!("## {}\n\n", section);
                    for c in clauses {
                        s.push_str(&format!("- {:?}: {}\n", c.clause_type, c.raw_text));
                    }
                    s
                })
                .collect::<Vec<_>>()
                .join("\n");
            
            SpecDocument { 
                content, 
                path: comp.provenance.first().map(|p| p.source_file.clone()).unwrap_or_default(),
                target_language: comp.metadata.get("target_lang").cloned().unwrap_or_else(|| "rust".to_string()),
            }
        }),
        name: "μ_ingest",
        src_theory: "ThSpec",
        tgt_theory: "ThClause",
    }
}

/// μ_canon: ThClause ⇄ ThCanon lens  
///
/// Forward: Collapse duplicate clauses (quotient morphism)
/// Backward: Expand canonical nodes with complement info
///
/// This is the critical quotient lens - it identifies clauses
/// with identical normalized text.
pub fn canonicalize_lens() -> Lens<ClauseGraph, CanonGraph> {
    Lens {
        get: Box::new(|clauses| {
            let mut canon_map: HashMap<String, CanonNode> = HashMap::new();
            let mut duplicates = 0u32;
            
            for clause in &clauses.clauses {
                let key = clause.text.clone();
                
                if let Some(existing) = canon_map.get_mut(&key) {
                    // Duplicate detected
                    duplicates += 1;
                    existing.derived_from.push(clause.id.clone());
                } else {
                    // New canonical node
                    canon_map.insert(key.clone(), CanonNode {
                        id: clause.id.clone(),
                        node_type: match clause.clause_type {
                            ClauseType::Requirement => CanonNodeType::Requirement,
                            ClauseType::Constraint => CanonNodeType::Constraint,
                            ClauseType::Definition => CanonNodeType::Definition,
                            ClauseType::Assumption => CanonNodeType::Assumption,
                            ClauseType::Scenario => CanonNodeType::Scenario,
                        },
                        clean_statement: clause.text.clone(),
                        derived_from: vec![clause.id.clone()],
                        depends_on: vec![],
                        d_rate: duplicates as f64 / clauses.clauses.len().max(1) as f64,
                        confidence: 1.0,
                    });
                }
            }
            
            let graph = CanonGraph {
                nodes: canon_map.into_values().collect(),
            };
            
            let comp = Complement {
                canon_ids: graph.nodes.iter().map(|n| n.id.clone()).collect(),
                provenance: clauses.clauses.iter().map(|c| Provenance {
                    canon_id: c.id.clone(),
                    source_file: c.source_file.clone(),
                    line_number: c.line,
                }).collect(),
                d_rate: duplicates as f64 / clauses.clauses.len().max(1) as f64,
                timestamp: chrono::Utc::now().to_rfc3339(),
                metadata: {
                    let mut m = HashMap::new();
                    m.insert("total_clauses".to_string(), clauses.clauses.len().to_string());
                    m.insert("duplicates".to_string(), duplicates.to_string());
                    m.insert("unique".to_string(), graph.nodes.len().to_string());
                    m
                },
            };
            
            (graph, comp)
        }),
        put: Box::new(|canon, comp| {
            // Expand canonical nodes back to clauses using complement
            let mut clauses = Vec::new();
            
            for node in &canon.nodes {
                // Each canonical node represents one or more original clauses
                for canon_id in &node.derived_from {
                    // Find provenance for this clause
                    let prov = comp.provenance.iter()
                        .find(|p| p.canon_id == *canon_id);
                    
                    clauses.push(Clause {
                        id: canon_id.clone(),
                        clause_type: match node.node_type {
                            CanonNodeType::Requirement => ClauseType::Requirement,
                            CanonNodeType::Constraint => ClauseType::Constraint,
                            CanonNodeType::Definition => ClauseType::Definition,
                            CanonNodeType::Assumption => ClauseType::Assumption,
                            CanonNodeType::Scenario => ClauseType::Scenario,
                            CanonNodeType::PipelineUpgrade => ClauseType::Requirement,
                        },
                        text: node.clean_statement.clone(),
                        raw_text: node.clean_statement.clone(),
                        section: prov.map(|p| extract_section(&p.source_file)).unwrap_or_default(),
                        source_file: prov.map(|p| p.source_file.clone()).unwrap_or_default(),
                        line: prov.map(|p| p.line_number).unwrap_or(0),
                        clause_semhash: sha256(&format!("clause:{}", node.clean_statement)),
                        context_semhash: sha256(&format!("section:{};text:{}", 
                            extract_section(&prov.map(|p| p.source_file.clone()).unwrap_or_default()),
                            node.clean_statement)),
                        language_marker: None, // Unknown during reverse transformation
                    });
                }
            }
            
            ClauseGraph { clauses }
        }),
        name: "μ_canon",
        src_theory: "ThClause",
        tgt_theory: "ThCanon",
    }
}

/// μ_plan: ThCanon ⇄ ThIU lens
///
/// Forward: Partition canonical nodes into Implementation Units
/// Backward: Decompose IUs back to canonical nodes
///
/// Architecture-agnostic: Generates IUs based on protocol/domain from specs,
/// NOT hardcoded application knowledge.
pub fn plan_lens(target_language: &'static str) -> Lens<CanonGraph, IUGraph> {
    Lens {
        get: Box::new(move |canon| {
            let lang = target_language.to_lowercase().trim().to_string();
            let mut ius = Vec::new();
            
            if lang == "python" || lang == "py" {
                // Python: Single app IU
                let contract = format!("Python {} application", target_language);
                let canon_ids: Vec<String> = canon.nodes.iter().map(|n| n.id.clone()).collect();
                let iu_id = crate::identity::iu_id("app", &contract, &canon_ids);
                
                ius.push(IU {
                    iu_id,
                    name: "app".to_string(),
                    contract,
                    source_canon_ids: canon_ids,
                    risk_tier: determine_risk_tier(&canon.nodes.iter().collect::<Vec<_>>()),
                    target_language: target_language.to_string(),
                    output_files: vec!["src/app.py".to_string()],
                });
                
                println!("   Python: 1 IU (app)");
            } else if lang == "rust" || lang == "rs" {
                // Rust: Single library IU
                let contract = format!("Rust {} library", target_language);
                let canon_ids: Vec<String> = canon.nodes.iter().map(|n| n.id.clone()).collect();
                let iu_id = crate::identity::iu_id("lib", &contract, &canon_ids);
                
                ius.push(IU {
                    iu_id,
                    name: "lib".to_string(),
                    contract,
                    source_canon_ids: canon_ids,
                    risk_tier: determine_risk_tier(&canon.nodes.iter().collect::<Vec<_>>()),
                    target_language: target_language.to_string(),
                    output_files: vec!["src/lib.rs".to_string()],
                });
                
                println!("   Rust: 1 IU (lib)");
            } else {
                // Fallback: domain-based partitioning for other languages
                let mut groups: HashMap<String, Vec<&CanonNode>> = HashMap::new();
                for node in &canon.nodes {
                    let domain = extract_domain(&node.clean_statement);
                    groups.entry(domain).or_default().push(node);
                }
                
                for (domain, nodes) in groups {
                    let canon_ids: Vec<String> = nodes.iter().map(|n| n.id.clone()).collect();
                    let name = format!("{}", domain);
                    let contract = format!(
                        "Implements {} requirements: {}",
                        nodes.len(),
                        nodes.iter().map(|n| n.clean_statement.clone()).collect::<Vec<_>>().join("; ")
                    );
                    
                    let iu_id = crate::identity::iu_id(&name, &contract, &canon_ids);
                    
                    let ext = match target_language {
                        "rust" => "rs",
                        "typescript" => "ts",
                        "python" => "py",
                        _ => "rs",
                    };
                    
                    ius.push(IU {
                        iu_id: iu_id.clone(),
                        name,
                        contract,
                        source_canon_ids: canon_ids,
                        risk_tier: determine_risk_tier(&nodes),
                        target_language: target_language.to_string(),
                        output_files: vec![format!("src/generated/{}.{}", 
                            domain.to_lowercase().replace("-", "_"),
                            ext
                        )],
                    });
                }
                
                // Create integration IU
                let integration_iu = create_integration_iu(&ius, target_language);
                ius.push(integration_iu);
            }
            
            let graph = IUGraph { ius };
            
            let comp = Complement {
                canon_ids: canon.nodes.iter().map(|n| n.id.clone()).collect(),
                provenance: vec![],
                d_rate: 0.0,
                timestamp: chrono::Utc::now().to_rfc3339(),
                metadata: {
                    let mut m = HashMap::new();
                    m.insert("total_canon".to_string(), canon.nodes.len().to_string());
                    m.insert("ius_created".to_string(), graph.ius.len().to_string());
                    m.insert("target_lang".to_string(), target_language.to_string());
                    m
                },
            };
            
            (graph, comp)
        }),
        put: Box::new(|iu_graph, _comp| {
            // Decompose IUs back to canonical nodes
            let mut nodes = Vec::new();
            
            for iu in &iu_graph.ius {
                for canon_id in &iu.source_canon_ids {
                    nodes.push(CanonNode {
                        id: canon_id.clone(),
                        node_type: CanonNodeType::Requirement, // Default
                        clean_statement: format!("From IU {}: {}", iu.name, iu.contract),
                        derived_from: vec![canon_id.clone()],
                        depends_on: vec![],
                        d_rate: 0.0,
                        confidence: 1.0,
                    });
                }
            }
            
            CanonGraph { nodes }
        }),
        name: "μ_plan",
        src_theory: "ThCanon",
        tgt_theory: "ThIU",
    }
}

/// Create an Integration IU that wires all modules together into a working app
fn create_integration_iu(domain_ius: &[IU], target_language: &str) -> IU {
    let module_names: Vec<String> = domain_ius.iter()
        .map(|iu| iu.name.to_lowercase().replace("-", "_"))
        .collect();
    
    let ext = match target_language {
        "rust" => "rs",
        "typescript" => "ts",
        "python" => "py",
        _ => "rs",
    };
    
    let contract = format!(
        "Integration module wiring {} domain modules into a unified application: {}",
        domain_ius.len(),
        module_names.join(", ")
    );
    
    let name = "app".to_string();
    let canon_ids: Vec<String> = domain_ius.iter()
        .flat_map(|iu| iu.source_canon_ids.clone())
        .take(5)
        .collect();
    
    let iu_id = crate::identity::iu_id(&name, &contract, &canon_ids);
    
    IU {
        iu_id,
        name,
        contract,
        source_canon_ids: canon_ids,
        risk_tier: crate::evidence::RiskTier::High,
        target_language: target_language.to_string(),
        output_files: vec![format!("src/generated/app.{}", ext)],
    }
}

/// μ_codegen: ThIU ⇄ ThCode lens
///
/// Forward: Generate code from IU contracts
/// Backward: Extract IU info from code (via phoenix: iu_id comments)
pub fn codegen_lens() -> Lens<IUGraph, CodeGraph> {
    Lens {
        get: Box::new(|iu_graph| {
            let mut files = Vec::new();
            
            for iu in &iu_graph.ius {
                let code = generate_code(&iu);
                let hash = crate::identity::file_hash(&code);
                
                files.push(CodeFile {
                    path: iu.output_files.first().cloned().unwrap_or_else(|| format!("generated/{}.rs", iu.name)),
                    iu_id: iu.iu_id.clone(),
                    content: code,
                    hash: hash.clone(),
                    traces_to: iu.source_canon_ids.clone(),
                });
            }
            
            let graph = CodeGraph { files };
            
            let comp = Complement {
                canon_ids: iu_graph.ius.iter()
                    .flat_map(|iu| iu.source_canon_ids.clone())
                    .collect(),
                provenance: vec![],
                d_rate: 0.0,
                timestamp: chrono::Utc::now().to_rfc3339(),
                metadata: {
                    let mut m = HashMap::new();
                    m.insert("files_generated".to_string(), graph.files.len().to_string());
                    m
                },
            };
            
            (graph, comp)
        }),
        put: Box::new(|code_graph, _comp| {
            // Extract IU info from code files
            let mut ius = Vec::new();
            
            for file in &code_graph.files {
                // Parse IU ID from phoenix comment
                let iu_id = extract_iu_id_from_code(&file.content)
                    .unwrap_or_else(|| file.iu_id.clone());
                
                let canon_ids = extract_canon_ids_from_code(&file.content);
                
                ius.push(IU {
                    iu_id,
                    name: file.path.clone(),
                    contract: "Extracted from code".to_string(),
                    source_canon_ids: canon_ids,
                    risk_tier: crate::evidence::RiskTier::Low,
                    target_language: "rust".to_string(),
                    output_files: vec![file.path.clone()],
                });
            }
            
            IUGraph { ius }
        }),
        name: "μ_codegen",
        src_theory: "ThIU",
        tgt_theory: "ThCode",
    }
}

/// The complete pipeline as a composed lens
///
/// μ_total = μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest
///
/// This gives us the full spec-to-code transformation with
/// round-trip capability through the complement chain.
pub fn pipeline_lens(target_language: &'static str) -> Lens<SpecDocument, CodeGraph> {
    let ingest = ingest_lens();
    let canon = canonicalize_lens();
    let plan = plan_lens(target_language);
    let codegen = codegen_lens();
    
    // Compose: codegen ∘ plan ∘ canon ∘ ingest
    let step1 = compose(ingest, canon);
    let step2 = compose(step1, plan);
    compose(step2, codegen)
}

/// Lens law verification
///
/// Checks GetPut and PutGet laws on a test instance.
pub fn verify_lens_laws<Source, View>(
    lens: &Lens<Source, View>,
    test_source: &Source,
) -> LensVerification
where
    Source: Clone + PartialEq,
    View: Clone + PartialEq,
{
    // GetPut: put(get(s), complement(s)) = s
    let (view, comp) = (lens.get)(test_source);
    let restored = (lens.put)(&view, &comp);
    let getput_holds = restored == *test_source;
    
    // PutGet: get(put(v, c)) = v
    let put_result = (lens.put)(&view, &comp);
    let (view2, _) = (lens.get)(&put_result);
    let putget_holds = view2 == view;
    
    LensVerification {
        lens_name: lens.name.to_string(),
        getput_holds,
        putget_holds,
        roundtrip_success: getput_holds && putget_holds,
    }
}

/// Result of lens law verification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LensVerification {
    pub lens_name: String,
    pub getput_holds: bool,
    pub putget_holds: bool,
    pub roundtrip_success: bool,
}

// === Data Structures ===

/// Specification document (ThSpec)
#[derive(Debug, Clone, PartialEq)]
pub struct SpecDocument {
    pub content: String,
    pub path: String,
    pub target_language: String, // e.g., "rust", "python"
}

impl SpecDocument {
    /// Parse clauses from spec content
    /// 
    /// Supports both NCL-style (current) and legacy markdown formats
    fn parse_clauses(&self) -> (Vec<Clause>, Vec<Provenance>) {
        let mut clauses = Vec::new();
        let mut provenance = Vec::new();
        
        let lines: Vec<&str> = self.content.lines().collect();
        let mut current_section = String::new();
        
        // Check if this is NCL content (panproto-style specs)
        let is_ncl = self.path.ends_with(".ncl") || (
            self.content.contains("=") && 
            (self.content.contains("morphisms") || 
             self.content.contains("compositions") ||
             self.content.contains("protocols") ||
             self.content.contains("requirements"))
        );
        
        if is_ncl {
            // Use proper Nickel parser with nickel-lang-core
            match crate::ncl::parse_ncl_spec(&self.content, &self.path) {
                Ok(parsed) => {
                    // Handle requirements-style specs
                    for req in &parsed.requirements {
                        let raw_text = format!("[{}] {}: {}", 
                            req.priority.to_uppercase(), 
                            req.id, 
                            req.description
                        );
                        let normalized = normalize_text(&raw_text);
                        let id = crate::identity::canon_id(&normalized);
                        
                        let clause = Clause {
                            id: id.clone(),
                            clause_type: ClauseType::Requirement,
                            text: normalized.clone(),
                            raw_text: raw_text.clone(),
                            section: format!("protocol:{}", req.protocol),
                            source_file: self.path.clone(),
                            line: 1, // Line info not available from AST
                            clause_semhash: sha256(&format!("clause:{}", normalized)),
                            context_semhash: sha256(&format!("protocol:{};req:{}", req.protocol, req.id)),
                            language_marker: Some(req.language.clone()),
                        };
                        
                        provenance.push(Provenance {
                            canon_id: id,
                            source_file: self.path.clone(),
                            line_number: 1,
                        });
                        
                        clauses.push(clause);
                    }
                    
                    // Handle morphisms-style specs
                    for morph in &parsed.morphisms {
                        if morph.generation_content.is_some() {
                            let raw_text = format!("Morphism {}: {} → {} [{}]", 
                                morph.name,
                                morph.domain,
                                morph.codomain,
                                morph.language
                            );
                            let normalized = normalize_text(&raw_text);
                            let id = crate::identity::canon_id(&normalized);
                            
                            let clause = Clause {
                                id: id.clone(),
                                clause_type: ClauseType::Requirement,
                                text: normalized.clone(),
                                raw_text: raw_text.clone(),
                                section: format!("morphism:{}", morph.name),
                                source_file: self.path.clone(),
                                line: 1,
                                clause_semhash: sha256(&format!("clause:{}", normalized)),
                                context_semhash: sha256(&format!("morphism:{}", morph.name)),
                                language_marker: Some(morph.language.clone()),
                            };
                            
                            provenance.push(Provenance {
                                canon_id: id,
                                source_file: self.path.clone(),
                                line_number: 1,
                            });
                            
                            clauses.push(clause);
                        }
                    }
                    
                    // Handle compositions-style specs (use 'result' field)
                    for comp in &parsed.compositions {
                        if comp.generation_content.is_some() {
                            let raw_text = format!("Composition {}: bases {:?} → {} [{}]", 
                                comp.name,
                                comp.domain,  // first base
                                comp.codomain, // result
                                comp.language
                            );
                            let normalized = normalize_text(&raw_text);
                            let id = crate::identity::canon_id(&normalized);
                            
                            let clause = Clause {
                                id: id.clone(),
                                clause_type: ClauseType::Requirement,
                                text: normalized.clone(),
                                raw_text: raw_text.clone(),
                                section: format!("composition:{}", comp.name),
                                source_file: self.path.clone(),
                                line: 1,
                                clause_semhash: sha256(&format!("clause:{}", normalized)),
                                context_semhash: sha256(&format!("composition:{}", comp.name)),
                                language_marker: Some(comp.language.clone()),
                            };
                            
                            provenance.push(Provenance {
                                canon_id: id,
                                source_file: self.path.clone(),
                                line_number: 1,
                            });
                            
                            clauses.push(clause);
                        }
                    }
                }
                Err(e) => {
                    // Fallback: create a single clause noting the parse error
                    let raw_text = format!("NCL parse error (fallback): {}", e);
                    let normalized = normalize_text(&raw_text);
                    let id = crate::identity::canon_id(&normalized);
                    
                    let clause = Clause {
                        id: id.clone(),
                        clause_type: ClauseType::Requirement,
                        text: normalized.clone(),
                        raw_text,
                        section: "ncl-parse-fallback".to_string(),
                        source_file: self.path.clone(),
                        line: 1,
                        clause_semhash: sha256(&format!("clause:{}", normalized)),
                        context_semhash: sha256("ncl-fallback"),
                        language_marker: Some(self.target_language.clone()),
                    };
                    
                    provenance.push(Provenance {
                        canon_id: id,
                        source_file: self.path.clone(),
                        line_number: 1,
                    });
                    
                    clauses.push(clause);
                }
            }
            
            // Also add generation directive clauses
            for (i, line) in lines.iter().enumerate() {
                let trimmed = line.trim();
                if trimmed.contains("generation") && trimmed.contains("=") && trimmed.contains("{") {
                    let language = if self.content.contains("language = \"rust\"") || 
                                      self.content.contains("language = 'rust'") {
                        "rust"
                    } else if self.content.contains("language = \"python\"") || 
                              self.content.contains("language = 'python'") {
                        "python"
                    } else if self.content.contains("language = \"pyo3\"") || 
                              self.content.contains("language = 'pyo3'") {
                        "pyo3"
                    } else {
                        "unknown"
                    };
                    
                    let raw_text = format!("Generation directive: {}", trimmed);
                    let normalized = normalize_text(&raw_text);
                    let id = crate::identity::canon_id(&normalized);
                    
                    let clause = Clause {
                        id: id.clone(),
                        clause_type: ClauseType::Requirement,
                        text: normalized.clone(),
                        raw_text,
                        section: "generation".to_string(),
                        source_file: self.path.clone(),
                        line: i + 1,
                        clause_semhash: sha256(&format!("clause:{}", normalized)),
                        context_semhash: sha256(&format!("section:generation;directive:{}", trimmed)),
                        language_marker: Some(language.to_string()),
                    };
                    
                    provenance.push(Provenance {
                        canon_id: id,
                        source_file: self.path.clone(),
                        line_number: i + 1,
                    });
                    
                    clauses.push(clause);
                }
            }
        } else {
            // Legacy markdown parsing (kept for backwards compatibility)
            let mut current_marker: Option<String> = None;
            
            // Determine relevant markers for target language
            let relevant_markers: Vec<&str> = match self.target_language.as_str() {
                "rust" => vec!["rust", "pyo3"],
                "python" | "py" => vec!["python"],
                _ => vec![&self.target_language],
            };
            
            for (i, line) in lines.iter().enumerate() {
                // Track language markers
                if line.trim() == "[rust]" || line.trim().starts_with("##") && line.contains("[rust]") {
                    current_marker = Some("rust".to_string());
                    continue;
                }
                if line.trim() == "[python]" || line.trim().starts_with("##") && line.contains("[python]") {
                    current_marker = Some("python".to_string());
                    continue;
                }
                if line.trim() == "[pyo3]" || line.trim().starts_with("##") && line.contains("[pyo3]") {
                    current_marker = Some("pyo3".to_string());
                    continue;
                }
                
                // Track sections
                if line.starts_with("## ") && !line.contains('[') {
                    current_section = line.trim_start_matches("## ").trim().to_string();
                    current_marker = None; // Reset marker at new section
                    continue;
                }
                
                let patterns = [
                    ("REQUIREMENT", ClauseType::Requirement),
                    ("CONSTRAINT", ClauseType::Constraint),
                    ("DEFINITION", ClauseType::Definition),
                    ("ASSUMPTION", ClauseType::Assumption),
                    ("SCENARIO", ClauseType::Scenario),
                ];
                
                for (prefix, clause_type) in &patterns {
                    let pattern = format!("- {}:", prefix);
                    if line.starts_with(&pattern) {
                        let raw_text = line.trim_start_matches(&pattern).trim().to_string();
                        let normalized = normalize_text(&raw_text);
                        let id = crate::identity::canon_id(&normalized);
                        
                        // Determine effective marker
                        let effective_marker = current_marker.clone().or_else(|| {
                            if current_section.to_lowercase().contains("rust") ||
                               current_section.to_lowercase().contains("sdk") {
                                Some("rust".to_string())
                            } else if current_section.to_lowercase().contains("python") ||
                                      current_section.to_lowercase().contains("tui") {
                                Some("python".to_string())
                            } else {
                                None
                            }
                        });
                        
                        // Check if clause should be included
                        let should_include = match &effective_marker {
                            None => true,
                            Some(m) => relevant_markers.contains(&m.as_str()),
                        };
                        
                        if should_include {
                            let clause = Clause {
                                id: id.clone(),
                                clause_type: *clause_type,
                                text: normalized.clone(),
                                raw_text: raw_text.clone(),
                                section: current_section.clone(),
                                source_file: self.path.clone(),
                                line: i + 1,
                                clause_semhash: sha256(&format!("clause:{}", normalized)),
                                context_semhash: sha256(&format!("section:{};text:{}", 
                                    current_section, normalized)),
                                language_marker: effective_marker,
                            };
                            
                            provenance.push(Provenance {
                                canon_id: id,
                                source_file: self.path.clone(),
                                line_number: i + 1,
                            });
                            
                            clauses.push(clause);
                        }
                        break;
                    }
                }
            }
        }
        
        (clauses, provenance)
    }
}

/// Clause graph (ThClause)
#[derive(Debug, Clone, PartialEq)]
pub struct ClauseGraph {
    pub clauses: Vec<Clause>,
}

/// Canonical graph (ThCanon)
#[derive(Debug, Clone, PartialEq)]
pub struct CanonGraph {
    pub nodes: Vec<CanonNode>,
}

/// IU graph (ThIU)
#[derive(Debug, Clone, PartialEq)]
pub struct IUGraph {
    pub ius: Vec<IU>,
}

/// Code graph (ThCode)
#[derive(Debug, Clone, PartialEq)]
pub struct CodeGraph {
    pub files: Vec<CodeFile>,
}

/// Code file
#[derive(Debug, Clone, PartialEq)]
pub struct CodeFile {
    pub path: String,
    pub iu_id: String,
    pub content: String,
    pub hash: String,
    pub traces_to: Vec<String>,
}

// Reuse types from pipeline.rs
use crate::pipeline::{Clause, ClauseType, CanonNode, CanonNodeType, ImplementationUnit as IU};

// Helper functions

/// Extract OUTPUT_PATH from canon nodes if specified
/// Format in specs: "OUTPUT_PATH: path/to/file.ext"
fn extract_output_path(nodes: &[&CanonNode], default: &str) -> String {
    for node in nodes {
        if let Some(pos) = node.clean_statement.find("OUTPUT_PATH:") {
            let after_marker = &node.clean_statement[pos + "OUTPUT_PATH:".len()..];
            // Extract the path (trim whitespace, take until end of line)
            let path = after_marker
                .lines()
                .next()
                .unwrap_or("")
                .trim()
                .to_string();
            if !path.is_empty() {
                return path;
            }
        }
    }
    default.to_string()
}

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

fn determine_risk_tier(nodes: &[&CanonNode]) -> crate::evidence::RiskTier {
    let security_keywords = ["security", "auth", "encrypt", "password", "token"];
    let critical_keywords = ["payment", "billing", "money", "medical"];
    
    let all_text: String = nodes.iter().map(|n| n.clean_statement.clone()).collect::<Vec<_>>().join(" ");
    let lower = all_text.to_lowercase();
    
    for kw in &critical_keywords {
        if lower.contains(kw) {
            return crate::evidence::RiskTier::Critical;
        }
    }
    
    for kw in &security_keywords {
        if lower.contains(kw) {
            return crate::evidence::RiskTier::High;
        }
    }
    
    if nodes.len() > 5 {
        crate::evidence::RiskTier::Medium
    } else {
        crate::evidence::RiskTier::Low
    }
}

fn extract_section(path: &str) -> String {
    path.split('/')
        .last()
        .and_then(|f| f.strip_suffix(".ncl").or_else(|| f.strip_suffix(".md")))
        .unwrap_or("default")
        .to_string()
}

fn generate_code(iu: &IU) -> String {
    // Special handling for integration app IU
    if iu.name == "app" {
        return generate_integration_skeleton(iu);
    }
    
    match iu.target_language.as_str() {
        "rust" => generate_rust(iu),
        "typescript" => generate_typescript(iu),
        "python" => generate_python(iu),
        _ => generate_rust(iu),
    }
}

/// Generate skeleton integration code for the app IU
fn generate_integration_skeleton(iu: &IU) -> String {
    // Extract module names from contract: "Integration module wiring N domain modules: mod1, mod2, ..."
    let module_names: Vec<String> = iu.contract
        .split(": ")
        .nth(1)
        .map(|s| s.split(", ").map(|m| m.to_string()).collect())
        .unwrap_or_default();
    
    match iu.target_language.as_str() {
        "python" => generate_python_app_skeleton(iu, &module_names),
        "rust" => generate_rust_app_skeleton(iu, &module_names),
        "typescript" => generate_typescript_app_skeleton(iu, &module_names),
        _ => generate_python_app_skeleton(iu, &module_names),
    }
}

fn generate_python_app_skeleton(_iu: &IU, _module_names: &[String]) -> String {
    // Skeleton generation requires explicit template - NO INFERENCE per agents.md
    panic!(
        "Skeleton generation removed.\n\
         Template MUST be explicitly specified.\n\
         Add to your spec.ncl:\n\
         template = 'python-textual'  # for TUI apps\n\
         template = 'python-flask'    # for web apps\n\
         template = 'rust'            # for Rust apps\n\
         Or use build_type = 'python' | 'rust' | 'pyo3'"
    );
}

fn generate_rust_app_skeleton(_iu: &IU, _module_names: &[String]) -> String {
    panic!(
        "Rust app template not yet implemented.\n\
         Create templates/rust-app.ncl with code generation template."
    );
}

fn generate_typescript_app_skeleton(_iu: &IU, _module_names: &[String]) -> String {
    panic!(
        "TypeScript app template not yet implemented.\n\
         Create templates/typescript-app.ncl with code generation template."
    );
}

/// Generate code using LLM (async version for actual intelligent generation)
pub async fn generate_code_with_llm(
    iu: &IU, 
    config: &crate::llm::LlmConfig, 
    all_ius: Option<&[IU]>,
    module_apis: Option<Vec<crate::llm::ModuleApi>>,
    template_name: Option<&str>,  // EXPLICIT template selection per agents.md
) -> anyhow::Result<String> {
    // Load template for LLM prompt - MUST be explicit per agents.md
    let template_name = template_name.expect(
        "Template MUST be explicitly specified.\n\
         Add to your spec.ncl:\n\
         template = 'python-textual'  # for TUI apps\n\
         template = 'python-flask'    # for web apps\n\
         template = 'rust'            # for Rust apps\n\
         Or use build_type = 'python' to use templates/python.ncl"
    );
    
    // Template directory must exist - NO FALLBACKS per agents.md
    let template_dir = std::env::current_exe()
        .ok()
        .and_then(|exe| exe.parent().map(|p| p.join("templates")))
        .expect("Cannot determine template directory from executable path.\n\
                 Set PHOENIX_TEMPLATE_DIR env var or ensure templates/ is next to binary.");
    
    if !template_dir.exists() {
        panic!(
            "Templates directory not found: {}\n\
             Ensure templates/ directory exists at this location or set PHOENIX_TEMPLATE_DIR env var.",
            template_dir.display()
        );
    }
    
    let template = crate::ncl::load_code_template(&template_dir, template_name)
        .expect(&format!("Failed to load template '{}' from {}", template_name, template_dir.display()));
    
    let llm_prompt = Some(template.llm_prompt.as_str());
    
    // Special handling for integration app IU
    if iu.name == "app" {
        return generate_app_integration_with_llm(iu, config, all_ius, module_apis, llm_prompt).await;
    }
    
    // Extract actual requirement lines from the contract
    let requirements: Vec<String> = iu.contract
        .split("Implements ")
        .nth(1)
        .and_then(|s| s.split(": ").nth(1))
        .map(|s| s.split("; ").map(|r| r.to_string()).collect::<Vec<String>>())
        .unwrap_or_default()
        .into_iter()
        .filter(|r: &String| !r.is_empty() && r.len() > 10)
        .take(15)
        .collect();
    
    let requirements = if requirements.is_empty() {
        vec![format!("Implement {} module", iu.name)]
    } else {
        requirements
    };
    
    let request = crate::llm::CodeGenRequest {
        requirements,
        language: iu.target_language.clone(),
        module_name: iu.name.clone(),
        iu_id: iu.iu_id.clone(),
        context: None,
        module_apis: None,
    };
    
    crate::llm::generate_code_with_llm(&request, config, llm_prompt).await
}

/// Generate integration app using LLM
async fn generate_app_integration_with_llm(
    iu: &IU, 
    config: &crate::llm::LlmConfig, 
    all_ius: Option<&[IU]>,
    module_apis: Option<Vec<crate::llm::ModuleApi>>,
    template_prompt: Option<&str>,
) -> anyhow::Result<String> {
    let module_names: Vec<String> = all_ius.map(|ius| {
        ius.iter()
            .filter(|i| i.name != "app")
            .map(|i| i.name.clone())
            .collect()
    }).unwrap_or_default();
    
    // Build available APIs context
    let api_context = if let Some(apis) = &module_apis {
        let mut ctx = "Available module APIs:\n".to_string();
        for api in apis {
            ctx.push_str(&format!("\nModule '{}':\n", api.name));
            if !api.classes.is_empty() {
                ctx.push_str(&format!("  Classes: {}\n", api.classes.join(", ")));
            }
            if !api.functions.is_empty() {
                ctx.push_str(&format!("  Functions: {}\n", api.functions.join(", ")));
            }
            ctx.push_str(&format!("  Import with: from {} import {}\n", 
                api.name, 
                api.exports.join(", ")));
        }
        ctx
    } else {
        format!("Modules to integrate: {}", module_names.join(", "))
    };
    
    let context = format!(
        "This is the MAIN APPLICATION ENTRY POINT.\n\n{}\n\n\nGenerate a main App class that:\n1. Imports from the modules above using EXACTLY the classes/functions listed\n2. Initializes their classes in __init__\n3. Has start() and stop() methods\n4. Has a main_loop() method\n5. Has if __name__ == '__main__': entry point\n6. Returns int from main() for exit codes\n\nIMPORTANT: Only use imports that are explicitly listed above. Do NOT invent new classes.",
        api_context
    );
    
    let request = crate::llm::CodeGenRequest {
        requirements: vec![
            "Create integrated application entry point".to_string(),
            format!("Wire together modules: {}", module_names.join(", ")),
        ],
        language: iu.target_language.clone(),
        module_name: "app".to_string(),
        iu_id: iu.iu_id.clone(),
        context: Some(context),
        module_apis,
    };
    
    crate::llm::generate_code_with_llm(&request, config, template_prompt).await
}

fn generate_rust(iu: &IU) -> String {
    format!(
        r#"// phoenix: iu_id = "{}"
// Generated from IU: {}
// Risk Tier: {:?}
// Contract: {}

pub mod {} {{
    //! Implementation Unit: {}
{}

    pub fn placeholder() {{
        todo!("Implement based on contract")
    }}
}}
"#,
        iu.iu_id,
        iu.name,
        iu.risk_tier,
        iu.contract,
        iu.name.to_lowercase().replace("-", "_"),
        iu.name,
        iu.source_canon_ids.iter()
            .map(|id| format!("    //! - Requirement: {}...", &id[..8.min(id.len())]))
            .collect::<Vec<_>>()
            .join("\n"),
    )
}

fn generate_typescript(iu: &IU) -> String {
    format!(
        r#"// phoenix: iu_id = "{}"
export module {} {{
  // {}
}}
"#,
        iu.iu_id,
        iu.name,
        iu.contract,
    )
}

fn generate_python(iu: &IU) -> String {
    format!(
        r#"# phoenix: iu_id = "{}"
"""{}"""

def placeholder():
    raise NotImplementedError()
"#,
        iu.iu_id,
        iu.contract,
    )
}

fn extract_iu_id_from_code(code: &str) -> Option<String> {
    code.lines()
        .find(|l| l.contains("phoenix:") && l.contains("iu_id"))
        .and_then(|l| {
            l.split("iu_id = ").nth(1)
                .map(|s| s.trim().trim_matches('"').to_string())
        })
}

fn extract_canon_ids_from_code(code: &str) -> Vec<String> {
    code.lines()
        .filter(|l| l.contains("Requirement:"))
        .filter_map(|l| {
            l.split("Requirement:").nth(1)
                .map(|s| s.trim().trim_matches('.').to_string())
        })
        .collect()
}
