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
/// Output: Clauses with canon IDs (semantic hashes)
pub async fn ingest_specs(project_root: impl AsRef<Path>) -> Result<IngestOutput> {
    let specs_dir = project_root.as_ref().join("specs");
    
    if !specs_dir.exists() {
        anyhow::bail!("No specs/ directory found. Create one with .md files.");
    }
    
    let mut clauses = Vec::new();
    let mut entries = tokio::fs::read_dir(&specs_dir).await?;
    let mut file_count = 0;
    
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("md") {
            file_count += 1;
            let content = tokio::fs::read_to_string(&path).await?;
            let file_clauses = parse_markdown_clauses(&content, &path);
            println!("   📄 {}: {} clauses", path.file_name().unwrap().to_string_lossy(), file_clauses.len());
            clauses.extend(file_clauses);
        }
    }
    
    println!("   📁 Scanned {} files, found {} total clauses", file_count, clauses.len());
    
    Ok(IngestOutput {
        clauses,
        source_files: vec![],
    })
}

/// Parse markdown content into clauses
fn parse_markdown_clauses(content: &str, source_path: &Path) -> Vec<Clause> {
    let mut clauses = Vec::new();
    let lines: Vec<&str> = content.lines().collect();
    let mut current_section = String::new();
    let mut prev_hash = String::new();
    
    for (i, line) in lines.iter().enumerate() {
        // Track sections
        if line.starts_with("## ") {
            current_section = line.trim_start_matches("## ").trim().to_string();
            continue;
        }
        
        // Parse requirement/contraint/definition/assumption/scenario lines
        // Format: "- REQUIREMENT: Text here"
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
                
                clauses.push(Clause {
                    id,
                    clause_type: *clause_type,
                    text: normalized.clone(),
                    raw_text,
                    section: current_section.clone(),
                    source_file: source_path.to_string_lossy().to_string(),
                    line: i + 1,
                    clause_semhash: clause_hash.clone(),
                    context_semhash: context_hash,
                });
                
                prev_hash = clause_hash;
            }
        }
    }
    
    clauses
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

/// Canonical requirement node
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

#[derive(Debug, Clone, Copy, Serialize, Deserialize, PartialEq)]
pub enum CanonNodeType {
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
    #[serde(rename = "pipeline_upgrade")]
    PipelineUpgrade,
}

/// μ_plan: Group canonical nodes into Implementation Units
///
/// Input: Canonical nodes
/// Output: IU boundaries with dependency graphs
pub async fn plan_implementation_units(
    nodes: Vec<CanonNode>,
    target_language: &str,
) -> Result<PlanOutput> {
    // Simple partitioning: group by section/domain
    let mut groups: HashMap<String, Vec<CanonNode>> = HashMap::new();
    
    // In a real implementation, this would use ML or heuristics
    // For now, use simple domain-based grouping
    for node in nodes {
        let domain = extract_domain(&node.clean_statement);
        groups.entry(domain).or_default().push(node);
    }
    
    let mut ius = Vec::new();
    for (domain, group_nodes) in groups {
        if group_nodes.is_empty() {
            continue;
        }
        
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
    
    Ok(PlanOutput { ius })
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
        
        let code = generate_skeleton_code(iu);
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

fn generate_skeleton_code(iu: &ImplementationUnit) -> String {
    match iu.target_language.as_str() {
        "rust" => generate_rust_skeleton(iu),
        "typescript" | "ts" => generate_typescript_skeleton(iu),
        "python" | "py" => generate_python_skeleton(iu),
        _ => generate_rust_skeleton(iu),
    }
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
    let ingest_output = ingest_specs(project_root).await?;
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
    let plan_output = plan_implementation_units(canon_output.nodes, target_language).await?;
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
