//! Lens Layer: Bidirectional Code ↔ Config Transformations
//!
//! Enables round-trip editing:
//!   Config ──[get]──► Code
//!   Code ────[put]──► Config
//!
//! This allows editing generated code and syncing changes back to spec.ncl

use std::collections::HashMap;
use std::sync::Arc;


use panproto_lens::{get, put, Complement, Lens};

use panproto_schema::{Schema, Vertex, Edge};

/// Trait for bundle-specific lens implementations
/// 
/// Each bundle defines its own lenses for extracting/updating values
pub trait BundleLenses: Send + Sync {
    /// Name of the bundle (e.g., "lit", "nodejs-express")
    fn bundle_name(&self) -> &str;
    
    /// List of files to scan for changes (relative to project root)
    fn tracked_files(&self) -> Vec<&str>;
    
    /// Extract all detectable values from the code
    fn extract_values(&self, code: &HashMap<String, String>) -> Vec<(&str, String)>;
    
    /// Get a specific value by field name
    fn get(&self, field: &str, code: &HashMap<String, String>) -> Option<String>;
    
    /// Check if a field is supported
    fn supports_field(&self, field: &str) -> bool;
}

/// Lit bundle lenses
pub struct LitBundleLenses;

impl BundleLenses for LitBundleLenses {
    fn bundle_name(&self) -> &str {
        "lit"
    }
    
    fn tracked_files(&self) -> Vec<&str> {
        vec!["package.json", "src/main.ts"]
    }
    
    fn extract_values(&self, code: &HashMap<String, String>) -> Vec<(&str, String)> {
        let mut values = Vec::new();
        
        if let Some(name) = ProjectNameLens::get(code) {
            values.push(("project_name", name));
        }
        if let Some(version) = VersionLens::get(code) {
            values.push(("version", version));
        }
        if let Some(theme) = ThemeLens::get(code) {
            values.push(("theme", theme));
        }
        
        values
    }
    
    fn get(&self, field: &str, code: &HashMap<String, String>) -> Option<String> {
        match field {
            "project_name" => ProjectNameLens::get(code),
            "version" => VersionLens::get(code),
            "theme" => ThemeLens::get(code),
            _ => None,
        }
    }
    
    fn supports_field(&self, field: &str) -> bool {
        matches!(field, "project_name" | "version" | "theme")
    }
}

/// Node.js/Express bundle lenses
pub struct NodeJsExpressBundleLenses;

impl BundleLenses for NodeJsExpressBundleLenses {
    fn bundle_name(&self) -> &str {
        "nodejs-express"
    }
    
    fn tracked_files(&self) -> Vec<&str> {
        vec!["package.json", "app.js"]
    }
    
    fn extract_values(&self, code: &HashMap<String, String>) -> Vec<(&str, String)> {
        let mut values = Vec::new();
        
        if let Some(name) = ProjectNameLens::get(code) {
            values.push(("project_name", name));
        }
        if let Some(routes) = ExpressRoutesLens::get(code) {
            values.push(("routes", routes));
        }
        
        values
    }
    
    fn get(&self, field: &str, code: &HashMap<String, String>) -> Option<String> {
        match field {
            "project_name" => ProjectNameLens::get(code),
            "routes" => ExpressRoutesLens::get(code),
            _ => None,
        }
    }
    
    fn supports_field(&self, field: &str) -> bool {
        matches!(field, "project_name" | "routes")
    }
}

/// Express routes lens - detects API routes from app.js
pub struct ExpressRoutesLens;

impl ExpressRoutesLens {
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        let app_js = code.get("app.js")?;
        
        // Count HTTP method calls
        let mut routes = Vec::new();
        
        if app_js.contains("app.get(") {
            routes.push("GET");
        }
        if app_js.contains("app.post(") {
            routes.push("POST");
        }
        if app_js.contains("app.put(") {
            routes.push("PUT");
        }
        if app_js.contains("app.delete(") {
            routes.push("DELETE");
        }
        
        if routes.is_empty() {
            None
        } else {
            Some(routes.join(","))
        }
    }
}

/// Python/Flask bundle lenses
pub struct PythonFlaskBundleLenses;

impl BundleLenses for PythonFlaskBundleLenses {
    fn bundle_name(&self) -> &str {
        "python-flask"
    }
    
    fn tracked_files(&self) -> Vec<&str> {
        vec!["setup.py", "pyproject.toml", "app.py"]
    }
    
    fn extract_values(&self, code: &HashMap<String, String>) -> Vec<(&str, String)> {
        let mut values = Vec::new();
        
        if let Some(name) = PythonProjectNameLens::get(code) {
            values.push(("project_name", name));
        }
        if let Some(routes) = FlaskRoutesLens::get(code) {
            values.push(("routes", routes));
        }
        
        values
    }
    
    fn get(&self, field: &str, code: &HashMap<String, String>) -> Option<String> {
        match field {
            "project_name" => PythonProjectNameLens::get(code),
            "routes" => FlaskRoutesLens::get(code),
            _ => None,
        }
    }
    
    fn supports_field(&self, field: &str) -> bool {
        matches!(field, "project_name" | "routes")
    }
}

/// Python project name lens (reads setup.py or pyproject.toml)
pub struct PythonProjectNameLens;

impl PythonProjectNameLens {
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        // Try pyproject.toml first
        if let Some(pyproject) = code.get("pyproject.toml") {
            if let Ok(parsed) = pyproject.parse::<toml::Value>() {
                if let Some(name) = parsed.get("project")
                    .and_then(|p| p.get("name"))
                    .and_then(|n| n.as_str()) {
                    return Some(name.to_string());
                }
            }
        }
        
        // Fall back to setup.py
        if let Some(setup_py) = code.get("setup.py") {
            // Simple regex-like extraction
            for line in setup_py.lines() {
                if line.contains("name=") || line.contains("name =") {
                    let parts: Vec<&str> = line.split("'").collect();
                    if parts.len() >= 2 {
                        return Some(parts[1].to_string());
                    }
                    let parts: Vec<&str> = line.split('"').collect();
                    if parts.len() >= 2 {
                        return Some(parts[1].to_string());
                    }
                }
            }
        }
        
        None
    }
}

/// Flask routes lens
pub struct FlaskRoutesLens;

impl FlaskRoutesLens {
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        let app_py = code.get("app.py")?;
        
        let mut routes = Vec::new();
        
        if app_py.contains("@app.route") {
            // Extract route patterns
            for line in app_py.lines() {
                if line.contains("@app.route") {
                    if let Some(start) = line.find('"') {
                        if let Some(end) = line[start+1..].find('"') {
                            let route = &line[start+1..start+1+end];
                            routes.push(route.to_string());
                        }
                    }
                }
            }
        }
        
        if routes.is_empty() {
            None
        } else {
            Some(routes.join(","))
        }
    }
}

/// Rust bundle lenses
pub struct RustBundleLenses;

impl BundleLenses for RustBundleLenses {
    fn bundle_name(&self) -> &str {
        "rust"
    }
    
    fn tracked_files(&self) -> Vec<&str> {
        vec!["Cargo.toml", "src/main.rs"]
    }
    
    fn extract_values(&self, code: &HashMap<String, String>) -> Vec<(&str, String)> {
        let mut values = Vec::new();
        
        if let Some(name) = RustProjectNameLens::get(code) {
            values.push(("project_name", name));
        }
        
        values
    }
    
    fn get(&self, field: &str, code: &HashMap<String, String>) -> Option<String> {
        match field {
            "project_name" => RustProjectNameLens::get(code),
            _ => None,
        }
    }
    
    fn supports_field(&self, field: &str) -> bool {
        matches!(field, "project_name")
    }
}

/// Rust project name lens (reads Cargo.toml)
pub struct RustProjectNameLens;

impl RustProjectNameLens {
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        let cargo_toml = code.get("Cargo.toml")?;
        
        // Parse TOML
        if let Ok(parsed) = cargo_toml.parse::<toml::Value>() {
            if let Some(name) = parsed.get("package")
                .and_then(|p| p.get("name"))
                .and_then(|n| n.as_str()) {
                return Some(name.to_string());
            }
        }
        
        None
    }
}

/// Factory for getting bundle lenses
pub fn get_bundle_lenses(bundle_name: &str) -> Option<Box<dyn BundleLenses>> {
    match bundle_name {
        "lit" | "thlit" => Some(Box::new(LitBundleLenses)),
        "nodejs-express" | "node" | "nodejs" | "express" => Some(Box::new(NodeJsExpressBundleLenses)),
        "python-flask" | "flask" => Some(Box::new(PythonFlaskBundleLenses)),
        "rust" => Some(Box::new(RustBundleLenses)),
        // Add more bundles here
        _ => None,
    }
}

/// Auto-detect bundle from spec.ncl content
pub fn detect_bundle_from_spec(spec_content: &str) -> Option<String> {
    fn extract_value(line: &str) -> Option<String> {
        // Extract value after = sign
        let after_eq = line.split('=').nth(1)?;
        
        // Extract quoted string
        let start_quote = after_eq.find(['"', '\''].as_ref())?;
        let after_start = &after_eq[start_quote + 1..];
        let end_quote = after_start.find(['"', '\''].as_ref())?;
        
        let value = &after_start[..end_quote];
        Some(value.trim().to_string())
    }
    
    // Check for template field first (most reliable)
    for line in spec_content.lines() {
        if line.contains("template = ") && !line.trim().starts_with('#') {
            if let Some(template) = extract_value(line) {
                return Some(template);
            }
        }
    }
    
    // Fall back to theory_name
    for line in spec_content.lines() {
        if line.contains("theory_name = ") && !line.trim().starts_with('#') {
            if let Some(theory) = extract_value(line) {
                return Some(theory.to_lowercase());
            }
        }
    }
    
    None
}

/// Bidirectional lens for code generation
///
/// Focuses on a specific aspect of the code that can be extracted (get)
/// and updated (put) to reflect changes back to config.

pub struct CodeLens {
    /// What this lens focuses on (e.g., "project_name", "theme")
    pub field: String,
    /// File this lens applies to
    pub file_pattern: String,
    /// Extraction pattern (regex or AST path)
    pub extractor: Extractor,
}

/// How to extract a value from code

#[derive(Debug, Clone)]
pub enum Extractor {
    /// Regex pattern with capture group
    Regex { pattern: String, group: usize },
    /// JSON field path
    JsonPath { path: Vec<String> },
    /// AST node selector
    AstSelector { node_type: String, field: String },
}

/// Result of extracting a value from code

#[derive(Debug, Clone)]
pub struct ExtractedValue {
    pub field: String,
    pub value: String,
    pub location: CodeLocation,
}


#[derive(Debug, Clone)]
pub struct CodeLocation {
    pub file: String,
    pub line: usize,
    pub column: usize,
}

/// Lens implementation for project name
///
/// get: Extract "name" from package.json
/// put: Update "name" in package.json

pub struct ProjectNameLens;


impl ProjectNameLens {
    /// Extract project name from package.json
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        let package_json = code.get("package.json")?;
        
        // Parse JSON and extract name field
        let parsed: serde_json::Value = serde_json::from_str(package_json).ok()?;
        parsed.get("name")?.as_str().map(|s| s.to_string())
    }
    
    /// Update project name in package.json
    pub fn put(name: &str, code: &mut HashMap<String, String>) -> Result<(), String> {
        let package_json = code.get_mut("package.json")
            .ok_or("package.json not found")?;
        
        // Parse, update, serialize back
        let mut parsed: serde_json::Value = serde_json::from_str(package_json)
            .map_err(|e| format!("Parse error: {}", e))?;
        
        if let Some(obj) = parsed.as_object_mut() {
            obj.insert("name".into(), serde_json::Value::String(name.into()));
        }
        
        *package_json = serde_json::to_string_pretty(&parsed)
            .map_err(|e| format!("Serialize error: {}", e))?;
        
        Ok(())
    }
}

/// Version lens - extracts version from package.json

pub struct VersionLens;


impl VersionLens {
    /// Extract version from package.json
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        let package_json = code.get("package.json")?;
        
        // Parse JSON and extract version field
        let parsed: serde_json::Value = serde_json::from_str(package_json).ok()?;
        parsed.get("version")?.as_str().map(|s| s.to_string())
    }
}

/// Lens for theme extraction/updates

pub struct ThemeLens;


impl ThemeLens {
    /// Extract theme from generated hero component
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        let main_ts = code.get("src/main.ts")?;
        
        // Detect theme from visual indicators
        if main_ts.contains("#FFB6C1") || main_ts.contains("🐾") {
            Some("kitty".into())
        } else if main_ts.contains("#00ff41") || main_ts.contains("⚡") || main_ts.contains("cyberpunk") {
            Some("cyberpunk".into())
        } else if main_ts.contains("#667eea") {
            Some("default".into())
        } else {
            Some("custom".into())
        }
    }
    
    /// Update theme in hero component (requires regeneration)
    /// 
    /// Note: Theme changes affect multiple files, so this
    /// updates the config and triggers full regeneration
    pub fn put(theme: &str, _code: &mut HashMap<String, String>) -> Result<(), String> {
        // Theme changes require full regeneration
        // Return info about what needs to change
        Err(format!(
            "Theme change '{}' requires spec.ncl update and full regeneration. \
             Edit spec.ncl phoenix_config.theme = '{}' and run phoenix generate",
            theme, theme
        ))
    }
}

/// Collection of lenses for a bundle

pub struct LensBundle {
    pub lenses: Vec<Box<dyn CodeLensTrait>>,
}

/// Trait for code lenses

pub trait CodeLensTrait: Send + Sync {
    fn field_name(&self) -> &str;
    fn get(&self, code: &HashMap<String, String>) -> Option<String>;
    fn put(&self, value: &str, code: &mut HashMap<String, String>) -> Result<(), String>;
}


impl CodeLensTrait for CodeLens {
    fn field_name(&self) -> &str {
        &self.field
    }
    
    fn get(&self, code: &HashMap<String, String>) -> Option<String> {
        match &self.extractor {
            Extractor::Regex { pattern, group } => {
                let file = code.get(&self.file_pattern)?;
                let regex = regex::Regex::new(pattern).ok()?;
                regex.captures(file)
                    .and_then(|cap| cap.get(*group))
                    .map(|m| m.as_str().to_string())
            }
            _ => None,
        }
    }
    
    fn put(&self, _value: &str, _code: &mut HashMap<String, String>) -> Result<(), String> {
        // Implement put based on extractor type
        unimplemented!("CodeLens::put not yet implemented")
    }
}

/// Sync engine: Detect changes and upstream to config

pub struct SyncEngine {
    /// Last known state of generated code
    last_known: HashMap<String, String>,
    /// Lenses to apply for extraction
    lenses: LensBundle,
}


impl SyncEngine {
    pub fn new(lenses: LensBundle) -> Self {
        Self {
            last_known: HashMap::new(),
            lenses,
        }
    }
    
    /// Detect changes between last known and current code
    pub fn detect_changes(
        &self,
        current: &HashMap<String, String>,
    ) -> Vec<DetectedChange> {
        let mut changes = Vec::new();
        
        // Check each lens for changes
        for lens in &self.lenses.lenses {
            let old_value = lens.get(&self.last_known);
            let new_value = lens.get(current);
            
            if old_value != new_value {
                changes.push(DetectedChange {
                    field: lens.field_name().into(),
                    old_value,
                    new_value,
                    lens_type: ChangeType::Simple,
                });
            }
        }
        
        // Also check for structural changes (files added/removed)
        for (file, _) in current {
            if !self.last_known.contains_key(file) {
                changes.push(DetectedChange {
                    field: file.clone(),
                    old_value: None,
                    new_value: Some("<new file>".into()),
                    lens_type: ChangeType::Structural,
                });
            }
        }
        
        changes
    }
    
    /// Update last known state
    pub fn snapshot(&mut self, code: &HashMap<String, String>) {
        self.last_known = code.clone();
    }
    
    /// Generate spec.ncl updates from detected changes
    pub fn upstream_changes(&self, changes: &[DetectedChange]) -> String {
        let mut updates = String::new();
        updates.push_str("// Changes detected in generated code:\n");
        
        for change in changes {
            match &change.new_value {
                Some(new_val) => {
                    updates.push_str(&format!(
                        "// {}: {:?} -> {}\n",
                        change.field, change.old_value, new_val
                    ));
                    
                    // Generate nickel assignment
                    updates.push_str(&format!(
                        "phoenix_config.{} = \"{}\"\n\n",
                        change.field, new_val
                    ));
                }
                None => {
                    updates.push_str(&format!(
                        "// {}: removed\n",
                        change.field
                    ));
                }
            }
        }
        
        updates.push_str("// Apply these to spec.ncl and regenerate\n");
        updates
    }
}


#[derive(Debug, Clone)]
pub struct DetectedChange {
    pub field: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub lens_type: ChangeType,
}


#[derive(Debug, Clone)]
pub enum ChangeType {
    Simple,      // Field value changed
    Structural,  // File added/removed
    Complex,     // Requires regeneration
}

/// Create default lens bundle for Lit bundle

pub fn lit_lens_bundle() -> LensBundle {
    let lenses: Vec<Box<dyn CodeLensTrait>> = vec![
        Box::new(CodeLens {
            field: "project_name".into(),
            file_pattern: "package.json".into(),
            extractor: Extractor::JsonPath {
                path: vec!["name".into()],
            },
        }),
        Box::new(CodeLens {
            field: "version".into(),
            file_pattern: "package.json".into(),
            extractor: Extractor::JsonPath {
                path: vec!["version".into()],
            },
        }),
    ];
    
    LensBundle { lenses }
}
