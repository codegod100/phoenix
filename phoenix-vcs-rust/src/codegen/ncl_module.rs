//! Generate code from NCL module definitions using panproto-parse
//!
//! Each module.ncl file defines:
//! - protocol (language to emit)
//! - vertex_kinds (schema structure)
//! - vertices (code fragments)
//!
//! Uses panproto-parse (which has lang-nickel) for proper parsing.

use std::collections::HashMap;
use std::path::Path;
use panproto_parse::ParserRegistry;
use panproto_schema::SchemaBuilder;
use crate::codegen::emit_bundle::{create_protocol, emit_schema};

/// A code-generating module defined in NCL
#[derive(Debug, Clone)]
pub struct NclCodeModule {
    pub id: String,
    pub name: String,
    pub protocol: String,
    pub vertex_kinds: Vec<String>,
    pub vertices: Vec<VertexDef>,
    pub config_placeholders: HashMap<String, String>,
}

/// A vertex definition
#[derive(Debug, Clone)]
pub struct VertexDef {
    pub id: String,
    pub kind: String,
    pub text: String,
}

impl NclCodeModule {
    /// Load a module from its NCL file using panproto-parse
    pub fn from_ncl_file(path: &Path) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        Self::from_ncl_str(&content)
    }
    
    /// Parse module from NCL string using panproto-parse (nickel grammar)
    pub fn from_ncl_str(content: &str) -> anyhow::Result<Self> {
        // Use panproto's ParserRegistry to parse Nickel
        let registry = ParserRegistry::new();
        
        // Get the nickel parser (requires lang-nickel feature)
        let nickel_proto = registry.get("nickel")
            .ok_or_else(|| anyhow::anyhow!("Nickel parser not available - ensure lang-nickel feature is enabled"))?;
        
        // Parse the NCL content into a Schema
        let schema = registry.parse_with_protocol(content, "nickel", &nickel_proto)
            .map_err(|e| anyhow::anyhow!("Failed to parse NCL: {:?}", e))?;
        
        // Extract module definition from parsed schema
        Self::from_schema(&schema)
    }
    
    /// Extract module from parsed panproto Schema
    fn from_schema(schema: &panproto_schema::Schema) -> anyhow::Result<Self> {
        // Walk the schema to find:
        // - id field
        // - name field
        // - generation record with protocol, vertex_kinds, vertices
        
        let mut id = None;
        let mut name = None;
        let mut protocol = "typescript".to_string();
        let mut vertex_kinds = Vec::new();
        let mut vertices = Vec::new();
        let mut config_placeholders = HashMap::new();
        
        // Iterate through schema vertices to extract fields
        for vertex in &schema.vertices {
            match vertex.kind.as_str() {
                "field" | "assignment" => {
                    // Extract field name and value from vertex metadata
                    if let Some(meta) = &vertex.metadata {
                        if let (Some(fname), Some(fvalue)) = (meta.get("name"), meta.get("value")) {
                            match fname.as_str() {
                                "id" => id = Some(fvalue.clone()),
                                "name" => name = Some(fvalue.clone()),
                                "protocol" => protocol = fvalue.clone(),
                                _ => {}
                            }
                        }
                    }
                }
                "array" => {
                    // Could be vertex_kinds or vertices array
                    if let Some(meta) = &vertex.metadata {
                        if let Some(arr_name) = meta.get("name") {
                            if arr_name == "vertex_kinds" {
                                // Extract string elements
                                vertex_kinds = meta.get("elements")
                                    .map(|e| e.split(',').map(|s| s.trim().to_string()).collect())
                                    .unwrap_or_default();
                            }
                        }
                    }
                }
                "record" => {
                    // Could be the generation record or a vertex definition
                    if let Some(meta) = &vertex.metadata {
                        if let Some(rec_name) = meta.get("name") {
                            if rec_name == "generation" {
                                // Extract nested fields from generation record
                                // protocol, vertex_kinds, vertices, config_placeholders
                            }
                        }
                    }
                }
                _ => {}
            }
        }
        
        // Fallback parsing using regex for now (until proper schema extraction is implemented)
        // This is a bridge solution - we parse the raw content to extract fields
        let content = schema.to_string(); // Get original content back
        
        id = extract_string_field(&content, "id").or(id);
        name = extract_string_field(&content, "name").or(name);
        protocol = extract_string_field(&content, "protocol").unwrap_or(protocol);
        vertex_kinds = extract_string_array(&content, "vertex_kinds").unwrap_or(vertex_kinds);
        vertices = extract_vertices(&content)?;
        config_placeholders = extract_placeholders(&content);
        
        Ok(Self {
            id: id.unwrap_or_else(|| "unknown".to_string()),
            name: name.unwrap_or_else(|| "Unknown".to_string()),
            protocol,
            vertex_kinds,
            vertices,
            config_placeholders,
        })
    }
    
    /// Generate code - just one line that calls emit_with_protocol!
    pub fn generate(&self, config: &HashMap<String, String>) -> anyhow::Result<String> {
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

// Simple extraction helpers (bridge until full schema extraction is implemented)

fn extract_string_field(content: &str, field: &str) -> Option<String> {
    // Match patterns like: id = "value" or id = 'value'
    let patterns = [
        format!(r#"{}\s*=\s*"([^"]+)""#, field),
        format!(r#"{}\s*=\s*'([^']+)'"#, field),
    ];
    
    for pattern in &patterns {
        let regex = regex::Regex::new(pattern).ok()?;
        if let Some(cap) = regex.captures(content) {
            return cap.get(1).map(|m| m.as_str().to_string());
        }
    }
    None
}

fn extract_string_array(content: &str, field: &str) -> Option<Vec<String>> {
    // Find array like: vertex_kinds = ["a", "b", "c"]
    let pattern = format!(r#"{}\s*=\s*\[([^\]]+)\]"#, regex::escape(field));
    let regex = regex::Regex::new(&pattern).ok()?;
    
    let cap = regex.captures(content)?;
    let array_content = cap.get(1)?.as_str();
    
    Some(
        array_content
            .split(',')
            .map(|s| {
                s.trim()
                    .trim_matches('"')
                    .trim_matches('\'')
                    .to_string()
            })
            .filter(|s| !s.is_empty())
            .collect()
    )
}

fn extract_vertices(content: &str) -> anyhow::Result<Vec<VertexDef>> {
    let mut vertices = Vec::new();
    
    // Find vertices = [ ... ] block
    if let Some(start) = content.find("vertices = [") {
        let after = &content[start..];
        if let Some(end) = after.find("\n  ],") {
            let block = &after[..end];
            
            // Parse each { id = "...", kind = "...", text = "..." } vertex
            for chunk in block.split("{ id = ") {
                if chunk.trim().is_empty() { continue; }
                
                // Extract id (first quoted string after "id = ")
                let id_regex = regex::Regex::new(r#"^"([^"]+)""#).unwrap();
                let id = if let Some(cap) = id_regex.captures(chunk.trim()) {
                    cap.get(1).unwrap().as_str().to_string()
                } else {
                    continue;
                };
                
                // Extract kind
                let kind = extract_string_in_block(chunk, "kind")
                    .ok_or_else(|| anyhow::anyhow!("Vertex '{}' missing kind", id))?;
                
                // Extract text (multi-line string in '' or "")
                let text = extract_multiline_string(chunk, "text")
                    .ok_or_else(|| anyhow::anyhow!("Vertex '{}' missing text", id))?;
                
                vertices.push(VertexDef { id, kind, text });
            }
        }
    }
    
    Ok(vertices)
}

fn extract_string_in_block(block: &str, field: &str) -> Option<String> {
    let patterns = [
        format!(r#"{}\s*=\s*"([^"]+)""#, field),
        format!(r#"{}\s*=\s*'([^']+)'"#, field),
    ];
    
    for pattern in &patterns {
        let regex = regex::Regex::new(pattern).ok()?;
        if let Some(cap) = regex.captures(block) {
            return cap.get(1).map(|m| m.as_str().to_string());
        }
    }
    None
}

fn extract_multiline_string(block: &str, field: &str) -> Option<String> {
    // Look for text = '' ... '' pattern
    if let Some(start) = block.find(&format!("{} = ''", field)) {
        let after = &block[start + field.len() + 4..];
        if let Some(end) = after.find("''") {
            return Some(after[..end].to_string());
        }
    }
    
    // Fallback to regular string
    extract_string_in_block(block, field)
}

fn extract_placeholders(content: &str) -> HashMap<String, String> {
    let mut placeholders = HashMap::new();
    
    if let Some(start) = content.find("config_placeholders = {") {
        let after = &content[start..];
        if let Some(end) = after.find("}") {
            let block = &after[..end];
            
            for line in block.lines() {
                // Parse "{{KEY}}" = "value" patterns
                let regex = regex::Regex::new(r#""(\{\{[^}]+\}\})"\s*=\s*"([^"]+)""#).unwrap();
                if let Some(cap) = regex.captures(line) {
                    let key = cap.get(1).unwrap().as_str().to_string();
                    let value = cap.get(2).unwrap().as_str().to_string();
                    placeholders.insert(key, value);
                }
            }
        }
    }
    
    placeholders
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_extract_string_field() {
        let ncl = r#"id = "test-module", name = 'Test Module'"#;
        assert_eq!(extract_string_field(ncl, "id"), Some("test-module".to_string()));
        assert_eq!(extract_string_field(ncl, "name"), Some("Test Module".to_string()));
    }
}
