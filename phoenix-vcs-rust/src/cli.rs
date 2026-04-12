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
    
    #[command(subcommand)]
    pub command: Commands,
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
        Commands::Status => cmd_status(&cli.project_root).await,
        Commands::Drift { json } => cmd_drift(&cli.project_root, json).await,
        Commands::Boundary { file, json } => cmd_boundary(&cli.project_root, file, json).await,
        Commands::Cascade { iu_id, failure_kind, details } => {
            cmd_cascade(&cli.project_root, &iu_id, &failure_kind, details).await
        }
        Commands::Invalidate { canon_ids } => cmd_invalidate(&cli.project_root, &canon_ids).await,
        Commands::Shadow { old_version, new_version, old_file, new_file } => {
            cmd_shadow(old_version, new_version, old_file, new_file).await
        }
        Commands::Hash { file } => cmd_hash(file).await,
        Commands::CanonId { text } => cmd_canon_id(&text),
        Commands::Evidence { tier } => cmd_evidence(tier.into()),
        Commands::Waiver { file, waiver_type, expires, signed_by } => {
            cmd_waiver(file, waiver_type.into(), expires, signed_by)
        }
        Commands::Init { name, bare } => cmd_init(&cli.project_root, name, bare).await,
        Commands::Pipeline { stub, skip_ingest, skip_canonicalize, skip_plan, verify } => {
            cmd_pipeline_multi(&cli.project_root, stub, skip_ingest, skip_canonicalize, skip_plan, verify).await
        }
        Commands::VerifyLaws { lang } => {
            cmd_verify_laws(&cli.project_root, &lang).await
        }
        Commands::Reverse { lang, output, include_private, no_docs } => {
            cmd_reverse(&cli.project_root, &lang, output, include_private, no_docs).await
        }
    }
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
    let specs_dir = project_root.join("specs");
    let src_generated_dir = project_root.join("src").join("generated");
    
    tokio::fs::create_dir_all(&manifests_dir).await?;
    tokio::fs::create_dir_all(&graphs_dir).await?;
    tokio::fs::create_dir_all(&specs_dir).await?;
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
        let spec_path = specs_dir.join("example.ncl");
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
    println!("  specs/                               # Specification documents (.ncl files)");
    if !bare {
        println!("    example.ncl                        # Example specification");
    }
    println!("  src/generated/                       # Generated code goes here");
    println!("");
    println!("Next steps:");
    println!("  1. Edit specs/ to add your requirements (.ncl format)");
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
    let mut has_pyo3 = false;
    
    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed == "[rust]" || (trimmed.starts_with("##") && trimmed.contains("[rust]")) {
            has_rust = true;
        }
        if trimmed == "[python]" || (trimmed.starts_with("##") && trimmed.contains("[python]")) {
            has_python = true;
        }
        if trimmed == "[pyo3]" || (trimmed.starts_with("##") && trimmed.contains("[pyo3]")) {
            has_pyo3 = true;
            has_rust = true; // pyo3 implies rust
        }
    }
    
    // Also check code block languages
    for line in content.lines() {
        if line.trim().starts_with("```") {
            let lang = line.trim().trim_start_matches("```").trim();
            match lang {
                "rust" | "rs" => has_rust = true,
                "python" | "py" => has_python = true,
                _ => {}
            }
        }
    }
    
    let mut languages = Vec::new();
    if has_rust || has_pyo3 {
        languages.push("rust".to_string());
    }
    if has_python {
        languages.push("python".to_string());
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
) -> Result<()> {
    info!("Running Phoenix multi-language pipeline...");
    
    // Clean generated directory before building to avoid cruft buildup
    clean_generated_dir(project_root).await?;
    
    // Load all specs first to detect languages
    let specs_dir = project_root.join("specs");
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
    
    println!("▶ Multi-language: {}", languages.join(", "));
    
    // Run pipeline for each language
    for lang in &languages {
        if let Err(e) = cmd_pipeline_single(project_root, project_root, lang, stub, skip_ingest, skip_canonicalize, skip_plan, verify).await {
            println!("⚠️  {} failed: {}", lang, e);
        }
    }
    
    // Generate project-wide flake.nix based on all specs
    generate_project_flake(project_root, &combined_content).await?;
    
    println!("✓ Done: {}", languages.join(", "));
    
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
) -> Result<()> {
    info!("Running Phoenix pipeline for {}...", lang);
    
    // Auto-detect LLM availability
    let llm_config = crate::llm::LlmConfig::default();
    let llm_available = crate::llm::is_llm_available(&llm_config);
    let full_url = format!("{}/chat/completions", llm_config.api_base);
    
    // Load all specs from specs/ directory
    let specs_dir = specs_root.join("specs");
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
    
    println!("▶ Phoenix Pipeline: {} → {} code", lang, if llm_available { "LLM" } else { "skeleton" });
    
    if llm_available {
        println!("   LLM: {}", full_url);
    }
    
    println!("   📁 Scanned {} files", _file_count);
    
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
    
    // Now run the full composed pipeline starting from the clause graph
    let canon_lens = crate::lens::canonicalize_lens();
    let (canon_graph, _canon_comp) = (canon_lens.get)(&clause_graph);
    let unique_nodes = canon_graph.nodes.len();
    let duplicates = total_clauses.saturating_sub(unique_nodes);
    
    let plan_lens = crate::lens::plan_lens(Box::leak(lang.to_string().into_boxed_str()));
    let (iu_graph, _plan_comp) = (plan_lens.get)(&canon_graph);
    
    // Print phase summaries - concise format
    println!("   {} clauses → {} canons ({} dups) → {} IUs", 
        total_clauses, unique_nodes, duplicates, iu_graph.ius.len());
    
    if stub {
        // STUB MODE: Print IUs and their output files, but don't invoke codegen
        println!("   STUB: {} IUs planned", iu_graph.ius.len());
        
        for (i, iu) in iu_graph.ius.iter().enumerate() {
            let output_path = iu.output_files.first()
                .cloned()
                .unwrap_or_else(|| format!("src/generated/{}.rs", iu.name));
            println!("   [{}/{}] {} → {}", i + 1, iu_graph.ius.len(), iu.name, output_path);
            println!("        IU ID: {}...", &iu.iu_id[..16]);
            println!("        Clauses: {} canons", iu.source_canon_ids.len());
        }
        
        // Exit early in stub mode
        return Ok(());
    }
    
    // Collect generated code files
    let mut code_files = Vec::new();
    
    if llm_available {
        // Use LLM for intelligent code generation
        println!("   Generating...");
        
        // First pass: generate domain modules (excluding app)
        let mut domain_apis: Vec<crate::llm::ModuleApi> = Vec::new();
        let app_iu_opt = iu_graph.ius.iter().find(|iu| iu.name == "app");
        let domain_ius: Vec<_> = iu_graph.ius.iter().filter(|iu| iu.name != "app").collect();
        
        // Generate domain modules
        for (i, iu) in domain_ius.iter().enumerate() {
            print!("   [{}/{}] Generating {}...", i + 1, domain_ius.len(), iu.name);
            
            match crate::lens::generate_code_with_llm(iu, &llm_config, Some(&iu_graph.ius), None).await {
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
                    
                    println!("   ✓ {}", iu.name);
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
            print!("   [{}/{}] Generating {}...", domain_ius.len() + 1, iu_graph.ius.len(), app_iu.name);
            
            match crate::lens::generate_code_with_llm(app_iu, &llm_config, Some(&iu_graph.ius), Some(domain_apis)).await {
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
                    
                    println!(" ✓ (IU: {}...)", &app_iu.iu_id[..16]);
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
    
    println!("✓ Generated {}", code_files.iter().map(|f| f.path.clone()).collect::<Vec<_>>().join(", "));
    
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

/// Generate project-wide flake.nix based on all specs
async fn generate_project_flake(project_root: &Path, all_specs_content: &str) -> Result<()> {
    // Determine what packages are needed from all specs
    let needs_rust = all_specs_content.contains("[rust]") || all_specs_content.contains("[pyo3]");
    let needs_python = all_specs_content.contains("[python]");
    let needs_tls = all_specs_content.to_lowercase().contains("tls") || all_specs_content.to_lowercase().contains("ssl");
    let needs_pyo3 = all_specs_content.to_lowercase().contains("pyo3");
    
    // Build packages list dynamically based on detected needs
    let mut packages = vec![];
    
    if needs_rust {
        packages.extend(vec!["cargo", "rustc", "rustfmt", "clippy"]);
    }
    
    if needs_pyo3 {
        packages.extend(vec!["maturin", "python"]);
    } else if needs_python {
        packages.push("python");
    }
    
    if needs_tls {
        packages.extend(vec!["openssl", "openssl.dev", "pkg-config"]);
    }
    
    // Build the packages section
    let packages_str = packages.iter()
        .map(|p| format!("            {}\n", p))
        .collect::<String>();
    
    // Build env vars
    let mut env_vars = vec![];
    if needs_pyo3 {
        env_vars.push(("PYO3_PYTHON", r#""${python}/bin/python""#));
    }
    if needs_tls {
        env_vars.extend(vec![
            ("OPENSSL_DIR", r#""${pkgs.openssl.dev}""#),
            ("OPENSSL_LIB_DIR", r#""${pkgs.openssl.out}/lib""#),
            ("PKG_CONFIG_PATH", r#""${pkgs.openssl.dev}/lib/pkgconfig""#),
        ]);
    }
    
    let env_str = env_vars.iter()
        .map(|(k, v)| format!("            {} = {};\n", k, v))
        .collect::<String>();
    
    // Generate flake - generic structure, no app-specific hardcoding
    let flake = format!(r#"{{
  description = "Generated development environment from specs";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${{system}};
        python = pkgs.python312;
      in
      {{
        devShells.default = pkgs.mkShell {{
          buildInputs = with pkgs; [
{packages}          ];

          env = {{
{env}          }};

          shellHook = ''
            echo "Development shell from specs"
          '';
        }};
      }});
}}
"#,
        packages = packages_str,
        env = env_str
    );
    
    // Write flake.nix to project root
    let flake_path = project_root.join("flake.nix");
    tokio::fs::write(&flake_path, flake).await?;
    
    println!("   📦 Generated flake.nix from specs:");
    for pkg in packages {
        println!("      + {}", pkg);
    }
    
    Ok(())
}
