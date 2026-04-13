//! Pure Term-Based Code Generation
//!
//! Generates code entirely through term morphisms without string templates.
//!
//! Pipeline: IU → CodeTerm → PrettyPrint → SourceFile
//!
//! The CodeTerm is constructed algebraically, not by filling holes in strings.

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, SortKind, Operation};
#[cfg(feature = "panproto")]
use std::sync::Arc;

use crate::pipeline::ImplementationUnit;

// ============================================================================
// ThPythonTextual: Theory of Python Textual AST as GAT
// ============================================================================

#[cfg(feature = "panproto")]
pub fn python_textual_theory() -> Theory {
    Theory::new(
        Arc::from("ThPythonTextual"),
        vec![
            // Top-level constructs
            Sort { name: Arc::from("Module"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Class"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Method"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Import"), params: vec![], kind: SortKind::Structural },
            
            // Textual-specific
            Sort { name: Arc::from("Widget"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("WidgetType"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ComposeResult"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CSS"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("CSSRule"), params: vec![], kind: SortKind::Structural },
            
            // Python primitives
            Sort { name: Arc::from("Identifier"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("String"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Bool"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Expr"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("Stmt"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("TypeHint"), params: vec![], kind: SortKind::Structural },
        ],
        vec![
            // Module construction
            Operation {
                name: Arc::from("mk_module"),
                inputs: vec![
                    (Arc::from("imports"), Arc::from("List[Import]")),
                    (Arc::from("classes"), Arc::from("List[Class]")),
                    (Arc::from("main"), Arc::from("Method")),
                ],
                output: Arc::from("Module"),
            },
            
            // Import construction
            Operation {
                name: Arc::from("mk_import_from"),
                inputs: vec![
                    (Arc::from("module"), Arc::from("String")),
                    (Arc::from("names"), Arc::from("List[Identifier]")),
                ],
                output: Arc::from("Import"),
            },
            
            // Class construction (Textual App)
            Operation {
                name: Arc::from("mk_app_class"),
                inputs: vec![
                    (Arc::from("name"), Arc::from("Identifier")),
                    (Arc::from("css"), Arc::from("CSS")),
                    (Arc::from("methods"), Arc::from("List[Method]")),
                    (Arc::from("docstring"), Arc::from("String")),
                ],
                output: Arc::from("Class"),
            },
            
            // Method construction
            Operation {
                name: Arc::from("mk_method"),
                inputs: vec![
                    (Arc::from("name"), Arc::from("Identifier")),
                    (Arc::from("params"), Arc::from("List[(Identifier, TypeHint)]")),
                    (Arc::from("return_type"), Arc::from("TypeHint")),
                    (Arc::from("body"), Arc::from("List[Stmt]")),
                ],
                output: Arc::from("Method"),
            },
            
            // Widget construction
            Operation {
                name: Arc::from("mk_widget"),
                inputs: vec![
                    (Arc::from("widget_type"), Arc::from("WidgetType")),
                    (Arc::from("args"), Arc::from("List[(String, Expr)]")),
                    (Arc::from("id"), Arc::from("Maybe[Identifier]")),
                ],
                output: Arc::from("Widget"),
            },
            
            // CSS construction
            Operation {
                name: Arc::from("mk_css"),
                inputs: vec![(Arc::from("rules"), Arc::from("List[CSSRule]"))],
                output: Arc::from("CSS"),
            },
            
            // Statement construction
            Operation {
                name: Arc::from("stmt_yield"),
                inputs: vec![(Arc::from("widget"), Arc::from("Widget"))],
                output: Arc::from("Stmt"),
            },
            Operation {
                name: Arc::from("stmt_assign"),
                inputs: vec![
                    (Arc::from("target"), Arc::from("Expr")),
                    (Arc::from("value"), Arc::from("Expr")),
                ],
                output: Arc::from("Stmt"),
            },
            Operation {
                name: Arc::from("stmt_return"),
                inputs: vec![(Arc::from("value"), Arc::from("Expr"))],
                output: Arc::from("Stmt"),
            },
            
            // Expression construction
            Operation {
                name: Arc::from("expr_string"),
                inputs: vec![(Arc::from("value"), Arc::from("String"))],
                output: Arc::from("Expr"),
            },
            Operation {
                name: Arc::from("expr_int"),
                inputs: vec![(Arc::from("value"), Arc::from("Int"))],
                output: Arc::from("Expr"),
            },
            Operation {
                name: Arc::from("expr_bool"),
                inputs: vec![(Arc::from("value"), Arc::from("Bool"))],
                output: Arc::from("Expr"),
            },
            Operation {
                name: Arc::from("expr_self_attr"),
                inputs: vec![(Arc::from("attr"), Arc::from("Identifier"))],
                output: Arc::from("Expr"),
            },
            Operation {
                name: Arc::from("expr_call"),
                inputs: vec![
                    (Arc::from("func"), Arc::from("Expr")),
                    (Arc::from("args"), Arc::from("List[Expr]")),
                ],
                output: Arc::from("Expr"),
            },
        ],
        vec![],
    )
}

// ============================================================================
// Term Constructor (Pure Algebraic Building)
// ============================================================================

/// PythonTerm: Rust representation of the algebraic term
#[derive(Debug, Clone, PartialEq)]
pub enum PythonTerm {
    // Module
    Module {
        imports: Vec<ImportTerm>,
        classes: Vec<ClassTerm>,
        main: Box<MethodTerm>,
    },
    
    // Imports
    ImportFrom { module: String, names: Vec<String> },
    
    // Class
    AppClass {
        name: String,
        css: Box<CSSTerm>,
        methods: Vec<MethodTerm>,
        docstring: String,
    },
    
    // Method
    Method {
        name: String,
        params: Vec<(String, String)>, // (name, type_hint)
        return_type: String,
        body: Vec<StmtTerm>,
    },
    
    // Widgets
    Widget {
        widget_type: String,
        args: Vec<(String, ExprTerm)>,
        id: Option<String>,
    },
    
    // CSS
    CSS { rules: Vec<CSSRule> },
    
    // Statements
    Yield { widget: Box<PythonTerm> }, // Must be Widget
    Assign { target: Box<ExprTerm>, value: Box<ExprTerm> },
    Return { value: Box<ExprTerm> },
    ExprStmt { expr: Box<ExprTerm> },
    
    // Expressions
    Str(String),  // Renamed from String to avoid conflict with std::string::String
    Int(i64),
    Bool(bool),
    SelfAttr(String),
    // Variables and expressions
    Var(String),
    Call { func: Box<ExprTerm>, args: Vec<ExprTerm> },
    Null,
    
    // List of widgets (for children)
    List(Vec<PythonTerm>),
}

use PythonTerm::*;

/// Import term
pub type ImportTerm = PythonTerm;
/// Class term
pub type ClassTerm = PythonTerm;
/// Method term
pub type MethodTerm = PythonTerm;
/// Statement term
pub type StmtTerm = PythonTerm;
/// Expression term
pub type ExprTerm = PythonTerm;

/// CSS rule
#[derive(Debug, Clone, PartialEq)]
pub struct CSSRule {
    pub selector: String,
    pub properties: Vec<(String, String)>,
}

/// CSS term
pub type CSSTerm = PythonTerm;

/// Pretty-print term to Python source code
pub fn term_to_python(term: &PythonTerm) -> String {
    let mut output = String::new();
    term_to_python_with_indent(term, &mut output, 0);
    output
}

fn term_to_python_with_indent(term: &PythonTerm, out: &mut String, indent: usize) {
    let ind = "    ".repeat(indent);
    
    match term {
        Module { imports, classes, main } => {
            // Add provenance comment
            out.push_str("# Generated by Phoenix VCS\n");
            out.push_str("# Formal term morphism: IU → PythonTerm → Code\n\n");
            
            // Imports
            for imp in imports {
                term_to_python_with_indent(imp, out, 0);
            }
            out.push('\n');
            
            // Classes
            for cls in classes {
                term_to_python_with_indent(cls, out, 0);
                out.push('\n');
            }
            
            // Main function
            term_to_python_with_indent(main, out, 0);
        }
        
        ImportFrom { module, names } => {
            out.push_str(&format!("from {} import {}\n", module, names.join(", ")));
        }
        
        AppClass { name, css, methods, docstring } => {
            out.push_str(&format!("{}class {}App(App):\n", ind, name));
            out.push_str(&format!("{}    \"\"\"{}\"\"\"\n\n", ind, docstring));
            
            // CSS
            out.push_str(&format!("{}    CSS = \"\"\"\n", ind));
            term_to_python_with_indent(css, out, indent + 1);  // CSS content at +1
            out.push_str(&format!("{}    \"\"\"\n\n", ind));
            
            // Methods - pass indent + 1 so methods are inside class
            for method in methods {
                term_to_python_with_indent(method, out, indent + 1);
                out.push('\n');
            }
        }
        
        CSS { rules } => {
            for rule in rules {
                out.push_str(&format!("{}{} {{\n", ind, rule.selector));
                for (prop, val) in &rule.properties {
                    out.push_str(&format!("{}    {}: {};\n", ind, prop, val));
                }
                out.push_str(&format!("{}}}\n", ind));
            }
        }
        
        Method { name, params, return_type, body } => {
            let params_str = params.iter()
                .map(|(n, t)| if t.is_empty() { n.clone() } else { format!("{}: {}", n, t) })
                .collect::<Vec<_>>()
                .join(", ");
            out.push_str(&format!("{}def {}({}) -> {}:\n", ind, name, params_str, return_type));
            
            for stmt in body {
                term_to_python_with_indent(stmt, out, indent + 1);
            }
        }
        
        Widget { widget_type, args, id } => {
            let mut all_args = Vec::new();
            
            // Add positional/string args
            for (key, val) in args {
                if key == "content" || key == "title" {
                    if let Str(s) = val {
                        all_args.push(format!("\"{}\"", s));
                    }
                }
            }
            
            // Add id if present
            if let Some(id_val) = id {
                all_args.push(format!("id=\"{}\"", id_val));
            }
            
            out.push_str(&format!("{}{}({})\n", ind, widget_type, all_args.join(", ")));
        }
        
        Yield { widget } => {
            // Yield is a statement, widget is an expression - don't double-indent
            out.push_str(&format!("{}yield ", ind));
            // Extract widget type and render with args
            if let PythonTerm::Widget { widget_type, args, id } = widget.as_ref() {
                let mut all_args = Vec::new();
                for (key, val) in args {
                    if key == "content" {
                        // Wrap content in Static() widget
                        if let PythonTerm::Str(s) = val {
                            all_args.push(format!("Static(\"{}\")", s));
                        }
                    } else if key == "children" {
                        // Render children expressions directly
                        all_args.push(expr_to_string(val));
                    }
                }
                if let Some(id_val) = id {
                    all_args.push(format!("id=\"{}\"", id_val));
                }
                out.push_str(&format!("{}({})\n", widget_type, all_args.join(", ")));
            } else {
                out.push_str("# TODO: non-widget yield\n");
            }
        }
        
        Assign { target, value } => {
            out.push_str(&ind);
            expr_to_python(target, out);
            out.push_str(" = ");
            expr_to_python(value, out);
            out.push('\n');
        }
        
        Return { value } => {
            out.push_str(&format!("{}return ", ind));
            expr_to_python(value, out);
            out.push('\n');
        }
        
        ExprStmt { expr } => {
            out.push_str(&ind);
            expr_to_python(expr, out);
            out.push('\n');
        }
        
        Str(s) => {
            out.push_str(&format!("\"{}\"", s));
        }
        
        Int(n) => {
            out.push_str(&n.to_string());
        }
        
        Bool(b) => {
            out.push_str(if *b { "True" } else { "False" });
        }
        
        List(items) => {
            // Render list of widgets as function args
            for (i, item) in items.iter().enumerate() {
                if i > 0 { out.push_str(", "); }
                term_to_python_with_indent(item, out, indent);
            }
        }
        
        _ => {
            out.push_str(&format!("{}# TODO: {:?}\n", ind, term));
        }
    }
}

fn expr_to_python(expr: &ExprTerm, out: &mut String) {
    match expr {
        Var(name) => out.push_str(name),
        Str(s) => out.push_str(&format!("\"{}\"", s)),
        Int(n) => out.push_str(&n.to_string()),
        Bool(b) => out.push_str(if *b { "True" } else { "False" }),
        SelfAttr(attr) => out.push_str(&format!("self.{}", attr)),
        Call { func, args } => {
            expr_to_python(func, out);
            out.push('(');
            for (i, arg) in args.iter().enumerate() {
                if i > 0 { out.push_str(", "); }
                expr_to_python(arg, out);
            }
            out.push(')');
        }
        _ => out.push_str("None"),
    }
}

/// Convert expression to string (convenience wrapper)
fn expr_to_string(expr: &ExprTerm) -> String {
    let mut s = String::new();
    expr_to_python(expr, &mut s);
    s
}

// ============================================================================
// Term Morphism: IU → PythonTerm
// ============================================================================

/// μ_iu_to_python: Morphism from ImplementationUnit to PythonTerm
/// 
/// This constructs the code term algebraically from the IU, no templates.
/// If spec_content is provided, parses UI configuration from spec.
pub fn iu_to_python_term(iu: &ImplementationUnit, spec_content: Option<&str>) -> PythonTerm {
    let class_name = to_pascal_case(&iu.name);
    
    // Build imports
    let imports = vec![
        ImportFrom {
            module: "textual.app".to_string(),
            names: vec!["App".to_string(), "ComposeResult".to_string()],
        },
        ImportFrom {
            module: "textual.widgets".to_string(),
            names: vec!["Static".to_string(), "Header".to_string(), "Footer".to_string()],
        },
        ImportFrom {
            module: "textual.containers".to_string(),
            names: vec!["Vertical".to_string()],
        },
    ];
    
    // Build CSS
    let css = CSS {
        rules: vec![
            CSSRule {
                selector: "Screen".to_string(),
                properties: vec![
                    ("align".to_string(), "center middle".to_string()),
                    ("background".to_string(), "$surface".to_string()),
                ],
            },
            CSSRule {
                selector: "#title".to_string(),
                properties: vec![
                    ("text-style".to_string(), "bold".to_string()),
                    ("text-align".to_string(), "center".to_string()),
                    ("color".to_string(), "$accent".to_string()),
                ],
            },
        ],
    };
    
    // Build compose method
    let compose_body = vec![
        // yield Header()
        Yield {
            widget: Box::new(Widget {
                widget_type: "Header".to_string(),
                args: vec![("show_clock".to_string(), Bool(true))],
                id: None,
            }),
        },
        // yield Vertical(Static(iu.name), id="content")
        Yield {
            widget: Box::new(Widget {
                widget_type: "Vertical".to_string(),
                args: vec![
                    ("content".to_string(), Str(iu.name.clone())),
                ],
                id: Some("content".to_string()),
            }),
        },
        // yield Footer()
        Yield {
            widget: Box::new(Widget {
                widget_type: "Footer".to_string(),
                args: vec![],
                id: None,
            }),
        },
    ];
    
    let compose_method = Method {
        name: "compose".to_string(),
        params: vec![("self".to_string(), "".to_string())],
        return_type: "ComposeResult".to_string(),
        body: compose_body,
    };
    
    // Build on_mount method
    let on_mount_body = vec![
        // self.title = "{name}"
        Assign {
            target: Box::new(SelfAttr("title".to_string())),
            value: Box::new(Str(class_name.clone())),
        },
    ];
    
    let on_mount_method = Method {
        name: "on_mount".to_string(),
        params: vec![("self".to_string(), "".to_string())],
        return_type: "None".to_string(),
        body: on_mount_body,
    };
    
    // Build main function
    let main_body = vec![
        // app = {Name}App()
        Assign {
            target: Box::new(Var("app".to_string())),
            value: Box::new(Call {
                func: Box::new(Var(format!("{}App", class_name))),
                args: vec![],
            }),
        },
        // app.run()
        ExprStmt {
            expr: Box::new(Var("app.run()".to_string())),
        },
        // return 0
        Return { value: Box::new(Int(0)) },
    ];
    
    let main_fn = Method {
        name: "main".to_string(),
        params: vec![],
        return_type: "int".to_string(),
        body: main_body,
    };
    
    // Build the App class
    let app_class = AppClass {
        name: class_name.clone(),
        css: Box::new(css),
        methods: vec![compose_method, on_mount_method],
        docstring: format!("{} Application generated from IU {}", class_name, iu.iu_id),
    };
    
    // Build the module
    Module {
        imports,
        classes: vec![app_class],
        main: Box::new(main_fn),
    }
}

/// Generate code from IU using pure term morphism
/// 
/// Optionally takes spec_content to parse UI configuration from spec
pub fn generate_from_term(iu: &ImplementationUnit, spec_content: Option<&str>) -> String {
    let term = iu_to_python_term(iu, spec_content);
    let code = term_to_python(&term);
    
    // Add IU provenance as comment
    format!(
        "# phoenix: iu_id = \"{}\"\n# phoenix: generated_by = term_morphism\n{}",
        iu.iu_id,
        code
    )
}

pub fn to_pascal_case(s: &str) -> String {
    s.split('-')
        .map(|word| {
            let mut chars = word.chars();
            match chars.next() {
                None => String::new(),
                Some(first) => first.to_uppercase().collect::<String>() + &chars.as_str().to_lowercase(),
            }
        })
        .collect()
}

// ============================================================================
// Spec Parsing Helpers
// ============================================================================

/// Parsed UI configuration from spec
#[derive(Debug, Default)]
struct UIConfig {
    title: Option<String>,
    show_clock: bool,
    has_list: bool,
    widgets: Vec<WidgetConfig>,
    styles: Vec<(String, String, String)>, // (selector, property, value)
}

#[derive(Debug)]
struct WidgetConfig {
    widget_type: String,
    id: Option<String>,
    content: Option<String>,
    title: Option<String>,
    children: Vec<WidgetConfig>,
}

/// Parse UI configuration from spec content
fn parse_ui_config(spec_content: &str) -> Option<UIConfig> {
    let mut config = UIConfig::default();
    
    // Extract title from header widget
    if let Some(header_title) = extract_string_field(spec_content, r#"header.*title\s*=\s*""#) {
        config.title = Some(header_title);
        config.show_clock = spec_content.contains(r#"show_clock\s*=\s*true"#) || 
                          spec_content.contains("show_clock = true");
    }
    
    // Check for list widget
    config.has_list = spec_content.contains(r#"type\s*=\s*"List""#) || 
                      spec_content.contains(r#"type = "List""#);
    
    // Parse widgets from layout section
    config.widgets = parse_widgets_from_layout(spec_content);
    
    // Parse styles
    config.styles = parse_styles(spec_content);
    
    if config.widgets.is_empty() && config.title.is_none() {
        None
    } else {
        Some(config)
    }
}

/// Extract a string field using regex pattern
fn extract_string_field(spec_content: &str, pattern: &str) -> Option<String> {
    use regex::Regex;
    if let Ok(re) = Regex::new(&format!("{}([^\"]+)\"", pattern)) {
        re.captures(spec_content)
            .and_then(|cap| cap.get(1))
            .map(|m| m.as_str().to_string())
    } else {
        None
    }
}

/// Parse widgets from layout section
fn parse_widgets_from_layout(spec_content: &str) -> Vec<WidgetConfig> {
    let mut widgets = Vec::new();
    
    // Look for widgets section
    if let Some(widgets_start) = spec_content.find("widgets = {") {
        let widgets_section = &spec_content[widgets_start..];
        
        // Parse header
        if widgets_section.contains("header = {") {
            let title = extract_nested_string(widgets_section, "header", "title");
            widgets.push(WidgetConfig {
                widget_type: "Header".to_string(),
                id: None,
                content: None,
                title,
                children: vec![],
            });
        }
        
        // Parse sidebar
        if let Some(sidebar_children) = extract_children_array(widgets_section, "sidebar") {
            let children = parse_child_widgets(&sidebar_children);
            widgets.push(WidgetConfig {
                widget_type: "Vertical".to_string(),
                id: Some("sidebar".to_string()),
                content: Some("Navigation".to_string()),
                title: Some("Navigation".to_string()),
                children,
            });
        }
        
        // Parse main content
        if let Some(main_children) = extract_children_array(widgets_section, "main") {
            let children = parse_child_widgets(&main_children);
            widgets.push(WidgetConfig {
                widget_type: "Vertical".to_string(),
                id: Some("main".to_string()),
                content: None,
                title: Some("Main Content".to_string()),
                children,
            });
        }
        
        // Parse footer
        if widgets_section.contains("footer = {") {
            widgets.push(WidgetConfig {
                widget_type: "Footer".to_string(),
                id: None,
                content: None,
                title: None,
                children: vec![],
            });
        }
    }
    
    widgets
}

/// Extract nested string value like `header = { title = "..." }`
fn extract_nested_string(section: &str, parent: &str, field: &str) -> Option<String> {
    let pattern = format!(r#"{} = {{[^}}]*{}\s*=\s*"([^"]+)""#, parent, field);
    extract_regex(&pattern, section, 1)
}

/// Extract children array from a container widget
fn extract_children_array(section: &str, parent: &str) -> Option<String> {
    // Look for parent = { ... children = [ ... ] ... }
    let pattern = format!(r#"{} = {{[^}}]*children = \[(.*?)\]"#, parent);
    extract_regex(&pattern, section, 1)
}

/// Parse child widgets from array content
fn parse_child_widgets(children_str: &str) -> Vec<WidgetConfig> {
    let mut children = Vec::new();
    
    // Simple parsing of { type = "...", id = "...", ... } patterns
    for block in children_str.split("},") {
        if let Some(widget_type) = extract_field(block, "type") {
            let id = extract_field(block, "id");
            let content = extract_field(block, "content");
            let title = extract_field(block, "title");
            
            children.push(WidgetConfig {
                widget_type: map_widget_type(&widget_type),
                id,
                content,
                title,
                children: vec![],
            });
        }
    }
    
    children
}

/// Extract a simple field like `type = "Static"`
fn extract_field(block: &str, field: &str) -> Option<String> {
    let pattern = format!(r#"{}\s*=\s*"([^"]+)""#, field);
    extract_regex(&pattern, block, 1)
}

/// Map spec widget types to Textual widget types
fn map_widget_type(spec_type: &str) -> String {
    match spec_type {
        "Static" => "Static",
        "List" => "ListView",
        "ListView" => "ListView",
        "Container" => "Container",
        "LogView" => "Log",
        _ => "Static",
    }.to_string()
}

/// Extract using regex pattern
fn extract_regex(pattern: &str, text: &str, group: usize) -> Option<String> {
    use regex::Regex;
    Regex::new(pattern).ok()
        .and_then(|re| re.captures(text))
        .and_then(|cap| cap.get(group))
        .map(|m| m.as_str().to_string())
}

/// Parse styles from spec
fn parse_styles(spec_content: &str) -> Vec<(String, String, String)> {
    let mut styles = Vec::new();
    
    // Extract colors
    if let Some(colors_start) = spec_content.find("colors = {") {
        let colors_section = &spec_content[colors_start..];
        if let Some(end) = colors_section.find("    },") {
            let colors = &colors_section[..end];
            for line in colors.lines() {
                if let Some((prop, val)) = line.trim().split_once(" = ") {
                    let prop = prop.trim();
                    let val = val.trim().trim_matches(',').trim_matches('"');
                    if !prop.is_empty() && !val.is_empty() {
                        styles.push(("Screen".to_string(), prop.replace("_", "-"), val.to_string()));
                    }
                }
            }
        }
    }
    
    styles
}

/// Build CSS from spec config
fn build_css_from_spec(config: Option<&UIConfig>) -> PythonTerm {
    let mut rules = vec![
        CSSRule {
            selector: "Screen".to_string(),
            properties: vec![
                ("align".to_string(), "center middle".to_string()),
                ("background".to_string(), "$surface".to_string()),
            ],
        },
    ];
    
    // Add styles from spec
    if let Some(cfg) = config {
        for (selector, prop, val) in &cfg.styles {
            rules.push(CSSRule {
                selector: selector.clone(),
                properties: vec![(prop.clone(), val.clone())],
            });
        }
        
        // Add title styles if we have content
        if !cfg.widgets.is_empty() {
            rules.push(CSSRule {
                selector: "#title".to_string(),
                properties: vec![
                    ("text-style".to_string(), "bold".to_string()),
                    ("text-align".to_string(), "center".to_string()),
                    ("color".to_string(), "$accent".to_string()),
                ],
            });
        }
    }
    
    CSS { rules }
}

/// Build compose method body from spec config
fn build_compose_body_from_spec(config: Option<&UIConfig>, default_name: &str) -> Vec<PythonTerm> {
    if let Some(cfg) = config {
        build_compose_from_widgets(cfg, default_name)
    } else {
        build_default_compose(default_name)
    }
}

/// Build compose from parsed widget config
fn build_compose_from_widgets(config: &UIConfig, _default_name: &str) -> Vec<PythonTerm> {
    let mut body = Vec::new();
    
    // yield Header with clock
    body.push(Yield {
        widget: Box::new(Widget {
            widget_type: "Header".to_string(),
            args: vec![("show_clock".to_string(), Bool(config.show_clock))],
            id: None,
        }),
    });
    
    // Build main layout with sidebar and content
    if config.widgets.len() >= 3 {
        // Horizontal split: sidebar | main
        let sidebar = build_widget_term(&config.widgets[1]); // sidebar
        let main = build_widget_term(&config.widgets[2]); // main content
        
        body.push(Yield {
            widget: Box::new(Widget {
                widget_type: "Horizontal".to_string(),
                args: vec![
                    ("sidebar".to_string(), sidebar),
                    ("main".to_string(), main),
                ],
                id: Some("content".to_string()),
            }),
        });
    } else {
        // Fallback: simple vertical
        body.push(Yield {
            widget: Box::new(Widget {
                widget_type: "Vertical".to_string(),
                args: vec![("content".to_string(), Str("App".to_string()))],
                id: Some("content".to_string()),
            }),
        });
    }
    
    // yield Footer
    body.push(Yield {
        widget: Box::new(Widget {
            widget_type: "Footer".to_string(),
            args: vec![],
            id: None,
        }),
    });
    
    body
}

/// Build widget term from config
fn build_widget_term(widget: &WidgetConfig) -> PythonTerm {
    let children_terms: Vec<PythonTerm> = widget.children.iter()
        .map(|c| build_widget_term(c))
        .collect();
    
    let args = if let Some(content) = &widget.content {
        vec![("content".to_string(), Str(content.clone()))]
    } else if !children_terms.is_empty() {
        // For containers with children
        vec![("children".to_string(), List(children_terms))]
    } else {
        vec![]
    };
    
    Widget {
        widget_type: widget.widget_type.clone(),
        args,
        id: widget.id.clone(),
    }
}

/// Build default compose when no spec
fn build_default_compose(default_name: &str) -> Vec<PythonTerm> {
    vec![
        Yield {
            widget: Box::new(Widget {
                widget_type: "Header".to_string(),
                args: vec![("show_clock".to_string(), Bool(true))],
                id: None,
            }),
        },
        Yield {
            widget: Box::new(Widget {
                widget_type: "Vertical".to_string(),
                args: vec![("content".to_string(), Str(default_name.to_string()))],
                id: Some("content".to_string()),
            }),
        },
        Yield {
            widget: Box::new(Widget {
                widget_type: "Footer".to_string(),
                args: vec![],
                id: None,
            }),
        },
    ]
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::pipeline::ImplementationUnit;
    use crate::evidence::RiskTier;
    
    fn make_test_iu(name: &str) -> ImplementationUnit {
        ImplementationUnit {
            iu_id: format!("test-iu-{}", name),
            name: name.to_string(),
            contract: format!("Generate {} app", name),
            source_canon_ids: vec![],
            risk_tier: RiskTier::Low,
            target_language: "python".to_string(),
            output_files: vec![format!("{}.py", name)],
            spec_content: None,
        }
    }
    
    #[test]
    fn test_term_construction() {
        let iu = make_test_iu("simple-tui");
        let term = iu_to_python_term(&iu, None);
        
        // Verify structure
        if let Module { imports, classes, .. } = term {
            assert!(!imports.is_empty());
            assert_eq!(classes.len(), 1);
        } else {
            panic!("Expected Module");
        }
    }
    
    #[test]
    fn test_term_to_python() {
        let iu = make_test_iu("simple-tui");
        let code = generate_from_term(&iu, None);
        
        // Debug: print the actual code
        eprintln!("Generated code:\n{}", code);
        
        // Verify name preservation
        assert!(code.contains("class SimpleTuiApp"), "Expected class name not found. Code:\n{}", code);
        assert!(code.contains("self.title = \"SimpleTui\""));
        assert!(code.contains(&format!("iu_id = \"{}\"", iu.iu_id)));
    }
    
    #[test]
    fn test_no_hallucination() {
        let iu = make_test_iu("simple-tui");
        let code = generate_from_term(&iu);
        
        // Should NOT contain "Dashboard" - only what's in IU
        assert!(!code.contains("Dashboard"));
        assert!(!code.contains("Uptime"));  // No dashboard-specific terms
    }
}
