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
            // Render the widget inline
            render_widget_inline(widget.as_ref(), out);
            out.push('\n');
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

/// Render a widget inline (for Yield statements)
fn render_widget_inline(widget: &PythonTerm, out: &mut String) {
    match widget {
        Widget { widget_type, args, id } => {
            out.push_str(widget_type);
            out.push('(');
            
            let mut arg_strings = Vec::new();
            
            // Process children first (they become positional args)
            for (key, val) in args {
                if key == "children" {
                    if let List(children) = val {
                        for child in children {
                            let mut child_str = String::new();
                            render_widget_inline(child, &mut child_str);
                            arg_strings.push(child_str);
                        }
                    }
                } else if key == "content" {
                    if let Str(s) = val {
                        // For Static widgets, content becomes the text
                        if widget_type == "Static" || widget_type == "Label" {
                            arg_strings.push(format!("\"{}\"", s));
                        } else {
                            arg_strings.push(format!("Static(\"{}\")", s));
                        }
                    }
                }
            }
            
            // Add id if present
            if let Some(id_val) = id {
                arg_strings.push(format!("id=\"{}\"", id_val));
            }
            
            out.push_str(&arg_strings.join(", "));
            out.push(')');
        }
        Str(s) => out.push_str(&format!("\"{}\"", s)),
        Var(name) => out.push_str(name),
        _ => out.push_str("None"),
    }
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
    
    // Parse UI configuration from spec if available
    let ui_config = spec_content.and_then(|s| parse_ui_config(s));
    
    // Build imports based on spec
    let mut imports = vec![
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
            names: vec!["Vertical".to_string(), "Horizontal".to_string()],
        },
    ];
    
    // Detect needed widget types from config (including nested children)
    if let Some(ref cfg) = ui_config {
        let mut extra_widgets: Vec<String> = vec![];
        
        // Recursively collect all widget types (including nested children)
        fn collect_types(widget: &crate::pipeline::widget_config::WidgetConfig, types: &mut Vec<String>) {
            types.push(widget.widget_type.clone());
            // ListView with items needs Label for rendering
            if widget.widget_type == "ListView" && widget.props.iter().any(|(k, _)| k == "items") {
                types.push("Label".to_string());
            }
            for child in &widget.children {
                collect_types(child, types);
            }
        }
        
        let mut all_types = vec![];
        for widget in &cfg.widgets {
            collect_types(widget, &mut all_types);
        }
        
        for wtype in all_types {
            let needed = match wtype.as_str() {
                "ListView" => vec!["ListView", "ListItem"],
                "Log" => vec!["Log"],
                "Label" => vec!["Label"],
                _ => vec![],
            };
            for w in needed {
                if !extra_widgets.contains(&w.to_string()) {
                    extra_widgets.push(w.to_string());
                }
            }
        }
        
        if !extra_widgets.is_empty() {
            imports.push(ImportFrom {
                module: "textual.widgets".to_string(),
                names: extra_widgets,
            });
        }
    }
    
    // Build CSS from spec
    let css = build_css_from_spec(ui_config.as_ref());
    
    // Build compose method from spec
    let compose_body = build_compose_body_from_spec(ui_config.as_ref(), &iu.name);
    
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

use crate::pipeline::term_codegen_parsing::{parse_ui_config, UIConfig, WidgetConfig};

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
    
    // Find and yield Header widget (first widget or look for type="Header")
    if let Some(header) = config.widgets.iter().find(|w| w.widget_type == "Header") {
        body.push(Yield {
            widget: Box::new(build_widget_term(header)),
        });
    } else {
        // Default header
        let header_title = config.title.clone().unwrap_or_else(|| "App".to_string());
        body.push(Yield {
            widget: Box::new(Widget {
                widget_type: "Header".to_string(),
                args: vec![
                    ("content".to_string(), Str(header_title)),
                    ("show_clock".to_string(), Bool(config.show_clock)),
                ],
                id: None,
            }),
        });
    }
    
    // Build main layout with sidebar and content in a Horizontal split
    if config.widgets.len() >= 3 {
        // Horizontal split: sidebar | main  
        let sidebar_term = build_widget_term(&config.widgets[1]); // sidebar
        let main_term = build_widget_term(&config.widgets[2]); // main content
        
        body.push(Yield {
            widget: Box::new(Widget {
                widget_type: "Horizontal".to_string(),
                args: vec![
                    ("children".to_string(), List(vec![sidebar_term, main_term])),
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
    
    // Find and yield Footer widget (last widget or look for type="Footer")
    if let Some(footer) = config.widgets.iter().find(|w| w.widget_type == "Footer") {
        body.push(Yield {
            widget: Box::new(build_widget_term(footer)),
        });
    } else {
        // Default footer
        body.push(Yield {
            widget: Box::new(Widget {
                widget_type: "Footer".to_string(),
                args: vec![],
                id: None,
            }),
        });
    }
    
    body
}

/// Build widget term from config
fn build_widget_term(widget: &WidgetConfig) -> PythonTerm {
    let children_terms: Vec<PythonTerm> = widget.children.iter()
        .map(|c| build_widget_term(c))
        .collect();
    
    // Build args based on widget type
    let mut args: Vec<(String, ExprTerm)> = vec![];
    
    match widget.widget_type.as_str() {
        "Header" => {
            // Header: title (from widget.title), show_clock (from props)
            if let Some(ref title) = widget.title {
                args.push(("content".to_string(), Str(title.clone())));
            }
            if widget.props.iter().any(|(k, _)| k == "show_clock") {
                args.push(("show_clock".to_string(), Bool(true)));
            }
        }
        "ListView" => {
            // ListView: create ListItem(Label) children from items prop
            if let Some((_, items_str)) = widget.props.iter().find(|(k, _)| k == "items") {
                // Parse items like: ["Home", "Settings", "Logs"]
                let items: Vec<_> = items_str
                    .trim_matches(|c| c == '[' || c == ']')
                    .split(',')
                    .filter(|s| !s.trim().is_empty())
                    .map(|s| {
                        let label = s.trim().trim_matches('"').to_string();
                        // Create ListItem containing Label for each item
                        Widget {
                            widget_type: "ListItem".to_string(),
                            args: vec![("children".to_string(), List(vec![
                                Widget {
                                    widget_type: "Label".to_string(),
                                    args: vec![("content".to_string(), Str(label))],
                                    id: None,
                                }
                            ]))],
                            id: None,
                        }
                    })
                    .collect();
                if !items.is_empty() {
                    args.push(("children".to_string(), List(items)));
                }
            } else if !children_terms.is_empty() {
                args.push(("children".to_string(), List(children_terms)));
            }
        }
        "Vertical" | "Horizontal" => {
            // Containers: title if present, then children
            if let Some(ref title) = widget.title {
                args.push(("content".to_string(), Str(title.clone())));
            }
            if !children_terms.is_empty() {
                args.push(("children".to_string(), List(children_terms)));
            }
        }
        _ => {
            // Default: content or children
            if let Some(ref content) = widget.content {
                args.push(("content".to_string(), Str(content.clone())));
            } else if !children_terms.is_empty() {
                args.push(("children".to_string(), List(children_terms)));
            }
        }
    }
    
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
        let code = generate_from_term(&iu, None);
        
        // Should NOT contain "Dashboard" - only what's in IU
        assert!(!code.contains("Dashboard"));
        assert!(!code.contains("Uptime"));  // No dashboard-specific terms
    }
    
    #[test]
    fn test_widget_generation_from_spec() {
        let iu = make_test_iu("spec-tui");
        let spec = r#"{
            name = "test-app",
            ui_config = {
                layout = {
                    widgets = {
                        header = { type = "Header", title = "My App" },
                        sidebar = { type = "Vertical", title = "Sidebar" },
                        main = { type = "Static", title = "Main Content" },
                    },
                },
            },
        }"#;
        
        let code = generate_from_term(&iu, Some(spec));
        
        // Debug: print actual code
        eprintln!("Generated code from spec:\n{}", code);
        
        // Verify widgets from spec appear in code
        assert!(code.contains("Header"), "Should contain Header widget");
        assert!(code.contains("My App"), "Should contain header title from spec");
        assert!(code.contains("Vertical"), "Should contain Vertical container from sidebar widget");
        assert!(code.contains("Horizontal"), "Should contain Horizontal for sidebar|main split");
        assert!(code.contains("id=\"header\""), "Should contain header widget with ID");
        assert!(code.contains("id=\"sidebar\""), "Should contain sidebar widget with ID");
        assert!(code.contains("id=\"main\""), "Should contain main widget with ID");
        
        // Verify provenance marker
        assert!(code.contains("# Generated by Phoenix"), "Should contain provenance marker");
        assert!(code.contains("iu_id = \"test-iu-spec-tui\""), "Should preserve IU ID");
    }
}
