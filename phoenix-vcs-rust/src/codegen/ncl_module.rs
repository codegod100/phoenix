//! Generate code from NCL module definitions using panproto-parse
//!
//! Uses panproto-parse to validate NCL syntax, then extracts fields.

use std::collections::HashMap;
use std::path::Path;
use panproto_parse::ParserRegistry;

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
    /// Load a module from its NCL file
    pub fn from_ncl_file(path: &Path) -> anyhow::Result<Self> {
        let content = std::fs::read_to_string(path)?;
        Self::from_ncl_str(&content)
    }
    
    /// Parse module from NCL string
    pub fn from_ncl_str(content: &str) -> anyhow::Result<Self> {
        // Use panproto-parse to validate NCL syntax
        let registry = ParserRegistry::new();
        
        // Parse to validate and get schema structure
        let _schema = registry.parse_with_protocol("nickel", content.as_bytes(), "module.ncl")
            .map_err(|e| anyhow::anyhow!("NCL syntax error: {:?}", e))?;
        
        // Extract module definition from content using regex
        // (Schema doesn't contain the literal values we need)
        Self::from_content(content)
    }
    
    /// Extract module from NCL content using regex
    fn from_content(content: &str) -> anyhow::Result<Self> {
        let id = extract_string_field(content, "id")
            .ok_or_else(|| anyhow::anyhow!("Missing 'id' field"))?;
        let name = extract_string_field(content, "name")
            .unwrap_or_else(|| id.clone());
        let protocol = extract_string_field(content, "protocol")
            .unwrap_or_else(|| "typescript".to_string());
        let vertex_kinds = extract_string_array(content, "vertex_kinds")
            .unwrap_or_default();
        let vertices = extract_vertices(content)?;
        let config_placeholders = extract_placeholders(content);
        
        Ok(Self {
            id,
            name,
            protocol,
            vertex_kinds,
            vertices,
            config_placeholders,
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

// Extraction helpers

fn extract_string_field(content: &str, field: &str) -> Option<String> {
    let patterns = [
        format!(r#"{}\s*=\s*"([^"]+)""#, regex::escape(field)),
        format!(r#"{}\s*=\s*'([^']+)'"#, regex::escape(field)),
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
    let pattern = format!(r#"{}\s*=\s*\[([^\]]+)\]"#, regex::escape(field));
    let regex = regex::Regex::new(&pattern).ok()?;
    
    let cap = regex.captures(content)?;
    let array_content = cap.get(1)?.as_str();
    
    Some(
        array_content
            .split(',')
            .map(|s| s.trim().trim_matches('"').trim_matches('\'').to_string())
            .filter(|s| !s.is_empty())
            .collect()
    )
}

fn extract_vertices(content: &str) -> anyhow::Result<Vec<VertexDef>> {
    let mut vertices = Vec::new();
    
    // Extract just the vertices array block
    let vertices_start = content.find("vertices = [")
        .ok_or_else(|| anyhow::anyhow!("Missing 'vertices' array"))?;
    let after_start = &content[vertices_start + "vertices = [".len()..];
    
    // Find matching closing bracket (respect nesting)
    let mut depth = 1;
    let mut block_end = 0;
    for (i, c) in after_start.char_indices() {
        match c {
            '[' => depth += 1,
            ']' => {
                depth -= 1;
                if depth == 0 {
                    block_end = i;
                    break;
                }
            }
            _ => {}
        }
    }
    
    let block = &after_start[..block_end];
    
    // Parse each vertex record - use simpler pattern for '' strings
    // Pattern: { id = "NAME", kind = "KIND", text = ''CONTENT'' }
    let vertex_re = regex::Regex::new(
        r#"\{\s*id\s*=\s*"([^"]+)"\s*,\s*kind\s*=\s*"([^"]+)"\s*,\s*text\s*=\s*''((?s:.*?))''\s*\}"#
    ).map_err(|e| anyhow::anyhow!("Regex error: {}", e))?;
    
    for cap in vertex_re.captures_iter(block) {
        let id = cap.get(1).unwrap().as_str().to_string();
        let kind = cap.get(2).unwrap().as_str().to_string();
        let text = cap.get(3).unwrap().as_str().to_string();
        vertices.push(VertexDef { id, kind, text });
    }
    
    Ok(vertices)
}

fn extract_placeholders(content: &str) -> HashMap<String, String> {
    let mut placeholders = HashMap::new();
    
    if let Some(start) = content.find("config_placeholders = {") {
        let after = &content[start + "config_placeholders = {".len()..];
        
        // Find matching }
        let mut depth = 1;
        let mut end_pos = 0;
        for (i, c) in after.char_indices() {
            match c {
                '{' => depth += 1,
                '}' => {
                    depth -= 1;
                    if depth == 0 {
                        end_pos = i;
                        break;
                    }
                }
                _ => {}
            }
        }
        
        let block = &after[..end_pos];
        
        // Parse "{{KEY}}" = "value" patterns
        let regex = regex::Regex::new(r#""(\{\{[^}]+\}\})"\s*=\s*"([^"]+)""#).unwrap();
        for cap in regex.captures_iter(block) {
            let key = cap.get(1).unwrap().as_str().to_string();
            let value = cap.get(2).unwrap().as_str().to_string();
            placeholders.insert(key, value);
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
