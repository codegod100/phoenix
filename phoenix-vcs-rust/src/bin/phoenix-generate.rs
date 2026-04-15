//! Phoenix Generate - Generate code from spec.md files
//!
//! This is the main code generation tool that reads spec.md files
//! and generates runnable applications using the Phoenix tensor network.
//!
//! Usage:
//!   phoenix-generate [OPTIONS] [PATH]
//!
//! Examples:
//!   phoenix-generate                    # Run in current directory
//!   phoenix-generate ./apps/elena       # Generate specific app
//!   phoenix-generate --stub             # Generate stub files only

use std::path::PathBuf;
use clap::Parser;

#[derive(Parser)]
#[command(name = "phoenix-generate")]
#[command(about = "Generate code from spec.md files using Phoenix tensor network")]
struct Args {
    /// Project directory (defaults to current directory)
    #[arg(default_value = ".")]
    path: PathBuf,
    
    /// Generate stub files only (don't call LLM)
    #[arg(long)]
    stub: bool,
    
    /// Skip LLM-based spec transformation
    #[arg(long)]
    skip_llm: bool,
    
    /// Skip theory-based code generation
    #[arg(long)]
    skip_theory: bool,
    
    /// Use legacy template-based generation
    #[arg(long)]
    legacy: bool,
    
    /// Verify generated code against laws
    #[arg(long)]
    verify: bool,
    
    /// Output directory for generated files
    #[arg(short, long)]
    output: Option<PathBuf>,
}

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    let args = Args::parse();
    
    println!("🔥 Phoenix Generate");
    println!("   Target: {}", args.path.display());
    
    // Find spec.md in the target directory
    let spec_path = args.path.join("spec.md");
    if !spec_path.exists() {
        eprintln!("❌ No spec.md found at {}", spec_path.display());
        std::process::exit(1);
    }
    
    println!("   Spec: {}", spec_path.display());
    
    // Read and parse spec
    let spec_content = tokio::fs::read_to_string(&spec_path).await?;
    
    // Parse through Kitty module bridge
    let parsed = match phoenix_vcs::kitty::module_bridge::KittyModuleParser::parse(&spec_content) {
        Ok(p) => {
            println!("✅ Parsed spec: {} modules found", p.modules.len());
            for module in &p.modules {
                let icon = if module.is_infrastructure { "🔧" } else { "📦" };
                println!("   {} {} ({})", icon, module.name, module.language);
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
    
    // Validate network
    if !network.is_valid() {
        eprintln!("❌ Invalid tensor network - unfulfilled needs detected");
        let desc = phoenix_vcs::kitty::module_bridge::KittyModuleParser::describe_composition(&network);
        eprintln!("{}", desc);
        std::process::exit(1);
    }
    println!("✅ Tensor network valid");
    
    // Generate output files
    let output_dir = args.output.unwrap_or_else(|| args.path.clone());
    
    // Generate devenv files
    let devenv = phoenix_vcs::codegen::devenv::generate_devenv_output(&network)
        .map_err(|e| anyhow::anyhow!(e))?;
    tokio::fs::write(output_dir.join("flake.nix"), devenv.flake_nix).await?;
    tokio::fs::write(output_dir.join("devenv.nix"), devenv.devenv_nix).await?;
    tokio::fs::write(output_dir.join("devenv.yaml"), devenv.devenv_yaml).await?;
    tokio::fs::write(output_dir.join(".envrc"), devenv.envrc).await?;
    println!("✅ Generated: flake.nix, devenv.nix, devenv.yaml, .envrc");
    
    // Generate app code based on detected template
    let template = detect_template(&parsed);
    match template.as_str() {
        "elena" => {
            generate_elena_app(&network, &output_dir).await?;
        }
        _ => {
            println!("⚠️  Unknown template: {}. Only generating devenv files.", template);
        }
    }
    
    Ok(())
}

async fn generate_elena_app(_network: &phoenix_vcs::kitty::module_tensor_network::ModuleTensorNetwork, output_dir: &std::path::Path) -> anyhow::Result<()> {
    use phoenix_vcs::codegen::emit_bundle::{create_protocol};
    
    // Create TypeScript protocol
    let protocol = create_protocol(
        "typescript",
        vec![
            "ImportDecl".to_string(),
            "VarDecl".to_string(),
            "RouteHandler".to_string(),
            "ExprStmt".to_string(),
            "ClassDecl".to_string(),
            "ExportDefault".to_string(),
        ],
        vec![], // edge rules
    );
    
    // Generate server.ts using emit_with_protocol
    let server_code = generate_server_ts_with_emit(&protocol, "server")?;
    let server_path = output_dir.join("src/server.ts");
    tokio::fs::create_dir_all(server_path.parent().unwrap()).await?;
    tokio::fs::write(&server_path, server_code).await?;
    println!("✅ Generated: src/server.ts (via emit_with_protocol)");
    
    // Generate main.ts using emit_with_protocol  
    let client_code = generate_client_ts_with_emit(&protocol, "client")?;
    tokio::fs::write(output_dir.join("src/main.ts"), client_code).await?;
    println!("✅ Generated: src/main.ts (via emit_with_protocol)");
    
    // Generate package.json (JSON doesn't need emit)
    let package_json = generate_package_json(output_dir);
    tokio::fs::write(output_dir.join("package.json"), package_json).await?;
    println!("✅ Generated: package.json");
    
    // Generate vite.config.ts using emit
    let vite_code = generate_vite_ts_with_emit(&protocol, "vite")?;
    tokio::fs::write(output_dir.join("vite.config.ts"), vite_code).await?;
    println!("✅ Generated: vite.config.ts (via emit_with_protocol)");
    
    // Generate tsconfig.json
    let tsconfig = generate_tsconfig_json();
    tokio::fs::write(output_dir.join("tsconfig.json"), tsconfig).await?;
    println!("✅ Generated: tsconfig.json");
    
    // Generate index.html
    let index_html = generate_index_html(output_dir);
    tokio::fs::write(output_dir.join("index.html"), index_html).await?;
    println!("✅ Generated: index.html");
    
    Ok(())
}

fn generate_server_ts_with_emit(protocol: &panproto_schema::Protocol, _name: &str) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::EmitBuilder;
    
    let mut b = EmitBuilder::new(protocol, "server");
    
    b = b.vertex("import_hono", "ImportDecl", Some("import { Hono } from 'hono';\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("import_serve", "ImportDecl", Some("import { serve } from '@hono/node-server';\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("app_const", "VarDecl", Some("const app = new Hono();\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("health_route", "RouteHandler", Some(
        "app.get('/api/health', (c) => {\n  return c.json({ status: 'ok', timestamp: new Date().toISOString() });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("users_route", "RouteHandler", Some(
        "app.get('/api/users', (c) => {\n  return c.json({ users: [{ id: 1, name: 'Alice' }] });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("todos_get", "RouteHandler", Some(
        "app.get('/api/todos', (c) => {\n  return c.json({ todos: [{ id: 1, text: 'Learn ElenaJS', completed: false }] });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("todos_post", "RouteHandler", Some(
        "app.post('/api/todos', async (c) => {\n  const body = await c.req.json();\n  return c.json({ id: Date.now(), text: body.text, completed: false });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("port_const", "VarDecl", Some("const port = 3000;\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("log_stmt", "ExprStmt", Some("console.log(`Server running at http://localhost:${port}`);\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("serve_call", "ExprStmt", Some("serve({ fetch: app.fetch, port });\n")).map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    phoenix_vcs::codegen::emit_bundle::emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

fn generate_client_ts_with_emit(protocol: &panproto_schema::Protocol, _name: &str) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::EmitBuilder;
    
    let mut b = EmitBuilder::new(protocol, "client");
    
    b = b.vertex("import_elena", "ImportDecl", Some("import { Elena, Component } from 'elenajs';\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("welcome_card_class", "ClassDecl", Some(
        "class WelcomeCard extends Component {\n  render() {\n    return `\n      <div style=\"background: linear-gradient(135deg, #667eea, #764ba2); padding: 2rem; border-radius: 1rem; color: white; text-align: center;\">\n        <h1>${this.props.title || 'Welcome'}</h1>\n        <p>${this.props.message || 'Generated by Phoenix'}</p>\n      </div>\n    `;\n  }\n}\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("todolist_class", "ClassDecl", Some(
        "class TodoList extends Component {\n  constructor(props) {\n    super(props);\n    this.state = { todos: [], newTodo: '' };\n  }\n  \n  async connectedCallback() {\n    const res = await fetch('/api/todos');\n    const data = await res.json();\n    this.setState({ todos: data.todos });\n  }\n  \n  render() {\n    return `\n      <div style=\"padding: 1rem;\">\n        <h2>Todo List</h2>\n        <ul>\n          ${this.state.todos.map(t => `<li>${t.text}</li>`).join('')}\n        </ul>\n      </div>\n    `;\n  }\n}\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("elena_app_class", "ClassDecl", Some(
        "class ElenaApp extends Component {\n  render() {\n    return `\n      <div style=\"max-width: 800px; margin: 0 auto; padding: 1rem;\">\n        <welcome-card title=\"Elena Dashboard\" message=\"Phoenix Generated\"></welcome-card>\n        <todo-list></todo-list>\n      </div>\n    `;\n  }\n}\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("define_welcome", "ExprStmt", Some("customElements.define('welcome-card', WelcomeCard);\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("define_todo", "ExprStmt", Some("customElements.define('todo-list', TodoList);\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("define_app", "ExprStmt", Some("customElements.define('elena-app', ElenaApp);\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("mount", "ExprStmt", Some("document.body.innerHTML = '<elena-app></elena-app>';\n")).map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    phoenix_vcs::codegen::emit_bundle::emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

fn generate_vite_ts_with_emit(protocol: &panproto_schema::Protocol, _name: &str) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::EmitBuilder;
    
    let mut b = EmitBuilder::new(protocol, "vite");
    
    b = b.vertex("import_define", "ImportDecl", Some("import { defineConfig } from 'vite';\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("export_default", "ExportDefault", Some(
        "export default defineConfig({\n  server: {\n    port: 5173,\n    proxy: {\n      '/api': 'http://localhost:3000'\n    }\n  },\n  build: {\n    outDir: 'dist'\n  }\n});\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    phoenix_vcs::codegen::emit_bundle::emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

fn generate_package_json(output_dir: &std::path::Path) -> String {
    let name = output_dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("elena-app");
    
    format!(r#"{{
  "name": "{}",
  "version": "0.1.0",
  "description": "ElenaJS + Hono app generated by Phoenix VCS",
  "type": "module",
  "scripts": {{
    "dev": "concurrently 'bun run dev:server' 'bun run dev:client'",
    "dev:server": "bun run src/server.ts",
    "dev:client": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  }},
  "dependencies": {{
    "elenajs": "^1.0.0",
    "hono": "^3.12.0",
    "@hono/node-server": "^1.8.0"
  }},
  "devDependencies": {{
    "@types/bun": "latest",
    "concurrently": "^8.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }}
}}"#, name)
}

fn generate_tsconfig_json() -> String {
    r#"{{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}}"#.to_string()
}

fn generate_index_html(output_dir: &std::path::Path) -> String {
    let title = output_dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("Elena App");
    
    format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{}</title>
</head>
<body>
  <script type="module" src="/src/main.ts"></script>
</body>
</html>"#, title)
}

fn detect_template(parsed: &phoenix_vcs::kitty::module_bridge::ParsedModuleSpec) -> String {
    for module in &parsed.modules {
        if module.id.contains("elena") || module.name.contains("Elena") {
            return "elena".to_string();
        }
    }
    
    for module in &parsed.modules {
        if module.id.contains("hono") || module.language == "typescript" {
            return "elena".to_string();
        }
    }
    
    "default".to_string()
}
