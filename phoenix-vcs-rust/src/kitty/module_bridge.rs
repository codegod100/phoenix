//! Kitty Module Bridge
//! 
//! Bridges Kitty's categorical grammar to module tensor networks.
//! 
//! Parse flow:
//!   spec.md → CCG Tree → Pregroup Types → Module Network → Deploy
//!
//! Grammar mapping:
//!   "Hono server with logging connects to Postgres database"
//!   
//!   CCG Parse:
//!     S
//!     ├── NP (Hono server with logging)
//!     │   ├── N (Hono)
//!     │   ├── N (server)
//!     │   └── PP (with logging)
//!     │       └── NP (logging)
//!     └── VP (connects to Postgres database)
//!         ├── V (connects)
//!         └── PP (to Postgres database)
//!             └── NP (Postgres database)
//!   
//!   Pregroup Types:
//!     hono-server : I → HttpServer ⊗ Logging
//!     postgres : I → Database
//!     
//!   Wiring (Cup):
//!     hono-server.Database.l ⊗ postgres.Database.r → I
//!     
//!   Result:
//!     Valid diagram with contracted indices

use crate::kitty::parser::{CCGTree, CCGType, CCGRule};
use crate::kitty::tree::PregroupTreeNode;
use crate::kitty::types::PregroupType;
use crate::kitty::module_tensor_network::{ModuleTensorNetwork, ModuleBox, FulfillmentCup};
use crate::capability_fulfillment::{Module, CapabilityInterface, ProvidedCapability, NeededCapability, FulfillmentStrategy, ModuleSource};

/// Parsed module specification from natural language
#[derive(Debug)]
pub struct ParsedModuleSpec {
    /// Modules extracted from the spec
    pub modules: Vec<Module>,
    
    /// Connections between modules
    pub connections: Vec<ModuleConnection>,
    
    /// The raw CCG tree
    pub ccg_tree: CCGTree,
    
    /// The pregroup derivation
    pub pregroup: PregroupTreeNode,
}

/// A connection between two modules
#[derive(Debug, Clone)]
pub struct ModuleConnection {
    pub consumer: String,        // Module that needs
    pub provider: String,        // Module that provides
    pub interface: CapabilityInterface,
    pub relation: ConnectionRelation,  // How they're connected (with, to, via, etc.)
}

#[derive(Debug, Clone)]
pub enum ConnectionRelation {
    Direct,      // "X connects to Y"
    Via,         // "X via Y"
    With,        // "X with Y" (colocation/dependency)
    For,         // "X for Y" (purpose)
    From,        // "X from Y" (source)
}

/// Parser that uses Kitty CCG to extract module specs
pub struct KittyModuleParser;

impl KittyModuleParser {
    /// Parse a spec.md file to module network
    pub fn parse(spec: &str) -> Result<ParsedModuleSpec, String> {
        // Step 1: Parse to CCG tree using Kitty
        let ccg_tree = Self::parse_ccg(spec)?;
        
        // Step 2: Extract modules from CCG tree
        let modules = Self::extract_modules(&ccg_tree, spec)?;
        
        // Step 3: Extract connections from CCG tree
        let connections = Self::extract_connections(&ccg_tree, &modules, spec)?;
        
        // Step 4: Convert to pregroup tree
        let pregroup = Self::ccg_to_pregroup(&ccg_tree, &modules, &connections)?;
        
        Ok(ParsedModuleSpec {
            modules,
            connections,
            ccg_tree,
            pregroup,
        })
    }
    
    /// Generate tensor network from parsed spec
    pub fn to_tensor_network(spec: &ParsedModuleSpec) -> ModuleTensorNetwork {
        let fulfillments: Vec<(String, String, CapabilityInterface)> = spec.connections.iter()
            .map(|conn| (conn.consumer.clone(), conn.provider.clone(), conn.interface.clone()))
            .collect();
        
        ModuleTensorNetwork::compose(spec.modules.clone(), fulfillments)
    }
    
    /// Parse spec to CCG tree (simplified version)
    fn parse_ccg(spec: &str) -> Result<CCGTree, String> {
        // In a full implementation, this would use:
        // - lambeq's Bobcat parser
        // - Or call out to neural CCG parser
        // - Or use a custom-trained parser for tech specs
        
        // For now, build a simplified tree from markdown structure
        let root = Self::build_tree_from_markdown(spec)?;
        Ok(root)
    }
    
    fn build_tree_from_markdown(spec: &str) -> Result<CCGTree, String> {
        // Parse markdown sections as CCG structure
        // # Title → Root
        // ## Section → NP/VP branches  
        // - Items → Terminal nodes
        
        let lines: Vec<&str> = spec.lines().collect();
        
        // Build a simple tree structure
        let mut children: Vec<CCGTree> = vec![];
        
        // Create types we need
        let s_type = CCGType::atomic("S");
        let np_type = CCGType::atomic("NP");
        
        // Find modules by scanning for keywords
        for (i, line) in lines.iter().enumerate() {
            let line = line.trim();
            if line.is_empty() { continue; }
            
            // Detect module mentions
            let lower = line.to_lowercase();
            
            // Module indicators
            let module_keywords = [
                ("hono", "HttpServer", "hono-server"),
                ("postgres", "Database", "postgres"),
                ("sqlite", "Database", "sqlite"),
                ("redis", "Cache", "redis"),
                ("vite", "Custom(BuildTool)", "vite"),
                ("elenajs", "ComponentFramework", "elenajs"),
            ];
            
            for (keyword, interface, default_id) in module_keywords {
                if lower.contains(keyword) {
                    let node = CCGTree::leaf(
                        default_id.to_string(),
                        Self::interface_to_ccg_type(interface),
                        i
                    );
                    children.push(node);
                }
            }
        }
        
        // Build root with all children
        let root = if children.len() == 1 {
            children.into_iter().next().unwrap()
        } else if children.len() > 1 {
            // Combine into a tree
            let mut result = children[0].clone();
            for i in 1..children.len() {
                result = CCGTree::node(
                    CCGRule::ForwardApp,
                    s_type.clone(),
                    result,
                    children[i].clone()
                );
            }
            result
        } else {
            CCGTree::leaf("ROOT".to_string(), s_type, 0)
        };
        
        Ok(root)
    }
    
    fn interface_to_ccg_type(interface: &str) -> CCGType {
        // Use atomic types for all interfaces
        CCGType::atomic(interface)
    }
    
    /// Extract module definitions from CCG tree
    fn extract_modules(_ccg_tree: &CCGTree, spec: &str) -> Result<Vec<Module>, String> {
        let mut modules = vec![];
        let spec_lower = spec.to_lowercase();
        
        // Define module templates based on keywords
        let module_templates: Vec<(&str, Box<dyn Fn() -> Module>)> = vec![
            ("hono", Box::new(|| Module {
                id: "hono-server".to_string(),
                name: "Hono Server".to_string(),
                version: "3.12.0".to_string(),
                provides: vec![ProvidedCapability {
                    interface: CapabilityInterface::HttpServer,
                    properties: Default::default(),
                    endpoint: Some("http://localhost:3000".to_string()),
                    cost_per_hour: None,
                }],
                needs: vec![
                    NeededCapability {
                        interface: CapabilityInterface::Logging,
                        strategy: FulfillmentStrategy::FirstAvailable,
                        optional: true,
                        min_capacity: None,
                    },
                    NeededCapability {
                        interface: CapabilityInterface::Database,
                        strategy: FulfillmentStrategy::FirstAvailable,
                        optional: true,
                        min_capacity: None,
                    },
                ],
                language: "typescript".to_string(),
                source: ModuleSource::Registry { 
                    name: "npm/hono".to_string(), 
                    version: "^3.12.0".to_string(),
                },
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            })),
            
            ("postgres", Box::new(|| Module {
                id: "postgres".to_string(),
                name: "PostgreSQL".to_string(),
                version: "15.0".to_string(),
                provides: vec![ProvidedCapability {
                    interface: CapabilityInterface::Database,
                    properties: Default::default(),
                    endpoint: Some("postgresql://localhost:5432".to_string()),
                    cost_per_hour: Some(0.05),
                }],
                needs: vec![],
                language: "nix".to_string(),
                source: ModuleSource::Registry { 
                    name: "nixpkgs/postgresql".to_string(), 
                    version: "15".to_string(),
                },
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            })),
            
            ("sqlite", Box::new(|| Module {
                id: "sqlite".to_string(),
                name: "SQLite".to_string(),
                version: "3.44".to_string(),
                provides: vec![ProvidedCapability {
                    interface: CapabilityInterface::Database,
                    properties: Default::default(),
                    endpoint: Some("file:./data/app.db".to_string()),
                    cost_per_hour: Some(0.0),
                }],
                needs: vec![],
                language: "nix".to_string(),
                source: ModuleSource::Inline { code: "sqlite3".to_string() },
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            })),
            
            ("redis", Box::new(|| Module {
                id: "redis".to_string(),
                name: "Redis".to_string(),
                version: "7.0".to_string(),
                provides: vec![ProvidedCapability {
                    interface: CapabilityInterface::Cache,
                    properties: Default::default(),
                    endpoint: Some("redis://localhost:6379".to_string()),
                    cost_per_hour: Some(0.02),
                }],
                needs: vec![],
                language: "nix".to_string(),
                source: ModuleSource::Registry { 
                    name: "nixpkgs/redis".to_string(), 
                    version: "7".to_string(),
                },
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            })),
            
            // Frontend modules
            ("vite", Box::new(|| Module {
                id: "vite-dev-server".to_string(),
                name: "Vite Dev Server".to_string(),
                version: "5.0".to_string(),
                provides: vec![ProvidedCapability {
                    interface: CapabilityInterface::Custom("DevServer".to_string()),
                    properties: Default::default(),
                    endpoint: Some("http://localhost:5173".to_string()),
                    cost_per_hour: Some(0.0),
                }],
                needs: vec![
                    NeededCapability {
                        interface: CapabilityInterface::HttpServer,
                        strategy: FulfillmentStrategy::FirstAvailable,
                        optional: true,
                        min_capacity: None,
                    },
                ],
                language: "typescript".to_string(),
                source: ModuleSource::Registry { 
                    name: "npm/vite".to_string(), 
                    version: "^5.0.0".to_string(),
                },
                config_schema: serde_json::json!({}),
                is_infrastructure: false,
            })),
            
            ("elena", Box::new(|| Module {
                id: "elenajs".to_string(),
                name: "ElenaJS".to_string(),
                version: "0.1.0".to_string(),
                provides: vec![ProvidedCapability {
                    interface: CapabilityInterface::WebComponents,
                    properties: Default::default(),
                    endpoint: None,
                    cost_per_hour: None,
                }],
                needs: vec![
                    NeededCapability {
                        interface: CapabilityInterface::Custom("DevServer".to_string()),
                        strategy: FulfillmentStrategy::FirstAvailable,
                        optional: true,
                        min_capacity: None,
                    },
                ],
                language: "typescript".to_string(),
                source: ModuleSource::Registry { 
                    name: "npm/elenajs".to_string(), 
                    version: "^0.1.0".to_string(),
                },
                config_schema: serde_json::json!({}),
                is_infrastructure: false,
            })),
            
            // Runtime
            ("bun", Box::new(|| Module {
                id: "bun-runtime".to_string(),
                name: "Bun Runtime".to_string(),
                version: "1.0".to_string(),
                provides: vec![ProvidedCapability {
                    interface: CapabilityInterface::Custom("JavaScriptRuntime".to_string()),
                    properties: Default::default(),
                    endpoint: None,
                    cost_per_hour: None,
                }],
                needs: vec![],
                language: "nix".to_string(),
                source: ModuleSource::Registry { 
                    name: "nixpkgs/bun".to_string(), 
                    version: "1.0".to_string(),
                },
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            })),
        ];
        
        // Find all mentioned modules
        for (keyword, builder) in module_templates {
            if spec_lower.contains(keyword) {
                modules.push(builder());
            }
        }
        
        Ok(modules)
    }
    
    /// Extract connections from CCG tree
    fn extract_connections(_ccg_tree: &CCGTree, modules: &[Module], spec: &str) -> Result<Vec<ModuleConnection>, String> {
        let mut connections = vec![];
        let spec_lower = spec.to_lowercase();
        
        // Simple pattern matching for connections
        // In a full implementation, this would walk the CCG tree structure
        
        // "X connects to Y" or "X with Y" or "X uses Y"
        let connection_patterns = [
            ("hono", "postgres", CapabilityInterface::Database, ConnectionRelation::Direct),
            ("hono", "sqlite", CapabilityInterface::Database, ConnectionRelation::Direct),
            ("app", "hono", CapabilityInterface::HttpServer, ConnectionRelation::Via),
            ("frontend", "vite", CapabilityInterface::Custom("BuildTool".to_string()), ConnectionRelation::With),
        ];
        
        for (consumer_kw, provider_kw, interface, relation) in connection_patterns {
            let consumer_present = modules.iter().any(|m| m.id.to_lowercase().contains(consumer_kw));
            let provider_present = spec_lower.contains(provider_kw);
            
            if consumer_present && provider_present {
                // Find actual module IDs
                let consumer = modules.iter()
                    .find(|m| m.id.to_lowercase().contains(consumer_kw))
                    .map(|m| m.id.clone())
                    .unwrap_or_else(|| consumer_kw.to_string());
                    
                let provider = provider_kw.to_string();
                
                connections.push(ModuleConnection {
                    consumer,
                    provider,
                    interface,
                    relation,
                });
            }
        }
        
        // Also infer connections from needs
        for module in modules {
            for need in &module.needs {
                // Find a provider for this need
                let provider = modules.iter()
                    .find(|m| m.provides.iter().any(|p| p.interface == need.interface))
                    .map(|m| m.id.clone());
                
                if let Some(provider_id) = provider {
                    if provider_id != module.id {
                        // Check if not already added
                        let exists = connections.iter().any(|c| 
                            c.consumer == module.id && 
                            c.provider == provider_id && 
                            c.interface == need.interface
                        );
                        
                        if !exists {
                            connections.push(ModuleConnection {
                                consumer: module.id.clone(),
                                provider: provider_id,
                                interface: need.interface.clone(),
                                relation: ConnectionRelation::Direct,
                            });
                        }
                    }
                }
            }
        }
        
        Ok(connections)
    }
    
    /// Convert CCG tree to pregroup derivation
    fn ccg_to_pregroup(
        _ccg_tree: &CCGTree, 
        modules: &[Module], 
        connections: &[ModuleConnection]
    ) -> Result<PregroupTreeNode, String> {
        // Build pregroup tree showing types and contractions
        let mut node = PregroupTreeNode::new("ROOT".to_string(), 0, PregroupType::empty());
        
        // Add module nodes
        for (i, module) in modules.iter().enumerate() {
            let mb = ModuleBox::from_module(module.clone());
            let module_type = if mb.box_type.cod().is_empty() {
                PregroupType::atomic("Module")
            } else {
                mb.box_type.cod()[0].clone()
            };
            let module_node = PregroupTreeNode::new(
                module.id.clone(),
                i,
                module_type,
            );
            node.children.push(module_node);
        }
        
        // Add connection nodes
        for (i, conn) in connections.iter().enumerate() {
            let cap_type = Self::capability_to_type(&conn.interface);
            // Note: The cup method doesn't exist on PregroupTreeNode
            // Just add a word node representing the connection
            let conn_node = PregroupTreeNode::new(
                format!("{}→{}.{:?}", conn.provider, conn.consumer, conn.interface),
                modules.len() + i,
                cap_type,
            );
            node.children.push(conn_node);
        }
        
        Ok(node)
    }
    
    fn capability_to_type(cap: &CapabilityInterface) -> PregroupType {
        let name = match cap {
            CapabilityInterface::Database => "Database",
            CapabilityInterface::Cache => "Cache",
            CapabilityInterface::HttpServer => "HttpServer",
            CapabilityInterface::WebSocket => "WebSocket",
            CapabilityInterface::Queue => "Queue",
            CapabilityInterface::ObjectStorage => "Storage",
            CapabilityInterface::Email => "Email",
            CapabilityInterface::Search => "Search",
            CapabilityInterface::AuthProvider => "Auth",
            CapabilityInterface::Logging => "Logging",
            CapabilityInterface::Metrics => "Metrics",
            CapabilityInterface::WebComponents => "WebComponents",
            CapabilityInterface::ReactiveUI => "ReactiveUI",
            CapabilityInterface::Custom(s) => s.as_str(),
            _ => "Unknown",
        };
        PregroupType::atomic(name)
    }
    
    /// Generate natural language description of the composition
    pub fn describe_composition(network: &ModuleTensorNetwork) -> String {
        let mut description = String::from("System Composition:\n\n");
        
        // Describe each module
        for (id, mb) in &network.module_boxes {
            let icon = if mb.module.is_infrastructure { "🔧" } else { "📦" };
            description.push_str(&format!("{} {} ({})\n", icon, mb.module.name, mb.module.language));
            
            if !mb.module.provides.is_empty() {
                description.push_str("   Provides:\n");
                for prov in &mb.module.provides {
                    description.push_str(&format!("     - {:?}\n", prov.interface));
                }
            }
            
            if !mb.module.needs.is_empty() {
                description.push_str("   Needs:\n");
                for need in &mb.module.needs {
                    let fulfilled = network.cups.iter()
                        .any(|c| c.consumer == *id && c.interface == need.interface);
                    let status = if fulfilled { "✅" } else if need.optional { "⚪" } else { "❌" };
                    description.push_str(&format!("     {} {:?}\n", status, need.interface));
                }
            }
            
            description.push('\n');
        }
        
        // Describe connections
        if !network.cups.is_empty() {
            description.push_str("🔗 Connections:\n");
            for cup in &network.cups {
                description.push_str(&format!("   {} ─{:?}→ {}\n", 
                    cup.provider, cup.interface, cup.consumer));
            }
        }
        
        if !network.dangling.is_empty() {
            description.push_str("\n⚠️ Unfulfilled needs:\n");
            for (module_id, interface) in &network.dangling {
                description.push_str(&format!("   {} needs {:?}\n", module_id, interface));
            }
        }
        
        description
    }
}

/// Generate deployment from Kitty-parsed spec
pub fn generate_from_spec(spec: &str) -> Result<String, String> {
    // Parse spec
    let parsed = KittyModuleParser::parse(spec)?;
    
    // Build tensor network
    let network = KittyModuleParser::to_tensor_network(&parsed);
    
    // Validate
    if !network.is_valid() {
        return Err(format!("Invalid composition:\n{}", 
            KittyModuleParser::describe_composition(&network)));
    }
    
    // Generate deployment config
    let deployment = serde_json::json!({
        "version": "3.8",
        "services": network.module_boxes.iter().map(|(id, mb)| {
            (id.clone(), serde_json::json!({
                "image": format!("{}:{}", mb.module.language, mb.module.version),
                "environment": network.cups.iter()
                    .filter(|c| c.consumer == *id)
                    .map(|c| (format!("{:?}_URL", c.interface), serde_json::json!(c.provider.clone())))
                    .collect::<serde_json::Map<String, serde_json::Value>>(),
            }))
        }).collect::<serde_json::Map<String, serde_json::Value>>(),
    });
    
    Ok(serde_json::to_string_pretty(&deployment).unwrap())
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_parse_simple_spec() {
        let spec = r#"
# Elena Dashboard

A modern dashboard with Hono server and Postgres database.

## Backend
- Hono HTTP server
- PostgreSQL database

## Frontend
- ElenaJS components
"#;
        
        let result = KittyModuleParser::parse(spec);
        assert!(result.is_ok(), "Parse failed: {:?}", result.err());
        
        let parsed = result.unwrap();
        assert!(!parsed.modules.is_empty(), "No modules found");
        
        // Should have found hono and postgres
        let module_ids: Vec<_> = parsed.modules.iter().map(|m| m.id.clone()).collect();
        assert!(module_ids.contains(&"hono-server".to_string()), "Missing hono-server");
        assert!(module_ids.contains(&"postgres".to_string()), "Missing postgres");
    }
    
    #[test]
    fn test_tensor_network_from_spec() {
        let spec = r#"
# Test App

Uses Hono server with Postgres database.
"#;
        
        let parsed = KittyModuleParser::parse(spec).expect("Parse failed");
        let network = KittyModuleParser::to_tensor_network(&parsed);
        
        // Network should have modules
        assert!(!network.module_boxes.is_empty(), "No module boxes");
    }
    
    #[test]
    fn test_describe_composition() {
        let spec = r#"
# Test

- Hono server
- Postgres database
"#;
        
        let parsed = KittyModuleParser::parse(spec).expect("Parse failed");
        let network = KittyModuleParser::to_tensor_network(&parsed);
        let desc = KittyModuleParser::describe_composition(&network);
        
        assert!(desc.contains("Hono Server") || desc.contains("hono-server"), "Missing hono in description");
        assert!(desc.contains("PostgreSQL") || desc.contains("postgres"), "Missing postgres in description");
    }
    
    /// Integration test: Elena Dashboard full composition
    #[test]
    fn test_elena_dashboard_composition() {
        let spec = r#"
# Elena Dashboard

A modern dashboard application built with ElenaJS web components and Hono backend.

## Overview

Full-stack TypeScript application featuring:
- **Frontend**: ElenaJS reactive web components
- **Backend**: Hono HTTP server with Bun runtime
- **API**: REST endpoints for data fetching
- **Styling**: CSS-in-component with beautiful gradients

## Server Configuration

- Port: 3000 (API), 5173 (Vite dev server)
- Runtime: Bun
- Proxy: `/api` → `http://localhost:3000`

## API Endpoints

### Health Check
- **GET** `/api/health` - Server status

### Users API
- **GET** `/api/users` - List all users

### Todos API
- **GET** `/api/todos` - List all todos
- **POST** `/api/todos` - Create new todo

## Components

### WelcomeCard
Hero section with gradient background.

### TodoList
Interactive todo management with API integration.

### UserCard
User profile display with avatar initials.

## ElenaApp
Main application container component.

## Development

```bash
bun run dev
```

## Template
template = "elena"
"#;
        
        // Step 1: Parse the spec
        let parsed = KittyModuleParser::parse(spec).expect("Failed to parse Elena spec");
        
        // Should detect multiple modules
        let module_names: Vec<_> = parsed.modules.iter().map(|m| m.id.clone()).collect();
        println!("Detected modules: {:?}", module_names);
        
        assert!(module_names.contains(&"hono-server".to_string()), "Missing hono-server");
        assert!(module_names.contains(&"elenajs".to_string()), "Missing elenajs");
        assert!(module_names.contains(&"bun-runtime".to_string()), "Missing bun-runtime");
        assert!(module_names.contains(&"vite-dev-server".to_string()), "Missing vite-dev-server");
        
        // Step 2: Build tensor network
        let network = KittyModuleParser::to_tensor_network(&parsed);
        assert_eq!(network.module_boxes.len(), 4, "Expected 4 modules");
        
        // Step 3: Validate
        assert!(network.is_valid(), "Network should be valid");
        
        // Step 4: Contract to find connected components
        let contracted = network.contract().expect("Contraction failed");
        
        // Should have connected components
        println!("Connected components: {:?}", contracted.components);
        assert!(!contracted.components.is_empty(), "Should have at least one component");
        
        // Step 5: Generate deployment
        let deployment = generate_from_spec(spec).expect("Deployment generation failed");
        assert!(deployment.contains("hono-server"), "Deployment missing hono-server");
        assert!(deployment.contains("elenajs"), "Deployment missing elenajs");
        
        println!("✅ Elena Dashboard tensor network test passed!");
        println!("   Modules: {:?}", module_names);
        println!("   Components: {} connected groups", contracted.components.len());
        println!("   Free interfaces: {:?}", contracted.free_interfaces);
    }
}
