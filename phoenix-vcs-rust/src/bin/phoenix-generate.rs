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
    tokio::fs::write(output_dir.join("devenv.nix"), devenv.devenv_nix).await?;
    tokio::fs::write(output_dir.join("devenv.yaml"), devenv.devenv_yaml).await?;
    tokio::fs::write(output_dir.join(".envrc"), devenv.envrc).await?;
    println!("✅ Generated: devenv.nix, devenv.yaml, .envrc");
    
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

async fn generate_elena_app(network: &phoenix_vcs::kitty::module_tensor_network::ModuleTensorNetwork, output_dir: &std::path::Path) -> anyhow::Result<()> {
    use phoenix_vcs::codegen::emit_bundle::{create_protocol};
    
    // Extract component configs from tensor network cups
    // Cups with WebComponents interface carry component configuration
    let mut component_configs: std::collections::HashMap<String, serde_json::Value> = std::collections::HashMap::new();
    let mut server_config: serde_json::Value = serde_json::json!({
        "host": "127.0.0.1",
        "ports": {
            "api": 3000,
            "vite": 5173
        }
    });
    
    for cup in &network.cups {
        if let serde_json::Value::Object(ref config) = cup.config {
            // Get the "components" field which contains all component configs
            if let Some(serde_json::Value::Object(components)) = config.get("components") {
                for (component_name, component_config) in components {
                    component_configs.insert(component_name.clone(), component_config.clone());
                }
            }
            // Get the server config
            if let Some(srv) = config.get("server") {
                server_config = srv.clone();
            }
        }
    }
    
    // Extract server config from HTTP-related cups too
    for cup in &network.cups {
        if let serde_json::Value::Object(ref config) = cup.config {
            if let Some(srv) = config.get("server") {
                server_config = srv.clone();
            }
        }
    }
    
    // Debug: print configs
    if !component_configs.is_empty() {
        println!("   Component configs from tensor edges:");
        for (name, config) in &component_configs {
            println!("     {}: {}", name, serde_json::to_string_pretty(config).unwrap_or_default().lines().next().unwrap_or("{}"));
        }
    }
    let host = server_config.get("host").and_then(|h| h.as_str()).unwrap_or("127.0.0.1");
    let api_port = server_config.get("ports").and_then(|p| p.get("api")).and_then(|p| p.as_u64()).unwrap_or(3000) as u16;
    let vite_port = server_config.get("ports").and_then(|p| p.get("vite")).and_then(|p| p.as_u64()).unwrap_or(5173) as u16;
    println!("   Server config from tensor edges: host={}, api_port={}, vite_port={}", host, api_port, vite_port);
    
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
    
    // Generate server.ts using emit_with_protocol with server config
    let server_code = generate_server_ts_with_emit(&protocol, "server", host, api_port)?;
    let server_path = output_dir.join("src/server.ts");
    tokio::fs::create_dir_all(server_path.parent().unwrap()).await?;
    tokio::fs::write(&server_path, server_code).await?;
    println!("✅ Generated: src/server.ts (via emit_with_protocol)");
    
    // Generate main.ts using emit_with_protocol with configs
    let client_code = generate_client_ts_with_emit(&protocol, "client", &component_configs)?;
    tokio::fs::write(output_dir.join("src/main.ts"), client_code).await?;
    println!("✅ Generated: src/main.ts (via emit_with_protocol)");
    
    // Generate package.json (JSON doesn't need emit)
    let package_json = generate_package_json(output_dir);
    tokio::fs::write(output_dir.join("package.json"), package_json).await?;
    println!("✅ Generated: package.json");
    
    // Generate vite.config.ts using emit with server config
    let vite_code = generate_vite_ts_with_emit(&protocol, "vite", host, api_port, vite_port)?;
    tokio::fs::write(output_dir.join("vite.config.ts"), vite_code).await?;
    println!("✅ Generated: vite.config.ts (via emit_with_protocol)");
    
    // Generate tsconfig.json using emit_with_protocol
    let tsconfig = generate_tsconfig_with_emit(&protocol)?;
    tokio::fs::write(output_dir.join("tsconfig.json"), tsconfig).await?;
    println!("✅ Generated: tsconfig.json (via emit_with_protocol)");
    
    // Generate spec.ncl (Nickel config from parsed spec)
    let spec_ncl = generate_spec_ncl(
        output_dir,
        host,
        api_port,
        vite_port,
        &component_configs
    )?;
    tokio::fs::write(output_dir.join("spec.ncl"), spec_ncl).await?;
    println!("✅ Generated: spec.ncl");
    
    // Generate index.html
    let index_html = generate_index_html(output_dir);
    tokio::fs::write(output_dir.join("index.html"), index_html).await?;
    println!("✅ Generated: index.html");
    
    Ok(())
}

fn generate_server_ts_with_emit(
    protocol: &panproto_schema::Protocol, 
    _name: &str,
    host: &str,
    port: u16
) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::EmitBuilder;
    
    let mut b = EmitBuilder::new(protocol, "server");
    
    b = b.vertex("import_hono", "ImportDecl", Some("import { Hono } from 'hono';\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("import_serve", "ImportDecl", Some("import { serve } from '@hono/node-server';\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("app_const", "VarDecl", Some("const app = new Hono();\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    
    // In-memory todos storage
    b = b.vertex("todos_storage", "VarDecl", Some(
        "const todos = [{ id: 1, text: 'Learn ElenaJS', completed: false }];\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    b = b.vertex("health_route", "RouteHandler", Some(
        "app.get('/api/health', (c) => {\n  return c.json({ status: 'ok', timestamp: new Date().toISOString() });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("users_route", "RouteHandler", Some(
        "app.get('/api/users', (c) => {\n  return c.json({ users: [{ id: 1, name: 'Alice' }] });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // GET /api/todos
    b = b.vertex("todos_get", "RouteHandler", Some(
        "app.get('/api/todos', (c) => {\n  return c.json({ todos });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // POST /api/todos
    b = b.vertex("todos_post", "RouteHandler", Some(
        "app.post('/api/todos', async (c) => {\n  const body = await c.req.json();\n  const todo = { id: Date.now(), text: body.text, completed: false };\n  todos.push(todo);\n  return c.json(todo);\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // PATCH /api/todos/:id - Toggle completion
    b = b.vertex("todos_patch", "RouteHandler", Some(
        "app.patch('/api/todos/:id', async (c) => {\n  const id = parseInt(c.req.param('id'));\n  const body = await c.req.json();\n  const todo = todos.find(t => t.id === id);\n  if (!todo) return c.json({ error: 'Not found' }, 404);\n  if (body.completed !== undefined) todo.completed = body.completed;\n  return c.json(todo);\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // DELETE /api/todos/:id
    b = b.vertex("todos_delete", "RouteHandler", Some(
        "app.delete('/api/todos/:id', (c) => {\n  const id = parseInt(c.req.param('id'));\n  const index = todos.findIndex(t => t.id === id);\n  if (index === -1) return c.json({ error: 'Not found' }, 404);\n  todos.splice(index, 1);\n  return c.json({ success: true });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // Use host and port from spec
    let hostname_code = format!("const hostname = '{}';\n", host);
    let port_code = format!("const port = {};\n", port);
    
    b = b.vertex("hostname_const", "VarDecl", Some(&hostname_code)).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("port_const", "VarDecl", Some(&port_code)).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("log_stmt", "ExprStmt", Some("console.log(`Server running at http://${hostname}:${port}`);\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("serve_call", "ExprStmt", Some("serve({ fetch: app.fetch, port, hostname });\n")).map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    phoenix_vcs::codegen::emit_bundle::emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

fn generate_client_ts_with_emit(
    protocol: &panproto_schema::Protocol, 
    _name: &str,
    configs: &std::collections::HashMap<String, serde_json::Value>
) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::EmitBuilder;
    
    let mut b = EmitBuilder::new(protocol, "client");
    
    b = b.vertex("import_elena", "ImportDecl", Some("import { Elena, html } from '@elenajs/core';\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    
    // Generate WelcomeCard component (always included as default)
    let welcome_card_code = if let Some(config) = configs.get("WelcomeCard") {
        let props = config.get("props").and_then(|p| p.as_array())
            .map(|arr| arr.iter().map(|v| format!("'{}'", v.as_str().unwrap_or(""))).collect::<Vec<_>>().join(", "))
            .unwrap_or_else(|| "'title', 'message'".to_string());
        generate_welcome_card_with_props(&props)
    } else {
        // Default WelcomeCard
        "class WelcomeCard extends Elena(HTMLElement) {\n  static tagName = 'welcome-card';\n  static props = ['title', 'message'];\n  \n  title = 'Welcome';\n  message = 'Generated by Phoenix';\n  \n  render() {\n    return html`\n      <div style=\"background: linear-gradient(135deg, #667eea, #764ba2); padding: 2rem; border-radius: 1rem; color: white; text-align: center;\">\n        <h1>${this.title}</h1>\n        <p>${this.message}</p>\n      </div>\n    `;\n  }\n}\n\n".to_string()
    };
    b = b.vertex("welcome_card_class", "ClassDecl", Some(&welcome_card_code)).map_err(|e| anyhow::anyhow!(e))?;
    
    // Generate TodoList component if config exists
    if configs.contains_key("TodoList") {
        let todo_list_code = generate_todo_list_component(configs.get("TodoList"));
        b = b.vertex("todolist_class", "ClassDecl", Some(&todo_list_code)).map_err(|e| anyhow::anyhow!(e))?;
    }
    
    // Generate ElenaApp main container
    let elena_app_code = generate_elena_app_container(configs);
    b = b.vertex("elena_app_class", "ClassDecl", Some(&elena_app_code)).map_err(|e| anyhow::anyhow!(e))?;
    
    // Register components
    let mut define_code = "// Register all components\nWelcomeCard.define();\n".to_string();
    if configs.contains_key("TodoList") {
        define_code.push_str("TodoList.define();\n");
    }
    define_code.push_str("ElenaApp.define();\n\n");
    b = b.vertex("define_all", "ExprStmt", Some(&define_code)).map_err(|e| anyhow::anyhow!(e))?;
    
    b = b.vertex("mount", "ExprStmt", Some("// Mount the app\nconst app = document.createElement('elena-app');\ndocument.body.appendChild(app);\n")).map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    phoenix_vcs::codegen::emit_bundle::emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

/// Generate WelcomeCard with custom props
fn generate_welcome_card_with_props(props: &str) -> String {
    format!("class WelcomeCard extends Elena(HTMLElement) {{\n  static tagName = 'welcome-card';\n  static props = [{}];\n  \n  title = 'Welcome';\n  message = 'Generated by Phoenix';\n  \n  render() {{\n    return html`\n      <div style=\"background: linear-gradient(135deg, #667eea, #764ba2); padding: 2rem; border-radius: 1rem; color: white; text-align: center;\">\n        <h1>${{this.title}}</h1>\n        <p>${{this.message}}</p>\n      </div>\n    `;\n  }}\n}}\n\n", props)
}

/// Generate interactive TodoList component with full CRUD
fn generate_todo_list_component(_config: Option<&serde_json::Value>) -> String {
    r#"class TodoList extends Elena(HTMLElement) {
  static tagName = 'todo-list';
  static props = ['newTodo'];
  
  todos = [];
  newTodo = '';
  
  async firstUpdated() {
    await this.loadTodos();
  }
  
  async loadTodos() {
    const res = await fetch('/api/todos');
    const data = await res.json();
    this.todos = data.todos || [];
    this.requestUpdate();
  }
  
  onInput(e) {
    this.newTodo = e.target.value;
  }
  
  async addTodo(e) {
    e.preventDefault();
    if (!this.newTodo.trim()) return;
    
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: this.newTodo })
    });
    
    if (res.ok) {
      this.newTodo = '';
      await this.loadTodos();
    }
  }
  
  async toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed })
    });
    
    if (res.ok) {
      await this.loadTodos();
    }
  }
  
  async deleteTodo(id) {
    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await this.loadTodos();
    }
  }
  
  render() {
    return html`
      <div style="padding: 1rem; font-family: system-ui, sans-serif;">
        <h2 style="margin-top: 0;">Todo List</h2>
        
        <form @submit=${this.addTodo.bind(this)} style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input 
            type="text" 
            .value=${this.newTodo}
            @input=${this.onInput.bind(this)}
            placeholder="What needs to be done?"
            style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem;"
          />
          <button 
            type="submit"
            style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.25rem; cursor: pointer;"
          >
            Add
          </button>
        </form>
        
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${this.todos.map(todo => html`
            <li style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border-bottom: 1px solid #eee;">
              <input 
                type="checkbox" 
                .checked=${todo.completed}
                @change=${() => this.toggleTodo(todo.id)}
                style="cursor: pointer;"
              />
              <span style="flex: 1; ${todo.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                ${todo.text}
              </span>
              <button 
                @click=${() => this.deleteTodo(todo.id)}
                style="padding: 0.25rem 0.5rem; background: #ff4757; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
              >
                Delete
              </button>
            </li>
          `)}
        </ul>
        
        ${this.todos.length === 0 ? html`<p style="color: #999; text-align: center; padding: 2rem;">No todos yet. Add one above!</p>` : ''}
      </div>
    `;
  }
}

"#.to_string()
}

/// Generate ElenaApp container with configured components
fn generate_elena_app_container(configs: &std::collections::HashMap<String, serde_json::Value>) -> String {
    let has_todos = configs.contains_key("TodoList");
    
    let body = if has_todos {
        "<welcome-card title=\"Elena Dashboard\" message=\"Phoenix Generated\"></welcome-card>\n        <todo-list></todo-list>"
    } else {
        "<welcome-card title=\"Elena Dashboard\" message=\"Phoenix Generated\"></welcome-card>"
    };
    
    format!("class ElenaApp extends Elena(HTMLElement) {{\n  static tagName = 'elena-app';\n  \n  render() {{\n    return html`\n      <div style=\"max-width: 800px; margin: 0 auto; padding: 1rem;\">\n        {}\n      </div>\n    `;\n  }}\n}}\n\n", body)
}

fn generate_vite_ts_with_emit(
    protocol: &panproto_schema::Protocol, 
    _name: &str,
    host: &str,
    api_port: u16,
    vite_port: u16
) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::EmitBuilder;
    
    let mut b = EmitBuilder::new(protocol, "vite");
    
    // Build vite config using host and ports from spec
    let vite_config = format!(
        "export default defineConfig({{\n  server: {{\n    host: '{}',\n    port: {},\n    proxy: {{\n      '/api': 'http://{}:{}'\n    }}\n  }},\n  build: {{\n    outDir: 'dist'\n  }}\n}});\n",
        host, vite_port, host, api_port
    );
    
    b = b.vertex("import_define", "ImportDecl", Some("import { defineConfig } from 'vite';\n\n")).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("export_default", "ExportDefault", Some(&vite_config)).map_err(|e| anyhow::anyhow!(e))?;
    
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
    "@elenajs/core": "latest",
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

fn generate_tsconfig_with_emit(_protocol: &panproto_schema::Protocol) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::{EmitBuilder, create_protocol, emit_schema};
    
    // Create JSON protocol for tsconfig.json generation
    let json_protocol = create_protocol(
        "json",
        vec![
            "Object".to_string(),
            "Pair".to_string(),
            "String".to_string(),
            "Array".to_string(),
            "Number".to_string(),
            "True".to_string(),
            "False".to_string(),
        ],
        vec![],
    );
    
    let mut b = EmitBuilder::new(&json_protocol, "tsconfig");
    
    // Build tsconfig.json as a JSON object using emit_with_protocol
    let header = r#"{
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
}"#;
    
    b = b.vertex("root", "Object", Some(header))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "json")
        .map_err(|e| anyhow::anyhow!(e))
}

/// Generate spec.ncl (Nickel configuration from parsed spec) using emit_with_protocol
fn generate_spec_ncl(
    output_dir: &std::path::Path,
    host: &str,
    api_port: u16,
    vite_port: u16,
    component_configs: &std::collections::HashMap<String, serde_json::Value>
) -> anyhow::Result<String> {
    use phoenix_vcs::codegen::emit_bundle::{create_protocol, EmitBuilder, emit_schema};
    
    let name = output_dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("elena-app");
    let id = format!("dev.phoenix.{}", name.replace("-", "_"));
    
    // Create Nickel protocol
    let nickel_kinds = vec![
        "comment".to_string(),
        "record".to_string(),
        "field".to_string(),
        "array".to_string(),
        "string".to_string(),
        "number".to_string(),
    ];
    let protocol = create_protocol("nickel", nickel_kinds, vec![]);
    
    let mut b = EmitBuilder::new(&protocol, "spec");
    
    // Header comment
    b = b.vertex("header", "comment", Some("# Phoenix Generated Specification\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // ID field
    b = b.vertex("id_field", "field", Some(&format!("id = '{}'\n", id)))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Name field
    b = b.vertex("name_field", "field", Some(&format!("name = '{}'\n", name)))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Server config record
    let server_record = format!(
        "server = {{\n  host = '{}'\n  api_port = {}\n  vite_port = {}\n}}\n",
        host, api_port, vite_port
    );
    b = b.vertex("server_record", "field", Some(&server_record))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Build type field
    b = b.vertex("build_type", "field", Some("build.type = 'typescript'\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("build_runtime", "field", Some("build.runtime = 'bun'\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("build_bundler", "field", Some("build.bundler = 'vite'\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Components array
    if !component_configs.is_empty() {
        let mut components_items = String::new();
        for (idx, (comp_name, config)) in component_configs.iter().enumerate() {
            if idx > 0 {
                components_items.push_str(",\n");
            }
            
            let props = config.get("props")
                .and_then(|p| p.as_array())
                .map(|arr| {
                    arr.iter()
                        .map(|v| format!("'{}'", v.as_str().unwrap_or("")))
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or_default();
            
            let features = config.get("features")
                .and_then(|f| f.as_array())
                .map(|arr| {
                    arr.iter()
                        .map(|v| format!("'{}'", v.as_str().unwrap_or("")))
                        .collect::<Vec<_>>()
                        .join(", ")
                })
                .unwrap_or_default();
            
            components_items.push_str(&format!(
                "  {{ name = '{}', props = [{}], features = [{}] }}",
                comp_name, props, features
            ));
        }
        
        let components_field = format!("components = [\n{}\n]\n", components_items);
        b = b.vertex("components_field", "field", Some(&components_field))
            .map_err(|e| anyhow::anyhow!(e))?;
    }
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "nickel").map_err(|e| anyhow::anyhow!(e))
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
