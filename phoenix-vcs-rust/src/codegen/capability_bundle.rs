//! Capability-Based Modular Bundle System
//!
//! Instead of fixed templates (ts-hono, python-flask), detect what the spec
//! actually needs and assemble modules dynamically.
//!
//! Capabilities are like feature flags that get enabled based on spec analysis:
//! - Core (always): project structure, config, build files
//! - HTTP: if routes detected → add handlers, middleware, routing
//! - Persistence: if models detected → add database, migrations, repositories
//! - RealTime: if websockets mentioned → add socket handlers, pub/sub
//! - Auth: if auth keywords detected → add auth middleware, JWT, sessions
//! - Queue: if background jobs mentioned → add job processor, scheduler
//! - Cache: if caching mentioned → add Redis, caching layer
//!
//! Each capability contributes vertices/edges to a shared Schema,
//! then emit_with_protocol generates the final code.

use std::collections::HashSet;
use crate::codegen::emit_bundle::{EmitBuilder, create_protocol, statement_rules, ncl_rules};
use crate::pipeline::bundle_stack::BundleConfig;
use panproto_schema::Protocol;

/// Detected capabilities from spec analysis
#[derive(Debug, Clone, PartialEq, Eq, Hash)]
pub enum Capability {
    /// Core project structure (always enabled)
    Core,
    /// HTTP server with routes
    Http,
    /// Database persistence with models
    Persistence,
    /// Real-time (WebSockets, SSE)
    RealTime,
    /// Authentication & authorization
    Auth,
    /// Background job processing
    Queue,
    /// Caching layer
    Cache,
    /// File storage / uploads
    Storage,
    /// Email sending
    Email,
    /// Search functionality
    Search,
    /// Metrics & observability
    Observability,
}

impl Capability {
    /// Get the object kinds this capability needs
    pub fn obj_kinds(&self) -> Vec<String> {
        match self {
            Capability::Core => vec![
                "comment".to_string(),
                "import_statement".to_string(),
                "variable_declaration".to_string(),
                "expression_statement".to_string(),
                "function_definition".to_string(),
            ],
            Capability::Http => vec![
                "function_definition".to_string(),  // Route handlers
                "import_statement".to_string(),
                "variable_declaration".to_string(),
            ],
            Capability::Persistence => vec![
                "import_statement".to_string(),
                "variable_declaration".to_string(),
                "function_definition".to_string(),
            ],
            _ => vec![
                "import_statement".to_string(),
                "variable_declaration".to_string(),
                "function_definition".to_string(),
            ],
        }
    }

    /// Get edge rules for this capability
    pub fn edge_rules(&self) -> Vec<(&'static str, Vec<&'static str>)> {
        match self {
            Capability::Core => vec![
                ("comment", vec!["file"]),
                ("import", vec!["module"]),
            ],
            Capability::Http => vec![
                ("route", vec!["handler", "middleware"]),
                ("handler", vec!["request", "response"]),
                ("middleware", vec!["route"]),
            ],
            Capability::Persistence => vec![
                ("model", vec!["field", "repository"]),
                ("migration", vec!["model"]),
            ],
            Capability::RealTime => vec![
                ("websocket", vec!["event", "channel"]),
                ("channel", vec!["event"]),
            ],
            _ => vec![],
        }
    }
}

/// Analyzes a spec and detects required capabilities
pub struct CapabilityDetector;

impl CapabilityDetector {
    /// Detect capabilities from spec content
    pub fn detect(spec_content: &str) -> HashSet<Capability> {
        let content = spec_content.to_lowercase();
        let mut caps = HashSet::new();

        // Core is always present
        caps.insert(Capability::Core);

        // HTTP detection
        if Self::has_http_indicators(&content) {
            caps.insert(Capability::Http);
        }

        // Persistence detection
        if Self::has_persistence_indicators(&content) {
            caps.insert(Capability::Persistence);
        }

        // Real-time detection
        if Self::has_realtime_indicators(&content) {
            caps.insert(Capability::RealTime);
        }

        // Auth detection
        if Self::has_auth_indicators(&content) {
            caps.insert(Capability::Auth);
        }

        // Queue detection
        if Self::has_queue_indicators(&content) {
            caps.insert(Capability::Queue);
        }

        // Cache detection
        if Self::has_cache_indicators(&content) {
            caps.insert(Capability::Cache);
        }

        // Storage detection
        if Self::has_storage_indicators(&content) {
            caps.insert(Capability::Storage);
        }

        // Email detection
        if Self::has_email_indicators(&content) {
            caps.insert(Capability::Email);
        }

        // Search detection
        if Self::has_search_indicators(&content) {
            caps.insert(Capability::Search);
        }

        // Observability detection
        if Self::has_observability_indicators(&content) {
            caps.insert(Capability::Observability);
        }

        caps
    }

    fn has_http_indicators(content: &str) -> bool {
        // Match patterns like "get /api", "post /users", "**get** `/api`"
        content.contains("get /") || 
        content.contains("post /") ||
        content.contains("put /") ||
        content.contains("delete /") ||
        content.contains("patch /") ||
        content.contains("api endpoint") ||
        content.contains("rest api") ||
        content.contains("route") ||
        // Also match markdown bold/code format: **get** `/path`
        content.contains("get** `/") ||
        content.contains("post** `/") ||
        content.contains("put** `/") ||
        content.contains("delete** `/")
    }

    fn has_persistence_indicators(content: &str) -> bool {
        content.contains("database") ||
        content.contains("model") ||
        content.contains("postgres") ||
        content.contains("sqlite") ||
        content.contains("mongodb") ||
        content.contains("entity") ||
        content.contains("table") ||
        content.contains("migration")
    }

    fn has_realtime_indicators(content: &str) -> bool {
        content.contains("websocket") ||
        content.contains("realtime") ||
        content.contains("real-time") ||
        content.contains("sse") ||
        content.contains("event stream") ||
        content.contains("live updates")
    }

    fn has_auth_indicators(content: &str) -> bool {
        content.contains("auth") ||
        content.contains("login") ||
        content.contains("jwt") ||
        content.contains("session") ||
        content.contains("oauth") ||
        content.contains("permission") ||
        content.contains("role")
    }

    fn has_queue_indicators(content: &str) -> bool {
        content.contains("queue") ||
        content.contains("job") ||
        content.contains("worker") ||
        content.contains("background") ||
        content.contains("async task") ||
        content.contains("schedule")
    }

    fn has_cache_indicators(content: &str) -> bool {
        content.contains("cache") ||
        content.contains("redis") ||
        content.contains("memcached") ||
        content.contains("ttl")
    }

    fn has_storage_indicators(content: &str) -> bool {
        content.contains("s3") ||
        content.contains("upload") ||
        content.contains("file storage") ||
        content.contains("blob")
    }

    fn has_email_indicators(content: &str) -> bool {
        content.contains("email") ||
        content.contains("smtp") ||
        content.contains("notification") ||
        content.contains("mail")
    }

    fn has_search_indicators(content: &str) -> bool {
        content.contains("search") ||
        content.contains("elasticsearch") ||
        content.contains("full-text") ||
        content.contains("index")
    }

    fn has_observability_indicators(content: &str) -> bool {
        content.contains("metric") ||
        content.contains("monitoring") ||
        content.contains("observability") ||
        content.contains("tracing") ||
        content.contains("prometheus") ||
        content.contains("grafana")
    }
}

/// A module contributes schema vertices/edges for a capability
pub trait CapabilityModule {
    /// Get the capability this module implements
    fn capability(&self) -> Capability;

    /// Contribute to the schema builder
    /// 
    /// The module adds its vertices/edges to the builder based on spec content
    fn contribute(&self, builder: EmitBuilder, spec: &BundleConfig) -> Result<EmitBuilder, String>;

    /// Get dependencies on other capabilities
    fn dependencies(&self) -> Vec<Capability> {
        vec![]
    }
}

/// HTTP capability module - adds routes, handlers, middleware
pub struct HttpModule;

impl CapabilityModule for HttpModule {
    fn capability(&self) -> Capability {
        Capability::Http
    }

    fn contribute(&self, mut builder: EmitBuilder, spec: &BundleConfig) -> Result<EmitBuilder, String> {
        // Add HTTP imports
        builder = builder.vertex("http_imports", "import_statement", Some("import { Hono } from 'hono';\n"))?;

        // Add app initialization
        builder = builder.vertex("app_init", "variable_declaration", Some("const app = new Hono();\n"))?;
        builder = builder.edge("http_imports", "app_init", "next")?;

        // Add routes as function definitions
        for (idx, route) in spec.routes.iter().enumerate() {
            let route_id = format!("route_{}", idx);
            
            // Route handler as function definition
            let route_code = format!(
                "app.{}('{}', (c) => {{\n  return c.json({{ status: 'ok' }});\n}});\n",
                route.method.to_lowercase(),
                route.path
            );
            
            // Use function_definition kind which is allowed in statement_rules
            builder = builder.vertex(&route_id, "function_definition", Some(&route_code))?;
            
            if idx == 0 {
                builder = builder.edge("app_init", &route_id, "next")?;
            } else {
                let prev = format!("route_{}", idx - 1);
                builder = builder.edge(&prev, &route_id, "next")?;
            }
        }

        // Add export
        builder = builder.vertex("export", "expression_statement", Some("export default app;\n"))?;
        let last_route = format!("route_{}", spec.routes.len().saturating_sub(1));
        builder = builder.edge(&last_route, "export", "next")?;

        Ok(builder)
    }
}

/// Database capability module - adds models, migrations
pub struct PersistenceModule;

impl CapabilityModule for PersistenceModule {
    fn capability(&self) -> Capability {
        Capability::Persistence
    }

    fn dependencies(&self) -> Vec<Capability> {
        vec![] // Can work standalone (CLI tool with DB)
    }

    fn contribute(&self, mut builder: EmitBuilder, spec: &BundleConfig) -> Result<EmitBuilder, String> {
        // Add DB imports
        builder = builder.vertex(
            "db_imports", 
            "import_statement", 
            Some("import { drizzle } from 'drizzle-orm/node-postgres';\nimport { Pool } from 'pg';\n")
        )?;

        // Add connection
        builder = builder.vertex(
            "db_connection",
            "variable_declaration",
            Some("const pool = new Pool({ connectionString: process.env.DATABASE_URL });\nconst db = drizzle(pool);\n")
        )?;
        builder = builder.edge("db_imports", "db_connection", "next")?;

        // TODO: Add models from spec when BundleConfig supports them
        // For now, add a generic example model using function_definition
        let model_id = "example_model";
        let model_code = "export const ExampleTable = pgTable('examples', {\n  id: uuid('id').primaryKey(),\n  createdAt: timestamp('created_at').defaultNow(),\n});\n";
        
        builder = builder.vertex(model_id, "variable_declaration", Some(model_code))?;
        builder = builder.edge("db_connection", model_id, "next")?;

        Ok(builder)
    }
}

/// Core capability module - always present
pub struct CoreModule {
    pub language: String,
}

impl CapabilityModule for CoreModule {
    fn capability(&self) -> Capability {
        Capability::Core
    }

    fn contribute(&self, mut builder: EmitBuilder, spec: &BundleConfig) -> Result<EmitBuilder, String> {
        // Add header comment
        let header = format!("// Generated via emit_with_protocol\n// Capabilities: {:?}\n\n", 
            CapabilityDetector::detect("// TODO: pass actual spec content"));
        
        builder = builder.vertex("header", "comment", Some(&header))?;

        Ok(builder)
    }
}

/// Assemble a bundle from detected capabilities
pub struct ModularBundleAssembler {
    pub modules: Vec<Box<dyn CapabilityModule>>, // Made public for demo
}

impl ModularBundleAssembler {
    /// Create assembler for detected capabilities
    pub fn from_capabilities(caps: &HashSet<Capability>, language: &str) -> Self {
        let mut modules: Vec<Box<dyn CapabilityModule>> = vec![];

        // Core is always first
        modules.push(Box::new(CoreModule { 
            language: language.to_string() 
        }));

        // Add modules based on capabilities
        if caps.contains(&Capability::Http) {
            modules.push(Box::new(HttpModule));
        }

        if caps.contains(&Capability::Persistence) {
            modules.push(Box::new(PersistenceModule));
        }

        // TODO: Add more modules

        Self { modules }
    }

    /// Build schema by assembling all modules
    pub fn assemble(&self, spec: &BundleConfig) -> Result<EmitBuilder, String> {
        // Collect all object kinds and edge rules from capabilities
        let mut all_obj_kinds = HashSet::new();
        let mut all_edge_rules = vec![];

        for module in &self.modules {
            let cap = module.capability();
            for kind in cap.obj_kinds() {
                all_obj_kinds.insert(kind);
            }
            for (edge, targets) in cap.edge_rules() {
                all_edge_rules.push((edge, targets));
            }
        }

        // Create protocol with all needed kinds
        let obj_kinds: Vec<String> = all_obj_kinds.into_iter().collect();
        let protocol = create_protocol("typescript", obj_kinds, statement_rules());

        // Start builder
        let mut builder = EmitBuilder::new(&protocol, "typescript");

        // Each module contributes
        for module in &self.modules {
            builder = module.contribute(builder, spec)?;
        }

        Ok(builder)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_capability_detection() {
        let http_spec = "GET /api/users - List users";
        let caps = CapabilityDetector::detect(http_spec);
        
        assert!(caps.contains(&Capability::Core));
        assert!(caps.contains(&Capability::Http));
        assert!(!caps.contains(&Capability::Persistence));

        let full_spec = r#"
## API
GET /api/users

## Database
User model with postgres

## Real-time
WebSocket connections

## Auth
JWT tokens for login
"#;
        
        let caps = CapabilityDetector::detect(full_spec);
        assert!(caps.contains(&Capability::Http));
        assert!(caps.contains(&Capability::Persistence));
        assert!(caps.contains(&Capability::RealTime));
        assert!(caps.contains(&Capability::Auth));
    }

    #[test]
    fn test_dataflow_no_http() {
        let dataflow_spec = r#"
## Data Pipeline
Sources: Kafka, Files
Transforms: Filter, Enrich
Sinks: PostgreSQL, S3
"#;
        
        let caps = CapabilityDetector::detect(dataflow_spec);
        assert!(caps.contains(&Capability::Core));
        assert!(!caps.contains(&Capability::Http), "Dataflow shouldn't need HTTP");
        assert!(caps.contains(&Capability::Persistence), "But should have persistence");
    }

    #[test]
    fn test_tui_no_http() {
        let tui_spec = r#"
## TUI Dashboard
Widgets: CPU chart, process table
Key bindings: q quit, Tab focus
Metrics: CPU usage, memory
Monitoring with Prometheus
"#;
        
        let caps = CapabilityDetector::detect(tui_spec);
        assert!(caps.contains(&Capability::Core));
        assert!(!caps.contains(&Capability::Http), "TUI shouldn't need HTTP");
        assert!(caps.contains(&Capability::Observability), "But should have observability");
    }
}
