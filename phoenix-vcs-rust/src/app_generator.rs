//! App Generation Orchestrator
//!
//! This module orchestrates the generation of a complete application
//! by combining framework modules and components.
//!
//! It uses the generic codegen helpers but contains the specific
//! logic for how to combine modules (server + client + components).

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use crate::codegen::emit_bundle::{create_protocol, EmitBuilder, emit_schema};
use crate::codegen::template_gen::{read_component_source, pascal_case};
use crate::kitty::module_bridge::ParsedModuleSpec;

/// Orchestrate generation of a complete application
pub async fn generate_app(
    project_root: &Path,
    output_dir: &Path,
    parsed: &ParsedModuleSpec,
    server_config: &ServerConfig,
    component_configs: &HashMap<String, serde_json::Value>,
) -> anyhow::Result<()> {
    use tokio::fs;
    
    // Create output directory
    fs::create_dir_all(output_dir.join("src")).await?;
    
    // Generate server.ts
    let server_code = generate_server(&project_root, server_config).await?;
    fs::write(output_dir.join("src/server.ts"), server_code).await?;
    println!("✅ Generated: src/server.ts");
    
    // Generate client main.ts
    let client_code = generate_client(&project_root, component_configs).await?;
    fs::write(output_dir.join("src/main.ts"), client_code).await?;
    println!("✅ Generated: src/main.ts");
    
    // Generate vite.config.ts
    let vite_code = generate_vite_config(server_config).await?;
    fs::write(output_dir.join("vite.config.ts"), vite_code).await?;
    println!("✅ Generated: vite.config.ts");
    
    // Generate spec.ncl
    let spec_ncl = generate_spec_ncl(output_dir, server_config, component_configs).await?;
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

/// Generate server.ts by combining hono-server module with app-specific routes
async fn generate_server(project_root: &Path, config: &ServerConfig) -> anyhow::Result<String> {
    // Create TypeScript protocol
    let protocol = create_protocol(
        "typescript",
        vec![
            "ImportDecl".to_string(),
            "VarDecl".to_string(),
            "RouteHandler".to_string(),
            "ExprStmt".to_string(),
        ],
        vec![],
    );
    
    let mut b = EmitBuilder::new(&protocol, "server");
    
    // Base Hono setup (from module or inline)
    b = b.vertex("import_hono", "ImportDecl", Some("import { Hono } from 'hono';\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("import_serve", "ImportDecl", Some("import { serve } from '@hono/node-server';\n\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("app_const", "VarDecl", Some("const app = new Hono();\n\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Data storage
    b = b.vertex("todos_storage", "VarDecl", Some("const todos = [{ id: 1, text: 'Learn ElenaJS', completed: false }];\n\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Routes - inline since add_route had borrow issues
    b = b.vertex("health_route", "RouteHandler", Some(
        "app.get('/api/health', (c) => {\n  return c.json({ status: 'ok', timestamp: new Date().toISOString() });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("users_route", "RouteHandler", Some(
        "app.get('/api/users', (c) => {\n  return c.json({ users: [{ id: 1, name: 'Alice' }] });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("todos_get", "RouteHandler", Some(
        "app.get('/api/todos', (c) => {\n  return c.json({ todos });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // POST /api/todos
    b = b.vertex("todos_post", "RouteHandler", Some(
        "app.post('/api/todos', async (c) => {\n  const body = await c.req.json();\n  const todo = { id: Date.now(), text: body.text, completed: false };\n  todos.push(todo);\n  return c.json(todo);\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // PATCH /api/todos/:id
    b = b.vertex("todos_patch", "RouteHandler", Some(
        "app.patch('/api/todos/:id', async (c) => {\n  const id = parseInt(c.req.param('id'));\n  const body = await c.req.json();\n  const todo = todos.find(t => t.id === id);\n  if (!todo) return c.json({ error: 'Not found' }, 404);\n  if (body.completed !== undefined) todo.completed = body.completed;\n  return c.json(todo);\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // DELETE /api/todos/:id
    b = b.vertex("todos_delete", "RouteHandler", Some(
        "app.delete('/api/todos/:id', (c) => {\n  const id = parseInt(c.req.param('id'));\n  const index = todos.findIndex(t => t.id === id);\n  if (index === -1) return c.json({ error: 'Not found' }, 404);\n  todos.splice(index, 1);\n  return c.json({ success: true });\n});\n\n"
    )).map_err(|e| anyhow::anyhow!(e))?;
    
    // Server startup with config
    let hostname_code = format!("const hostname = '{}';\n", config.host);
    let port_code = format!("const port = {};\n", config.api_port);
    
    b = b.vertex("hostname_const", "VarDecl", Some(&hostname_code))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("port_const", "VarDecl", Some(&port_code))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("log_stmt", "ExprStmt", Some("console.log(`Server running at http://${hostname}:${port}`);\n\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("serve_call", "ExprStmt", Some("serve({ fetch: app.fetch, port, hostname });\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

/// Helper to add a simple route
/// Generate client main.ts from component files
async fn generate_client(
    project_root: &Path,
    component_configs: &HashMap<String, serde_json::Value>,
) -> anyhow::Result<String> {
    // Create TypeScript protocol
    let protocol = create_protocol(
        "typescript",
        vec![
            "ImportDecl".to_string(),
            "ClassDecl".to_string(),
            "ExprStmt".to_string(),
        ],
        vec![],
    );
    
    let mut b = EmitBuilder::new(&protocol, "client");
    
    // Note: Component files already have their own imports, so we don't add duplicate
    // The first component with imports will provide them
    
    // Read and embed each component
    let component_names: Vec<String> = component_configs.keys().cloned().collect();
    let mut all_components = String::new();
    
    for comp_name in &component_names {
        // Convert component name to file path (TodoList -> todo-list)
        let file_name = comp_name.to_lowercase().replace("card", "-card").replace("list", "-list");
        match read_component_source(project_root, &file_name) {
            Ok(content) => {
                all_components.push_str(&content);
                all_components.push('\n');
            }
            Err(e) => {
                eprintln!("Warning: {}", e);
            }
        }
    }
    
    if !all_components.is_empty() {
        b = b.vertex("components", "ClassDecl", Some(&all_components))
            .map_err(|e| anyhow::anyhow!(e))?;
    }
    
    // Generate app container
    let app_container = generate_app_container(&component_names);
    b = b.vertex("elena_app", "ClassDecl", Some(&app_container))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Component registration
    let mut register_code = String::from("// Register all components\n");
    for comp_name in &component_names {
        let class_name = pascal_case(comp_name);
        register_code.push_str(&format!("{}.define();\n", class_name));
    }
    register_code.push_str("ElenaApp.define();\n\n");
    
    b = b.vertex("register", "ExprStmt", Some(&register_code))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Mount app
    b = b.vertex("mount", "ExprStmt", Some("// Mount the app\nconst app = document.createElement('elena-app');\ndocument.body.appendChild(app);\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "typescript").map_err(|e| anyhow::anyhow!(e))
}

/// Generate ElenaApp container
fn generate_app_container(component_names: &[String]) -> String {
    let mut body = String::new();
    
    for comp_name in component_names {
        let tag_name = comp_name.to_lowercase().replace("card", "-card").replace("list", "-list");
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
async fn generate_vite_config(config: &ServerConfig) -> anyhow::Result<String> {
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

/// Generate spec.ncl
async fn generate_spec_ncl(
    output_dir: &Path,
    config: &ServerConfig,
    component_configs: &HashMap<String, serde_json::Value>,
) -> anyhow::Result<String> {
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
    
    // Header
    b = b.vertex("header", "comment", Some("# Phoenix Generated Specification\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Fields
    b = b.vertex("id", "field", Some(&format!("id = '{}'\n", id)))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("name", "field", Some(&format!("name = '{}'\n", name)))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Server config
    let server = format!(
        "server = {{\n  host = '{}'\n  api_port = {}\n  vite_port = {}\n}}\n",
        config.host, config.api_port, config.vite_port
    );
    b = b.vertex("server", "field", Some(&server))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Build config
    b = b.vertex("build_type", "field", Some("build.type = 'typescript'\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("build_runtime", "field", Some("build.runtime = 'bun'\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    b = b.vertex("build_bundler", "field", Some("build.bundler = 'vite'\n"))
        .map_err(|e| anyhow::anyhow!(e))?;
    
    // Components
    if !component_configs.is_empty() {
        let mut items = String::new();
        for (idx, (name, cfg)) in component_configs.iter().enumerate() {
            if idx > 0 { items.push_str(",\n"); }
            
            let props = cfg.get("props").and_then(|p| p.as_array())
                .map(|arr| arr.iter().map(|v| format!("'{}'", v.as_str().unwrap_or(""))).collect::<Vec<_>>().join(", "))
                .unwrap_or_default();
            let features = cfg.get("features").and_then(|f| f.as_array())
                .map(|arr| arr.iter().map(|v| format!("'{}'", v.as_str().unwrap_or(""))).collect::<Vec<_>>().join(", "))
                .unwrap_or_default();
            
            items.push_str(&format!("  {{ name = '{}', props = [{}], features = [{}] }}", name, props, features));
        }
        
        let comps = format!("components = [\n{}\n]\n", items);
        b = b.vertex("components", "field", Some(&comps))
            .map_err(|e| anyhow::anyhow!(e))?;
    }
    
    let schema = b.build().map_err(|e| anyhow::anyhow!(e))?;
    emit_schema(&schema, "nickel").map_err(|e| anyhow::anyhow!(e))
}
