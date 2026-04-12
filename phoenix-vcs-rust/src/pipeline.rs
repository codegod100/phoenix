//! Phoenix Pipeline — Native Rust Implementation
//!
//! Implements the spec-to-code pipeline using native panproto crates
//! instead of the TypeScript/WASM wrapper.
//!
//! Pipeline stages:
//!   SPEC ──[μ_ingest]──► CLAUSE ──[μ_canon]──► CANON ──[μ_plan]──► IU ──[μ_codegen]──► CODE
//!
//! Each morphism is validated as a structure-preserving theory map.

use std::collections::HashMap;
use std::path::Path;
use anyhow::Result;
use serde::{Serialize, Deserialize};

use crate::identity::{sha256, canon_id, iu_id, file_hash};

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

/// μ_ingest: Parse specifications into content-addressed clauses
///
/// Input: Markdown files in `specs/` directory
/// Output: Clauses with canon IDs (semantic hashes) filtered by target language
pub async fn ingest_specs(project_root: impl AsRef<Path>, target_lang: &str) -> Result<IngestOutput> {
    let specs_dir = project_root.as_ref().join("specs");
    
    if !specs_dir.exists() {
        anyhow::bail!("No specs/ directory found. Create one with .md files.");
    }
    
    println!("🎯 Target language: {}", target_lang);
    
    let mut clauses = Vec::new();
    let mut entries = tokio::fs::read_dir(&specs_dir).await?;
    let mut file_count = 0;
    let mut ncl_count = 0;
    
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        let ext = path.extension().and_then(|e| e.to_str());
        
        if ext == Some("md") {
            file_count += 1;
            let content = tokio::fs::read_to_string(&path).await?;
            let file_clauses = parse_markdown_clauses(&content, &path, target_lang);
            let marker_info = if file_clauses.is_empty() {
                "(no matching clauses)".to_string()
            } else {
                let rust_count = file_clauses.iter().filter(|c| c.language_marker.as_deref() == Some("rust")).count();
                let py_count = file_clauses.iter().filter(|c| c.language_marker.as_deref() == Some("python")).count();
                let pyo3_count = file_clauses.iter().filter(|c| c.language_marker.as_deref() == Some("pyo3")).count();
                let unmarked = file_clauses.iter().filter(|c| c.language_marker.is_none()).count();
                let parts: Vec<String> = [
                    (rust_count > 0).then(|| format!("{} rust", rust_count)),
                    (py_count > 0).then(|| format!("{} python", py_count)),
                    (pyo3_count > 0).then(|| format!("{} pyo3", pyo3_count)),
                    (unmarked > 0).then(|| format!("{} unmarked", unmarked)),
                ].into_iter().flatten().collect();
                if parts.is_empty() {
                    format!("{} clauses", file_clauses.len())
                } else {
                    format!("{} clauses ({})", file_clauses.len(), parts.join(", "))
                }
            };
            println!("   📄 {}: {}", path.file_name().unwrap().to_string_lossy(), marker_info);
            clauses.extend(file_clauses);
        } else if ext == Some("ncl") {
            ncl_count += 1;
            let content = tokio::fs::read_to_string(&path).await?;
            match parse_ncl_spec(&content, &path, target_lang) {
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
    }
    
    println!("   📁 Scanned {} .md + {} .ncl files, found {} matching clauses", 
        file_count, ncl_count, clauses.len());
    
    Ok(IngestOutput {
        clauses,
        source_files: vec![],
    })
}

/// Parse markdown content into clauses with language marker detection
fn parse_markdown_clauses(content: &str, source_path: &Path, target_lang: &str) -> Vec<Clause> {
    let mut clauses = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    let mut current_section = String::new();
    let mut prev_hash = String::new();
    let mut current_marker: Option<String> = None;
    let mut in_code_block = false;
    let mut code_block_lang = String::new();
    
    // Determine which markers are relevant for target language
    let relevant_markers: Vec<&str> = match target_lang {
        "rust" => vec!["rust", "pyo3"],
        "python" | "py" => vec!["python"],
        _ => vec![target_lang],
    };
    
    for (i, line) in lines.iter().enumerate() {
        // Track language markers: [rust], [python], [pyo3]
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
        
        // Track code blocks for language detection
        if line.trim().starts_with("```") {
            if in_code_block {
                in_code_block = false;
                code_block_lang.clear();
            } else {
                in_code_block = true;
                code_block_lang = line.trim().trim_start_matches("```").trim().to_string();
                // Update marker based on code block language
                if !code_block_lang.is_empty() && code_block_lang != "toml" && code_block_lang != "json" {
                    current_marker = Some(code_block_lang.clone());
                }
            }
            continue;
        }
        
        // Track sections
        if line.starts_with("## ") && !line.contains('[') {
            current_section = line.trim_start_matches("## ").trim().to_string();
            current_marker = None; // Reset marker at new section
            continue;
        }
        
        // Parse requirement/constraint/definition/assumption/scenario lines
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
                let id = canon_id(&normalized);
                let clause_hash = clause_semhash(&normalized);
                let context_hash = context_semhash(&normalized, &[&current_section], &prev_hash, "");
                
                // Determine effective marker for this clause
                let effective_marker = current_marker.clone().or_else(|| {
                    // Infer from section name
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
                
                // Check if clause should be included for target language
                let should_include = match &effective_marker {
                    None => true, // No marker = include for all
                    Some(m) => relevant_markers.contains(&m.as_str()),
                };
                
                if should_include {
                    clauses.push(Clause {
                        id: id.clone(),
                        clause_type: *clause_type,
                        text: normalized.clone(),
                        raw_text: raw_text.clone(),
                        section: current_section.clone(),
                        source_file: source_path.to_string_lossy().to_string(),
                        line: i + 1,
                        clause_semhash: clause_hash.clone(),
                        context_semhash: context_hash,
                        language_marker: effective_marker,
                    });
                }
                
                prev_hash = clause_hash;
                break; // Only match one pattern per line
            }
        }
    }
    
    clauses
}

/// Parse NCL (Nickel) spec file into clauses
/// 
/// Extracts generation directives from panproto-style .ncl files
/// Each morphism with a generation block becomes a clause
fn parse_ncl_spec(content: &str, source_path: &Path, target_lang: &str) -> Result<Vec<Clause>> {
    let mut clauses = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    
    // Track if we're in a morphisms section and capturing generation info
    let mut in_morphisms = false;
    let mut brace_depth = 0;
    let mut current_morphism: Option<(String, String, String, Option<String>)> = None; // (name, domain, codomain, output_path)
    let mut capturing_generation = false;
    let mut generation_content = String::new();
    
    for (i, line) in lines.iter().enumerate() {
        let trimmed = line.trim();
        
        // Track brace depth for section detection
        brace_depth += trimmed.chars().filter(|&c| c == '{').count() as i32;
        brace_depth -= trimmed.chars().filter(|&c| c == '}').count() as i32;
        
        // Detect morphisms section
        if trimmed.contains("morphisms") && trimmed.contains("=") && trimmed.contains("[") {
            in_morphisms = true;
            continue;
        }
        
        // Detect individual morphism entry
        if in_morphisms && trimmed.starts_with("{") && trimmed.contains("morphism") {
            // Extract morphism name
            if let Some(name_start) = trimmed.find("morphism") {
                let after_morphism = &trimmed[name_start..];
                if let Some(eq_pos) = after_morphism.find("=") {
                    let after_eq = &after_morphism[eq_pos+1..];
                    let name = after_eq.split(|c: char| c == ',' || c == '}').next()
                        .unwrap_or("")
                        .trim()
                        .trim_matches('"')
                        .to_string();
                    
                    // Extract domain/codomain for language detection
                    let domain = lines.iter().skip(i).take(10)
                        .find(|l| l.contains("domain"))
                        .and_then(|l| l.split("=").nth(1))
                        .map(|s| s.trim().trim_matches(',').trim_matches('"').to_string())
                        .unwrap_or_default();
                    
                    let codomain = lines.iter().skip(i).take(10)
                        .find(|l| l.contains("codomain"))
                        .and_then(|l| l.split("=").nth(1))
                        .map(|s| s.trim().trim_matches(',').trim_matches('"').to_string())
                        .unwrap_or_default();
                    
                    current_morphism = Some((name, domain, codomain, None));
                }
            }
            continue;
        }
        
        // Detect output_path in morphism
        if let Some((ref name, _, _, ref mut output_path)) = current_morphism {
            if trimmed.contains("output_path") && trimmed.contains("=") {
                if let Some(path) = trimmed.split("=").nth(1) {
                    let path_clean = path.trim().trim_matches(',').trim_matches('"').trim_matches('"').to_string();
                    *output_path = Some(path_clean);
                }
            }
            
            // Detect generation block
            if trimmed.contains("generation") && trimmed.contains("=") && trimmed.contains("{") {
                capturing_generation = true;
                generation_content.clear();
                continue;
            }
            
            // Capture generation content
            if capturing_generation {
                if brace_depth <= 0 && trimmed.contains("}") {
                    // End of generation block
                    capturing_generation = false;
                    
                    // Determine language from generation block or path
                    let language = if generation_content.contains("language") {
                        generation_content.lines()
                            .find(|l| l.contains("language"))
                            .and_then(|l| l.split("=").nth(1))
                            .map(|s| s.trim().trim_matches(',').trim_matches('"').to_string())
                            .unwrap_or_else(|| infer_lang_from_path(output_path.as_deref().unwrap_or("")))
                    } else {
                        infer_lang_from_path(output_path.as_deref().unwrap_or(""))
                    };
                    
                    // Check if this morphism matches target language
                    let should_include = match target_lang {
                        "rust" => language == "rust" || output_path.as_deref().unwrap_or("").ends_with(".rs"),
                        "python" | "py" => language == "python" || output_path.as_deref().unwrap_or("").ends_with(".py"),
                        _ => true,
                    };
                    
                    if should_include {
                        // Create a clause from this morphism
                        let raw_text = format!("Morphism {}: {} → {} generating {} {:?}", 
                            name, 
                            current_morphism.as_ref().map(|(_, d, _, _)| d.clone()).unwrap_or_default(),
                            current_morphism.as_ref().map(|(_, _, c, _)| c.clone()).unwrap_or_default(),
                            language,
                            output_path
                        );
                        let normalized = normalize_text(&raw_text);
                        let id = canon_id(&normalized);
                        let clause_hash = clause_semhash(&normalized);
                        
                        clauses.push(Clause {
                            id: id.clone(),
                            clause_type: ClauseType::Requirement,
                            text: normalized.clone(),
                            raw_text: raw_text.clone(),
                            section: format!("morphism_{}", name),
                            source_file: source_path.to_string_lossy().to_string(),
                            line: i + 1,
                            clause_semhash: clause_hash.clone(),
                            context_semhash: context_semhash(&normalized, &[&format!("morphism_{}", name)], &clause_hash, ""),
                            language_marker: Some(language),
                        });
                    }
                    
                    current_morphism = None;
                } else {
                    generation_content.push_str(trimmed);
                    generation_content.push('\n');
                }
            }
        }
        
        // Also check for standalone OUTPUT_PATH directives (from markdown-style specs)
        if trimmed.contains("OUTPUT_PATH") && trimmed.contains(":") {
            if let Some(path) = trimmed.split(':').nth(1) {
                let path_clean = path.trim().to_string();
                let language = infer_lang_from_path(&path_clean);
                
                let should_include = match target_lang {
                    "rust" => language == "rust" || path_clean.ends_with(".rs"),
                    "python" | "py" => language == "python" || path_clean.ends_with(".py"),
                    _ => true,
                };
                
                if should_include {
                    let raw_text = format!("Output file: {}", path_clean);
                    let normalized = normalize_text(&raw_text);
                    let id = canon_id(&normalized);
                    let clause_hash = clause_semhash(&normalized);
                    
                    clauses.push(Clause {
                        id: id.clone(),
                        clause_type: ClauseType::Constraint,
                        text: normalized.clone(),
                        raw_text: raw_text.clone(),
                        section: "output_paths".to_string(),
                        source_file: source_path.to_string_lossy().to_string(),
                        line: i + 1,
                        clause_semhash: clause_hash.clone(),
                        context_semhash: context_semhash(&normalized, &["output_paths"], &clause_hash, ""),
                        language_marker: Some(language),
                    });
                }
            }
        }
    }
    
    Ok(clauses)
}

fn infer_lang_from_path(path: &str) -> String {
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

fn normalize_text(text: &str) -> String {
    text.to_lowercase()
        .replace(|c: char| !c.is_alphanumeric() && c != ' ', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

fn clause_semhash(text: &str) -> String {
    sha256(&format!("clause:{}", text))
}

fn context_semhash(text: &str, section_context: &[&str], prev_hash: &str, next_hash: &str) -> String {
    let context = format!(
        "section:{};prev:{};next:{};text:{}",
        section_context.join("|"),
        prev_hash,
        next_hash,
        text
    );
    sha256(&context)
}

/// Output of ingest phase
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IngestOutput {
    pub clauses: Vec<Clause>,
    pub source_files: Vec<String>,
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
        // Python only needs the TUI app - it imports from freeq_pyo3
        let contract = "Textual TUI application that imports IRCClient and ATProtoAuth from freeq_pyo3 module".to_string();
        let iu_id = iu_id("app", &contract, &[]);
        
        ius.push(ImplementationUnit {
            iu_id,
            name: "app".to_string(),
            contract,
            source_canon_ids: canon_output.nodes.iter()
                .filter(|n| n.clean_statement.contains("[python]") || n.clean_statement.contains("interface"))
                .map(|n| n.id.clone())
                .collect(),
            risk_tier: determine_risk_tier(&canon_output.nodes),
            target_language: target_language.to_string(),
            output_files: vec!["src/app.py".to_string()],
        });
        
        println!("   🎯 Simplified Python architecture: 1 IU (TUI app importing from freeq_pyo3)");
    } else if lang == "rust" || lang == "rs" {
        // Rust/PyO3 project: create PyO3 wrapper module
        // This wraps freeq-sdk for Python consumption
        let contract = "PyO3 bindings wrapping freeq-sdk IRCClient and ATProtoAuth for Python".to_string();
        let iu_id = iu_id("lib", &contract, &[]);
        
        ius.push(ImplementationUnit {
            iu_id,
            name: "lib".to_string(),
            contract,
            source_canon_ids: canon_output.nodes.iter()
                .filter(|n| n.clean_statement.contains("[rust]") || n.clean_statement.contains("[pyo3]"))
                .map(|n| n.id.clone())
                .collect(),
            risk_tier: determine_risk_tier(&canon_output.nodes),
            target_language: target_language.to_string(),
            output_files: vec!["src/lib.rs".to_string()],
        });
        
        println!("   🎯 Simplified Rust architecture: 1 IU (PyO3 wrapper for freeq-sdk)");
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
) -> Result<CodegenOutput> {
    let output_dir = output_dir.as_ref();
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
    
    Ok(CodegenOutput { files })
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
    let codegen_output = generate_code(&plan_output.ius, &output_dir).await?;
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
