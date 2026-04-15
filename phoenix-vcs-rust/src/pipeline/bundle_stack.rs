//! Generic 4-Layer Panproto Stack for All Bundles
//!
//! This module provides a trait-based abstraction of the complete
//! panproto architecture that any bundle can implement.
//!
//! Architecture:
//! ```
//! Bundle (trait)
//!   ├── Layer 1: Theory (GAT)
//!   │   └── Sorts, Operations, Equations
//!   ├──
//!   │   ├── Layer 2: Schema (Graph)
//!   │   │   └── SchemaCompiler: Theory → Schema
//!   │   ├── Layer 3: Lens (Bidirectional)
//!   │   │   └── SyncLens: Code ↔ Config
//!   │   └── Layer 4: Expr (Code Generation)
//!       └── CodeGenerator: Config → Code
//! ```

use std::collections::HashMap;
use std::path::PathBuf;

// ============================================================================
// Layer 1: Theory (GAT - Generalized Algebraic Theory)
// ============================================================================

/// Theory definition for a bundle
/// 
/// This is the mathematical foundation - sorts (types) and operations
/// that define the structure of artifacts in this domain.
pub trait Theory {
    /// Theory name (e.g., "ThLit", "ThExpress")
    fn name(&self) -> &str;
    
    /// Sorts (types) in this theory
    fn sorts(&self) -> Vec<Sort>;
    
    /// Operations (constructors) in this theory
    fn operations(&self) -> Vec<Operation>;
    
    /// Equations (algebraic laws) that must hold
    fn equations(&self) -> Vec<Equation>;
}

/// A sort (type) in the theory
#[derive(Debug, Clone)]
pub struct Sort {
    pub name: String,
    pub kind: SortKind,
    pub description: String,
}

#[derive(Debug, Clone)]
pub enum SortKind {
    /// Value sort (string, number, etc)
    Value { value_kind: String },
    /// Structural sort (object, array)
    Structural,
    /// Reference to another sort
    Ref(String),
}

/// An operation (constructor) in the theory
#[derive(Debug, Clone)]
pub struct Operation {
    pub name: String,
    pub inputs: Vec<(String, String)>, // (param_name, sort_name)
    pub output: String, // sort_name
    pub description: String,
}

/// An equation (algebraic law)
#[derive(Debug, Clone)]
pub struct Equation {
    pub name: String,
    pub left: String,
    pub right: String,
    pub description: String,
}

use std::sync::Arc;

// ============================================================================
// Layer 2: Schema (Graph Structure)
// ============================================================================

/// Schema compiler: Converts Theory to Schema graph
/// 
/// This layer provides graph-based structure for validating
/// and navigating relationships between artifacts.
pub trait SchemaCompiler {
    /// Compile theory to schema graph
    fn compile(&self, theory: &dyn Theory) -> Schema;
}

/// Schema graph representing structure
#[derive(Debug, Clone)]
pub struct Schema {
    /// Vertices (nodes) - artifacts, types, values
    pub vertices: Vec<Vertex>,
    /// Edges - relationships, dependencies
    pub edges: Vec<Edge>,
    /// Constraints - invariants that must hold
    pub constraints: Vec<Constraint>,
}

#[derive(Debug, Clone)]
pub struct Vertex {
    pub id: String,
    pub kind: VertexKind,
    pub data: HashMap<String, String>,
}

#[derive(Debug, Clone)]
pub enum VertexKind {
    Artifact,  // Generated file
    Type,      // Data type
    Value,     // Concrete value
    Config,    // Configuration entry
}

#[derive(Debug, Clone)]
pub struct Edge {
    pub from: String,
    pub to: String,
    pub kind: EdgeKind,
    pub label: String,
}

#[derive(Debug, Clone)]
pub enum EdgeKind {
    DependsOn,    // Artifact depends on another
    Generates,    // Config generates artifact
    Contains,     // Parent contains child
    References,   // References external
}

#[derive(Clone)]
pub struct Constraint {
    pub name: String,
    pub check: Arc<dyn Fn(&Schema) -> bool + Send + Sync>,
}

impl std::fmt::Debug for Constraint {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        f.debug_struct("Constraint")
            .field("name", &self.name)
            .field("check", &"<function>")
            .finish()
    }
}

// ============================================================================
// Layer 3: Lens (Bidirectional Transformations)
// ============================================================================

/// Sync lens: Bidirectional Code ↔ Config transformation
/// 
/// This is the core of round-trip editing. It provides:
/// - get: Code → Config values (extract)
/// - put: Config → Code updates (apply)
pub trait SyncLens {
    /// Unique identifier for this lens
    fn id(&self) -> &str;
    
    /// Fields this lens can sync
    fn supported_fields(&self) -> &[&str];
    
    /// Get: Extract values from code
    fn get(&self, code: &HashMap<String, String>) -> HashMap<String, String>;
    
    /// Put: Apply values to code (returns updated code)
    fn put(&self, code: &HashMap<String, String>, updates: &HashMap<String, String>) -> HashMap<String, String>;
    
    /// Compare: Find differences between code and expected config
    fn compare(&self, code: &HashMap<String, String>, spec_content: &str) -> Vec<Change>;
}

/// A detected change
#[derive(Debug, Clone)]
pub struct Change {
    pub field: String,
    pub old_value: String,
    pub new_value: String,
    pub change_type: ChangeType,
    pub description: String,
}

#[derive(Debug, Clone)]
pub enum ChangeType {
    /// Simple value change
    ValueChanged,
    /// Structure changed (added/removed)
    StructureChanged,
    /// Requires full regeneration
    RequiresRegen,
}

/// Structured sync lens for complex data (like routes)
pub trait StructuredSyncLens: SyncLens {
    /// Get structured schema from code
    fn get_schema(&self, code: &HashMap<String, String>) -> Schema;
    
    /// Get structured schema from spec
    fn get_spec_schema(&self, spec_content: &str) -> Schema;
    
    /// Diff two schemas
    fn diff_schemas(&self, code_schema: &Schema, spec_schema: &Schema) -> SchemaDiff;
    
    /// Generate spec updates from schema diff
    fn generate_updates(&self, diff: &SchemaDiff) -> Vec<Change>;
}

/// Schema-level differences
#[derive(Debug, Clone)]
pub struct SchemaDiff {
    pub added: Vec<Vertex>,
    pub removed: Vec<Vertex>,
    pub modified: Vec<(Vertex, Vertex)>, // (old, new)
    pub edges_added: Vec<Edge>,
    pub edges_removed: Vec<Edge>,
}

impl SchemaDiff {
    pub fn is_empty(&self) -> bool {
        self.added.is_empty() && 
        self.removed.is_empty() && 
        self.modified.is_empty() &&
        self.edges_added.is_empty() &&
        self.edges_removed.is_empty()
    }
    
    pub fn summary(&self) -> String {
        let mut parts = Vec::new();
        if !self.added.is_empty() {
            parts.push(format!("{} added", self.added.len()));
        }
        if !self.removed.is_empty() {
            parts.push(format!("{} removed", self.removed.len()));
        }
        if !self.modified.is_empty() {
            parts.push(format!("{} modified", self.modified.len()));
        }
        
        if parts.is_empty() {
            "No changes".to_string()
        } else {
            parts.join(", ")
        }
    }
}

// ============================================================================
// Layer 4: Expr (Code Generation)
// ============================================================================

/// Code generator using Expr evaluation
/// 
/// Takes configuration and generates code artifacts.
pub trait CodeGenerator {
    /// Generate all artifacts from config
    fn generate(&self, config: &BundleConfig) -> HashMap<PathBuf, String>;
    
    /// Get list of files this generator produces
    fn output_files(&self) -> Vec<PathBuf>;
    
    /// Validate config before generation
    fn validate(&self, config: &BundleConfig) -> Result<(), Vec<String>>;
}

/// Bundle configuration (parsed from spec)
#[derive(Debug, Clone, Default)]
pub struct BundleConfig {
    pub project_name: String,
    pub version: String,
    pub project_description: Option<String>,
    pub theme: Option<String>,
    /// Routes extracted from spec
    pub routes: Vec<RouteConfig>,
    /// Extra bundle-specific fields
    pub extra: HashMap<String, String>,
    /// Raw spec content for advanced parsing
    pub raw_spec: String,
}

/// Route configuration extracted from spec
#[derive(Debug, Clone, Default)]
pub struct RouteConfig {
    pub method: String,
    pub path: String,
    pub handler: String,
    pub description: String,
}

// ============================================================================
// Bundle Trait: Combines all 4 layers
// ============================================================================

/// A complete bundle implementing the full 4-layer panproto stack
/// 
/// Any bundle can implement this trait to get:
/// - Theory-based structure
/// - Schema validation
/// - Bidirectional sync
/// - Code generation
pub trait Bundle: Send + Sync {
    /// Bundle name (e.g., "lit", "nodejs-express")
    fn name(&self) -> &str;
    
    /// Aliases for this bundle
    fn aliases(&self) -> &[&str] {
        &[]
    }
    
    /// Layer 1: Theory
    fn theory(&self) -> &dyn Theory;
    
    /// Layer 2: Schema compiler
    fn schema_compiler(&self) -> &dyn SchemaCompiler;
    
    /// Layer 3: Sync lenses (simple values)
    fn simple_lenses(&self) -> Vec<Box<dyn SyncLens>> {
        vec![]
    }
    
    /// Layer 3: Structured sync lenses (for complex data like routes)
    fn structured_lenses(&self) -> Vec<Box<dyn StructuredSyncLens>> {
        vec![]
    }
    
    /// Layer 4: Code generator
    fn code_generator(&self) -> &dyn CodeGenerator;
    
    /// Check if this bundle handles a given template/theory name
    fn matches(&self, name: &str) -> bool {
        if self.name() == name {
            return true;
        }
        for alias in self.aliases() {
            if *alias == name {
                return true;
            }
        }
        false
    }
    
    /// Complete sync operation: detect all changes
    fn sync(&self, code: &HashMap<String, String>, spec_content: &str) -> SyncResult {
        let mut all_changes = Vec::new();
        
        // Run simple lenses
        for lens in self.simple_lenses() {
            let changes = lens.compare(code, spec_content);
            all_changes.extend(changes);
        }
        
        // Run structured lenses
        for lens in self.structured_lenses() {
            let code_schema = lens.get_schema(code);
            let spec_schema = lens.get_spec_schema(spec_content);
            let diff = lens.diff_schemas(&code_schema, &spec_schema);
            
            if !diff.is_empty() {
                let changes = lens.generate_updates(&diff);
                all_changes.extend(changes);
            }
        }
        
        let can_auto_apply = all_changes.iter().all(|c| 
            matches!(c.change_type, ChangeType::ValueChanged)
        );
        
        SyncResult {
            changes: all_changes,
            can_auto_apply,
        }
    }
    
    /// Generate code from spec
    fn generate(&self, spec_content: &str) -> HashMap<PathBuf, String> {
        let config = self.parse_config(spec_content);
        self.code_generator().generate(&config)
    }
    
    /// Parse spec content into BundleConfig
    fn parse_config(&self, spec_content: &str) -> BundleConfig {
        // Default implementation - bundles can override
        parse_config_generic(spec_content)
    }
}

/// Result of a sync operation
#[derive(Debug, Clone)]
pub struct SyncResult {
    pub changes: Vec<Change>,
    pub can_auto_apply: bool,
}

impl SyncResult {
    pub fn is_empty(&self) -> bool {
        self.changes.is_empty()
    }
    
    pub fn format_report(&self) -> String {
        let mut output = String::new();
        
        if self.is_empty() {
            output.push_str("✅ No changes detected. Code matches spec.\n");
            return output;
        }
        
        output.push_str(&format!("📊 Changes detected: {}\n\n", self.changes.len()));
        
        // Group by type
        let value_changes: Vec<_> = self.changes.iter()
            .filter(|c| matches!(c.change_type, ChangeType::ValueChanged))
            .collect();
        let structure_changes: Vec<_> = self.changes.iter()
            .filter(|c| matches!(c.change_type, ChangeType::StructureChanged))
            .collect();
        let regen_changes: Vec<_> = self.changes.iter()
            .filter(|c| matches!(c.change_type, ChangeType::RequiresRegen))
            .collect();
        
        if !value_changes.is_empty() {
            output.push_str("📝 Value changes:\n");
            for change in value_changes {
                output.push_str(&format!(
                    "   {}: \"{}\" → \"{}\"\n",
                    change.field, change.old_value, change.new_value
                ));
            }
            output.push('\n');
        }
        
        if !structure_changes.is_empty() {
            output.push_str("🏗️  Structure changes:\n");
            for change in structure_changes {
                output.push_str(&format!(
                    "   {}: {}\n",
                    change.field, change.description
                ));
            }
            output.push('\n');
        }
        
        if !regen_changes.is_empty() {
            output.push_str("🔄 Requires regeneration:\n");
            for change in regen_changes {
                output.push_str(&format!(
                    "   {}: {}\n",
                    change.field, change.description
                ));
            }
            output.push('\n');
        }
        
        if self.can_auto_apply {
            output.push_str("💡 Can auto-apply: Run `phoenix sync --apply`\n");
        } else {
            output.push_str("⚠️  Some changes require manual review\n");
        }
        
        output
    }
}

/// Generic config parser (used by default implementation)
fn parse_config_generic(spec_content: &str) -> BundleConfig {
    let mut config = BundleConfig {
        raw_spec: spec_content.to_string(),
        ..Default::default()
    };
    
    // Extract project_name
    for line in spec_content.lines() {
        if line.contains("project_name = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.project_name = value;
                break;
            }
        }
    }
    
    // Extract version
    for line in spec_content.lines() {
        if line.contains("version = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.version = value;
                break;
            }
        }
    }
    if config.version.is_empty() {
        config.version = "0.1.0".to_string();
    }
    
    // Extract description
    for line in spec_content.lines() {
        if line.contains("project_description = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.project_description = Some(value);
                break;
            }
        }
    }
    
    // Extract theme
    for line in spec_content.lines() {
        if line.contains("theme = ") && !line.trim().starts_with('#') {
            if let Some(value) = extract_quoted_value(line) {
                config.theme = Some(value);
                break;
            }
        }
    }
    
    config
}

fn extract_quoted_value(line: &str) -> Option<String> {
    let after_eq = line.split('=').nth(1)?;
    let start = after_eq.find(['"', '\''].as_ref())?;
    let after_start = &after_eq[start + 1..];
    let end = after_start.find(['"', '\''].as_ref())?;
    Some(after_start[..end].to_string())
}

// ============================================================================
// Bundle Registry
// ============================================================================

/// Registry of all available bundles
pub struct BundleRegistry {
    bundles: Vec<Box<dyn Bundle>>,
}

impl BundleRegistry {
    pub fn new() -> Self {
        Self { bundles: vec![] }
    }
    
    pub fn register(&mut self, bundle: Box<dyn Bundle>) {
        self.bundles.push(bundle);
    }
    
    /// Find bundle by name/alias
    pub fn find(&self, name: &str) -> Option<&dyn Bundle> {
        for bundle in &self.bundles {
            if bundle.matches(name) {
                return Some(bundle.as_ref());
            }
        }
        None
    }
    
    /// List all registered bundles
    pub fn list(&self) -> Vec<&str> {
        self.bundles.iter().map(|b| b.name()).collect()
    }
}

impl Default for BundleRegistry {
    fn default() -> Self {
        Self::new()
    }
}
