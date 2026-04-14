//! ThNix — GAT Theory of Nix Flakes
//!
//! This implements the Nix expression language as a Generalized Algebraic Theory.
//!
//! Sorts:
//!   - Flake: Root flake.nix structure
//!   - Input: Nix flake input (nixpkgs, flake-utils, etc.)
//!   - Output: Flake outputs (packages, devShells, apps)
//!   - Package: Build package definition
//!   - DevShell: Development environment
//!   - Expr: Nix expressions
//!   - AttrSet: Attribute sets (key-value mappings)
//!   - List: List expressions
//!   - String: String literals
//!   - Path: File paths
//!
//! Term constructors form an initial algebra: Term(Σ_Nix, ∅)
//! The morphism μ_spec→nix: ThSpec → ThNix preserves structure.

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation};
#[cfg(feature = "panproto")]
use std::sync::Arc;

use std::collections::HashMap;

/// ThNix GAT — Nix expression theory
pub struct ThNix;

/// Returns the panproto Theory definition for ThNix
#[cfg(feature = "panproto")]
pub fn nix_theory() -> Theory {
    Theory::new(
        Arc::from("ThNix"),
        vec![
            // Root sort
            Sort { name: Arc::from("Flake"), params: vec![], kind: SortKind::Structural },
            // Component sorts
            Sort { name: Arc::from("Input"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Outputs"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Package"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("DevShell"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("App"), params: vec![], kind: SortKind::Structural },
            // Primitive sorts
            Sort { name: Arc::from("Path"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("String"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("AttrSet"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("List"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Expr"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            // Flake construction
            Operation {
                name: Arc::from("mk_flake"),
                inputs: vec![
                    (Arc::from("description"), Arc::from("String")),
                    (Arc::from("inputs"), Arc::from("List")),
                    (Arc::from("outputs"), Arc::from("Outputs")),
                ],
                output: Arc::from("Flake"),
            },
            // Input construction
            Operation {
                name: Arc::from("mk_input"),
                inputs: vec![
                    (Arc::from("name"), Arc::from("String")),
                    (Arc::from("url"), Arc::from("String")),
                ],
                output: Arc::from("Input"),
            },
            // Outputs construction
            Operation {
                name: Arc::from("mk_outputs"),
                inputs: vec![
                    (Arc::from("packages"), Arc::from("AttrSet")),
                    (Arc::from("dev_shells"), Arc::from("AttrSet")),
                    (Arc::from("apps"), Arc::from("AttrSet")),
                ],
                output: Arc::from("Outputs"),
            },
            // Package constructors
            Operation {
                name: Arc::from("mk_python_package"),
                inputs: vec![
                    (Arc::from("pname"), Arc::from("String")),
                    (Arc::from("version"), Arc::from("String")),
                    (Arc::from("src"), Arc::from("Path")),
                    (Arc::from("deps"), Arc::from("List")),
                ],
                output: Arc::from("Package"),
            },
            Operation {
                name: Arc::from("mk_rust_package"),
                inputs: vec![
                    (Arc::from("pname"), Arc::from("String")),
                    (Arc::from("version"), Arc::from("String")),
                    (Arc::from("src"), Arc::from("Path")),
                ],
                output: Arc::from("Package"),
            },
            // DevShell construction
            Operation {
                name: Arc::from("mk_dev_shell"),
                inputs: vec![
                    (Arc::from("build_inputs"), Arc::from("List")),
                ],
                output: Arc::from("DevShell"),
            },
            // App construction
            Operation {
                name: Arc::from("mk_app"),
                inputs: vec![
                    (Arc::from("program"), Arc::from("String")),
                ],
                output: Arc::from("App"),
            },
            // Primitives
            Operation {
                name: Arc::from("path_literal"),
                inputs: vec![(Arc::from("path"), Arc::from("String"))],
                output: Arc::from("Path"),
            },
            Operation {
                name: Arc::from("string_literal"),
                inputs: vec![(Arc::from("value"), Arc::from("String"))],
                output: Arc::from("String"),
            },
        ],
        vec![], // equations
    )
}

/// Algebraic terms for ThNix
/// 
/// These form the initial algebra over the Nix signature.
/// Uses Box for recursive variants to avoid infinite size.
#[derive(Debug, Clone, PartialEq)]
pub enum NixTerm {
    // Root sort: Flake
    Flake {
        description: String,
        inputs: Vec<Box<NixTerm>>,  // Sort: List Input (boxed for recursion)
        outputs: Box<NixTerm>,      // Sort: Lambda System -> Outputs
    },
    
    // Sort: Input
    Input {
        name: String,
        url: String,
    },
    
    // Sort: Outputs (per system)
    Outputs {
        packages: Vec<(String, Box<NixTerm>)>,   // (system, Package) - boxed
        dev_shells: Vec<(String, Box<NixTerm>)>, // (system, DevShell) - boxed
        apps: Vec<(String, Box<NixTerm>)>,       // (system, App) - boxed
    },
    
    // Sort: Package
    PythonPackage {
        pname: String,
        version: String,
        src: Box<NixTerm>,  // Sort: Path - boxed
        format: String,
        build_system: Vec<String>,
        propagated_build_inputs: Vec<String>,
        main_program: String,
    },
    
    RustPackage {
        pname: String,
        version: String,
        src: Box<NixTerm>,  // boxed
        main_program: String,
    },
    
    // Sort: DevShell
    DevShell {
        build_inputs: Vec<String>,
    },
    
    // Sort: App
    App {
        program: String,
    },
    
    // Sort: Path
    PathLiteral(String),
    
    // Sort: String
    StringLiteral(String),
    
    // Sort: AttrSet (generic key-value)
    AttrSet(HashMap<String, Box<NixTerm>>),  // boxed values
    
    // Sort: List
    List(Vec<Box<NixTerm>>),  // boxed elements
    
    // Sort: Expr — function application
    Apply {
        function: String,
        arg: Box<NixTerm>,  // boxed
    },
    
    // Sort: Expr — variable reference
    Var(String),
    
    // Sort: Expr — attribute access (pkgs.python312Packages)
    AttrPath {
        base: String,
        path: Vec<String>,
    },
}

/// Morphism: ThSpec → ThNix
/// 
/// Transforms a parsed spec into a Nix term algebraically.
/// This is a proper theory morphism preserving structure.
pub fn spec_to_nix_term(
    project_name: &str,
    build_type: &str,
    version: &str,
    deps: &[String],
) -> NixTerm {
    // Build sort: List Input (boxed)
    let inputs = vec![
        Box::new(NixTerm::Input {
            name: "nixpkgs".to_string(),
            url: "github:NixOS/nixpkgs/nixos-unstable".to_string(),
        }),
        Box::new(NixTerm::Input {
            name: "flake-utils".to_string(),
            url: "github:numtide/flake-utils".to_string(),
        }),
    ];
    
    // Build sort: Outputs (boxed)
    let outputs = build_outputs_term(project_name, build_type, version, deps);
    
    // Construct sort: Flake
    NixTerm::Flake {
        description: format!("{} - Generated by Phoenix VCS formal pipeline", project_name),
        inputs,
        outputs: Box::new(outputs),
    }
}

/// Build the Outputs term for a given build type
fn build_outputs_term(
    project_name: &str,
    build_type: &str,
    version: &str,
    deps: &[String],
) -> NixTerm {
    let pname = project_name.to_lowercase().replace(" ", "-").replace("_", "-");
    
    let (packages, dev_shells, apps) = match build_type {
        "python" | "py" => {
            // Base template deps + extra deps
            let mut all_deps = vec!["textual".to_string()];  // Base for python-textual template
            all_deps.extend(deps.iter().cloned());
            
            let pkg = Box::new(NixTerm::PythonPackage {
                pname: pname.clone(),
                version: version.to_string(),
                src: Box::new(NixTerm::PathLiteral("./.".to_string())),
                format: "pyproject".to_string(),
                build_system: vec!["hatchling".to_string()],
                propagated_build_inputs: all_deps.clone(),
                main_program: pname.clone(),
            });
            
            let dev_shell = Box::new(NixTerm::DevShell {
                build_inputs: {
                    let mut inputs = vec!["python312".to_string()];
                    inputs.extend(all_deps.iter().map(|d| format!("python312Packages.{}", d)));
                    inputs
                },
            });
            
            let app = Box::new(NixTerm::App {
                program: pname.clone(),
            });
            
            (
                vec![("default".to_string(), pkg)],
                vec![("default".to_string(), dev_shell)],
                vec![("default".to_string(), app)],
            )
        }
        
        "rust" | "rs" => {
            let pkg = Box::new(NixTerm::RustPackage {
                pname: pname.clone(),
                version: version.to_string(),
                src: Box::new(NixTerm::PathLiteral("./.".to_string())),
                main_program: pname.replace("_", "-"),
            });
            
            let dev_shell = Box::new(NixTerm::DevShell {
                build_inputs: vec!["rust-bin.stable.latest.default".to_string()],
            });
            
            let app = Box::new(NixTerm::App {
                program: pname.replace("_", "-"),
            });
            
            (
                vec![("default".to_string(), pkg)],
                vec![("default".to_string(), dev_shell)],
                vec![("default".to_string(), app)],
            )
        }
        
        "bun" | "typescript" | "ts" => {
            // Bun/TypeScript project
            let dev_shell = Box::new(NixTerm::DevShell {
                build_inputs: vec!["bun".to_string(), "nodejs".to_string()],
            });
            
            let app = Box::new(NixTerm::App {
                program: "bun run index.ts".to_string(),
            });
            
            (
                vec![], // No package build for Bun projects
                vec![("default".to_string(), dev_shell)],
                vec![("default".to_string(), app)],
            )
        }
        
        "bundle" => {
            // Bundle-author meta-bundle - no build needed, just file generation
            // Return empty - bundle files are generated directly without Nix
            (
                vec![],
                vec![],
                vec![],
            )
        }
        
        "swift" => {
            // Swift/Vapor project
            let dev_shell = Box::new(NixTerm::DevShell {
                build_inputs: vec!["swift".to_string(), "swiftPackages.swiftpm".to_string()],
            });
            
            let app = Box::new(NixTerm::App {
                program: "swift run".to_string(),
            });
            
            (
                vec![], // No package build - Swift Package Manager handles it
                vec![("default".to_string(), dev_shell)],
                vec![("default".to_string(), app)],
            )
        }
        
        _ => {
            // Generic fallback
            let dev_shell = Box::new(NixTerm::DevShell {
                build_inputs: vec![],
            });
            (
                vec![],
                vec![("default".to_string(), dev_shell)],
                vec![],
            )
        }
    };
    
    NixTerm::Outputs {
        packages,
        dev_shells,
        apps,
    }
}

/// Pretty-printer: ThNix → String
/// 
/// Transforms algebraic terms into concrete Nix syntax.
/// This is a homomorphism from the term algebra to strings.
pub fn nix_term_to_string(term: &NixTerm) -> String {
    match term {
        NixTerm::Flake { description, inputs, outputs } => {
            let inputs_str = inputs.iter()
                .map(|t| nix_term_to_string(t.as_ref()))
                .collect::<Vec<_>>()
                .join("\n    ");
            
            let outputs_str = nix_term_to_string(outputs.as_ref());
            
            format!(r#"{{
  description = "{}";

  inputs = {{
    {}
  }};

  outputs = {{ self, nixpkgs, flake-utils }}:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${{system}};
      in
      {}
    );
}}"#, description, inputs_str, outputs_str)
        }
        
        NixTerm::Input { name, url } => {
            format!("{}.url = \"{}\";", name, url)
        }
        
        NixTerm::Outputs { packages, dev_shells, apps } => {
            let mut sections = vec![];
            
            if !packages.is_empty() {
                let pkgs = packages.iter()
                    .map(|(name, pkg)| {
                        let pkg_str = nix_term_to_string(pkg.as_ref());
                        format!("          {} = {};", name, pkg_str)
                    })
                    .collect::<Vec<_>>()
                    .join("\n");
                sections.push(format!("packages = {{\n{}\n        }};", pkgs));
            }
            
            if !dev_shells.is_empty() {
                let shells = dev_shells.iter()
                    .map(|(name, shell)| {
                        let shell_str = nix_term_to_string(shell.as_ref());
                        format!("          {} = {};", name, shell_str)
                    })
                    .collect::<Vec<_>>()
                    .join("\n");
                sections.push(format!("devShells = {{\n{}\n        }};", shells));
            }
            
            if !apps.is_empty() && apps.len() > packages.len() {
                // Only show apps if different from packages
                let apps_str = apps.iter()
                    .map(|(name, app)| {
                        let app_str = nix_term_to_string(app.as_ref());
                        format!("          {} = {};", name, app_str)
                    })
                    .collect::<Vec<_>>()
                    .join("\n");
                sections.push(format!("apps = {{\n{}\n        }};", apps_str));
            }
            
            format!("{{\n        {}\n      }}", sections.join("\n        "))
        }
        
        NixTerm::PythonPackage { 
            pname, 
            version, 
            src, 
            format, 
            build_system, 
            propagated_build_inputs, 
            main_program 
        } => {
            let src_str = nix_term_to_string(src.as_ref());
            let build_sys = build_system.join(" ");
            let deps = if propagated_build_inputs.is_empty() {
                "[]".to_string()
            } else {
                format!("[ {} ]", propagated_build_inputs.join(" "))
            };
            
            format!(r#"(pkgs.python312Packages.buildPythonApplication {{
            pname = "{}";
            version = "{}";
            src = {};
            format = "{}";
            build-system = with pkgs.python312Packages; [ {} ];
            propagatedBuildInputs = with pkgs.python312Packages; {};
            meta.mainProgram = "{}";
          }})"#, pname, version, src_str, format, build_sys, deps, main_program)
        }
        
        NixTerm::RustPackage { pname, version, src, main_program } => {
            let src_str = nix_term_to_string(src.as_ref());
            format!("(pkgs.rustPlatform.buildRustPackage {{\n            pname = \"{}\";\n            version = \"{}\";\n            src = {};\n            cargoLock.lockFile = ./Cargo.lock;\n            meta.mainProgram = \"{}\";\n          }})", pname, version, src_str, main_program)
        }
        
        NixTerm::DevShell { build_inputs } => {
            let inputs = if build_inputs.is_empty() {
                "[]".to_string()
            } else {
                format!("[\n              {}\n            ]", 
                    build_inputs.iter()
                        .map(|i| format!("{}", i))
                        .collect::<Vec<_>>()
                        .join("\n              "))
            };
            
            format!("(pkgs.mkShell {{\n            buildInputs = with pkgs; {};\n          }})", inputs)
        }
        
        NixTerm::App { program } => {
            format!("{{\n            type = \"app\";\n            program = \"{}\";\n          }}", program)
        }
        
        NixTerm::PathLiteral(p) => p.clone(),
        NixTerm::StringLiteral(s) => format!("\"{}\"", s),
        NixTerm::AttrSet(attrs) => {
            let items = attrs.iter()
                .map(|(k, v)| format!("{} = {};", k, nix_term_to_string(v.as_ref())))
                .collect::<Vec<_>>()
                .join("; ");
            format!("{{ {} }}", items)
        }
        NixTerm::List(items) => {
            let elems = items.iter()
                .map(|t| nix_term_to_string(t.as_ref()))
                .collect::<Vec<_>>()
                .join(" ");
            format!("[ {} ]", elems)
        }
        NixTerm::Apply { function, arg } => {
            format!("({} {})", function, nix_term_to_string(arg.as_ref()))
        }
        NixTerm::Var(v) => v.clone(),
        NixTerm::AttrPath { base, path } => {
            format!("{}.{}", base, path.join("."))
        }
    }
}

/// Complete pipeline: spec → NixTerm → String
/// 
/// Composes the morphisms:
///   μ_spec→nix: ThSpec → ThNix
///   μ_nix→str: ThNix → String
pub fn generate_flake_from_spec_term(
    project_name: &str,
    build_type: &str,
    version: &str,
    deps: &[String],
) -> String {
    let term = spec_to_nix_term(project_name, build_type, version, deps);
    nix_term_to_string(&term)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_python_flake_generation() {
        let deps = vec!["textual".to_string(), "rich".to_string()];
        let flake = generate_flake_from_spec_term("my-app", "python", "0.1.0", &deps);
        
        assert!(flake.contains("nixpkgs.url"));
        assert!(flake.contains("flake-utils.url"));
        assert!(flake.contains("buildPythonApplication"));
        assert!(flake.contains("textual"));
        assert!(flake.contains("rich"));
    }
    
    #[test]
    fn test_nix_term_algebra() {
        // Test that terms compose algebraically
        let input = NixTerm::Input {
            name: "test".to_string(),
            url: "github:test".to_string(),
        };
        
        let s = nix_term_to_string(&input);
        assert!(s.contains("test.url"));
        assert!(s.contains("github:test"));
    }
}
