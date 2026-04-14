// Types shared across template bundle modules
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
    /// Node.js package.json: ThSpec → ThPackageJson → String
    ThPackageJson,
    /// TypeScript config: ThSpec → ThTsConfig → String
    ThTsConfig,
    /// Lit package.json with Vite: ThSpec → ThLitPackageJson → String
    ThLitPackageJson,
    /// Lit TypeScript config: ThSpec → ThLitTsConfig → String
    ThLitTsConfig,
    /// Lit Vite config: ThSpec → ThLitViteConfig → String
    ThLitViteConfig,
    /// Lit HTML entry: ThSpec → ThLitHtml → String
    ThLitHtml,
    /// Lit main.ts: ThSpec → ThLitMain → String
    ThLitMain,
    /// Generic text file from template
    ThTemplate { template_path: String },
}

/// Complete template bundle definition
#[derive(Debug, Clone)]
pub struct TemplateBundle {
    pub name: String,
    pub files: Vec<BundleFile>,
    pub base_deps: Vec<String>,
}

impl TemplateBundle {
    /// Get the build type for this bundle
    pub fn build_type(&self) -> &str {
        match self.name.as_str() {
            "python-textual" | "python-flask" | "python" => "python",
            "rust" => "rust",
            "ts-hono" | "ts_hono" | "typescript-hono" => "bun",
            "bundle-author" | "bundle_author" => "bundle",
            "swift-vapor" | "swift_vapor" => "swift",
            _ => "python", // default
        }
    }
}
