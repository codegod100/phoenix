//! Kitty Tensor Network for Module Composition
//!
//! Models modules as a tensor network where:
//! - Types = Capability interfaces (Database, HttpServer, etc.)
//! - Boxes = Modules (with input needs, output provides)
//! - Wires = Fulfillments (need → provider connections)
//! - Tensor product = Parallel composition
//! - Composition = Sequential wiring (cup contractions)
//!
//! Grammar mapping:
//!   "Hono server with logger connects to Postgres database"
//!   → Types: [HttpServer, Logging, Database]
//!   → Boxes: [hono-server: I → HttpServer⊗Logging, 
//!             hono-logger: I → Logging,
//!             postgres: I → Database]
//!   → Wiring: hono-server.Logging.l ⊗ hono-logger.Logging.r → I (cup)

use crate::kitty::diagram::{Box, Diagram, Layer};
use crate::kitty::types::PregroupType;
use crate::capability_fulfillment::{CapabilityInterface, Module, ProvidedCapability, NeededCapability};
use std::collections::HashMap;
use serde_json::json;

/// A module as a box in the tensor network
/// 
/// Domain: types it needs (inputs)
/// Codomain: types it provides (outputs)
#[derive(Debug, Clone)]
pub struct ModuleBox {
    pub module: Module,
    pub box_type: Box,
}

impl ModuleBox {
    /// Create a box from a module
    /// 
    /// Needs → left adjoints (inputs to be fulfilled)
    /// Provides → right adjoints (outputs to fulfill others)
    pub fn from_module(module: Module) -> Self {
        let name = module.id.clone();
        
        // Domain: needs as left adjoints (n.l)
        let dom: Vec<PregroupType> = module.needs.iter()
            .map(|need| Self::capability_to_type(&need.interface).adjoint_left())
            .collect();
        
        // Codomain: provides as atomic types (n)
        let cod: Vec<PregroupType> = module.provides.iter()
            .map(|prov| Self::capability_to_type(&prov.interface))
            .collect();
        
        let box_type = Box::word(&name, dom, cod);
        
        Self { module, box_type }
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
}

/// Fulfillment as a cup (connecting output to input)
/// 
/// In tensor terms: provider.cod.r ⊗ consumer.dom.l → I
/// This "contracts" the types, connecting provider to consumer
/// 
/// Edge metadata (config) flows from provider to consumer,
/// parameterizing how the consumer uses the capability
#[derive(Debug, Clone)]
pub struct FulfillmentCup {
    pub provider: String,      // Module ID providing
    pub consumer: String,      // Module ID consuming
    pub interface: CapabilityInterface,  // What capability flows
    pub wire_type: Box,        // The cup box
    pub config: serde_json::Value,  // Edge metadata: config for consumer
}

impl FulfillmentCup {
    /// Create a new fulfillment cup with configuration
    pub fn with_config(
        provider: String,
        consumer: String,
        interface: CapabilityInterface,
        config: serde_json::Value,
    ) -> Self {
        let cap_type = Self::capability_to_type(&interface);
        let left = cap_type.clone();
        let right = cap_type.adjoint_right();
        let wire_type = Box::cup(left, right)
            .expect("Failed to create cup - type mismatch");
        
        Self {
            provider,
            consumer,
            interface,
            wire_type,
            config,
        }
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
}

/// Tensor network for a system of modules
/// 
/// Diagram structure:
/// - Layers = parallel composition of modules (@)
/// - Cups = connections between modules (sequential composition ;)
#[derive(Debug, Clone)]
pub struct ModuleTensorNetwork {
    /// The underlying string diagram
    pub diagram: Diagram,
    
    /// Module boxes indexed by ID
    pub module_boxes: HashMap<String, ModuleBox>,
    
    /// Fulfillment cups (wires)
    pub cups: Vec<FulfillmentCup>,
    
    /// Unfulfilled needs (dangling wires)
    pub dangling: Vec<(String, CapabilityInterface)>,  // (module_id, interface)
}

impl ModuleTensorNetwork {
    /// Build tensor network from modules and fulfillments
    pub fn compose(modules: Vec<Module>, fulfillments: Vec<(String, String, CapabilityInterface)>) -> Self 
    where 
        String: Clone,
        CapabilityInterface: Clone,
    {
        let mut module_boxes = HashMap::new();
        let mut boxes: Vec<Box> = vec![];
        
        // Create boxes for each module
        for module in modules {
            let mb = ModuleBox::from_module(module.clone());
            boxes.push(mb.box_type.clone());
            module_boxes.insert(module.id.clone(), mb);
        }
        
        // Build diagram as tensor product of all modules
        let diagram = if boxes.is_empty() {
            Diagram::empty()
        } else {
            let mut diag = Diagram::from_box(boxes[0].clone());
            for i in 1..boxes.len() {
                let next = Diagram::from_box(boxes[i].clone());
                diag = diag.tensor(&next);
            }
            diag
        };
        
        // Create cups for fulfillments
        let mut cups = vec![];
        let mut dangling = vec![];
        let mut fulfilled_needs: Vec<(String, CapabilityInterface)> = vec![];
        
        for (consumer_id, provider_id, interface) in fulfillments {
            // Create cup connecting provider output to consumer input
            let cap_type = Self::capability_to_type(&interface);
            let left = cap_type.clone();
            let right = cap_type.adjoint_right();  // The adjoint
            
            let cup = Box::cup(left, right)
                .expect("Failed to create cup - type mismatch");
            
            cups.push(FulfillmentCup {
                provider: provider_id.clone(),
                consumer: consumer_id.clone(),
                interface: interface.clone(),
                wire_type: cup,
                config: json!({}),  // Empty config by default - can be populated from spec
            });
            
            fulfilled_needs.push((consumer_id, interface));
        }
        
        // Find dangling needs (not fulfilled)
        for (module_id, mb) in &module_boxes {
            for need in &mb.module.needs {
                let is_fulfilled = fulfilled_needs.iter()
                    .any(|(cid, cap)| cid == module_id && *cap == need.interface);
                
                if !is_fulfilled && !need.optional {
                    dangling.push((module_id.clone(), need.interface.clone()));
                }
            }
        }
        
        Self {
            diagram,
            module_boxes,
            cups,
            dangling,
        }
    }
    
    /// Check if network is fully connected (no dangling needs)
    pub fn is_valid(&self) -> bool {
        self.dangling.is_empty()
    }
    
    /// Get the diagram as a Mermaid string for visualization
    pub fn to_mermaid(&self) -> String {
        let mut output = String::from("graph LR\n");
        
        // Add modules as nodes
        for (id, mb) in &self.module_boxes {
            let shape = if mb.module.is_infrastructure { "((" } else { "[" };
            let end_shape = if mb.module.is_infrastructure { "))" } else { "]" };
            output.push_str(&format!("    {}{} {}{}\n", id, shape, mb.module.name, end_shape));
        }
        
        // Add fulfillment connections
        for cup in &self.cups {
            let label = format!("{:?}", cup.interface).to_lowercase();
            output.push_str(&format!("    {} -->|{}| {}\n", 
                cup.provider, label, cup.consumer));
        }
        
        // Highlight dangling needs
        if !self.dangling.is_empty() {
            output.push_str("\n    %% Dangling needs:\n");
            for (module_id, interface) in &self.dangling {
                output.push_str(&format!("    %% {} needs {:?} unfulfilled\n", 
                    module_id, interface));
            }
        }
        
        output
    }
    
    /// Contract the network (apply cups to reduce diagram)
    /// 
    /// In tensor terms: trace over connected indices
    pub fn contract(&self) -> Result<ContractedNetwork, String> {
        if !self.is_valid() {
            return Err(format!("Cannot contract: {} dangling needs", self.dangling.len()));
        }
        
        // Build adjacency list
        let mut adjacency: HashMap<String, Vec<String>> = HashMap::new();
        
        for cup in &self.cups {
            adjacency.entry(cup.provider.clone())
                .or_default()
                .push(cup.consumer.clone());
        }
        
        // Find connected components (module groups)
        let components = self.find_connected_components(&adjacency);
        
        Ok(ContractedNetwork {
            components,
            free_interfaces: self.find_free_interfaces(),
        })
    }
    
    fn find_connected_components(&self, adjacency: &HashMap<String, Vec<String>>) -> Vec<Vec<String>> {
        let mut visited: std::collections::HashSet<String> = std::collections::HashSet::new();
        let mut components: Vec<Vec<String>> = vec![];
        
        for id in self.module_boxes.keys() {
            if !visited.contains(id) {
                let mut component = vec![];
                let mut stack = vec![id.clone()];
                
                while let Some(node) = stack.pop() {
                    if visited.insert(node.clone()) {
                        component.push(node.clone());
                        
                        if let Some(neighbors) = adjacency.get(&node) {
                            for neighbor in neighbors {
                                if !visited.contains(neighbor) {
                                    stack.push(neighbor.clone());
                                }
                            }
                        }
                        
                        // Also check reverse edges (consumer → provider)
                        for cup in &self.cups {
                            if cup.consumer == node && !visited.contains(&cup.provider) {
                                stack.push(cup.provider.clone());
                            }
                        }
                    }
                }
                
                components.push(component);
            }
        }
        
        components
    }
    
    fn find_free_interfaces(&self) -> Vec<(String, CapabilityInterface)> {
        // Find provides that aren't consumed by anyone
        let mut consumed: std::collections::HashSet<(String, CapabilityInterface)> = std::collections::HashSet::new();
        
        for cup in &self.cups {
            consumed.insert((cup.provider.clone(), cup.interface.clone()));
        }
        
        let mut free = vec![];
        for (id, mb) in &self.module_boxes {
            for prov in &mb.module.provides {
                if !consumed.contains(&(id.clone(), prov.interface.clone())) {
                    free.push((id.clone(), prov.interface.clone()));
                }
            }
        }
        
        free
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
}

/// Contracted tensor network (simplified graph)
#[derive(Debug)]
pub struct ContractedNetwork {
    /// Connected components (each is a "sub-system")
    pub components: Vec<Vec<String>>,
    
    /// Interfaces exposed to the outside (free outputs)
    pub free_interfaces: Vec<(String, CapabilityInterface)>,
}

/// Generate module network from natural language spec
/// 
/// Uses Kitty's CCG parser to extract:
/// - Nouns → Modules
/// - Adjectives → Properties
/// - Prepositions → Connections
pub fn parse_spec_to_network(spec: &str) -> Result<ModuleTensorNetwork, String> {
    // Parse spec to extract modules and connections
    let (modules, connections) = parse_modules_from_spec(spec)?;
    
    Ok(ModuleTensorNetwork::compose(modules, connections))
}

fn parse_modules_from_spec(spec: &str) -> Result<(Vec<Module>, Vec<(String, String, CapabilityInterface)>), String> {
    let mut modules: Vec<Module> = vec![];
    let mut connections: Vec<(String, String, CapabilityInterface)> = vec![];
    
    // Simple pattern matching (in real implementation, use Kitty CCG parser)
    for line in spec.lines() {
        let line = line.trim();
        let lower = line.to_lowercase();
        
        // Detect modules by keywords
        if lower.contains("hono") && lower.contains("server") {
            modules.push(Module {
                id: "hono-server".to_string(),
                name: "Hono Server".to_string(),
                version: "1.0.0".to_string(),
                provides: vec![
                    ProvidedCapability {
                        interface: CapabilityInterface::HttpServer,
                        properties: Default::default(),
                        endpoint: Some("http://localhost:3000".to_string()),
                        cost_per_hour: None,
                    }
                ],
                needs: vec![
                    NeededCapability {
                        interface: CapabilityInterface::Logging,
                        strategy: crate::capability_fulfillment::FulfillmentStrategy::FirstAvailable,
                        optional: true,
                        min_capacity: None,
                    }
                ],
                language: "typescript".to_string(),
                source: crate::capability_fulfillment::ModuleSource::LocalPath("./modules/hono-server".to_string()),
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            });
        }
        
        if lower.contains("postgres") || lower.contains("database") {
            modules.push(Module {
                id: "postgres".to_string(),
                name: "PostgreSQL".to_string(),
                version: "15.0".to_string(),
                provides: vec![
                    ProvidedCapability {
                        interface: CapabilityInterface::Database,
                        properties: Default::default(),
                        endpoint: Some("postgresql://localhost:5432".to_string()),
                        cost_per_hour: Some(0.05),
                    }
                ],
                needs: vec![],
                language: "nix".to_string(),
                source: crate::capability_fulfillment::ModuleSource::Registry { 
                    name: "nixpkgs/postgresql".to_string(), 
                    version: "15".to_string(),
                },
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            });
        }
        
        // Detect connections
        if lower.contains("connects to") || lower.contains("with") {
            // Parse "X connects to Y" or "X with Y"
            // Simplified: assume hono connects to postgres if both present
            if modules.iter().any(|m| m.id == "hono-server") && 
               modules.iter().any(|m| m.id == "postgres") {
                connections.push(("hono-server".to_string(), "postgres".to_string(), CapabilityInterface::Database));
            }
        }
    }
    
    Ok((modules, connections))
}

#[cfg(test)]
mod tests {
    use super::*;
    
    fn create_test_modules() -> Vec<Module> {
        vec![
            Module {
                id: "hono-server".to_string(),
                name: "Hono Server".to_string(),
                version: "1.0.0".to_string(),
                provides: vec![
                    ProvidedCapability {
                        interface: CapabilityInterface::HttpServer,
                        properties: Default::default(),
                        endpoint: Some("http://localhost:3000".to_string()),
                        cost_per_hour: None,
                    }
                ],
                needs: vec![
                    NeededCapability {
                        interface: CapabilityInterface::Database,
                        strategy: crate::capability_fulfillment::FulfillmentStrategy::FirstAvailable,
                        optional: false,
                        min_capacity: None,
                    }
                ],
                language: "typescript".to_string(),
                source: crate::capability_fulfillment::ModuleSource::LocalPath(".".to_string()),
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            },
            Module {
                id: "postgres".to_string(),
                name: "PostgreSQL".to_string(),
                version: "15.0".to_string(),
                provides: vec![
                    ProvidedCapability {
                        interface: CapabilityInterface::Database,
                        properties: Default::default(),
                        endpoint: Some("postgresql://localhost:5432".to_string()),
                        cost_per_hour: Some(0.05),
                    }
                ],
                needs: vec![],
                language: "nix".to_string(),
                source: crate::capability_fulfillment::ModuleSource::Inline { code: "postgres".to_string() },
                config_schema: serde_json::json!({}),
                is_infrastructure: true,
            },
        ]
    }
    
    #[test]
    fn test_module_box_creation() {
        let modules = create_test_modules();
        let mb = ModuleBox::from_module(modules[0].clone());
        
        // hono-server needs Database, so domain should have Database.l
        assert_eq!(mb.box_type.dom().len(), 1);
        assert!(mb.box_type.dom()[0].to_string().contains("Database"));
        
        // hono-server provides HttpServer
        assert_eq!(mb.box_type.cod().len(), 1);
        assert!(mb.box_type.cod()[0].to_string().contains("HttpServer"));
    }
    
    #[test]
    fn test_tensor_network_composition() {
        let modules = create_test_modules();
        let fulfillments = vec![
            ("hono-server".to_string(), "postgres".to_string(), CapabilityInterface::Database),
        ];
        
        let network = ModuleTensorNetwork::compose(modules, fulfillments);
        
        assert_eq!(network.module_boxes.len(), 2);
        assert_eq!(network.cups.len(), 1);
        assert!(network.is_valid());  // No dangling needs
    }
    
    #[test]
    fn test_unfulfilled_needs() {
        let modules = create_test_modules();
        // No fulfillments
        let fulfillments: Vec<(String, String, CapabilityInterface)> = vec![];
        
        let network = ModuleTensorNetwork::compose(modules, fulfillments);
        
        assert!(!network.is_valid());
        assert_eq!(network.dangling.len(), 1);  // hono-server needs Database
    }
    
    #[test]
    fn test_mermaid_output() {
        let modules = create_test_modules();
        let fulfillments = vec![
            ("hono-server".to_string(), "postgres".to_string(), CapabilityInterface::Database),
        ];
        
        let network = ModuleTensorNetwork::compose(modules, fulfillments);
        let mermaid = network.to_mermaid();
        
        assert!(mermaid.contains("hono-server"));
        assert!(mermaid.contains("postgres"));
        assert!(mermaid.contains("database"));
    }
    
    #[test]
    fn test_network_contraction() {
        let modules = create_test_modules();
        let fulfillments = vec![
            ("hono-server".to_string(), "postgres".to_string(), CapabilityInterface::Database),
        ];
        
        let network = ModuleTensorNetwork::compose(modules, fulfillments);
        let contracted = network.contract().unwrap();
        
        // Both modules should be in one connected component
        assert_eq!(contracted.components.len(), 1);
        assert_eq!(contracted.components[0].len(), 2);
        
        // HttpServer should be free (exposed to outside)
        assert_eq!(contracted.free_interfaces.len(), 1);
        assert!(matches!(contracted.free_interfaces[0].1, CapabilityInterface::HttpServer));
    }
}
