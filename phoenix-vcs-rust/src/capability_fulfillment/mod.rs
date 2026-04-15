//! Module-Based Capability Fulfillment System
//!
//! Decentralized architecture where:
//! - Modules advertise PROVIDES (capabilities they offer)
//! - Modules declare NEEDS (capabilities they require)
//! - Resolver matches NEEDS to PROVIDES at fulfillment time
//! - Multiple providers can satisfy the same need
//!
//! Example:
//!   AuthModule NEEDS { Database }
//!   PostgresModule PROVIDES { Database }
//!   SQLiteModule PROVIDES { Database }
//!   → Resolver picks based on constraints

use std::collections::{HashMap, HashSet};
use serde::{Deserialize, Serialize};

/// A capability interface that modules can provide or need
#[derive(Debug, Clone, Hash, Eq, PartialEq, Serialize, Deserialize)]
pub enum CapabilityInterface {
    // Data storage
    Database,
    Cache,
    ObjectStorage,  // S3, etc.
    
    // Compute
    HttpServer,
    Queue,
    Scheduler,
    
    // Communication
    WebSocket,
    Email,
    Sms,
    PushNotification,
    
    // External services
    Search,
    Analytics,
    Payment,
    AuthProvider,
    
    // Observability
    Logging,
    Metrics,
    Tracing,
    
    // UI
    WebComponents,
    ReactiveUI,
    
    // Generic (for extensibility)
    Custom(String),
}

/// How a capability should be fulfilled
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum FulfillmentStrategy {
    /// Use first available provider
    FirstAvailable,
    
    /// Use specific provider by name
    Named(String),
    
    /// Use provider matching constraints
    Constrained(Vec<Constraint>),
    
    /// Composite: use multiple providers
    Composite(Vec<String>),
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum Constraint {
    /// Provider must have this property
    HasProperty(String),
    
    /// Property must equal this value
    PropertyEquals(String, String),
    
    /// Numeric property at least this value
    MinCapacity(String, u64),
    
    /// Cost per unit time
    MaxCost(f64),
}

/// A module in the distributed system
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Module {
    /// Unique module identifier
    pub id: String,
    
    /// Human-readable name
    pub name: String,
    
    /// Module version
    pub version: String,
    
    /// What this module provides
    pub provides: Vec<ProvidedCapability>,
    
    /// What this module needs
    pub needs: Vec<NeededCapability>,
    
    /// Implementation language
    pub language: String,
    
    /// Module source (path, git url, registry ref)
    pub source: ModuleSource,
    
    /// Module configuration schema
    pub config_schema: serde_json::Value,
    
    /// Whether this is a core infrastructure module
    pub is_infrastructure: bool,
}

/// A capability provided by a module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProvidedCapability {
    pub interface: CapabilityInterface,
    
    /// Properties of this implementation
    pub properties: HashMap<String, PropertyValue>,
    
    /// Connection endpoint (if applicable)
    pub endpoint: Option<String>,
    
    /// Cost per unit time (for optimization)
    pub cost_per_hour: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PropertyValue {
    String(String),
    Number(f64),
    Bool(bool),
    List(Vec<String>),
}

/// A capability needed by a module
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct NeededCapability {
    pub interface: CapabilityInterface,
    
    /// How to fulfill this need
    pub strategy: FulfillmentStrategy,
    
    /// Whether this is optional
    pub optional: bool,
    
    /// Minimum required capacity
    pub min_capacity: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ModuleSource {
    /// Local file path
    LocalPath(String),
    
    /// Git repository
    Git { url: String, reference: String },
    
    /// Module registry
    Registry { name: String, version: String },
    
    /// Inline definition
    Inline { code: String },
}

/// Resolution of a needed capability to a provided one
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Fulfillment {
    /// The need being fulfilled
    pub need: NeededCapability,
    
    /// The provider fulfilling it
    pub provider: Module,
    
    /// How they connect
    pub connection: ConnectionConfig,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ConnectionConfig {
    /// Environment variable name for the consuming module
    pub env_var: String,
    
    /// Connection string/URL
    pub connection_string: String,
    
    /// Any secrets needed
    pub secrets: HashMap<String, String>,
}

/// System composition: modules + fulfillments
#[derive(Debug)]
pub struct ComposedSystem {
    /// All modules in the system
    pub modules: Vec<Module>,
    
    /// How needs are fulfilled
    pub fulfillments: HashMap<String, Vec<Fulfillment>>,  // module_id -> fulfillments
    
    /// Unfulfilled optional needs (warnings)
    pub warnings: Vec<String>,
}

/// Module resolver - matches NEEDS to PROVIDES
pub struct ModuleResolver {
    /// Available modules (providers)
    available: Vec<Module>,
    
    /// Resolution rules
    rules: Vec<ResolutionRule>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ResolutionRule {
    /// Prefer providers matching this pattern
    PreferProvider { pattern: String, weight: i32 },
    
    /// Never use this provider for given interface
    Blacklist { provider: String, interface: CapabilityInterface },
    
    /// Always use this provider for given interface
    Whitelist { provider: String, interface: CapabilityInterface },
}

impl ModuleResolver {
    pub fn new(available: Vec<Module>) -> Self {
        Self {
            available,
            rules: vec![],
        }
    }
    
    pub fn add_rule(&mut self, rule: ResolutionRule) {
        self.rules.push(rule);
    }
    
    /// Resolve a system by fulfilling all module needs
    pub fn resolve(&self, required: Vec<Module>) -> Result<ComposedSystem, ResolutionError> {
        let mut all_modules = self.available.clone();
        all_modules.extend(required.clone());
        
        let mut fulfillments: HashMap<String, Vec<Fulfillment>> = HashMap::new();
        let mut warnings = vec![];
        
        // For each module with needs
        for module in &required {
            let mut module_fulfillments = vec![];
            
            for need in &module.needs {
                match self.fulfill_need(&need, &all_modules) {
                    Ok(fulfillment) => {
                        module_fulfillments.push(fulfillment);
                    }
                    Err(e) => {
                        if need.optional {
                            warnings.push(format!(
                                "Optional need {:?} for {} unfulfilled: {}",
                                need.interface, module.id, e
                            ));
                        } else {
                            return Err(ResolutionError::UnfulfilledNeed {
                                module: module.id.clone(),
                                need: need.interface.clone(),
                                reason: e,
                            });
                        }
                    }
                }
            }
            
            if !module_fulfillments.is_empty() {
                fulfillments.insert(module.id.clone(), module_fulfillments);
            }
        }
        
        Ok(ComposedSystem {
            modules: all_modules,
            fulfillments,
            warnings,
        })
    }
    
    fn fulfill_need(&self, need: &NeededCapability, providers: &[Module]) -> Result<Fulfillment, String> {
        // Find all providers for this interface
        let candidates: Vec<&Module> = providers.iter()
            .filter(|m| m.provides.iter().any(|p| p.interface == need.interface))
            .collect();
        
        if candidates.is_empty() {
            return Err(format!("No provider found for {:?}", need.interface));
        }
        
        // Apply resolution rules to pick best provider
        let selected = match &need.strategy {
            FulfillmentStrategy::FirstAvailable => candidates[0],
            FulfillmentStrategy::Named(name) => {
                candidates.iter()
                    .find(|m| &m.id == name)
                    .ok_or_else(|| format!("Named provider {} not found", name))?
            }
            FulfillmentStrategy::Constrained(constraints) => {
                self.select_by_constraints(candidates, constraints)?
            }
            FulfillmentStrategy::Composite(_) => {
                // Composite needs special handling - return first for now
                candidates[0]
            }
        };
        
        // Get the provided capability details
        let provided = selected.provides.iter()
            .find(|p| p.interface == need.interface)
            .unwrap();
        
        // Generate connection config
        let connection = self.generate_connection(&need.interface, selected, provided);
        
        Ok(Fulfillment {
            need: need.clone(),
            provider: selected.clone(),
            connection,
        })
    }
    
    fn select_by_constraints<'a>(
        &self, 
        candidates: Vec<&'a Module>, 
        constraints: &[Constraint]
    ) -> Result<&'a Module, String> {
        // Simple constraint matching
        for candidate in candidates {
            let provided = candidate.provides.iter().find(|p| {
                constraints.iter().all(|c| self.matches_constraint(p, c))
            });
            
            if provided.is_some() {
                return Ok(candidate);
            }
        }
        
        Err("No provider matches all constraints".to_string())
    }
    
    fn matches_constraint(&self, provided: &ProvidedCapability, constraint: &Constraint) -> bool {
        match constraint {
            Constraint::HasProperty(prop) => provided.properties.contains_key(prop),
            Constraint::PropertyEquals(prop, val) => {
                provided.properties.get(prop)
                    .map(|v| match v {
                        PropertyValue::String(s) => s == val,
                        _ => false,
                    })
                    .unwrap_or(false)
            }
            Constraint::MinCapacity(prop, min) => {
                provided.properties.get(prop)
                    .map(|v| match v {
                        PropertyValue::Number(n) => *n as u64 >= *min,
                        _ => false,
                    })
                    .unwrap_or(false)
            }
            Constraint::MaxCost(max) => {
                provided.cost_per_hour.map(|c| c <= *max).unwrap_or(true)
            }
        }
    }
    
    fn generate_connection(
        &self, 
        interface: &CapabilityInterface,
        provider: &Module,
        provided: &ProvidedCapability
    ) -> ConnectionConfig {
        let env_var = format!("{}_URL", self.interface_to_env(interface));
        
        let connection_string = provided.endpoint.clone()
            .or_else(|| self.generate_default_endpoint(interface, provider))
            .unwrap_or_else(|| format!("internal://{}", provider.id));
        
        ConnectionConfig {
            env_var,
            connection_string,
            secrets: HashMap::new(),
        }
    }
    
    fn interface_to_env(&self, interface: &CapabilityInterface) -> String {
        match interface {
            CapabilityInterface::Database => "DATABASE",
            CapabilityInterface::Cache => "CACHE",
            CapabilityInterface::HttpServer => "HTTP",
            CapabilityInterface::WebSocket => "WS",
            CapabilityInterface::ObjectStorage => "STORAGE",
            CapabilityInterface::Queue => "QUEUE",
            CapabilityInterface::Email => "EMAIL",
            _ => "SERVICE",
        }.to_string()
    }
    
    fn generate_default_endpoint(&self, interface: &CapabilityInterface, provider: &Module) -> Option<String> {
        match interface {
            CapabilityInterface::HttpServer => Some(format!("http://localhost:3000")),
            CapabilityInterface::Database => Some(format!("postgresql://localhost/{}_db", provider.id)),
            CapabilityInterface::Cache => Some(format!("redis://localhost:6379")),
            _ => None,
        }
    }
}

#[derive(Debug)]
pub enum ResolutionError {
    UnfulfilledNeed { module: String, need: CapabilityInterface, reason: String },
    CircularDependency { modules: Vec<String> },
    VersionConflict { module: String, required: String, found: String },
}

/// Module registry - distributed catalog of available modules
pub struct ModuleRegistry {
    modules: HashMap<String, Module>,
    by_interface: HashMap<CapabilityInterface, Vec<String>>,
}

impl ModuleRegistry {
    pub fn new() -> Self {
        Self {
            modules: HashMap::new(),
            by_interface: HashMap::new(),
        }
    }
    
    pub fn register(&mut self, module: Module) {
        // Index by interfaces provided
        for cap in &module.provides {
            self.by_interface
                .entry(cap.interface.clone())
                .or_default()
                .push(module.id.clone());
        }
        
        self.modules.insert(module.id.clone(), module);
    }
    
    pub fn find_providers(&self, interface: &CapabilityInterface) -> Vec<&Module> {
        self.by_interface
            .get(interface)
            .map(|ids| ids.iter().filter_map(|id| self.modules.get(id)).collect())
            .unwrap_or_default()
    }
    
    pub fn get(&self, id: &str) -> Option<&Module> {
        self.modules.get(id)
    }
}

/// Builder for constructing systems declaratively
pub struct SystemBuilder {
    modules: Vec<Module>,
    resolver: ModuleResolver,
}

impl SystemBuilder {
    pub fn new() -> Self {
        Self {
            modules: vec![],
            resolver: ModuleResolver::new(vec![]),
        }
    }
    
    pub fn with_available(mut self, available: Vec<Module>) -> Self {
        self.resolver = ModuleResolver::new(available);
        self
    }
    
    pub fn add_module(mut self, module: Module) -> Self {
        self.modules.push(module);
        self
    }
    
    pub fn with_rule(mut self, rule: ResolutionRule) -> Self {
        self.resolver.add_rule(rule);
        self
    }
    
    pub fn compose(self) -> Result<ComposedSystem, ResolutionError> {
        self.resolver.resolve(self.modules)
    }
}

/// Generate deployment configuration from composed system
pub fn generate_deployment_config(system: &ComposedSystem) -> serde_json::Value {
    let mut services = serde_json::Map::new();
    
    for module in &system.modules {
        let mut service = serde_json::Map::new();
        service.insert("image".to_string(), serde_json::json!(format!("modules/{}:{}", module.id, module.version)));
        service.insert("language".to_string(), serde_json::json!(&module.language));
        
        // Add connection env vars
        if let Some(fulfillments) = system.fulfillments.get(&module.id) {
            let mut env = serde_json::Map::new();
            for f in fulfillments {
                env.insert(
                    f.connection.env_var.clone(),
                    serde_json::json!(&f.connection.connection_string)
                );
            }
            service.insert("environment".to_string(), serde_json::Value::Object(env));
        }
        
        services.insert(module.id.clone(), serde_json::Value::Object(service));
    }
    
    serde_json::json!({
        "version": "3",
        "services": services
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_auth_module() -> Module {
        Module {
            id: "auth".to_string(),
            name: "Auth Service".to_string(),
            version: "1.0.0".to_string(),
            provides: vec![],
            needs: vec![
                NeededCapability {
                    interface: CapabilityInterface::Database,
                    strategy: FulfillmentStrategy::FirstAvailable,
                    optional: false,
                    min_capacity: None,
                },
                NeededCapability {
                    interface: CapabilityInterface::Cache,
                    strategy: FulfillmentStrategy::FirstAvailable,
                    optional: true,
                    min_capacity: None,
                },
            ],
            language: "typescript".to_string(),
            source: ModuleSource::LocalPath("./modules/auth".to_string()),
            config_schema: serde_json::json!({}),
            is_infrastructure: false,
        }
    }

    fn create_postgres_module() -> Module {
        Module {
            id: "postgres".to_string(),
            name: "PostgreSQL".to_string(),
            version: "15.0".to_string(),
            provides: vec![
                ProvidedCapability {
                    interface: CapabilityInterface::Database,
                    properties: [("type".to_string(), PropertyValue::String("sql".to_string()))].into(),
                    endpoint: Some("postgresql://localhost:5432".to_string()),
                    cost_per_hour: Some(0.05),
                },
            ],
            needs: vec![],
            language: "nix".to_string(),
            source: ModuleSource::Registry { name: "postgres".to_string(), version: "15".to_string() },
            config_schema: serde_json::json!({}),
            is_infrastructure: true,
        }
    }

    fn create_redis_module() -> Module {
        Module {
            id: "redis".to_string(),
            name: "Redis".to_string(),
            version: "7.0".to_string(),
            provides: vec![
                ProvidedCapability {
                    interface: CapabilityInterface::Cache,
                    properties: [("type".to_string(), PropertyValue::String("kv".to_string()))].into(),
                    endpoint: Some("redis://localhost:6379".to_string()),
                    cost_per_hour: Some(0.02),
                },
            ],
            needs: vec![],
            language: "nix".to_string(),
            source: ModuleSource::Registry { name: "redis".to_string(), version: "7".to_string() },
            config_schema: serde_json::json!({}),
            is_infrastructure: true,
        }
    }

    #[test]
    fn test_basic_resolution() {
        let auth = create_auth_module();
        let postgres = create_postgres_module();
        let redis = create_redis_module();
        
        let system = SystemBuilder::new()
            .with_available(vec![postgres, redis])
            .add_module(auth)
            .compose()
            .unwrap();
        
        assert_eq!(system.modules.len(), 3);
        assert!(system.fulfillments.contains_key("auth"));
        
        let auth_fulfillments = system.fulfillments.get("auth").unwrap();
        assert_eq!(auth_fulfillments.len(), 2); // Database + Cache
        
        // Check database fulfillment
        let db_fulfillment = auth_fulfillments.iter()
            .find(|f| f.need.interface == CapabilityInterface::Database)
            .unwrap();
        assert_eq!(db_fulfillment.provider.id, "postgres");
        assert!(db_fulfillment.connection.env_var.contains("DATABASE"));
    }

    #[test]
    fn test_constraint_based_resolution() {
        let mut auth = create_auth_module();
        // Update to use constraint strategy
        auth.needs[0].strategy = FulfillmentStrategy::Constrained(vec![
            Constraint::PropertyEquals("type".to_string(), "sql".to_string()),
        ]);
        
        let postgres = create_postgres_module();
        
        let system = SystemBuilder::new()
            .with_available(vec![postgres])
            .add_module(auth)
            .compose()
            .unwrap();
        
        assert!(system.fulfillments.contains_key("auth"));
    }

    #[test]
    fn test_registry_lookup() {
        let mut registry = ModuleRegistry::new();
        
        let postgres = create_postgres_module();
        let redis = create_redis_module();
        
        registry.register(postgres);
        registry.register(redis);
        
        let db_providers = registry.find_providers(&CapabilityInterface::Database);
        assert_eq!(db_providers.len(), 1);
        assert_eq!(db_providers[0].id, "postgres");
        
        let cache_providers = registry.find_providers(&CapabilityInterface::Cache);
        assert_eq!(cache_providers.len(), 1);
        assert_eq!(cache_providers[0].id, "redis");
    }

    #[test]
    fn test_deployment_generation() {
        let auth = create_auth_module();
        let postgres = create_postgres_module();
        
        let system = SystemBuilder::new()
            .with_available(vec![postgres])
            .add_module(auth)
            .compose()
            .unwrap();
        
        let config = generate_deployment_config(&system);
        
        assert!(config.get("services").is_some());
        let services = config.get("services").unwrap();
        assert!(services.get("auth").is_some());
        assert!(services.get("postgres").is_some());
        
        // Check that auth has DATABASE_URL env var
        let auth_service = services.get("auth").unwrap();
        let env = auth_service.get("environment").unwrap();
        assert!(env.get("DATABASE_URL").is_some());
    }
}
