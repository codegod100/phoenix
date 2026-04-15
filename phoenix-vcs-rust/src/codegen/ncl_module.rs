//! Generate code from NCL module definitions using nickel-lang
//!
//! Uses nickel-lang crate to properly parse and evaluate NCL files.

use std::collections::HashMap;
use std::path::Path;
use nickel_lang::{Context, Expr, Record as NickelRecord};

/// A code-generating module defined in NCL (combined mod.ncl + module.ncl format)
#[derive(Debug, Clone)]
pub struct NclCodeModule {
    pub id: String,
    pub name: String,
    pub description: Option<String>,
    pub version: Option<String>,
    pub protocol: String,
    pub vertex_kinds: Vec<String>,
    pub vertices: Vec<VertexDef>,
    pub config_placeholders: HashMap<String, String>,
    // Combined format fields (from mod.ncl)
    pub provides: Vec<ProvidedCapability>,
    pub needs: Vec<NeededCapability>,
    pub language: String,
    pub is_infrastructure: bool,
    // External resource file (optional)
    pub resource_file: Option<String>,
}

/// A provided capability
#[derive(Debug, Clone)]
pub struct ProvidedCapability {
    pub interface: String,
    pub properties: HashMap<String, String>,
    pub endpoint: Option<String>,
}

/// A needed capability
#[derive(Debug, Clone)]
pub struct NeededCapability {
    pub interface: String,
    pub strategy: String,
    pub optional: bool,
}

/// A vertex definition
#[derive(Debug, Clone)]
pub struct VertexDef {
    pub id: String,
    pub kind: String,
    pub text: String,
}

impl NclCodeModule {
    /// Load a module from its NCL file using nickel-lang
    pub fn from_ncl_file(path: &Path) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        let module = Self::from_ncl_str(&content)?;
        
        // If there's a resource_file, load it and create vertices
        if let Some(resource_file) = module.get_resource_file() {
            let resource_path = path.parent()
                .unwrap_or(Path::new("."))
                .join(&resource_file);
            let code = std::fs::read_to_string(&resource_path)
                .map_err(|e| anyhow::anyhow!("Failed to read resource file {}: {}", resource_path.display(), e))?;
            Ok(module.with_code_resource(code))
        } else {
            Ok(module)
        }
    }
    
    /// Parse module from NCL string using nickel-lang evaluation
    pub fn from_ncl_str(content: &str) -> anyhow::Result<Self> {
        // Use nickel-lang to evaluate the NCL content
        let mut context = Context::new();
        let expr = context.eval_deep(content)
            .map_err(|e| anyhow::anyhow!("NCL evaluation failed: {:?}", e))?;
        
        // Extract from the evaluated expression
        Self::from_expr(&expr)
    }
    
    /// Get resource_file from generation block if present
    fn get_resource_file(&self) -> Option<String> {
        self.resource_file.clone()
    }
    
    /// Create a new module with code loaded from external resource
    fn with_code_resource(mut self, code: String) -> Self {
        let mut vertices = vec![];
        let mut vertex_kinds = vec![];
        
        // Check if code contains mounting logic (ExprStmt pattern)
        let has_mounting = code.contains("DOMContentLoaded") || 
                           code.contains("document.createElement") ||
                           code.contains("document.body.appendChild");
        
        if has_mounting {
            // Split the code - everything before the mounting comment is ClassDecl
            // The mounting code is ExprStmt
            if let Some(mount_pos) = code.find("// Mount the application") {
                let class_code = code[..mount_pos].trim().to_string();
                let mount_code = code[mount_pos..].to_string();
                
                if !class_code.is_empty() {
                    vertices.push(VertexDef {
                        id: format!("{}_class", self.id),
                        kind: "ClassDecl".to_string(),
                        text: class_code,
                    });
                    vertex_kinds.push("ClassDecl".to_string());
                }
                
                vertices.push(VertexDef {
                    id: format!("{}_mount", self.id),
                    kind: "ExprStmt".to_string(),
                    text: mount_code,
                });
                vertex_kinds.push("ExprStmt".to_string());
            } else {
                // No clear split, treat all as ClassDecl
                vertices.push(VertexDef {
                    id: format!("{}_class", self.id),
                    kind: "ClassDecl".to_string(),
                    text: code,
                });
                vertex_kinds.push("ClassDecl".to_string());
            }
        } else {
            // Regular component - just ClassDecl
            vertices.push(VertexDef {
                id: format!("{}_class", self.id),
                kind: "ClassDecl".to_string(),
                text: code,
            });
            vertex_kinds.push("ClassDecl".to_string());
        }
        
        self.vertices = vertices;
        self.vertex_kinds = vertex_kinds;
        self
    }
    
    /// Extract module from evaluated Nickel Expr
    fn from_expr(expr: &Expr) -> anyhow::Result<Self> {
        let record = expr.as_record()
            .ok_or_else(|| anyhow::anyhow!("Expected a record"))?;
        
        // Extract top-level fields
        let id = get_string_field(&record, "id")
            .ok_or_else(|| anyhow::anyhow!("Missing 'id' field"))?;
        let name = get_string_field(&record, "name")
            .unwrap_or_else(|| id.clone());
        let description = get_string_field(&record, "description");
        let version = get_string_field(&record, "version");
        let language = get_string_field(&record, "language")
            .unwrap_or_else(|| "typescript".to_string());
        let is_infrastructure = get_bool_field(&record, "is_infrastructure")
            .unwrap_or(false);
        
        // Extract top-level config (new style with NCL evaluation)
        let config = extract_config_from_record(&record);
        
        // Extract generation block
        let (protocol, vertex_kinds, vertices, mut config_placeholders, resource_file) = 
            if let Some(gen_expr) = record.value_by_name("generation") {
                if let Some(gen_record) = gen_expr.as_record() {
                    let protocol = get_string_field(&gen_record, "protocol")
                        .unwrap_or_else(|| "typescript".to_string());
                    let vertex_kinds = get_string_array(&gen_record, "vertex_kinds");
                    let vertices = extract_vertices_from_record(&gen_record)?;
                    let placeholders = extract_placeholders_from_record(&gen_record);
                    let resource_file = get_string_field(&gen_record, "resource_file");
                    (protocol, vertex_kinds, vertices, placeholders, resource_file)
                } else {
                    ("typescript".to_string(), vec![], vec![], HashMap::new(), None)
                }
            } else {
                ("typescript".to_string(), vec![], vec![], HashMap::new(), None)
            };
        
        // Merge top-level config into placeholders (new style takes precedence)
        // Template syntax: %{key}% 
        for (key, value) in config {
            config_placeholders.insert(format!("%{{{}}}%", key), value);
        }
        
        // Extract capabilities
        let provides = extract_provides_from_record(&record);
        let needs = extract_needs_from_record(&record);
        
        Ok(Self {
            id,
            name,
            description,
            version,
            protocol,
            vertex_kinds,
            vertices,
            config_placeholders,
            provides,
            needs,
            language,
            is_infrastructure,
            resource_file,
        })
    }
    
    /// Generate code - one line that calls emit_with_protocol!
    pub fn generate(&self, config: &HashMap<String, String>) -> anyhow::Result<String> {
        use crate::codegen::emit_bundle::{create_protocol, EmitBuilder, emit_schema};
        
        // 1. Create protocol
        let protocol = create_protocol(
            &self.protocol,
            self.vertex_kinds.clone(),
            vec![],
        );
        
        // 2. Build schema with EmitBuilder
        let mut b = EmitBuilder::new(&protocol, &self.id);
        
        for vertex in &self.vertices {
            // Replace config placeholders
            let mut text = vertex.text.clone();
            for (placeholder, value) in config {
                text = text.replace(placeholder, value);
            }
            
            b = b.vertex(&vertex.id, &vertex.kind, Some(&text))
                .map_err(|e| anyhow::anyhow!("Failed to add vertex {}: {}", vertex.id, e))?;
        }
        
        // 3. ONE LINE: emit_with_protocol!
        let schema = b.build().map_err(|e| anyhow::anyhow!("Schema build failed: {:?}", e))?;
        emit_schema(&schema, &self.protocol).map_err(|e| anyhow::anyhow!("Emit failed: {}", e))
    }
}

// Nickel record extraction helpers

fn get_string_field(record: &NickelRecord, name: &str) -> Option<String> {
    record.value_by_name(name)?.as_str().map(|s| s.to_string())
}

fn get_bool_field(record: &NickelRecord, name: &str) -> Option<bool> {
    record.value_by_name(name)?.as_bool()
}

fn get_string_array(record: &NickelRecord, name: &str) -> Vec<String> {
    if let Some(expr) = record.value_by_name(name) {
        if let Some(array) = expr.as_array() {
            let mut result = Vec::new();
            for i in 0..array.len() {
                if let Some(item) = array.get(i) {
                    if let Some(s) = item.as_str() {
                        result.push(s.to_string());
                    }
                }
            }
            return result;
        }
    }
    vec![]
}

fn extract_vertices_from_record(record: &NickelRecord) -> anyhow::Result<Vec<VertexDef>> {
    let mut vertices = Vec::new();
    
    if let Some(expr) = record.value_by_name("vertices") {
        if let Some(array) = expr.as_array() {
            for i in 0..array.len() {
                if let Some(vertex_expr) = array.get(i) {
                    if let Some(vertex_record) = vertex_expr.as_record() {
                        let id = get_string_field(&vertex_record, "id")
                            .ok_or_else(|| anyhow::anyhow!("Vertex {} missing id", i))?;
                        let kind = get_string_field(&vertex_record, "kind")
                            .unwrap_or_else(|| "ExprStmt".to_string());
                        let text = get_multiline_string_field(&vertex_record, "text")
                            .unwrap_or_default();
                        vertices.push(VertexDef { id, kind, text });
                    }
                }
            }
        }
    }
    
    Ok(vertices)
}

fn get_multiline_string_field(record: &NickelRecord, name: &str) -> Option<String> {
    // Try regular string first - this handles both regular and multiline strings
    if let Some(s) = get_string_field(record, name) {
        return Some(s);
    }
    
    None
}

fn extract_config_from_record(record: &NickelRecord) -> HashMap<String, String> {
    let mut config = HashMap::new();
    
    if let Some(expr) = record.value_by_name("config") {
        if let Some(cfg_record) = expr.as_record() {
            for (field_name, value_opt) in cfg_record.iter() {
                if let Some(value_expr) = value_opt {
                    // Convert Nickel value to string representation
                    // Handle strings and booleans directly
                    if let Some(s) = value_expr.as_str() {
                        config.insert(field_name.to_string(), s.to_string());
                    } else if let Some(b) = value_expr.as_bool() {
                        config.insert(field_name.to_string(), b.to_string());
                    }
                    // Note: numbers would need special handling - skip for now
                }
            }
        }
    }
    
    config
}

fn extract_placeholders_from_record(record: &NickelRecord) -> HashMap<String, String> {
    let mut placeholders = HashMap::new();
    
    if let Some(expr) = record.value_by_name("config_placeholders") {
        if let Some(ph_record) = expr.as_record() {
            for (field_name, value_opt) in ph_record.iter() {
                if let Some(value_expr) = value_opt {
                    if let Some(s) = value_expr.as_str() {
                        placeholders.insert(field_name.to_string(), s.to_string());
                    }
                }
            }
        }
    }
    
    placeholders
}

fn extract_provides_from_record(record: &NickelRecord) -> Vec<ProvidedCapability> {
    let mut provides = Vec::new();
    
    if let Some(expr) = record.value_by_name("provides") {
        if let Some(array) = expr.as_array() {
            for i in 0..array.len() {
                if let Some(cap_expr) = array.get(i) {
                    if let Some(cap_record) = cap_expr.as_record() {
                        if let Some(interface) = get_string_field(&cap_record, "interface") {
                            let endpoint = get_string_field(&cap_record, "endpoint");
                            provides.push(ProvidedCapability {
                                interface,
                                properties: HashMap::new(),
                                endpoint,
                            });
                        }
                    }
                }
            }
        }
    }
    
    provides
}

fn extract_needs_from_record(record: &NickelRecord) -> Vec<NeededCapability> {
    let mut needs = Vec::new();
    
    if let Some(expr) = record.value_by_name("needs") {
        if let Some(array) = expr.as_array() {
            for i in 0..array.len() {
                if let Some(need_expr) = array.get(i) {
                    if let Some(need_record) = need_expr.as_record() {
                        if let Some(interface) = get_string_field(&need_record, "interface") {
                            let optional = get_bool_field(&need_record, "optional")
                                .unwrap_or(false);
                            needs.push(NeededCapability {
                                interface,
                                strategy: "first_available".to_string(),
                                optional,
                            });
                        }
                    }
                }
            }
        }
    }
    
    needs
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_simple_module() {
        let ncl = r#"{
            id = "test-module",
            name = "Test Module",
            language = "typescript",
            generation = {
                protocol = "typescript",
                vertex_kinds = ["ImportDecl", "VarDecl"],
                vertices = [
                    { id = "import", kind = "ImportDecl", text = "import { foo } from 'bar';" },
                ],
            },
        }"#;
        
        let module = NclCodeModule::from_ncl_str(ncl).expect("Should parse");
        assert_eq!(module.id, "test-module");
        assert_eq!(module.name, "Test Module");
        assert_eq!(module.language, "typescript");
        assert_eq!(module.protocol, "typescript");
        assert_eq!(module.vertex_kinds.len(), 2);
        assert_eq!(module.vertices.len(), 1);
    }
}
