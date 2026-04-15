//! Kitty Capability Parser
//!
//! Simplified parser that extracts TWO things from specs:
//! 1. WHAT capabilities are needed (feature detection)
//! 2. HOW to configure those capabilities (parameters)
//!
//! This replaces complex schema extraction with capability-oriented parsing.
//! The parser doesn't try to understand full semantics - just "what features?" and "how configured?"

use crate::codegen::capability_bundle::Capability;
use std::collections::HashMap;

/// Parsed result: capabilities + their configurations
#[derive(Debug, Clone)]
pub struct CapabilitySpec {
    /// What capabilities this spec needs
    pub capabilities: Vec<DetectedCapability>,
    /// Global configuration (project name, version, etc.)
    pub global_config: GlobalConfig,
}

/// A detected capability with its specific configuration
#[derive(Debug, Clone)]
pub struct DetectedCapability {
    /// The capability type
    pub capability: Capability,
    /// Configuration parameters for this capability
    pub config: CapabilityConfig,
    /// Evidence: where in the spec this was detected
    pub evidence: Vec<String>,
}

/// Global project configuration
#[derive(Debug, Clone, Default)]
pub struct GlobalConfig {
    pub project_name: String,
    pub project_description: String,
    pub language: String,
    pub version: String,
}

/// Capability-specific configuration
#[derive(Debug, Clone)]
pub enum CapabilityConfig {
    /// HTTP server configuration
    Http {
        /// List of routes
        routes: Vec<RouteConfig>,
        /// Port to listen on
        port: Option<u16>,
        /// Middleware to enable
        middleware: Vec<String>,
    },
    /// Database/persistence configuration
    Persistence {
        /// Database type
        db_type: String,
        /// Connection string or config
        connection: String,
        /// Models/schemas defined
        models: Vec<ModelConfig>,
        /// Whether to run migrations
        migrations: bool,
    },
    /// Real-time/WebSocket configuration
    RealTime {
        /// WebSocket endpoint paths
        endpoints: Vec<String>,
        /// Event types handled
        events: Vec<String>,
    },
    /// Authentication configuration
    Auth {
        /// Auth type: jwt, session, oauth
        auth_type: String,
        /// Protected routes/paths
        protected_paths: Vec<String>,
        /// Token expiry
        expiry: Option<String>,
    },
    /// Background job processing
    Queue {
        /// Queue backend: redis, postgres, memory
        backend: String,
        /// Job types
        job_types: Vec<String>,
    },
    /// Caching configuration
    Cache {
        /// Cache backend
        backend: String,
        /// Default TTL
        default_ttl: Option<u64>,
    },
    /// File storage
    Storage {
        /// Storage backend: s3, local, gcs
        backend: String,
        /// Buckets/containers
        buckets: Vec<String>,
    },
    /// Email sending
    Email {
        /// SMTP provider or service
        provider: String,
        /// From address
        from: String,
    },
    /// Search functionality
    Search {
        /// Search backend
        backend: String,
        /// Indexed models
        indices: Vec<String>,
    },
    /// Observability/monitoring
    Observability {
        /// Metrics format: prometheus, statsd
        metrics_format: String,
        /// Health check endpoints
        health_checks: Vec<String>,
    },
    /// Generic configuration for unknown capabilities
    Generic {
        /// Raw config as key-value pairs
        settings: HashMap<String, String>,
    },
}

/// HTTP route configuration
#[derive(Debug, Clone)]
pub struct RouteConfig {
    pub method: String,
    pub path: String,
    pub handler: String,
    pub description: String,
}

/// Database model configuration
#[derive(Debug, Clone)]
pub struct ModelConfig {
    pub name: String,
    pub fields: Vec<FieldConfig>,
}

/// Model field configuration
#[derive(Debug, Clone)]
pub struct FieldConfig {
    pub name: String,
    pub field_type: String,
    pub required: bool,
}

/// Simplified capability-focused parser
pub struct KittyCapabilityParser;

impl KittyCapabilityParser {
    /// Main entry: parse spec.md to capability spec
    pub fn parse(content: &str) -> Result<CapabilitySpec, String> {
        let lines: Vec<_> = content.lines().collect();
        
        // Extract global config first
        let global_config = Self::extract_global_config(content);
        
        // Detect capabilities with their specific configs
        let mut capabilities = vec![];
        
        // Check for each capability and extract its config
        if let Some(config) = Self::extract_http_config(content) {
            let evidence = Self::find_evidence(content, &["GET /", "POST /", "PUT /", "DELETE /"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Http,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_persistence_config(content) {
            let evidence = Self::find_evidence(content, &["database", "postgres", "model", "table"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Persistence,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_realtime_config(content) {
            let evidence = Self::find_evidence(content, &["websocket", "sse", "real-time"]);
            capabilities.push(DetectedCapability {
                capability: Capability::RealTime,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_auth_config(content) {
            let evidence = Self::find_evidence(content, &["auth", "jwt", "login", "oauth"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Auth,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_queue_config(content) {
            let evidence = Self::find_evidence(content, &["queue", "worker", "background", "job"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Queue,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_cache_config(content) {
            let evidence = Self::find_evidence(content, &["redis", "cache", "ttl"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Cache,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_storage_config(content) {
            let evidence = Self::find_evidence(content, &["s3", "upload", "storage", "file"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Storage,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_email_config(content) {
            let evidence = Self::find_evidence(content, &["email", "smtp", "notification"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Email,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_search_config(content) {
            let evidence = Self::find_evidence(content, &["search", "elasticsearch", "index"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Search,
                config,
                evidence,
            });
        }
        
        if let Some(config) = Self::extract_observability_config(content) {
            let evidence = Self::find_evidence(content, &["metrics", "prometheus", "monitoring", "health"]);
            capabilities.push(DetectedCapability {
                capability: Capability::Observability,
                config,
                evidence,
            });
        }
        
        Ok(CapabilitySpec {
            capabilities,
            global_config,
        })
    }
    
    //===========================================================================
    // Global Config Extraction
    //===========================================================================
    
    fn extract_global_config(content: &str) -> GlobalConfig {
        let mut config = GlobalConfig::default();
        
        // Extract project name from # Title or phoenix_config
        if let Some(title) = Self::extract_title(content) {
            config.project_name = Self::slugify(&title);
            config.project_description = title;
        }
        
        // Extract language from code blocks or build section
        if content.contains("```rust") || content.contains("Language: rust") {
            config.language = "rust".to_string();
        } else if content.contains("```python") || content.contains("Language: python") {
            config.language = "python".to_string();
        } else if content.contains("```typescript") || content.contains("template = \"ts-") {
            config.language = "typescript".to_string();
        }
        
        // Extract version if present
        if let Some(version) = Self::extract_pattern(content, r"version[:\s=]+([\d.]+)") {
            config.version = version;
        }
        
        config
    }
    
    //===========================================================================
    // Capability-Specific Extractors
    //===========================================================================
    
    fn extract_http_config(content: &str) -> Option<CapabilityConfig> {
        // Quick check: does this have HTTP routes?
        if !Self::has_http_indicators(content) {
            return None;
        }
        
        // Extract routes
        let mut routes = vec![];
        let route_regex = regex::Regex::new(
            r"[-*]\s*\*\*(GET|POST|PUT|DELETE|PATCH)\*\*\s*`?([^`]+)`?\s*-?\s*(.*)"
        ).ok()?;
        
        for cap in route_regex.captures_iter(content) {
            routes.push(RouteConfig {
                method: cap[1].to_string(),
                path: cap[2].trim().to_string(),
                handler: Self::generate_handler_name(&cap[1], &cap[2]),
                description: cap.get(3).map(|m| m.as_str().to_string()).unwrap_or_default(),
            });
        }
        
        // If no routes found but HTTP indicators present, create minimal config
        if routes.is_empty() {
            routes.push(RouteConfig {
                method: "GET".to_string(),
                path: "/".to_string(),
                handler: "index".to_string(),
                description: "Default route".to_string(),
            });
        }
        
        // Extract port
        let port = Self::extract_pattern(content, r"port[:\s=]+(\d+)")
            .and_then(|p| p.parse().ok());
        
        // Extract middleware hints
        let mut middleware = vec![];
        if content.contains("cors") || content.contains("CORS") {
            middleware.push("cors".to_string());
        }
        if content.contains("auth") || content.contains("jwt") {
            middleware.push("auth".to_string());
        }
        if content.contains("logger") || content.contains("logging") {
            middleware.push("logger".to_string());
        }
        
        Some(CapabilityConfig::Http { routes, port, middleware })
    }
    
    fn extract_persistence_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_persistence_indicators(content) {
            return None;
        }
        
        // Detect database type
        let db_type = if content.contains("postgres") || content.contains("postgresql") {
            "postgresql"
        } else if content.contains("sqlite") {
            "sqlite"
        } else if content.contains("mongodb") || content.contains("mongo") {
            "mongodb"
        } else {
            "postgresql" // default
        }.to_string();
        
        // Extract connection string pattern
        let connection = if let Some(conn) = Self::extract_pattern(content, r"DATABASE_URL[=:]\s*(\S+)") {
            conn
        } else if db_type == "sqlite" {
            "sqlite://./data.db".to_string()
        } else {
            "postgresql://localhost/app".to_string()
        };
        
        // Extract models (simplified - look for ### ModelName sections)
        let mut models = vec![];
        let model_regex = regex::Regex::new(r"###?\s+(\w+)\s*\n.*?```\w*\s*\n(.*?)```").ok()?;
        
        for cap in model_regex.captures_iter(content) {
            let name = cap[1].to_string();
            let fields_block = &cap[2];
            
            // Parse fields from the block
            let mut fields = vec![];
            for line in fields_block.lines() {
                if let Some(field) = Self::parse_field_line(line) {
                    fields.push(field);
                }
            }
            
            if !fields.is_empty() {
                models.push(ModelConfig { name, fields });
            }
        }
        
        let migrations = content.contains("migration") || content.contains("migrate");
        
        Some(CapabilityConfig::Persistence { db_type, connection, models, migrations })
    }
    
    fn extract_realtime_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_realtime_indicators(content) {
            return None;
        }
        
        let endpoints = Self::extract_all_patterns(content, r"(ws://[^\s]+|/ws[^\s]*)")
            .unwrap_or_default();
        
        let events = Self::extract_all_patterns(content, r"event[:\s]+(\w+)")
            .unwrap_or_default();
        
        Some(CapabilityConfig::RealTime { endpoints, events })
    }
    
    fn extract_auth_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_auth_indicators(content) {
            return None;
        }
        
        let auth_type = if content.contains("jwt") {
            "jwt"
        } else if content.contains("oauth") || content.contains("OAuth") {
            "oauth"
        } else if content.contains("session") {
            "session"
        } else {
            "jwt"
        }.to_string();
        
        let protected_paths = Self::extract_all_patterns(content, r"protected[:\s]+(/[^\s]+)")
            .unwrap_or_else(|| vec!["/api".to_string()]);
        
        let expiry = Self::extract_pattern(content, r"expiry[:\s=]+([^\n]+)");
        
        Some(CapabilityConfig::Auth { auth_type, protected_paths, expiry })
    }
    
    fn extract_queue_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_queue_indicators(content) {
            return None;
        }
        
        let backend = if content.contains("redis") {
            "redis"
        } else if content.contains("postgres") {
            "postgres"
        } else {
            "memory"
        }.to_string();
        
        let job_types = Self::extract_all_patterns(content, r"job[:\s]+(\w+)")
            .unwrap_or_else(|| vec!["default".to_string()]);
        
        Some(CapabilityConfig::Queue { backend, job_types })
    }
    
    fn extract_cache_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_cache_indicators(content) {
            return None;
        }
        
        let backend = if content.contains("redis") {
            "redis"
        } else {
            "memory"
        }.to_string();
        
        let default_ttl = Self::extract_pattern(content, r"ttl[:\s=]+(\d+)")
            .and_then(|t| t.parse().ok());
        
        Some(CapabilityConfig::Cache { backend, default_ttl })
    }
    
    fn extract_storage_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_storage_indicators(content) {
            return None;
        }
        
        let backend = if content.contains("s3") || content.contains("S3") {
            "s3"
        } else if content.contains("gcs") {
            "gcs"
        } else {
            "local"
        }.to_string();
        
        let buckets = Self::extract_all_patterns(content, r"bucket[:\s=]+([^\s]+)")
            .unwrap_or_else(|| vec!["default".to_string()]);
        
        Some(CapabilityConfig::Storage { backend, buckets })
    }
    
    fn extract_email_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_email_indicators(content) {
            return None;
        }
        
        let provider = if content.contains("sendgrid") {
            "sendgrid"
        } else if content.contains("ses") || content.contains("AWS") {
            "ses"
        } else {
            "smtp"
        }.to_string();
        
        let from = Self::extract_pattern(content, r"from[:\s=]+<([^>]+)>")
            .unwrap_or_else(|| "app@example.com".to_string());
        
        Some(CapabilityConfig::Email { provider, from })
    }
    
    fn extract_search_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_search_indicators(content) {
            return None;
        }
        
        let backend = if content.contains("elasticsearch") {
            "elasticsearch"
        } else if content.contains("meilisearch") {
            "meilisearch"
        } else {
            "postgres"
        }.to_string();
        
        let indices = Self::extract_all_patterns(content, r"index[:\s]+(\w+)")
            .unwrap_or_default();
        
        Some(CapabilityConfig::Search { backend, indices })
    }
    
    fn extract_observability_config(content: &str) -> Option<CapabilityConfig> {
        if !Self::has_observability_indicators(content) {
            return None;
        }
        
        let metrics_format = if content.contains("prometheus") {
            "prometheus"
        } else {
            "statsd"
        }.to_string();
        
        let health_checks = Self::extract_all_patterns(content, r"health[:\s]+(/[^\s]+)")
            .unwrap_or_else(|| vec!["/health".to_string()]);
        
        Some(CapabilityConfig::Observability { metrics_format, health_checks })
    }
    
    //===========================================================================
    // Helper Methods
    //===========================================================================
    
    fn has_http_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        // Match patterns like: "get /", "**get** `/api`", "post /users"
        lower.contains("get /") || lower.contains("post /") || 
        lower.contains("put /") || lower.contains("delete /") ||
        lower.contains("rest api") || lower.contains("route") ||
        lower.contains("get** `/") || lower.contains("post** `/") ||
        lower.contains("put** `/") || lower.contains("delete** `/")
    }
    
    fn has_persistence_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("database") || lower.contains("postgres") ||
        lower.contains("sqlite") || lower.contains("mongodb") ||
        lower.contains("model") || lower.contains("schema")
    }
    
    fn has_realtime_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("websocket") || lower.contains("ws://") ||
        lower.contains("sse") || lower.contains("real-time") ||
        lower.contains("realtime")
    }
    
    fn has_auth_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("auth") || lower.contains("jwt") ||
        lower.contains("login") || lower.contains("oauth") ||
        lower.contains("session")
    }
    
    fn has_queue_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("queue") || lower.contains("worker") ||
        lower.contains("background") || lower.contains("job")
    }
    
    fn has_cache_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("cache") || lower.contains("redis") ||
        lower.contains("memcached")
    }
    
    fn has_storage_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("s3") || lower.contains("upload") ||
        lower.contains("storage") || lower.contains("bucket")
    }
    
    fn has_email_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("email") || lower.contains("smtp") ||
        lower.contains("notification") || lower.contains("mail")
    }
    
    fn has_search_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("search") || lower.contains("elasticsearch") ||
        lower.contains("meilisearch") || lower.contains("index")
    }
    
    fn has_observability_indicators(content: &str) -> bool {
        let lower = content.to_lowercase();
        lower.contains("metrics") || lower.contains("prometheus") ||
        lower.contains("monitoring") || lower.contains("observability") ||
        lower.contains("health") || lower.contains("tracing")
    }
    
    fn extract_title(content: &str) -> Option<String> {
        // Look for # Title
        content.lines()
            .find(|l| l.starts_with("# "))
            .map(|l| l.trim_start_matches("# ").trim().to_string())
    }
    
    fn extract_pattern(content: &str, pattern: &str) -> Option<String> {
        let regex = regex::Regex::new(pattern).ok()?;
        regex.captures(content).map(|c| c[1].to_string())
    }
    
    fn extract_all_patterns(content: &str, pattern: &str) -> Option<Vec<String>> {
        let regex = regex::Regex::new(pattern).ok()?;
        let matches: Vec<_> = regex.captures_iter(content)
            .map(|c| c[1].to_string())
            .collect();
        if matches.is_empty() { None } else { Some(matches) }
    }
    
    fn find_evidence(content: &str, patterns: &[&str]) -> Vec<String> {
        let mut evidence = vec![];
        for line in content.lines() {
            for pattern in patterns {
                if line.to_lowercase().contains(pattern) {
                    evidence.push(line.trim().to_string());
                    break;
                }
            }
        }
        evidence
    }
    
    fn generate_handler_name(method: &str, path: &str) -> String {
        // Convert "GET /api/users/:id" -> "getUserById"
        let clean_path = path.replace(['/', ':', '-'], "_").replace("__", "_");
        format!("{}{}", method.to_lowercase(), clean_path)
    }
    
    fn parse_field_line(line: &str) -> Option<FieldConfig> {
        // Parse lines like "  name: string;" or "  age: number,"
        let parts: Vec<_> = line.trim().split(':').collect();
        if parts.len() >= 2 {
            let name = parts[0].trim().to_string();
            let rest = parts[1].trim();
            let field_type = rest.split(&[';', ',', ' '][..]).next()?.to_string();
            let required = !rest.contains("?");
            
            Some(FieldConfig { name, field_type, required })
        } else {
            None
        }
    }
    
    fn slugify(s: &str) -> String {
        s.to_lowercase()
            .replace(" ", "-")
            .replace("_", "-")
            .replace(|c: char| !c.is_alphanumeric() && c != '-', "")
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_simple_api() {
        let spec = r#"
# User API

A simple REST API for user management.

## API
- **GET** `/api/users` - List users
- **POST** `/api/users` - Create user

## Database
User model with postgres.

## Build
template = "ts-hono"
"#;

        let result = KittyCapabilityParser::parse(spec);
        assert!(result.is_ok());
        
        let cap_spec = result.unwrap();
        assert_eq!(cap_spec.global_config.project_name, "user-api");
        assert_eq!(cap_spec.global_config.language, "typescript");
        
        // Should detect HTTP and Persistence
        let cap_names: Vec<_> = cap_spec.capabilities.iter()
            .map(|c| format!("{:?}", c.capability))
            .collect();
        
        assert!(cap_names.contains(&"Http".to_string()));
        assert!(cap_names.contains(&"Persistence".to_string()));
        
        // Check HTTP config
        let http = cap_spec.capabilities.iter()
            .find(|c| matches!(c.config, CapabilityConfig::Http { .. }));
        assert!(http.is_some());
        
        if let Some(http_cap) = http {
            if let CapabilityConfig::Http { routes, .. } = &http_cap.config {
                assert_eq!(routes.len(), 2);
                assert_eq!(routes[0].method, "GET");
                assert_eq!(routes[0].path, "/api/users");
            }
        }
    }

    #[test]
    fn test_parse_dataflow() {
        let spec = r#"
# Data Pipeline

Stream processing for analytics.

## Sources
- Kafka: user-events topic
- Files: /data/incoming/*.csv

## Sinks
- PostgreSQL: processed_events table
- S3: parquet files

## Monitoring
Prometheus metrics for lag and throughput.

## Build
template = "rust"
"#;

        let result = KittyCapabilityParser::parse(spec);
        assert!(result.is_ok());
        
        let cap_spec = result.unwrap();
        
        // Should detect Persistence, Storage, Observability - NO HTTP!
        let caps: Vec<_> = cap_spec.capabilities.iter()
            .map(|c| c.capability.clone())
            .collect();
        
        assert!(!caps.contains(&Capability::Http), "Data pipeline shouldn't have HTTP");
        assert!(caps.contains(&Capability::Persistence));
        assert!(caps.contains(&Capability::Storage));
        assert!(caps.contains(&Capability::Observability));
    }

    #[test]
    fn test_parse_fullstack() {
        let spec = r#"
# E-Commerce Platform

Full-featured store.

## API
- **GET** `/api/products` - List products
- WebSocket for live inventory

## Database
PostgreSQL with products, orders.

## Features
- Auth: JWT
- Cache: Redis
- Queue: background jobs
- Email: order confirmations
- Storage: S3 images
- Search: Elasticsearch
- Metrics: Prometheus
"#;

        let result = KittyCapabilityParser::parse(spec);
        assert!(result.is_ok());
        
        let cap_spec = result.unwrap();
        
        // Should have ALL capabilities
        let cap_names: Vec<_> = cap_spec.capabilities.iter()
            .map(|c| format!("{:?}", c.capability))
            .collect();
        
        assert!(cap_names.contains(&"Http".to_string()));
        assert!(cap_names.contains(&"Persistence".to_string()));
        assert!(cap_names.contains(&"Auth".to_string()));
        assert!(cap_names.contains(&"Cache".to_string()));
        assert!(cap_names.contains(&"Queue".to_string()));
        assert!(cap_names.contains(&"Email".to_string()));
        assert!(cap_names.contains(&"Storage".to_string()));
        assert!(cap_names.contains(&"Search".to_string()));
        assert!(cap_names.contains(&"Observability".to_string()));
        assert!(cap_names.contains(&"RealTime".to_string()));
    }
}
