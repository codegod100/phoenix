//! App Generation from NCL Module Definitions
//!
//! Each module now self-describes its code generation in its .ncl file.
//! Phoenix just orchestrates: reads NCL → builds schema → emits code.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use crate::codegen::ncl_module::NclCodeModule;
use crate::kitty::module_bridge::ParsedModuleSpec;
use crate::kitty::module_tensor_network::ModuleTensorNetwork;

/// Orchestrate generation from NCL modules
pub async fn generate_app(
    project_root: &Path,
    output_dir: &Path,
    _parsed: &ParsedModuleSpec,
    network: &ModuleTensorNetwork,
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
    let client_code = generate_client_from_ncl(project_root, component_names).await?;
    fs::write(output_dir.join("src/main.ts"), client_code).await?;
    println!("✅ Generated: src/main.ts (from NCL modules)");

    // Generate vite config
    let vite_code = generate_vite_config(server_config)?;
    fs::write(output_dir.join("vite.config.ts"), vite_code).await?;
    println!("✅ Generated: vite.config.ts");

    // Generate spec.ncl output with tensor network
    let spec_ncl = generate_spec_ncl(output_dir, network, server_config, component_names)?;
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
fn generate_server_from_ncl(
    project_root: &Path,
    config: &ServerConfig
) -> anyhow::Result<String> {
    let ncl_path = project_root.join("modules/hono-server.ncl");
    let module = NclCodeModule::from_ncl_file(&ncl_path)
        .map_err(|e| anyhow::anyhow!("Failed to load {}: {}", ncl_path.display(), e))?;

    println!("   📄 Loaded server module: {}", module.name);

    // Build config map from placeholders
    let mut config_map = HashMap::new();
    for placeholder in module.config_placeholders.keys() {
        let value = match placeholder.as_str() {
            "{{HOST}}" => config.host.clone(),
            "{{API_PORT}}" => config.api_port.to_string(),
            _ => continue,
        };
        config_map.insert(placeholder.clone(), value);
    }

    module.generate(&config_map)
}

/// Load component module from NCL or return error
async fn load_component_module(project_root: &Path, name: &str) -> anyhow::Result<NclCodeModule> {
    // Flat structure: modules/{name}.ncl
    let ncl_path = project_root.join("modules").join(format!("{}.ncl", name));
    if ncl_path.exists() {
        return NclCodeModule::from_ncl_file(&ncl_path)
            .map_err(|e| anyhow::anyhow!("Failed to load {}: {}", ncl_path.display(), e));
    }

    anyhow::bail!("No NCL module found for component '{}' (tried: {})",
        name, ncl_path.display())
}

fn capitalize(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None => String::new(),
        Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
    }
}

/// Generate client main.ts from component NCL modules
/// Fails if any component module is missing or incomplete
async fn generate_client_from_ncl(
    project_root: &Path,
    component_names: &[String]
) -> anyhow::Result<String> {
    let mut output = String::new();
    let mut component_tags: Vec<(String, String)> = Vec::new(); // (tag_name, class_name)
    
    // Add import statement
    output.push_str("import { Elena, html } from '@elenajs/core';\n\n");
    
    // Load and generate each component - fail if any missing
    for comp_name in component_names {
        let class_name = comp_name.split('-').map(|s| {
            let mut chars = s.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + chars.as_str().to_lowercase().as_str()
            }
        }).collect::<String>();
        
        let tag_name = comp_name.to_lowercase();
        
        let module = load_component_module(project_root, comp_name)
            .await
            .map_err(|e| anyhow::anyhow!("Component '{}': {}", comp_name, e))?;
        
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
    
    // Require elena-app module for root component
    let app_module = load_component_module(project_root, "elena-app")
        .await
        .map_err(|e| anyhow::anyhow!("Required root 'elena-app' module: {}", e))?;
    
    println!("   📄 Loaded root app module: {}", app_module.name);
    
    // Add root app component from module
    let has_app_class = app_module.vertices.iter().any(|v| v.kind == "ClassDecl");
    if !has_app_class {
        anyhow::bail!("'elena-app' module has no ClassDecl vertices");
    }
    
    for vertex in &app_module.vertices {
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
    output.push_str("customElements.define('elena-app', ElenaApp);\n\n");
    
    // Mount app from module
    let has_mount = app_module.vertices.iter().any(|v| v.kind == "ExprStmt");
    if !has_mount {
        anyhow::bail!("'elena-app' module missing ExprStmt for mounting");
    }
    
    for vertex in &app_module.vertices {
        if vertex.kind == "ExprStmt" {
            output.push_str(&vertex.text);
            output.push('\n');
        }
    }
    
    Ok(output)
}

/// Generate vite.config.ts
fn generate_vite_config(config: &ServerConfig) -> anyhow::Result<String> {
    // Direct string formatting - avoid emit_bundle which escapes braces
    let vite_code = format!(
        "import {{ defineConfig }} from 'vite';\n\nexport default defineConfig({{\n  server: {{\n    host: '{}',\n    port: {},\n    proxy: {{\n      '/api': 'http://{}:{}'\n    }}\n  }},\n  build: {{\n    outDir: 'dist'\n  }}\n}});\n",
        config.host, config.vite_port, config.host, config.api_port
    );
    Ok(vite_code)
}

/// Generate spec.ncl output with tensor network
fn generate_spec_ncl(
    output_dir: &Path,
    network: &ModuleTensorNetwork,
    config: &ServerConfig,
    component_names: &[String]
) -> anyhow::Result<String> {
    let name = output_dir.file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("app");
    let id = format!("dev.phoenix.{}", name.replace("-", "_"));

    let components_str = component_names.iter()
        .map(|c| format!("\"{}\"", c))
        .collect::<Vec<_>>()
        .join(", ");
    
    // Generate modules list
    let modules_str = if network.module_boxes.is_empty() {
        "".to_string()
    } else {
        network.module_boxes.values()
            .map(|mb| {
                let lang = &mb.module.language;
                format!(
                    "    {{ id = \"{}\", name = \"{}\", language = \"{}\" }}",
                    mb.module.id,
                    mb.module.name,
                    lang
                )
            })
            .collect::<Vec<_>>()
            .join(",\n")
    };
    
    // Generate connections (cups)
    let connections_str = if network.cups.is_empty() {
        "".to_string()
    } else {
        network.cups.iter()
            .map(|cup| {
                let iface = format!("{:?}", cup.interface)
                    .replace('"', "\\\"");  // Escape internal quotes
                format!(
                    "    {{ provider = \"{}\", consumer = \"{}\", interface = \"{}\" }}",
                    cup.provider, cup.consumer, iface
                )
            })
            .collect::<Vec<_>>()
            .join(",\n")
    };
    
    // Generate dangling (unfulfilled needs)
    let dangling_str = if network.dangling.is_empty() {
        "".to_string()
    } else {
        network.dangling.iter()
            .map(|(module_id, iface)| {
                let iface_str = format!("{:?}", iface)
                    .replace('"', "\\\"");  // Escape internal quotes
                format!(
                    "    {{ module = \"{}\", needs = \"{}\" }}",
                    module_id, iface_str
                )
            })
            .collect::<Vec<_>>()
            .join(",\n")
    };

    // Build array contents with proper formatting
    let modules_content = if modules_str.is_empty() { 
        "".to_string() 
    } else { 
        format!("\n{}\n  ", modules_str) 
    };
    let connections_content = if connections_str.is_empty() { 
        "".to_string() 
    } else { 
        format!("\n{}\n  ", connections_str) 
    };
    let dangling_content = if dangling_str.is_empty() { 
        "".to_string() 
    } else { 
        format!("\n{}\n  ", dangling_str) 
    };

    // Generate valid Nickel syntax
    let spec = format!(
        "# Phoenix Generated Specification\n{{\n  id = \"{}\",\n  name = \"{}\",\n  server = {{\n    host = \"{}\",\n    api_port = {},\n    vite_port = {}\n  }},\n  components = [{}],\n  \n  # Tensor Network\n  modules = [{}],\n  connections = [{}],\n  dangling = [{}]\n}}\n",
        id, name, config.host, config.api_port, config.vite_port, components_str,
        modules_content, connections_content, dangling_content
    );

    Ok(spec)
}
