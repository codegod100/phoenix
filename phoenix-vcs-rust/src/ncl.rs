//! NCL (Nickel) spec parser using tree-sitter-nickel
//!
//! Parses .ncl spec files into structured data using the tree-sitter parser.
//! This avoids the complexity of full Nickel evaluation and works with panproto.

use tree_sitter::{Node, Parser, Tree};
use std::path::Path;
use std::collections::HashMap;

/// A requirement extracted from NCL
#[derive(Debug, Clone)]
pub struct NclRequirement {
    pub id: String,
    pub description: String,
    pub priority: String,
    pub protocol: String,
    pub language: String,
}

/// A morphism with generation info extracted from NCL
#[derive(Debug, Clone)]
pub struct NclMorphism {
    pub name: String,
    pub domain: String,
    pub codomain: String,
    pub output_path: Option<String>,
    pub language: String,
    pub generation_content: Option<String>,
}

/// Parsed NCL content - can contain multiple spec types from one file
#[derive(Debug, Clone, Default)]
pub struct ParsedNcl {
    /// Panproto-style theory with sorts, ops, equations
    pub theory: Option<TheoryData>,
    /// Requirements from protocols
    pub requirements: Vec<NclRequirement>,
    /// Morphisms with generation blocks
    pub morphisms: Vec<NclMorphism>,
    /// Compositions with generation blocks
    pub compositions: Vec<NclMorphism>,
    /// Flake configuration (merged from template + spec)
    pub flake: Option<FlakeConfig>,
    /// PyProject configuration (for Python projects)
    pub pyproject: Option<PyProjectConfig>,
    /// Generic record content
    pub generic: Option<HashMap<String, String>>,
    /// Template name to use for code generation (e.g., "python-textual", "rust")
    /// Takes precedence over build_type inference
    pub template: Option<String>,
    /// Build type specified in spec (e.g., "python", "rust", "pyo3")
    /// Used for both template selection and flake configuration
    pub build_type: Option<String>,
    /// Top-level name from spec (used as pname if no flake.pname)
    pub name: Option<String>,
    /// Top-level version from spec (used as version if no flake.version)
    pub version: Option<String>,
    /// Top-level description from spec (used as description if no flake.description)
    pub description: Option<String>,
}

impl ParsedNcl {
    /// Load and merge template configuration
    /// 
    /// Priority: explicit `template` field > `build_type` field > none
    pub fn merge_template(&mut self, template_dir: impl AsRef<Path>) {
        // Determine which template to load: explicit template > build_type > none
        let template_name = self.template.clone()
            .or_else(|| self.build_type.clone());
        
        if let Some(ref template_name) = template_name {
            let template_path = template_dir.as_ref().join(format!("{}.ncl", template_name));
            if let Ok(template_content) = std::fs::read_to_string(&template_path) {
                if let Ok(template_parsed) = parse_ncl_spec(&template_content, &template_path.to_string_lossy()) {
                    // Create a spec FlakeConfig from top-level fields if no flake section exists
                    let spec_flake = self.flake.clone().or_else(|| {
                        // Only create synthetic flake config if we have at least name
                        self.name.as_ref().map(|name| FlakeConfig {
                            pname: Some(name.clone()),
                            version: self.version.clone(),
                            description: self.description.clone(),
                            build_type: self.build_type.clone().or_else(|| template_parsed.build_type.clone()),
                            ..Default::default()
                        })
                    });
                    
                    // Merge template flake config into spec
                    if let Some(template_flake) = template_parsed.flake {
                        self.flake = Some(merge_flake_configs(&template_flake, spec_flake.as_ref()));
                    }
                    
                    // Merge pyproject config - spec overrides template
                    if self.pyproject.is_none() {
                        if let Some(template_pyproject) = template_parsed.pyproject {
                            self.pyproject = Some(template_pyproject);
                        } else if template_name.starts_with("python") {
                            // Use default Python config
                            self.pyproject = Some(PyProjectConfig::python_default());
                        }
                    }
                    
                    // Merge generic fields from template
                    if let Some(template_generic) = template_parsed.generic {
                        let mut merged = template_generic.clone();
                        if let Some(ref spec_generic) = self.generic {
                            merged.extend(spec_generic.clone());
                        }
                        self.generic = Some(merged);
                    }
                }
            }
        }
    }
}

/// Theory data from NCL
#[derive(Debug, Clone)]
pub struct TheoryData {
    pub id: String,
    pub description: String,
    pub sorts: Vec<HashMap<String, String>>,
    pub ops: Vec<HashMap<String, String>>,
}

/// Flake.nix configuration
#[derive(Debug, Clone, Default)]
pub struct FlakeConfig {
    pub pname: Option<String>,
    pub version: Option<String>,
    pub description: Option<String>,
    pub build_type: Option<String>,
    pub build_inputs: Vec<String>,
    pub native_build_inputs: Vec<String>,
    pub propagated_build_inputs: Vec<String>,
    pub main_program: Option<String>,
    pub src_path: Option<String>,
    pub source_root: Option<String>,
    pub cargo_subdir: Option<String>,
    pub post_patch: Option<String>,
    pub pre_build: Option<String>,
    pub install_phase: Option<String>,
    pub extra_nix: Option<String>,
}

/// PyProject.toml configuration for Python projects
#[derive(Debug, Clone, Default)]
pub struct PyProjectConfig {
    pub build_system: Vec<String>,
    pub requires_python: String,
    pub dependencies: Vec<String>,
    pub dev_dependencies: Vec<String>,
    pub entry_point: Option<String>,
    pub packages: Vec<String>,
}

impl PyProjectConfig {
    /// Create default Python config
    pub fn python_default() -> Self {
        Self {
            build_system: vec!["hatchling".to_string()],
            requires_python: ">=3.12".to_string(),
            dependencies: vec![],
            dev_dependencies: vec![],
            entry_point: Some("src.app:main".to_string()),
            packages: vec!["src".to_string()],
        }
    }
}

/// Merge two flake configs - spec overrides template
fn merge_flake_configs(template: &FlakeConfig, spec: Option<&FlakeConfig>) -> FlakeConfig {
    let mut result = template.clone();
    
    if let Some(s) = spec {
        if s.pname.is_some() { result.pname = s.pname.clone(); }
        if s.version.is_some() { result.version = s.version.clone(); }
        if s.description.is_some() { result.description = s.description.clone(); }
        if s.build_type.is_some() { result.build_type = s.build_type.clone(); }
        if !s.build_inputs.is_empty() { result.build_inputs = s.build_inputs.clone(); }
        if !s.native_build_inputs.is_empty() { result.native_build_inputs = s.native_build_inputs.clone(); }
        if !s.propagated_build_inputs.is_empty() { result.propagated_build_inputs = s.propagated_build_inputs.clone(); }
        if s.main_program.is_some() { result.main_program = s.main_program.clone(); }
        if s.src_path.is_some() { result.src_path = s.src_path.clone(); }
        if s.source_root.is_some() { result.source_root = s.source_root.clone(); }
        if s.cargo_subdir.is_some() { result.cargo_subdir = s.cargo_subdir.clone(); }
        if s.post_patch.is_some() { result.post_patch = s.post_patch.clone(); }
        if s.pre_build.is_some() { result.pre_build = s.pre_build.clone(); }
        if s.install_phase.is_some() { result.install_phase = s.install_phase.clone(); }
        if s.extra_nix.is_some() { result.extra_nix = s.extra_nix.clone(); }
    }
    
    result
}

/// Parse an NCL spec file
pub fn parse_ncl_file<P: AsRef<Path>>(path: P) -> Result<ParsedNcl, String> {
    let path = path.as_ref();
    let content = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read {}: {}", path.display(), e))?;
    parse_ncl_spec(&content, path.to_str().unwrap_or("unknown.ncl"))
}

/// Parse NCL spec content using tree-sitter-nickel
pub fn parse_ncl_spec(content: &str, _source_name: &str) -> Result<ParsedNcl, String> {
    let mut parser = Parser::new();
    parser
        .set_language(&tree_sitter_nickel::LANGUAGE.into())
        .map_err(|e| format!("Failed to set language: {}", e))?;
    
    let tree = parser
        .parse(content, None)
        .ok_or_else(|| "Failed to parse".to_string())?;
    
    extract_from_tree(&tree, content)
}

/// Extract data from tree-sitter parse tree
fn extract_from_tree(tree: &Tree, source: &str) -> Result<ParsedNcl, String> {
    let mut result = ParsedNcl::default();
    let root = tree.root_node();
    
    // NCL file structure: typically a record {...} or let ... in {...}
    for i in 0..root.child_count() {
        let child = root.child(i).unwrap();
        
        match child.kind() {
            "record" => {
                extract_record_fields(child, source, &mut result)?;
            }
            "let_in" => {
                // For now, just extract from the 'in' part (the body)
                if let Some(body) = child.child_by_field_name("body") {
                    let kind: &str = body.kind();
                    if kind == "record" {
                        extract_record_fields(body, source, &mut result)?;
                    }
                }
            }
            _ => {}
        }
    }
    
    Ok(result)
}

/// Extract fields from a record node
fn extract_record_fields(node: Node, source: &str, result: &mut ParsedNcl) -> Result<(), String> {
    let mut generic = HashMap::new();
    
    // Find record_field_list
    let mut cursor = node.walk();
    for field_list in node.children_by_field_name("field_list", &mut cursor) {
        let mut field_cursor = field_list.walk();
        for field in field_list.children(&mut field_cursor) {
            if field.kind() != "field" {
                continue;
            }
            
            // Get field name
            let name_node = field.child_by_field_name("name")
                .ok_or_else(|| "Field missing name".to_string())?;
            let name = node_text(name_node, source)?;
            
            // Get field value
            let value_node = field.child_by_field_name("value")
                .ok_or_else(|| format!("Field '{}' missing value", name))?;
            
            // Handle based on field name
            match name.as_str() {
                "template" => {
                    if let Some(s) = extract_string(value_node, source)? {
                        result.template = Some(s);
                    }
                }
                "build_type" => {
                    if let Some(s) = extract_string(value_node, source)? {
                        result.build_type = Some(s);
                    }
                }
                "name" => {
                    if let Some(s) = extract_string(value_node, source)? {
                        result.name = Some(s);
                    }
                }
                "version" => {
                    if let Some(s) = extract_string(value_node, source)? {
                        result.version = Some(s);
                    }
                }
                "description" => {
                    if let Some(s) = extract_string(value_node, source)? {
                        result.description = Some(s);
                    }
                }
                "flake" => {
                    result.flake = extract_flake(value_node, source)?;
                }
                "pyproject" => {
                    result.pyproject = extract_pyproject(value_node, source)?;
                }
                "requirements" => {
                    result.requirements = extract_requirements(value_node, source)?;
                }
                "morphisms" => {
                    result.morphisms = extract_morphisms(value_node, source)?;
                }
                "compositions" => {
                    result.compositions = extract_morphisms(value_node, source)?;
                }
                _ => {
                    // Store in generic fields
                    if let Some(s) = extract_string(value_node, source)? {
                        generic.insert(name, s);
                    }
                }
            }
        }
    }
    
    if !generic.is_empty() {
        result.generic = Some(generic);
    }
    
    Ok(())
}

/// Extract string value from a node
fn extract_string(node: Node, source: &str) -> Result<Option<String>, String> {
    match node.kind() {
        "str" | "multistring" => {
            let text = node_text(node, source)?;
            // Remove quotes
            if text.starts_with('"') && text.ends_with('"') {
                return Ok(Some(text[1..text.len()-1].to_string()));
            }
            if text.starts_with("m%\"") && text.ends_with("\"") {
                // Handle m%"..." (single %)
                return Ok(Some(text[3..text.len()-1].to_string()));
            }
            if text.starts_with("m%\"") {
                // Handle m%"..."%m or m%%"..."%%m etc
                let end_marker = find_multistring_end(&text);
                if let Some(end_pos) = end_marker {
                    return Ok(Some(text[3..end_pos].to_string()));
                }
            }
            Ok(Some(text))
        }
        _ => Ok(None),
    }
}

/// Find the end position of a multiline string content
fn find_multistring_end(text: &str) -> Option<usize> {
    // For m%"..."%m pattern, find the closing
    if let Some(pos) = text.rfind("\"%m") {
        return Some(pos);
    }
    None
}

/// Extract text from a node
fn node_text(node: Node, source: &str) -> Result<String, String> {
    let start = node.start_byte();
    let end = node.end_byte();
    if end > source.len() {
        return Err("Node extends past source".to_string());
    }
    Ok(source[start..end].to_string())
}

/// Extract flake config from a record node
fn extract_flake(node: Node, source: &str) -> Result<Option<FlakeConfig>, String> {
    if node.kind() != "record" {
        return Ok(None);
    }
    
    let mut config = FlakeConfig::default();
    
    let mut cursor = node.walk();
    for field_list in node.children_by_field_name("field_list", &mut cursor) {
        let mut field_cursor = field_list.walk();
        for field in field_list.children(&mut field_cursor) {
            if field.kind() != "field" {
                continue;
            }
            
            let name_node = field.child_by_field_name("name")
                .ok_or_else(|| "Field missing name".to_string())?;
            let name = node_text(name_node, source)?;
            
            let value_node = field.child_by_field_name("value")
                .ok_or_else(|| format!("Field '{}' missing value", name))?;
            
            match name.as_str() {
                "pname" => config.pname = extract_string(value_node, source)?,
                "version" => config.version = extract_string(value_node, source)?,
                "description" => config.description = extract_string(value_node, source)?,
                "build_type" => config.build_type = extract_string(value_node, source)?,
                "main_program" => config.main_program = extract_string(value_node, source)?,
                "src_path" => config.src_path = extract_string(value_node, source)?,
                "source_root" => config.source_root = extract_string(value_node, source)?,
                "cargo_subdir" => config.cargo_subdir = extract_string(value_node, source)?,
                "post_patch" => config.post_patch = extract_string(value_node, source)?,
                "pre_build" => config.pre_build = extract_string(value_node, source)?,
                "install_phase" => config.install_phase = extract_string(value_node, source)?,
                "extra_nix" => config.extra_nix = extract_string(value_node, source)?,
                "build_inputs" => config.build_inputs = extract_string_array(value_node, source)?,
                "native_build_inputs" => config.native_build_inputs = extract_string_array(value_node, source)?,
                "propagated_build_inputs" => config.propagated_build_inputs = extract_string_array(value_node, source)?,
                _ => {}
            }
        }
    }
    
    Ok(Some(config))
}

/// Extract pyproject config from a record node
fn extract_pyproject(node: Node, source: &str) -> Result<Option<PyProjectConfig>, String> {
    if node.kind() != "record" {
        return Ok(None);
    }
    
    let mut config = PyProjectConfig {
        requires_python: ">=3.12".to_string(),
        ..Default::default()
    };
    
    let mut cursor = node.walk();
    for field_list in node.children_by_field_name("field_list", &mut cursor) {
        let mut field_cursor = field_list.walk();
        for field in field_list.children(&mut field_cursor) {
            if field.kind() != "field" {
                continue;
            }
            
            let name_node = field.child_by_field_name("name")
                .ok_or_else(|| "Field missing name".to_string())?;
            let name = node_text(name_node, source)?;
            
            let value_node = field.child_by_field_name("value")
                .ok_or_else(|| format!("Field '{}' missing value", name))?;
            
            match name.as_str() {
                "requires_python" => {
                    if let Some(s) = extract_string(value_node, source)? {
                        config.requires_python = s;
                    }
                }
                "entry_point" => config.entry_point = extract_string(value_node, source)?,
                "build_system" => config.build_system = extract_string_array(value_node, source)?,
                "dependencies" => config.dependencies = extract_string_array(value_node, source)?,
                "dev_dependencies" => config.dev_dependencies = extract_string_array(value_node, source)?,
                "packages" => config.packages = extract_string_array(value_node, source)?,
                _ => {}
            }
        }
    }
    
    Ok(Some(config))
}

/// Extract array of strings
fn extract_string_array(node: Node, source: &str) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    
    if node.kind() != "array" {
        return Ok(result);
    }
    
    let mut cursor = node.walk();
    for elem in node.children_by_field_name("elements", &mut cursor) {
        if let Some(s) = extract_string(elem, source)? {
            result.push(s);
        }
    }
    
    Ok(result)
}

/// Extract requirements from array
fn extract_requirements(node: Node, source: &str) -> Result<Vec<NclRequirement>, String> {
    let mut result = Vec::new();
    
    if node.kind() != "array" {
        return Ok(result);
    }
    
    let mut cursor = node.walk();
    for elem in node.children(&mut cursor) {
        if elem.kind() == "record" {
            if let Some(req) = extract_requirement(elem, source)? {
                result.push(req);
            }
        }
    }
    
    Ok(result)
}

/// Extract single requirement from record
fn extract_requirement(node: Node, source: &str) -> Result<Option<NclRequirement>, String> {
    let mut id = String::new();
    let mut description = String::new();
    let mut priority = String::from("must");
    let mut protocol = String::new();
    let mut language = String::new();
    
    let mut cursor = node.walk();
    for field_list in node.children_by_field_name("field_list", &mut cursor) {
        let mut field_cursor = field_list.walk();
        for field in field_list.children(&mut field_cursor) {
            if field.kind() != "field" {
                continue;
            }
            
            let name_node = field.child_by_field_name("name")
                .ok_or_else(|| "Field missing name".to_string())?;
            let name = node_text(name_node, source)?;
            
            let value_node = field.child_by_field_name("value")
                .ok_or_else(|| format!("Field '{}' missing value", name))?;
            
            match name.as_str() {
                "id" => id = extract_string(value_node, source)?.unwrap_or_default(),
                "description" => description = extract_string(value_node, source)?.unwrap_or_default(),
                "priority" => priority = extract_string(value_node, source)?.unwrap_or_else(|| "must".to_string()),
                "protocol" => protocol = extract_string(value_node, source)?.unwrap_or_default(),
                "language" => language = extract_string(value_node, source)?.unwrap_or_default(),
                _ => {}
            }
        }
    }
    
    if description.is_empty() {
        return Ok(None);
    }
    
    if id.is_empty() {
        // Generate ID from description hash
        let normalized = crate::identity::normalize_text(&description);
        id = crate::identity::canon_id(&normalized);
    }
    
    Ok(Some(NclRequirement {
        id,
        description,
        priority,
        protocol: protocol.clone(),
        language: if language.is_empty() { infer_language(&protocol) } else { language },
    }))
}

/// Extract morphisms from array
fn extract_morphisms(node: Node, source: &str) -> Result<Vec<NclMorphism>, String> {
    let mut result = Vec::new();
    
    if node.kind() != "array" {
        return Ok(result);
    }
    
    let mut cursor = node.walk();
    for elem in node.children(&mut cursor) {
        if elem.kind() == "record" {
            if let Some(morph) = extract_morphism(elem, source)? {
                result.push(morph);
            }
        }
    }
    
    Ok(result)
}

/// Extract single morphism from record
fn extract_morphism(node: Node, source: &str) -> Result<Option<NclMorphism>, String> {
    let mut name = String::new();
    let mut domain = String::new();
    let mut codomain = String::new();
    let mut output_path = None;
    let mut language = String::new();
    let mut generation_content = None;
    
    let mut cursor = node.walk();
    for field_list in node.children_by_field_name("field_list", &mut cursor) {
        let mut field_cursor = field_list.walk();
        for field in field_list.children(&mut field_cursor) {
            if field.kind() != "field" {
                continue;
            }
            
            let name_node = field.child_by_field_name("name")
                .ok_or_else(|| "Field missing name".to_string())?;
            let field_name = node_text(name_node, source)?;
            
            let value_node = field.child_by_field_name("value")
                .ok_or_else(|| format!("Field '{}' missing value", field_name))?;
            
            match field_name.as_str() {
                "morphism" | "name" | "result" => {
                    name = extract_string(value_node, source)?.unwrap_or_default();
                }
                "domain" => {
                    domain = extract_string(value_node, source)?.unwrap_or_default();
                }
                "codomain" => {
                    codomain = extract_string(value_node, source)?.unwrap_or_default();
                }
                "output_path" => {
                    output_path = extract_string(value_node, source)?;
                }
                "language" => {
                    language = extract_string(value_node, source)?.unwrap_or_default();
                }
                "generation" => {
                    generation_content = extract_generation(value_node, source)?;
                }
                _ => {}
            }
        }
    }
    
    if name.is_empty() {
        return Ok(None);
    }
    
    if language.is_empty() {
        if let Some(ref path) = output_path {
            language = infer_language_from_path(path);
        } else {
            language = "both".to_string();
        }
    }
    
    Ok(Some(NclMorphism {
        name,
        domain,
        codomain,
        output_path,
        language,
        generation_content,
    }))
}

/// Extract generation content from record
fn extract_generation(node: Node, source: &str) -> Result<Option<String>, String> {
    // For now, just return the raw text content
    if node.kind() == "record" {
        let mut cursor = node.walk();
        for field_list in node.children_by_field_name("field_list", &mut cursor) {
            let mut field_cursor = field_list.walk();
            for field in field_list.children(&mut field_cursor) {
                if field.kind() != "field" {
                    continue;
                }
                
                let name_node = field.child_by_field_name("name")
                    .ok_or_else(|| "Field missing name".to_string())?;
                let name = node_text(name_node, source)?;
                
                if name == "content" {
                    let value_node = field.child_by_field_name("value")
                        .ok_or_else(|| "content field missing value".to_string())?;
                    
                    return Ok(extract_string(value_node, source)?);
                }
            }
        }
    }
    
    Ok(None)
}

/// Infer language from protocol name
fn infer_language(protocol: &str) -> String {
    match protocol {
        "IRC-Core" | "IRC-CTCP" | "IRC-SASL" => "python".to_string(),
        "Nix-Package" => "nix".to_string(),
        "Rust-Lib" => "rust".to_string(),
        _ => "both".to_string(),
    }
}

/// Infer language from output path
fn infer_language_from_path(path: &str) -> String {
    if path.ends_with(".py") {
        "python".to_string()
    } else if path.ends_with(".rs") {
        "rust".to_string()
    } else if path.ends_with(".nix") {
        "nix".to_string()
    } else {
        "both".to_string()
    }
}

/// Code template for generating files
#[derive(Debug, Clone, Default)]
pub struct CodeTemplate {
    pub language: String,
    pub framework: Option<String>,
    pub output_path: String,
    pub code_template: String,
    pub llm_prompt: String,
    pub dependencies: Vec<String>,
    pub entry_point: Option<String>,
}

impl CodeTemplate {
    /// Render the template with variable substitutions
    pub fn render(&self, vars: &HashMap<String, String>) -> String {
        let mut result = self.code_template.clone();
        for (key, value) in vars {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, value);
        }
        result
    }
    
    /// Render the LLM prompt with variable substitutions
    pub fn render_prompt(&self, vars: &HashMap<String, String>) -> String {
        if self.llm_prompt.is_empty() {
            return String::new();
        }
        let mut result = self.llm_prompt.clone();
        for (key, value) in vars {
            let placeholder = format!("{{{{{}}}}}", key);
            result = result.replace(&placeholder, value);
        }
        result
    }
}

/// Load a code template from a template directory
pub fn load_code_template(template_dir: impl AsRef<Path>, template_name: &str) -> Result<CodeTemplate, String> {
    let template_path = template_dir.as_ref().join(format!("{}.ncl", template_name));
    
    if !template_path.exists() {
        return Err(format!("Template file not found: {:?}", template_path));
    }
    
    let content = std::fs::read_to_string(&template_path)
        .map_err(|e| format!("Failed to read template: {}", e))?;
    
    parse_code_template(&content)
}

/// Parse a code template from NCL content
fn parse_code_template(content: &str) -> Result<CodeTemplate, String> {
    let parsed = parse_ncl_spec(content, "template")?;
    
    let mut template = CodeTemplate::default();
    
    if let Some(ref generic) = parsed.generic {
        template.language = generic.get("language").cloned().unwrap_or_default();
        template.framework = generic.get("framework").cloned();
        template.output_path = generic.get("output_path").cloned().unwrap_or_else(|| "src/app.py".to_string());
        template.code_template = generic.get("code_template").cloned().unwrap_or_default();
        template.llm_prompt = generic.get("llm_prompt").cloned().unwrap_or_default();
    }
    
    if let Some(ref pyproject) = parsed.pyproject {
        template.dependencies = pyproject.dependencies.clone();
        template.entry_point = pyproject.entry_point.clone();
    }
    
    Ok(template)
}

/// Parse all NCL spec files in a directory
pub fn parse_ncl_specs_in_dir<P: AsRef<Path>>(dir: P) -> Result<HashMap<String, ParsedNcl>, String> {
    let mut result = HashMap::new();
    
    for entry in std::fs::read_dir(dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        
        if path.extension().map_or(false, |ext| ext == "ncl") {
            let name = path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string();
            
            match parse_ncl_file(&path) {
                Ok(spec) => { result.insert(name, spec); }
                Err(e) => eprintln!("Warning: Failed to parse {}: {}", path.display(), e),
            }
        }
    }
    
    Ok(result)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_record() {
        let spec = r#"
        {
            name = "test.theory",
            description = "A test theory",
        }
        "#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        assert_eq!(parsed.name, Some("test.theory".to_string()));
        assert_eq!(parsed.description, Some("A test theory".to_string()));
    }
}