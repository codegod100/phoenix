//! Lens Layer: Bidirectional Code ↔ Config Transformations
//!
//! Enables round-trip editing:
//!   Config ──[get]──► Code
//!   Code ────[put]──► Config
//!
//! This allows editing generated code and syncing changes back to spec.ncl

use std::collections::HashMap;
use std::sync::Arc;

#[cfg(feature = "panproto")]
use panproto_lens::{get, put, Complement, Lens};
#[cfg(feature = "panproto")]
use panproto_schema::{Schema, Vertex, Edge};

/// Bidirectional lens for code generation
///
/// Focuses on a specific aspect of the code that can be extracted (get)
/// and updated (put) to reflect changes back to config.
#[cfg(feature = "panproto")]
pub struct CodeLens {
    /// What this lens focuses on (e.g., "project_name", "theme")
    pub field: String,
    /// File this lens applies to
    pub file_pattern: String,
    /// Extraction pattern (regex or AST path)
    pub extractor: Extractor,
}

/// How to extract a value from code
#[cfg(feature = "panproto")]
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
#[cfg(feature = "panproto")]
#[derive(Debug, Clone)]
pub struct ExtractedValue {
    pub field: String,
    pub value: String,
    pub location: CodeLocation,
}

#[cfg(feature = "panproto")]
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
#[cfg(feature = "panproto")]
pub struct ProjectNameLens;

#[cfg(feature = "panproto")]
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

/// Lens for theme extraction/updates
#[cfg(feature = "panproto")]
pub struct ThemeLens;

#[cfg(feature = "panproto")]
impl ThemeLens {
    /// Extract theme from generated hero component
    pub fn get(code: &HashMap<String, String>) -> Option<String> {
        let hero_ts = code.get("src/hero.ts")?;
        
        // Detect theme from background gradient
        if hero_ts.contains("#FFB6C1") || hero_ts.contains("kitty") {
            Some("kitty".into())
        } else if hero_ts.contains("#667eea") {
            Some("default".into())
        } else {
            Some("unknown".into())
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
#[cfg(feature = "panproto")]
pub struct LensBundle {
    pub lenses: Vec<Box<dyn CodeLensTrait>>,
}

/// Trait for code lenses
#[cfg(feature = "panproto")]
pub trait CodeLensTrait: Send + Sync {
    fn field_name(&self) -> &str;
    fn get(&self, code: &HashMap<String, String>) -> Option<String>;
    fn put(&self, value: &str, code: &mut HashMap<String, String>) -> Result<(), String>;
}

#[cfg(feature = "panproto")]
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
#[cfg(feature = "panproto")]
pub struct SyncEngine {
    /// Last known state of generated code
    last_known: HashMap<String, String>,
    /// Lenses to apply for extraction
    lenses: LensBundle,
}

#[cfg(feature = "panproto")]
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

#[cfg(feature = "panproto")]
#[derive(Debug, Clone)]
pub struct DetectedChange {
    pub field: String,
    pub old_value: Option<String>,
    pub new_value: Option<String>,
    pub lens_type: ChangeType,
}

#[cfg(feature = "panproto")]
#[derive(Debug, Clone)]
pub enum ChangeType {
    Simple,      // Field value changed
    Structural,  // File added/removed
    Complex,     // Requires regeneration
}

/// Create default lens bundle for Lit bundle
#[cfg(feature = "panproto")]
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

// ============================================================================
// When panproto is disabled
// ============================================================================

#[cfg(not(feature = "panproto"))]
pub struct SyncEngine;

#[cfg(not(feature = "panproto"))]
impl SyncEngine {
    pub fn detect_changes(&self, _current: &HashMap<String, String>) -> Vec<()> {
        vec![]
    }
}

#[cfg(not(feature = "panproto"))]
pub fn lit_lens_bundle() -> () {
    ()
}
