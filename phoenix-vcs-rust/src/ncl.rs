//! NCL (Nickel) spec parser using nickel-lang
//!
//! Parses .ncl spec files into structured data using the official nickel-lang crate.

use nickel_lang::{Context, Expr, Record, Array};
use crate::pipeline::widget_config::WidgetConfig;
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
    /// Build type specified in spec (e.g., "python", "rust", "pyo3")
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
    /// DEPRECATED: Template merging is no longer supported.
    /// This function is now a no-op and will be removed in a future version.
    pub fn merge_template(&mut self, _template_dir: impl AsRef<Path>) {
        // Template merging is deprecated - specs are now self-contained
    }
    
    /// Convert to a panproto Theory
    pub fn to_panproto_theory(&self) -> panproto_gat::Theory {
        crate::ncl_panproto::requirements_to_theory(self)
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

/// Parse NCL spec content using nickel-lang
pub fn parse_ncl_spec(content: &str, _source_name: &str) -> Result<ParsedNcl, String> {
    // Use nickel-lang to evaluate the spec
    let mut context = Context::new();
    let expr = context.eval_deep(content)
        .map_err(|e| format!("Failed to parse NCL: {:?}", e))?;
    
    extract_from_expr(&expr)
}

/// Extract data from a Nickel Expr
fn extract_from_expr(expr: &Expr) -> Result<ParsedNcl, String> {
    let mut result = ParsedNcl::default();
    
    // Get the record from the expression
    let record = expr.as_record()
        .ok_or_else(|| "Expected a record".to_string())?;
    
    // Extract top-level fields
    result.name = get_string_field(&record, "name");
    result.version = get_string_field(&record, "version");
    result.description = get_string_field(&record, "description");
    result.build_type = get_string_field(&record, "build_type");
    
    // Extract nested records
    if let Some(flake_expr) = record.value_by_name("flake") {
        if let Some(flake_record) = flake_expr.as_record() {
            result.flake = extract_flake(&flake_record)?;
        }
    }
    
    if let Some(pyproject_expr) = record.value_by_name("pyproject") {
        if let Some(pyproject_record) = pyproject_expr.as_record() {
            result.pyproject = extract_pyproject(&pyproject_record)?;
        }
    }
    
    // Extract requirements array
    if let Some(reqs_expr) = record.value_by_name("requirements") {
        if let Some(array) = reqs_expr.as_array() {
            result.requirements = extract_requirements(&array)?;
        }
    }
    
    // Extract morphisms array
    if let Some(morphs_expr) = record.value_by_name("morphisms") {
        if let Some(array) = morphs_expr.as_array() {
            result.morphisms = extract_morphisms(&array)?;
        }
    }
    
    // Extract compositions array
    if let Some(comps_expr) = record.value_by_name("compositions") {
        if let Some(array) = comps_expr.as_array() {
            result.compositions = extract_morphisms(&array)?;
        }
    }
    
    // Extract generic fields (everything else that's a string)
    let mut generic = HashMap::new();
    for (field_name, value_opt) in record.iter() {
        // Skip already processed fields
        if matches!(field_name, "name" | "version" | "description" | "build_type" | "flake" | "pyproject" | "requirements" | "morphisms" | "compositions") {
            continue;
        }
        if let Some(value_expr) = value_opt {
            if let Some(s) = value_expr.as_str() {
                generic.insert(field_name.to_string(), s.to_string());
            }
        }
    }
    
    if !generic.is_empty() {
        result.generic = Some(generic);
    }
    
    Ok(result)
}

/// Get a string field from a record
fn get_string_field(record: &Record, name: &str) -> Option<String> {
    record.value_by_name(name)?.as_str().map(|s| s.to_string())
}

/// Extract flake config from a record
fn extract_flake(record: &Record) -> Result<Option<FlakeConfig>, String> {
    let mut config = FlakeConfig::default();
    
    config.pname = get_string_field(record, "pname");
    config.version = get_string_field(record, "version");
    config.description = get_string_field(record, "description");
    config.build_type = get_string_field(record, "build_type");
    config.main_program = get_string_field(record, "main_program");
    config.src_path = get_string_field(record, "src_path");
    config.source_root = get_string_field(record, "source_root");
    config.cargo_subdir = get_string_field(record, "cargo_subdir");
    config.post_patch = get_string_field(record, "post_patch");
    config.pre_build = get_string_field(record, "pre_build");
    config.install_phase = get_string_field(record, "install_phase");
    config.extra_nix = get_string_field(record, "extra_nix");
    
    if let Some(expr) = record.value_by_name("build_inputs") {
        if let Some(array) = expr.as_array() {
            config.build_inputs = extract_string_array(&array)?;
        }
    }
    if let Some(expr) = record.value_by_name("native_build_inputs") {
        if let Some(array) = expr.as_array() {
            config.native_build_inputs = extract_string_array(&array)?;
        }
    }
    if let Some(expr) = record.value_by_name("propagated_build_inputs") {
        if let Some(array) = expr.as_array() {
            config.propagated_build_inputs = extract_string_array(&array)?;
        }
    }
    
    Ok(Some(config))
}

/// Extract pyproject config from a record
fn extract_pyproject(record: &Record) -> Result<Option<PyProjectConfig>, String> {
    let mut config = PyProjectConfig {
        requires_python: ">=3.12".to_string(),
        ..Default::default()
    };
    
    if let Some(s) = get_string_field(record, "requires_python") {
        config.requires_python = s;
    }
    config.entry_point = get_string_field(record, "entry_point");
    
    if let Some(expr) = record.value_by_name("build_system") {
        if let Some(array) = expr.as_array() {
            config.build_system = extract_string_array(&array)?;
        }
    }
    if let Some(expr) = record.value_by_name("dependencies") {
        if let Some(array) = expr.as_array() {
            config.dependencies = extract_string_array(&array)?;
        }
    }
    if let Some(expr) = record.value_by_name("dev_dependencies") {
        if let Some(array) = expr.as_array() {
            config.dev_dependencies = extract_string_array(&array)?;
        }
    }
    if let Some(expr) = record.value_by_name("packages") {
        if let Some(array) = expr.as_array() {
            config.packages = extract_string_array(&array)?;
        }
    }
    
    Ok(Some(config))
}

/// Extract string array from Nickel Array
fn extract_string_array(array: &Array) -> Result<Vec<String>, String> {
    let mut result = Vec::new();
    for i in 0..array.len() {
        if let Some(expr) = array.get(i) {
            if let Some(s) = expr.as_str() {
                result.push(s.to_string());
            }
        }
    }
    Ok(result)
}

/// Extract requirements from an array of records
fn extract_requirements(array: &Array) -> Result<Vec<NclRequirement>, String> {
    let mut result = Vec::new();
    
    for i in 0..array.len() {
        if let Some(expr) = array.get(i) {
            if let Some(record) = expr.as_record() {
                let id = get_string_field(&record, "id").unwrap_or_default();
                let description = get_string_field(&record, "description").unwrap_or_default();
                let priority = get_string_field(&record, "priority").unwrap_or_else(|| "must".to_string());
                let protocol = get_string_field(&record, "protocol").unwrap_or_default();
                let language = get_string_field(&record, "language")
                    .unwrap_or_else(|| infer_language(&protocol));
                
                if description.is_empty() {
                    continue;
                }
                
                let final_id = if id.is_empty() {
                    let normalized = crate::identity::normalize_text(&description);
                    crate::identity::canon_id(&normalized)
                } else {
                    id
                };
                
                result.push(NclRequirement {
                    id: final_id,
                    description,
                    priority,
                    protocol: protocol.clone(),
                    language,
                });
            }
        }
    }
    
    Ok(result)
}

/// Extract morphisms from an array of records
fn extract_morphisms(array: &Array) -> Result<Vec<NclMorphism>, String> {
    let mut result = Vec::new();
    
    for i in 0..array.len() {
        if let Some(expr) = array.get(i) {
            if let Some(record) = expr.as_record() {
                let name = get_string_field(&record, "morphism")
                    .or_else(|| get_string_field(&record, "name"))
                    .or_else(|| get_string_field(&record, "result"))
                    .unwrap_or_default();
                
                if name.is_empty() {
                    continue;
                }
                
                let domain = get_string_field(&record, "domain").unwrap_or_default();
                let codomain = get_string_field(&record, "codomain").unwrap_or_default();
                let output_path = get_string_field(&record, "output_path");
                let language = get_string_field(&record, "language")
                    .unwrap_or_else(|| {
                        output_path.as_ref()
                            .map(|p| infer_language_from_path(p))
                            .unwrap_or_else(|| "both".to_string())
                    });
                
                let generation_content = if let Some(gen_expr) = record.value_by_name("generation") {
                    if let Some(gen_record) = gen_expr.as_record() {
                        get_string_field(&gen_record, "content")
                    } else {
                        None
                    }
                } else {
                    None
                };
                
                result.push(NclMorphism {
                    name,
                    domain,
                    codomain,
                    output_path,
                    language,
                    generation_content,
                });
            }
        }
    }
    
    Ok(result)
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
/// 
/// DEPRECATED: Template loading is no longer supported.
/// Returns a default empty template.
pub fn load_code_template(_template_dir: impl AsRef<Path>, _template_name: &str) -> Result<CodeTemplate, String> {
    // Template loading is deprecated - return default empty template
    Ok(CodeTemplate::default())
}

/// Parse a code template from NCL content
/// 
/// DEPRECATED: Template parsing is no longer supported.
/// Returns a default empty template.
fn parse_code_template(_content: &str) -> Result<CodeTemplate, String> {
    Ok(CodeTemplate::default())
}

/// Extract UI widget configuration from NCL content
/// 
/// This uses nickel-lang to extract structured widget trees.
pub fn extract_ui_config(content: &str) -> Option<crate::pipeline::widget_config::UIConfig> {
    use crate::pipeline::widget_config::{UIConfig, WidgetConfig, map_widget_type};
    
    // Parse the NCL content
    let mut context = Context::new();
    let expr = context.eval_deep(content).ok()?;
    let record = expr.as_record()?;
    
    let mut config = UIConfig::default();
    
    // Extract title from name field
    config.title = get_string_field(&record, "name");
    
    // Extract ui_config.layout.widgets - need to keep intermediates alive
    let ui_config_expr = record.value_by_name("ui_config")?;
    let ui_config = ui_config_expr.as_record()?;
    let layout_expr = ui_config.value_by_name("layout")?;
    let layout = layout_expr.as_record()?;
    
    // Check for layout properties
    if let Some(layout_type) = get_string_field(&layout, "type") {
        config.layout_type = Some(layout_type);
    }
    if let Some(cols) = get_string_field(&layout, "columns") {
        if let Ok(n) = cols.parse::<i32>() {
            config.grid_columns = Some(n);
        }
    }
    if let Some(rows) = get_string_field(&layout, "rows") {
        config.grid_rows = Some(rows);
    }
    if let Some(gap) = get_string_field(&layout, "gap") {
        if let Ok(n) = gap.parse::<i32>() {
            config.grid_gap = Some(n);
        }
    }
    
    // Extract widgets
    if let Some(widgets_expr) = layout.value_by_name("widgets") {
        if let Some(array) = widgets_expr.as_array() {
            // Array format
            for i in 0..array.len() {
                if let Some(widget_expr) = array.get(i) {
                    if let Some(widget) = parse_widget_expr(&widget_expr, &format!("widget_{}", i)) {
                        config.widgets.push(widget);
                    }
                }
            }
        } else if let Some(widgets_record) = widgets_expr.as_record() {
            // Record format: widgets = { header = {...}, sidebar = {...} }
            for widget_name in ["header", "sidebar", "main", "footer"] {
                if let Some(widget_expr) = widgets_record.value_by_name(widget_name) {
                    if let Some(widget) = parse_widget_expr(&widget_expr, widget_name) {
                        config.widgets.push(widget);
                    }
                }
            }
        }
    }
    
    // Detect if any widget is a list
    config.has_list = config.widgets.iter()
        .any(|w| w.widget_type == "ListView" || 
             w.children.iter().any(|c| c.widget_type == "ListView"));
    
    if config.widgets.is_empty() {
        None
    } else {
        Some(config)
    }
}

/// Parse a widget from a Nickel expression
fn parse_widget_expr(expr: &Expr, default_id: &str) -> Option<WidgetConfig> {
    use crate::pipeline::widget_config::{WidgetConfig, map_widget_type};
    
    let record = expr.as_record()?;
    
    let wtype = get_string_field(&record, "type")
        .map(|t| map_widget_type(&t))
        .unwrap_or_else(|| "Static".to_string());
    
    let mut widget = WidgetConfig::new(wtype);
    widget.id = get_string_field(&record, "id").or_else(|| Some(default_id.to_string()));
    widget.title = get_string_field(&record, "title");
    widget.content = get_string_field(&record, "content");
    
    // Extract properties
    let props = ["show_clock", "subtitle", "max_lines", "follow_tail", 
                 "scroll_keys", "show_bindings", "show_commands", "focusable",
                 "focus_order", "css_class", "row", "col", "col_span", "row_span",
                 "items", "capture_keys", "on_select"];
    for prop in props {
        if let Some(val) = get_string_field(&record, prop) {
            widget.props.push((prop.to_string(), val));
        }
    }
    
    // Parse children if present
    if let Some(children_expr) = record.value_by_name("children") {
        if let Some(array) = children_expr.as_array() {
            for i in 0..array.len() {
                if let Some(child_expr) = array.get(i) {
                    let child_id = format!("{}_child_{}", default_id, i);
                    if let Some(child_widget) = parse_widget_expr(&child_expr, &child_id) {
                        widget.children.push(child_widget);
                    }
                }
            }
        }
    }
    
    Some(widget)
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
    fn test_parse_template_with_flake() {
        let template = r#"
        {
            template_name = "python-test",
            flake = {
                build_type = "python",
                propagated_build_inputs = ["textual"],
            },
        }
        "#;
        
        let parsed = parse_ncl_spec(template, "test.ncl").expect("Should parse");
        
        assert!(parsed.flake.is_some(), "Should have flake config");
        let flake = parsed.flake.unwrap();
        assert_eq!(flake.build_type, Some("python".to_string()));
        assert!(flake.propagated_build_inputs.contains(&"textual".to_string()));
    }

    #[test]
    fn test_parse_template_array_deps() {
        let template = r#"
        {
            flake = {
                propagated_build_inputs = ["textual", "rich", "requests"],
            },
        }
        "#;
        
        let parsed = parse_ncl_spec(template, "test.ncl").expect("Should parse");
        let flake = parsed.flake.expect("Should have flake");
        
        assert_eq!(flake.propagated_build_inputs.len(), 3);
        assert!(flake.propagated_build_inputs.contains(&"textual".to_string()));
        assert!(flake.propagated_build_inputs.contains(&"rich".to_string()));
        assert!(flake.propagated_build_inputs.contains(&"requests".to_string()));
    }

    #[test]
    fn test_parse_requirements() {
        let template = r#"
        {
            requirements = [
                {
                    description = "Display a simple UI",
                    protocol = "UI",
                    priority = "must",
                },
                {
                    description = "Handle keyboard input",
                    protocol = "Input",
                },
            ],
        }
        "#;
        
        let parsed = parse_ncl_spec(template, "test.ncl").expect("Should parse");
        
        assert_eq!(parsed.requirements.len(), 2);
        assert_eq!(parsed.requirements[0].description, "Display a simple UI");
        assert_eq!(parsed.requirements[0].protocol, "UI");
        assert_eq!(parsed.requirements[0].priority, "must");
        assert_eq!(parsed.requirements[1].description, "Handle keyboard input");
        assert_eq!(parsed.requirements[1].protocol, "Input");
        assert_eq!(parsed.requirements[1].priority, "must"); // Default
    }
}
