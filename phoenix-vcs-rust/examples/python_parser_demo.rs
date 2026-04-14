//! Python Parser Demo
//!
//! This example demonstrates how to:
//! 1. Create a parser registry
//! 2. Get the Python parser from the registry
//! 3. Get the Python base protocol from the registry
//! 4. Parse a Python file using tree-sitter-python
//! 5. Map parsed AST to PythonComponent theory

use std::collections::HashMap;
use serde::{Deserialize, Serialize};

/// Parser registry for language protocols
pub struct ParserRegistry {
    parsers: HashMap<String, LanguageParser>,
    protocols: HashMap<String, ProtocolSpec>,
}

/// Language parser handle
pub struct LanguageParser {
    pub language: String,
    pub tree_sitter_lang: tree_sitter::Language,
}

/// Protocol specification (placeholder - would load from .ncl)
#[derive(Debug, Clone)]
pub struct ProtocolSpec {
    pub id: String,
    pub theory_name: String,
}

/// Parsed Python module AST
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ParsedPythonModule {
    pub name: String,
    pub imports: Vec<PythonImport>,
    pub classes: Vec<PythonClass>,
    pub functions: Vec<PythonFunction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum PythonImport {
    Simple { module: String },
    From { module: String, names: Vec<String> },
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonClass {
    pub name: String,
    pub bases: Vec<String>,
    pub decorators: Vec<String>,
    pub methods: Vec<PythonFunction>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonFunction {
    pub name: String,
    pub parameters: Vec<PythonParameter>,
    pub is_method: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonParameter {
    pub name: String,
    pub is_self: bool,
}

impl ParserRegistry {
    /// Create a new parser registry with built-in language parsers
    pub fn new() -> Self {
        let mut parsers = HashMap::new();
        let mut protocols = HashMap::new();

        // Register Python parser using tree-sitter-python
        let python_lang = tree_sitter_python::LANGUAGE.into();
        parsers.insert(
            "python".to_string(),
            LanguageParser {
                language: "python".to_string(),
                tree_sitter_lang: python_lang,
            },
        );

        // Load base Python protocol
        protocols.insert(
            "python.base".to_string(),
            ProtocolSpec {
                id: "python.base".to_string(),
                theory_name: "PythonBase".to_string(),
            },
        );

        // Load Python component protocol
        protocols.insert(
            "python.component".to_string(),
            ProtocolSpec {
                id: "python.component".to_string(),
                theory_name: "PythonComponent".to_string(),
            },
        );

        Self { parsers, protocols }
    }

    /// Get a parser by language name
    pub fn get_parser(&self, language: &str) -> Option<&LanguageParser> {
        self.parsers.get(language)
    }

    /// Get the Python parser (convenience method)
    pub fn get_python_parser(&self) -> Option<&LanguageParser> {
        self.get_parser("python")
    }

    /// Get a protocol spec by ID
    pub fn get_protocol(&self, protocol_id: &str) -> Option<&ProtocolSpec> {
        self.protocols.get(protocol_id)
    }

    /// Get base Python protocol
    pub fn get_python_base_protocol(&self) -> Option<&ProtocolSpec> {
        self.get_protocol("python.base")
    }

    /// Get Python component protocol
    pub fn get_python_component_protocol(&self) -> Option<&ProtocolSpec> {
        self.get_protocol("python.component")
    }
}

/// Parse a Python file and return the AST
pub fn parse_python_file(path: &str) -> Result<ParsedPythonModule, String> {
    let source = std::fs::read_to_string(path)
        .map_err(|e| format!("Failed to read file: {}", e))?;

    parse_python_source(&source, path)
}

/// Parse Python source code using tree-sitter
pub fn parse_python_source(source: &str, filename: &str) -> Result<ParsedPythonModule, String> {
    // Create parser
    let mut parser = tree_sitter::Parser::new();
    let python_lang = tree_sitter_python::LANGUAGE.into();
    parser.set_language(&python_lang)
        .map_err(|e| format!("Failed to set language: {:?}", e))?;

    // Parse source
    let tree = parser.parse(source, None)
        .ok_or("Failed to parse Python source")?;

    let root_node = tree.root_node();
    let mut module = ParsedPythonModule {
        name: filename.to_string(),
        imports: Vec::new(),
        classes: Vec::new(),
        functions: Vec::new(),
    };

    // Extract module contents
    let mut cursor = root_node.walk();
    for child in root_node.children(&mut cursor) {
        match child.kind() {
            "import_statement" | "import_from_statement" => {
                if let Some(import_def) = parse_import(&child, source) {
                    module.imports.push(import_def);
                }
            }
            "class_definition" => {
                if let Some(class_def) = parse_class(&child, source) {
                    module.classes.push(class_def);
                }
            }
            "function_definition" => {
                if let Some(func_def) = parse_function(&child, source, false) {
                    module.functions.push(func_def);
                }
            }
            _ => {}
        }
    }

    Ok(module)
}

/// Parse an import statement
fn parse_import(node: &tree_sitter::Node, source: &str) -> Option<PythonImport> {
    if node.kind() == "import_from_statement" {
        let module = node.child_by_field_name("module_name")?
            .utf8_text(source.as_bytes()).ok()?.to_string();

        let mut names = Vec::new();
        let mut cursor = node.walk();
        for child in node.children(&mut cursor) {
            if child.kind() == "dotted_name" || child.kind() == "identifier" {
                names.push(child.utf8_text(source.as_bytes()).ok()?.to_string());
            }
        }

        Some(PythonImport::From { module, names })
    } else {
        let module = node.child(1)?
            .utf8_text(source.as_bytes()).ok()?.to_string();
        Some(PythonImport::Simple { module })
    }
}

/// Parse a class definition
fn parse_class(node: &tree_sitter::Node, source: &str) -> Option<PythonClass> {
    let name = node.child_by_field_name("name")?
        .utf8_text(source.as_bytes()).ok()?.to_string();

    let mut bases = Vec::new();
    if let Some(superclasses) = node.child_by_field_name("superclasses") {
        let mut cursor = superclasses.walk();
        for child in superclasses.children(&mut cursor) {
            if child.kind() == "identifier" || child.kind() == "type" {
                bases.push(child.utf8_text(source.as_bytes()).ok()?.to_string());
            }
        }
    }

    let mut decorators = Vec::new();
    let mut cursor = node.walk();
    for child in node.children(&mut cursor) {
        if child.kind() == "decorator" {
            if let Some(dec_id) = child.child(1) {
                decorators.push(dec_id.utf8_text(source.as_bytes()).ok()?.to_string());
            }
        }
    }

    let mut methods = Vec::new();

    if let Some(body) = node.child_by_field_name("body") {
        let mut cursor = body.walk();
        for child in body.children(&mut cursor) {
            if child.kind() == "function_definition" {
                if let Some(method) = parse_function(&child, source, true) {
                    methods.push(method);
                }
            }
        }
    }

    Some(PythonClass {
        name,
        bases,
        decorators,
        methods,
    })
}

/// Parse a function/method definition
fn parse_function(node: &tree_sitter::Node, source: &str, is_method: bool) -> Option<PythonFunction> {
    let name = node.child_by_field_name("name")?
        .utf8_text(source.as_bytes()).ok()?.to_string();

    let mut parameters = Vec::new();
    if let Some(params_node) = node.child_by_field_name("parameters") {
        let mut cursor = params_node.walk();
        for child in params_node.children(&mut cursor) {
            if child.kind() == "identifier" {
                let param_name = child.utf8_text(source.as_bytes()).ok()?.to_string();
                let is_self = param_name == "self";

                parameters.push(PythonParameter {
                    name: param_name,
                    is_self,
                });
            }
        }
    }

    Some(PythonFunction {
        name,
        parameters,
        is_method,
    })
}

/// Identify component patterns in parsed Python
pub fn identify_components(module: &ParsedPythonModule) -> Vec<ComponentInfo> {
    let mut components = Vec::new();

    for class in &module.classes {
        // Check if it's a component (inherits from Component)
        let is_component = class.bases.iter().any(|b| b == "Component");

        // Check if it's a dataclass (props or state)
        let is_dataclass = class.decorators.iter().any(|d| d == "dataclass");

        if is_component {
            let has_render = class.methods.iter().any(|m| m.name == "render");
            let has_mount = class.methods.iter().any(|m| m.name == "mount");
            let has_unmount = class.methods.iter().any(|m| m.name == "unmount");

            components.push(ComponentInfo {
                name: class.name.clone(),
                kind: ComponentKind::ComponentClass,
                has_render,
                has_mount,
                has_unmount,
                methods: class.methods.iter().map(|m| m.name.clone()).collect(),
            });
        } else if is_dataclass {
            let kind = if class.name.to_lowercase().contains("props") {
                ComponentKind::PropsClass
            } else if class.name.to_lowercase().contains("state") {
                ComponentKind::StateClass
            } else {
                ComponentKind::DataClass
            };

            components.push(ComponentInfo {
                name: class.name.clone(),
                kind,
                has_render: false,
                has_mount: false,
                has_unmount: false,
                methods: class.methods.iter().map(|m| m.name.clone()).collect(),
            });
        }
    }

    components
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ComponentInfo {
    pub name: String,
    pub kind: ComponentKind,
    pub has_render: bool,
    pub has_mount: bool,
    pub has_unmount: bool,
    pub methods: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum ComponentKind {
    ComponentClass,
    PropsClass,
    StateClass,
    DataClass,
}

fn main() {
    println!("╔════════════════════════════════════════════════════════════════╗");
    println!("║           Python Parser Demo - Using Registry                  ║");
    println!("║     (Get base Python protocol from parser registry)            ║");
    println!("╚════════════════════════════════════════════════════════════════╝");
    println!();

    // Step 1: Create parser registry
    println!("🔧 Step 1: Creating ParserRegistry...");
    let registry = ParserRegistry::new();
    println!("   ✅ Registry created");
    println!();

    // Step 2: Get Python parser from registry
    println!("🔧 Step 2: Getting Python parser from registry...");
    match registry.get_python_parser() {
        Some(parser) => {
            println!("   ✅ Got Python parser: {}", parser.language);
        }
        None => {
            eprintln!("   ❌ Python parser not found in registry");
            return;
        }
    }
    println!();

    // Step 3: Get protocols from registry
    println!("🔧 Step 3: Getting protocols from registry...");
    match registry.get_python_base_protocol() {
        Some(protocol) => {
            println!("   ✅ Base Python protocol: {}", protocol.id);
            println!("      Theory name: {}", protocol.theory_name);
        }
        None => {
            eprintln!("   ❌ Base Python protocol not found");
        }
    }

    match registry.get_python_component_protocol() {
        Some(protocol) => {
            println!("   ✅ Python component protocol: {}", protocol.id);
            println!("      Theory name: {}", protocol.theory_name);
        }
        None => {
            eprintln!("   ❌ Python component protocol not found");
        }
    }
    println!();

    // Step 4: Parse Python file
    let python_file = "protocols/example_component.py";
    println!("🔧 Step 4: Parsing Python file: {}", python_file);

    match parse_python_file(python_file) {
        Ok(module) => {
            println!("   ✅ Successfully parsed module: {}", module.name);
            println!();

            // Display parsed structure
            println!("📦 Parsed Module Structure:");
            println!("────────────────────────────────────────────────────────────────");
            println!("  Imports: {}", module.imports.len());
            for import in &module.imports {
                match import {
                    PythonImport::Simple { module } => {
                        println!("    - import {}", module);
                    }
                    PythonImport::From { module, names } => {
                        println!("    - from {} import {:?}", module, names);
                    }
                }
            }
            println!();

            println!("  Classes: {}", module.classes.len());
            for class in &module.classes {
                let is_component = class.bases.iter().any(|b| b == "Component");
                let is_dataclass = class.decorators.iter().any(|d| d == "dataclass");

                let kind = if is_component {
                    "[COMPONENT]"
                } else if is_dataclass && class.name.to_lowercase().contains("props") {
                    "[PROPS]"
                } else if is_dataclass && class.name.to_lowercase().contains("state") {
                    "[STATE]"
                } else if is_dataclass {
                    "[DATACLASS]"
                } else {
                    "[CLASS]"
                };

                println!("    - {} {} extends {:?}", kind, class.name, class.bases);

                if !class.decorators.is_empty() {
                    println!("      Decorators: {:?}", class.decorators);
                }

                if !class.methods.is_empty() {
                    println!("      Methods: {} total", class.methods.len());
                    for method in &class.methods {
                        let indicator = if method.name == "render" {
                            " [RENDER]"
                        } else if method.name == "mount" || method.name == "unmount" {
                            " [LIFECYCLE]"
                        } else if method.name.starts_with("__") {
                            ""
                        } else {
                            " [handler]"
                        };
                        println!("        - {}{}", method.name, indicator);
                    }
                }
            }
            println!();

            println!("  Functions: {}", module.functions.len());
            for func in &module.functions {
                println!("    - {} ({} params)", func.name, func.parameters.len());
            }
            println!();

            // Step 5: Identify component patterns
            println!("🔧 Step 5: Identifying component patterns...");
            let components = identify_components(&module);
            println!("   Found {} component-related classes:", components.len());

            for comp in &components {
                let kind_str = match comp.kind {
                    ComponentKind::ComponentClass => "COMPONENT",
                    ComponentKind::PropsClass => "PROPS",
                    ComponentKind::StateClass => "STATE",
                    ComponentKind::DataClass => "DATA",
                };

                println!();
                println!("   📌 {} - {}", kind_str, comp.name);
                if comp.has_render {
                    println!("      ✓ Has render method");
                }
                if comp.has_mount {
                    println!("      ✓ Has mount lifecycle");
                }
                if comp.has_unmount {
                    println!("      ✓ Has unmount lifecycle");
                }
                if !comp.methods.is_empty() {
                    println!("      Methods: {:?}", comp.methods);
                }
            }
            println!();

            // Step 6: Show protocol mapping
            println!("🔧 Step 6: Mapping to PythonComponent theory...");
            let theory_json = serde_json::json!({
                "theory": "python.component",
                "module": module.name,
                "components": components.iter().map(|c| {
                    serde_json::json!({
                        "name": c.name,
                        "kind": match c.kind {
                            ComponentKind::ComponentClass => "ComponentClass",
                            ComponentKind::PropsClass => "PropsClass",
                            ComponentKind::StateClass => "StateClass",
                            ComponentKind::DataClass => "DataClass",
                        },
                        "lifecycle": {
                            "render": c.has_render,
                            "mount": c.has_mount,
                            "unmount": c.has_unmount,
                        },
                        "methods": c.methods,
                    })
                }).collect::<Vec<_>>(),
            });

            println!("   Theory representation:");
            println!("{}", serde_json::to_string_pretty(&theory_json).unwrap());
        }
        Err(e) => {
            eprintln!("   ❌ Failed to parse: {}", e);
        }
    }

    println!();
    println!("✅ Demo complete!");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_registry_creation() {
        let registry = ParserRegistry::new();
        assert!(registry.get_parser("python").is_some());
        assert!(registry.get_python_base_protocol().is_some());
        assert!(registry.get_python_component_protocol().is_some());
    }

    #[test]
    fn test_parse_simple_function() {
        let source = r#"
def hello(name: str) -> str:
    return f"Hello, {name}!"
"#;
        let result = parse_python_source(source, "test.py");
        assert!(result.is_ok());

        let module = result.unwrap();
        assert_eq!(module.functions.len(), 1);
        assert_eq!(module.functions[0].name, "hello");
    }

    #[test]
    fn test_parse_class() {
        let source = r#"
class Counter(Component):
    def __init__(self, props):
        self.props = props

    def render(self):
        return {"type": "box"}
"#;
        let result = parse_python_source(source, "test.py");
        assert!(result.is_ok());

        let module = result.unwrap();
        assert_eq!(module.classes.len(), 1);
        assert_eq!(module.classes[0].name, "Counter");
        assert!(module.classes[0].bases.contains(&"Component".to_string()));
    }
}
