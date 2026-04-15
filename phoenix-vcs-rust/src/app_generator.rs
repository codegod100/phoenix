//! App Generation from NCL Module Definitions
//!
//! Each module now self-describes its code generation in its .ncl file.
//! Phoenix just orchestrates: reads NCL → builds schema → emits code.

use std::collections::HashMap;
use std::path::{Path, PathBuf};
use crate::codegen::ncl_module::NclCodeModule;
use crate::kitty::module_bridge::ParsedModuleSpec;

/// Parse button colors from spec.md for TodoList
/// Also parses user-card props from ElenaApp children
fn parse_spec_config(spec_md: &str) -> HashMap<String, HashMap<String, String>> {
    let mut configs: HashMap<String, HashMap<String, String>> = HashMap::new();
    
    // Parse TodoList colors
    let mut todo_config = HashMap::new();
    let mut in_todo_list = false;
    
    // Parse UserCard styling
    let mut user_config = HashMap::new();
    let mut in_user_card = false;
    
    // Parse ElenaApp children props
    let mut in_elena_app = false;
    let mut elena_app_children = Vec::new();
    
    for line in spec_md.lines() {
        // Track which component section we're in
        if line.starts_with("### ") {
            in_todo_list = line.contains("TodoList");
            in_user_card = line.contains("UserCard");
            in_elena_app = line.contains("ElenaApp");
        }
        
        // Parse TodoList colors
        if in_todo_list && line.contains("Add button") && line.contains("color") {
            if let Some(start) = line.find('`') {
                if let Some(end) = line[start+1..].find('`') {
                    let color = &line[start+1..start+1+end];
                    let variant = match color {
                        "green" => "success",
                        "red" => "danger",
                        _ => color,
                    };
                    todo_config.insert("buttonColor".to_string(), variant.to_string());
                }
            }
        }
        if in_todo_list && line.contains("checkbox") && line.contains("color") {
            if let Some(start) = line.find('`') {
                if let Some(end) = line[start+1..].find('`') {
                    let color = &line[start+1..start+1+end];
                    let variant = match color {
                        "green" => "success",
                        "red" => "danger", 
                        _ => color,
                    };
                    todo_config.insert("checkboxColor".to_string(), variant.to_string());
                }
            }
        }
        
        // Parse UserCard avatar color
        if in_user_card && line.contains("Avatar") && line.contains("color") {
            if let Some(start) = line.find('`') {
                if let Some(end) = line[start+1..].find('`') {
                    let color_name = &line[start+1..start+1+end];
                    // Map color names to actual CSS values
                    let color_value = match color_name {
                        "blue" => "#4287f5",
                        "green" => "#48bb78",
                        "red" => "#ff6b6b",
                        "purple" => "#667eea",
                        "orange" => "#ff8c00",
                        _ => "#4287f5", // default blue
                    };
                    user_config.insert("avatarColor".to_string(), color_value.to_string());
                }
            }
        }
        
        // Parse ElenaApp children (user-card props)
        if in_elena_app && line.contains("user-card") {
            // Extract name="..." and email="..."
            if let Some(name_start) = line.find("name=\"") {
                let name_start = name_start + 6;
                if let Some(name_end) = line[name_start..].find("\"") {
                    let name = line[name_start..name_start+name_end].to_string();
                    elena_app_children.push(("userCardName".to_string(), name));
                }
            }
            if let Some(email_start) = line.find("email=\"") {
                let email_start = email_start + 7;
                if let Some(email_end) = line[email_start..].find("\"") {
                    let email = line[email_start..email_start+email_end].to_string();
                    elena_app_children.push(("userCardEmail".to_string(), email));
                }
            }
        }
    }
    
    // Defaults for todo
    if !todo_config.contains_key("buttonColor") {
        todo_config.insert("buttonColor".to_string(), "success".to_string());
    }
    if !todo_config.contains_key("checkboxColor") {
        todo_config.insert("checkboxColor".to_string(), "success".to_string());
    }
    configs.insert("todo-list".to_string(), todo_config);
    
    // Defaults for user-card
    if !user_config.contains_key("avatarColor") {
        user_config.insert("avatarColor".to_string(), "#667eea".to_string());
    }
    configs.insert("user-card".to_string(), user_config);
    
    // Defaults for elena-app
    let mut elena_config: HashMap<String, String> = elena_app_children.into_iter().collect();
    if !elena_config.contains_key("userCardName") {
        elena_config.insert("userCardName".to_string(), "Alice Smith".to_string());
    }
    if !elena_config.contains_key("userCardEmail") {
        elena_config.insert("userCardEmail".to_string(), "alice@example.com".to_string());
    }
    configs.insert("elena-app".to_string(), elena_config);
    
    configs
}

/// Orchestrate generation from NCL modules
pub async fn generate_app(
    project_root: &Path,
    output_dir: &Path,
    _parsed: &ParsedModuleSpec,
    server_config: &ServerConfig,
    component_names: &[String],
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
    let client_code = generate_client_from_ncl(project_root, output_dir, component_names).await?;
    fs::write(output_dir.join("src/main.ts"), client_code).await?;
    println!("✅ Generated: src/main.ts (from NCL modules)");

    // Generate vite config
    let vite_code = generate_vite_config(server_config)?;
    fs::write(output_dir.join("vite.config.ts"), vite_code).await?;
    println!("✅ Generated: vite.config.ts");

    // Generate tensor.ncl output
    let tensor_ncl = generate_tensor_ncl(output_dir, server_config, component_names, ascii)?;
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

/// Load component module from NCL file
/// For function-style modules, pass params to evaluate: makeModule { buttonColor = "..." }
async fn load_component_module(
    project_root: &Path, 
    name: &str,
    params: Option<HashMap<String, String>>
) -> anyhow::Result<NclCodeModule> {
    let ncl_path = project_root.join("modules").join(format!("{}.ncl", name));
    if !ncl_path.exists() {
        anyhow::bail!("Module file not found: {}", ncl_path.display());
    }
    
    let ncl_content = tokio::fs::read_to_string(&ncl_path).await?;
    
    // If params provided, wrap the NCL to call the function with those params
    let final_ncl = if let Some(p) = &params {
        // Build param assignments dynamically from the config HashMap
        let param_assignments: Vec<String> = p.iter()
            .map(|(key, value)| format!("{} = \"{}\"", key, value))
            .collect();
        format!(
            "let makeModule = {} in makeModule {{ {} }}",
            ncl_content,
            param_assignments.join(", ")
        )
    } else {
        ncl_content
    };
    
    let mut module = NclCodeModule::from_ncl_str(&final_ncl)
        .map_err(|e| anyhow::anyhow!("Failed to parse {}: {}", ncl_path.display(), e))?;
    
    // If there's a resource_file, load it with config interpolation
    if let Some(resource_file) = &module.resource_file {
        let resource_path = ncl_path.parent()
            .unwrap_or(Path::new("."))
            .join(resource_file);
        let code = tokio::fs::read_to_string(&resource_path).await
            .map_err(|e| anyhow::anyhow!("Failed to read resource file {}: {}", resource_path.display(), e))?;
        
        // Build config map from NCL config for interpolation
        // Keys are stored as "%{key}%" -> "value", so we use them directly
        let config_map: HashMap<String, String> = module.config_placeholders.iter()
            .map(|(k, v)| {
                // Convert %{key}% to just key for template matching
                let clean_key = k.trim_start_matches("%{").trim_end_matches("}%");
                (clean_key.to_string(), v.clone())
            })
            .collect();
        
        module = module.with_code_resource_and_config(code, &config_map);
    }
    
    Ok(module)
}

/// Generate code for a utility module by concatenating all vertices
fn generate_module_code(module: &NclCodeModule) -> anyhow::Result<String> {
    let mut code_parts = Vec::new();
    
    for vertex in &module.vertices {
        code_parts.push(vertex.text.clone());
    }
    
    Ok(code_parts.join("\n\n"))
}

/// Generate client main.ts from component NCL modules
/// Also generates separate files for utility modules
/// Fails if any component module is missing or incomplete
/// Root app is the last component that has ExprStmt (mounting) code
async fn generate_client_from_ncl(
    project_root: &Path,
    output_dir: &Path,
    component_names: &[String]
) -> anyhow::Result<String> {
    use tokio::fs;
    let mut output = String::new();
    let mut component_tags: Vec<(String, String)> = Vec::new(); // (tag_name, class_name)
    let mut loaded_modules: Vec<(String, NclCodeModule)> = Vec::new();
    
    // Read spec.md for component config
    let spec_md = fs::read_to_string(output_dir.join("spec.md")).await.unwrap_or_default();
    let all_configs = parse_spec_config(&spec_md);
    
    // Load all modules first
    for comp_name in component_names {
        // Get config for this component from spec.md
        let params = all_configs.get(comp_name).cloned();
        
        let module = load_component_module(project_root, comp_name, params)
            .await
            .map_err(|e| anyhow::anyhow!("Component '{}': {}", comp_name, e))?;
        println!("   📄 Loaded: {} (vertices: {:?})", module.name, module.vertices.iter().map(|v| &v.kind).collect::<Vec<_>>());
        loaded_modules.push((comp_name.clone(), module));
    }
    
    // Find root app (module with ExprStmt for mounting)
    let root_idx = loaded_modules.iter()
        .rposition(|(_, m)| m.vertices.iter().any(|v| v.kind == "ExprStmt"))
        .ok_or_else(|| anyhow::anyhow!("No root app found - one component must have ExprStmt for mounting"))?;
    
    // Separate modules: regular components, utility modules, root app
    let root_module = loaded_modules.remove(root_idx);
    let mut regular_components = Vec::new();
    let mut utility_modules = Vec::new();
    
    for (name, module) in loaded_modules {
        // Utility modules provide non-WebComponent interfaces and aren't web components
        let is_utility = module.provides.iter().all(|p| p.interface != "WebComponent") 
            && module.needs.is_empty();
        
        if is_utility {
            utility_modules.push((name, module));
        } else {
            regular_components.push((name, module));
        }
    }
    
    // Generate utility modules as separate files
    for (util_name, module) in &utility_modules {
        println!("   📄 Loaded utility module: {}", module.name);
        let util_code = generate_module_code(module)?;
        fs::write(output_dir.join("src").join(format!("{}.ts", util_name)), util_code).await?;
        println!("   ✅ Generated: src/{}.ts (utility module)", util_name);
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
        
        // Generate component code with placeholder replacement
        let component_code = module.generate(&module.config_placeholders)
            .map_err(|e| anyhow::anyhow!("Failed to generate code for '{}': {}", comp_name, e))?;
        output.push_str(&component_code);
        output.push('\n');
        
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

    // Component styling config from spec.md
    let component_config = r#"
  # Component styling configuration (from spec.md)
  component_config = {
    "todo-list" = {
      buttonVariant = "success",     # green (#48bb78)
      checkboxAccent = "success"   # green (#48bb78)
    },
    "user-card" = {},
    "welcome-card" = {}
  },"#;

    // Generate valid Nickel syntax with ASCII art
    let spec = format!(
        "# Phoenix Generated Specification\n{{\n  id = \"{}\",\n  name = \"{}\",\n  server = {{\n    host = \"{}\",\n    api_port = {},\n    vite_port = {}\n  }},\n{}\n  components = [{}],\n  \n  # ASCII Tensor Diagram\n  ascii = m%''\n{}'%\n}}\n",
        id, name, config.host, config.api_port, config.vite_port, component_config, components_str,
        ascii,
    );

    Ok(spec)
}