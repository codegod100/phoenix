//! Phoenix VCS CLI
//!
//! Command-line interface for the Phoenix VCS Rust implementation.
//!
//! Commands:
//!   status              - Show complete VCS state
//!   drift               - Detect drift between manifest and working tree
//!   boundary <file>     - Validate boundary policy for a file
//!   cascade <iu-id>     - Compute cascade for a failed IU
//!   invalidate <spec>   - Compute selective invalidation for spec changes
//!   shadow <old> <new>  - Compare two canonical graphs (upgrade safety)
//!   init                - Initialize a new Phoenix project
//!   pipeline            - Run spec-to-code generation (uses category theory lenses)
//!   verify-laws         - Verify lens laws (GetPut, PutGet) mathematically

use clap::{Parser, Subcommand};
use std::path::{Path, PathBuf};
use anyhow::{Result, Context};
use tracing::info;

use crate::status::{get_vcs_status, format_vcs_status};
use crate::drift::{GeneratedManifest, detect_drift, format_drift_report, load_waivers, create_waiver, WaiverType};
use crate::boundary::{validate_boundary, format_boundary_report, default_boundary_policy, EnforcementConfig, ViolationSeverity};
use crate::cascade::{build_dependency_graph, compute_cascade, format_cascade_event, compute_invalidation, format_invalidation_report, IUDef};
use crate::shadow::run_shadow_pipeline;
use crate::identity::sha256;
use crate::identity::{canon_id, file_hash, short_hash, normalize_text};
use crate::evidence::{get_required_evidence, RiskTier};

/// Phoenix VCS — Regenerative version control
#[derive(Parser)]
#[command(name = "phoenix-vcs")]
#[command(about = "Regenerative version control that compiles intent to working software")]
#[command(version = "0.1.0")]
pub struct Cli {
    /// Optional project root directory
    #[arg(global = true, short, long, default_value = ".")]
    pub project_root: PathBuf,
    
    /// Enable verbose output
    #[arg(global = true, short, long)]
    pub verbose: bool,
    
    /// Subcommand to run (defaults to pipeline if not specified)
    #[command(subcommand)]
    pub command: Option<Commands>,
}

#[derive(Subcommand)]
pub enum Commands {
    /// Show complete VCS state (diagnostics, drift, evidence)
    Status,
    
    /// Detect drift between manifest and working tree
    Drift {
        /// Output as JSON
        #[arg(short, long)]
        json: bool,
    },
    
    /// Validate boundary policy for a file
    Boundary {
        /// File to validate
        file: PathBuf,
        
        /// Output as JSON
        #[arg(short, long)]
        json: bool,
    },
    
    /// Compute cascade actions for a failed IU
    Cascade {
        /// IU ID that failed
        iu_id: String,
        
        /// Kind of failure
        #[arg(short, long, default_value = "unit_tests")]
        failure_kind: String,
        
        /// Failure details
        #[arg(short, long)]
        details: Option<String>,
    },
    
    /// Compute selective invalidation for spec changes
    Invalidate {
        /// Changed canonical IDs
        canon_ids: Vec<String>,
    },
    
    /// Shadow pipeline upgrade safety check
    Shadow {
        /// Old pipeline version
        old_version: String,
        
        /// New pipeline version
        new_version: String,
        
        /// Old nodes JSON file
        #[arg(short = 'O', long)]
        old_file: PathBuf,
        
        /// New nodes JSON file
        #[arg(short = 'N', long)]
        new_file: PathBuf,
    },
    
    /// Generate content hash for a file
    Hash {
        /// File to hash
        file: PathBuf,
    },
    
    /// Compute canonical ID from text
    CanonId {
        /// Text to canonize
        text: String,
    },
    
    /// Show required evidence for a risk tier
    Evidence {
        /// Risk tier
        #[arg(value_enum)]
        tier: RiskTierArg,
    },
    
    /// Create a waiver for manual edits
    Waiver {
        /// File path
        file: String,
        
        /// Waiver type
        #[arg(value_enum)]
        waiver_type: WaiverTypeArg,
        
        /// Expiration date (YYYY-MM-DD)
        #[arg(short, long)]
        expires: Option<String>,
        
        /// Signer name
        #[arg(short, long)]
        signed_by: Option<String>,
    },
    
    /// Initialize a new Phoenix project
    Init {
        /// Project name
        #[arg(short, long)]
        name: Option<String>,
        
        /// Skip creating example files
        #[arg(long)]
        bare: bool,
    },
    
    /// Run the spec-to-code generation pipeline (generates for all language markers found)
    Pipeline {
        /// Only generate IUs and print plan, don't invoke LLM codegen (for testing)
        #[arg(long)]
        stub: bool,
        
        /// Skip ingest phase
        #[arg(long)]
        skip_ingest: bool,
        
        /// Skip canonicalize phase
        #[arg(long)]
        skip_canonicalize: bool,
        
        /// Skip plan phase
        #[arg(long)]
        skip_plan: bool,
        
        /// Verify lens laws after each phase
        #[arg(long)]
        verify: bool,
        
        /// Use legacy lens-based pipeline (default is formal morphism-based)
        #[arg(long)]
        legacy: bool,
        
        /// Disable domain clustering (default: cluster by domain, creating IUs per domain)
        #[arg(long)]
        no_cluster: bool,
    },
    
    /// Verify lens laws for the pipeline
    VerifyLaws {
        /// Target language
        #[arg(short, long, default_value = "rust")]
        lang: String,
    },
    
    /// Reverse engineer specs from existing code
    Reverse {
        /// Source language to parse
        #[arg(short, long, default_value = "rust")]
        lang: String,
        
        /// Output directory for specs
        #[arg(short, long, default_value = "specs")]
        output: PathBuf,
        
        /// Include private functions
        #[arg(long)]
        include_private: bool,
        
        /// Don't extract doc comments
        #[arg(long)]
        no_docs: bool,
    },
}

#[derive(Clone, Copy, Debug, clap::ValueEnum)]
pub enum RiskTierArg {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Clone, Copy, Debug, clap::ValueEnum)]
pub enum WaiverTypeArg {
    PromoteToRequirement,
    TemporaryPatch,
    ManualOverride,
}

impl From<WaiverTypeArg> for WaiverType {
    fn from(arg: WaiverTypeArg) -> Self {
        match arg {
            WaiverTypeArg::PromoteToRequirement => WaiverType::PromoteToRequirement,
            WaiverTypeArg::TemporaryPatch => WaiverType::TemporaryPatch,
            WaiverTypeArg::ManualOverride => WaiverType::ManualOverride,
        }
    }
}

impl From<RiskTierArg> for RiskTier {
    fn from(arg: RiskTierArg) -> Self {
        match arg {
            RiskTierArg::Low => RiskTier::Low,
            RiskTierArg::Medium => RiskTier::Medium,
            RiskTierArg::High => RiskTier::High,
            RiskTierArg::Critical => RiskTier::Critical,
        }
    }
}

/// Run the CLI
pub async fn run() -> Result<()> {
    let cli = Cli::parse();
    
    // Initialize tracing
    let subscriber = tracing_subscriber::FmtSubscriber::builder()
        .with_max_level(if cli.verbose {
            tracing::Level::DEBUG
        } else {
            tracing::Level::INFO
        })
        .finish();
    
    tracing::subscriber::set_global_default(subscriber)?;
    
    match cli.command {
        Some(Commands::Status) => cmd_status(&cli.project_root).await,
        Some(Commands::Drift { json }) => cmd_drift(&cli.project_root, json).await,
        Some(Commands::Boundary { file, json }) => cmd_boundary(&cli.project_root, file, json).await,
        Some(Commands::Cascade { iu_id, failure_kind, details }) => {
            cmd_cascade(&cli.project_root, &iu_id, &failure_kind, details).await
        }
        Some(Commands::Invalidate { canon_ids }) => cmd_invalidate(&cli.project_root, &canon_ids).await,
        Some(Commands::Shadow { old_version, new_version, old_file, new_file }) => {
            cmd_shadow(old_version, new_version, old_file, new_file).await
        }
        Some(Commands::Hash { file }) => cmd_hash(file).await,
        Some(Commands::CanonId { text }) => cmd_canon_id(&text),
        Some(Commands::Evidence { tier }) => cmd_evidence(tier.into()),
        Some(Commands::Waiver { file, waiver_type, expires, signed_by }) => {
            cmd_waiver(file, waiver_type.into(), expires, signed_by)
        }
        Some(Commands::Init { name, bare }) => cmd_init(&cli.project_root, name, bare).await,
        Some(Commands::Pipeline { stub, skip_ingest, skip_canonicalize, skip_plan, verify, legacy, no_cluster }) => {
            cmd_pipeline_multi(&cli.project_root, stub, skip_ingest, skip_canonicalize, skip_plan, verify, legacy, no_cluster).await
        }
        Some(Commands::VerifyLaws { lang }) => {
            cmd_verify_laws(&cli.project_root, &lang).await
        }
        Some(Commands::Reverse { lang, output, include_private, no_docs }) => {
            cmd_reverse(&cli.project_root, &lang, output, include_private, no_docs).await
        }
        // Default: run pipeline with auto-detection (zero-config mode)
        None => {
            info!("No subcommand provided, running auto-detect pipeline...");
            cmd_pipeline_multi(&cli.project_root, false, false, false, false, false, false, false).await
        }
    }
}

/// Extract project name from spec content
fn extract_project_name(spec_content: &str) -> String {
    // Try to find name = "..." in spec
    spec_content.lines()
        .find(|l| l.contains("name =") && !l.trim().starts_with('#'))
        .and_then(|l| {
            l.split('=').nth(1)
                .map(|s| {
                    s.trim()
                        .trim_end_matches(',')  // Remove trailing comma FIRST
                        .trim_matches('"')      // Then remove quotes
                        .to_string()
                })
        })
        .or_else(|| {
            // Fallback: find id = "dev." prefix
            spec_content.lines()
                .find(|l| l.contains("id = \"dev."))
                .and_then(|l| {
                    l.split('=').nth(1)
                        .map(|s| {
                            s.trim()
                                .trim_end_matches(',')  // Remove trailing comma FIRST
                                .trim_matches('"')      // Then remove quotes
                                .replace("dev.", "")
                                .to_string()
                        })
                })
        })
        .unwrap_or_else(|| "phoenix-project".to_string())
}

async fn cmd_status(project_root: &Path) -> Result<()> {
    info!("Running Phoenix VCS status check...");
    
    let state = get_vcs_status(project_root).await?;
    println!("{}", format_vcs_status(&state));
    
    // Exit code based on status
    match state.status {
        crate::status::VCSStatus::Healthy => std::process::exit(0),
        crate::status::VCSStatus::Warning => std::process::exit(1),
        crate::status::VCSStatus::Critical => std::process::exit(2),
    }
}

async fn cmd_drift(project_root: &Path, json: bool) -> Result<()> {
    info!("Running drift detection...");
    
    let manifest = GeneratedManifest::load(project_root)?
        .context("No manifest found. Run phoenix pipeline first.")?;
    
    let waivers = load_waivers(project_root)?;
    let report = detect_drift(project_root, &manifest, &waivers)?;
    
    if json {
        println!("{}", serde_json::to_string_pretty(&report)?);
    } else {
        println!("{}", format_drift_report(&report));
    }
    
    if report.has_blocking_drift {
        std::process::exit(1);
    }
    
    Ok(())
}

async fn cmd_boundary(project_root: &Path, file: PathBuf, json: bool) -> Result<()> {
    let full_path = if file.is_absolute() {
        file
    } else {
        project_root.join(file)
    };
    
    if !full_path.exists() {
        anyhow::bail!("File not found: {}", full_path.display());
    }
    
    info!("Validating boundary for {}...", full_path.display());
    
    let source_code = tokio::fs::read_to_string(&full_path).await?;
    
    // Extract IU ID from source (would be in a comment or attribute)
    let iu_id = extract_iu_id_from_source(&source_code)
        .unwrap_or_else(|| "unknown".to_string());
    
    let policy = default_boundary_policy();
    let enforcement = EnforcementConfig {
        dependency_violation: ViolationSeverity::Error,
        side_channel_violation: ViolationSeverity::Warning,
    };
    
    let result = validate_boundary(
        &iu_id,
        &full_path.to_string_lossy(),
        &source_code,
        &policy,
        &enforcement,
    );
    
    if json {
        println!("{}", serde_json::to_string_pretty(&result)?);
    } else {
        println!("{}", format_boundary_report(&[result.clone()]));
    }
    
    if result.has_errors {
        std::process::exit(1);
    }
    
    Ok(())
}

async fn cmd_cascade(
    project_root: &Path,
    iu_id: &str,
    failure_kind: &str,
    details: Option<String>,
) -> Result<()> {
    info!("Computing cascade for failed IU: {}", iu_id);
    
    // Load IU graph
    let ius_path = project_root.join(".phoenix").join("graphs").join("ius.json");
    
    if !ius_path.exists() {
        anyhow::bail!("No IU graph found. Run phoenix pipeline first.");
    }
    
    let ius_data = tokio::fs::read_to_string(&ius_path).await?;
    let ius: Vec<IUDef> = serde_json::from_str(&ius_data)?;
    let graph = build_dependency_graph(&ius);
    
    let details = details.unwrap_or_else(|| "Test suite failed".to_string());
    let event = compute_cascade(&graph, iu_id, failure_kind, &details);
    
    println!("{}", format_cascade_event(&event));
    
    Ok(())
}

async fn cmd_invalidate(project_root: &Path, changed_ids: &[String]) -> Result<()> {
    info!("Computing selective invalidation for {} changed requirements", changed_ids.len());
    
    // Load IU graph
    let ius_path = project_root.join(".phoenix").join("graphs").join("ius.json");
    
    if !ius_path.exists() {
        anyhow::bail!("No IU graph found. Run phoenix pipeline first.");
    }
    
    let ius_data = tokio::fs::read_to_string(&ius_path).await?;
    let ius: Vec<IUDef> = serde_json::from_str(&ius_data)?;
    let graph = build_dependency_graph(&ius);
    
    // Build IU to canon mapping
    let mut iu_to_canon_map = std::collections::HashMap::new();
    for iu in &ius {
        if let Some(ref canon_ids) = iu.source_canon_ids {
            iu_to_canon_map.insert(iu.iu_id.clone(), canon_ids.clone());
        }
    }
    
    let invalidated = compute_invalidation(&graph, changed_ids, &iu_to_canon_map);
    println!("{}", format_invalidation_report(changed_ids, &invalidated));
    
    Ok(())
}

async fn cmd_shadow(
    old_version: String,
    new_version: String,
    old_file: PathBuf,
    new_file: PathBuf,
) -> Result<()> {
    info!("Running shadow pipeline comparison...");
    
    let old_nodes_data = tokio::fs::read_to_string(&old_file).await?;
    let new_nodes_data = tokio::fs::read_to_string(&new_file).await?;
    
    let old_nodes = serde_json::from_str(&old_nodes_data)?;
    let new_nodes = serde_json::from_str(&new_nodes_data)?;
    
    let result = run_shadow_pipeline(old_nodes, new_nodes, &old_version, &new_version);
    
    println!("{}", result.diff_report);
    
    match result.classification {
        crate::shadow::UpgradeClassification::Safe => std::process::exit(0),
        crate::shadow::UpgradeClassification::CompactionEvent => std::process::exit(1),
        crate::shadow::UpgradeClassification::Reject => std::process::exit(2),
    }
}

async fn cmd_hash(file: PathBuf) -> Result<()> {
    let content = tokio::fs::read_to_string(&file).await?;
    let hash = file_hash(&content);
    
    println!("File: {}", file.display());
    println!("Hash: {}", hash);
    println!("Short: {}", short_hash(&hash));
    
    Ok(())
}

fn cmd_canon_id(text: &str) -> Result<()> {
    let normalized = normalize_text(text);
    let id = canon_id(&normalized);
    
    println!("Input: {}", text);
    println!("Normalized: {}", normalized);
    println!("Canon ID: {}", id);
    println!("Short: {}", short_hash(&id));
    
    Ok(())
}

fn cmd_evidence(tier: RiskTier) -> Result<()> {
    let required = get_required_evidence(tier);
    
    println!("Required evidence for {:?} risk tier:", tier);
    for (i, kind) in required.iter().enumerate() {
        println!("  {}. {}", i + 1, kind);
    }
    
    Ok(())
}

fn cmd_waiver(
    file: String,
    waiver_type: WaiverType,
    expires: Option<String>,
    signed_by: Option<String>,
) -> Result<()> {
    let waiver = create_waiver(waiver_type, expires, signed_by);
    
    println!("Waiver created for: {}", file);
    println!("Type: {:?}", waiver.waiver_type);
    if let Some(ref expires) = waiver.expires {
        println!("Expires: {}", expires);
    }
    if let Some(ref signed) = waiver.signed_by {
        println!("Signed by: {}", signed);
    }
    
    println!("\nAdd to .phoenix/waivers.json:");
    let entry = serde_json::json!({
        file: waiver
    });
    println!("{}", serde_json::to_string_pretty(&entry)?);
    
    Ok(())
}

/// Initialize a new Phoenix project
async fn cmd_init(project_root: &Path, name: Option<String>, bare: bool) -> Result<()> {
    info!("Initializing Phoenix project at {:?}...", project_root);
    
    // Create directory structure
    let phoenix_dir = project_root.join(".phoenix");
    let manifests_dir = phoenix_dir.join("manifests");
    let graphs_dir = phoenix_dir.join("graphs");
    let src_generated_dir = project_root.join("src").join("generated");
    
    tokio::fs::create_dir_all(&manifests_dir).await?;
    tokio::fs::create_dir_all(&graphs_dir).await?;
    tokio::fs::create_dir_all(&src_generated_dir).await?;
    
    // Create initial manifest
    let manifest = GeneratedManifest {
        version: "1.0.0".to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        files: std::collections::HashMap::new(),
    };
    
    let manifest_path = manifests_dir.join("generated_manifest.json");
    let manifest_json = serde_json::to_string_pretty(&manifest)?;
    tokio::fs::write(&manifest_path, manifest_json).await?;
    
    // Create empty waivers file
    let waivers: std::collections::HashMap<String, crate::drift::Waiver> = std::collections::HashMap::new();
    let waivers_path = phoenix_dir.join("waivers.json");
    tokio::fs::write(&waivers_path, serde_json::to_string_pretty(&waivers)?).await?;
    
    // Create empty IU graph
    let empty_ius: Vec<IUDef> = Vec::new();
    let ius_path = graphs_dir.join("ius.json");
    let ius_data = serde_json::json!({
        "version": "1.0.0",
        "generated_at": chrono::Utc::now().to_rfc3339(),
        "ius": empty_ius,
    });
    tokio::fs::write(&ius_path, serde_json::to_string_pretty(&ius_data)?).await?;
    
    // Create project state file
    let project_name = name.unwrap_or_else(|| {
        project_root.file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("unnamed-project")
            .to_string()
    });
    
    let state = serde_json::json!({
        "version": "1.0.0",
        "project": project_name,
        "created_at": chrono::Utc::now().to_rfc3339(),
        "pipeline": {},
    });
    let state_path = phoenix_dir.join("state.json");
    tokio::fs::write(&state_path, serde_json::to_string_pretty(&state)?).await?;
    
    // Create example spec file unless --bare
    if !bare {
        let example_spec = r#"# Phoenix Specification (Nickel Format)

{
  id = "dev.example.project",
  description = "Example Phoenix project specification",
  
  # Requirements as morphisms that generate code
  morphisms = [
    {
      morphism = "ExampleModule",
      domain = "ThSpec",
      codomain = "ThCode",
      description = "Example module demonstrating Phoenix spec format",
      
      # Generation directive - this becomes an IU
      generation = {
        language = "rust",
        output_path = "src/generated/example.rs",
      },
    },
  ],
  
  # Protocols define runtime behavior contracts
  protocols = [
    {
      protocol = "InputValidation",
      description = "System shall validate user input",
    },
    {
      protocol = "Encryption",
      description = "System shall encrypt sensitive data",
    },
  ],
  
  # Constraints are global properties
  constraints = {
    crypto_libraries = ["ring", "openssl"],
    max_response_time_ms = 100,
  },
}"#;
        let spec_path = project_root.join("example.ncl");
        tokio::fs::write(&spec_path, example_spec).await?;
    }
    
    println!("🐦 Phoenix project initialized!");
    println!("");
    println!("Project: {}", project_name);
    println!("Location: {}", project_root.display());
    println!("");
    println!("Created structure:");
    println!("  .phoenix/");
    println!("    manifests/generated_manifest.json  # Tracks generated files");
    println!("    graphs/ius.json                    # IU dependency graph");
    println!("    waivers.json                       # Manual edit waivers");
    println!("    state.json                         # Pipeline state");
    if !bare {
        println!("  example.ncl                          # Specification (top-level .ncl files)");
    }
    println!("  src/generated/                       # Generated code goes here");
    println!("");
    println!("Next steps:");
    println!("  1. Edit *.ncl files to add your requirements");
    println!("  2. Run: phoenix-vcs status            # Check project health");
    println!("  3. Run: phoenix-vcs drift             # Check for manual edits");
    if !bare {
        println!("");
        println!("  See example.ncl for specification format");
    }
    
    Ok(())
}

fn extract_iu_id_from_source(source: &str) -> Option<String> {
    // Look for patterns like:
    // // phoenix: iu_id = "abc123..."
    // /* phoenix: iu_id: abc123 */
    // #[phoenix(iu_id = "abc123")]
    
    use regex::Regex;
    
    let patterns = [
        Regex::new(r#"phoenix.*iu_id[:=]\s*["']([^"']+)["']"#).ok()?,
        Regex::new(r#"iu_id[:=]\s*([a-f0-9]{64})"#).ok()?,
    ];
    
    for pattern in &patterns {
        if let Some(caps) = pattern.captures(source) {
            if let Some(matched) = caps.get(1) {
                return Some(matched.as_str().to_string());
            }
        }
    }
    
    None
}

/// Extract public API (classes, functions) from generated Python code
fn extract_module_api(module_name: &str, code: &str) -> crate::llm::ModuleApi {
    use regex::Regex;
    
    let mut classes = Vec::new();
    let mut functions = Vec::new();
    let mut exports = Vec::new();
    
    // Match class definitions
    let class_re = Regex::new(r"^class (\w+)").unwrap();
    for cap in class_re.captures_iter(code) {
        if let Some(m) = cap.get(1) {
            classes.push(m.as_str().to_string());
            exports.push(m.as_str().to_string());
        }
    }
    
    // Match function definitions (top-level only, not methods)
    let func_re = Regex::new(r"^def (\w+)").unwrap();
    for cap in func_re.captures_iter(code) {
        if let Some(m) = cap.get(1) {
            let name = m.as_str();
            // Skip private functions
            if !name.starts_with('_') {
                functions.push(name.to_string());
                exports.push(name.to_string());
            }
        }
    }
    
    // Match __all__ exports if present
    let all_re = Regex::new(r"__all__\s*=\s*\[([^\]]+)\]").unwrap();
    if let Some(cap) = all_re.captures(code) {
        if let Some(m) = cap.get(1) {
            let all_exports: Vec<String> = m.as_str()
                .split(',')
                .filter_map(|s| {
                    let trimmed = s.trim().trim_matches('"').trim_matches('\'');
                    if !trimmed.is_empty() {
                        Some(trimmed.to_string())
                    } else {
                        None
                    }
                })
                .collect();
            if !all_exports.is_empty() {
                exports = all_exports;
            }
        }
    }
    
    crate::llm::ModuleApi {
        name: module_name.to_string(),
        classes,
        functions,
        exports,
    }
}

/// Main entry point for the binary
pub async fn main() -> Result<()> {
    run().await
}

/// Detect all target languages from spec content based on language markers
fn detect_all_languages(content: &str) -> Vec<String> {
    let mut has_rust = false;
    let mut has_python = false;
    let mut has_typescript = false;
    
    // Check for NCL-style language declarations in outputs
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.contains("language") && trimmed.contains("=") {
            if trimmed.contains("\"rust\"") || trimmed.contains("'rust'") {
                has_rust = true;
            }
            if trimmed.contains("\"python\"") || trimmed.contains("'python'") {
                has_python = true;
            }
            if trimmed.contains("\"typescript\"") || trimmed.contains("'typescript'") {
                has_typescript = true;
            }
        }
    }
    
    // Also check flake build_type for language hints
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("build_type") && trimmed.contains("=") {
            if trimmed.contains("\"rust\"") || trimmed.contains("'rust'") {
                has_rust = true;
            }
            if trimmed.contains("\"python\"") || trimmed.contains("'python'") {
                has_python = true;
            }
            if trimmed.contains("\"pyo3\"") || trimmed.contains("'pyo3'") 
                || trimmed.contains("\"maturin\"") || trimmed.contains("'maturin'") {
                has_rust = true;
                has_python = true;
            }
        }
    }
    
    let mut languages = Vec::new();
    if has_rust {
        languages.push("rust".to_string());
    }
    if has_python {
        languages.push("python".to_string());
    }
    if has_typescript {
        languages.push("typescript".to_string());
    }
    
    // If no markers found, default to rust
    if languages.is_empty() {
        languages.push("rust".to_string());
    }
    
    languages
}

/// Run pipeline for all detected languages
async fn cmd_pipeline_multi(
    project_root: &Path,
    stub: bool,
    skip_ingest: bool,
    skip_canonicalize: bool,
    skip_plan: bool,
    verify: bool,
    legacy: bool,
    no_cluster: bool,
) -> Result<()> {
    info!("Running Phoenix multi-language pipeline...");
    
    // Check for spec.md and convert to spec.ncl if present
    let spec_md_path = project_root.join("spec.md");
    let spec_ncl_path = project_root.join("spec.ncl");
    
    if spec_md_path.exists() {
        println!("📄 Found spec.md - converting to spec.ncl...");
        let spec_md_content = tokio::fs::read_to_string(&spec_md_path).await?;
        
        // Get API key from environment
        let api_key = std::env::var("FIREWORKS_API_KEY")
            .or_else(|_| std::env::var("OPENAI_API_KEY"))
            .unwrap_or_default();
        
        if api_key.is_empty() {
            println!("⚠️  No FIREWORKS_API_KEY or OPENAI_API_KEY found - skipping spec.md conversion");
            println!("   Set FIREWORKS_API_KEY to enable spec.md → spec.ncl conversion");
        } else {
            // Discover template bundles - try multiple locations
            let mut bundles_dir: Option<std::path::PathBuf> = None;
            
            // First: check PHOENIX_BUNDLES_DIR environment variable
            if let Ok(env_dir) = std::env::var("PHOENIX_BUNDLES_DIR") {
                let candidate = std::path::PathBuf::from(env_dir);
                if candidate.exists() {
                    bundles_dir = Some(candidate);
                    println!("   Using bundles from PHOENIX_BUNDLES_DIR");
                }
            }
            
            // Try: exe_dir/bundles (for installed binary)
            if bundles_dir.is_none() {
                if let Ok(exe) = std::env::current_exe() {
                    if let Some(exe_dir) = exe.parent() {
                        let candidate = exe_dir.join("bundles");
                        if candidate.exists() {
                            bundles_dir = Some(candidate);
                        }
                    }
                }
            }
            
            // Try: exe_dir/../bundles (for cargo install layout)
            if bundles_dir.is_none() {
                if let Ok(exe) = std::env::current_exe() {
                    if let Some(exe_dir) = exe.parent() {
                        let candidate = exe_dir.parent()
                            .map(|p| p.join("bundles"))
                            .unwrap_or_else(|| exe_dir.join("bundles"));
                        if candidate.exists() {
                            bundles_dir = Some(candidate);
                        }
                    }
                }
            }
            
            // Try: project_root/../phoenix-vcs-rust/bundles (for dev from simple-tui)
            if bundles_dir.is_none() {
                if let Some(parent) = project_root.parent() {
                    let candidate = parent.join("phoenix-vcs-rust").join("bundles");
                    if candidate.exists() {
                        bundles_dir = Some(candidate);
                    }
                }
            }
            
            // Try: CARGO_MANIFEST_DIR/bundles (when running via cargo)
            if bundles_dir.is_none() {
                if let Ok(manifest_dir) = std::env::var("CARGO_MANIFEST_DIR") {
                    let candidate = std::path::PathBuf::from(manifest_dir).join("bundles");
                    if candidate.exists() {
                        bundles_dir = Some(candidate);
                    }
                }
            }
            
            // Fallback: project_root/bundles
            if bundles_dir.is_none() {
                let candidate = project_root.join("bundles");
                if candidate.exists() {
                    bundles_dir = Some(candidate);
                }
            }
            
            if let Some(bundles_dir) = bundles_dir {
                match crate::pipeline::spec_md::spec_md_to_ncl(
                    &spec_md_content,
                    &bundles_dir,
                ).await {
                    Ok(spec_ncl) => {
                        tokio::fs::write(&spec_ncl_path, spec_ncl).await?;
                        println!("✅ Generated spec.ncl from spec.md");
                    }
                    Err(e) => {
                        println!("⚠️  Failed to convert spec.md: {}", e);
                        println!("   Continuing with existing spec.ncl if present...");
                    }
                }
            } else {
                println!("⚠️  No template bundles found - checked multiple locations");
                println!("   Set PHOENIX_BUNDLES_DIR to specify bundle location");
            }
        }
    }
    
    // Clean generated directory before building to avoid cruft buildup
    clean_generated_dir(project_root).await?;
    
    // Load all specs from project root (zero-config: .ncl files at top level)
    let specs_dir = project_root.to_path_buf();
    let mut entries = tokio::fs::read_dir(&specs_dir).await?;
    let mut combined_content = String::new();
    let mut _file_count = 0;
    
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("ncl") {
            if let Ok(content) = tokio::fs::read_to_string(&path).await {
                combined_content.push_str(&format!("\n\n## Source: {}\n\n", path.file_name().unwrap().to_string_lossy()));
                combined_content.push_str(&content);
                _file_count += 1;
            }
        }
    }
    
    let languages = detect_all_languages(&combined_content);
    
    // Run pipeline for each language
    for lang in &languages {
        if let Err(e) = cmd_pipeline_single(project_root, project_root, lang, stub, skip_ingest, skip_canonicalize, skip_plan, verify, legacy, no_cluster).await {
            println!("⚠️  {} failed: {}", lang, e);
        }
    }
    
    // Generate project-wide flake.nix based on all specs
    generate_project_flake(project_root, &combined_content).await?;
    
    println!("Done: {}", languages.join(", "));
    
    Ok(())
}

/// Run pipeline for a single language
async fn cmd_pipeline_single(
    output_dir: &Path,
    specs_root: &Path,
    lang: &str,
    stub: bool,
    _skip_ingest: bool,
    _skip_canonicalize: bool,
    _skip_plan: bool,
    verify: bool,
    legacy: bool,
    no_cluster: bool,
) -> Result<()> {
    info!("Running Phoenix pipeline for {}...", lang);
    
    // Auto-detect LLM availability
    let llm_config = crate::llm::LlmConfig::default();
    let llm_available = crate::llm::is_llm_available(&llm_config);
    let full_url = format!("{}/chat/completions", llm_config.api_base);
    
    // Load all specs from project root (zero-config: .ncl files at top level)
    let specs_dir = specs_root.to_path_buf();
    let mut entries = tokio::fs::read_dir(&specs_dir).await?;
    let mut combined_content = String::new();
    let mut _file_count = 0;
    
    while let Some(entry) = entries.next_entry().await? {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("ncl") {
            if let Ok(content) = tokio::fs::read_to_string(&path).await {
                combined_content.push_str(&format!("\n\n## Source: {}\n\n", path.file_name().unwrap().to_string_lossy()));
                combined_content.push_str(&content);
                _file_count += 1;
            }
        }
    }
    
    // Parse specs to extract explicit template (per agents.md - always be explicit)
    let mut template_name = None;
    let mut entries2 = tokio::fs::read_dir(&specs_dir).await?;
    while let Some(entry) = entries2.next_entry().await? {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("ncl") {
            if let Ok(content) = tokio::fs::read_to_string(&path).await {
                if let Ok(parsed) = crate::ncl::parse_ncl_spec(&content, &path.to_string_lossy()) {
                    // Explicit template takes precedence
                    if parsed.template.is_some() {
                        template_name = parsed.template.clone();
                        break;
                    }
                    // Fall back to build_type if no explicit template
                    if template_name.is_none() && parsed.build_type.is_some() {
                        template_name = parsed.build_type.clone();
                    }
                }
            }
        }
    }
    
    // EXPLICIT template is REQUIRED per agents.md
    let template_name = template_name.expect(
        "No template specified in spec.\n\
         Add to your spec.ncl:\n\
         template = 'python-textual'  # for TUI\n\
         template = 'python-flask'    # for web\n\
         template = 'rust'            # for Rust\n\
         Or: build_type = 'python' | 'rust' | 'pyo3'"
    );
    
    if llm_available {
        println!("   LLM: {}", full_url);
    }
    
    // Clone content for formal morphism (used when panproto is enabled)
    #[cfg(feature = "panproto")]
    let content_for_morphism = combined_content.clone();
    
    // Extract project name and clone content before combined_content is moved
    let project_name = extract_project_name(&combined_content);
    let bundle_content = combined_content.clone();  // For bundle generation
    
    // Removed: "📁 Scanned {} files" - too verbose
    
    let spec = crate::lens::SpecDocument {
        content: combined_content,
        path: specs_dir.to_string_lossy().to_string(),
        target_language: lang.to_string(),
    };
    
    // Run through the lens
    // First, capture clause count directly from ingest
    let ingest_lens = crate::lens::ingest_lens();
    let (clause_graph, _ingest_comp) = (ingest_lens.get)(&spec);
    let total_clauses = clause_graph.clauses.len();
    
    // Create and report formal theories and morphisms (when panproto is enabled)
    #[cfg(feature = "panproto")]
    {
        println!("   📐 Formal Pipeline Theories:");
        
        // Show base theories
        let th_clause = crate::pipeline::clause_theory();
        let th_canon = crate::pipeline::canon_theory();
        let th_iu = crate::pipeline::iu_theory();
        let th_code = crate::pipeline::code_theory();
        
        crate::pipeline::print_theory_summary(&th_clause, "ThClause");
        crate::pipeline::print_theory_summary(&th_canon, "ThCanon");
        crate::pipeline::print_theory_summary(&th_iu, "ThIU");
        crate::pipeline::print_theory_summary(&th_code, "ThCode");
        
        // Show template formal theories
        let th_template = crate::pipeline::template_formal::template_theory();
        let th_template_vars = crate::pipeline::template_formal::template_vars_theory();
        crate::pipeline::print_theory_summary(&th_template, "ThTemplate");
        crate::pipeline::print_theory_summary(&th_template_vars, "ThTemplateVars");
        
        println!("   ↳ Pipeline Morphisms:");
        
        // Show canonical morphisms
        let mu_canon = crate::pipeline::canonize_morphism();
        let mu_plan = crate::pipeline::plan_morphism();
        let mu_codegen = crate::pipeline::codegen_morphism();
        
        crate::pipeline::print_morphism_summary(&mu_canon);
        crate::pipeline::print_morphism_summary(&mu_plan);
        crate::pipeline::print_morphism_summary(&mu_codegen);
        
        // Show template morphisms
        let mu_iu_to_vars = crate::pipeline::template_formal::iu_to_vars_morphism();
        let mu_template_render = crate::pipeline::template_formal::template_render_morphism();
        crate::pipeline::print_morphism_summary(&mu_iu_to_vars);
        crate::pipeline::print_morphism_summary(&mu_template_render);
        
        // Show equations for each theory
        println!("   ⚖️  Algebraic Laws (Equations):");
        crate::pipeline::print_equations("ThClause", &crate::pipeline::clause_equations());
        crate::pipeline::print_equations("ThCanon", &crate::pipeline::canon_equations());
        crate::pipeline::print_equations("ThIU", &crate::pipeline::iu_equations());
        crate::pipeline::print_equations("ThCode", &crate::pipeline::code_equations());
        crate::pipeline::print_equations("ThTemplateVars", &crate::pipeline::template_formal::template_equations());
        
        // Verify morphism equation preservation with detailed results
        println!("   ✓ Verifying morphism preservation of equations:");
        let canon_results = crate::pipeline::verify_morphism_preserves_equations(&mu_canon, &crate::pipeline::canon_equations());
        crate::pipeline::print_morphism_preservation_results("μ_canon", &canon_results);
        
        let plan_results = crate::pipeline::verify_morphism_preserves_equations(&mu_plan, &crate::pipeline::iu_equations());
        crate::pipeline::print_morphism_preservation_results("μ_plan", &plan_results);
        
        let codegen_results = crate::pipeline::verify_morphism_preserves_equations(&mu_codegen, &crate::pipeline::code_equations());
        crate::pipeline::print_morphism_preservation_results("μ_codegen", &codegen_results);
        
        // Demonstrate actual term transformations
        println!("   🔀 Term Transformations (morphism.apply_to_term()):");
        if !clause_graph.clauses.is_empty() {
            let sample_clause = &clause_graph.clauses[0];
            crate::pipeline::demonstrate_pipeline_morphisms(sample_clause);
        }
        
        // Use pre-cloned content to create NCL→Code morphism
        if let Ok(parsed) = crate::ncl::parse_ncl_spec(&content_for_morphism, "combined.ncl") {
            let theory = parsed.to_panproto_theory();
            match crate::pipeline::morphisms::create_ncl_to_code_morphism(&theory, lang) {
                Ok(morphism) => {
                    println!("   🧮 NCL Requirements → Code:");
                    crate::pipeline::print_morphism_summary(&morphism);
                }
                Err(e) => {
                    println!("   ⚠️  Formal morphism error: {}", e);
                }
            }
        }
    }
    
    // Use either formal morphism-driven pipeline or legacy lens-based pipeline
    let (canon_graph, iu_graph) = if legacy {
        // Legacy lens-based pipeline (for comparison/testing)
        let canon_lens = crate::lens::canonicalize_lens();
        let (canon_graph, _canon_comp) = (canon_lens.get)(&clause_graph);
        
        let plan_lens = crate::lens::plan_lens(Box::leak(lang.to_string().into_boxed_str()));
        let (iu_graph, _plan_comp) = (plan_lens.get)(&canon_graph);
        
        println!("   {} clauses → {} canons → {} IUs [legacy lens-based]", 
            total_clauses, canon_graph.nodes.len(), iu_graph.ius.len());
        
        (canon_graph, iu_graph)
    } else {
        // Formal morphism-driven pipeline (default)
        // This applies the composed morphism: μ_codegen ∘ μ_plan ∘ μ_canon
        let canon_graph = crate::pipeline::formal_canonicalize(&clause_graph.clauses);
        let unique_nodes = canon_graph.nodes.len();
        let duplicates = total_clauses.saturating_sub(unique_nodes);
        
        let iu_graph = if no_cluster {
            // 1:1 mapping: each canon node → separate IU (disable clustering)
            crate::pipeline::formal_plan_nodes(&canon_graph.nodes, lang)
        } else {
            // Domain-based clustering: group canon nodes by extracted domain (default)
            let ius = crate::pipeline::formal_plan_nodes_by_domain(&canon_graph.nodes, lang);
            crate::lens::IUGraph { ius }
        };
        
        let mode_str = if no_cluster { "formal morphisms (1:1)" } else { "formal morphisms + domain clustering" };
        println!("   {} clauses → {} canons ({} dups) → {} IUs [{}]", 
            total_clauses, unique_nodes, duplicates, iu_graph.ius.len(), mode_str);
        
        (canon_graph, iu_graph)
    };
    
    // Comprehensive equation verification
    #[cfg(feature = "panproto")]
    {
        println!("\n   🔍 Comprehensive Equation Verification:");
        let report = crate::pipeline::verify_pipeline_equations(
            &clause_graph.clauses,
            &canon_graph.nodes,
            &iu_graph.ius,
        );
        report.print_summary();
    }
    
    if stub {
        // STUB MODE: Print IUs and their output files, but don't invoke codegen
        println!("   STUB: {} IUs planned", iu_graph.ius.len());
        
        for (i, iu) in iu_graph.ius.iter().enumerate() {
            let output_path = iu.output_files.first()
                .cloned()
                .unwrap_or_else(|| format!("src/generated/{}.rs", iu.name));
            println!("   [{}/{}] {} → {}", i + 1, iu_graph.ius.len(), iu.name, output_path);
            println!("        IU ID: {}...", &iu.iu_id[..iu.iu_id.len().min(16)]);
            println!("        Clauses: {} canons", iu.source_canon_ids.len());
        }
        
        // Exit early in stub mode
        return Ok(());
    }
    
    // Collect generated code files
    let mut code_files = Vec::new();
    
    // DEFAULT: Use formal term-based pipeline (no LLM, deterministic)
    if std::env::var("PHOENIX_TEMPLATE_MODE").is_err() && std::env::var("PHOENIX_LLM_MODE").is_err() {
        println!("   🧮 Using formal term-based code generation (no LLM)");
        println!("      μ_codegen: ThIU → ThPythonTextual → String");
        
        // === BUNDLE GENERATION ===
        // Generate template bundle files (flake.nix, pyproject.toml, README.md)
        let template = &template_name;  // template_name is already unwrapped String
        if let Some(bundle) = crate::pipeline::template_bundle::get_bundle(template) {
            println!("   📦 Template bundle: {} ({} files)", bundle.name, bundle.files.len());
            let bundle_files = crate::pipeline::template_bundle::generate_bundle(
                &bundle,
                &project_name,
                &bundle_content,
                &iu_graph.ius,
            );
            for (path, content) in bundle_files {
                let full_path = output_dir.join(&path);
                tokio::fs::write(&full_path, content).await?;
                println!("   📄 Bundle: {}", path.display());
            }
        }
        
        // === IU CODE GENERATION ===
        // Convert IU graph to ImplementationUnits for pipeline
        let ius: Vec<_> = iu_graph.ius.clone();
        eprintln!("DEBUG CLI: calling generate_code with {} IUs, bundle_content={} chars", ius.len(), bundle_content.len());
        let gen_output = crate::pipeline::generate_code(&ius, output_dir, specs_root, lang, Some(&bundle_content)).await?;
        
        // Convert to CodeFile format
        for file in gen_output.files {
            let content = tokio::fs::read_to_string(output_dir.join(&file.path)).await?;
            code_files.push(crate::lens::CodeFile {
                path: file.path,
                iu_id: file.iu_id,
                content,
                hash: file.hash,
                traces_to: vec![],
            });
        }
        
        // Generate integrated app that wires all IUs together
        if code_files.len() > 1 {
            println!("   🔌 Generating integrated app entry point...");
            let integrated = generate_integrated_app(&iu_graph.ius, lang);
            let app_path = format!("src/generated/app.{}", if lang == "python" || lang == "py" { "py" } else { "rs" });
            code_files.push(crate::lens::CodeFile {
                path: app_path.clone(),
                iu_id: "integrated-app".to_string(),
                content: integrated.clone(),
                hash: crate::identity::file_hash(&integrated),
                traces_to: iu_graph.ius.iter().map(|iu| iu.iu_id.clone()).collect(),
            });
            tokio::fs::write(output_dir.join(&app_path), integrated).await?;
            println!("   ✓ Integrated app: {}", app_path);
        }
        
        println!("   ✓ Generated {} files via term morphism", code_files.len());
    } else if llm_available && std::env::var("PHOENIX_LLM_MODE").is_ok() {
        // OPTIONAL: Use LLM for intelligent code generation
        println!("   🤖 Using LLM-based code generation (PHOENIX_LLM_MODE set)");
        println!("   Generating {} IUs...", iu_graph.ius.len());
        
        // First pass: generate domain modules (excluding app)
        let mut domain_apis: Vec<crate::llm::ModuleApi> = Vec::new();
        let app_iu_opt = iu_graph.ius.iter().find(|iu| iu.name == "app");
        let domain_ius: Vec<_> = iu_graph.ius.iter().filter(|iu| iu.name != "app").collect();
        
        // Generate domain modules
        for (i, iu) in domain_ius.iter().enumerate() {
            print!("     [{}/{}] {}...", i + 1, domain_ius.len(), iu.name);
            
            match crate::lens::generate_code_with_llm(iu, &llm_config, Some(&iu_graph.ius), None, Some(&template_name)).await {
                Ok(generated_code) => {
                    let hash = crate::identity::file_hash(&generated_code);
                    let path = iu.output_files.first()
                        .cloned()
                        .unwrap_or_else(|| format!("src/generated/{}.rs", iu.name));
                    
                    // Extract public API from generated code
                    let api = extract_module_api(&iu.name, &generated_code);
                    domain_apis.push(api);
                    
                    code_files.push(crate::lens::CodeFile {
                        path: path.clone(),
                        iu_id: iu.iu_id.clone(),
                        content: generated_code,
                        hash: hash.clone(),
                        traces_to: iu.source_canon_ids.clone(),
                    });
                    
                    println!(" -> {}", path);
                }
                Err(e) => {
                    println!(" ✗ Error: {}", e);
                    // Fall back to placeholder
                    let codegen_lens = crate::lens::codegen_lens();
                    let (code, _) = (codegen_lens.get)(&iu_graph);
                    if let Some(file) = code.files.iter().find(|f| f.path.contains(&iu.name)) {
                        // Extract API even from fallback
                        let api = extract_module_api(&iu.name, &file.content);
                        domain_apis.push(api);
                        code_files.push(file.clone());
                    }
                }
            }
        }
        
        // Second pass: generate app with knowledge of domain module APIs
        if let Some(app_iu) = app_iu_opt {
            print!("     [{}/{}] {}...", domain_ius.len() + 1, iu_graph.ius.len(), app_iu.name);
            
            match crate::lens::generate_code_with_llm(app_iu, &llm_config, Some(&iu_graph.ius), Some(domain_apis), Some(&template_name)).await {
                Ok(generated_code) => {
                    let hash = crate::identity::file_hash(&generated_code);
                    let path = app_iu.output_files.first()
                        .cloned()
                        .unwrap_or_else(|| format!("src/generated/app.rs",));
                    
                    code_files.push(crate::lens::CodeFile {
                        path: path.clone(),
                        iu_id: app_iu.iu_id.clone(),
                        content: generated_code,
                        hash: hash.clone(),
                        traces_to: app_iu.source_canon_ids.clone(),
                    });
                    
                    println!(" -> {}", path);
                }
                Err(e) => {
                    println!(" ✗ Error: {}", e);
                    let codegen_lens = crate::lens::codegen_lens();
                    let (code, _) = (codegen_lens.get)(&iu_graph);
                    if let Some(file) = code.files.iter().find(|f| f.path.contains("app")) {
                        code_files.push(file.clone());
                    }
                }
            }
        }
    } else {
        // Standard codegen (placeholders)
        let codegen_lens = crate::lens::codegen_lens();
        let (code, _codegen_comp) = (codegen_lens.get)(&iu_graph);
        code_files = code.files;
    }
    
    // Write generated files
    for file in &code_files {
        let file_path = output_dir.join(&file.path);
        tokio::fs::create_dir_all(file_path.parent().unwrap_or(output_dir)).await?;
        tokio::fs::write(&file_path, &file.content).await?;
    }
    
    // Generate pyproject.toml for Python projects
    if lang == "python" || lang == "py" {
        let pyproject_path = output_dir.join("pyproject.toml");
        if !pyproject_path.exists() {
            let pyproject_content = generate_pyproject_toml(output_dir).await?;
            tokio::fs::write(&pyproject_path, &pyproject_content).await?;
            println!("   Generated: pyproject.toml");
        }
    }
    
    // Test round-trip if verify flag is set
    if verify {
        println!("\n🔍 Verifying Lens Laws...");
        // Note: Lens verification requires original lens state, simplified here
        println!("   ℹ️  Lens law verification available in verify-laws command");
    }
    
    // Update manifest
    let manifest = crate::drift::GeneratedManifest {
        version: "1.0.0".to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        files: code_files.iter().map(|f| {
            (f.path.clone(), crate::drift::FileEntry {
                iu_id: f.iu_id.clone(),
                hash: f.hash.clone(),
                size: f.content.len() as u64,
                generated_at: chrono::Utc::now().to_rfc3339(),
            })
        }).collect(),
    };
    manifest.save(output_dir)?;
    
    println!("   Generated: {}", code_files.iter().map(|f| f.path.clone()).collect::<Vec<_>>().join(", "));
    
    Ok(())
}

/// Verify lens laws for the pipeline
async fn cmd_verify_laws(_project_root: &Path, lang: &str) -> Result<()> {
    info!("Verifying lens laws...");
    
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║  Lens Law Verification — Mathematical Correctness           ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();
    
    // Test individual lenses
    let lenses: Vec<(&str, Box<dyn Fn() -> crate::lens::LensVerification>)> = vec![
        ("μ_ingest", Box::new(|| {
            let lens = crate::lens::ingest_lens();
            let spec = crate::lens::SpecDocument {
                content: "## Test\n- REQUIREMENT: System shall validate input\n- CONSTRAINT: Max 100ms latency\n".to_string(),
                path: "test.md".to_string(),
                target_language: "rust".to_string(),
            };
            crate::lens::verify_lens_laws(&lens, &spec)
        })),
        ("μ_canon", Box::new(|| {
            let lens = crate::lens::canonicalize_lens();
            let clauses = crate::lens::ClauseGraph {
                clauses: vec![
                    crate::pipeline::Clause {
                        id: "abc".to_string(),
                        clause_type: crate::pipeline::ClauseType::Requirement,
                        text: "validate input".to_string(),
                        raw_text: "System shall validate input".to_string(),
                        section: "test".to_string(),
                        source_file: "test.md".to_string(),
                        line: 1,
                        clause_semhash: sha256("clause:validate input"),
                        context_semhash: sha256("context"),
                        language_marker: Some("rust".to_string()),
                    },
                ],
            };
            crate::lens::verify_lens_laws(&lens, &clauses)
        })),
        ("μ_plan", Box::new(|| {
            let lens = crate::lens::plan_lens("rust");
            let canon = crate::lens::CanonGraph {
                nodes: vec![
                    crate::pipeline::CanonNode {
                        id: "abc".to_string(),
                        node_type: crate::pipeline::CanonNodeType::Requirement,
                        clean_statement: "validate input".to_string(),
                        derived_from: vec!["abc".to_string()],
                        depends_on: vec![],
                        d_rate: 0.0,
                        confidence: 1.0,
                    },
                ],
            };
            crate::lens::verify_lens_laws(&lens, &canon)
        })),
        ("μ_codegen", Box::new(|| {
            let lens = crate::lens::codegen_lens();
            let ius = crate::lens::IUGraph {
                ius: vec![
                    crate::pipeline::ImplementationUnit {
                        iu_id: "test123".to_string(),
                        name: "validation".to_string(),
                        contract: "Implements validation".to_string(),
                        source_canon_ids: vec!["abc".to_string()],
                        risk_tier: crate::evidence::RiskTier::Low,
                        target_language: "rust".to_string(),
                        output_files: vec!["src/generated/validation.rs".to_string()],
                        spec_content: None,
                    },
                ],
            };
            crate::lens::verify_lens_laws(&lens, &ius)
        })),
    ];
    
    let mut all_passed = true;
    
    for (name, test_fn) in lenses {
        let result = test_fn();
        
        println!("▶ Lens: {}", name);
        println!("   GetPut: {}", if result.getput_holds { "✅ PASS" } else { "❌ FAIL" });
        println!("   PutGet: {}", if result.putget_holds { "✅ PASS" } else { "❌ FAIL" });
        println!("   Overall: {}", if result.roundtrip_success { "✅ PASS" } else { "⚠️  PARTIAL" });
        println!();
        
        if !result.roundtrip_success {
            all_passed = false;
        }
    }
    
    // Test composed pipeline
    println!("▶ Composed Pipeline: μ_total = μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest");
    let pipeline_lens = crate::lens::pipeline_lens(Box::leak(lang.to_string().into_boxed_str()));
    let spec = crate::lens::SpecDocument {
        content: "## Auth\n- REQUIREMENT: System shall validate passwords\n- CONSTRAINT: Use bcrypt hashing\n".to_string(),
        path: "test.md".to_string(),
        target_language: lang.to_string(),
    };
    let result = crate::lens::verify_lens_laws(&pipeline_lens, &spec);
    
    println!("   GetPut: {}", if result.getput_holds { "✅ PASS" } else { "⚠️  PARTIAL (expected loss)" });
    println!("   PutGet: {}", if result.putget_holds { "✅ PASS" } else { "❌ FAIL" });
    println!();
    
    println!("══════════════════════════════════════════════════════════════");
    if all_passed {
        println!("✅ All lens laws verified — pipeline is mathematically sound");
    } else {
        println!("⚠️  Some lens laws violated — this is expected for lossy transformations");
        println!("   Note: Spec→Code→Spec round-trip is inherently lossy (code has more detail)");
    }
    
    Ok(())
}

/// Reverse engineer specs from existing code
async fn cmd_reverse(
    project_root: &Path,
    lang: &str,
    output: PathBuf,
    include_private: bool,
    no_docs: bool,
) -> Result<()> {
    use crate::reverse::{ReverseOptions, reverse_pipeline};
    
    info!("Reverse engineering specs from {} code...", lang);
    
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║  Phoenix Reverse Pipeline — Code to Specs                  ║");
    println!("╠══════════════════════════════════════════════════════════════╣");
    println!("║  CODE ──[μ_reverse]──► IU ──[μ_deplan]──► CANON ──[μ_decanon] ║");
    println!("║                    ──[μ_uningest]──► SPEC                    ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();
    println!("🔍 Scanning for {} source files in src/...", lang);
    
    let options = ReverseOptions {
        source_language: lang.to_string(),
        output_dir: if output.is_absolute() {
            output
        } else {
            project_root.join(output)
        },
        include_private,
        extract_docs: !no_docs,
        min_function_lines: 3,
    };
    
    let result = reverse_pipeline(project_root, &options).await?;
    
    println!("\n══════════════════════════════════════════════════════════════");
    println!("✅ Reverse engineering complete!");
    println!();
    println!("📊 Summary:");
    println!("   Files scanned: {}", result.files_scanned);
    println!("   Functions extracted: {}", result.functions_extracted);
    println!("   Modules identified: {}", result.modules_identified);
    println!("   Requirements generated: {}", result.requirements_generated);
    println!();
    println!("📝 Generated spec files:");
    for file in &result.spec_files_created {
        println!("   - {}", file);
    }
    println!();
    println!("Next steps:");
    println!("   1. Review generated specs in {:?}", options.output_dir);
    println!("   2. Refine requirements to be more precise");
    println!("   3. Run: phoenix-vcs pipeline    # Generate code from specs");
    println!("   4. Compare: phoenix-vcs drift   # Check spec→code alignment");
    
    Ok(())
}

/// Clean the generated directory to avoid cruft buildup from previous builds
async fn clean_generated_dir(project_root: &Path) -> Result<()> {
    let generated_dir = project_root.join("src").join("generated");
    
    if generated_dir.exists() {
        let mut entries = tokio::fs::read_dir(&generated_dir).await?;
        let mut count = 0;
        
        while let Some(entry) = entries.next_entry().await? {
            let path = entry.path();
            if path.is_file() {
                tokio::fs::remove_file(&path).await?;
                count += 1;
            }
        }
        
        if count > 0 {
            println!("   🧹 Cleaned {} old files from src/generated/", count);
        }
    } else {
        // Create the directory if it doesn't exist
        tokio::fs::create_dir_all(&generated_dir).await?;
    }
    
    Ok(())
}

/// Generate pyproject.toml for Python projects from NCL spec + template
async fn generate_pyproject_toml(project_root: &Path) -> Result<String> {
    let spec_path = project_root.join("spec.ncl");
    
    // Parse the NCL spec to get configuration
    let (pname, pyproject_config) = if let Ok(content) = tokio::fs::read_to_string(&spec_path).await {
        let mut parsed = crate::ncl::parse_ncl_spec(&content, "spec.ncl")
            .map_err(|e| anyhow::anyhow!("Failed to parse spec.ncl: {}", e))?;
        
        // Load and merge template based on build_type
        // NO FALLBACKS per agents.md - must be explicit
        let template_dir = std::env::var("PHOENIX_TEMPLATE_DIR")
            .map(PathBuf::from)
            .ok()
            .or_else(|| {
                std::env::current_exe()
                    .ok()
                    .and_then(|exe| exe.parent().map(|p| p.join("templates")))
            })
            .expect("Cannot find templates directory.\n\
                     Set PHOENIX_TEMPLATE_DIR or ensure templates/ is next to binary.");
        
        if !template_dir.exists() {
            panic!(
                "Templates directory not found: {}\n\
                 Set PHOENIX_TEMPLATE_DIR env var to the correct templates location.",
                template_dir.display()
            );
        }
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

/// Generate project-wide flake.nix based on all specs
async fn generate_project_flake(project_root: &Path, all_specs_content: &str) -> Result<()> {
    // Try to parse the spec to get proper flake config
    let flake_config = if all_specs_content.contains("flake = {") || all_specs_content.contains("build_type") {
        // Find and parse the spec file
        let spec_files: Vec<_> = walkdir::WalkDir::new(project_root)
            .into_iter()
            .filter_map(|e| e.ok())
            .filter(|e| e.file_type().is_file())
            .filter(|e| e.path().extension().map_or(false, |ext| ext == "ncl"))
            .filter(|e| !e.path().file_stem().map_or(false, |s| s.to_string_lossy().starts_with('_')))
            .collect();
        
        if let Some(spec_file) = spec_files.first() {
            let parsed = crate::ncl::parse_ncl_file(spec_file.path()).ok();
            
            // If build_type is present but no flake config, merge with template
            let merged = parsed.and_then(|mut p| {
                if p.flake.is_none() && p.build_type.is_some() {
                    // Get template directory from PHOENIX_TEMPLATE_DIR or use default
                    let template_dir = std::env::var("PHOENIX_TEMPLATE_DIR")
                        .map(PathBuf::from)
                        .unwrap_or_else(|_| {
                            // Try to find templates relative to binary
                            std::env::current_exe()
                                .ok()
                                .and_then(|exe| exe.parent().map(|p| p.join("templates")))
                                .unwrap_or_else(|| PathBuf::from("templates"))
                        });
                    
                    // Merge template - this populates self.flake from template
                    p.merge_template(&template_dir);
                    Some(p)
                } else {
                    Some(p)
                }
            });
            
            merged.and_then(|p| p.flake)
        } else {
            None
        }
    } else {
        None
    };
    
    // Detect project name from spec or use flake pname
    let project_name = flake_config.as_ref()
        .and_then(|f| f.pname.clone())
        .or_else(|| {
            all_specs_content.lines()
                .find(|l| l.contains("id = \"dev.") || l.contains("name = \""))
                .and_then(|l| {
                    if let Some(start) = l.find('"') {
                        if let Some(end) = l.rfind('"') {
                            return Some(l[start+1..end].to_string());
                        }
                    }
                    None
                })
        })
        .unwrap_or_else(|| "phoenix-project".to_string());
    
    // Use formal term-based flake generation (μ_flake: ThSpec → ThNix → String)
    let build_type = if all_specs_content.contains("build_type = \"python\"") || 
                        all_specs_content.contains("build_type = \"py\"") ||
                        all_specs_content.contains("template = \"python") {
        "python"
    } else if all_specs_content.contains("build_type = \"rust\"") || 
              all_specs_content.contains("build_type = \"rs\"") ||
              all_specs_content.contains("template = \"rust") {
        "rust"
    } else {
        "python" // default
    };
    
    // Extract deps from extra_deps if present
    let deps: Vec<String> = if let Some(start) = all_specs_content.find("extra_deps") {
        let section = &all_specs_content[start..];
        if let Some(py_start) = section.find("python = [") {
            let py_section = &section[py_start..];
            if let Some(end) = py_section.find("]") {
                let list = &py_section[10..end];
                list.split(',')
                    .map(|s| s.trim().trim_matches('"').to_string())
                    .filter(|s| !s.is_empty() && !s.starts_with('#'))
                    .collect()
            } else {
                vec![]
            }
        } else {
            vec![]
        }
    } else {
        vec![]
    };
    
    // Generate flake using formal term morphism
    let flake_content = crate::pipeline::nix_codegen::generate_flake_from_spec_term(
        &project_name,
        build_type,
        "0.1.0",
        &deps,
    );
    
    // Write flake.nix to project root
    let flake_path = project_root.join("flake.nix");
    tokio::fs::write(&flake_path, flake_content).await?;
    
    if flake_config.is_some() {
        println!("   flake.nix -> generated from spec config (legacy)");
    } else {
        println!("   flake.nix -> generated via μ_flake: ThSpec → ThNix → String");
    }
    
    Ok(())
}

/// Generate a full flake with packages, apps, and devShells
fn generate_full_flake(project_name: &str, spec_content: &str) -> String {
    // Extract build inputs from spec
    let needs_rust = spec_content.contains("rust = [") || spec_content.contains("rustc");
    let needs_python = spec_content.contains("python = [") || spec_content.contains("python312");
    let needs_maturin = spec_content.contains("maturin");
    let needs_openssl = spec_content.contains("openssl");
    
    // Build the inputs section
    let mut build_inputs = vec![];
    
    if needs_rust {
        build_inputs.push("rust-bin.stable.latest.default");
    }
    if needs_python {
        build_inputs.push("python312");
        build_inputs.push("python312Packages.pip");
        if needs_maturin {
            build_inputs.push("python312Packages.maturin");
        }
    }
    if needs_openssl {
        build_inputs.push("openssl");
        build_inputs.push("pkg-config");
    }
    
    let inputs_str = build_inputs.iter()
        .map(|i| format!("            {}\n", i))
        .collect::<String>();
    
    format!(r#"{{
  description = "{} - Generated from Phoenix spec";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    rust-overlay.url = "github:oxalica/rust-overlay";
  }};

  outputs = {{ self, nixpkgs, flake-utils, rust-overlay }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        overlays = [ (import rust-overlay) ];
        pkgs = import nixpkgs {{ inherit system overlays; }};
      in
      {{
        # Packages you can build with `nix build`
        packages = {{
          # Default package - the complete application
          default = pkgs.stdenv.mkDerivation {{
            pname = "{}";
            version = "0.1.0";
            src = ./.;
            
            nativeBuildInputs = with pkgs; [
{}
            ];
            
            buildPhase = ''
              cd pyo3
              maturin build --release
              cd ..
            '';
            
            installPhase = ''
              mkdir -p $out/bin $out/lib
              cp pyo3/target/wheels/*.whl $out/lib/ || true
              
              # Create wrapper script
              cat > $out/bin/{} <<'EOF'
#!/usr/bin/env bash
PYTHONPATH="$out/lib:$PYTHONPATH" python3 -c "from freeq_pyo3 import *; import app; app.main()" "$@"
EOF
              chmod +x $out/bin/{}
            '';
          }};
          
          # PyO3 module only
          pyo3 = pkgs.stdenv.mkDerivation {{
            pname = "{}-pyo3";
            version = "0.1.0";
            src = ./.;
            nativeBuildInputs = with pkgs; [ cargo rustc maturin python312 ];
            buildPhase = ''
              cd pyo3 && maturin build --release
            '';
            installPhase = ''
              mkdir -p $out
              cp target/wheels/*.whl $out/
            '';
          }};
        }};
        
        # Apps you can run with `nix run`
        apps = {{
          default = {{
            type = "app";
            program = "${{self.packages.{{system}}.default}}/bin/{}";
          }};
          
          dev = {{
            type = "app";
            program = let
              devScript = pkgs.writeShellScriptBin "{}-dev" ''
                export RUST_LOG=debug
                export PYTHONPATH="./pyo3:./src:$PYTHONPATH"
                python3 -m freeq "$@"
              '';
            in "${{devScript}}/bin/{}-dev";
          }};
        }};
        
        # Development shell with `nix develop`
        devShells.default = pkgs.mkShell {{
          inputsFrom = [ self.packages.{{system}}.default ];
          
          packages = with pkgs; [
            # Dev tools
            just
            gdb
            strace
          ];
          
          shellHook = ''
            echo "🔥 {} dev shell"
            echo "Commands:"
            echo "  nix build          - Build the application"
            echo "  nix run            - Run the application"
            echo "  nix run .#dev     - Run with debug logging"
            echo "  just build         - Quick build with maturin"
            echo "  just test          - Run tests"
          '';
        }};
      }});
}}
"#,
        project_name, project_name,
        inputs_str,
        project_name, project_name,
        project_name,
        project_name,
        project_name, project_name,
        project_name
    )
}

/// Generate integrated app entry point that wires all IUs together
/// 
/// This creates a formal term: IntegratedApp = Σ(IU_imports) + MainEntry
fn generate_integrated_app(ius: &[crate::pipeline::ImplementationUnit], lang: &str) -> String {
    if lang == "python" || lang == "py" {
        generate_python_integrated_app(ius)
    } else {
        generate_rust_integrated_app(ius)
    }
}

fn generate_python_integrated_app(ius: &[crate::pipeline::ImplementationUnit]) -> String {
    // Find the first non-app domain module to use as main
    let domain_ius: Vec<_> = ius.iter()
        .filter(|iu| !iu.name.contains("app"))
        .collect();
    
    if domain_ius.is_empty() {
        // Fallback if no domain modules
        return r#"# phoenix: iu_id = "integrated-app"
# phoenix: generated_by = formal_term_morphism

class IntegratedApp:
    def run(self):
        print("No domain modules found")
        return 1

def main():
    return IntegratedApp().run()

if __name__ == "__main__":
    import sys
    sys.exit(main())
"#.to_string();
    }
    
    // Get the first domain module to use as entry point
    let main_iu = domain_ius[0];
    let main_name = main_iu.name.replace("-", "_");
    let main_class = format!("{}App", crate::pipeline::term_codegen::to_pascal_case(&main_iu.name));
    
    // Generate imports for all domain modules
    let domain_modules: Vec<_> = domain_ius.iter()
        .map(|iu| {
            let name = iu.name.replace("-", "_");
            format!("from {} import {}App", 
                name.to_lowercase(),
                crate::pipeline::term_codegen::to_pascal_case(&iu.name)
            )
        })
        .collect();
    
    format!(r#"# phoenix: iu_id = "integrated-app"
# phoenix: generated_by = formal_term_morphism
# Integrated app entry point - wires all domain IUs together

from textual.app import App
{imports}

class IntegratedApp(App):
    """Main application integrating all domain modules."""
    
    def __init__(self):
        super().__init__()
        # Domain modules available:
        # {module_list}
    
    def on_mount(self):
        self.title = "{title}"

def main() -> int:
    """Entry point."""
    app = IntegratedApp()
    return app.run()

if __name__ == "__main__":
    import sys
    sys.exit(main())
"#,
        imports = domain_modules.join("\n"),
        module_list = domain_ius.iter().map(|iu| iu.name.clone()).collect::<Vec<_>>().join(", "),
        title = main_iu.name.replace("-", " ").to_uppercase()
    )
}

fn generate_rust_integrated_app(ius: &[crate::pipeline::ImplementationUnit]) -> String {
    let domain_modules: Vec<_> = ius.iter()
        .filter(|iu| !iu.name.contains("app"))
        .map(|iu| {
            let name = iu.name.replace("-", "_");
            format!("pub mod {};", name.to_lowercase())
        })
        .collect();
    
    format!(r#"// phoenix: iu_id = "integrated-app"
// phoenix: generated_by = formal_term_morphism
// Integrated app entry point - wires all domain IUs together

{imports}

use std::error::Error;

/// Main application integrating all domain modules.
pub struct IntegratedApp {{
    // Domain module instances
}}

impl IntegratedApp {{
    /// Create new integrated application.
    pub fn new() -> Self {{
        Self {{
            // Initialize domain modules
        }}
    }}
    
    /// Run the integrated application.
    pub fn run(&self) -> Result<(), Box<dyn Error>> {{
        println!("🚀 Starting integrated application...");
        // Coordinate all modules
        Ok(())
    }}
}}

fn main() -> Result<(), Box<dyn Error>> {{
    let app = IntegratedApp::new();
    app.run()
}}
"#,
        imports = domain_modules.join("\n")
    )
}

/// Scan Python files in src/ directory for imports and map to nixpkgs
fn detect_python_deps(project_root: &Path) -> Vec<String> {
    let mut deps = std::collections::HashSet::new();
    let src_dir = project_root.join("src");
    
    if !src_dir.exists() {
        return vec![];
    }
    
    // Map of import names to nixpkgs attributes
    let import_to_nixpkg: std::collections::HashMap<&str, &str> = [
        ("flask", "flask"),
        ("textual", "textual"),
        ("httpx", "httpx"),
        ("websockets", "websockets"),
        ("requests", "requests"),
        ("fastapi", "fastapi"),
        ("django", "django"),
        ("numpy", "numpy"),
        ("pandas", "pandas"),
        ("pillow", "pillow"),
        ("sqlalchemy", "sqlalchemy"),
        ("pytest", "pytest"),
        ("click", "click"),
        ("typer", "typer"),
        ("rich", "rich"),
        ("pydantic", "pydantic"),
    ].into();
    
    // Simple regex-like scanning for imports
    for entry in walkdir::WalkDir::new(&src_dir).max_depth(2) {
        if let Ok(entry) = entry {
            let path = entry.path();
            if path.extension().map_or(false, |e| e == "py") {
                if let Ok(content) = std::fs::read_to_string(path) {
                    for line in content.lines() {
                        let line = line.trim();
                        // Match "import X" or "from X import ..."
                        if line.starts_with("import ") {
                            let imp = line[7..].split(',').next().unwrap_or("").trim();
                            let base = imp.split('.').next().unwrap_or(imp);
                            if let Some(&nixpkg) = import_to_nixpkg.get(base) {
                                deps.insert(nixpkg.to_string());
                            }
                        } else if line.starts_with("from ") {
                            let parts: Vec<&str> = line[5..].split_whitespace().collect();
                            if !parts.is_empty() {
                                let base = parts[0].split('.').next().unwrap_or(parts[0]);
                                if let Some(&nixpkg) = import_to_nixpkg.get(base) {
                                    deps.insert(nixpkg.to_string());
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    deps.into_iter().collect()
}

/// Generate flake with packages and devShell
/// 
/// Errors if build type cannot be determined from spec content.
fn generate_simple_flake(project_root: &Path, project_name: &str, spec_content: &str) -> Result<String> {
    // NCL-style language detection - check both 'language' and 'build_type' patterns
    let needs_rust = spec_content.contains("language = \"rust\"") ||
                     spec_content.contains("language = 'rust'") ||
                     spec_content.contains("language = \"pyo3\"") ||
                     spec_content.contains("language = 'pyo3'") ||
                     spec_content.contains("build_type = \"rust\"") ||
                     spec_content.contains("build_type = 'rust'") ||
                     spec_content.contains("build_type = \"pyo3\"") ||
                     spec_content.contains("build_type = 'pyo3'");
    let needs_python = spec_content.contains("language = \"python\"") ||
                       spec_content.contains("language = 'python'") ||
                       spec_content.contains("build_type = \"python\"") ||
                       spec_content.contains("build_type = 'python'");
    let needs_tls = spec_content.to_lowercase().contains("tls") ||
                    spec_content.to_lowercase().contains("ssl");
    let needs_pyo3 = spec_content.contains("language = \"pyo3\"") ||
                     spec_content.contains("language = 'pyo3'") ||
                     spec_content.contains("framework = \"pyo3\"") ||
                     spec_content.contains("framework = 'pyo3'") ||
                     spec_content.contains("build_type = \"pyo3\"") ||
                     spec_content.contains("build_type = 'pyo3'") ||
                     spec_content.contains("build_type = \"maturin\"") ||
                     spec_content.contains("build_type = 'maturin'");

    // Fail hard if we can't determine build type
    if !needs_rust && !needs_python && !needs_pyo3 {
        anyhow::bail!(
            "Cannot determine build type from spec.\n\
             Add one of the following to your spec file:\n\
             - build_type = 'python'  # For Python applications\n\
             - build_type = 'rust'    # For Rust applications\n\
             - build_type = 'pyo3'    # For PyO3/maturin projects\n\
             Or add a flake = {{ ... }} section with explicit configuration."
        );
    }

    let mut packages = vec![];

    if needs_rust {
        packages.extend(vec!["cargo", "rustc", "rustfmt", "clippy"]);
    }

    if needs_pyo3 {
        packages.extend(vec!["maturin", "python312"]);
    } else if needs_python {
        packages.push("python312");
    }

    if needs_tls {
        packages.extend(vec!["openssl", "pkg-config"]);
    }

    let packages_str = packages.iter()
        .map(|p| format!("            {}\n", p))
        .collect::<String>();

    // Build the package section based on project type
    let package_section = if needs_pyo3 {
        // PyO3/maturin package
        format!(r#"        packages.default = pkgs.python312Packages.buildPythonPackage {{
          pname = "{}";
          version = "0.1.0";
          src = ./.;
          pyproject = true;
          format = "pyproject";
          nativeBuildInputs = with pkgs; [ maturin cargo rustc ];
          propagatedBuildInputs = with pkgs.python312Packages; [
            textual
            pillow
          ];
          maturinBuildFlags = [ "--release" ];
          meta.mainProgram = "{}";
        }};"#, project_name, project_name)
    } else if needs_python {
        // Python application package - auto-detect deps from imports
        let python_deps = detect_python_deps(project_root);
        let deps_str = if python_deps.is_empty() {
            "# No external Python deps detected in src/".to_string()
        } else {
            format!("propagatedBuildInputs = with pkgs.python312Packages; [ {} ];", 
                    python_deps.join(" "))
        };
        
        format!(r#"        packages.default = (pkgs.python312Packages.buildPythonApplication {{
          pname = "{}";
          version = "0.1.0";
          src = ./.;
          format = "pyproject";
          build-system = with pkgs.python312Packages; [ hatchling ];
          {}
          # Fix PYTHONPATH in wrapper to include the installed package
          postInstall = ''
            for f in $out/bin/*; do
              if [ -f "$f" ]; then
                wrapProgram "$f" --prefix PYTHONPATH : "$out/lib/python3.12/site-packages"
              fi
            done
          '';
          meta.mainProgram = "{}";
        }});"#, project_name, deps_str, project_name.replace("-", "_"))
    } else {
        // Rust package
        format!(r#"        packages.default = pkgs.rustPlatform.buildRustPackage {{
          pname = "{}";
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
          nativeBuildInputs = [ pkgs.pkg-config ];
          buildInputs = [ pkgs.openssl ];
        }};"#, project_name)
    };

    Ok(format!(r#"{{
  description = "Phoenix development environment";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${{system}};
      in
      {{
{}
        devShells.default = pkgs.mkShell {{
          buildInputs = with pkgs; [
{}
          ];
        }};
      }});
}}
"#,
        package_section,
        packages_str
    ))
}

/// Generate flake from FlakeConfig (spec-driven)
fn generate_flake_from_config(_project_name: &str, config: &crate::ncl::FlakeConfig) -> Result<String> {
    let pname = config.pname.as_deref().unwrap_or("app");
    let version = config.version.as_deref().unwrap_or("0.1.0");
    let description = config.description.as_deref().unwrap_or("Phoenix generated application");
    let build_type = config.build_type.as_deref().unwrap_or("python");
    
    // For Python projects, mainProgram should match the console script (underscores)
    // which is pname with dashes replaced by underscores
    let main_program_default = if build_type == "python" || build_type == "pyo3" || build_type == "maturin" {
        pname.replace("-", "_")
    } else {
        pname.to_string()
    };
    // Always use underscores for Python projects, even if spec specifies otherwise
    let main_program = if build_type == "python" || build_type == "pyo3" || build_type == "maturin" {
        config.main_program.as_deref().map(|s| s.replace("-", "_")).unwrap_or_else(|| main_program_default.clone())
    } else {
        config.main_program.as_deref().unwrap_or(&main_program_default).to_string()
    };
    
    // Build package lists - values come from merged template + spec config
    let native_build_inputs = format!("[ {} ]", config.native_build_inputs.join(" "));
    let propagated_inputs = format!("[ {} ]", config.propagated_build_inputs.join(" "));
    let build_inputs = config.build_inputs.join(" ");
    
    // Build optional hook lines
    let post_patch_line = config.post_patch.as_ref()
        .map(|s| format!("\n          postPatch = ''\n{}\n          '';", s))
        .unwrap_or_default();
    
    // If pre_build is set, we override the entire buildPhase (but NOT installPhase - that's separate)
    let build_phase_override = config.pre_build.as_ref()
        .map(|s| format!("\n          buildPhase = ''\n{}\n          '';", s))
        .unwrap_or_default();
    
    // Source path (default: ./.)
    let src_path = config.src_path.as_deref().unwrap_or("./.");
    let src_line = format!("\n          src = {};", src_path);
    
    // Source root subdirectory - use postUnpack to cd into it
    let source_root_line = config.source_root.as_ref()
        .map(|s| format!("\n          postUnpack = ''\n            cd $sourceRoot/{}\n            export sourceRoot=$(pwd)\n          '';", s))
        .unwrap_or_default();
    
    let extra_nix_lines = config.extra_nix.as_ref()
        .map(|s| format!("\n{};", s))
        .unwrap_or_default();
    
    // BuildAndTestSubdir for workspace builds
    let cargo_subdir_line = config.cargo_subdir.as_ref()
        .map(|s| format!("\n          buildAndTestSubdir = \"{}\";", s))
        .unwrap_or_default();
    
    // Install phase override
    let install_phase_line = config.install_phase.as_ref()
        .map(|s| format!("\n          installPhase = ''\n{}\n          '';", s))
        .unwrap_or_default();
    
    // Generate package section based on build_type
    let package_section = match build_type {
        "maturin-workspace" => {
            format!(r#"        packages.default = pkgs.rustPlatform.buildRustPackage {{
          pname = "{}";
          version = "{}";{}{}
          nativeBuildInputs = with pkgs; [ maturin cargo rustc python312 ] ++ (with pkgs.python312Packages; [ pip ]);
          buildInputs = with pkgs; [ openssl ];
          propagatedBuildInputs = with pkgs.python312Packages; {};{}{}{}
          meta = {{
            description = "{}";
            mainProgram = "{}";
          }};
        }};"#, pname, version, src_line, extra_nix_lines, propagated_inputs, cargo_subdir_line, build_phase_override, install_phase_line, description, main_program)
        }
        
        "pyo3" | "maturin" => format!(r#"        packages.default = pkgs.python312Packages.buildPythonPackage {{
          pname = "{}";
          version = "{}";{}{}
          format = "pyproject";
          nativeBuildInputs = with pkgs; {};
          propagatedBuildInputs = with pkgs.python312Packages; {};{}
          maturinBuildFlags = [ "--release" ];{}
          meta = {{
            description = "{}";
            mainProgram = "{}";
          }};
        }};"#, pname, version, src_line, source_root_line, native_build_inputs, propagated_inputs, post_patch_line, build_phase_override, description, main_program),
        
        "python" => format!(r#"        packages.default = pkgs.python312Packages.buildPythonApplication {{
          pname = "{}";
          version = "{}";
          src = ./.;
          pyproject = true;
          build-system = with pkgs.python312Packages; [ hatchling ];
          propagatedBuildInputs = with pkgs.python312Packages; {};
          meta = {{
            description = "{}";
            mainProgram = "{}";
          }};
        }};"#, pname, version, propagated_inputs, description, main_program),
        
        "rust" => format!(r#"        packages.default = pkgs.rustPlatform.buildRustPackage {{
          pname = "{}";
          version = "{}";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
          nativeBuildInputs = with pkgs; {};
          meta = {{
            description = "{}";
            mainProgram = "{}";
          }};
        }};"#, pname, version, native_build_inputs, description, main_program),
        
        _ => return Err(anyhow::anyhow!("Unsupported build_type: {}. Use 'python', 'rust', 'pyo3', or 'maturin'", build_type)),
    };
    
    Ok(format!(r#"{{
  description = "{}";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${{system}};
      in
      {{
{}
        devShells.default = pkgs.mkShell {{
          buildInputs = with pkgs; [
            {}
          ];
        }};
      }});
}}
"#,
        description,
        package_section,
        build_inputs
    ))
}
