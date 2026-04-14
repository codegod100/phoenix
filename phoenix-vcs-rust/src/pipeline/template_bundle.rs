//! Template Bundle System
//!
//! Modular code generation for different languages and frameworks.
//!
//! Structure:
//! - `types` submodule: Shared types (BundleFile, TemplateBundle, FormalTheory)
//! - `typescript` submodule: TypeScript/Hono code generation
//! - `python` submodule: Python project generation (future)

mod types;
mod typescript;

// Include all bundle-specific Rust code
// Each bundle is self-contained with its own generation logic
#[path = "../../bundles/lit/generate.rs"]
pub mod lit_generate;
#[path = "../../bundles/nodejs-express/generate.rs"]
pub mod nodejs_express_generate;
#[path = "../../bundles/swift-vapor/generate.rs"]
pub mod swift_vapor_generate;
#[path = "../../bundles/python-textual/generate.rs"]
pub mod python_textual_generate;
#[path = "../../bundles/bundle-author/generate.rs"]
pub mod bundle_author_generate;
#[path = "../../bundles/ts-hono/generate.rs"]
pub mod ts_hono_generate;
#[path = "../../bundles/python-flask/generate.rs"]
pub mod python_flask_generate;
#[path = "../../bundles/python-generic/generate.rs"]
pub mod python_generic_generate;
#[path = "../../bundles/rust/generate.rs"]
pub mod rust_generate;

pub use types::{BundleFile, FormalTheory, TemplateBundle};
pub use typescript::{
    generate_package_json_term,
    generate_tsconfig_term,
    generate_hono_server_term,
    ts_hono_bundle,
};

use std::collections::HashMap;
use std::path::PathBuf;

/// Get the bundle definition for a template type
pub fn get_bundle(template: &str) -> Option<TemplateBundle> {
    match template {
        "python-textual" | "python_textual" => Some(python_textual_bundle()),
        "python-flask" | "python_flask" => Some(python_flask_bundle()),
        "python" => Some(python_generic_bundle()),
        "rust" => Some(rust_bundle()),
        "ts-hono" | "ts_hono" | "typescript-hono" => Some(typescript::ts_hono_bundle()),
        "bundle-author" | "bundle_author" => Some(bundle_author_bundle()),
        "swift-vapor" | "swift_vapor" => Some(swift_vapor_bundle()),
        "nodejs-express" | "nodejs_express" => Some(nodejs_express_bundle()),
        "lit" | "lit-web-components" => Some(lit_bundle()),
        _ => None,
    }
}

/// Load an NCL-native bundle from a directory
/// 
/// This loads bundles that use pure NCL for code generation.
/// The bundle folder must contain:
/// - bundle.ncl: Bundle configuration
/// - generate.ncl: Generation logic
/// - templates.ncl: Template definitions
pub fn load_ncl_bundle(bundle_dir: impl AsRef<std::path::Path>) -> Option<TemplateBundle> {
    use std::path::Path;
    
    let bundle_dir = bundle_dir.as_ref();
    let bundle_ncl_path = bundle_dir.join("bundle.ncl");
    
    if !bundle_ncl_path.exists() {
        return None;
    }
    
    // Read and parse bundle.ncl
    let bundle_content = std::fs::read_to_string(&bundle_ncl_path).ok()?;
    
    // Extract bundle metadata from NCL
    let bundle_name = extract_ncl_string(&bundle_content, "id")?;
    let _version = extract_ncl_string(&bundle_content, "version").unwrap_or_else(|| "1.0.0".to_string());
    
    // Check if this is an NCL-native bundle
    let is_ncl_native = bundle_content.contains("type = \"ncl-native\"") 
        || bundle_content.contains("type=\"ncl-native\"");
    
    if !is_ncl_native {
        // Fall back to standard bundle loading
        return None;
    }
    
    // For NCL-native bundles, we use a special theory that delegates to NCL
    let entry_point = extract_ncl_string(&bundle_content, "entry_point")
        .unwrap_or_else(|| "generate.ncl".to_string());
    
    let templates_file = extract_ncl_string(&bundle_content, "templates")
        .unwrap_or_else(|| "templates.ncl".to_string());
    
    // Build file list from bundle.ncl
    let mut files = vec![];
    if let Some(files_section) = extract_ncl_array(&bundle_content, "files") {
        for path in files_section {
            files.push(BundleFile {
                path: PathBuf::from(path.trim_matches('"')),
                theory: FormalTheory::ThTemplate { 
                    template_path: format!("{}/{}", bundle_name, path.trim_matches('"')) 
                },
                description: format!("Generated from {}", entry_point),
            });
        }
    }
    
    // Default files if not specified
    if files.is_empty() {
        let default_files = [
            "package.json",
            "tsconfig.json", 
            "vite.config.ts",
            "index.html",
            "src/main.ts",
        ];
        for file in &default_files {
            files.push(BundleFile {
                path: PathBuf::from(file),
                theory: FormalTheory::ThTemplate { 
                    template_path: format!("{}/{}", bundle_name, file) 
                },
                description: "Generated from NCL template".to_string(),
            });
        }
    }
    
    Some(TemplateBundle {
        name: bundle_name.clone(),
        files,
        base_deps: vec![
            "lit".to_string(),
            "typescript".to_string(),
            "vite".to_string(),
        ],
    })
}

/// Extract a string value from NCL content
fn extract_ncl_string(content: &str, key: &str) -> Option<String> {
    let pattern = format!("{} = \"", key);
    if let Some(start) = content.find(&pattern) {
        let rest = &content[start + pattern.len()..];
        if let Some(end) = rest.find('"') {
            return Some(rest[..end].to_string());
        }
    }
    None
}

/// Extract an array of strings from NCL content
fn extract_ncl_array(content: &str, key: &str) -> Option<Vec<String>> {
    let pattern = format!("{} = [", key);
    if let Some(start) = content.find(&pattern) {
        let rest = &content[start + pattern.len()..];
        if let Some(end) = rest.find(']') {
            let items = &rest[..end];
            return Some(
                items.split(',')
                    .map(|s| s.trim().to_string())
                    .filter(|s| !s.is_empty())
                    .collect()
            );
        }
    }
    None
}

/// Python Textual TUI template bundle
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
                path: PathBuf::from("src/app.py"),
                theory: FormalTheory::ThTemplate { template_path: "python-flask/src/app.py".to_string() },
                description: "Flask application entry point".to_string(),
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
            BundleFile {
                path: PathBuf::from("src/main.py"),
                theory: FormalTheory::ThTemplate { template_path: "python-generic/src/main.py".to_string() },
                description: "Python application entry point".to_string(),
            },
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
            BundleFile {
                path: PathBuf::from("src/main.rs"),
                theory: FormalTheory::ThTemplate { template_path: "rust/src/main.rs".to_string() },
                description: "Rust application entry point".to_string(),
            },
        ],
        base_deps: vec![],
    }
}

/// Node.js Express template bundle
fn nodejs_express_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "nodejs-express".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("package.json"),
                theory: FormalTheory::ThTemplate { template_path: "nodejs-express/package.json".to_string() },
                description: "NPM package configuration".to_string(),
            },
            BundleFile {
                path: PathBuf::from("app.js"),
                theory: FormalTheory::ThTemplate { template_path: "nodejs-express/app.js".to_string() },
                description: "Express application entry point".to_string(),
            },
            BundleFile {
                path: PathBuf::from("flake.nix"),
                theory: FormalTheory::ThNix,
                description: "Nix flake with Node.js".to_string(),
            },
            BundleFile {
                path: PathBuf::from(".env.example"),
                theory: FormalTheory::ThTemplate { template_path: "nodejs-express/.env.example".to_string() },
                description: "Environment variables template".to_string(),
            },
            BundleFile {
                path: PathBuf::from("README.md"),
                theory: FormalTheory::ThMarkdown,
                description: "Project documentation".to_string(),
            },
        ],
        base_deps: vec![
            "express".to_string(),
            "mongoose".to_string(),
            "cors".to_string(),
            "helmet".to_string(),
            "morgan".to_string(),
            "dotenv".to_string(),
        ],
    }
}

/// Lit Web Components frontend template bundle - NCL Native
/// 
/// This bundle uses pure NCL for code generation via templates.ncl
fn lit_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "lit".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("flake.nix"),
                theory: FormalTheory::ThNix,
                description: "Nix flake with Node.js toolchain".to_string(),
            },
            // Use ThTemplate with NCL paths to trigger NCL-native generation
            BundleFile {
                path: PathBuf::from("package.json"),
                theory: FormalTheory::ThTemplate { 
                    template_path: "lit/package.json".to_string() 
                },
                description: "NPM package with Lit dependencies (NCL-native)".to_string(),
            },
            BundleFile {
                path: PathBuf::from("tsconfig.json"),
                theory: FormalTheory::ThTemplate { 
                    template_path: "lit/tsconfig.json".to_string() 
                },
                description: "TypeScript configuration (NCL-native)".to_string(),
            },
            BundleFile {
                path: PathBuf::from("vite.config.ts"),
                theory: FormalTheory::ThTemplate { 
                    template_path: "lit/vite.config.ts".to_string() 
                },
                description: "Vite build configuration (NCL-native)".to_string(),
            },
            BundleFile {
                path: PathBuf::from("index.html"),
                theory: FormalTheory::ThTemplate { 
                    template_path: "lit/index.html".to_string() 
                },
                description: "HTML entry point (NCL-native)".to_string(),
            },
            BundleFile {
                path: PathBuf::from("src/main.ts"),
                theory: FormalTheory::ThTemplate { 
                    template_path: "lit/src/main.ts".to_string() 
                },
                description: "Application entry with Lit components (NCL-native)".to_string(),
            },
            BundleFile {
                path: PathBuf::from("README.md"),
                theory: FormalTheory::ThMarkdown,
                description: "Project documentation".to_string(),
            },
        ],
        base_deps: vec![
            "lit".to_string(),
            "typescript".to_string(),
            "vite".to_string(),
        ],
    }
}

/// Bundle author meta-bundle - generates bundle definitions
fn bundle_author_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "bundle-author".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("bundle.ncl"),
                theory: FormalTheory::ThTemplate { template_path: "bundle-author/bundle.ncl".to_string() },
                description: "Bundle metadata definition".to_string(),
            },
            BundleFile {
                path: PathBuf::from("template_contract.ncl"),
                theory: FormalTheory::ThTemplate { template_path: "bundle-author/template_contract.ncl".to_string() },
                description: "Spec validation contract".to_string(),
            },
            BundleFile {
                path: PathBuf::from("theory_contract_panproto.ncl"),
                theory: FormalTheory::ThTemplate { template_path: "bundle-author/theory_contract_panproto.ncl".to_string() },
                description: "Formal theory in panproto format".to_string(),
            },
            BundleFile {
                path: PathBuf::from("prompt_theory.md"),
                theory: FormalTheory::ThTemplate { template_path: "bundle-author/prompt_theory.md".to_string() },
                description: "LLM prompt for theory generation".to_string(),
            },
            BundleFile {
                path: PathBuf::from("prompt_contract.md"),
                theory: FormalTheory::ThTemplate { template_path: "bundle-author/prompt_contract.md".to_string() },
                description: "LLM prompt for contract generation".to_string(),
            },
        ],
        base_deps: vec![],
    }
}

/// Swift Vapor web API template bundle
fn swift_vapor_bundle() -> TemplateBundle {
    TemplateBundle {
        name: "swift-vapor".to_string(),
        files: vec![
            BundleFile {
                path: PathBuf::from("Package.swift"),
                theory: FormalTheory::ThTemplate { template_path: "swift-vapor/Package.swift".to_string() },
                description: "Swift Package Manager manifest".to_string(),
            },
            BundleFile {
                path: PathBuf::from("Sources/App/configure.swift"),
                theory: FormalTheory::ThTemplate { template_path: "swift-vapor/configure.swift".to_string() },
                description: "Vapor app configuration".to_string(),
            },
            BundleFile {
                path: PathBuf::from("Sources/App/routes.swift"),
                theory: FormalTheory::ThTemplate { template_path: "swift-vapor/routes.swift".to_string() },
                description: "Route definitions".to_string(),
            },
            BundleFile {
                path: PathBuf::from("Sources/App/Models/User.swift"),
                theory: FormalTheory::ThTemplate { template_path: "swift-vapor/User.swift".to_string() },
                description: "User model".to_string(),
            },
            BundleFile {
                path: PathBuf::from("Sources/App/Controllers/UsersController.swift"),
                theory: FormalTheory::ThTemplate { template_path: "swift-vapor/UsersController.swift".to_string() },
                description: "Users controller".to_string(),
            },
        ],
        base_deps: vec![
            "vapor".to_string(),
            "fluent".to_string(),
            "fluent-postgres-driver".to_string(),
        ],
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
    
    // Parse extra deps from spec content
    let extra_deps = parse_extra_deps(spec_content);
    
    // Merge base deps + extra deps
    let mut all_deps = bundle.base_deps.clone();
    all_deps.extend(extra_deps);
    
    let build_type = bundle.build_type();
    
    for file in &bundle.files {
        let content = match &file.theory {
            FormalTheory::ThNix => {
                crate::pipeline::nix_codegen::generate_flake_from_spec_term(
                    project_name,
                    build_type,
                    "0.1.0",
                    &all_deps,
                )
            }
            FormalTheory::ThPyProject => {
                generate_pyproject_term(project_name, &all_deps)
            }
            FormalTheory::ThPythonTextual => {
                // Use isolated python-textual bundle generator
                let files = python_textual_generate::generate(project_name, spec_content);
                files.get(&std::path::PathBuf::from("src/main.py"))
                    .cloned()
                    .unwrap_or_else(|| "# No Python code generated".to_string())
            }
            FormalTheory::ThMarkdown => {
                generate_readme_term(project_name, spec_content)
            }
            FormalTheory::ThRust => {
                // TODO: Implement ThRust
                "// TODO: Rust generation".to_string()
            }
            // TypeScript theories - delegate to typescript module
            FormalTheory::ThTypeScript 
            | FormalTheory::ThPackageJson 
            | FormalTheory::ThTsConfig
            | FormalTheory::ThLitPackageJson
            | FormalTheory::ThLitTsConfig
            | FormalTheory::ThLitViteConfig
            | FormalTheory::ThLitHtml
            | FormalTheory::ThLitMain => {
                typescript::generate_typescript_file(
                    &file.theory,
                    project_name,
                    spec_content,
                    ius,
                    &all_deps,
                )
            }
            FormalTheory::ThTemplate { template_path } => {
                // Check if this is a bundle template (e.g., "lit/package.json")
                let parts: Vec<_> = template_path.split('/').collect();
                if parts.len() >= 2 {
                    let bundle_name = parts[0];
                    let file_name = parts.last().unwrap_or(&"main.ts");
                    
                    // Route to bundle-specific Rust generator
                    match bundle_name {
                        "lit" => generate_lit_bundle_file(file_name, project_name, spec_content),
                        "nodejs-express" => generate_nodejs_express_bundle_file(file_name, project_name, spec_content),
                        "swift-vapor" => generate_swift_vapor_bundle_file(file_name, project_name, spec_content),
                        "bundle-author" => generate_bundle_author_bundle_file(file_name, project_name, spec_content),
                        "ts-hono" => generate_ts_hono_bundle_file(file_name, project_name, spec_content),
                        "python-flask" => generate_python_flask_bundle_file(file_name, project_name, spec_content),
                        "python-generic" => generate_python_generic_bundle_file(file_name, project_name, spec_content),
                        "rust" => generate_rust_bundle_file(file_name, project_name, spec_content),
                        _ => format!("// Template from {}", template_path),
                    }
                } else {
                    format!("// Template from {}", template_path)
                }
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

/// Generate a file using the Lit bundle's isolated Rust code
/// 
/// This calls into bundles/lit/generate.rs for all code generation.
fn generate_lit_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    // Call the isolated Lit bundle generator
    let files = lit_generate::generate(project_name, spec_content);
    
    // Extract the requested file
    let path = match file_name {
        "package.json" => std::path::PathBuf::from("package.json"),
        "tsconfig.json" => std::path::PathBuf::from("tsconfig.json"),
        "vite.config.ts" => std::path::PathBuf::from("vite.config.ts"),
        "index.html" => std::path::PathBuf::from("index.html"),
        "main.ts" | "src/main.ts" => std::path::PathBuf::from("src/main.ts"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate a file using the Node.js Express bundle's isolated Rust code
fn generate_nodejs_express_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    let files = nodejs_express_generate::generate(project_name, spec_content);
    
    let path = match file_name {
        "package.json" => std::path::PathBuf::from("package.json"),
        "app.js" => std::path::PathBuf::from("app.js"),
        ".env.example" => std::path::PathBuf::from(".env.example"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate a file using the Swift Vapor bundle's isolated Rust code
fn generate_swift_vapor_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    let files = swift_vapor_generate::generate(project_name, spec_content);
    
    let path = match file_name {
        "Package.swift" => std::path::PathBuf::from("Package.swift"),
        "configure.swift" => std::path::PathBuf::from("Sources/App/configure.swift"),
        "routes.swift" => std::path::PathBuf::from("Sources/App/routes.swift"),
        "User.swift" => std::path::PathBuf::from("Sources/App/Models/User.swift"),
        "UsersController.swift" => std::path::PathBuf::from("Sources/App/Controllers/UsersController.swift"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate a file using the Bundle Author bundle's isolated Rust code
fn generate_bundle_author_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    let files = bundle_author_generate::generate(project_name, spec_content);
    
    let path = match file_name {
        "bundle.ncl" => std::path::PathBuf::from("bundle.ncl"),
        "template_contract.ncl" => std::path::PathBuf::from("template_contract.ncl"),
        "theory_contract_panproto.ncl" => std::path::PathBuf::from("theory_contract_panproto.ncl"),
        "prompt_theory.md" => std::path::PathBuf::from("prompt_theory.md"),
        "prompt_contract.md" => std::path::PathBuf::from("prompt_contract.md"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate a file using the TypeScript Hono bundle's isolated Rust code
fn generate_ts_hono_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    let files = ts_hono_generate::generate(project_name, spec_content);
    
    let path = match file_name {
        "package.json" => std::path::PathBuf::from("package.json"),
        "tsconfig.json" => std::path::PathBuf::from("tsconfig.json"),
        "index.ts" | "src/index.ts" => std::path::PathBuf::from("src/index.ts"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate a file using the Python Flask bundle's isolated Rust code
fn generate_python_flask_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    let files = python_flask_generate::generate(project_name, spec_content);
    
    let path = match file_name {
        "app.py" | "src/app.py" => std::path::PathBuf::from("src/app.py"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate a file using the Python Generic bundle's isolated Rust code
fn generate_python_generic_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    let files = python_generic_generate::generate(project_name, spec_content);
    
    let path = match file_name {
        "main.py" | "src/main.py" => std::path::PathBuf::from("src/main.py"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate a file using the Rust bundle's isolated Rust code
fn generate_rust_bundle_file(
    file_name: &str,
    project_name: &str,
    spec_content: &str
) -> String {
    let files = rust_generate::generate(project_name, spec_content);
    
    let path = match file_name {
        "Cargo.toml" => std::path::PathBuf::from("Cargo.toml"),
        "main.rs" | "src/main.rs" => std::path::PathBuf::from("src/main.rs"),
        _ => std::path::PathBuf::from(file_name),
    };
    
    files.get(&path)
        .cloned()
        .unwrap_or_else(|| format!("// Error: could not generate {}", file_name))
}

/// Generate package.json for Lit app
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
}

/// Morphism: ThSpec → ThPyProject
fn spec_to_pyproject_term(project_name: &str, deps: &[String]) -> PyProjectTerm {
    // Sanitize: lowercase, spaces→hyphens for valid Python package names
    let pname = project_name.to_lowercase().replace(" ", "-").replace("_", "-");
    
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
            format!("[tool.hatch.build.targets.wheel]\n{}", pyproject_term_to_string(hatch_build))
        }
        
        PyProjectTerm::HatchBuild { packages } => {
            let pkgs_str = format_list(packages);
            format!("packages = {}", pkgs_str)
        }
    }
}

fn format_list(items: &[String]) -> String {
    if items.is_empty() {
        "[]".to_string()
    } else {
        format!("[{}]", 
            items.iter()
                .map(|i| format!("\"{}\"", i))
                .collect::<Vec<_>>()
                .join(", "))
    }
}

/// Generate README.md using ThMarkdown formal theory
/// 
/// This implements μ_readme: ThSpec → ThMarkdown → String
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

This project was generated using formal theory morphisms.

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
    
    #[test]
    fn test_ts_hono_bundle() {
        let bundle = get_bundle("ts-hono").unwrap();
        assert_eq!(bundle.name, "ts-hono");
        assert!(bundle.base_deps.contains(&"hono".to_string()));
        
        // Check all expected files exist
        let paths: Vec<_> = bundle.files.iter().map(|f| f.path.clone()).collect();
        assert!(paths.contains(&PathBuf::from("flake.nix")));
        assert!(paths.contains(&PathBuf::from("package.json")));
        assert!(paths.contains(&PathBuf::from("tsconfig.json")));
        assert!(paths.contains(&PathBuf::from("README.md")));
        assert!(paths.contains(&PathBuf::from("index.ts")));
    }
    
    #[test]
    fn test_generate_package_json() {
        let deps = vec!["hono".to_string()];
        let json = generate_package_json_term("my-api", &deps);
        
        assert!(json.contains("\"name\": \"my-api\""));
        assert!(json.contains("hono\""));
        assert!(json.contains("bun run --hot"));
        assert!(json.contains("typescript"));
    }
    
    #[test]
    fn test_generate_tsconfig() {
        let json = generate_tsconfig_term();
        
        assert!(json.contains("\"target\": \"ES2022\""));
        assert!(json.contains("\"module\": \"ESNext\""));
        assert!(json.contains("\"strict\": true"));
        assert!(json.contains("\"types\": [\"bun\"]"));
    }
}
