//! Capability-Based Bundle Demo
//!
//! Shows how the modular capability system assembles bundles dynamically
//! based on what the spec actually needs.

#[cfg(test)]
mod tests {
    use crate::codegen::capability_bundle::{Capability, CapabilityDetector};
    use std::collections::HashSet;

    /// Demo: Web API with Database
    #[test]
    fn demo_web_api_with_db() {
        let spec = r#"
# User Management API

## Overview
A REST API for managing users with persistence.

## API Endpoints
- **GET** `/api/users` - List users
- **POST** `/api/users` - Create user
- **PUT** `/api/users/:id` - Update user
- **DELETE** /api/users/:id - Delete user

## Database Schema
### User
- id: UUID (PK)
- email: String (unique)
- name: String
- created_at: Timestamp

## Auth
JWT-based authentication required

## Template
template = "ts-hono"
"#;

        let caps = CapabilityDetector::detect(spec);
        
        println!("\n🌐 Web API with DB");
        println!("Detected capabilities: {:?}", caps);
        
        assert!(caps.contains(&Capability::Core));
        assert!(caps.contains(&Capability::Http));
        assert!(caps.contains(&Capability::Persistence));
        assert!(caps.contains(&Capability::Auth));
        
        // Would generate:
        // - HTTP handlers for routes
        // - Database models with Drizzle
        // - Auth middleware
        // - All wired together via schema edges
    }

    /// Demo: Data Pipeline (No HTTP!)
    #[test]
    fn demo_data_pipeline() {
        let spec = r#"
# DataFlow ETL Pipeline

## Overview
Stream processing pipeline for analytics.

## Sources
- Kafka: user-events topic
- File watcher: /data/incoming/*.csv

## Parsers
- JSON parser for events
- CSV parser for files

## Transforms
- Filter: valid events only
- Enrich: add geo location
- Aggregate: 5-minute windows

## Sinks
- PostgreSQL: processed_events table
- S3: parquet files partitioned by date

## Monitoring
Metrics: records_processed, lag_seconds

## Build
template = "rust"
"#;

        let caps = CapabilityDetector::detect(spec);
        
        println!("\n📊 Data Pipeline (No HTTP!)");
        println!("Detected capabilities: {:?}", caps);
        
        assert!(caps.contains(&Capability::Core));
        assert!(caps.contains(&Capability::Persistence), "Has DB sink");
        assert!(caps.contains(&Capability::Observability), "Has metrics");
        assert!(!caps.contains(&Capability::Http), "No HTTP routes!");
        
        // Would generate:
        // - Kafka consumer (not HTTP server!)
        // - Transform functions
        // - DB writer
        // - Metrics exporter
    }

    /// Demo: TUI Dashboard (Terminal!)
    #[test]
    fn demo_tui_dashboard() {
        let spec = r#"
# System Monitor TUI

## Overview
Terminal dashboard for system metrics.

## Layout
- Header: hostname, uptime
- CPU: sparkline chart
- Memory: gauge
- Processes: sortable table
- Logs: scrollable view

## Interactions
Key bindings:
- `q`: quit
- `Tab`: next widget
- `j/k`: navigate
- `Enter`: details
- `F9`: kill process

## Data Sources
- /proc/stat (CPU)
- /proc/meminfo (memory)
- journald (logs)

## Styling
Colors: dark theme with cyan accents

## Build
template = "python-textual"
"#;

        let caps = CapabilityDetector::detect(spec);
        
        println!("\n🖥️  TUI Dashboard (Terminal!)");
        println!("Detected capabilities: {:?}", caps);
        
        assert!(caps.contains(&Capability::Core));
        assert!(caps.contains(&Capability::Observability), "System metrics");
        assert!(!caps.contains(&Capability::Http), "No web server!");
        // Note: TUI might trigger false positives due to words like "table"
        // This is a limitation of keyword-based detection
        
        // Would generate:
        // - Textual widgets (not HTTP routes!)
        // - Key binding handlers
        // - Data pollers
        // - Render loops
    }

    /// Demo: Full-Stack with Everything
    #[test]
    fn demo_fullstack_app() {
        let spec = r#"
# E-Commerce Platform

## API
REST endpoints for products, orders, users
- **GET** `/api/products` - List products
WebSocket for real-time inventory

## Database
PostgreSQL with tables:
- products, orders, users
- migrations included

## Features
- Auth: JWT + sessions
- Cache: Redis for product catalog
- Queue: background order processing
- Email: order confirmations
- Storage: S3 for product images
- Search: Elasticsearch
- Monitoring: Prometheus metrics

## Build
template = "ts-hono"
"#;

        let caps = CapabilityDetector::detect(spec);
        
        println!("\n🏪 Full-Stack E-Commerce");
        println!("Detected capabilities: {:?}", caps);
        
        // Everything!
        assert!(caps.contains(&Capability::Core));
        assert!(caps.contains(&Capability::Http));
        assert!(caps.contains(&Capability::Persistence));
        assert!(caps.contains(&Capability::RealTime));
        assert!(caps.contains(&Capability::Auth));
        assert!(caps.contains(&Capability::Queue));
        assert!(caps.contains(&Capability::Cache));
        assert!(caps.contains(&Capability::Storage));
        assert!(caps.contains(&Capability::Email));
        assert!(caps.contains(&Capability::Search));
        assert!(caps.contains(&Capability::Observability));
        
        // Would generate a MASSIVE schema with all modules connected:
        // HTTP → Auth → Cache → Database
        //      → Queue → Email
        //      → RealTime
        // Search → Database
        // Storage → Database
    }

    /// Demo: Capability Matrix
    #[test]
    fn demo_capability_matrix() {
        let test_cases = vec![
            ("Simple API", "GET /hello", vec![Capability::Core, Capability::Http]),
            ("API + DB", "GET /users\nUser model", vec![Capability::Core, Capability::Http, Capability::Persistence]),
            ("CLI Tool", "Command line args\nFile processing", vec![Capability::Core]),
            // Note: WebSocket alone doesn't trigger HTTP - need explicit routes or "api" keyword
            ("Real-time Chat", "WebSocket API\nGET /ws\nDatabase store", vec![Capability::Core, Capability::Http, Capability::RealTime, Capability::Persistence]),
            ("Static Site", "No backend\nJust HTML", vec![Capability::Core]),
        ];

        println!("\n📊 Capability Matrix");
        println!("{:<20} | {:<30} | Capabilities", "App Type", "Spec Snippet");
        println!("{}", "-".repeat(80));

        for (name, spec, expected) in test_cases {
            let caps = CapabilityDetector::detect(spec);
            let cap_names: Vec<_> = caps.iter().map(|c| format!("{:?}", c)).collect();
            println!("{:<20} | {:<30} | {}", name, spec.replace('\n', " "), cap_names.join(", "));
            
            for cap in &expected {
                assert!(caps.contains(cap), "{} should have {:?}", name, cap);
            }
        }
    }

    /// Demo: Composing Modules
    #[test]
    fn demo_module_composition() {
        use crate::codegen::capability_bundle::{ModularBundleAssembler, CoreModule, HttpModule, PersistenceModule};
        use crate::pipeline::bundle_stack::{BundleConfig, RouteConfig};

        // Build a spec with HTTP + DB
        let spec = BundleConfig {
            project_name: "user-api".to_string(),
            version: "1.0.0".to_string(),
            project_description: Some("User API with database".to_string()),
            theme: Some("default".to_string()),
            routes: vec![
                RouteConfig { 
                    method: "GET".to_string(), 
                    path: "/users".to_string(), 
                    handler: "listUsers".to_string(),
                    description: "List users".to_string(),
                },
                RouteConfig { 
                    method: "POST".to_string(), 
                    path: "/users".to_string(), 
                    handler: "createUser".to_string(),
                    description: "Create user".to_string(),
                },
            ],
            extra: {
                let mut e = std::collections::HashMap::new();
                e.insert("template".to_string(), "ts-hono".to_string());
                e
            },
            raw_spec: "GET /users\nUser model".to_string(),
        };

        // Detect capabilities
        let caps = {
            let mut c = HashSet::new();
            c.insert(Capability::Core);
            c.insert(Capability::Http);
            c.insert(Capability::Persistence);
            c
        };

        // Assemble modules
        let assembler = ModularBundleAssembler::from_capabilities(&caps, "typescript");
        let builder = assembler.assemble(&spec);

        println!("\n🔧 Module Composition");
        println!("Capabilities: {:?}", caps);
        println!("Modules assembled: {} modules", assembler.modules.len());
        
        if let Err(e) = &builder {
            println!("Assembly error: {}", e);
        }
        
        assert!(builder.is_ok(), "Assembly should succeed: {:?}", builder.err());
    }
}
