//! Phoenix Pipeline — Native Rust Implementation
//!
//! Implements the spec-to-code pipeline using nickel-lang-core for NCL parsing.
//!
//! Pipeline stages:
//!   SPEC ──[μ_ingest]──► CLAUSE ──[μ_canon]──► CANON ──[μ_plan]──► IU ──[μ_codegen]──► CODE
//!
//! Each morphism is validated as a structure-preserving theory map.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use anyhow::Result;
use serde::{Serialize, Deserialize};

use crate::identity::{canon_id, iu_id, file_hash, clause_semhash, context_semhash, normalize_text};

/// Pipeline state tracking
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineState {
    pub version: String,
    pub project: String,
    pub stages: HashMap<String, StageStatus>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StageStatus {
    pub status: String, // "pending", "running", "complete", "failed"
    pub started_at: Option<String>,
    pub completed_at: Option<String>,
    pub error: Option<String>,
}

/// μ_ingest: Parse specifications into content-addressed clauses using formal morphisms
///
/// Input: Nickel (.ncl) files in project root directory
/// Output: Clauses with canon IDs (semantic hashes) filtered by target language
///
/// When panproto is enabled, also creates a formal TheoryMorphism from
/// NCL requirements theory to target language code theory.
pub async fn ingest_specs(project_root: impl AsRef<Path>, target_lang: &str) -> Result<IngestOutput> {
    let project_path = project_root.as_ref();
    
    println!("🎯 Target language: {}", target_lang);
    
    let mut clauses = Vec::new();
    let mut entries = tokio::fs::read_dir(&project_path).await?;
    let mut ncl_count = 0;
    
    // Track first parsed NCL for formal morphism creation
    let mut first_parsed: Option<crate::ncl::ParsedNcl> = None;
    
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        // Only process .ncl files at top level
        if !path.is_file() {
            continue;
        }
        let ext = path.extension().and_then(|e| e.to_str());
        
        if ext == Some("ncl") {
            ncl_count += 1;
            let content = tokio::fs::read_to_string(&path).await?;
            
            // Parse NCL for both clauses and formal morphism
            match crate::ncl::parse_ncl_spec(&content, &path.to_string_lossy()) {
                Ok(parsed) => {
                    // Store first parsed for formal morphism
                    if first_parsed.is_none() {
                        first_parsed = Some(parsed.clone());
                    }
                    
                    // Convert to clauses using the parsed NCL
                    match parse_ncl_spec_to_clauses(&content, &path, target_lang) {
                        Ok(ncl_clauses) => {
                            let gen_count = ncl_clauses.len();
                            println!("   🗂️  {}: {} generation directives", 
                                path.file_name().unwrap().to_string_lossy(), 
                                gen_count);
                            clauses.extend(ncl_clauses);
                        }
                        Err(e) => {
                            println!("   ⚠️  {}: parse error - {}", 
                                path.file_name().unwrap().to_string_lossy(), 
                                e);
                        }
                    }
                }
                Err(e) => {
                    println!("   ⚠️  {}: NCL parse error - {}", 
                        path.file_name().unwrap().to_string_lossy(), 
                        e);
                }
            }
        }
    }
    
    // Report formal morphism when panproto is enabled
    #[cfg(feature = "panproto")]
    if let Some(parsed) = first_parsed {
        let theory = parsed.to_panproto_theory();
        match crate::pipeline::morphisms::create_ncl_to_code_morphism(&theory, target_lang) {
            Ok(morphism) => {
                println!("   🧮 Formal TheoryMorphism: {} → {}", 
                    morphism.domain, morphism.codomain);
                println!("      Sort mappings: {}", morphism.sort_map.len());
                println!("      Operation mappings: {}", morphism.op_map.len());
                for (src, tgt) in &morphism.sort_map {
                    println!("        {} → {}", src, tgt);
                }
            }
            Err(e) => {
                println!("   ⚠️  Failed to create formal morphism: {}", e);
            }
        }
    }
    
    println!("   📁 Scanned {} .ncl files, found {} matching clauses", 
        ncl_count, clauses.len());
    
    Ok(IngestOutput::new(clauses, vec![]))
}

/// Parse NCL (Nickel) spec file into clauses using nickel-lang-core
/// 
/// Extracts generation directives from panproto-style .ncl files
/// Each morphism with a generation block becomes a clause
fn parse_ncl_spec_to_clauses(_content: &str, source_path: &Path, target_lang: &str) -> Result<Vec<Clause>> {
    let mut clauses = Vec::new();
    
    // Parse the NCL file
    let parsed = crate::ncl::parse_ncl_file(source_path)
        .map_err(|e| anyhow::anyhow!("NCL parse error: {}", e))?;
    
    // Extract morphisms if present
    for morphism in &parsed.morphisms {
        // Check if this morphism matches target language
        let should_include = match target_lang {
            "rust" => morphism.language == "rust" 
                || morphism.language == "both" 
                || morphism.language == "pyo3"
                || morphism.output_path.as_deref().unwrap_or("").ends_with(".rs"),
            "python" | "py" => morphism.language == "python" 
                || morphism.language == "both"
                || morphism.output_path.as_deref().unwrap_or("").ends_with(".py"),
            _ => true,
        };
        
        if should_include && morphism.generation_content.is_some() {
            // Create a clause from this morphism
            let raw_text = format!("Morphism {}: {} → {} generating {} {:?}", 
                morphism.name, 
                morphism.domain,
                morphism.codomain,
                morphism.language,
                morphism.output_path
            );
            let normalized = normalize_text(&raw_text);
            let id = canon_id(&normalized);
            let clause_hash = clause_semhash(&normalized);
            
            clauses.push(Clause {
                id: id.clone(),
                clause_type: ClauseType::Requirement,
                text: normalized.clone(),
                raw_text: raw_text.clone(),
                section: format!("morphism_{}", morphism.name),
                source_file: source_path.to_string_lossy().to_string(),
                line: 0,
                clause_semhash: clause_hash.clone(),
                context_semhash: context_semhash(
                    &normalized, 
                    &[format!("morphism_{}", morphism.name)], 
                    Some(&clause_hash), 
                    None
                ),
                language_marker: Some(morphism.language.clone()),
            });
        }
    }
    
    // Extract compositions if present (same structure as morphisms)
    for comp in &parsed.compositions {
        // Check if this composition matches target language
        let should_include = match target_lang {
            "rust" => comp.language == "rust" 
                || comp.language == "both" 
                || comp.language == "pyo3"
                || comp.output_path.as_deref().unwrap_or("").ends_with(".rs"),
            "python" | "py" => comp.language == "python" 
                || comp.language == "both"
                || comp.output_path.as_deref().unwrap_or("").ends_with(".py"),
            _ => true,
        };
        
        if should_include && comp.generation_content.is_some() {
            // Create a clause from this composition
            let raw_text = format!("Composition {}: {} → {} generating {} {:?}", 
                comp.name, 
                comp.domain,
                comp.codomain,
                comp.language,
                comp.output_path
            );
            let normalized = normalize_text(&raw_text);
            let id = canon_id(&normalized);
            let clause_hash = clause_semhash(&normalized);
            
            clauses.push(Clause {
                id: id.clone(),
                clause_type: ClauseType::Requirement,
                text: normalized.clone(),
                raw_text: raw_text.clone(),
                section: format!("composition_{}", comp.name),
                source_file: source_path.to_string_lossy().to_string(),
                line: 0,
                clause_semhash: clause_hash.clone(),
                context_semhash: context_semhash(
                    &normalized, 
                    &[format!("composition_{}", comp.name)], 
                    Some(&clause_hash), 
                    None
                ),
                language_marker: Some(comp.language.clone()),
            });
        }
    }
    
    // Extract requirements if present
    for req in &parsed.requirements {
        let should_include = match target_lang {
            "rust" => req.language == "rust" || req.language == "both",
            "python" | "py" => req.language == "python" || req.language == "both",
            _ => true,
        };
        
        if should_include {
            let raw_text = format!("{}: {} [{}]", req.id, req.description, req.priority);
            let normalized = normalize_text(&raw_text);
            let id = canon_id(&normalized);
            let clause_hash = clause_semhash(&normalized);
            
            clauses.push(Clause {
                id: id.clone(),
                clause_type: ClauseType::Requirement,
                text: normalized.clone(),
                raw_text: raw_text.clone(),
                section: format!("req_{}", req.id),
                source_file: source_path.to_string_lossy().to_string(),
                line: 0,
                clause_semhash: clause_hash.clone(),
                context_semhash: context_semhash(
                    &normalized, 
                    &[format!("req_{}", req.id)], 
                    Some(&clause_hash), 
                    None
                ),
                language_marker: Some(req.language.clone()),
            });
        }
    }
    
    Ok(clauses)
}

/// Infer language from file path
fn infer_lang_from_path(path: &str) -> String {
    if path.ends_with(".rs") {
        "rust".to_string()
    } else if path.ends_with(".py") {
        "python".to_string()
    } else if path.contains("pyo3") || path.contains("ffi") {
        "pyo3".to_string()
    } else {
        "both".to_string()
    }
}

/// Old line-based parser (deprecated - use parse_ncl_spec_to_clauses)
#[allow(dead_code)]
fn parse_ncl_spec_deprecated(_content: &str, _source_path: &Path, _target_lang: &str) -> Result<Vec<Clause>> {
    anyhow::bail!("Use parse_ncl_spec_to_clauses with nickel-lang-core instead")
}

/// Infer language from file path (legacy, kept for compatibility)
fn _infer_lang_from_path(path: &str) -> String {
    if path.ends_with(".rs") {
        "rust".to_string()
    } else if path.ends_with(".py") {
        "python".to_string()
    } else if path.ends_with(".ts") || path.ends_with(".tsx") {
        "typescript".to_string()
    } else if path.ends_with(".js") || path.ends_with(".jsx") {
        "javascript".to_string()
    } else {
        "unknown".to_string()
    }
}

/// Generate flake.nix content from theory build configuration
/// 
/// This generates a Nix flake from the 'build' section of the theory,
/// mapping languages and packages to proper Nixpkgs attributes.
pub fn generate_flake_nix(
    languages: &[String],
    packages: &std::collections::HashMap<String, Vec<String>>,
    env_vars: &std::collections::HashMap<String, String>,
    hooks: &[String],
    project_name: &str,
) -> String {
    let mut flake = String::new();
    
    // Header
    flake.push_str("{\n");
    flake.push_str("  description = \"");
    flake.push_str(project_name);
    flake.push_str("\";\n\n");
    
    // Inputs
    flake.push_str("  inputs = {\n");
    flake.push_str("    nixpkgs.url = \"github:NixOS/nixpkgs/nixos-unstable\";\n");
    flake.push_str("    flake-utils.url = \"github:numtide/flake-utils\";\n");
    
    // Add rust-overlay if Rust is needed
    if languages.contains(&"rust".to_string()) {
        flake.push_str("    rust-overlay.url = \"github:oxalica/rust-overlay\";\n");
    }
    
    flake.push_str("  };\n\n");
    
    // Outputs
    flake.push_str("  outputs = { self, nixpkgs, flake-utils");
    if languages.contains(&"rust".to_string()) {
        flake.push_str(", rust-overlay");
    }
    flake.push_str(" }:\n");
    
    flake.push_str("    flake-utils.lib.eachDefaultSystem (system:\n");
    flake.push_str("      let\n");
    
    // pkgs with overlays
    if languages.contains(&"rust".to_string()) {
        flake.push_str("        overlays = [ (import rust-overlay) ];\n");
        flake.push_str("        pkgs = import nixpkgs { inherit system overlays; };\n");
    } else {
        flake.push_str("        pkgs = nixpkgs.legacyPackages.${system};\n");
    }
    
    // Build inputs
    flake.push_str("        buildInputs = with pkgs; [\n");
    
    // Add packages from each language category
    if let Some(rust_pkgs) = packages.get("rust") {
        for pkg in rust_pkgs {
            flake.push_str("          ");
            flake.push_str(&map_to_nixpkg(pkg));
            flake.push('\n');
        }
    }
    
    if let Some(py_pkgs) = packages.get("python") {
        for pkg in py_pkgs {
            flake.push_str("          ");
            flake.push_str(&map_to_nixpkg(pkg));
            flake.push('\n');
        }
    }
    
    if let Some(tool_pkgs) = packages.get("tools") {
        for pkg in tool_pkgs {
            flake.push_str("          ");
            flake.push_str(&map_to_nixpkg(pkg));
            flake.push('\n');
        }
    }
    
    flake.push_str("        ];\n");
    
    // Dev shell
    flake.push_str("      in\n");
    flake.push_str("      {\n");
    flake.push_str("        # Default package (placeholder - use 'nix develop' for dev shell)\n");
    flake.push_str("        packages.default = pkgs.writeShellScriptBin \"phoenix-app\" ''\n");
    flake.push_str("          echo \"Phoenix-generated application\"\n");
    flake.push_str("          echo \"Use 'nix develop' to enter the development shell\"\n");
    flake.push_str("        '';\n");
    flake.push_str("\n");
    flake.push_str("        devShells.default = pkgs.mkShell {\n");
    flake.push_str("          inherit buildInputs;\n");
    
    // Environment variables
    if !env_vars.is_empty() {
        flake.push_str("\n          shellHook = ''\n");
        for (key, value) in env_vars {
            flake.push_str("            export ");
            flake.push_str(key);
            flake.push_str("=\"");
            flake.push_str(value);
            flake.push_str("\"\n");
        }
        
        // Add hooks
        for hook in hooks {
            flake.push_str("            ");
            flake.push_str(hook);
            flake.push('\n');
        }
        
        flake.push_str("          '';\n");
    }
    
    flake.push_str("        };\n");
    flake.push_str("      });\n");
    flake.push_str("}\n");
    
    flake
}

/// Map package names from theory to proper nixpkgs attribute paths
fn map_to_nixpkg(pkg: &str) -> String {
    // Handle python packages
    if pkg.starts_with("python") && pkg.contains("Packages.") {
        let parts: Vec<&str> = pkg.split("Packages.").collect();
        if parts.len() == 2 {
            return format!("python312Packages.{}", parts[1]);
        }
    }
    
    // Handle rust toolchain
    if pkg == "rustc" || pkg == "cargo" {
        return "rust-bin.stable.latest.default".to_string();
    }
    
    // Default: pass through
    pkg.to_string()
}


/// Output of μ_ingest phase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestOutput {
    pub clauses: Vec<Clause>,
    pub source_files: Vec<String>,
}

impl IngestOutput {
    /// Create new ingest output
    pub fn new(clauses: Vec<Clause>, source_files: Vec<String>) -> Self {
        Self { clauses, source_files }
    }
}

/// A parsed clause from specification
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Clause {
    pub id: String,
    pub clause_type: ClauseType,
    pub text: String,
    pub raw_text: String,
    pub section: String,
    pub source_file: String,
    pub line: usize,
    pub clause_semhash: String,
    pub context_semhash: String,
    pub language_marker: Option<String>, // e.g., "rust", "python", "pyo3"
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum ClauseType {
    #[serde(rename = "requirement")]
    Requirement,
    #[serde(rename = "constraint")]
    Constraint,
    #[serde(rename = "definition")]
    Definition,
    #[serde(rename = "assumption")]
    Assumption,
    #[serde(rename = "scenario")]
    Scenario,
}

/// μ_canon: Collapse duplicate clauses into canonical requirements
///
/// Input: Clauses from ingest
/// Output: Canonical requirement nodes with provenance tracking
pub async fn canonicalize_clauses(clauses: Vec<Clause>) -> Result<CanonicalOutput> {
    let mut canon_map: HashMap<String, CanonNode> = HashMap::new();
    let mut d_rate_tracker = crate::identity::DRateTracker::new(100);
    
    // Count duplicates before consuming clauses
    let d_count = clauses.iter()
        .filter(|c| c.clause_type == ClauseType::Requirement)
        .count() as u32;
    
    for clause in clauses {
        // Check if this text already exists (D-class change detection)
        let existing_id = canon_map.values()
            .find(|c| c.clean_statement == clause.text)
            .map(|c| c.id.clone());
        
        if let Some(existing_id) = existing_id {
            // Duplicate detected - record D-class change
            d_rate_tracker.record(crate::identity::ChangeClass::D);
            
            // Add to provenance
            if let Some(entry) = canon_map.get_mut(&existing_id) {
                entry.derived_from.push(clause.id.clone());
                entry.derived_from.sort();
                entry.derived_from.dedup();
            }
        } else {
            // New canonical node
            let d_rate = d_rate_tracker.get_d_rate();
            
            canon_map.insert(clause.id.clone(), CanonNode {
                id: clause.id.clone(),
                node_type: map_clause_type(clause.clause_type),
                clean_statement: clause.text,
                derived_from: vec![clause.id],
                depends_on: vec![], // Will be filled by dependency analysis
                d_rate,
                confidence: 1.0 - d_rate as f64,
            });
            
            d_rate_tracker.record(crate::identity::ChangeClass::A);
        }
    }
    
    let nodes: Vec<CanonNode> = canon_map.into_values().collect();
    
    Ok(CanonicalOutput {
        nodes,
        total_duplicates: d_count,
    })
}

fn map_clause_type(ct: ClauseType) -> CanonNodeType {
    match ct {
        ClauseType::Requirement => CanonNodeType::Requirement,
        ClauseType::Constraint => CanonNodeType::Constraint,
        ClauseType::Definition => CanonNodeType::Definition,
        ClauseType::Assumption => CanonNodeType::Assumption,
        ClauseType::Scenario => CanonNodeType::Scenario,
    }
}

/// Output of canonicalize phase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonicalOutput {
    pub nodes: Vec<CanonNode>,
    pub total_duplicates: u32,
}

/// Canonical requirement node (pipeline-specific version)
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct CanonNode {
    pub id: String,
    pub node_type: CanonNodeType,
    pub clean_statement: String,
    pub derived_from: Vec<String>,
    pub depends_on: Vec<String>,
    pub d_rate: f64,
    pub confidence: f64,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CanonNodeType {
    Requirement,
    Constraint,
    Definition,
    Assumption,
    Scenario,
    PipelineUpgrade,
}

/// μ_plan: Partition canonical nodes into Implementation Units
///
/// Creates language-specific IUs based on the architecture:
/// - Python: Only TUI code (interface, app) - imports from freeq_pyo3
/// - Rust/PyO3: Only PyO3 wrappers - wraps freeq-sdk
pub async fn plan_ius(canon_output: &CanonicalOutput, target_language: &str) -> Result<PlanOutput> {
    use petgraph::graph::{DiGraph, NodeIndex};
    use petgraph::algo::toposort;
    
    // Build dependency graph from canon nodes
    let mut graph = DiGraph::<CanonNode, ()>::new();
    let mut id_to_idx: HashMap<String, NodeIndex> = HashMap::new();
    
    for node in &canon_output.nodes {
        let idx = graph.add_node(node.clone());
        id_to_idx.insert(node.id.clone(), idx);
    }
    
    // Collect edges first to avoid borrow checker issues
    let mut edges_to_add: Vec<(NodeIndex, NodeIndex)> = Vec::new();
    for (id, idx) in &id_to_idx {
        if let Some(node) = graph.node_weight(*idx) {
            for other_id in canon_output.nodes.iter().map(|n| &n.id) {
                if id != other_id && node.clean_statement.contains(&other_id[..8.min(other_id.len())]) {
                    if let Some(&other_idx) = id_to_idx.get(other_id) {
                        edges_to_add.push((*idx, other_idx));
                    }
                }
            }
        }
    }
    
    // Add all collected edges
    for (from, to) in edges_to_add {
        graph.add_edge(from, to, ());
    }
    
    // Topological sort gives us a valid processing order
    let topo_order = toposort(&graph, None)
        .map_err(|e| anyhow::anyhow!("Cycle detected in canon graph: {:?}", e))?;
    
    // Group nodes by domain AND language marker
    let mut groups: HashMap<String, Vec<CanonNode>> = HashMap::new();
    
    for idx in topo_order {
        if let Some(node) = graph.node_weight(idx) {
            // Determine domain from content
            let domain = extract_domain(&node.clean_statement);
            
            // For Python: only include nodes marked with [python]
            // For Rust: only include nodes marked with [rust] or [pyo3]
            let should_include = match target_language {
                "python" => {
                    // Only python clauses or interface-related
                    node.clean_statement.contains("[python]") || 
                    node.clean_statement.contains("interface") ||
                    node.clean_statement.contains("widget") ||
                    node.clean_statement.contains("TUI") ||
                    domain == "interface"
                }
                "rust" => {
                    // rust clauses, pyo3 clauses, or NOT pure python
                    node.clean_statement.contains("[rust]") ||
                    node.clean_statement.contains("[pyo3]") ||
                    (!node.clean_statement.contains("[python]") && 
                     !node.clean_statement.contains("widget") &&
                     !node.clean_statement.contains("TUI"))
                }
                _ => true, // include all for other languages
            };
            
            if should_include {
                let key = format!("{}_{}", domain, target_language);
                groups.entry(key).or_default().push(node.clone());
            }
        }
    }
    
    // For Python TUI project: create specific structure
    let mut ius = Vec::new();
    
    // Normalize target language for comparison
    let lang = target_language.to_lowercase().trim().to_string();
    
    if lang == "python" || lang == "py" {
        // Python: Single app IU
        let contract = format!("Python {} application", target_language);
        let iu_id = iu_id("app", &contract, &[]);
        
        ius.push(ImplementationUnit {
            iu_id,
            name: "app".to_string(),
            contract,
            source_canon_ids: canon_output.nodes.iter()
                .map(|n| n.id.clone())
                .collect(),
            risk_tier: determine_risk_tier(&canon_output.nodes),
            target_language: target_language.to_string(),
            output_files: vec!["src/app.py".to_string()],
        });
        
        println!("   🎯 Python: 1 IU (src/app.py)");
    } else if lang == "rust" || lang == "rs" {
        // Rust: Single library IU
        let contract = format!("Rust {} library", target_language);
        let iu_id = iu_id("lib", &contract, &[]);
        
        ius.push(ImplementationUnit {
            iu_id,
            name: "lib".to_string(),
            contract,
            source_canon_ids: canon_output.nodes.iter()
                .map(|n| n.id.clone())
                .collect(),
            risk_tier: determine_risk_tier(&canon_output.nodes),
            target_language: target_language.to_string(),
            output_files: vec!["src/lib.rs".to_string()],
        });
        
        println!("   🎯 Rust: 1 IU (src/lib.rs)");
    } else {
        // Fallback: create domain-based IUs for other languages
        for (domain_key, group_nodes) in groups {
            if group_nodes.is_empty() {
                continue;
            }
            
            let domain = domain_key.trim_end_matches(format!("_{}", target_language).as_str());
            let canon_ids: Vec<String> = group_nodes.iter().map(|n| n.id.clone()).collect();
            let name = format!("{}", domain);
            let contract = generate_contract(&group_nodes);
            
            let iu_id = iu_id(&name, &contract, &canon_ids);
            
            let ext = match target_language {
                "rust" => "rs",
                "typescript" => "ts",
                "python" => "py",
                _ => "rs",
            };
            
            ius.push(ImplementationUnit {
                iu_id: iu_id.clone(),
                name: name.clone(),
                contract,
                source_canon_ids: canon_ids.clone(),
                risk_tier: determine_risk_tier(&group_nodes),
                target_language: target_language.to_string(),
                output_files: vec![format!("src/generated/{}.{}", 
                    name.to_lowercase().replace("-", "_"),
                    ext
                )],
            });
        }
        
        // Create integration IU that wires all modules together
        let integration_iu = create_integration_iu(&ius, target_language);
        ius.push(integration_iu);
    }
    
    Ok(PlanOutput { ius })
}

/// Create an Integration IU that wires all modules together into a working app
fn create_integration_iu(domain_ius: &[ImplementationUnit], target_language: &str) -> ImplementationUnit {
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
        .take(5) // Just reference a few for the hash
        .collect();
    
    let iu_id = crate::identity::iu_id(&name, &contract, &canon_ids);
    
    ImplementationUnit {
        iu_id,
        name,
        contract,
        source_canon_ids: canon_ids,
        risk_tier: crate::evidence::RiskTier::High, // Integration is high risk
        target_language: target_language.to_string(),
        output_files: vec![format!("src/generated/app.{}", ext)],
        //entry_point: true,
    }
}

fn extract_domain(statement: &str) -> String {
    // Simple keyword-based domain extraction
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

fn generate_contract(nodes: &[CanonNode]) -> String {
    // Generate a contract from the requirements
    let statements: Vec<&str> = nodes.iter().map(|n| n.clean_statement.as_str()).collect();
    format!(
        "Implements: {}. Requirements: {}",
        nodes.len(),
        statements.join("; ")
    )
}

fn determine_risk_tier(nodes: &[CanonNode]) -> crate::evidence::RiskTier {
    // Risk tier based on keywords
    let security_keywords = ["security", "auth", "encrypt", "password", "token", "permission"];
    let critical_keywords = ["payment", "billing", "money", "financial", "medical", "health"];
    
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

/// Output of plan phase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PlanOutput {
    pub ius: Vec<ImplementationUnit>,
}

/// Implementation Unit
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct ImplementationUnit {
    pub iu_id: String,
    pub name: String,
    pub contract: String,
    pub source_canon_ids: Vec<String>,
    pub risk_tier: crate::evidence::RiskTier,
    pub target_language: String,
    pub output_files: Vec<String>,
}

/// μ_codegen: Generate code from Implementation Units
///
/// Input: IUs with contracts
/// Output: Generated code files
pub async fn generate_code(
    ius: &[ImplementationUnit],
    output_dir: impl AsRef<Path>,
    project_root: impl AsRef<Path>,
    target_language: &str,
) -> Result<CodegenOutput> {
    let output_dir = output_dir.as_ref();
    let project_root = project_root.as_ref();
    tokio::fs::create_dir_all(output_dir).await?;
    
    let mut files = Vec::new();
    
    for iu in ius {
        let file_path = match iu.target_language.as_str() {
            "rust" => output_dir.join(format!("{}.rs", iu.name)),
            "typescript" | "ts" => output_dir.join(format!("{}.ts", iu.name)),
            "python" | "py" => output_dir.join(format!("{}.py", iu.name)),
            _ => output_dir.join(format!("{}.rs", iu.name)),
        };
        
        let code = generate_skeleton_code(iu, Some(ius));
        tokio::fs::write(&file_path, &code).await?;
        
        files.push(GeneratedFile {
            path: file_path.to_string_lossy().to_string(),
            iu_id: iu.iu_id.clone(),
            hash: file_hash(&code),
            size: code.len(),
        });
    }
    
    // Generate pyproject.toml for Python projects
    if target_language == "python" || target_language == "py" {
        let pyproject_path = project_root.join("pyproject.toml");
        if !pyproject_path.exists() {
            let pyproject_content = generate_pyproject_toml(project_root).await?;
            tokio::fs::write(&pyproject_path, &pyproject_content).await?;
            files.push(GeneratedFile {
                path: "pyproject.toml".to_string(),
                iu_id: "pyproject".to_string(),
                hash: file_hash(&pyproject_content),
                size: pyproject_content.len(),
            });
            println!("   Generated: pyproject.toml");
        }
    }
    
    Ok(CodegenOutput { files })
}

/// Generate pyproject.toml for Python projects from NCL spec + template
async fn generate_pyproject_toml(project_root: impl AsRef<Path>) -> Result<String> {
    let project_root = project_root.as_ref();
    let spec_path = project_root.join("spec.ncl");
    
    // Parse the NCL spec to get configuration
    let (pname, pyproject_config) = if let Ok(content) = tokio::fs::read_to_string(&spec_path).await {
        let mut parsed = crate::ncl::parse_ncl_spec(&content, "spec.ncl")
            .map_err(|e| anyhow::anyhow!("Failed to parse spec.ncl: {}", e))?;
        
        // Load and merge template based on build_type
        let template_dir = std::env::var("PHOENIX_TEMPLATE_DIR")
            .map(PathBuf::from)
            .unwrap_or_else(|_| {
                std::env::current_exe()
                    .ok()
                    .and_then(|exe| exe.parent().map(|p| p.join("templates")))
                    .unwrap_or_else(|| PathBuf::from("templates"))
            });
        parsed.merge_template(&template_dir);
        
        // Get project name
        let name = parsed.name
            .or_else(|| parsed.flake.as_ref().and_then(|f| f.pname.clone()))
            .unwrap_or_else(|| "my-app".to_string());
        
        // Get pyproject config (will use template default if not in spec)
        let pyproject = parsed.pyproject
            .unwrap_or_else(|| crate::ncl::PyProjectConfig::python_default());
        
        (name, pyproject)
    } else {
        // Fallback if no spec.ncl
        ("my-app".to_string(), crate::ncl::PyProjectConfig::python_default())
    };
    
    let pname_underscore = pname.replace("-", "_");
    
    // Build dependencies section
    let deps_str = if pyproject_config.dependencies.is_empty() {
        String::new()
    } else {
        format!("\ndependencies = [\n{}\n]", 
            pyproject_config.dependencies.iter()
                .map(|d| format!("  \"{}\",", d))
                .collect::<Vec<_>>()
                .join("\n"))
    };
    
    // Build build-system section
    let build_system_str = if pyproject_config.build_system.is_empty() {
        r#"requires = ["hatchling"]
build-backend = "hatchling.build""#.to_string()
    } else {
        format!("requires = [{}]\nbuild-backend = \"hatchling.build\"",
            pyproject_config.build_system.iter()
                .map(|s| format!("\"{}\"", s))
                .collect::<Vec<_>>()
                .join(", "))
    };
    
    // Get entry point (default to src.app:main)
    let entry_point = pyproject_config.entry_point
        .unwrap_or_else(|| "src.app:main".to_string());
    
    // Get packages (default to ["src"])
    let packages_str = if pyproject_config.packages.is_empty() {
        r#"packages = ["src"]"#.to_string()
    } else {
        format!("packages = [{}]",
            pyproject_config.packages.iter()
                .map(|p| format!("\"{}\"", p))
                .collect::<Vec<_>>()
                .join(", "))
    };
    
    Ok(format!(r#"[build-system]
{}

[project]
name = "{}"
version = "0.1.0"
description = "Generated by Phoenix VCS"
requires-python = "{}"{}

[project.scripts]
{} = "{}"

[tool.hatch.build.targets.wheel]
{}
"#, 
        build_system_str,
        pname, 
        pyproject_config.requires_python,
        deps_str,
        pname_underscore,
        entry_point,
        packages_str))
}

/// Extract pname from NCL content
fn extract_pname_from_ncl(content: &str) -> Option<String> {
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("pname") && trimmed.contains("=") {
            // Extract value between quotes
            if let Some(start) = trimmed.find('"') {
                if let Some(end) = trimmed[start+1..].find('"') {
                    return Some(trimmed[start+1..start+1+end].to_string());
                }
            }
            if let Some(start) = trimmed.find('\'') {
                if let Some(end) = trimmed[start+1..].find('\'') {
                    return Some(trimmed[start+1..start+1+end].to_string());
                }
            }
        }
    }
    None
}

fn generate_skeleton_code(iu: &ImplementationUnit, all_ius: Option<&[ImplementationUnit]>) -> String {
    // Check if this is the integration app IU
    if iu.name == "app" {
        return generate_integration_code(iu, all_ius);
    }
    
    match iu.target_language.as_str() {
        "rust" => generate_rust_skeleton(iu),
        "typescript" | "ts" => generate_typescript_skeleton(iu),
        "python" | "py" => generate_python_skeleton(iu),
        _ => generate_rust_skeleton(iu),
    }
}

/// Generate integration code that wires all modules together
fn generate_integration_code(iu: &ImplementationUnit, all_ius: Option<&[ImplementationUnit]>) -> String {
    let lang = iu.target_language.as_str();
    
    // Get all domain module names (excluding the app itself)
    let module_names: Vec<String> = all_ius.map(|ius| {
        ius.iter()
            .filter(|i| i.name != "app")
            .map(|i| i.name.to_lowercase().replace("-", "_"))
            .collect()
    }).unwrap_or_default();
    
    match lang {
        "python" | "py" => generate_python_app(iu, &module_names),
        "rust" => generate_rust_app(iu, &module_names),
        "typescript" | "ts" => generate_typescript_app(iu, &module_names),
        _ => generate_python_app(iu, &module_names),
    }
}

fn generate_python_app(iu: &ImplementationUnit, module_names: &[String]) -> String {
    let imports = module_names.iter()
        .map(|name| format!("from .{} import *", name))
        .collect::<Vec<_>>()
        .join("\n");
    
    let init_calls = module_names.iter()
        .map(|name| {
            let class_name = name.split('_').map(|s| {
                let mut chars = s.chars();
                match chars.next() {
                    None => String::new(),
                    Some(first) => first.to_uppercase().collect::<String>() + chars.as_str(),
                }
            }).collect::<String>();
            format!(
                "        # Initialize {}\n        self.{}_manager = {}Manager()",
                name, name, class_name
            )
        })
        .collect::<Vec<_>>()
        .join("\n");
    
    format!(
        r#"# phoenix: iu_id = "{}"
"""
Integrated Application Entry Point
Wires together all domain modules into a unified IRC client.
"""

{}


class App:
    """Main application class integrating all modules."""
    
    def __init__(self):
        """Initialize all domain managers."""
{}
        self.running = False
    
    def start(self) -> None:
        """Start the application."""
        self.running = True
        print("🚀 IRC Client started")
        self._main_loop()
    
    def stop(self) -> None:
        """Stop the application."""
        self.running = False
        print("👋 IRC Client stopped")
    
    def _main_loop(self) -> None:
        """Main application loop."""
        while self.running:
            # TODO: Implement actual IRC connection handling
            pass
    
    def health_check(self) -> dict:
        """Check health of all modules."""
        return {{
            "status": "healthy",
            "modules": {{}}
        }}


def main() -> int:
    """Application entry point."""
    app = App()
    try:
        app.start()
        return 0
    except KeyboardInterrupt:
        app.stop()
        return 0
    except Exception as e:
        print(f"❌ Error: {{e}}")
        return 1


if __name__ == "__main__":
    exit(main())
"#,
        iu.iu_id,
        imports,
        init_calls
    )
}

fn generate_rust_app(_iu: &ImplementationUnit, _module_names: &[String]) -> String {
    // TODO: Generate Rust integrated app
    generate_rust_skeleton(_iu)
}

fn generate_typescript_app(_iu: &ImplementationUnit, _module_names: &[String]) -> String {
    // TODO: Generate TypeScript integrated app
    generate_typescript_skeleton(_iu)
}

fn generate_rust_skeleton(iu: &ImplementationUnit) -> String {
    format!(
        r#"// phoenix: iu_id = "{}"
// Generated from IU: {}
// Risk Tier: {:?}
// Contract: {}

// TODO: Implement {}
pub mod {} {{
    //! Implementation Unit: {}
    //! 
    //! Requirements:
{}

    /// Placeholder function
    pub fn placeholder() {{
        todo!("Implement based on contract")
    }}
}}
"#,
        iu.iu_id,
        iu.name,
        iu.risk_tier,
        iu.contract,
        iu.name,
        iu.name.to_lowercase().replace("-", "_"),
        iu.name,
        iu.source_canon_ids.iter()
            .map(|id| format!("    //! - {}", &id[..8.min(id.len())]))
            .collect::<Vec<_>>()
            .join("\n"),
    )
}

fn generate_typescript_skeleton(iu: &ImplementationUnit) -> String {
    format!(
        r#"// phoenix: iu_id = "{}"
// Generated from IU: {}
// Risk Tier: {:?}
// Contract: {}

// TODO: Implement {}
export module {} {{
  /**
   * Implementation Unit: {}
   * 
   * Requirements:
{}
   */

  export function placeholder(): void {{
    throw new Error("Not implemented");
  }}
}}
"#,
        iu.iu_id,
        iu.name,
        iu.risk_tier,
        iu.contract,
        iu.name,
        iu.name.to_lowercase().replace("-", "_"),
        iu.name,
        iu.source_canon_ids.iter()
            .map(|id| format!("   * - {}", &id[..8.min(id.len())]))
            .collect::<Vec<_>>()
            .join("\n"),
    )
}

fn generate_python_skeleton(iu: &ImplementationUnit) -> String {
    format!(
        r#"# phoenix: iu_id = "{}"
# Generated from IU: {}
# Risk Tier: {:?}
# Contract: {}

# TODO: Implement {}
"""Implementation Unit: {}

Requirements:
{}
"""


def placeholder():
    raise NotImplementedError("Implement based on contract")
"#,
        iu.iu_id,
        iu.name,
        iu.risk_tier,
        iu.contract,
        iu.name,
        iu.name,
        iu.source_canon_ids.iter()
            .map(|id| format!("- {}", &id[..8.min(id.len())]))
            .collect::<Vec<_>>()
            .join("\n"),
    )
}

/// Output of codegen phase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CodegenOutput {
    pub files: Vec<GeneratedFile>,
}

/// Generated code file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedFile {
    pub path: String,
    pub iu_id: String,
    pub hash: String,
    pub size: usize,
}

/// Run the complete pipeline
pub async fn run_pipeline(
    project_root: impl AsRef<Path>,
    target_language: &str,
) -> Result<PipelineResult> {
    let project_root = project_root.as_ref();
    
    // Phase 1: Ingest
    println!("▶ Phase: INGEST");
    println!("   μ_ingest: ThSpec → ThClause (lensing morphism)");
    let ingest_output = ingest_specs(project_root, target_language).await?;
    let clauses_count = ingest_output.clauses.len();
    println!("   ✓ Parsed {} clauses", clauses_count);
    
    // Phase 2: Canonicalize
    println!("\n▶ Phase: CANONICALIZE");
    println!("   μ_canon: ThClause → ThCanon (quotient morphism)");
    let canon_output = canonicalize_clauses(ingest_output.clauses).await?;
    let nodes_count = canon_output.nodes.len();
    println!("   ✓ {} canonical nodes ({} duplicates collapsed)", 
        nodes_count,
        canon_output.total_duplicates
    );
    
    // Phase 3: Plan
    println!("\n▶ Phase: PLAN");
    println!("   μ_plan: ThCanon → ThIU (partition morphism)");
    let canon_output_struct = CanonicalOutput {
        nodes: canon_output.nodes,
        total_duplicates: 0,
    };
    let plan_output = plan_ius(&canon_output_struct, target_language).await?;
    let ius_count = plan_output.ius.len();
    println!("   ✓ {} Implementation Units", ius_count);
    
    // Phase 4: Codegen
    println!("\n▶ Phase: CODEGEN");
    println!("   μ_codegen: ThIU → ThCode (generative morphism)");
    let output_dir = project_root.join("src").join("generated");
    let codegen_output = generate_code(&plan_output.ius, &output_dir, project_root, target_language).await?;
    let files_count = codegen_output.files.len();
    println!("   ✓ Generated {} files", files_count);
    for file in &codegen_output.files {
        println!("     - {}", file.path);
    }
    
    // Update manifest
    let manifest = crate::drift::GeneratedManifest {
        version: "1.0.0".to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        files: codegen_output.files.iter().map(|f| {
            (f.path.clone(), crate::drift::FileEntry {
                iu_id: f.iu_id.clone(),
                hash: f.hash.clone(),
                size: f.size as u64,
                generated_at: chrono::Utc::now().to_rfc3339(),
            })
        }).collect(),
    };
    manifest.save(project_root)?;
    
    // Update IU graph
    let iu_graph: Vec<crate::cascade::IUDef> = plan_output.ius.iter().map(|iu| {
        crate::cascade::IUDef {
            iu_id: iu.iu_id.clone(),
            dependencies: None, // Would be filled by dependency analysis
            risk_tier: match iu.risk_tier {
                crate::evidence::RiskTier::Low => crate::cascade::RiskTier::Low,
                crate::evidence::RiskTier::Medium => crate::cascade::RiskTier::Medium,
                crate::evidence::RiskTier::High => crate::cascade::RiskTier::High,
                crate::evidence::RiskTier::Critical => crate::cascade::RiskTier::Critical,
            },
            output_files: vec![format!("src/generated/{}.rs", iu.name)],
            source_canon_ids: Some(iu.source_canon_ids.clone()),
        }
    }).collect();
    
    let ius_path = project_root.join(".phoenix").join("graphs").join("ius.json");
    let ius_data = serde_json::json!({
        "version": "1.0.0",
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "ius": iu_graph,
    });
    tokio::fs::write(&ius_path, serde_json::to_string_pretty(&ius_data)?).await?;
    
    Ok(PipelineResult {
        clauses_parsed: clauses_count,
        canonical_nodes: nodes_count,
        implementation_units: ius_count,
        files_generated: files_count,
        output_directory: output_dir.to_string_lossy().to_string(),
    })
}

/// Pipeline execution result
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineResult {
    pub clauses_parsed: usize,
    pub canonical_nodes: usize,
    pub implementation_units: usize,
    pub files_generated: usize,
    pub output_directory: String,
}

// Formal panproto morphisms module
pub mod morphisms;

// Formal GAT theory definitions
pub mod formal;

// Apply formal morphisms to pipeline data
pub mod apply;

// Equations (algebraic laws) for pipeline theories
pub mod equations;

// Re-export key morphism types when panproto is enabled
#[cfg(feature = "panproto")]
pub use morphisms::{CodeMorphism, create_ncl_to_code_morphism, generate_with_morphism};

// Re-export formal theory types when panproto is enabled
#[cfg(feature = "panproto")]
pub use formal::{
    clause_theory, canon_theory, iu_theory, code_theory,
    canonize_morphism, plan_morphism, codegen_morphism,
    canon_theory_instance, iu_theory_instance,
    print_theory_summary, print_morphism_summary,
};

// Re-export apply functions when panproto is enabled
#[cfg(feature = "panproto")]
pub use apply::{
    clause_to_term, canon_node_to_term, iu_to_term,
    apply_canonize, apply_plan, apply_codegen,
    pipeline_transform, format_term, demonstrate_pipeline_morphisms,
    code_file_term, trace_term_provenance,
};

// Re-export equation functions when panproto is enabled
#[cfg(feature = "panproto")]
pub use equations::{
    clause_equations, canon_equations, iu_equations, code_equations,
    clause_theory_with_equations, canon_theory_with_equations,
    iu_theory_with_equations, code_theory_with_equations,
    print_equations, verify_morphism_preserves_equations,
    verify_all_equations, verify_pipeline_equations,
    print_morphism_preservation_results,
    VerificationResult, VerificationReport, MorphismPreservationResult,
};
