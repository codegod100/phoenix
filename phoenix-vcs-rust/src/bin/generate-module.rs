//! generate-module - Create uniform NCL module files
//!
//! Usage: generate-module --id <id> --name <name> [--output <path>]

use std::path::PathBuf;
use clap::Parser;

#[derive(Parser)]
#[command(name = "generate-module")]
#[command(about = "Generate uniform NCL module files")]
struct Args {
    /// Module ID (e.g., "hono-server", "todo-list")
    #[arg(short, long)]
    id: String,
    
    /// Module display name (e.g., "Hono HTTP Server")
    #[arg(short, long)]
    name: String,
    
    /// Module description
    #[arg(short, long, default_value = "")]
    description: String,
    
    /// Module version
    #[arg(short, long, default_value = "1.0.0")]
    version: String,
    
    /// Programming language
    #[arg(short, long, default_value = "typescript")]
    language: String,
    
    /// Is infrastructure module
    #[arg(long)]
    infrastructure: bool,
    
    /// Protocol for code generation (none, typescript, python, rust)
    #[arg(short, long, default_value = "none")]
    protocol: String,
    
    /// Output file path (default: modules/{id}.ncl)
    #[arg(short, long)]
    output: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    
    println!("🔧 Generate Module");
    println!("   ID: {}", args.id);
    println!("   Name: {}", args.name);
    
    // Determine output path
    let output_path = args.output.clone().unwrap_or_else(|| {
        PathBuf::from("modules").join(format!("{}.ncl", args.id))
    });
    
    // Generate module content
    let content = generate_module_ncl(&args);
    
    // Ensure parent directory exists
    if let Some(parent) = output_path.parent() {
        tokio::fs::create_dir_all(parent).await?;
    }
    
    // Write the file
    tokio::fs::write(&output_path, content).await?;
    println!("✅ Generated: {}", output_path.display());
    
    Ok(())
}

/// Generate NCL module content as formatted string
fn generate_module_ncl(args: &Args) -> String {
    let mut fields = vec![];
    
    fields.push(format!("id = \"{}\"", args.id));
    fields.push(format!("name = \"{}\"", args.name));
    
    if !args.description.is_empty() {
        fields.push(format!("description = \"{}\"", args.description));
    }
    
    fields.push(format!("version = \"{}\"", args.version));
    fields.push(format!("language = \"{}\"", args.language));
    fields.push(format!("is_infrastructure = {}", args.infrastructure));
    
    // generation block - inner fields need commas too
    let gen_block = format!(
        "generation = {{\n    protocol = \"{}\",\n    vertex_kinds = [],\n    vertices = [],\n    config_placeholders = {{}}\n  }}",
        args.protocol
    );
    fields.push(gen_block);
    
    // provides/needs
    fields.push("provides = []".to_string());
    fields.push("needs = []".to_string());
    
    // Build with proper Nickel syntax - commas between fields
    let body = fields.join(",\n  ");
    format!("{{\n  {}\n}}", body)
}
