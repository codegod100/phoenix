//! App Generation from NCL Module Definitions
//!
//! Each module now self-describes its code generation in its .ncl file.
//! Phoenix just orchestrates: reads NCL → builds schema → emits code.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use crate::codegen::ncl_module::NclCodeModule;
use crate::kitty::module_bridge::ParsedModuleSpec;

/// Orchestrate generation from NCL modules
pub async fn generate_app(
    project_root: &Path,
    output_dir: &Path,
    _parsed: &ParsedModuleSpec,
    server_config: &ServerConfig,
    component_names: &[String],
) -> anyhow::Result<()> {
    use tokio::fs;
    
    // Create output directory
    fs::create_dir_all(output_dir.join("src")).await?;
    
    // Generate server from NCL module
    let server_code = generate_server_from_ncl(project_root, server_config)?;
    fs::write(output_dir.join("src/server.ts"), server_code).await?;
    println!("✅ Generated: src/server.ts (from NCL module)");
    
    // Generate client main.ts
    let client_code = generate_client_from_ncl(project_root, component_names)?;
    fs::write(output_dir.join("src/main.ts"), client_code).await?;
    println!("✅ Generated: src/main.ts (from NCL modules)");
    
    // Generate vite config
    let vite_code = generate_vite_config(server_config)?;
    fs::write(output_dir.join("vite.config.ts"), vite_code).await?;
    println!("✅ Generated: vite.config.ts");
    
    // Generate spec.ncl output
    let spec_ncl = generate_spec_ncl(output_dir, server_config, component_names)?;
    fs::write(output_dir.join("spec.ncl"), spec_ncl).await?;
    println!("✅ Generated: spec.ncl");
    
    Ok(())
}

/// Server configuration  
#[derive(Debug, Clone)]
pub struct ServerConfig {
    pub host: String,
    pub api_port: u16,
    pub vite_port: u16,
}

impl Default for ServerConfig {
    fn default() -> Self {
        Self {
            host: "127.0.0.1".to_string(),
            api_port: 3000,
            vite_port: 5173,
        }
    }
}

/// Generate server.ts from NCL module definition
/// 
/// Tries to load from NCL file first, falls back to hardcoded module.
fn generate_server_from_ncl(
    project_root: &Path,
    config: &ServerConfig
) -> anyhow::Result<String> {
    // Try to load from NCL file
    let ncl_path = project_root.join("modules/hono-server/module.ncl");
    let mut module = if ncl_path.exists() {
        match NclCodeModule::from_ncl_file(&ncl_path) {
            Ok(m) => {
                println!("   📄 Loaded module from {:?}", ncl_path);
                m
            }
            Err(e) => {
                eprintln!("   ⚠️  Failed to load NCL: {}, using hardcoded", e);
                create_hono_server_module()
            }
        }
    } else {
        create_hono_server_module()
    };
    
    // Build config map from placeholders
    let mut config_map = HashMap::new();
    for (placeholder, _path) in &module.config_placeholders {
        let value = match placeholder.as_str() {
            "{{HOST}}" => config.host.clone(),
            "{{API_PORT}}" => config.api_port.to_string(),
            _ => continue,
        };
        config_map.insert(placeholder.clone(), value);
    }
    
    // ONE LINE: module.generate() calls emit_with_protocol internally!
    module.generate(&config_map)
}

/// Hardcoded hono-server module (until NCL parsing is integrated)
fn create_hono_server_module() -> NclCodeModule {
    use crate::codegen::ncl_module::VertexDef;
    
    NclCodeModule {
        id: "hono-server".to_string(),
        name: "Hono HTTP Server".to_string(),
        protocol: "typescript".to_string(),
        vertex_kinds: vec![
            "ImportDecl".to_string(),
            "VarDecl".to_string(),
            "RouteHandler".to_string(),
            "ExprStmt".to_string(),
        ],
        vertices: vec![
            VertexDef {
                id: "import_hono".to_string(),
                kind: "ImportDecl".to_string(),
                text: "import { Hono } from 'hono';\n".to_string(),
            },
            VertexDef {
                id: "import_serve".to_string(),
                kind: "ImportDecl".to_string(),
                text: "import { serve } from '@hono/node-server';\n\n".to_string(),
            },
            VertexDef {
                id: "app_const".to_string(),
                kind: "VarDecl".to_string(),
                text: "const app = new Hono();\n\n".to_string(),
            },
            VertexDef {
                id: "todos_storage".to_string(),
                kind: "VarDecl".to_string(),
                text: "const todos = [{ id: 1, text: 'Learn ElenaJS', completed: false }];\n\n".to_string(),
            },
            VertexDef {
                id: "health_route".to_string(),
                kind: "RouteHandler".to_string(),
                text: "app.get('/api/health', (c) => {\n  return c.json({ status: 'ok', timestamp: new Date().toISOString() });\n});\n\n".to_string(),
            },
            VertexDef {
                id: "users_route".to_string(),
                kind: "RouteHandler".to_string(),
                text: "app.get('/api/users', (c) => {\n  return c.json({ users: [{ id: 1, name: 'Alice' }] });\n});\n\n".to_string(),
            },
            VertexDef {
                id: "todos_get".to_string(),
                kind: "RouteHandler".to_string(),
                text: "app.get('/api/todos', (c) => {\n  return c.json({ todos });\n});\n\n".to_string(),
            },
            VertexDef {
                id: "todos_post".to_string(),
                kind: "RouteHandler".to_string(),
                text: "app.post('/api/todos', async (c) => {\n  const body = await c.req.json();\n  const todo = { id: Date.now(), text: body.text, completed: false };\n  todos.push(todo);\n  return c.json(todo);\n});\n\n".to_string(),
            },
            VertexDef {
                id: "todos_patch".to_string(),
                kind: "RouteHandler".to_string(),
                text: "app.patch('/api/todos/:id', async (c) => {\n  const id = parseInt(c.req.param('id'));\n  const body = await c.req.json();\n  const todo = todos.find(t => t.id === id);\n  if (!todo) return c.json({ error: 'Not found' }, 404);\n  if (body.completed !== undefined) todo.completed = body.completed;\n  return c.json(todo);\n});\n\n".to_string(),
            },
            VertexDef {
                id: "todos_delete".to_string(),
                kind: "RouteHandler".to_string(),
                text: "app.delete('/api/todos/:id', (c) => {\n  const id = parseInt(c.req.param('id'));\n  const index = todos.findIndex(t => t.id === id);\n  if (index === -1) return c.json({ error: 'Not found' }, 404);\n  todos.splice(index, 1);\n  return c.json({ success: true });\n});\n\n".to_string(),
            },
            VertexDef {
                id: "hostname_const".to_string(),
                kind: "VarDecl".to_string(),
                text: "const hostname = '{{HOST}}';\n".to_string(),
            },
            VertexDef {
                id: "port_const".to_string(),
                kind: "VarDecl".to_string(),
                text: "const port = {{API_PORT}};\n".to_string(),
            },
            VertexDef {
                id: "log_stmt".to_string(),
                kind: "ExprStmt".to_string(),
                text: "console.log(`Server running at http://${hostname}:${port}`);\n\n".to_string(),
            },
            VertexDef {
                id: "serve_call".to_string(),
                kind: "ExprStmt".to_string(),
                text: "serve({ fetch: app.fetch, port, hostname });\n".to_string(),
            },
        ],
        config_placeholders: {
            let mut m = HashMap::new();
            m.insert("{{HOST}}".to_string(), "server.host".to_string());
            m.insert("{{API_PORT}}".to_string(), "server.api_port".to_string());
            m
        },
    }
}

/// Create TodoList component module
fn create_todo_list_module() -> NclCodeModule {
    use crate::codegen::ncl_module::VertexDef;
    
    NclCodeModule {
        id: "todo-list".to_string(),
        name: "Todo List Component".to_string(),
        protocol: "typescript".to_string(),
        vertex_kinds: vec!["ClassDecl".to_string()],
        vertices: vec![
            VertexDef {
                id: "todo_list_class".to_string(),
                kind: "ClassDecl".to_string(),
                text: r#"export class TodoList extends Elena(HTMLElement) {
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
}"#.to_string(),
            },
        ],
        config_placeholders: HashMap::new(),
    }
}

/// Create WelcomeCard component module
fn create_welcome_card_module() -> NclCodeModule {
    use crate::codegen::ncl_module::VertexDef;
    
    NclCodeModule {
        id: "welcome-card".to_string(),
        name: "Welcome Card Component".to_string(),
        protocol: "typescript".to_string(),
        vertex_kinds: vec!["ClassDecl".to_string()],
        vertices: vec![
            VertexDef {
                id: "welcome_card_class".to_string(),
                kind: "ClassDecl".to_string(),
                text: r#"export class WelcomeCard extends Elena(HTMLElement) {
  static tagName = 'welcome-card';
  static props = ['title', 'message'];
  
  title = 'Welcome';
  message = 'Generated by Phoenix';
  
  render() {
    return html`
      <div style="background: linear-gradient(135deg, #667eea, #764ba2); padding: 2rem; border-radius: 1rem; color: white; text-align: center;">
        <h1>${this.title}</h1>
        <p>${this.message}</p>
      </div>
    `;
  }
}"#.to_string(),
            },
        ],
        config_placeholders: HashMap::new(),
    }
}

/// Generate client main.ts from component modules
fn generate_client_from_ncl(
    _project_root: &Path,
    component_names: &[String]
) -> anyhow::Result<String> {
    use crate::codegen::emit_bundle::{create_protocol, EmitBuilder, emit_schema};
    
    // Create TypeScript protocol
    let protocol = create_protocol(
        "typescript",
        vec!["ImportDecl".to_string(), "ClassDecl".to_string(), "ExprStmt".to_string()],
        vec![],
    );
    
    let mut b = EmitBuilder::new(&protocol, "client");
    
    // Import Elena
    b = b.vertex("import_elena", "ImportDecl", Some("import { Elena, html } from '@elenajs/core';\n\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Add each component module
    for comp_name in component_names {
        let module = match comp_name.as_str() {
            "todo-list" => create_todo_list_module(),
            "welcome-card" => create_welcome_card_module(),
            _ => {
                eprintln!("Warning: Unknown component {}", comp_name);
                continue;
            }
        };
        
        // Add component vertices
        for vertex in &module.vertices {
            let vertex_id = format!("{}_{}", comp_name.replace("-", "_"), vertex.id);
            b = b.vertex(&vertex_id, &vertex.kind, Some(&vertex.text))
                .map_err(|e| anyhow::anyhow!(e))?;
        }
    }
    
    // Generate app container
    let app_code = generate_app_container_code(component_names);
    b = b.vertex("elena_app", "ClassDecl", Some(&app_code))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Register components
    let mut register_code = String::from("// Register all components\n");
    for comp_name in component_names {
        let class_name = pascal_case(comp_name);
        register_code.push_str(&format!("{}.define();\n", class_name));
    }
    register_code.push_str("ElenaApp.define();\n\n");
    
    b = b.vertex("register", "ExprStmt", Some(&register_code))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Mount
    b = b.vertex("mount", "ExprStmt", Some("// Mount the app\nconst app = document.createElement('elena-app');\ndocument.body.appendChild(app);\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Emit
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

/// Generate app container
fn generate_app_container_code(component_names: &[String]) -> String {
    let mut body = String::new();
    
    for comp_name in component_names {
        let tag_name = comp_name.to_lowercase();
        if tag_name == "welcome-card" {
            body.push_str("        <welcome-card title=\"Elena Dashboard\" message=\"Phoenix Generated\"></welcome-card>\n");
        } else {
            body.push_str(&format!("        <{}></{}>\n", tag_name, tag_name));
        }
    }
    
    format!(r#"class ElenaApp extends Elena(HTMLElement) {{
  static tagName = 'elena-app';
  
  render() {{
    return html`
      <div style="max-width: 800px; margin: 0 auto; padding: 1rem;">
{}
      </div>
    `;
  }}
}}
"#, body)
}

/// Generate vite.config.ts
fn generate_vite_config(config: &ServerConfig) -> anyhow::Result<String> {
    use crate::codegen::emit_bundle::{create_protocol, EmitBuilder, emit_schema};
    
    let protocol = create_protocol(
        "typescript",
        vec!["ImportDecl".to_string(), "ExportDefault".to_string()],
        vec![],
    );
    
    let mut b = EmitBuilder::new(&protocol, "vite");
    
    let vite_code = format!(
        "export default defineConfig({{\n  server: {{\n    host: '{}',\n    port: {},\n    proxy: {{\n      '/api': 'http://{}:{}'\n    }}\n  }},\n  build: {{\n    outDir: 'dist'\n  }}\n}});\n",
        config.host, config.vite_port, config.host, config.api_port
    );
    
    b = b.vertex("import", "ImportDecl", Some("import { defineConfig } from 'vite';\n\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("config", "ExportDefault", Some(&vite_code))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

/// Generate spec.ncl output
fn generate_spec_ncl(
    output_dir: &Path,
    config: &ServerConfig,
    component_names: &[String]
) -> anyhow::Result<String> {
    use crate::codegen::emit_bundle::{create_protocol, EmitBuilder, emit_schema};
    
    let protocol = create_protocol(
        "nickel",
        vec!["comment".to_string(), "field".to_string(), "record".to_string(), "array".to_string()],
        vec![],
    );
    
    let name = output_dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("app");
    let id = format!("dev.phoenix.{}", name.replace("-", "_"));
    
    let mut b = EmitBuilder::new(&protocol, "spec");
    
    b = b.vertex("header", "comment", Some("# Phoenix Generated Specification\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("id", "field", Some(&format!("id = '{}'\n", id)))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("name", "field", Some(&format!("name = '{}'\n", name)))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    let server = format!(
        "server = {{\n  host = '{}'\n  api_port = {}\n  vite_port = {}\n}}\n",
        config.host, config.api_port, config.vite_port
    );
    b = b.vertex("server", "field", Some(&server))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Components list
    let comps_list = component_names.iter()
        .map(|n| format!("'{}'", n))
        .collect::<Vec<_>>()
        .join(", ");
    let comps = format!("components = [{}]\n", comps_list);
    b = b.vertex("components", "field", Some(&comps))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "nickel").map_err(|e| anyhow::anyhow!(e))
}

/// Convert kebab-case to PascalCase
fn pascal_case(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => {
                    let rest: String = chars.collect();
                    first.to_uppercase().to_string() + &rest.to_lowercase()
                }
            }
        })
        .collect()
}
