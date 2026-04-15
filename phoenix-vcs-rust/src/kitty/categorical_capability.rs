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
        let methods = ["get ", "post ", "put ", "delete ", "patch ", "head ", "options " ];
        let lower = line.to_lowercase();
        
        for (i, method) in methods.iter().enumerate() {
            let has_method = lower.starts_with(method) || lower.contains(&format!("**{}**", method.trim()));
            if has_method {
                // Extract path after method
                let method_name = ["GET", "POST", "PUT", "DELETE", "PATCH", "HEAD", "OPTIONS"][i];
                
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
        
        // Check for HTTP methods - look for pattern like "GET /path", "POST /path", etc.
        let http_methods = ["get /", "post /", "put /", "delete /", "patch /", "head /", "options /"];
        let is_http = http_methods.iter().any(|&m| name_lower.contains(m));
        
        if is_http || name_lower.contains("endpoint") {
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
    
    //===========================================================================
    // FUZZ TESTS: Chaos and Edge Cases
    //===========================================================================
    
    #[test]
    fn fuzz_empty_spec() {
        // Empty spec should return Core capability or empty
        let result = CategoricalCapabilityExtractor::extract("");
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        // Should have at least one capability (Core) or be empty
        println!("Empty spec capabilities: {:?}", 
            cap_diag.capabilities.iter().map(|c| &c.capability).collect::<Vec<_>>());
    }
    
    #[test]
    fn fuzz_whitespace_only() {
        // Whitespace-only spec
        let result = CategoricalCapabilityExtractor::extract("   \n\t\n  ");
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        // Should still get at least Core or empty is OK
        println!("Whitespace spec capabilities: {:?}", 
            cap_diag.capabilities.iter().map(|c| &c.capability).collect::<Vec<_>>());
    }
    
    #[test]
    fn fuzz_unicode_chaos() {
        // Unicode-heavy spec with emoji and non-ASCII
        let spec = r#"
# 🚀 日本語 API ñoño

Café résumé naïve.

## API
- **GET** `/api/日本語` - Japanese route
- **POST** `/api/ñ` - Spanish route
- **GET** `/api/🚀` - Emoji route

## Database
PostgreSQL with emoji support 🐘.

## Cache
Redis 🎯 for speed.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok(), "Unicode spec should parse without error");
        
        let cap_diag = result.unwrap();
        // Should detect capabilities despite unicode
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        assert!(caps.contains(&Capability::Http), "Should detect HTTP despite unicode");
        assert!(caps.contains(&Capability::Persistence), "Should detect DB despite unicode");
        assert!(caps.contains(&Capability::Cache), "Should detect Cache despite unicode");
    }
    
    #[test]
    fn fuzz_malformed_routes() {
        // Various malformed route patterns - should gracefully handle without crashing
        let specs = vec![
            // Extra spaces (should work)
            "- **GET**    `/api/users`   - List",
            // Mixed case (should work)
            "- **get** `/api/users` - List",
            // Special chars in path (should work)
            "- **GET** `/api/users/:id` - Get user",
            "- **GET** `/api/users/{id}` - Get user",
            "- **GET** `/api/v1.0/users` - Versioned",
            // Query params in path (should extract path before query)
            "- **GET** `/api/search?q=test` - Search",
        ];
        
        for spec_fragment in specs {
            let full_spec = format!("# Test\n\n## API\n{}", spec_fragment);
            let result = CategoricalCapabilityExtractor::extract(&full_spec);
            
            // Should parse without crashing
            assert!(result.is_ok(), "Failed on: {}", spec_fragment);
            
            let cap_diag = result.unwrap();
            // Should detect HTTP capability
            assert!(cap_diag.capabilities.iter().any(|c| c.capability == Capability::Http),
                "Should detect HTTP in: {}", spec_fragment);
        }
    }
    
    #[test]
    fn fuzz_duplicate_routes() {
        // Same route defined multiple times
        let spec = r#"
# Duplicate API

## API
- **GET** `/api/users` - List users
- **GET** `/api/users` - List users again
- **POST** `/api/users` - Create user
- **POST** `/api/users` - Create user duplicate

## Database
Postgres.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        // Should detect Http and Persistence
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        assert!(caps.contains(&Capability::Http));
        assert!(caps.contains(&Capability::Persistence));
        
        // Should have boxes for each route (duplicates included)
        let http_count = caps.iter().filter(|&c| *c == Capability::Http).count();
        assert!(http_count >= 4, "Should have at least 4 HTTP boxes for routes");
    }
    
    #[test]
    fn fuzz_deeply_nested_paths() {
        // Very deeply nested API paths
        let spec = r#"
# Deep API

## API
- **GET** `/api/v1/namespaces/:namespace/resources/:resource/subresources/:subresource/actions/:action` - Deep
- **GET** `/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z` - Alphabet soup

## Database
Postgres.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        assert!(cap_diag.capabilities.iter().any(|c| c.capability == Capability::Http));
    }
    
    #[test]
    fn fuzz_no_api_routes() {
        // Spec with no API routes but other capabilities
        let spec = r#"
# Worker Process

No HTTP here.

## Database
Postgres connection.

## Queue
Background workers.

## Cache
Redis.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        // Should NOT have HTTP
        assert!(!caps.contains(&Capability::Http), "Should not detect HTTP without routes");
        
        // Should have other capabilities
        assert!(caps.contains(&Capability::Persistence));
        assert!(caps.contains(&Capability::Queue));
        assert!(caps.contains(&Capability::Cache));
    }
    
    #[test]
    fn fuzz_html_tags_in_spec() {
        // Spec with HTML/markdown noise
        let spec = r#"
# <b>Bold HTML</b> API

<script>alert('xss')</script> (should be harmless)

## API
- **GET** `/api/users` - List &lt;users&gt;
- **POST** `/api/create` - Create <b>bold</b> items

## Database
<span>Postgres</span>.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok(), "HTML in spec should not crash parser");
        
        let cap_diag = result.unwrap();
        assert!(cap_diag.capabilities.iter().any(|c| c.capability == Capability::Http));
    }
    
    #[test]
    fn fuzz_all_http_methods() {
        // All HTTP methods including edge cases
        let spec = r#"
# Full HTTP API

## API
- **GET** `/get` - GET
- **POST** `/post` - POST
- **PUT** `/put` - PUT
- **DELETE** `/delete` - DELETE
- **PATCH** `/patch` - PATCH
- **HEAD** `/head` - HEAD
- **OPTIONS** `/options` - OPTIONS

## Database
Postgres.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        // Should detect many HTTP boxes (one per route)
        let http_count = caps.iter().filter(|&c| *c == Capability::Http).count();
        println!("Detected {} HTTP routes out of {} capabilities", http_count, caps.len());
        println!("Capabilities: {:?}", caps);
        assert!(http_count >= 5, "Should detect at least 5 HTTP routes, got {}", http_count);
    }
    
    #[test]
    fn fuzz_case_variations() {
        // Case variations for capability keywords
        let specs = vec![
            // Database variations
            ("Database", Capability::Persistence),
            ("DATABASE", Capability::Persistence),
            ("database", Capability::Persistence),
            ("PostgreSQL", Capability::Persistence),
            ("POSTGRESQL", Capability::Persistence),
            ("postgres", Capability::Persistence),
            // Cache variations
            ("Cache", Capability::Cache),
            ("CACHE", Capability::Cache),
            ("cache", Capability::Cache),
            ("Redis", Capability::Cache),
            ("REDIS", Capability::Cache),
            ("redis", Capability::Cache),
            // Queue variations
            ("Queue", Capability::Queue),
            ("QUEUE", Capability::Queue),
            ("queue", Capability::Queue),
            ("Worker", Capability::Queue),
            ("WORKER", Capability::Queue),
            ("worker", Capability::Queue),
        ];
        
        for (keyword, expected_cap) in specs {
            let spec = format!(r#"
# Test

## Features
{} with {} support.
"#, keyword, keyword.to_lowercase());
            
            let result = CategoricalCapabilityExtractor::extract(&spec);
            assert!(result.is_ok());
            
            let cap_diag = result.unwrap();
            let caps: Vec<_> = cap_diag.capabilities.iter()
                .map(|c| c.capability.clone())
                .collect();
            
            assert!(caps.contains(&expected_cap), 
                "Should detect {:?} from keyword '{}'", expected_cap, keyword);
        }
    }
    
    #[test]
    fn fuzz_special_chars_in_titles() {
        // Special characters in markdown titles
        let spec = r#"
# API v1.0.0-beta+build.123

## API
- **GET** `/api` - API

## Database
Postgres.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        // Should extract name with special chars handled
        assert!(!cap_diag.global.name.is_empty());
    }
    
    #[test]
    fn fuzz_very_long_spec() {
        // Very long spec with many routes
        let mut routes = String::new();
        for i in 0..100 {
            routes.push_str(&format!("- **GET** `/api/route{}` - Route {}\n", i, i));
        }
        
        let spec = format!(r#"
# Big API

## API
{}

## Database
Postgres.
"#, routes);

        let result = CategoricalCapabilityExtractor::extract(&spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        let caps: Vec<_> = cap_diag.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        // Should have many HTTP boxes
        let http_count = caps.iter().filter(|&c| *c == Capability::Http).count();
        assert!(http_count >= 50, "Should detect at least 50 HTTP routes");
    }
    
    #[test]
    fn fuzz_minimal_valid_spec() {
        // Minimal valid spec with just title and one route
        let spec = r#"
# X

## API
- **GET** `/` - Root
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok());
        
        let cap_diag = result.unwrap();
        assert_eq!(cap_diag.global.name, "x");
        assert!(cap_diag.capabilities.iter().any(|c| c.capability == Capability::Http));
    }
    
    #[test]
    fn fuzz_conflicting_capabilities() {
        // Multiple conflicting capability mentions
        let spec = r#"
# Confused App

## API
Maybe API, maybe not.

## Database
Maybe database.

## No Database
Actually, no database.

## Cache
Redis!

## No Cache
Just kidding.
"#;

        let result = CategoricalCapabilityExtractor::extract(spec);
        assert!(result.is_ok(), "Conflicting spec should not crash");
        
        let cap_diag = result.unwrap();
        // Parser should handle conflicting info gracefully
        assert!(cap_diag.capabilities.len() > 0);
    }
    
    #[test]
    fn test_mixed_formatting() {
        // Mixed formatting styles
        let spec = r#"
# Mixed Format API

## API
- GET /plain - Plain
- **GET** `/bold-backticks` - Bold+backticks
- **POST** `/bold-only` - Bold only
- PUT /nothing - No formatting
- delete /lowercase - Lowercase

## Database
**Postgres** with *italics*.

## Cache
***Redis*** bold+italic.
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
    }
}
