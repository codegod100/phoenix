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
    
    // Debug: print the tree structure
    if std::env::var("DEBUG_NCL").is_ok() {
        let root = tree.root_node();
        eprintln!("DEBUG: Root kind: {}", root.kind());
        eprintln!("DEBUG: Root child count: {}", root.child_count());
        for i in 0..root.child_count() {
            if let Some(child) = root.child(i) {
                eprintln!("DEBUG: Child {}: kind={}", i, child.kind());
            }
        }
    }
    
    extract_from_tree(&tree, content)
}

/// Extract data from tree-sitter parse tree
fn extract_from_tree(tree: &Tree, source: &str) -> Result<ParsedNcl, String> {
    let mut result = ParsedNcl::default();
    let root = tree.root_node();
    
    // Debug: print detailed structure
    if std::env::var("DEBUG_NCL").is_ok() {
        eprintln!("DEBUG: Traversing tree...");
        traverse_node(root, source, 0);
    }
    
    // NCL file structure: term -> uni_term -> record {...}
    // or term -> let_in with body containing record
    extract_from_term(root, source, &mut result)?;
    
    Ok(result)
}

/// Recursively traverse and print node structure
fn traverse_node(node: Node, source: &str, depth: usize) {
    let indent = "  ".repeat(depth);
    let text = node_text(node, source).unwrap_or_default();
    let preview = if text.len() > 50 { &text[..50] } else { &text };
    eprintln!("{}{}: {}...", indent, node.kind(), preview);
    
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        traverse_node(child, source, depth + 1);
    }
}

/// Extract from a term node - handles the full hierarchy
fn extract_from_term(node: Node, source: &str, result: &mut ParsedNcl) -> Result<(), String> {
    match node.kind() {
        "term" | "uni_term" | "infix_expr" | "applicative" | "record_operand" | "atom" => {
            // These are wrapper nodes - traverse down to find the actual record
            let mut cursor = node.walk();
            for child in node.children(&mut cursor) {
                extract_from_term(child, source, result)?;
            }
            Ok(())
        }
        "record" | "uni_record" => {
            extract_record_fields(node, source, result)
        }
        "let_in" => {
            // For now, just extract from the 'in' part (the body)
            if let Some(body) = node.child_by_field_name("body") {
                extract_from_term(body, source, result)?;
            }
            Ok(())
        }
        _ => Ok(()),
    }
}

/// Extract fields from a record node
fn extract_record_fields(node: Node, source: &str, result: &mut ParsedNcl) -> Result<(), String> {
    let mut generic = HashMap::new();
    
    // Handle different record node types: "record", "uni_record", "atom" containing record
    let record_node = match node.kind() {
        "record" | "uni_record" => Some(node),
        "atom" | "record_operand" | "applicative" | "infix_expr" | "uni_term" | "term" => {
            // Look for uni_record child
            let mut cursor = node.walk();
            let mut found = None;
            for child in node.children(&mut cursor) {
                if child.kind() == "uni_record" || child.kind() == "record" {
                    found = Some(child);
                    break;
                }
            }
            found
        }
        _ => None,
    };
    
    let record_node = match record_node {
        Some(n) => n,
        None => return Ok(()),
    };
    
    // Iterate over field declarations
    let mut cursor = record_node.walk();
    for child in record_node.children(&mut cursor) {
        // Handle both regular fields (field_decl) and the last field (last_field) in a record
        if child.kind() != "field_decl" && child.kind() != "last_field" {
            continue;
        }
        
        // Get field_def inside field_decl or last_field
        let mut cursor = child.walk();
        let children: Vec<_> = child.children(&mut cursor).collect();
        
        // For field_decl, look for field_def directly
        // For last_field, look for field_decl then field_def inside it
        let field_def = if child.kind() == "field_decl" {
            children.iter()
                .find(|c| c.kind() == "field_def")
                .copied()
        } else if child.kind() == "last_field" {
            // last_field contains field_decl which contains field_def
            if let Some(field_decl) = children.iter().find(|c| c.kind() == "field_decl") {
                let mut inner_cursor = field_decl.walk();
                let inner_children: Vec<_> = field_decl.children(&mut inner_cursor).collect();
                inner_children.iter().find(|c| c.kind() == "field_def").copied()
            } else {
                None
            }
        } else {
            None
        };
        
        let field_def = match field_def {
            Some(fd) => fd,
            None => continue,
        };
        
        // Extract field name from field_path
        let name = extract_field_name(field_def, source)?;
        if name.is_empty() {
            continue;
        }
        
        // Debug: print field name
        if std::env::var("DEBUG_NCL").is_ok() {
            eprintln!("DEBUG: Processing field: {}", name);
        }
        
        // Extract value
        let value_node = find_field_value_node(field_def);
        
        // Handle based on field name
        match name.as_str() {
            "template" => {
                let val = extract_string_from_node(value_node, source)?;
                if std::env::var("DEBUG_NCL").is_ok() {
                    eprintln!("DEBUG: template value: {:?}", val);
                }
                if let Some(s) = val {
                    result.template = Some(s);
                }
            }
            "build_type" => {
                if let Some(s) = extract_string_from_node(value_node, source)? {
                    result.build_type = Some(s);
                }
            }
            "name" => {
                if let Some(s) = extract_string_from_node(value_node, source)? {
                    result.name = Some(s);
                }
            }
            "version" => {
                if let Some(s) = extract_string_from_node(value_node, source)? {
                    result.version = Some(s);
                }
            }
            "description" => {
                if let Some(s) = extract_string_from_node(value_node, source)? {
                    result.description = Some(s);
                }
            }
            "flake" => {
                if let Some(node) = value_node {
                    result.flake = extract_flake(node, source)?;
                }
            }
            "pyproject" => {
                if let Some(node) = value_node {
                    result.pyproject = extract_pyproject(node, source)?;
                }
            }
            "requirements" => {
                if let Some(node) = value_node {
                    result.requirements = extract_requirements(node, source)?;
                }
            }
            "morphisms" => {
                if let Some(node) = value_node {
                    result.morphisms = extract_morphisms(node, source)?;
                }
            }
            "compositions" => {
                if let Some(node) = value_node {
                    result.compositions = extract_morphisms(node, source)?;
                }
            }
            "llm_prompt" => {
                if std::env::var("DEBUG_NCL").is_ok() {
                    eprintln!("DEBUG: Processing llm_prompt field");
                    if let Some(node) = value_node {
                        eprintln!("DEBUG: llm_prompt value_node kind: {}", node.kind());
                        // Print full tree
                        fn print_tree(node: Node, source: &str, depth: usize) {
                            let indent = "  ".repeat(depth);
                            let text = &source[node.start_byte()..node.end_byte().min(node.start_byte() + 50)];
                            eprintln!("DEBUG: {}{}: {:?}", indent, node.kind(), text.replace('\n', "\\n"));
                            let mut cursor = node.walk();
                            for child in node.children(&mut cursor) {
                                print_tree(child, source, depth + 1);
                            }
                        }
                        print_tree(node, source, 1);
                    } else {
                        eprintln!("DEBUG: llm_prompt value_node is None");
                    }
                }
                if let Some(s) = extract_string_from_node(value_node, source)? {
                    if std::env::var("DEBUG_NCL").is_ok() {
                        eprintln!("DEBUG: llm_prompt found, length: {}", s.len());
                    }
                    generic.insert(name, s);
                } else if std::env::var("DEBUG_NCL").is_ok() {
                    eprintln!("DEBUG: llm_prompt extract_string_from_node returned None");
                }
            }
            _ => {
                // Store in generic fields
                if let Some(s) = extract_string_from_node(value_node, source)? {
                    generic.insert(name, s);
                }
            }
        }
    }
    
    if !generic.is_empty() {
        result.generic = Some(generic);
    }
    
    Ok(())
}

/// Extract field name from field_def node
fn extract_field_name(field_def: Node, source: &str) -> Result<String, String> {
    let mut cursor = field_def.walk();
    
    // Find field_path
    for child in field_def.children(&mut cursor) {
        if child.kind() == "field_path" {
            // Get the first field_path_elem -> ident
            let mut elem_cursor = child.walk();
            for elem in child.children(&mut elem_cursor) {
                if elem.kind() == "field_path_elem" {
                    let mut ident_cursor = elem.walk();
                    for ident in elem.children(&mut ident_cursor) {
                        if ident.kind() == "ident" {
                            return node_text(ident, source);
                        }
                    }
                }
            }
        }
    }
    
    Ok(String::new())
}

/// Find the value node in a field_def (after the '=')
fn find_field_value_node(field_def: Node) -> Option<Node> {
    let mut cursor = field_def.walk();
    let mut found_eq = false;
    
    for child in field_def.children(&mut cursor) {
        if found_eq {
            return Some(child);
        }
        if child.kind() == "=" {
            found_eq = true;
        }
    }
    
    None
}

/// Extract string value from a node (handles term/uni_term nesting)
fn extract_string_from_node(node: Option<Node>, source: &str) -> Result<Option<String>, String> {
    let node = match node {
        Some(n) => n,
        None => return Ok(None),
    };
    
    // Navigate through term -> uni_term -> infix_expr -> applicative -> record_operand -> atom -> str_chunks
    let mut current = node;
    let kinds = ["term", "uni_term", "infix_expr", "applicative", "record_operand", "atom"];
    
    loop {
        if current.kind() == "str_chunks" || current.kind() == "str_chunks_single" {
            break;
        }
        
        // Try to find a child with one of the expected kinds
        let mut cursor = current.walk();
        let mut found = None;
        for child in current.children(&mut cursor) {
            if child.kind() == "str_chunks" || child.kind() == "str_chunks_single" 
                || child.kind() == "chunk_literal_single" || child.kind() == "str_literal" {
                found = Some(child);
                break;
            }
            if kinds.contains(&child.kind()) {
                found = Some(child);
                break;
            }
        }
        
        match found {
            Some(next) => current = next,
            None => break,
        }
    }
    
    match current.kind() {
        "str_chunks" => {
            // Check for both single-line and multiline strings
            let mut cursor = current.walk();
            for child in current.children(&mut cursor) {
                match child.kind() {
                    "str_chunks_single" => {
                        // Single-line: str_chunks_single -> chunk_literal_single -> str_literal
                        let mut inner = child.walk();
                        for chunk_lit in child.children(&mut inner) {
                            if chunk_lit.kind() == "chunk_literal_single" {
                                let mut inner2 = chunk_lit.walk();
                                for str_lit in chunk_lit.children(&mut inner2) {
                                    if str_lit.kind() == "str_literal" {
                                        let text = node_text(str_lit, source)?;
                                        let trimmed = text.trim_matches('"');
                                        return Ok(Some(trimmed.to_string()));
                                    }
                                }
                            }
                        }
                    }
                    "str_chunks_multi" => {
                        // Multiline: str_chunks_multi contains multiple chunk_literal_multi
                        let mut result = String::new();
                        let mut inner = child.walk();
                        for chunk in child.children(&mut inner) {
                            if chunk.kind() == "chunk_literal_multi" {
                                let mut inner2 = chunk.walk();
                                for literal in chunk.children(&mut inner2) {
                                    match literal.kind() {
                                        "mult_str_literal" => {
                                            let text = node_text(literal, source)?;
                                            result.push_str(&text);
                                        }
                                        "double_quote" => {
                                            result.push('"');
                                        }
                                        "str_esc_char" => {
                                            let text = node_text(literal, source)?;
                                            // Handle escaped chars like \"
                                            if text == "\\\"" {
                                                result.push('"');
                                            } else {
                                                result.push_str(&text);
                                            }
                                        }
                                        "percent" => {
                                            result.push('%');
                                        }
                                        _ => {
                                            // Debug unknown literal types in multiline strings
                                            if std::env::var("DEBUG_NCL").is_ok() {
                                                let text = node_text(literal, source).unwrap_or_default();
                                                eprintln!("DEBUG: Unknown multiline literal type: {} = {:?}", literal.kind(), text);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                        if !result.is_empty() {
                            return Ok(Some(result));
                        }
                    }
                    _ => {}
                }
            }
            Ok(None)
        }
        "str_literal" => {
            let text = node_text(current, source)?;
            let trimmed = text.trim_matches('"');
            return Ok(Some(trimmed.to_string()));
        }
        _ => Ok(None),
    }
}

/// Extract string value from a node (wrapper for compatibility)
fn extract_string(node: Node, source: &str) -> Result<Option<String>, String> {
    extract_string_from_node(Some(node), source)
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
    
    if std::env::var("DEBUG_TEMPLATE").is_ok() {
        eprintln!("DEBUG_TEMPLATE: Parsed generic fields: {:?}", parsed.generic.as_ref().map(|g| g.keys().collect::<Vec<_>>()));
    }
    
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
    
    if std::env::var("DEBUG_TEMPLATE").is_ok() {
        eprintln!("DEBUG_TEMPLATE: llm_prompt length: {}", template.llm_prompt.len());
        eprintln!("DEBUG_TEMPLATE: llm_prompt first 200 chars: {:?}", &template.llm_prompt[..template.llm_prompt.len().min(200)]);
        eprintln!("DEBUG_TEMPLATE: llm_prompt last 200 chars: {:?}", &template.llm_prompt[template.llm_prompt.len().saturating_sub(200)..]);
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

    #[test]
    fn test_parse_multiline_string_basic() {
        let spec = r#"
        {
            llm_prompt = m%"line1
line2
line3"%m
        }
        "#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        let prompt = parsed.generic.expect("Should have generic").get("llm_prompt").cloned().expect("Should have llm_prompt");
        
        assert!(prompt.contains("line1"), "Should contain line1");
        assert!(prompt.contains("line2"), "Should contain line2");
        assert!(prompt.contains("line3"), "Should contain line3");
    }

    #[test]
    fn test_parse_multiline_string_with_quotes() {
        let spec = r#"{
            content = m%"This has "quoted" text inside"%m
        }"#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        let content = parsed.generic.expect("Should have generic").get("content").cloned().expect("Should have content");
        
        assert!(content.contains("quoted"), "Should contain quoted text");
    }

    #[test]
    fn test_parse_multiline_string_with_percent() {
        let spec = r#"{
            css = m%"width: 100%
height: 50%"%m
        }"#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        let css = parsed.generic.expect("Should have generic").get("css").cloned().expect("Should have css");
        
        assert!(css.contains("100%"), "Should contain 100%");
        assert!(css.contains("50%"), "Should contain 50%");
    }

    #[test]
    fn test_parse_multiline_string_with_escaped_quotes() {
        let spec = r#"
        {
            code = m%"text = \"escaped quotes\""%m
        }
        "#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        let code = parsed.generic.expect("Should have generic").get("code").cloned().expect("Should have code");
        
        // Escaped quotes are preserved as-is in the extracted string
        assert!(code.contains("\\\"escaped quotes\\\""), "Should contain escaped quotes: got {:?}", code);
    }

    #[test]
    fn test_parse_multiline_string_with_template_vars() {
        let spec = r#"{
            prompt = m%"Hello {{name}}, welcome to {{place}}"%m
        }"#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        let prompt = parsed.generic.expect("Should have generic").get("prompt").cloned().expect("Should have prompt");
        
        assert!(prompt.contains("{{name}}"), "Should contain {{name}}");
        assert!(prompt.contains("{{place}}"), "Should contain {{place}}");
    }

    #[test]
    fn test_parse_multiline_string_long_content() {
        // Test that we don't truncate long multiline strings
        let long_line = "A".repeat(100);
        let spec = format!(r#"{{
            content = m%"{}
{}
{}"%m
        }}"#, long_line, long_line, long_line);
        
        let parsed = parse_ncl_spec(&spec, "test.ncl").expect("Should parse");
        let content = parsed.generic.expect("Should have generic").get("content").cloned().expect("Should have content");
        
        // Should contain all three lines (300+ chars)
        assert!(content.len() > 300, "Content should be > 300 chars, got {}", content.len());
    }

    #[test]
    fn test_parse_code_template_with_multiline() {
        let spec = r#"{
            code_template = m%"def main():
    print("hello")
    return 0"%m
        }"#;
        
        let parsed = parse_ncl_spec(spec, "test.ncl").expect("Should parse");
        let template = parsed.generic.expect("Should have generic").get("code_template").cloned().expect("Should have code_template");
        
        assert!(template.contains("def main()"), "Should contain function definition");
        assert!(template.contains("print(\"hello\")"), "Should contain print statement");
    }
}