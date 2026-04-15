//! Phoenix Generate - Thin CLI wrapper for code generation
//!
//! All generation logic is in the phoenix_vcs library.
//! This binary just handles CLI arguments and orchestrates the generation pipeline.

use std::path::PathBuf;
use clap::Parser;

#[derive(Parser)]
#[command(name = "phoenix-generate")]
#[command(about = "Generate code from spec.md files using Phoenix tensor network")]
struct Args {
    /// Project directory (defaults to current directory)
    #[arg(default_value = ".")]
    path: PathBuf,
    
    /// Output directory for generated files
    #[arg(short, long)]
    output: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    
    println!("🔥 Phoenix Generate");
    println!("   Target: {}", args.path.display());
    
    // Find spec.md
    let spec_path = args.path.join("spec.md");
    if !spec_path.exists() {
        eprintln!("❌ No spec.md found at {}", spec_path.display());
        std::process::exit(1);
    }
    
    println!("   Spec: {}", spec_path.display());
    
    // Read spec
    let spec_content = tokio::fs::read_to_string(&spec_path).await?;
    
    // Parse spec
    let parsed = match phoenix_vcs::kitty::module_bridge::KittyModuleParser::parse(&spec_content) {
        Ok(p) => {
            println!("✅ Parsed spec: {} modules found", p.modules.len());
            for m in &p.modules {
                let icon = if m.is_infrastructure { "🔧" } else { "📦" };
                println!("   {} {} ({})", icon, m.name, m.language);
            }
            p
        }
        Err(e) => {
            eprintln!("❌ Failed to parse spec: {}", e);
            std::process::exit(1);
        }
    };
    
    // Build tensor network
    let network = phoenix_vcs::kitty::module_bridge::KittyModuleParser::to_tensor_network(&parsed);
    println!("   Tensor network: {} modules, {} connections", 
        network.module_boxes.len(), network.cups.len());
    
    // Validate
    if !network.is_valid() {
        eprintln!("❌ Invalid tensor network");
        std::process::exit(1);
    }
    println!("✅ Tensor network valid");
    
    // Extract configs from tensor network
    let mut component_names = Vec::new();
    let mut server_config = phoenix_vcs::app_generator::ServerConfig::default();
    
    for cup in &network.cups {
        if let serde_json::Value::Object(ref config) = cup.config {
            // Extract component names
            if let Some(serde_json::Value::Object(components)) = config.get("components") {
                for name in components.keys() {
                    // Convert PascalCase to kebab-case for file lookup
                    let kebab = name.chars()
                        .map(|c| {
                            if c.is_uppercase() {
                                format!("-{}", c.to_lowercase())
                            } else {
                                c.to_string()
                            }
                        })
                        .collect::<String>()
                        .trim_start_matches('-')
                        .to_string();
                    component_names.push(kebab);
                }
            }
            // Server config
            if let Some(srv) = config.get("server") {
                if let Some(h) = srv.get("host").and_then(|h| h.as_str()) {
                    server_config.host = h.to_string();
                }
                if let Some(p) = srv.get("ports").and_then(|p| p.get("api")).and_then(|p| p.as_u64()) {
                    server_config.api_port = p as u16;
                }
                if let Some(p) = srv.get("ports").and_then(|p| p.get("vite")).and_then(|p| p.as_u64()) {
                    server_config.vite_port = p as u16;
                }
            }
        }
    }
    
    // Add utility modules that aren't in the spec components list
    component_names.push("style-utils".to_string());
    
    println!("   Server config: host={}, api_port={}, vite_port={}",
        server_config.host, server_config.api_port, server_config.vite_port);
    println!("   Components: {}", component_names.join(", "));
    
    // Generate
    let output_dir = args.output.unwrap_or_else(|| args.path.clone());
    let project_root = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    
    // Generate tensor network ASCII diagram
    let ascii = phoenix_vcs::kitty::tensor_ascii::tensor_network_to_ascii(&network);
    println!("📊 Tensor diagram:\n{}", ascii);
    
    if let Err(e) = phoenix_vcs::app_generator::generate_app(
        &project_root,
        &output_dir,
        &parsed,
        &server_config,
        &component_names,
        &ascii,
    ).await {
        eprintln!("\n❌ Generation failed: {}", e);
        std::process::exit(1);
    }
    
    println!("\n✅ Generation complete! Output: {}", output_dir.display());
    Ok(())
}
