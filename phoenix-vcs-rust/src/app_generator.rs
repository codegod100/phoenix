//! App Generation from NCL Module Definitions
//!
//! Each module now self-describes its code generation in its .ncl file.
//! Phoenix just orchestrates: reads NCL → builds schema → emits code.

use std::collections::{HashMap, HashSet};
use std::path::{Path, PathBuf};
use crate::codegen::ncl_module::{NclCodeModule, Strategy};
use crate::kitty::module_bridge::ParsedModuleSpec;

/// Convert PascalCase to kebab-case (TodoList -> todo-list)
fn pascal_to_kebab(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() && i > 0 {
            result.push('-');
        }
        result.push(c.to_lowercase().next().unwrap_or(c));
    }
    result
}

/// Generic spec.md config parser - knows nothing about specific modules
/// Parses format: ### ModuleName followed by - `key` = `value` lines
/// Also extracts child component props from HTML-like tags: <tag-name prop="value">
/// And global Theme Configuration section
fn parse_spec_config(spec_md: &str) -> HashMap<String, HashMap<String, String>> {
    let mut configs: HashMap<String, HashMap<String, String>> = HashMap::new();
    let mut current_module: Option<String> = None;
    let mut in_theme_section = false;
    let mut in_framework_section = false;
    let mut global_framework = "lit".to_string(); // default
    
    // Parse global config first
    for line in spec_md.lines() {
        // Track Theme Configuration section
        if line.starts_with("## Theme Configuration") {
            in_theme_section = true;
            in_framework_section = false;
            continue;
        }
        // Track Framework Configuration section
        if line.starts_with("## Framework Configuration") {
            in_framework_section = true;
            in_theme_section = false;
            continue;
        }
        if line.starts_with("## ") && !line.contains("Theme") && !line.contains("Framework") {
            in_theme_section = false;
            in_framework_section = false;
        }
        
        // Parse theme: `value` format in theme section
        if in_theme_section && line.contains("Theme: `") {
            if let Some(start) = line.find('`') {
                if let Some(end) = line[start+1..].find('`') {
                    let theme_name = &line[start+1..start+1+end];
                    // Theme applies to all modules that need it
                    configs.entry("style-utils".to_string())
                        .or_insert_with(HashMap::new)
                        .insert("themeName".to_string(), theme_name.to_string());
                }
            }
        }
        
        // Parse Frontend Framework: `value` format in framework section
        if in_framework_section && line.contains("Frontend Framework: `") {
            if let Some(start) = line.find('`') {
                if let Some(end) = line[start+1..].find('`') {
                    global_framework = line[start+1..start+1+end].to_string();
                }
            }
        }
        
        // Track current module: ### ModuleName
        if line.starts_with("### ") {
            let module_name = line[4..].trim().split_whitespace().next().unwrap_or("");
            current_module = Some(pascal_to_kebab(module_name));
            in_theme_section = false; // Theme section ends when modules start
            in_framework_section = false;
            continue;
        }
        
        let Some(ref module) = current_module else { continue };
        let trimmed = line.trim();
        
        // Parse Config: `key` = `value` format
        // Matches: - `buttonColor` = `orange` or - Config: `key` = `value`
        if (trimmed.starts_with("- `") || trimmed.starts_with("- Config: `")) && trimmed.contains("` = `") {
            // Extract key and value from backticks
            let parts: Vec<&str> = trimmed.split('`').collect();
            if parts.len() >= 5 {
                let key = parts[1].trim();
                let value = parts[3].trim();
                
                configs.entry(module.clone())
                    .or_insert_with(HashMap::new)
                    .insert(key.to_string(), value.to_string());
            }
        }
        
        // Parse child component props from HTML-like tags
        // Matches: - `<tag-name prop="value" prop2="value2">`
        if trimmed.starts_with("- `<") {
            // Find tag content between < and >
            if let Some(start) = trimmed.find("<") {
                if let Some(end) = trimmed.find(">") {
                    let tag_content = &trimmed[start+1..end];
                    
                    // Extract tag name (before first space, =, or ")
                    let tag_name = tag_content.split(&[' ', '=', '"'][..]).next().unwrap_or("");
                    
                    // Convert kebab-case tag to camelCase prefix: user-card -> userCard
                    let parts: Vec<&str> = tag_name.split('-').collect();
                    let prefix = if parts.is_empty() {
                        String::new()
                    } else {
                        parts[0].to_lowercase() + &parts[1..].iter().map(|s| {
                            let mut c = s.chars();
                            match c.next() {
                                None => String::new(),
                                Some(f) => f.to_uppercase().collect::<String>() + c.as_str()
                            }
                        }).collect::<String>()
                    };
                    
                    // Skip past the tag name to find attributes
                    let after_tag = &tag_content[tag_name.len()..];
                    
                    // Extract prop="value" pairs manually
                    let mut chars = after_tag.chars().peekable();
                    while chars.peek().is_some() {
                        // Skip to find prop name
                        let mut prop_name = String::new();
                        for c in &mut chars {
                            if c == '=' { break; }
                            if c.is_alphanumeric() || c == '-' { prop_name.push(c); }
                        }
                        
                        // Check for opening quote
                        if chars.peek() == Some(&'"') {
                            chars.next(); // consume "
                            
                            // Collect value until closing quote
                            let mut prop_value = String::new();
                            for c in &mut chars {
                                if c == '"' { break; }
                                prop_value.push(c);
                            }
                            
                            // Create key: prefix + Capitalized prop
                            if !prop_name.is_empty() && !prop_value.is_empty() {
                                let capitalized_prop = prop_name.chars().next().unwrap().to_uppercase().to_string() + &prop_name[1..];
                                let config_key = format!("{}{}", prefix, capitalized_prop);
                                
                                configs.entry(module.clone())
                                    .or_insert_with(HashMap::new)
                                    .insert(config_key, prop_value);
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Store global framework in _global entry for all components to access
    configs.entry("_global".to_string())
        .or_insert_with(HashMap::new)
        .insert("framework".to_string(), global_framework);
    
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

    // Copy shared component logic file
    let logic_src = project_root.join("modules/component-logic.ts");
    if logic_src.exists() {
        let logic_code = std::fs::read_to_string(&logic_src)?;
        fs::write(output_dir.join("src/component-logic.ts"), logic_code).await?;
        println!("✅ Generated: src/component-logic.ts (shared logic)");
    }

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
    
    // Find a server module (infrastructure with generation protocol, but NOT lit-core or elenajs-core)
    let modules: Vec<_> = std::fs::read_dir(&modules_dir)?
        .filter_map(|e| e.ok())
        .filter(|e| e.path().extension().map(|ext| ext == "ncl").unwrap_or(false))
        .filter_map(|e| NclCodeModule::from_ncl_file(&e.path()).ok())
        .filter(|m| m.is_infrastructure && m.protocol == "typescript")
        .filter(|m| !m.id.contains("lit-core") && !m.id.contains("elenajs-core") && !m.id.contains("vite"))
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

/// Resolve imports in NCL content by inlining them
/// Replaces `import "file.ncl"` with the actual file content
/// Also handles dynamic imports with placeholders like `import "theme-%{themeName}%.ncl"`
async fn resolve_ncl_imports(project_root: &Path, content: &str, params: Option<&HashMap<String, String>>) -> anyhow::Result<String> {
    let import_regex = regex::Regex::new(r#"import\s+"([^"]+)""#).unwrap();
    
    // First, replace placeholders with param values in the content
    let mut result = content.to_string();
    if let Some(p) = params {
        for (key, value) in p {
            // Replace %{key}% with value (full placeholder syntax)
            result = result.replace(&format!("%{{{}}}%", key), value);
        }
    }
    
    // Now find all imports (with placeholders resolved) and inline them
    // Keep looping until no more imports found (for nested imports)
    loop {
        let mut found_import = false;
        let mut new_result = result.clone();
        
        for cap in import_regex.captures_iter(&result) {
            if let Some(import_path) = cap.get(1) {
                let import_file = import_path.as_str();
                let full_path = project_root.join("modules").join(import_file);
                
                // Check if file exists before trying to read
                if full_path.exists() {
                    let import_content = tokio::fs::read_to_string(&full_path).await
                        .map_err(|e| anyhow::anyhow!("Failed to read import {}: {}", full_path.display(), e))?;
                    
                    // Replace the import statement with the content
                    let full_import = cap.get(0).unwrap().as_str();
                    new_result = new_result.replace(full_import, &format!("({})", import_content.trim()));
                    found_import = true;
                }
            }
        }
        
        result = new_result;
        if !found_import {
            break;
        }
    }
    
    Ok(result)
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
    
    // Resolve imports by inlining them (with param substitution for dynamic imports)
    let resolved_content = resolve_ncl_imports(project_root, &ncl_content, params.as_ref()).await?;
    
    // If params provided, wrap the NCL to call the function with those params
    let final_ncl = if let Some(p) = &params {
        // Build param assignments dynamically from the config HashMap
        let param_assignments: Vec<String> = p.iter()
            .map(|(key, value)| format!("{} = \"{}\"", key, value))
            .collect();
        format!(
            "let makeModule = {} in makeModule {{ {} }}",
            resolved_content,
            param_assignments.join(", ")
        )
    } else {
        resolved_content
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
    
    // Extract global theme and framework from config
    let global_theme = all_configs.get("style-utils")
        .and_then(|c| c.get("themeName"))
        .cloned()
        .unwrap_or_else(|| "catppuccin-mocha".to_string());
    
    let global_framework = all_configs.get("_global")
        .and_then(|c| c.get("framework"))
        .cloned()
        .unwrap_or_else(|| "lit".to_string());
    
    // Load all modules first
    for comp_name in component_names {
        // Get config for this component from spec.md
        let mut params = all_configs.get(comp_name).cloned().unwrap_or_default();
        
        // Inject themeName and framework if not already set
        if !params.contains_key("themeName") {
            params.insert("themeName".to_string(), global_theme.clone());
        }
        if !params.contains_key("framework") {
            params.insert("framework".to_string(), global_framework.clone());
        }
        
        let module = load_component_module(project_root, comp_name, Some(params))
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
    
    // Analyze what frameworks are needed by components
    let mut required_frameworks: HashSet<String> = HashSet::new();
    for (_, module) in &regular_components {
        for need in &module.needs {
            if need.interface == "WebFramework" {
                if let Strategy::Named { name } = &need.strategy {
                    required_frameworks.insert(name.clone());
                }
            }
        }
    }
    
    // Also check root module
    for need in &root_module.1.needs {
        if need.interface == "WebFramework" {
            if let Strategy::Named { name } = &need.strategy {
                required_frameworks.insert(name.clone());
            }
        }
    }
    
    // Generate imports from framework modules
    let mut framework_imports: Vec<String> = Vec::new();
    for framework_name in &required_frameworks {
        let framework_module = load_component_module(project_root, framework_name, None).await
            .map_err(|e| anyhow::anyhow!("Framework module '{}': {}", framework_name, e))?;
        
        // Emit ImportDecl vertices from framework
        for vertex in &framework_module.vertices {
            if vertex.kind == "ImportDecl" {
                framework_imports.push(vertex.text.clone());
            }
        }
        println!("   📄 Loaded framework: {}", framework_module.name);
    }
    
    // Add framework imports
    for import_line in framework_imports {
        output.push_str(&import_line);
    }
    
    // Add utility imports
    output.push_str("import { StyleUtils, theme } from './style-utils';\n\n");
    
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
    
    // Components are already registered via @customElement decorator
    // No need for manual customElements.define() calls
    
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