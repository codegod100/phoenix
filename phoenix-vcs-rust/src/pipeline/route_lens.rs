//! Layer 3: Lens - Bidirectional Route Transformations
//!
//! Enables round-trip editing for structured routes:
//!   Spec Schema ──[get]──► Code
//!   Code ────────[put]──► Spec Schema

use std::collections::HashMap;
use super::route_schema::{RouteSchema, SchemaDiff, Endpoint, ResponseDef, ResponseBody};

/// Bidirectional lens for routes
pub struct RouteLens;

impl RouteLens {
    /// Get: Extract RouteSchema from code (forward direction)
    pub fn get_from_code(code: &HashMap<String, String>) -> RouteSchema {
        use super::route_schema::parse_express_routes;
        
        // Get app.js content
        let app_js = code.get("app.js").unwrap_or(&String::new()).clone();
        
        // Parse into schema
        parse_express_routes(&app_js)
    }
    
    /// Get: Extract RouteSchema from spec (forward direction)
    pub fn get_from_spec(spec_content: &str) -> RouteSchema {
        use super::route_schema::parse_spec_routes;
        
        parse_spec_routes(spec_content)
    }
    
    /// Compare and generate diff
    pub fn diff(code_schema: &RouteSchema, spec_schema: &RouteSchema) -> SchemaDiff {
        code_schema.diff(spec_schema)
    }
    
    /// Put: Generate spec.ncl updates from schema diff (backward direction)
    /// 
    /// Takes the diff and generates Nickel code to update spec.ncl
    pub fn generate_spec_updates(diff: &SchemaDiff, spec_content: &str) -> String {
        let mut updates = String::new();
        
        updates.push_str("// Auto-generated route updates from code changes\n\n");
        
        // Handle added routes
        if !diff.added.is_empty() {
            updates.push_str("// Routes to ADD:\n");
            for endpoint in &diff.added {
                updates.push_str(&format!(
                    "  {{ method = \"{}\", path = \"{}\", handler = \"{}\", description = \"{}\" }},\n",
                    endpoint.method.as_str(),
                    endpoint.path,
                    format!("handle{}", to_pascal_case(&endpoint.path.replace("/", "_"))),
                    "Added from code"
                ));
            }
            updates.push('\n');
        }
        
        // Handle removed routes
        if !diff.removed.is_empty() {
            updates.push_str("// Routes to REMOVE:\n");
            for endpoint in &diff.removed {
                updates.push_str(&format!(
                    "// Remove: {} {}\n",
                    endpoint.method.as_str(),
                    endpoint.path
                ));
            }
            updates.push('\n');
        }
        
        // Handle modified routes (response changes)
        if !diff.modified.is_empty() {
            updates.push_str("// Routes with MODIFIED responses:\n");
            for change in &diff.modified {
                updates.push_str(&format!(
                    "// {} {} changed:\n",
                    change.method.as_str(),
                    change.path
                ));
                
                // Show response differences
                match (&change.old.response.body, &change.new.response.body) {
                    (ResponseBody::JsonObject(old), ResponseBody::JsonObject(new)) => {
                        // Find changed fields
                        for (key, new_val) in new {
                            if let Some(old_val) = old.get(key) {
                                if old_val != new_val {
                                    updates.push_str(&format!(
                                        "//   Response field '{}': \"{}\" → \"{}\"\n",
                                        key, old_val, new_val
                                    ));
                                }
                            } else {
                                updates.push_str(&format!(
                                    "//   New response field '{}': \"{}\"\n",
                                    key, new_val
                                ));
                            }
                        }
                    }
                    _ => {
                        updates.push_str("//   Response structure changed\n");
                    }
                }
                updates.push('\n');
            }
        }
        
        updates
    }
    
    /// Generate human-readable diff summary
    pub fn format_diff(diff: &SchemaDiff) -> String {
        let mut output = String::new();
        
        if diff.is_empty() {
            output.push_str("✅ No route changes detected. Code matches spec.\n");
            return output;
        }
        
        output.push_str(&format!("📊 Route changes: {}\n\n", diff.summary()));
        
        // Added
        if !diff.added.is_empty() {
            output.push_str("🟢 ADDED routes:\n");
            for ep in &diff.added {
                output.push_str(&format!(
                    "   {} {}\n",
                    ep.method.as_str(),
                    ep.path
                ));
            }
            output.push('\n');
        }
        
        // Removed
        if !diff.removed.is_empty() {
            output.push_str("🔴 REMOVED routes:\n");
            for ep in &diff.removed {
                output.push_str(&format!(
                    "   {} {}\n",
                    ep.method.as_str(),
                    ep.path
                ));
            }
            output.push('\n');
        }
        
        // Modified
        if !diff.modified.is_empty() {
            output.push_str("🟡 MODIFIED routes:\n");
            for change in &diff.modified {
                output.push_str(&format!(
                    "   {} {}\n",
                    change.method.as_str(),
                    change.path
                ));
                
                // Show specific field changes
                match (&change.old.response.body, &change.new.response.body) {
                    (ResponseBody::JsonObject(old), ResponseBody::JsonObject(new)) => {
                        for (key, new_val) in new {
                            if let Some(old_val) = old.get(key) {
                                if old_val != new_val {
                                    output.push_str(&format!(
                                        "      Response.{}: \"{}\" → \"{}\"\n",
                                        key, old_val, new_val
                                    ));
                                }
                            }
                        }
                    }
                    _ => {}
                }
            }
        }
        
        output
    }
}

fn to_pascal_case(s: &str) -> String {
    s.split(|c| c == '-' || c == '_')
        .map(|p| {
            let mut chars = p.chars();
            match chars.next() {
                None => String::new(),
                Some(c) => c.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
            }
        })
        .collect()
}

/// Full bidirectional sync engine for routes
pub struct RouteSyncEngine {
    /// Last known code state
    code_schema: RouteSchema,
    /// Last known spec state  
    spec_schema: RouteSchema,
}

impl RouteSyncEngine {
    pub fn new() -> Self {
        Self {
            code_schema: RouteSchema::new(),
            spec_schema: RouteSchema::new(),
        }
    }
    
    /// Detect all route changes between code and spec
    pub fn detect_changes(&self, code: &HashMap<String, String>, spec_content: &str) -> SchemaDiff {
        let current_code = RouteLens::get_from_code(code);
        let current_spec = RouteLens::get_from_spec(spec_content);
        
        RouteLens::diff(&current_code, &current_spec)
    }
    
    /// Generate updates to bring spec in line with code
    pub fn sync_to_spec(&self, diff: &SchemaDiff, spec_content: &str) -> String {
        RouteLens::generate_spec_updates(diff, spec_content)
    }
}
