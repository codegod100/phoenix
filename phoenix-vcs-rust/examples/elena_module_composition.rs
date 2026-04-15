//! Example: Composing Elena App with Module Fulfillment
//!
//! This shows how the new module-based system works:
//! - No bundles, just modules
//! - Modules declare needs (Database, Cache, etc.)
//! - System resolves which modules fulfill those needs
//! - Multiple providers can satisfy the same interface

use phoenix_vcs::capability_fulfillment::*;

fn main() {
    // Define the Elena web app module
    let elena_app = Module {
        id: "elena-dashboard".to_string(),
        name: "Elena Dashboard".to_string(),
        version: "1.0.0".to_string(),
        provides: vec![
            ProvidedCapability {
                interface: CapabilityInterface::WebComponents,
                properties: [("framework".to_string(), PropertyValue::String("elenajs".to_string()))].into(),
                endpoint: Some("http://localhost:5173".to_string()),
                cost_per_hour: None,
            },
        ],
        needs: vec![
            // Needs an HTTP server for API
            NeededCapability {
                interface: CapabilityInterface::HttpServer,
                strategy: FulfillmentStrategy::FirstAvailable,
                optional: false,
                min_capacity: None,
            },
            // Needs a database for todos/users
            NeededCapability {
                interface: CapabilityInterface::Database,
                strategy: FulfillmentStrategy::Constrained(vec![
                    Constraint::HasProperty("persistence".to_string()),
                ]),
                optional: false,
                min_capacity: None,
            },
            // Optionally uses cache for performance
            NeededCapability {
                interface: CapabilityInterface::Cache,
                strategy: FulfillmentStrategy::FirstAvailable,
                optional: true,
                min_capacity: None,
            },
        ],
        language: "typescript".to_string(),
        source: ModuleSource::LocalPath("./apps/elena".to_string()),
        config_schema: serde_json::json!({
            "title": "api_url",
            "type": "string"
        }),
        is_infrastructure: false,
    };

    // Define infrastructure modules (providers)
    
    let hono_server = Module {
        id: "hono-api".to_string(),
        name: "Hono HTTP Server".to_string(),
        version: "3.12".to_string(),
        provides: vec![
            ProvidedCapability {
                interface: CapabilityInterface::HttpServer,
                properties: [
                    ("framework".to_string(), PropertyValue::String("hono".to_string())),
                    ("runtime".to_string(), PropertyValue::String("bun".to_string())),
                ].into(),
                endpoint: Some("http://localhost:3000".to_string()),
                cost_per_hour: None,
            },
        ],
        needs: vec![], // Infrastructure modules might have their own needs
        language: "typescript".to_string(),
        source: ModuleSource::Git { 
            url: "https://github.com/honojs/node-server".to_string(),
            reference: "main".to_string(),
        },
        config_schema: serde_json::json!({}),
        is_infrastructure: true,
    };

    // Multiple database providers - system picks based on constraints
    
    let postgres_db = Module {
        id: "postgres".to_string(),
        name: "PostgreSQL".to_string(),
        version: "15".to_string(),
        provides: vec![
            ProvidedCapability {
                interface: CapabilityInterface::Database,
                properties: [
                    ("type".to_string(), PropertyValue::String("sql".to_string())),
                    ("persistence".to_string(), PropertyValue::String("durable".to_string())),
                    ("max_connections".to_string(), PropertyValue::Number(100.0)),
                ].into(),
                endpoint: Some("postgresql://localhost:5432/elena".to_string()),
                cost_per_hour: Some(0.05),
            },
        ],
        needs: vec![],
        language: "nix".to_string(),
        source: ModuleSource::Registry { 
            name: "nixpkgs/postgres".to_string(), 
            version: "15".to_string(),
        },
        config_schema: serde_json::json!({}),
        is_infrastructure: true,
    };

    let sqlite_db = Module {
        id: "sqlite".to_string(),
        name: "SQLite".to_string(),
        version: "3.44".to_string(),
        provides: vec![
            ProvidedCapability {
                interface: CapabilityInterface::Database,
                properties: [
                    ("type".to_string(), PropertyValue::String("sql".to_string())),
                    ("persistence".to_string(), PropertyValue::String("file".to_string())),
                    ("embedded".to_string(), PropertyValue::Bool(true)),
                ].into(),
                endpoint: Some("file:./data/app.db".to_string()),
                cost_per_hour: Some(0.0), // Free!
            },
        ],
        needs: vec![],
        language: "nix".to_string(),
        source: ModuleSource::Inline { 
            code: "sqlite3".to_string(),
        },
        config_schema: serde_json::json!({}),
        is_infrastructure: true,
    };

    let redis_cache = Module {
        id: "redis".to_string(),
        name: "Redis Cache".to_string(),
        version: "7".to_string(),
        provides: vec![
            ProvidedCapability {
                interface: CapabilityInterface::Cache,
                properties: [
                    ("type".to_string(), PropertyValue::String("kv".to_string())),
                    ("max_memory".to_string(), PropertyValue::Number(512.0)), // MB
                ].into(),
                endpoint: Some("redis://localhost:6379".to_string()),
                cost_per_hour: Some(0.02),
            },
        ],
        needs: vec![],
        language: "nix".to_string(),
        source: ModuleSource::Registry { 
            name: "nixpkgs/redis".to_string(), 
            version: "7".to_string(),
        },
        config_schema: serde_json::json!({}),
        is_infrastructure: true,
    };

    // Compose the system
    println!("🧩 Composing Elena Dashboard system...\n");
    
    let system = SystemBuilder::new()
        .with_available(vec![
            hono_server,
            postgres_db,
            sqlite_db,  // Alternative database
            redis_cache,
        ])
        .add_module(elena_app)
        .with_rule(ResolutionRule::PreferProvider { 
            pattern: "postgres".to_string(), 
            weight: 10,
        })
        .compose()
        .expect("System composition failed");

    // Show the composed system
    println!("✅ System composed with {} modules:\n", system.modules.len());
    
    for module in &system.modules {
        let icon = if module.is_infrastructure { "🔧" } else { "📦" };
        println!("{} {} ({})", icon, module.name, module.language);
        
        if let Some(fulfillments) = system.fulfillments.get(&module.id) {
            for f in fulfillments {
                println!("   └─ {} → {} via {}",
                    format!("{:?}", f.need.interface),
                    f.provider.name,
                    f.connection.connection_string
                );
            }
        }
    }

    if !system.warnings.is_empty() {
        println!("\n⚠️ Warnings:");
        for warning in &system.warnings {
            println!("   {}", warning);
        }
    }

    // Generate deployment config
    let deployment = generate_deployment_config(&system);
    println!("\n🚀 Generated deployment config:");
    println!("{}", serde_json::to_string_pretty(&deployment).unwrap());
}
