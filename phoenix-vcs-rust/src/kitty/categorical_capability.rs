//! Categorical Capability Extraction
//!
//! Uses DisCoCat/pregroup grammar to extract TWO things from specs:
//! 1. WHAT capabilities: types in the diagram
//! 2. HOW configured: wires/connections define configuration structure
//!
//! Grammar mapping:
//! - Types (noun-like) = Capabilities: Http, Db, Cache, etc.
//! - Adjoints (n.r, n.l) = Direction: input/output, upstream/downstream
//! - Boxes (verbs) = Configuration actions: parse, filter, store
//! - Cups = Connections between capabilities (configuration flow)
//!
//! Example spec parse:
//!   "GET /users from Database with Cache"
//!   → types: [Http, Db, Cache]
//!   → boxes: [fetch(Http→Db), store(Db→Cache)]
//!   → cups: [Http.cod.r ⊗ Db.dom → I, Db.cod.r ⊗ Cache.dom → I]

use crate::kitty::diagram::{Box, Diagram};
use crate::kitty::types::{PregroupType, TypeEnv};
use crate::kitty::tree::SpecParser;
use crate::codegen::capability_bundle::Capability;
use std::collections::HashMap;

/// A capability extracted from categorical structure
#[derive(Debug, Clone)]
pub struct CategoricalCapability {
    /// The capability type (from pregroup type name)
    pub capability: Capability,
    /// Direction: Input (consuming) or Output (producing)
    pub direction: CapabilityDirection,
    /// Configuration parameters extracted from wiring
    pub config: CapabilityConfig,
}

#[derive(Debug, Clone)]
pub enum CapabilityDirection {
    /// Upstream/Input capability (left adjoint n.l)
    Upstream,
    /// Downstream/Output capability (right adjoint n.r or atomic n)
    Downstream,
}

/// Configuration extracted from diagram wiring
#[derive(Debug, Clone, Default)]
pub struct CapabilityConfig {
    /// Key-value configuration parameters
    pub params: HashMap<String, String>,
    /// Connections to other capabilities
    pub connections: Vec<String>,
    /// Order in pipeline (if applicable)
    pub sequence: Option<usize>,
}

/// Result of categorical capability extraction
#[derive(Debug, Clone)]
pub struct CapabilityDiagram {
    /// Detected capabilities with direction
    pub capabilities: Vec<CategoricalCapability>,
    /// The raw diagram (for code generation)
    pub diagram: Diagram,
    /// Global project configuration
    pub global: GlobalConfig,
}

#[derive(Debug, Clone, Default)]
pub struct GlobalConfig {
    pub name: String,
    pub description: String,
    pub language: String,
}

/// Categorical capability extractor
/// 
/// Uses the insight: spec.md → pregroup diagram → capabilities
pub struct CategoricalCapabilityExtractor;

impl CategoricalCapabilityExtractor {
    /// Main entry: parse spec to capability diagram
    pub fn extract(content: &str) -> Result<CapabilityDiagram, String> {
        // Step 1: Parse spec to pregroup diagram (return both diagram and raw boxes)
        let (diagram, raw_boxes) = Self::parse_to_diagram(content)?;
        
        // Step 2: Extract capabilities from RAW boxes (before tensoring)
        let capabilities = Self::extract_capabilities_from_boxes(&raw_boxes)?;
        
        // Step 3: Extract configuration from wiring
        let configured = Self::extract_configuration(capabilities, &diagram);
        
        // Step 4: Extract global config
        let global = Self::extract_global(content);
        
        Ok(CapabilityDiagram {
            capabilities: configured,
            diagram,
            global,
        })
    }
    
    //===========================================================================
    // Step 1: Parse spec to diagram
    //===========================================================================
    
    /// Parse spec.md to pregroup diagram
    /// 
    /// Grammar rules:
    /// - "GET /users from Database" → Http → Db connection
    /// - "Cache results in Redis" → Cache → Storage connection  
    /// - "with Auth" → adds Auth type to context
    /// 
    /// Returns both the combined diagram and the raw boxes for capability extraction
    fn parse_to_diagram(content: &str) -> Result<(Diagram, Vec<Box>), String> {
        let mut boxes = vec![];
        let mut type_env = TypeEnv::new();
        
        // Register capability types
        let http_type = PregroupType::atomic("Http");
        let db_type = PregroupType::atomic("Db");
        let cache_type = PregroupType::atomic("Cache");
        let auth_type = PregroupType::atomic("Auth");
        let queue_type = PregroupType::atomic("Queue");
        let storage_type = PregroupType::atomic("Storage");
        let stream_type = PregroupType::atomic("Stream");
        
        // Parse lines for capability-indicating phrases
        for line in content.lines() {
            let line_lower = line.to_lowercase();
            

            
            // HTTP endpoint: "GET /api/users" → Http → endpoint
            if let Some((method, path)) = Self::parse_http_endpoint(&line_lower) {
                let endpoint_name = format!("{} {}", method.to_uppercase(), path);
                let endpoint = Box::word(
                    &endpoint_name,
                    vec![],  // Http is atomic input
                    vec![PregroupType::atomic(&endpoint_name)],
                );
                boxes.push(endpoint);
                // Track type in environment
                let _ = &endpoint_name; // Use endpoint_name
            }
            
            // Database operation: "from Database" or "to PostgreSQL"
            if line_lower.contains("database") || line_lower.contains("postgres") || line_lower.contains("model") {
                let db_op = Box::word(
                    "db_operation",
                    vec![PregroupType::atomic("Data")],
                    vec![PregroupType::atomic("Stored")],
                );
                boxes.push(db_op);
            }
            
            // Caching: "Cache in Redis" or "cached results"
            if line_lower.contains("cache") || line_lower.contains("redis") {
                let cache_op = Box::word(
                    "cache_operation", 
                    vec![PregroupType::atomic("Data")],
                    vec![PregroupType::atomic("Cached")],
                );
                boxes.push(cache_op);
            }
            
            // Stream: "Stream from Kafka"
            if line_lower.contains("stream") || line_lower.contains("kafka") {
                let stream_op = Box::word(
                    "stream_operation",
                    vec![PregroupType::atomic("Source")],
                    vec![PregroupType::atomic("Stream")],
                );
                boxes.push(stream_op);
            }
            
            // Queue: "Background job" or "Queue worker"
            if line_lower.contains("queue") || line_lower.contains("worker") 
               || line_lower.contains("background") {
                let queue_op = Box::word(
                    "queue_operation",
                    vec![PregroupType::atomic("Job")],
                    vec![PregroupType::atomic("Processed")],
                );
                boxes.push(queue_op);
            }
            
            // Storage: "Upload to S3" or "Storage bucket"
            if line_lower.contains("s3") || line_lower.contains("upload") 
               || line_lower.contains("storage") {
                let storage_op = Box::word(
                    "storage_operation",
                    vec![PregroupType::atomic("File")],
                    vec![PregroupType::atomic("Stored")],
                );
                boxes.push(storage_op);
            }
            
            // Auth: "JWT auth" or "Login required"
            if line_lower.contains("auth") || line_lower.contains("jwt") 
               || line_lower.contains("login") {
                let auth_op = Box::word(
                    "auth_operation",
                    vec![PregroupType::atomic("Request")],
                    vec![PregroupType::atomic("Authenticated")],
                );
                boxes.push(auth_op);
            }
        }
        
        // Build diagram from boxes (tensor product)
        if boxes.is_empty() {
            // No capabilities detected - just Core
            let core = Box::word("Core", vec![], vec![PregroupType::atomic("App")]);
            Ok((Diagram::from_box(core), boxes))
        } else {
            let mut diagram = Diagram::from_box(boxes[0].clone());
            for i in 1..boxes.len() {
                let next = Diagram::from_box(boxes[i].clone());
                diagram = diagram.tensor(&next);
            }
            Ok((diagram, boxes))
        }
    }
    
    fn parse_http_endpoint(line: &str) -> Option<(String, String)> {
        // Match: GET /api/users, POST /items, etc.
        let line = line.trim();
        
        // Skip lines that don't start with method
        let methods = ["get ", "post ", "put ", "delete ", "patch " ];
        let lower = line.to_lowercase();
        
        for (i, method) in methods.iter().enumerate() {
            if lower.starts_with(method) || lower.contains(&format!("**{}**", method.trim())) {
                // Extract path after method
                let method_name = ["GET", "POST", "PUT", "DELETE", "PATCH"][i];
                
                // Try to find path in backticks or after method
                let path_start = line.find('`').map(|i| i + 1)
                    .or_else(|| {
                        let after_method = line.to_lowercase().find(method)? + method.len();
                        Some(after_method)
                    })?;
                
                let path_end = line[path_start..].find('`')
                    .or_else(|| line[path_start..].find(' '))
                    .unwrap_or(line.len() - path_start);
                
                let path = line[path_start..path_start + path_end].trim();
                if path.starts_with('/') {
                    return Some((method_name.to_string(), path.to_string()));
                }
            }
        }
        None
    }
    
    //===========================================================================
    // Step 2: Extract capabilities from types
    //===========================================================================
    
    fn extract_capabilities_from_boxes(boxes: &[Box]) -> Result<Vec<CategoricalCapability>, String> {
        let mut capabilities = vec![];
        
        for (idx, box_) in boxes.iter().enumerate() {
            let name = box_.name().unwrap_or("unnamed");
            
            // Map box name to capability
            let (cap, direction) = Self::box_to_capability(name, box_);
            
            capabilities.push(CategoricalCapability {
                capability: cap,
                direction,
                config: CapabilityConfig::default(),
            });
        }
        
        Ok(capabilities)
    }
    
    #[allow(dead_code)]
    fn extract_capabilities(_diagram: &Diagram) -> Result<Vec<CategoricalCapability>, String> {
        // Old method - boxes are already tensored together
        // Use extract_capabilities_from_boxes instead
        Ok(vec![])
    }
    
    fn box_to_capability(name: &str, box_: &Box) -> (Capability, CapabilityDirection) {
        use CapabilityDirection::*;
        
        let name_lower = name.to_lowercase();
        
        if name_lower.contains("endpoint") || name_lower.contains("get ") 
           || name_lower.contains("post ") {
            (Capability::Http, Downstream)
        } else if name_lower.contains("db") || name_lower.contains("database") {
            // Check if input or output
            if box_.dom().is_empty() {
                (Capability::Persistence, Downstream) // Output only
            } else {
                (Capability::Persistence, Upstream)   // Consumes input
            }
        } else if name_lower.contains("cache") {
            (Capability::Cache, if box_.dom().is_empty() { Downstream } else { Upstream })
        } else if name_lower.contains("stream") || name_lower.contains("kafka") {
            (Capability::RealTime, Upstream)
        } else if name_lower.contains("queue") || name_lower.contains("worker") {
            (Capability::Queue, Downstream)
        } else if name_lower.contains("storage") || name_lower.contains("s3") {
            (Capability::Storage, Downstream)
        } else if name_lower.contains("auth") {
            (Capability::Auth, Upstream) // Auth checks input
        } else if name_lower.contains("core") || name_lower.contains("app") {
            (Capability::Core, Downstream)
        } else {
            (Capability::Core, Downstream) // Default
        }
    }
    
    //===========================================================================
    // Step 3: Extract configuration from wiring
    //===========================================================================
    
    fn extract_configuration(
        mut capabilities: Vec<CategoricalCapability>, 
        _diagram: &Diagram
    ) -> Vec<CategoricalCapability> {
        // For now, basic configuration based on capability type
        // TODO: Analyze diagram connections to build wiring config
        
        for cap in &mut capabilities {
            cap.config = match cap.capability {
                Capability::Http => CapabilityConfig {
                    params: Self::default_http_params(),
                    connections: vec!["Persistence".to_string()],
                    sequence: Some(0),
                },
                Capability::Persistence => CapabilityConfig {
                    params: Self::default_db_params(),
                    connections: vec![],
                    sequence: Some(1),
                },
                Capability::Cache => CapabilityConfig {
                    params: [("backend".to_string(), "redis".to_string())].into(),
                    connections: vec!["Persistence".to_string()],
                    sequence: None,
                },
                _ => CapabilityConfig::default(),
            };
        }
        
        capabilities
    }
    
    fn default_http_params() -> HashMap<String, String> {
        [
            ("port".to_string(), "3000".to_string()),
            ("host".to_string(), "0.0.0.0".to_string()),
        ].into()
    }
    
    fn default_db_params() -> HashMap<String, String> {
        [
            ("type".to_string(), "postgresql".to_string()),
            ("url".to_string(), "postgresql://localhost/app".to_string()),
        ].into()
    }
    
    //===========================================================================
    // Step 4: Extract global config  
    //===========================================================================
    
    fn extract_global(content: &str) -> GlobalConfig {
        let mut global = GlobalConfig::default();
        
        // Extract title
        for line in content.lines() {
            if line.starts_with("# ") {
                global.name = line[2..].trim().to_lowercase().replace(" ", "-");
                global.description = line[2..].trim().to_string();
                break;
            }
        }
        
        // Detect language
        let lower = content.to_lowercase();
        if lower.contains("rust") || lower.contains("cargo") {
            global.language = "rust".to_string();
        } else if lower.contains("python") {
            global.language = "python".to_string();
        } else if lower.contains("typescript") || lower.contains("ts-") {
            global.language = "typescript".to_string();
        }
        
        global
    }
}

/// Convert capability diagram to bundle config
pub fn to_bundle_config(cap_diagram: &CapabilityDiagram) -> String {
    let mut output = String::new();
    
    output.push_str(&format!("# {}\n\n", cap_diagram.global.name));
    output.push_str(&format!("{}\n\n", cap_diagram.global.description));
    
    output.push_str("## Capabilities\n\n");
    
    for cap in &cap_diagram.capabilities {
        output.push_str(&format!("### {:?} ({:?})\n", 
            cap.capability, cap.direction));
        
        for (key, value) in &cap.config.params {
            output.push_str(&format!("- {}: {}\n", key, value));
        }
        
        if !cap.config.connections.is_empty() {
            output.push_str(&format!("- connects to: {}\n", 
                cap.config.connections.join(", ")));
        }
        
        output.push('\n');
    }
    
    output.push_str(&format!("## Generated Config\n\n"));
    output.push_str(&format!("language = \"{}\"\n", cap_diagram.global.language));
    
    output
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_simple_api_extraction() {
        let spec = r#"
# User API

Simple user management.

## API
- **GET** `/api/users` - List users
- **POST** `/api/users` - Create user

## Database
User model with postgres.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        
        // Should have Http and Persistence
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        assert!(caps.contains(&Capability::Http));
        assert!(caps.contains(&Capability::Persistence));
        
        // Check global config
        assert_eq!(cap_diag.global.name, "user-api");
        
        println!("Capabilities detected: {:?}", cap_diag.capabilities);
    }

    #[test]
    fn test_data_pipeline_extraction() {
        let spec = r#"
# Stream Processor

Process events.

## Sources
Stream from Kafka topics.

## Database
Write to PostgreSQL.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        
        // Should have Stream (RealTime) and Persistence
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        assert!(caps.contains(&Capability::RealTime), "Should have Stream capability");
        assert!(caps.contains(&Capability::Persistence));
        
        // Should NOT have HTTP
        assert!(!caps.contains(&Capability::Http), "Data pipeline shouldn't have HTTP");
    }

    #[test]
    fn test_full_stack_extraction() {
        let spec = r#"
# Full App

Everything included.

## API
- **GET** `/api/data`

## Database
PostgreSQL with models.

## Cache
Redis for performance.

## Queue
Background workers.

## Storage
S3 for files.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        assert!(caps.contains(&Capability::Http));
        assert!(caps.contains(&Capability::Persistence));
        assert!(caps.contains(&Capability::Cache));
        assert!(caps.contains(&Capability::Queue));
        assert!(caps.contains(&Capability::Storage));
    }
}
