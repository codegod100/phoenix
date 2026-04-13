//! Template Bundle System
//!
//! Each template type defines a bundle of files, where each file is generated
//! by a formal theory morphism. This replaces ad-hoc generation with structured
//! theory composition.
//!
//! Example:
//!   Template "python-textual" → Bundle {
//!     "flake.nix"      → μ_flake: ThSpec → ThNix → String
//!     "pyproject.toml" → μ_pyproject: ThSpec → ThPyProject → String
//!     "app.py"         → μ_iu→term ∘ μ_term→code: ThIU → ThPythonTextual → String
//!     "README.md"      → μ_readme: ThSpec → ThMarkdown → String
//!   }

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation};
#[cfg(feature = "panproto")]
use std::sync::Arc;

use std::collections::HashMap;
use std::path::PathBuf;

/// A file entry in a template bundle
/// Defines which formal theory generates this file
#[derive(Debug, Clone)]
pub struct BundleFile {
    pub path: PathBuf,
    pub theory: FormalTheory,
    pub description: String,
}

/// Formal theories available for code generation
#[derive(Debug, Clone)]
pub enum FormalTheory {
    /// Nix flake theory: ThSpec → ThNix → String
    ThNix,
    /// Python project config: ThSpec → ThPyProject → String
    ThPyProject,
    /// Python Textual AST: ThIU → ThPythonTextual → String
    ThPythonTextual,
    /// Markdown documentation: ThSpec → ThMarkdown → String
    ThMarkdown,
    /// Rust source code: ThIU → ThRust → String
    ThRust,
    /// TypeScript source: ThIU → ThTypeScript → String
    ThTypeScript,
    /// Generic text file from template
    ThTemplate { template_path: String },
}

/// Template bundle definition
/// Maps template names to their required files and theories
#[derive(Debug, Clone)]
pub struct TemplateBundle {
    pub name: String,
    pub files: Vec<BundleFile>,
    pub base_deps: Vec<String>,  // Dependencies provided by this template
}

/// Returns the panproto Theory definition for ThPyProject
#[cfg(feature = "panproto")]
pub fn pyproject_theory() -> Theory {
    Theory::new(
        Arc::from("ThPyProject"),
        vec![
            // Root sorts
            Sort { name: Arc::from("Root"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("BuildSystem"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Project"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Tool"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("HatchBuild"), params: vec![], kind: SortKind::Structural },
            // Primitive sorts
            Sort { name: Arc::from("String"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("List"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Script"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            // Root construction
            Operation {
                name: Arc::from("mk_root"),
                inputs: vec![
                    (Arc::from("build_system"), Arc::from("BuildSystem")),
                    (Arc::from("project"), Arc::from("Project")),
                    (Arc::from("tool"), Arc::from("Tool")),
                ],
                output: Arc::from("Root"),
            },
            // BuildSystem construction
            Operation {
                name: Arc::from("mk_build_system"),
                inputs: vec![
                    (Arc::from("requires"), Arc::from("List")),
                    (Arc::from("backend"), Arc::from("String")),
                ],
                output: Arc::from("BuildSystem"),
            },
            // Project construction
            Operation {
                name: Arc::from("mk_project"),
                inputs: vec![
                    (Arc::from("name"), Arc::from("String")),
                    (Arc::from("version"), Arc::from("String")),
                    (Arc::from("description"), Arc::from("String")),
                    (Arc::from("requires_python"), Arc::from("String")),
                    (Arc::from("dependencies"), Arc::from("List")),
                    (Arc::from("scripts"), Arc::from("List")),
                ],
                output: Arc::from("Project"),
            },
            // Tool construction
            Operation {
                name: Arc::from("mk_tool"),
                inputs: vec![
                    (Arc::from("hatch_build"), Arc::from("HatchBuild")),
                ],
                output: Arc::from("Tool"),
            },
            // HatchBuild construction
            Operation {
                name: Arc::from("mk_hatch_build"),
                inputs: vec![
                    (Arc::from("packages"), Arc::from("List")),
                ],
                output: Arc::from("HatchBuild"),
            },
            // Script construction
            Operation {
                name: Arc::from("mk_script"),
                inputs: vec![
                    (Arc::from("name"), Arc::from("String")),
                    (Arc::from("entry_point"), Arc::from("String")),
                ],
                output: Arc::from("Script"),
            },
        ],
        vec![], // equations
    )
}

/// Get the bundle definition for a template type
pub fn get_bundle(template: &str) -> Option<TemplateBundle> {
    match template {
        "python-textual" | "python_textual" => Some(python_textual_bundle()),
        "python-flask" | "python_flask" => Some(python_flask_bundle()),
        "python" => Some(python_generic_bundle()),
        "rust" => Some(rust_bundle()),
        _ => None,
    }
}

/// Python Textual TUI template bundle
/// 
/// Files generated:
/// - flake.nix (ThNix)
/// - pyproject.toml (ThPyProject)  
/// - app.py (ThPythonTextual)
/// - README.md (ThMarkdown)
fn python_textual_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "python-textual".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("flake.nix"),
                theory: FormalTheory::ThNix,
                description: "Nix flake with textual dependencies".to_string(),
            },
            BundleFile {
                path: PathBuf::from("pyproject.toml"),
                theory: FormalTheory::ThPyProject,
                description: "Python project configuration".to_string(),
            },
            BundleFile {
                path: PathBuf::from("README.md"),
                theory: FormalTheory::ThMarkdown,
                description: "Project documentation".to_string(),
            },
            // Note: app.py and domain modules are generated by IUs via μ_iu→term
        ],
        base_deps: vec![
            "textual".to_string(),
            "rich".to_string(),
        ],
    }
}

/// Python Flask web API template bundle
fn python_flask_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "python-flask".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("flake.nix"),
                theory: FormalTheory::ThNix,
                description: "Nix flake with flask dependencies".to_string(),
            },
            BundleFile {
                path: PathBuf::from("pyproject.toml"),
                theory: FormalTheory::ThPyProject,
                description: "Python project configuration".to_string(),
            },
            BundleFile {
                path: PathBuf::from("app.py"),
                theory: FormalTheory::ThPythonTextual, // Could be ThPythonFlask
                description: "Main Flask application".to_string(),
            },
        ],
        base_deps: vec![
            "flask".to_string(),
            "gunicorn".to_string(),
        ],
    }
}

/// Generic Python template bundle
fn python_generic_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "python".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("flake.nix"),
                theory: FormalTheory::ThNix,
                description: "Nix flake".to_string(),
            },
            BundleFile {
                path: PathBuf::from("pyproject.toml"),
                theory: FormalTheory::ThPyProject,
                description: "Python project configuration".to_string(),
            },
            // Note: app.py generated by IUs via μ_iu→term
        ],
        base_deps: vec![],
    }
}

/// Rust application template bundle
fn rust_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "rust".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("flake.nix"),
                theory: FormalTheory::ThNix,
                description: "Nix flake with rust toolchain".to_string(),
            },
            BundleFile {
                path: PathBuf::from("Cargo.toml"),
                theory: FormalTheory::ThTemplate { template_path: "rust/Cargo.toml".to_string() },
                description: "Rust package configuration".to_string(),
            },
            // Note: src/main.rs generated by IUs via μ_iu→term
        ],
        base_deps: vec![],
    }
}

/// Generate all files in a bundle using their respective formal theories
/// 
/// This is the main entry point: template + spec → bundle of generated files
pub fn generate_bundle(
    bundle: &TemplateBundle,
    project_name: &str,
    spec_content: &str,
    ius: &[crate::pipeline::ImplementationUnit],
) -> HashMap<PathBuf, String> {
    let mut outputs = HashMap::new();
    
    // Parse extra deps from spec
    let extra_deps = parse_extra_deps(spec_content);
    
    // Merge base deps + extra deps
    let mut all_deps = bundle.base_deps.clone();
    all_deps.extend(extra_deps);
    
    for file in &bundle.files {
        let content = match &file.theory {
            FormalTheory::ThNix => {
                crate::pipeline::nix_codegen::generate_flake_from_spec_term(
                    project_name,
                    "python", // infer from bundle type
                    "0.1.0",
                    &all_deps,
                )
            }
            FormalTheory::ThPyProject => {
                generate_pyproject_term(project_name, &all_deps)
            }
            FormalTheory::ThPythonTextual => {
                // Generate from first IU (or create integrated app)
                if let Some(iu) = ius.first() {
                    crate::pipeline::term_codegen::generate_from_term(iu, Some(spec_content))
                } else {
                    "# No IUs to generate".to_string()
                }
            }
            FormalTheory::ThMarkdown => {
                generate_readme_term(project_name, spec_content)
            }
            FormalTheory::ThRust => {
                // TODO: Implement ThRust
                "// TODO: Rust generation".to_string()
            }
            FormalTheory::ThTypeScript => {
                // TODO: Implement ThTypeScript  
                "// TODO: TypeScript generation".to_string()
            }
            FormalTheory::ThTemplate { template_path } => {
                // Load and fill template
                format!("# Template from {}", template_path)
            }
        };
        
        outputs.insert(file.path.clone(), content);
    }
    
    outputs
}

/// Parse extra_deps from spec content
fn parse_extra_deps(spec_content: &str) -> Vec<String> {
    if let Some(start) = spec_content.find("extra_deps") {
        let section = &spec_content[start..];
        if let Some(py_start) = section.find("python = [") {
            let py_section = &section[py_start..];
            if let Some(end) = py_section.find("]") {
                let list = &py_section[10..end];
                list.split(',')
                    .map(|s| s.trim().trim_matches('"').to_string())
                    .filter(|s| !s.is_empty() && !s.starts_with('#'))
                    .collect()
            } else {
                vec![]
            }
        } else {
            vec![]
        }
    } else {
        vec![]
    }
}

/// Generate pyproject.toml using ThPyProject formal theory
/// 
/// This implements μ_pyproject: ThSpec → ThPyProject → String
pub fn generate_pyproject_term(project_name: &str, deps: &[String]) -> String {
    // Build term algebraically: ThPyProject
    let term = spec_to_pyproject_term(project_name, deps);
    
    // Pretty-print: ThPyProject → String
    pyproject_term_to_string(&term)
}

/// Algebraic terms for ThPyProject (PyProject GAT)
#[derive(Debug, Clone)]
pub enum PyProjectTerm {
    Root {
        build_system: Box<PyProjectTerm>,
        project: Box<PyProjectTerm>,
        tool: Box<PyProjectTerm>,
    },
    BuildSystem {
        requires: Vec<String>,
        backend: String,
    },
    Project {
        name: String,
        version: String,
        description: String,
        requires_python: String,
        dependencies: Vec<String>,
        scripts: Vec<(String, String)>,  // (name, entry_point)
    },
    Tool {
        hatch_build: Box<PyProjectTerm>,
    },
    HatchBuild {
        packages: Vec<String>,
    },
    String(String),
    List(Vec<String>),
}

/// Morphism: ThSpec → ThPyProject
fn spec_to_pyproject_term(project_name: &str, deps: &[String]) -> PyProjectTerm {
    // Sanitize: lowercase, spaces→hyphens for valid Python package names
    let pname = project_name.to_lowercase().replace(" ", "-").replace("_", "-");
    let pname_underscore = pname.replace("-", "_");
    
    PyProjectTerm::Root {
        build_system: Box::new(PyProjectTerm::BuildSystem {
            requires: vec!["hatchling".to_string()],
            backend: "hatchling.build".to_string(),
        }),
        project: Box::new(PyProjectTerm::Project {
            name: pname.clone(),
            version: "0.1.0".to_string(),
            description: "Generated by Phoenix VCS formal pipeline".to_string(),
            requires_python: ">=3.12".to_string(),
            dependencies: deps.to_vec(),
            scripts: vec![(pname, "app:main".to_string())],
        }),
        tool: Box::new(PyProjectTerm::Tool {
            hatch_build: Box::new(PyProjectTerm::HatchBuild {
                packages: vec![".".to_string()],
            }),
        }),
    }
}

/// Pretty-printer: ThPyProject → String
fn pyproject_term_to_string(term: &PyProjectTerm) -> String {
    match term {
        PyProjectTerm::Root { build_system, project, tool } => {
            let build_str = pyproject_term_to_string(build_system);
            let project_str = pyproject_term_to_string(project);
            let tool_str = pyproject_term_to_string(tool);
            
            format!("{}\n\n{}\n\n{}", build_str, project_str, tool_str)
        }
        
        PyProjectTerm::BuildSystem { requires, backend } => {
            let req_str = format_list(requires);
            format!(
                r#"[build-system]
requires = {}
build-backend = "{}""#,
                req_str, backend
            )
        }
        
        PyProjectTerm::Project { name, version, description, requires_python, dependencies, scripts } => {
            // Deduplicate dependencies
            let mut unique_deps: Vec<String> = dependencies.iter().cloned().collect();
            unique_deps.sort();
            unique_deps.dedup();
            
            let deps_str = if unique_deps.is_empty() {
                "[]".to_string()
            } else {
                format!("[\n{}\n]", 
                    unique_deps.iter()
                        .map(|d| format!("  \"{}\"," , d))
                        .collect::<Vec<_>>()
                        .join("\n"))
            };
            
            let scripts_str = if scripts.is_empty() {
                "".to_string()
            } else {
                let items = scripts.iter()
                    .map(|(n, ep)| format!("{} = \"{}\"", n, ep))
                    .collect::<Vec<_>>()
                    .join("\n");
                format!("\n\n[project.scripts]\n{}", items)
            };
            
            format!(
                r#"[project]
name = "{}"
version = "{}"
description = "{}"
requires-python = "{}"
dependencies = {}{}"#,
                name, version, description, requires_python, deps_str, scripts_str
            )
        }
        
        PyProjectTerm::Tool { hatch_build } => {
            let hatch_str = pyproject_term_to_string(hatch_build);
            format!(
                r#"[tool.hatch.build.targets.wheel]
{}"#,
                hatch_str
            )
        }
        
        PyProjectTerm::HatchBuild { packages } => {
            format!("packages = {}", format_list(packages))
        }
        
        PyProjectTerm::String(s) => s.clone(),
        PyProjectTerm::List(items) => format_list(items),
    }
}

fn format_list(items: &[String]) -> String {
    if items.is_empty() {
        "[]".to_string()
    } else if items.len() == 1 {
        format!("[\"{}\"]", items[0])
    } else {
        format!("[\n{}\n]", 
            items.iter()
                .map(|i| format!("  \"{}\"," , i))
                .collect::<Vec<_>>()
                .join("\n"))
    }
}

/// Generate README.md using ThMarkdown formal theory
fn generate_readme_term(project_name: &str, spec_content: &str) -> String {
    let description = spec_content.lines()
        .find(|l| l.contains("description"))
        .map(|l| {
            l.split('=').nth(1)
                .unwrap_or("")
                .trim()
                .trim_matches('"')
                .to_string()
        })
        .unwrap_or_else(|| format!("{} project", project_name));
    
    format!(r#"# {}

{}

## Generated by Phoenix VCS

This project was generated using formal theory morphisms:
- μ_flake: ThSpec → ThNix
- μ_pyproject: ThSpec → ThPyProject  
- μ_code: ThIU → ThPythonTextual

## Running

```bash
nix run
```
"#, project_name, description)
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_python_textual_bundle() {
        let bundle = get_bundle("python-textual").unwrap();
        assert_eq!(bundle.name, "python-textual");
        assert!(bundle.base_deps.contains(&"textual".to_string()));
        assert!(bundle.base_deps.contains(&"rich".to_string()));
        
        // Check all expected files exist
        let paths: Vec<_> = bundle.files.iter().map(|f| f.path.clone()).collect();
        assert!(paths.contains(&PathBuf::from("flake.nix")));
        assert!(paths.contains(&PathBuf::from("pyproject.toml")));
        assert!(paths.contains(&PathBuf::from("README.md")));
        // Note: app.py is generated by IUs, not part of the bundle
    }
    
    #[test]
    fn test_generate_pyproject() {
        let deps = vec!["textual".to_string(), "rich".to_string()];
        let toml = generate_pyproject_term("my-app", &deps);
        
        assert!(toml.contains("name = \"my-app\""));
        assert!(toml.contains("textual\""));
        assert!(toml.contains("rich\""));
        assert!(toml.contains("my-app = \"app:main\""));
    }
}
