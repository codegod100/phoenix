//! Bundle-Agnostic Theory-Based Code Generation
//!
//! This module provides a shared infrastructure for generating code from
//! panproto Theories. All bundles define their Theory (Sorts, Operations),
//! and this engine interprets them to generate code.
//!
//! Architecture:
//!   Bundle theory.rs → TheoryCodegen → Generated files

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, Operation, SortKind};

/// A bundle that can generate code via Theory
/// 
/// All bundles implement this trait to define their code generation structure.
/// The Theory defines what can be generated (sorts) and how (operations).
pub trait TheoryBundle {
    /// Get the bundle's Theory
    /// 
    /// The Theory defines:
    /// - Sorts: Types of artifacts (package.json, main.ts, etc.)
    /// - Operations: Transformations between sorts
    fn theory(&self) -> Theory;
    
    /// Get artifact generators for this bundle
    /// 
    /// Maps sort names to functions that generate that artifact type.
    /// These implement the "how" for each sort.
    fn artifact_generators(&self) -> HashMap<String, Box<dyn ArtifactGenerator>>;
    
    /// Bundle name
    fn name(&self) -> &str;
}

/// Generates a specific artifact type
/// 
/// Implementations handle the actual string generation for one sort.
pub trait ArtifactGenerator: Send + Sync {
    /// Generate artifact content
    /// 
    /// # Arguments
    /// * `project_name` - Project identifier
    /// * `spec_content` - Raw spec content for context
    /// * `config` - Parsed configuration from spec
    fn generate(
        &self,
        project_name: &str,
        spec_content: &str,
        config: &ArtifactConfig,
    ) -> String;
}

/// Configuration for artifact generation
#[derive(Debug, Clone)]
pub struct ArtifactConfig {
    /// Theme/variant to apply
    pub theme: String,
    /// Additional properties from spec
    pub properties: HashMap<String, String>,
}

impl Default for ArtifactConfig {
    fn default() -> Self {
        Self {
            theme: "default".to_string(),
            properties: HashMap::new(),
        }
    }
}

/// Code generation engine
/// 
/// Interprets a Bundle's Theory and generates all artifacts.
pub struct TheoryCodegen {
    /// Registered bundles by name
    bundles: HashMap<String, Box<dyn TheoryBundle>>,
}

impl TheoryCodegen {
    pub fn new() -> Self {
        Self {
            bundles: HashMap::new(),
        }
    }
    
    /// Register a bundle
    pub fn register_bundle(&mut self, name: &str, bundle: Box<dyn TheoryBundle>) {
        self.bundles.insert(name.to_string(), bundle);
    }
    
    /// Generate all artifacts for a bundle
    /// 
    /// Walks the bundle's Theory and generates each artifact.
    pub fn generate(
        &self,
        bundle_name: &str,
        project_name: &str,
        spec_content: &str,
    ) -> HashMap<PathBuf, String> {
        let bundle = self.bundles.get(bundle_name)
            .expect(&format!("Bundle '{}' not registered", bundle_name));
        
        let theory = bundle.theory();
        let generators = bundle.artifact_generators();
        
        let mut outputs = HashMap::new();
        
        // Parse config from spec
        let config = self.parse_config(spec_content);
        
        // For each sort in theory, generate artifact if we have a generator
        for sort in &theory.sorts {
            let sort_name = sort.name.as_ref();
            
            if let Some(generator) = generators.get(sort_name) {
                // Determine output path from sort name convention
                let path = self.sort_to_path(sort_name, project_name);
                
                // Generate content
                let content = generator.generate(
                    project_name,
                    spec_content,
                    &config,
                );
                
                outputs.insert(path, content);
            }
        }
        
        outputs
    }
    
    /// Map sort name to output file path
    fn sort_to_path(&self, sort_name: &str, project_name: &str) -> PathBuf {
        // Convention: ThPackageJson → package.json
        //             ThMain → src/main.ts
        match sort_name {
            "ThPackageJson" => PathBuf::from("package.json"),
            "ThTsConfig" => PathBuf::from("tsconfig.json"),
            "ThViteConfig" => PathBuf::from("vite.config.ts"),
            "ThIndexHtml" => PathBuf::from("index.html"),
            "ThMain" => PathBuf::from("src/main.ts"),
            "ThFlakeNix" => PathBuf::from("flake.nix"),
            "ThReadme" => PathBuf::from("README.md"),
            "ThPyProject" => PathBuf::from("pyproject.toml"),
            "ThCargoToml" => PathBuf::from("Cargo.toml"),
            _ => PathBuf::from(format!("{}.txt", sort_name.to_lowercase())),
        }
    }
    
    /// Parse configuration from spec content
    fn parse_config(&self, spec_content: &str) -> ArtifactConfig {
        let mut config = ArtifactConfig::default();
        let content_lower = spec_content.to_lowercase();
        
        // Detect themes
        if content_lower.contains("kitty") 
            || content_lower.contains("neko")
            || content_lower.contains("cat") {
            config.theme = "kitty".to_string();
        } else if content_lower.contains("dark") {
            config.theme = "dark".to_string();
        } else if content_lower.contains("minimal") {
            config.theme = "minimal".to_string();
        }
        
        config
    }
}

/// Macro to easily define a Theory for a bundle
/// 
/// Example:
/// ```rust
/// define_theory!(LitTheory,
///     sorts: [ThPackageJson, ThTsConfig, ThViteConfig, ThMain],
///     operations: [
///         generate: (ThSpec, Config) -> ThPackageJson,
///         compose: (ThPackageJson, ThMain) -> ThApp,
///     ]
/// );
/// ```
#[macro_export]
macro_rules! define_theory {
    (
        $name:ident,
        sorts: [$($sort:ident),*],
        operations: [$($op_name:ident: ($($input:ident),*) -> $output:ident),*]
    ) => {
        pub struct $name;
        
        impl $name {
            pub fn theory() -> Theory {
                Theory::new(
                    Arc::from(stringify!($name)),
                    vec![
                        $(
                            Sort {
                                name: Arc::from(stringify!($sort)),
                                params: vec![],
                                kind: SortKind::Structural,
                            }
                        ),*
                    ],
                    vec![
                        $(
                            Operation {
                                name: Arc::from(stringify!($op_name)),
                                inputs: vec![
                                    $(
                                        (Arc::from(stringify!($input)), Arc::from(stringify!($input)))
                                    ),*
                                ],
                                output: Arc::from(stringify!($output)),
                            }
                        ),*
                    ],
                    vec![], // equations
                )
            }
        }
    };
}

/// Helper to create artifact generators from functions
pub struct FnArtifactGenerator {
    generator: Box<dyn Fn(&str, &str, &ArtifactConfig) -> String + Send + Sync>,
}

impl FnArtifactGenerator {
    pub fn new<F>(f: F) -> Self
    where
        F: Fn(&str, &str, &ArtifactConfig) -> String + Send + Sync + 'static,
    {
        Self {
            generator: Box::new(f),
        }
    }
}

impl ArtifactGenerator for FnArtifactGenerator {
    fn generate(
        &self,
        project_name: &str,
        spec_content: &str,
        config: &ArtifactConfig,
    ) -> String {
        (self.generator)(project_name, spec_content, config)
    }
}

/// Generate boxed artifact generator
pub fn generator<F>(f: F) -> Box<dyn ArtifactGenerator>
where
    F: Fn(&str, &str, &ArtifactConfig) -> String + Send + Sync + 'static,
{
    Box::new(FnArtifactGenerator::new(f))
}

// ============================================================================
// Example: Lit Bundle using the Theory system
// ============================================================================

#[cfg(feature = "panproto")]
pub mod lit_theory {
    use super::*;
    
    /// Define the Theory for Lit bundles
    pub fn lit_theory() -> Theory {
        Theory::new(
            Arc::from("ThLit"),
            vec![
                // Sorts = artifact types
                Sort {
                    name: Arc::from("ThFlakeNix"),
                    params: vec![],
                    kind: SortKind::Structural,
                },
                Sort {
                    name: Arc::from("ThPackageJson"),
                    params: vec![],
                    kind: SortKind::Structural,
                },
                Sort {
                    name: Arc::from("ThTsConfig"),
                    params: vec![],
                    kind: SortKind::Structural,
                },
                Sort {
                    name: Arc::from("ThViteConfig"),
                    params: vec![],
                    kind: SortKind::Structural,
                },
                Sort {
                    name: Arc::from("ThIndexHtml"),
                    params: vec![],
                    kind: SortKind::Structural,
                },
                Sort {
                    name: Arc::from("ThMain"),
                    params: vec![],
                    kind: SortKind::Structural,
                },
                // Config sort
                Sort {
                    name: Arc::from("Config"),
                    params: vec![],
                    kind: SortKind::Structural,
                },
            ],
            vec![
                // Operations = transformations
                Operation {
                    name: Arc::from("generate_flake"),
                    inputs: vec![(Arc::from("config"), Arc::from("Config"))],
                    output: Arc::from("ThFlakeNix"),
                },
                Operation {
                    name: Arc::from("generate_package"),
                    inputs: vec![(Arc::from("config"), Arc::from("Config"))],
                    output: Arc::from("ThPackageJson"),
                },
                Operation {
                    name: Arc::from("generate_main"),
                    inputs: vec![(Arc::from("config"), Arc::from("Config"))],
                    output: Arc::from("ThMain"),
                },
            ],
            vec![], // equations
        )
    }
    
    /// Create artifact generators for Lit
    pub fn lit_generators() -> HashMap<String, Box<dyn ArtifactGenerator>> {
        let mut gens: HashMap<String, Box<dyn ArtifactGenerator>> = HashMap::new();
        
        gens.insert("ThFlakeNix".to_string(), generator(|name, _spec, _cfg| {
            format!(r#"{{
  description = "{} - Lit Web Components app";

  inputs = {{
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${{system}};
      in
      {{
        devShells = {{
          default = pkgs.mkShell {{
            buildInputs = with pkgs; [ nodejs_20 ];
          }};
        }};
      }}
    );
}}
"#, name)
        }));
        
        gens.insert("ThPackageJson".to_string(), generator(|name, _spec, _cfg| {
            let sanitized = name.to_lowercase().replace(" ", "-").replace("_", "-");
            format!(r#"{{
  "name": "{}",
  "version": "0.1.0",
  "description": "Lit Web Components app",
  "type": "module",
  "scripts": {{
    "dev": "vite",
    "build": "tsc && vite build"
  }},
  "dependencies": {{ "lit": "^3.0.0" }},
  "devDependencies": {{ "typescript": "^5.2.0", "vite": "^5.0.0" }}
}}"#, sanitized)
        }));
        
        gens.insert("ThTsConfig".to_string(), generator(|_name, _spec, _cfg| {
            r#"{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"]
}"#.to_string()
        }));
        
        gens.insert("ThViteConfig".to_string(), generator(|_name, _spec, _cfg| {
            r#"import { defineConfig } from 'vite';

export default defineConfig({
  server: { port: 3000, open: true },
  build: { outDir: 'dist', sourcemap: true }
});
"#.to_string()
        }));
        
        gens.insert("ThIndexHtml".to_string(), generator(|name, _spec, cfg| {
            let tag = name.to_lowercase().replace(" ", "-").replace("_", "-");
            let (title, bg_style) = match cfg.theme.as_str() {
                "kitty" => (format!("{} 🐱", name), "background: linear-gradient(135deg, #FFB6C1, #E6E6FA);"),
                _ => (name.to_string(), "background: #f5f5f5;"),
            };
            
            format!(r#"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>{}</title>
  <script type="module" src="/src/main.ts"></script>
  <style>
    body {{ margin: 0; padding: 20px; font-family: system-ui; {} }}
  </style>
</head>
<body>
  <{}-app></{}-app>
</body>
</html>
"#, title, bg_style, tag, tag)
        }));
        
        gens.insert("ThMain".to_string(), generator(|name, spec, cfg| {
            generate_lit_main_theory(name, spec, cfg)
        }));
        
        gens
    }
    
    /// Generate main.ts using Theory-based approach
    fn generate_lit_main_theory(project_name: &str, _spec_content: &str, config: &ArtifactConfig) -> String {
        let tag = project_name.to_lowercase().replace(" ", "-").replace("_", "-");
        let class_name = tag.split('-')
            .map(|p| {
                let mut chars = p.chars();
                match chars.next() {
                    None => String::new(),
                    Some(c) => c.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
                }
            })
            .collect::<String>();
        
        // Theme-aware hero
        let hero = match config.theme.as_str() {
            "kitty" => format!(r#"// Hero Component
@customElement('hero-image')
export class HeroImage extends LitElement {{
  static styles = css`
    :host {{ display: block; width: 100%; }}
    .hero {{
      background: linear-gradient(135deg, #FFB6C1 0%, #E6E6FA 50%, #FFDAB9 100%);
      color: #4a4a4a; padding: 80px 20px; text-align: center;
      border-radius: 20px; margin-bottom: 24px;
      box-shadow: 0 8px 32px rgba(255,182,193,0.3);
      position: relative; overflow: hidden;
    }}
    .hero::before {{ content: '🐾'; position: absolute; top: 20px; left: 20px; font-size: 2rem; opacity: 0.3; }}
    .hero::after {{ content: '🐾'; position: absolute; bottom: 20px; right: 20px; font-size: 2rem; opacity: 0.3; transform: rotate(-20deg); }}
    .hero h1 {{ font-size: 3.5rem; font-weight: bold; margin: 0; color: #6b5b95; }}
    .hero p {{ font-size: 1.5rem; margin: 16px 0 0 0; opacity: 0.8; color: #8b7bb5; }}
  `;
  render() {{
    return html`<div class="hero"><h1>🐱 Welcome to {}! 🐱</h1><p>A purr-fect web components demo</p></div>`;
  }}
}}

"#, project_name),
            _ => format!(r#"// Hero Component
@customElement('hero-image')
export class HeroImage extends LitElement {{
  static styles = css`
    :host {{ display: block; width: 100%; }}
    .hero {{
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white; padding: 80px 20px; text-align: center;
      border-radius: 12px; margin-bottom: 24px;
    }}
    .hero h1 {{ font-size: 3.5rem; font-weight: bold; margin: 0; }}
    .hero p {{ font-size: 1.5rem; margin: 16px 0 0 0; opacity: 0.9; }}
  `;
  render() {{
    return html`<div class="hero"><h1>Hello World</h1><p>Welcome</p></div>`;
  }}
}}

"#),
        };
        
        format!(r#"// phoenix: iu_id = "{}-app"
// Generated by Phoenix VCS for {}

import {{ LitElement, html, css }} from 'lit';
import {{ customElement, property }} from 'lit/decorators.js';

{}
// Main App Component
@customElement('{}-app')
export class {}App extends LitElement {{
  static styles = css`
    :host {{ display: block; max-width: 800px; margin: 0 auto; padding: 20px; }}
  `;
  render() {{
    return html`<hero-image></hero-image>`;
  }}
}}

console.log('🔥 {} app loaded');
"#, tag, project_name, hero, tag, class_name, project_name)
    }
}

// ============================================================================
// Bundle implementations using the Theory system
// ============================================================================

/// Lit bundle using Theory-based generation
#[cfg(feature = "panproto")]
pub struct LitTheoryBundle;

#[cfg(feature = "panproto")]
impl TheoryBundle for LitTheoryBundle {
    fn theory(&self) -> Theory {
        lit_theory::lit_theory()
    }
    
    fn artifact_generators(&self) -> HashMap<String, Box<dyn ArtifactGenerator>> {
        lit_theory::lit_generators()
    }
    
    fn name(&self) -> &str {
        "lit"
    }
}

// Easy function to generate Lit bundle
#[cfg(feature = "panproto")]
pub fn generate_lit_bundle(project_name: &str, spec_content: &str) -> HashMap<PathBuf, String> {
    let mut engine = TheoryCodegen::new();
    engine.register_bundle("lit", Box::new(LitTheoryBundle));
    engine.generate("lit", project_name, spec_content)
}

// Non-panproto stub for when feature is disabled
#[cfg(not(feature = "panproto"))]
pub fn generate_lit_bundle(project_name: &str, _spec_content: &str) -> HashMap<PathBuf, String> {
    // Fallback to simple string generation
    let mut outputs = HashMap::new();
    outputs.insert(PathBuf::from("package.json"), format!(r#"{{"name": "{}"}}"#, project_name));
    outputs
}
