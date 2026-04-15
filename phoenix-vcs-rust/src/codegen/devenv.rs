//! Devenv Module - Nix Development Environment Generation
//!
//! Generates `devenv.nix`, `flake.nix`, and `.envrc` using:
//! - panproto-grammars with lang-nix for parsing
//! - emit_with_protocol for type-safe code generation
//!
//! Architecture:
//!   ModuleTensorNetwork → DevenvConfig → Nix AST → emit_with_protocol → .nix files

use crate::kitty::module_tensor_network::ModuleTensorNetwork;
use crate::codegen::emit_bundle::{EmitBuilder, emit_schema, create_protocol};
use panproto_schema::{Protocol, Schema};

/// Devenv configuration derived from module tensor network
#[derive(Debug, Clone)]
pub struct DevenvConfig {
    /// Project name
    pub name: String,
    
    /// Required packages from module network
    pub packages: Vec<String>,
    
    /// Environment variables (from module connections)
    pub env_vars: Vec<(String, String)>,
    
    /// Services to run (from connected components)
    pub services: Vec<Service>,
    
    /// Scripts/commands (from module lifecycle)
    pub scripts: Vec<(String, String)>,
    
    /// Language toolchain versions
    pub languages: Vec<LanguageToolchain>,
    
    /// Pre-commit hooks
    pub pre_commit_hooks: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct Service {
    pub name: String,
    pub command: String,
    pub port: Option<u16>,
    pub depends_on: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct LanguageToolchain {
    pub name: String,
    pub version: String,
}

impl DevenvConfig {
    /// Extract devenv configuration from tensor network
    pub fn from_tensor_network(network: &ModuleTensorNetwork) -> Self {
        let mut packages = vec![];
        let mut env_vars = vec![];
        let mut services = vec![];
        let mut scripts = vec![];
        let mut languages = vec![];
        
        // Map each module to Nix packages and services
        for (module_id, module_box) in &network.module_boxes {
            let module = &module_box.module;
            
            // Determine language toolchain
            match module.language.as_str() {
                "typescript" => {
                    if !languages.iter().any(|l: &LanguageToolchain| l.name == "typescript") {
                        languages.push(LanguageToolchain {
                            name: "typescript".to_string(),
                            version: "5.3".to_string(),
                        });
                    }
                    if !packages.contains(&"bun".to_string()) {
                        packages.push("bun".to_string());
                    }
                    // Add concurrently for running multiple dev servers
                    if !packages.contains(&"concurrently".to_string()) {
                        packages.push("concurrently".to_string());
                    }
                }
                "nix" => {
                    packages.push("nix".to_string());
                }
                "python" => {
                    if !languages.iter().any(|l: &LanguageToolchain| l.name == "python") {
                        languages.push(LanguageToolchain {
                            name: "python".to_string(),
                            version: "3.11".to_string(),
                        });
                    }
                }
                "rust" => {
                    if !languages.iter().any(|l: &LanguageToolchain| l.name == "rust") {
                        languages.push(LanguageToolchain {
                            name: "rust".to_string(),
                            version: "stable".to_string(),
                        });
                    }
                }
                _ => {}
            }
            
            // Create service for infrastructure modules
            // NOTE: Disabled for now - devenv only supports predefined services
            // if module.is_infrastructure {
            //     if let Some(endpoint) = module.provides.first().and_then(|p| p.endpoint.clone()) {
            //         let port = Self::extract_port(&endpoint);
            //         
            //         services.push(Service {
            //             name: module_id.clone(),
            //             command: format!("{}", module_id.replace("-", "_")),
            //             port,
            //             depends_on: Self::find_dependencies(network, module_id),
            //         });
            //     }
            // }
            
            // Generate scripts from module capabilities
            for prov in &module.provides {
                match prov.interface {
                    crate::capability_fulfillment::CapabilityInterface::HttpServer => {
                        scripts.push(("dev".to_string(), format!("bun run --cwd {} dev", module_id)));
                    }
                    crate::capability_fulfillment::CapabilityInterface::Database => {
                        scripts.push(("db:migrate".to_string(), format!("{}/migrate.sh", module_id)));
                    }
                    _ => {}
                }
            }
        }
        
        // Extract env vars from cups (connections)
        for cup in &network.cups {
            let var_name = format!("{}_URL", Self::capability_to_env_name(&cup.interface));
            env_vars.push((var_name, cup.provider.clone()));
        }
        
        DevenvConfig {
            name: "phoenix-app".to_string(),
            packages,
            env_vars,
            services,
            scripts,
            languages,
            pre_commit_hooks: vec!["nixpkgs-fmt".to_string(), "typos".to_string()],
        }
    }
    
    fn extract_port(endpoint: &str) -> Option<u16> {
        endpoint.split(':').last()
            .and_then(|p| p.parse().ok())
    }
    
    fn find_dependencies(network: &ModuleTensorNetwork, module_id: &str) -> Vec<String> {
        network.cups.iter()
            .filter(|c| c.consumer == module_id)
            .map(|c| c.provider.clone())
            .collect()
    }
    
    fn capability_to_env_name(cap: &crate::capability_fulfillment::CapabilityInterface) -> String {
        use crate::capability_fulfillment::CapabilityInterface;
        match cap {
            CapabilityInterface::Database => "DATABASE".to_string(),
            CapabilityInterface::Cache => "CACHE".to_string(),
            CapabilityInterface::HttpServer => "API".to_string(),
            CapabilityInterface::WebSocket => "WS".to_string(),
            CapabilityInterface::Custom(s) => s.to_uppercase(),
            _ => format!("{:?}", cap).to_uppercase(),
        }
    }
}

/// Create Nix protocol for code generation
fn create_nix_protocol() -> Protocol {
    create_protocol(
        "nix",
        vec![
            "Expr".to_string(),
            "AttrSet".to_string(),
            "List".to_string(),
            "String".to_string(),
            "Function".to_string(),
            "Binding".to_string(),
        ],
        vec![], // edge rules
    )
}

/// Nix code generator using emit_with_protocol
pub struct DevenvGenerator;

impl DevenvGenerator {
    /// Generate devenv.nix using emit_with_protocol
    pub fn generate_devenv_nix(config: &DevenvConfig) -> Result<String, String> {
        let protocol = create_nix_protocol();
        let mut builder = EmitBuilder::new(&protocol, "devenv");
        
        let mut pos: usize = 0;
        
        // { pkgs, lib, config, inputs, ... }:
        let header = "{ pkgs, lib, config, inputs, ... }:\n\n{\n";
        builder = builder.vertex("header", "Expr", Some(header))?;
        pos += header.len();
        
        // packages = [ ... ];
        let packages_nix = Self::generate_packages_array(&config.packages);
        builder = builder.vertex("packages", "Binding", Some(&packages_nix))?;
        pos += packages_nix.len();
        
        // env = { ... };
        let env_nix = Self::generate_env_set(&config.env_vars);
        builder = builder.vertex("env", "Binding", Some(&env_nix))?;
        pos += env_nix.len();
        
        // languages
        for lang in &config.languages {
            let lang_nix = Self::generate_language(&lang.name, &lang.version);
            let lang_id = format!("lang_{}", lang.name);
            builder = builder.vertex(&lang_id, "Binding", Some(&lang_nix))?;
            pos += lang_nix.len();
        }
        
        // services - disabled for now as devenv only supports predefined services
        // for service in &config.services {
        //     let service_nix = Self::generate_service(service);
        //     let service_id = format!("service_{}", service.name.replace("-", "_"));
        //     builder = builder.vertex(&service_id, "Binding", Some(&service_nix))?;
        //     pos += service_nix.len();
        // }
        
        // scripts
        if !config.scripts.is_empty() {
            let scripts_nix = Self::generate_scripts(&config.scripts);
            builder = builder.vertex("scripts", "Binding", Some(&scripts_nix))?;
            pos += scripts_nix.len();
        }
        
        // enterShell - automatically run bun install on shell enter
        let entershell_nix = r#"
  enterShell = ''
    # Auto-install dependencies if needed
    if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
      echo "📦 Installing dependencies..."
      bun install
    fi
    
    echo "🔥 Elena dev environment ready!"
    echo "  Run 'bun run dev' to start the dev server"
  '';
"#;
        builder = builder.vertex("enterShell", "Binding", Some(entershell_nix))?;
        pos += entershell_nix.len();
        
        // pre-commit - disabled for now as it requires git-hooks input
        // if !config.pre_commit_hooks.is_empty() {
        //     let precommit_nix = Self::generate_precommit(&config.pre_commit_hooks);
        //     builder = builder.vertex("pre-commit", "Binding", Some(&precommit_nix))?;
        //     pos += precommit_nix.len();
        // }
        
        // Close brace
        builder = builder.vertex("footer", "Expr", Some("}"))?;
        
        // Build schema
        let schema = builder.build()?;
        
        // Emit Nix code
        emit_schema(&schema, "nix")
    }
    
    // NOTE: generate_flake_nix removed - we use devenv directly without flakes
    // This simplifies the setup and avoids issues with devenv root detection
    
    /// Generate .envrc for direnv
    pub fn generate_envrc() -> String {
        r#"if ! has nix_direnv_version || ! nix_direnv_version 2.2.1; then
  source_url "https://raw.githubusercontent.com/nix-community/nix-direnv/2.2.1/direnvrc" "sha256-zelF0K+LMXnfcuosneiyJmmRm7T5p+CmK3bjE8Hjx2A="
fi

watch_file devenv.nix
watch_file devenv.yaml
eval "$(devenv print-dev-env)"
"#.to_string()
    }
    
    /// Generate devenv.yaml
    pub fn generate_devenv_yaml() -> String {
        r#"# devenv configuration
# Generated by Phoenix VCS

# Inputs are defined in flake.nix, not here
# This file is primarily for devenv configuration

# Allow unfree packages (needed for some tools)
allowUnfree: true

# Impure mode - allow access to system tools
impure: true
"#.to_string()
    }
    
    // Helper methods for Nix generation
    
    fn generate_packages_array(packages: &[String]) -> String {
        let items: Vec<String> = packages.iter()
            .map(|p| format!("    pkgs.{}", p))
            .collect();
        
        format!("  packages = [\n{}\n  ];\n\n", items.join("\n"))
    }
    
    fn generate_env_set(env_vars: &[(String, String)]) -> String {
        let items: Vec<String> = env_vars.iter()
            .map(|(k, v)| format!("    {} = \"{}\";", k, v))
            .collect();
        
        if items.is_empty() {
            "  # No environment variables\n\n".to_string()
        } else {
            format!("  env = {{\n{}\n  }};\n\n", items.join("\n"))
        }
    }
    
    fn generate_language(name: &str, version: &str) -> String {
        match name {
            "typescript" => format!(r#"  languages.typescript = {{
    enable = true;
  }};

"#),
            "python" => format!(r#"  languages.python = {{
    enable = true;
    version = "{}";
    venv.enable = true;
  }};

"#, version),
            "rust" => r#"  languages.rust = {
    enable = true;
    channel = "stable";
  };

"#.to_string(),
            _ => format!("  # Language {} not configured\n\n", name),
        }
    }
    
    fn generate_service(service: &Service) -> String {
        let port_config = if let Some(port) = service.port {
            format!("\n    port = {};", port)
        } else {
            String::new()
        };
        
        let deps = if service.depends_on.is_empty() {
            String::new()
        } else {
            format!("\n    depends_on = [ {} ];", 
                service.depends_on.iter().map(|d| format!("\"{}\"", d)).collect::<Vec<_>>().join(" "))
        };
        
        format!(r#"  services.{} = {{
    enable = true;
    command = "{}";{}{}
  }};

"#, 
            service.name.replace("-", "_"),
            service.command,
            port_config,
            deps
        )
    }
    
    fn generate_scripts(scripts: &[(String, String)]) -> String {
        let items: Vec<String> = scripts.iter()
            .map(|(name, cmd)| {
                format!(r#"    {}.exec = ''
      {}
    '';"#, name.replace("-", "_"), cmd)
            })
            .collect();
        
        format!("  scripts = {{\n{}\n  }};\n\n", items.join("\n\n"))
    }
    
    fn generate_precommit(hooks: &[String]) -> String {
        let items: Vec<String> = hooks.iter()
            .map(|h| format!("    {}.enable = true;", h))
            .collect();
        
        format!(r#"  pre-commit.hooks = {{
{}
  }};

"#, items.join("\n"))
    }
}

/// Generate complete devenv output from tensor network
pub fn generate_devenv_output(network: &ModuleTensorNetwork) -> Result<DevenvOutput, String> {
    let config = DevenvConfig::from_tensor_network(network);
    
    Ok(DevenvOutput {
        devenv_nix: DevenvGenerator::generate_devenv_nix(&config)?,
        devenv_yaml: DevenvGenerator::generate_devenv_yaml(),
        envrc: DevenvGenerator::generate_envrc(),
    })
}

/// Generated devenv files
#[derive(Debug, Clone)]
pub struct DevenvOutput {
    pub devenv_nix: String,
    pub devenv_yaml: String,
    pub envrc: String,
}

impl DevenvOutput {
    /// Write all files to a directory
    pub fn write_to_dir(&self, dir: &std::path::Path) -> Result<(), std::io::Error> {
        std::fs::write(dir.join("devenv.nix"), &self.devenv_nix)?;
        std::fs::write(dir.join("devenv.yaml"), &self.devenv_yaml)?;
        std::fs::write(dir.join(".envrc"), &self.envrc)?;
        Ok(())
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::capability_fulfillment::{Module, ProvidedCapability, NeededCapability, CapabilityInterface, FulfillmentStrategy, ModuleSource};
    
    fn create_test_network() -> ModuleTensorNetwork {
        let hono = Module {
            id: "hono-server".to_string(),
            name: "Hono Server".to_string(),
            version: "3.12.0".to_string(),
            provides: vec![ProvidedCapability {
                interface: CapabilityInterface::HttpServer,
                properties: Default::default(),
                endpoint: Some("http://localhost:3000".to_string()),
                cost_per_hour: None,
            }],
            needs: vec![],
            language: "typescript".to_string(),
            source: ModuleSource::Registry { 
                name: "npm/hono".to_string(), 
                version: "^3.12.0".to_string() 
            },
            config_schema: Default::default(),
            is_infrastructure: true,
        };
        
        let elena = Module {
            id: "elenajs".to_string(),
            name: "ElenaJS".to_string(),
            version: "0.1.0".to_string(),
            provides: vec![ProvidedCapability {
                interface: CapabilityInterface::WebComponents,
                properties: Default::default(),
                endpoint: None,
                cost_per_hour: None,
            }],
            needs: vec![NeededCapability {
                interface: CapabilityInterface::HttpServer,
                strategy: FulfillmentStrategy::FirstAvailable,
                optional: true,
                min_capacity: None,
            }],
            language: "typescript".to_string(),
            source: ModuleSource::Registry { 
                name: "npm/elenajs".to_string(), 
                version: "^0.1.0".to_string() 
            },
            config_schema: Default::default(),
            is_infrastructure: false,
        };
        
        ModuleTensorNetwork::compose(
            vec![hono, elena],
            vec![("elenajs".to_string(), "hono-server".to_string(), CapabilityInterface::HttpServer)]
        )
    }
    
    #[test]
    fn test_devenv_config_from_network() {
        let network = create_test_network();
        let config = DevenvConfig::from_tensor_network(&network);
        
        assert!(config.packages.contains(&"bun".to_string()));
        assert_eq!(config.name, "phoenix-app");
    }
    
    #[test]
    fn test_generate_devenv_nix() {
        let network = create_test_network();
        let config = DevenvConfig::from_tensor_network(&network);
        
        let devenv_nix = DevenvGenerator::generate_devenv_nix(&config)
            .expect("Failed to generate devenv.nix");
        
        // Check structure
        assert!(devenv_nix.contains("{ pkgs, lib, config, inputs, ... }:"));
        assert!(devenv_nix.contains("packages = ["));
        assert!(devenv_nix.ends_with("}"));
        
        println!("Generated devenv.nix:\n{}", devenv_nix);
    }
    
    // NOTE: Test removed - we no longer generate flake.nix
    // Using devenv directly without flakes
    /*
    #[test]
    fn test_generate_flake_nix() {
        let network = create_test_network();
        let config = DevenvConfig::from_tensor_network(&network);
        
        let flake_nix = DevenvGenerator::generate_flake_nix(&config)
            .expect("Failed to generate flake.nix");
        
        assert!(flake_nix.contains("nixpkgs.url"), "Missing nixpkgs.url in:\n{}", flake_nix);
        assert!(flake_nix.contains("devenv.url"), "Missing devenv.url in:\n{}", flake_nix);
        assert!(flake_nix.contains("devShells"), "Missing devShells in:\n{}", flake_nix);
        
        println!("Generated flake.nix:\n{}", flake_nix);
    }
    */
    
    #[test]
    fn test_full_devenv_output() {
        let network = create_test_network();
        let output = generate_devenv_output(&network)
            .expect("Failed to generate devenv output");
        
        assert!(!output.devenv_nix.is_empty());
        assert!(!output.devenv_yaml.is_empty());
        assert!(!output.envrc.is_empty());
        
        println!("=== devenv.nix ===");
        println!("{}", output.devenv_nix);
        println!("\n=== devenv.yaml ===");
        println!("{}", output.devenv_yaml);
        println!("\n=== .envrc ===");
        println!("{}", output.envrc);
    }
}
