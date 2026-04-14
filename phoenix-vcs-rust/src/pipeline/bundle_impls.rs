//! Concrete Bundle Implementations using the 4-Layer Stack
//!
//! Each bundle implements the Bundle trait with all 4 panproto layers.

use std::collections::HashMap;
use crate::pipeline::bundle_stack::*;

// ============================================================================
// Lit Bundle (Web Components)
// ============================================================================

pub struct LitBundle;

impl LitBundle {
    pub fn new() -> Self {
        Self
    }
}

impl Bundle for LitBundle {
    fn name(&self) -> &str {
        "lit"
    }
    
    fn aliases(&self) -> &[&str] {
        &["thlit", "web-components"]
    }
    
    fn theory(&self) -> &dyn Theory {
        // Return Lit theory
        &LIT_THEORY
    }
    
    fn schema_compiler(&self) -> &dyn SchemaCompiler {
        &LIT_SCHEMA_COMPILER
    }
    
    fn simple_lenses(&self) -> Vec<Box<dyn SyncLens>> {
        vec![
            Box::new(ProjectNameLens),
            Box::new(VersionLens),
            Box::new(ThemeLens),
        ]
    }
    
    fn code_generator(&self) -> &dyn CodeGenerator {
        &LIT_CODE_GENERATOR
    }
}

// Lit Theory (Layer 1)
static LIT_THEORY: LitTheory = LitTheory;

struct LitTheory;

impl Theory for LitTheory {
    fn name(&self) -> &str {
        "ThLit"
    }
    
    fn sorts(&self) -> Vec<Sort> {
        vec![
            Sort {
                name: "Component".to_string(),
                kind: SortKind::Structural,
                description: "Lit web component".to_string(),
            },
            Sort {
                name: "Property".to_string(),
                kind: SortKind::Structural,
                description: "Reactive property".to_string(),
            },
            Sort {
                name: "Template".to_string(),
                kind: SortKind::Structural,
                description: "lit-html template".to_string(),
            },
            Sort {
                name: "Style".to_string(),
                kind: SortKind::Structural,
                description: "CSS template".to_string(),
            },
        ]
    }
    
    fn operations(&self) -> Vec<Operation> {
        vec![
            Operation {
                name: "mk_component".to_string(),
                inputs: vec![("name".to_string(), "String".to_string())],
                output: "Component".to_string(),
                description: "Create Lit component".to_string(),
            },
        ]
    }
    
    fn equations(&self) -> Vec<Equation> {
        vec![]
    }
}

// Lit Schema Compiler (Layer 2)
static LIT_SCHEMA_COMPILER: LitSchemaCompiler = LitSchemaCompiler;

struct LitSchemaCompiler;

impl SchemaCompiler for LitSchemaCompiler {
    fn compile(&self, _theory: &dyn Theory) -> Schema {
        Schema {
            vertices: vec![
                Vertex {
                    id: "package.json".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "src/main.ts".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
            ],
            edges: vec![
                Edge {
                    from: "config".to_string(),
                    to: "package.json".to_string(),
                    kind: EdgeKind::Generates,
                    label: "generates".to_string(),
                },
            ],
            constraints: vec![],
        }
    }
}

// Lit Sync Lenses (Layer 3)
struct ProjectNameLens;

impl SyncLens for ProjectNameLens {
    fn id(&self) -> &str {
        "lit:project_name"
    }
    
    fn supported_fields(&self) -> &[&str] {
        &["project_name"]
    }
    
    fn get(&self, code: &HashMap<String, String>) -> HashMap<String, String> {
        let mut values = HashMap::new();
        
        if let Some(package_json) = code.get("package.json") {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(package_json) {
                if let Some(name) = parsed.get("name").and_then(|n| n.as_str()) {
                    values.insert("project_name".to_string(), name.to_string());
                }
            }
        }
        
        values
    }
    
    fn put(&self, code: &HashMap<String, String>, updates: &HashMap<String, String>) -> HashMap<String, String> {
        let mut updated = code.clone();
        
        if let Some(new_name) = updates.get("project_name") {
            if let Some(package_json) = updated.get_mut("package.json") {
                if let Ok(mut parsed) = serde_json::from_str::<serde_json::Value>(package_json) {
                    if let Some(obj) = parsed.as_object_mut() {
                        obj.insert("name".to_string(), serde_json::json!(new_name));
                        if let Ok(updated_json) = serde_json::to_string_pretty(&parsed) {
                            *package_json = updated_json;
                        }
                    }
                }
            }
        }
        
        updated
    }
    
    fn compare(&self, code: &HashMap<String, String>, spec_content: &str) -> Vec<Change> {
        let mut changes = Vec::new();
        let values = self.get(code);
        
        if let Some(code_name) = values.get("project_name") {
            // Check if different from spec
            if let Some(spec_name) = extract_quoted_value(spec_content, "project_name = \"") {
                if code_name != &spec_name {
                    changes.push(Change {
                        field: "project_name".to_string(),
                        old_value: spec_name,
                        new_value: code_name.clone(),
                        change_type: ChangeType::ValueChanged,
                        description: "Project name changed".to_string(),
                    });
                }
            }
        }
        
        changes
    }
}

struct VersionLens;

impl SyncLens for VersionLens {
    fn id(&self) -> &str {
        "lit:version"
    }
    
    fn supported_fields(&self) -> &[&str] {
        &["version"]
    }
    
    fn get(&self, code: &HashMap<String, String>) -> HashMap<String, String> {
        let mut values = HashMap::new();
        
        if let Some(package_json) = code.get("package.json") {
            if let Ok(parsed) = serde_json::from_str::<serde_json::Value>(package_json) {
                if let Some(version) = parsed.get("version").and_then(|v| v.as_str()) {
                    values.insert("version".to_string(), version.to_string());
                }
            }
        }
        
        values
    }
    
    fn put(&self, code: &HashMap<String, String>, _updates: &HashMap<String, String>) -> HashMap<String, String> {
        code.clone() // Simplified
    }
    
    fn compare(&self, code: &HashMap<String, String>, spec_content: &str) -> Vec<Change> {
        let mut changes = Vec::new();
        let values = self.get(code);
        
        if let Some(code_version) = values.get("version") {
            if let Some(spec_version) = extract_quoted_value(spec_content, "version = \"") {
                if code_version != &spec_version {
                    changes.push(Change {
                        field: "version".to_string(),
                        old_value: spec_version,
                        new_value: code_version.clone(),
                        change_type: ChangeType::ValueChanged,
                        description: "Version changed".to_string(),
                    });
                }
            }
        }
        
        changes
    }
}

struct ThemeLens;

impl SyncLens for ThemeLens {
    fn id(&self) -> &str {
        "lit:theme"
    }
    
    fn supported_fields(&self) -> &[&str] {
        &["theme"]
    }
    
    fn get(&self, code: &HashMap<String, String>) -> HashMap<String, String> {
        let mut values = HashMap::new();
        
        if let Some(main_ts) = code.get("src/main.ts") {
            // Detect theme from visual indicators
            let theme = if main_ts.contains("#FFB6C1") || main_ts.contains("🐾") {
                "kitty"
            } else if main_ts.contains("#00ff41") || main_ts.contains("⚡") {
                "cyberpunk"
            } else {
                "default"
            };
            values.insert("theme".to_string(), theme.to_string());
        }
        
        values
    }
    
    fn put(&self, code: &HashMap<String, String>, _updates: &HashMap<String, String>) -> HashMap<String, String> {
        code.clone() // Theme changes require regeneration
    }
    
    fn compare(&self, code: &HashMap<String, String>, spec_content: &str) -> Vec<Change> {
        let mut changes = Vec::new();
        let values = self.get(code);
        
        if let Some(code_theme) = values.get("theme") {
            if let Some(spec_theme) = extract_quoted_value(spec_content, "theme = \"") {
                if code_theme != &spec_theme {
                    changes.push(Change {
                        field: "theme".to_string(),
                        old_value: spec_theme,
                        new_value: code_theme.clone(),
                        change_type: ChangeType::RequiresRegen,
                        description: "Theme changed (requires full regeneration)".to_string(),
                    });
                }
            }
        }
        
        changes
    }
}

// Lit Code Generator (Layer 4)
static LIT_CODE_GENERATOR: LitCodeGenerator = LitCodeGenerator;

struct LitCodeGenerator;

impl CodeGenerator for LitCodeGenerator {
    fn generate(&self, config: &BundleConfig) -> HashMap<std::path::PathBuf, String> {
        use crate::pipeline::expr_bundle::lit_expr_generator;
        
        lit_expr_generator().generate(config)
    }
    
    fn output_files(&self) -> Vec<std::path::PathBuf> {
        vec![
            std::path::PathBuf::from("package.json"),
            std::path::PathBuf::from("tsconfig.json"),
            std::path::PathBuf::from("vite.config.ts"),
            std::path::PathBuf::from("src/main.ts"),
            std::path::PathBuf::from("flake.nix"),
        ]
    }
    
    fn validate(&self, config: &BundleConfig) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();
        
        if config.project_name.is_empty() {
            errors.push("project_name is required".to_string());
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

// Helper function
fn extract_quoted_value(content: &str, prefix: &str) -> Option<String> {
    for line in content.lines() {
        if let Some(pos) = line.find(prefix) {
            let after = &line[pos + prefix.len()..];
            if let Some(end) = after.find('"') {
                return Some(after[..end].to_string());
            }
        }
    }
    None
}

// ============================================================================
// Express Bundle (REST API)
// ============================================================================

pub struct ExpressBundle;

impl ExpressBundle {
    pub fn new() -> Self {
        Self
    }
}

impl Bundle for ExpressBundle {
    fn name(&self) -> &str {
        "nodejs-express"
    }
    
    fn aliases(&self) -> &[&str] {
        &["express", "node", "nodejs"]
    }
    
    fn theory(&self) -> &dyn Theory {
        &EXPRESS_THEORY
    }
    
    fn schema_compiler(&self) -> &dyn SchemaCompiler {
        &EXPRESS_SCHEMA_COMPILER
    }
    
    fn simple_lenses(&self) -> Vec<Box<dyn SyncLens>> {
        vec![
            Box::new(ProjectNameLens), // Reuse from lit
            Box::new(VersionLens),
        ]
    }
    
    fn structured_lenses(&self) -> Vec<Box<dyn StructuredSyncLens>> {
        vec![
            Box::new(RouteLens),
        ]
    }
    
    fn code_generator(&self) -> &dyn CodeGenerator {
        &EXPRESS_CODE_GENERATOR
    }
}

// Express Theory (Layer 1)
static EXPRESS_THEORY: ExpressTheory = ExpressTheory;

struct ExpressTheory;

impl Theory for ExpressTheory {
    fn name(&self) -> &str {
        "ThNodejsExpress"
    }
    
    fn sorts(&self) -> Vec<Sort> {
        vec![
            Sort {
                name: "Route".to_string(),
                kind: SortKind::Structural,
                description: "API endpoint".to_string(),
            },
            Sort {
                name: "Middleware".to_string(),
                kind: SortKind::Structural,
                description: "Express middleware".to_string(),
            },
            Sort {
                name: "Controller".to_string(),
                kind: SortKind::Structural,
                description: "Route handler".to_string(),
            },
        ]
    }
    
    fn operations(&self) -> Vec<Operation> {
        vec![
            Operation {
                name: "mk_route".to_string(),
                inputs: vec![
                    ("method".to_string(), "String".to_string()),
                    ("path".to_string(), "String".to_string()),
                ],
                output: "Route".to_string(),
                description: "Create route".to_string(),
            },
        ]
    }
    
    fn equations(&self) -> Vec<Equation> {
        vec![]
    }
}

// Express Schema Compiler (Layer 2)
static EXPRESS_SCHEMA_COMPILER: ExpressSchemaCompiler = ExpressSchemaCompiler;

struct ExpressSchemaCompiler;

impl SchemaCompiler for ExpressSchemaCompiler {
    fn compile(&self, _theory: &dyn Theory) -> Schema {
        Schema {
            vertices: vec![
                Vertex {
                    id: "app.js".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
                Vertex {
                    id: "package.json".to_string(),
                    kind: VertexKind::Artifact,
                    data: HashMap::new(),
                },
            ],
            edges: vec![],
            constraints: vec![],
        }
    }
}

// Express Route Lens (Layer 3 - Structured)
struct RouteLens;

impl SyncLens for RouteLens {
    fn id(&self) -> &str {
        "express:routes"
    }
    
    fn supported_fields(&self) -> &[&str] {
        &["routes"]
    }
    
    fn get(&self, _code: &HashMap<String, String>) -> HashMap<String, String> {
        HashMap::new() // Handled by structured lens
    }
    
    fn put(&self, code: &HashMap<String, String>, _updates: &HashMap<String, String>) -> HashMap<String, String> {
        code.clone()
    }
    
    fn compare(&self, _code: &HashMap<String, String>, _spec_content: &str) -> Vec<Change> {
        vec![] // Handled by structured lens
    }
}

impl StructuredSyncLens for RouteLens {
    fn get_schema(&self, code: &HashMap<String, String>) -> Schema {
        use crate::pipeline::route_schema::parse_express_routes;
        
        let app_js = code.get("app.js").cloned().unwrap_or_default();
        let route_schema = parse_express_routes(&app_js);
        
        // Convert RouteSchema to Schema
        let mut vertices = Vec::new();
        for ep in &route_schema.endpoints {
            let mut data = HashMap::new();
            data.insert("method".to_string(), ep.method.as_str().to_string());
            data.insert("path".to_string(), ep.path.clone());
            
            vertices.push(Vertex {
                id: format!("{} {}", ep.method.as_str(), ep.path),
                kind: VertexKind::Artifact,
                data,
            });
        }
        
        Schema {
            vertices,
            edges: vec![],
            constraints: vec![],
        }
    }
    
    fn get_spec_schema(&self, spec_content: &str) -> Schema {
        use crate::pipeline::route_schema::parse_spec_routes;
        
        let route_schema = parse_spec_routes(spec_content);
        
        // Convert RouteSchema to Schema
        let mut vertices = Vec::new();
        for ep in &route_schema.endpoints {
            let mut data = HashMap::new();
            data.insert("method".to_string(), ep.method.as_str().to_string());
            data.insert("path".to_string(), ep.path.clone());
            
            vertices.push(Vertex {
                id: format!("{} {}", ep.method.as_str(), ep.path),
                kind: VertexKind::Artifact,
                data,
            });
        }
        
        Schema {
            vertices,
            edges: vec![],
            constraints: vec![],
        }
    }
    
    fn diff_schemas(&self, code_schema: &Schema, spec_schema: &Schema) -> SchemaDiff {
        // Find vertices in code but not in spec (added)
        let added: Vec<_> = code_schema.vertices.iter()
            .filter(|cv| !spec_schema.vertices.iter().any(|sv| sv.id == cv.id))
            .cloned()
            .collect();
        
        // Find vertices in spec but not in code (removed)
        let removed: Vec<_> = spec_schema.vertices.iter()
            .filter(|sv| !code_schema.vertices.iter().any(|cv| cv.id == sv.id))
            .cloned()
            .collect();
        
        SchemaDiff {
            added,
            removed,
            modified: vec![],
            edges_added: vec![],
            edges_removed: vec![],
        }
    }
    
    fn generate_updates(&self, diff: &SchemaDiff) -> Vec<Change> {
        let mut changes = Vec::new();
        
        if !diff.is_empty() {
            changes.push(Change {
                field: "routes".to_string(),
                old_value: "previous".to_string(),
                new_value: "current".to_string(),
                change_type: ChangeType::StructureChanged,
                description: format!("Route structure changed: {}", diff.summary()),
            });
        }
        
        changes
    }
}

// Express Code Generator (Layer 4)
static EXPRESS_CODE_GENERATOR: ExpressCodeGenerator = ExpressCodeGenerator;

struct ExpressCodeGenerator;

impl CodeGenerator for ExpressCodeGenerator {
    fn generate(&self, config: &BundleConfig) -> HashMap<std::path::PathBuf, String> {
        use crate::pipeline::expr_bundle::nodejs_express_generator;
        
        nodejs_express_generator().generate(config)
    }
    
    fn output_files(&self) -> Vec<std::path::PathBuf> {
        vec![
            std::path::PathBuf::from("package.json"),
            std::path::PathBuf::from("app.js"),
            std::path::PathBuf::from("flake.nix"),
        ]
    }
    
    fn validate(&self, config: &BundleConfig) -> Result<(), Vec<String>> {
        let mut errors = Vec::new();
        
        if config.project_name.is_empty() {
            errors.push("project_name is required".to_string());
        }
        
        if errors.is_empty() {
            Ok(())
        } else {
            Err(errors)
        }
    }
}

// ============================================================================
// Bundle Factory
// ============================================================================

/// Create a registry with all bundles
pub fn create_bundle_registry() -> BundleRegistry {
    let mut registry = BundleRegistry::new();
    
    registry.register(Box::new(LitBundle::new()));
    registry.register(Box::new(ExpressBundle::new()));
    // Add more bundles here...
    
    registry
}
