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
    mermaid: &str,
    ascii: &str,
) -> anyhow::Result<()> {
    use tokio::fs;

    // Create output directory
    fs::create_dir_all(output_dir.join("src")).await?;

    // Generate server from NCL module
    let server_code = generate_server_from_ncl(project_root, server_config)?;
    fs::write(output_dir.join("src/server.ts"), server_code).await?;
    println!("✅ Generated: src/server.ts (from NCL module)");

    // Generate client main.ts
    let client_code = generate_client_from_ncl(project_root, component_names).await?;
    fs::write(output_dir.join("src/main.ts"), client_code).await?;
    println!("✅ Generated: src/main.ts (from NCL modules)");

    // Generate vite config
    let vite_code = generate_vite_config(server_config)?;
    fs::write(output_dir.join("vite.config.ts"), vite_code).await?;
    println!("✅ Generated: vite.config.ts");

    // Generate tensor.ncl output
    let tensor_ncl = generate_tensor_ncl(output_dir, server_config, component_names, mermaid, ascii)?;
    fs::write(output_dir.join("tensor.ncl"), tensor_ncl).await?;
    println!("✅ Generated: tensor.ncl");

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
            host: "100.115.154.32".to_string(),
            api_port: 3000,
            vite_port: 5173,
        }
    }
}

/// Generate server.ts from NCL module definition
fn generate_server_from_ncl(
    project_root: &Path,
    config: &ServerConfig,
) -> anyhow::Result<String> {
    let modules_dir = project_root.join("modules");
    
    // Find a server module (infrastructure with generation protocol)
    let modules: Vec<_> = std::fs::read_dir(&modules_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "ncl").unwrap_or(false))
        .filter_map(|e| NclCodeModule::from_ncl_file(&e.path()).ok())
        .filter(|m| m.is_infrastructure && m.protocol == "typescript")
        .collect();
    
    let server_module = modules.into_iter()
        .next()
        .ok_or_else(|| anyhow::anyhow!("No TypeScript server NCL module found in {}", modules_dir.display()))?;
    
    println!("   📄 Loaded server module: {}", server_module.name);
    
    // Generate code using the module's code generation spec
    let mut code_parts = Vec::new();
    
    // Emit vertices in order
    for vertex in &server_module.vertices {
        let text = if vertex.text.contains("{{HOST}}") {
            vertex.text.replace("{{HOST}}", &config.host)
        } else if vertex.text.contains("{{API_PORT}}") {
            vertex.text.replace("{{API_PORT}}", &config.api_port.to_string())
        } else {
            vertex.text.clone()
        };
        code_parts.push(text);
    }
    
    Ok(code_parts.join(""))
}

/// Load component module from NCL or fail
async fn load_component_module(project_root: &Path, name: &str) -> anyhow::Result<NclCodeModule> {
    let ncl_path = project_root.join("modules").join(format!("{}.ncl", name));
    if !ncl_path.exists() {
        anyhow::bail!("Module file not found: {}", ncl_path.display());
    }
    
    NclCodeModule::from_ncl_file(&ncl_path)
        .map_err(|e| anyhow::anyhow!("Failed to parse {}: {}", ncl_path.display(), e))
}

/// Generate client main.ts from component NCL modules
/// Fails if any component module is missing or incomplete
/// Root app is the last component that has ExprStmt (mounting) code
async fn generate_client_from_ncl(
    project_root: &Path,
    component_names: &[String]
) -> anyhow::Result<String> {
    let mut output = String::new();
    let mut component_tags: Vec<(String, String)> = Vec::new(); // (tag_name, class_name)
    let mut loaded_modules: Vec<(String, NclCodeModule)> = Vec::new();
    
    // Load all modules first
    for comp_name in component_names {
        let module = load_component_module(project_root, comp_name)
            .await
            .map_err(|e| anyhow::anyhow!("Component '{}': {}", comp_name, e))?;
        loaded_modules.push((comp_name.clone(), module));
    }
    
    // Find root app (module with ExprStmt for mounting)
    let root_idx = loaded_modules.iter()
        .rposition(|(_, m)| m.vertices.iter().any(|v| v.kind == "ExprStmt"))
        .ok_or_else(|| anyhow::anyhow!("No root app found - one component must have ExprStmt for mounting"))?;
    
    // Build component list (excluding root)
    let mut regular_components = Vec::new();
    let root_module = loaded_modules.remove(root_idx);
    for (name, module) in loaded_modules {
        regular_components.push((name, module));
    }
    
    // Add import statement
    output.push_str("import { Elena, html } from '@elenajs/core';\n\n");
    
    // Generate regular components
    for (comp_name, module) in regular_components {
        let class_name = comp_name.split('-').map(|s| {
            let mut chars = s.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str().to_lowercase().as_str()
            }
        }).collect::<String>();
        
        let tag_name = comp_name.to_lowercase();
        
        println!("   📄 Loaded component module: {}", module.name);
        
        // Must have ClassDecl vertices
        let has_class = module.vertices.iter().any(|v| v.kind == "ClassDecl");
        if !has_class {
            anyhow::bail!(
                "Module '{}' has no ClassDecl vertices - add code generation to module",
                comp_name
            );
        }
        
        // Add component class from vertices
        for vertex in &module.vertices {
            if vertex.kind == "ClassDecl" {
                output.push_str(&vertex.text);
                output.push_str("\n\n");
            }
        }
        
        component_tags.push((tag_name, class_name));
    }
    
    // Process root app
    let (root_name, root_module) = root_module;
    println!("   📄 Loaded root app module: {}", root_module.name);
    
    let root_class_name = root_name.split('-').map(|s| {
        let mut chars = s.chars();
        match chars.next() {
            None => String::new(),
            Some(first) => first.to_uppercase().collect::<String>() + chars.as_str().to_lowercase().as_str()
        }
    }).collect::<String>();
    
    let root_tag_name = root_name.to_lowercase();
    
    // Add root app class
    let has_app_class = root_module.vertices.iter().any(|v| v.kind == "ClassDecl");
    if !has_app_class {
        anyhow::bail!("Root module '{}' has no ClassDecl vertices", root_name);
    }
    
    for vertex in &root_module.vertices {
        if vertex.kind == "ClassDecl" {
            output.push_str(&vertex.text);
            output.push_str("\n\n");
        }
    }
    
    // Register all components
    output.push_str("// Register all web components\n");
    for (tag_name, class_name) in &component_tags {
        output.push_str(&format!(
            "customElements.define('{}', {});\n",
            tag_name, class_name
        ));
    }
    output.push_str(&format!(
        "customElements.define('{}', {});\n\n",
        root_tag_name, root_class_name
    ));
    
    // Mount app from module
    let has_mount = root_module.vertices.iter().any(|v| v.kind == "ExprStmt");
    if !has_mount {
        anyhow::bail!("Root module '{}' missing ExprStmt for mounting", root_name);
    }
    
    for vertex in &root_module.vertices {
        if vertex.kind == "ExprStmt" {
            output.push_str(&vertex.text);
            output.push('\n');
        }
    }
    
    Ok(output)
}

/// Generate vite.config.ts
fn generate_vite_config(config: &ServerConfig) -> anyhow::Result<String> {
    let vite_code = format!(
        "import {{ defineConfig }} from 'vite';\n\nexport default defineConfig({{\n  server: {{\n    host: '{}',\n    port: {},\n    proxy: {{\n      '/api': 'http://{}:{}'\n    }}\n  }},\n  build: {{\n    outDir: 'dist'\n  }}\n}});\n",
        config.host, config.vite_port, config.host, config.api_port
    );
    Ok(vite_code)
}

/// Generate tensor.ncl output
fn generate_tensor_ncl(
    output_dir: &Path,
    config: &ServerConfig,
    component_names: &[String],
    mermaid: &str,
    ascii: &str,
) -> anyhow::Result<String> {
    let name = output_dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("app");
    let id = format!("dev.phoenix.{}", name.replace("-", "_"));

    let components_str = component_names.iter()
        .map(|c| format!("\"{}\"", c))
        .collect::<Vec<_>>()
        .join(", ");

    // Generate valid Nickel syntax with multiline strings
    let spec = format!(
        "# Phoenix Generated Specification\n{{\n  id = \"{}\",\n  name = \"{}\",\n  server = {{\n    host = \"{}\",\n    api_port = {},\n    vite_port = {}\n  }},\n  components = [{}],\n  \n  # Mermaid Diagram (from tensor network)\n  mermaid = m%''{}'%\n\n  # ASCII Art Representation\n  ascii = m%''{}'%\n}}\n",
        id, name, config.host, config.api_port, config.vite_port, components_str,
        mermaid,
        ascii,
    );

    Ok(spec)
}