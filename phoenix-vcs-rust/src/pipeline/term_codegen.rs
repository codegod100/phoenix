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
// ThPythonTextual: Theory of Python Textual code generation
// 
// This is the single sort of ThSpec, loaded from spec.ncl.
// It contains sub-theories as sorts that generate different artifacts,
// plus a composed sort that integrates them into a cohesive application.
//
// Sorts (sub-theories):
//   - ThPyproject: pyproject.toml generation
//   - ThNix: flake.nix generation  
//   - ThApp: app.py generation (main application)
//   - ThCSS: styles.css generation
//   - ThREADME: README.md generation
//   - ThIntegratedApp: Composed application (colimit of sub-theories)
//
// The ThIntegratedApp sort is the colimit that ThNix uses to generate
// the complete development environment and build instructions.
// ============================================================================

#[cfg(feature = "panproto")]
pub fn python_textual_theory() -> Theory {
    Theory::new(
        Arc::from("ThPythonTextual"),
        vec![
            // Sub-theories as sorts - each generates one artifact type
            Sort { name: Arc::from("ThPyproject"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThNix"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThApp"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThCSS"), params: vec![], kind: SortKind::Structural },
            Sort { name: Arc::from("ThREADME"), params: vec![], kind: SortKind::Structural },
            // Composed sort - colimit of sub-theories into cohesive app
            Sort { name: Arc::from("ThIntegratedApp"), params: vec![], kind: SortKind::Structural },
            // Config sort (from spec.ncl ui_config)
            Sort { name: Arc::from("Config"), params: vec![], kind: SortKind::Structural },
            // Legacy sorts (to be removed)
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
            // Sub-theory generate operations (new)
            Operation {
                name: Arc::from("generate_pyproject"),
                inputs: vec![
                    (Arc::from("theory"), Arc::from("ThPyproject")),
                    (Arc::from("config"), Arc::from("Config")),
                ],
                output: Arc::from("TOML"),
            },
            Operation {
                name: Arc::from("generate_nix"),
                inputs: vec![
                    (Arc::from("theory"), Arc::from("ThNix")),
                    (Arc::from("config"), Arc::from("Config")),
                ],
                output: Arc::from("Nix"),
            },
            Operation {
                name: Arc::from("generate_app"),
                inputs: vec![
                    (Arc::from("theory"), Arc::from("ThApp")),
                    (Arc::from("config"), Arc::from("Config")),
                ],
                output: Arc::from("Python"),
            },
            Operation {
                name: Arc::from("generate_css"),
                inputs: vec![
                    (Arc::from("theory"), Arc::from("ThCSS")),
                    (Arc::from("config"), Arc::from("Config")),
                ],
                output: Arc::from("CSS"),
            },
            Operation {
                name: Arc::from("generate_readme"),
                inputs: vec![
                    (Arc::from("theory"), Arc::from("ThREADME")),
                    (Arc::from("config"), Arc::from("Config")),
                ],
                output: Arc::from("Markdown"),
            },
            
            // Composition: integrate sub-theories into cohesive application
            // This is the colimit operation that creates ThIntegratedApp
            Operation {
                name: Arc::from("compose_app"),
                inputs: vec![
                    (Arc::from("pyproject"), Arc::from("TOML")),
                    (Arc::from("app"), Arc::from("Python")),
                    (Arc::from("css"), Arc::from("CSS")),
                    (Arc::from("readme"), Arc::from("Markdown")),
                    (Arc::from("config"), Arc::from("Config")),
                ],
                output: Arc::from("ThIntegratedApp"),
            },
            
            // ThNix uses this to generate flake.nix from the integrated app
            // The integrated app provides all info needed for the dev environment
            Operation {
                name: Arc::from("generate_nix_from_app"),
                inputs: vec![
                    (Arc::from("nix_theory"), Arc::from("ThNix")),
                    (Arc::from("integrated"), Arc::from("ThIntegratedApp")),
                    (Arc::from("config"), Arc::from("Config")),
                ],
                output: Arc::from("Nix"),
            },
            
            // Module construction (legacy)
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
    
    // Comment for provenance
    Comment(String),
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
        
        Comment(text) => {
            out.push_str(&format!("{}# {}\n", ind, text));
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
                        // For Static/Label/Header/Footer, content is direct string
                        if widget_type == "Static" || widget_type == "Label" || widget_type == "Header" || widget_type == "Footer" {
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
/// If spec_content is provided, parses directly from NCL spec.
pub fn iu_to_python_term(iu: &ImplementationUnit, spec_content: Option<&str>) -> PythonTerm {
    let class_name = to_pascal_case(&iu.name);
    
    // Parse directly from NCL spec if available
    let ncl_content = spec_content.unwrap_or("");
    let widgets = extract_widgets_from_ncl(ncl_content);
    let title = extract_title_from_ncl(ncl_content);
    let layout = extract_layout_from_ncl(ncl_content);
    
    // Build imports based on detected widgets
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
    
    // Detect needed widget types from widgets
    let mut extra_widgets: Vec<String> = vec![];
    for widget in &widgets {
        match widget.widget_type.as_str() {
            "ListView" => {
                if !extra_widgets.contains(&"ListView".to_string()) {
                    extra_widgets.push("ListView".to_string());
                    extra_widgets.push("ListItem".to_string());
                }
            }
            "Log" | "LogView" => {
                if !extra_widgets.contains(&"Log".to_string()) {
                    extra_widgets.push("Log".to_string());
                }
            }
            _ => {}
        }
    }
    
    if !extra_widgets.is_empty() {
        imports.push(ImportFrom {
            module: "textual.widgets".to_string(),
            names: extra_widgets,
        });
    }
    
    // Build CSS from layout
    let css = build_css_from_layout(&layout);
    
    // Build compose method from widgets
    let compose_body = build_compose_from_widgets(&widgets);
    
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

/// Generate code directly from NCL spec content
/// 
/// Pure direct pipeline: NCL spec → Python code (no intermediate IR)
/// Uses tree-sitter to extract widgets and generate code in one pass.
pub fn generate_from_ncl(ncl_content: &str, _target_lang: &str) -> String {
    // Parse and generate in one pass - no UIConfig intermediate
    let term = parse_ncl_to_python_term(ncl_content);
    let code = term_to_python(&term);
    
    // Add provenance
    format!(
        "# phoenix: generated_by = term_morphism (spec→code)\n# Direct: NCL → ThPythonTextual → Python\n{}",
        code
    )
}

/// OBSOLETE: generate_from_ui_config removed - use direct NCL→code pipeline
#[deprecated(since = "2.0.0", note = "Use generate_from_ncl instead")]
pub fn generate_from_ui_config(_ui_config: &crate::pipeline::widget_config::UIConfig, _target_lang: &str) -> String {
    panic!("generate_from_ui_config is obsolete - use generate_from_ncl")
}

/// OBSOLETE: ui_config_to_python_term removed - use direct NCL→code pipeline
#[deprecated(since = "2.0.0", note = "Use parse_ncl_to_python_term instead")]
fn ui_config_to_python_term(_ui_config: &crate::pipeline::widget_config::UIConfig) -> PythonTerm {
    panic!("ui_config_to_python_term is obsolete")
}

/// Parse NCL spec directly to PythonTerm (no intermediate UIConfig)
/// 
/// Direct pipeline: NCL → ThPythonTextual → PythonTerm
fn parse_ncl_to_python_term(ncl_content: &str) -> PythonTerm {
    // Parse NCL and extract widgets directly
    let widgets = extract_widgets_from_ncl(ncl_content);
    let title = extract_title_from_ncl(ncl_content);
    let layout = extract_layout_from_ncl(ncl_content);
    
    // Build imports based on widgets found
    let mut imports: Vec<ImportTerm> = vec![
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
    
    // Check for ListView
    let has_listview = widgets.iter().any(|w| w.widget_type == "ListView");
    if has_listview {
        imports.push(ImportFrom {
            module: "textual.widgets".to_string(),
            names: vec!["ListView".to_string(), "ListItem".to_string(), "Label".to_string()],
        });
    }
    
    // Check for Log
    let has_log = widgets.iter().any(|w| w.widget_type == "LogView" || w.widget_type == "Log");
    if has_log {
        imports.push(ImportFrom {
            module: "textual.widgets".to_string(),
            names: vec!["Log".to_string()],
        });
    }
    
    // Build CSS from layout
    let css = build_css_from_layout(&layout);
    
    // Build compose method from widgets
    let compose_body = build_compose_from_widgets(&widgets);
    
    let compose_method = Method {
        name: "compose".to_string(),
        params: vec![("self".to_string(), "".to_string())],
        return_type: "ComposeResult".to_string(),
        body: compose_body,
    };
    
    let on_mount_body: Vec<StmtTerm> = vec![
        Assign {
            target: Box::new(SelfAttr("title".to_string())),
            value: Box::new(Str(title.unwrap_or_else(|| "App".to_string()))),
        },
    ];
    
    let on_mount_method = Method {
        name: "on_mount".to_string(),
        params: vec![("self".to_string(), "".to_string())],
        return_type: "None".to_string(),
        body: on_mount_body,
    };
    
    let main_body: Vec<StmtTerm> = vec![
        Assign {
            target: Box::new(Var("app".to_string())),
            value: Box::new(Call {
                func: Box::new(Var("App".to_string())),
                args: vec![],
            }),
        },
        ExprStmt { expr: Box::new(Call {
            func: Box::new(Var("app.run".to_string())),
            args: vec![],
        }) },
        Return { value: Box::new(Int(0)) },
    ];
    
    let main_fn = Method {
        name: "main".to_string(),
        params: vec![],
        return_type: "int".to_string(),
        body: main_body,
    };
    
    let app_class = AppClass {
        name: "App".to_string(),
        css: Box::new(css),
        methods: vec![compose_method, on_mount_method],
        docstring: "Generated from NCL spec via ThPythonTextual".to_string(),
    };
    
    PythonTerm::Module {
        imports,
        classes: vec![app_class],
        main: Box::new(main_fn),
    }
}

/// Simple widget representation for direct parsing
#[derive(Debug, Clone)]
pub struct WidgetData {
    pub widget_type: String,
    pub id: Option<String>,
    pub content: Option<String>,
    pub title: Option<String>,
    pub children: Vec<WidgetData>,
    pub props: Vec<(String, String)>,
}

/// Simple layout representation
#[derive(Debug, Clone, Default)]
pub struct LayoutData {
    pub layout_type: Option<String>,
    pub grid_columns: Option<i32>,
    pub grid_rows: Option<String>,
    pub grid_gap: Option<i32>,
    pub styles: Vec<(String, String, String)>, // (selector, property, value)
}

/// Extract widgets directly from NCL (no UIConfig intermediate)
fn extract_widgets_from_ncl(ncl_content: &str) -> Vec<WidgetData> {
    // Use the ncl_parse module to extract widgets
    crate::ncl_parse::extract_widgets_direct(ncl_content)
}

/// Extract title from NCL
fn extract_title_from_ncl(ncl_content: &str) -> Option<String> {
    crate::ncl_parse::extract_title_direct(ncl_content)
}

/// Extract layout config from NCL
fn extract_layout_from_ncl(ncl_content: &str) -> LayoutData {
    crate::ncl_parse::extract_layout_direct(ncl_content)
}

/// Build CSS from layout data
fn build_css_from_layout(layout: &LayoutData) -> PythonTerm {
    let mut css_rules: Vec<CSSRule> = vec![];
    
    // Grid layout CSS
    if let Some(ref layout_type) = layout.layout_type {
        if layout_type == "grid" {
            let cols = layout.grid_columns.unwrap_or(1);
            let rows = layout.grid_rows.clone().unwrap_or_else(|| "auto".to_string());
            let gap = layout.grid_gap.unwrap_or(1);
            
            css_rules.push(CSSRule {
                selector: "Screen".to_string(),
                properties: vec![
                    ("layout".to_string(), "grid".to_string()),
                    ("grid-template-columns".to_string(), format!("repeat({}, 1fr)", cols)),
                    ("grid-template-rows".to_string(), rows),
                    ("grid-gutter".to_string(), gap.to_string()),
                ],
            });
        }
    }
    
    // Styles from layout
    for (selector, prop, val) in &layout.styles {
        css_rules.push(CSSRule {
            selector: selector.clone(),
            properties: vec![(prop.clone(), val.clone())],
        });
    }
    
    // Default styles
    css_rules.push(CSSRule {
        selector: "Screen".to_string(),
        properties: vec![
            ("align".to_string(), "center middle".to_string()),
            ("background".to_string(), "$surface".to_string()),
        ],
    });
    
    PythonTerm::CSS { rules: css_rules }
}

/// Build compose method from widget data
fn build_compose_from_widgets(widgets: &[WidgetData]) -> Vec<StmtTerm> {
    let mut yields: Vec<StmtTerm> = vec![];
    
    for widget in widgets {
        let widget_term = widget_data_to_term(widget);
        yields.push(Yield { 
            widget: Box::new(widget_term) 
        });
    }
    
    if yields.is_empty() {
        // Default fallback
        yields = vec![
            Yield { widget: Box::new(Widget {
                widget_type: "Header".to_string(),
                args: vec![],
                id: None,
            })},
            Yield { widget: Box::new(Widget {
                widget_type: "Static".to_string(),
                args: vec![("content".to_string(), Str("Generated App".to_string()))],
                id: None,
            })},
            Yield { widget: Box::new(Widget {
                widget_type: "Footer".to_string(),
                args: vec![],
                id: None,
            })},
        ];
    }
    
    yields
}

/// Convert WidgetData to PythonTerm
fn widget_data_to_term(widget: &WidgetData) -> PythonTerm {
    let mut args: Vec<(String, ExprTerm)> = vec![];
    
    // Content or title
    if let Some(ref content) = widget.content {
        args.push(("content".to_string(), Str(content.clone())));
    } else if let Some(ref title) = widget.title {
        args.push(("content".to_string(), Str(title.clone())));
    }
    
    // Properties
    for (key, val) in &widget.props {
        if key == "show_clock" {
            args.push((key.clone(), Bool(val == "true")));
        } else if key == "max_lines" {
            if let Ok(n) = val.parse::<i64>() {
                args.push((key.clone(), Int(n)));
            }
        } else {
            args.push((key.clone(), Str(val.clone())));
        }
    }
    
    // Children (recursive)
    if !widget.children.is_empty() {
        let children: Vec<PythonTerm> = widget.children.iter()
            .map(|c| widget_data_to_term(c))
            .collect();
        args.push(("children".to_string(), List(children)));
    }
    
    PythonTerm::Widget {
        widget_type: widget.widget_type.clone(),
        args,
        id: widget.id.clone(),
    }
}

/// OBSOLETE: build_css_from_ui_config removed - use build_css_from_layout
#[deprecated(since = "2.0.0", note = "Use build_css_from_layout")]
fn build_css_from_ui_config(_ui_config: &crate::pipeline::widget_config::UIConfig) -> PythonTerm {
    panic!("build_css_from_ui_config is obsolete")
}

/// OBSOLETE: build_compose_from_ui_config removed - use build_compose_from_widgets
#[deprecated(since = "2.0.0", note = "Use build_compose_from_widgets")]
fn build_compose_from_ui_config(_ui_config: &crate::pipeline::widget_config::UIConfig) -> Vec<StmtTerm> {
    panic!("build_compose_from_ui_config is obsolete")
}

/// OBSOLETE: widget_to_term removed - use widget_data_to_term
#[deprecated(since = "2.0.0", note = "Use widget_data_to_term")]
fn widget_to_term(_widget: &crate::pipeline::widget_config::WidgetConfig) -> PythonTerm {
    panic!("widget_to_term is obsolete")
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
// Theory-Driven Code Generation: ThSpec → ThPythonTextual
// ============================================================================

#[cfg(feature = "panproto")]
use serde_json::Value;

/// Generate Python code directly from a Theory + ui_config
/// 
/// ThSpec (the theory structure) defines the sorts and operations
/// ui_config (the instance) provides concrete values for generation
#[cfg(feature = "panproto")]
pub fn generate_from_theory(
    theory: &Theory,
    ui_config: &Value,
    app_name: &str,
) -> String {
    // Extract sorts that map to widget types (structural sorts become widgets)
    let widget_sorts: Vec<&str> = theory.sorts.iter()
        .filter(|s| matches!(s.kind, SortKind::Structural))
        .map(|s| s.name.as_ref())
        .filter(|name| is_widget_sort(name))  // Header, Sidebar, Footer, etc.
        .collect();
    
    // Extract operations that create widgets
    let widget_ops: Vec<&Operation> = theory.ops.iter()
        .filter(|op| widget_sorts.contains(&op.output.as_ref()))
        .collect();
    
    // Build imports based on widget sorts
    let imports = build_imports_from_sorts(&widget_sorts);
    
    // Build CSS from theory sorts + ui_config styles
    let css = build_css_from_theory(theory, ui_config);
    
    // Build compose from theory operations applied to ui_config widgets
    let compose_body = build_compose_from_theory_ops(theory, ui_config, &widget_ops);
    
    // Build class name from app_name
    let class_name = to_pascal_case(app_name);
    
    // Construct the complete module
    let compose_method = Method {
        name: "compose".to_string(),
        params: vec![("self".to_string(), "".to_string())],
        return_type: "ComposeResult".to_string(),
        body: compose_body,
    };
    
    let on_mount_body = vec![
        Assign {
            target: Box::new(SelfAttr("title".to_string())),
            value: Box::new(Str(extract_title_from_config(ui_config).unwrap_or_else(|| class_name.clone()))),
        },
    ];
    
    let on_mount_method = Method {
        name: "on_mount".to_string(),
        params: vec![("self".to_string(), "".to_string())],
        return_type: "None".to_string(),
        body: on_mount_body,
    };
    
    let main_body: Vec<PythonTerm> = vec![
        Comment(format!("# Generated by Phoenix from theory: {}", theory.name)),
        Comment(format!("# IU: {}", app_name)),
        Assign {
            target: Box::new(Var("app".to_string())),
            value: Box::new(Call {
                func: Box::new(Var(class_name.clone())),
                args: vec![],
            }),
        },
        ExprStmt { expr: Box::new(Call {
            func: Box::new(Var("app.run".to_string())),
            args: vec![],
        }) },
        Return { value: Box::new(Int(0)) },
    ];
    
    let main_fn = Method {
        name: "main".to_string(),
        params: vec![],
        return_type: "int".to_string(),
        body: main_body,
    };
    
    let app_class = AppClass {
        name: class_name,
        css: Box::new(css),
        methods: vec![compose_method, on_mount_method],
        docstring: format!("Generated from theory {} via ThPythonTextual", theory.name),
    };
    
    let module = PythonTerm::Module {
        imports,
        classes: vec![app_class],
        main: Box::new(main_fn),
    };
    
    term_to_python(&module)
}

/// Check if a sort name represents a widget type
fn is_widget_sort(name: &str) -> bool {
    matches!(name, "Header" | "Footer" | "Sidebar" | "MainContent" | 
                  "ListView" | "Log" | "Static" | "Container" | "Widget")
}

/// Build imports from theory sorts
fn build_imports_from_sorts(sorts: &[&str]) -> Vec<ImportTerm> {
    let mut imports = vec![
        ImportFrom {
            module: "textual.app".to_string(),
            names: vec!["App".to_string(), "ComposeResult".to_string()],
        },
        ImportFrom {
            module: "textual.containers".to_string(),
            names: vec!["Vertical".to_string(), "Horizontal".to_string()],
        },
    ];
    
    // Widget imports based on sorts
    let mut widget_names = vec!["Static".to_string()];
    
    for sort in sorts {
        match *sort {
            "Header" => widget_names.push("Header".to_string()),
            "Footer" => widget_names.push("Footer".to_string()),
            "Sidebar" | "MainContent" | "Container" => {
                // Containers don't need extra imports
            }
            "ListView" => {
                widget_names.push("ListView".to_string());
                widget_names.push("ListItem".to_string());
            }
            "Log" => widget_names.push("Log".to_string()),
            _ => {}
        }
    }
    
    imports.push(ImportFrom {
        module: "textual.widgets".to_string(),
        names: widget_names,
    });
    
    imports
}

/// Build CSS from theory + ui_config styles
fn build_css_from_theory(_theory: &Theory, ui_config: &Value) -> PythonTerm {
    let mut rules = vec![
        CSSRule {
            selector: "Screen".to_string(),
            properties: vec![
                ("align".to_string(), "center middle".to_string()),
                ("background".to_string(), "$surface".to_string()),
            ],
        },
    ];
    
    // Add styles from ui_config if present
    if let Some(styles) = ui_config.get("styles").and_then(|s| s.as_object()) {
        for (key, val) in styles {
            if let Some(val_str) = val.as_str() {
                // Map style keys to CSS rules
                let (selector, prop) = map_style_to_css(key);
                rules.push(CSSRule {
                    selector: selector.to_string(),
                    properties: vec![(prop.to_string(), val_str.to_string())],
                });
            }
        }
    }
    
    PythonTerm::CSS { rules }
}

/// Map style key from ui_config to CSS selector/property
fn map_style_to_css(key: &str) -> (&str, &str) {
    match key {
        "primary_background" => ("Screen", "background"),
        "accent_color" => ("#header", "tint"),
        "header_style" => ("#header", "text-style"),
        _ => ("*", "color"),
    }
}

/// Extract title from ui_config
fn extract_title_from_config(ui_config: &Value) -> Option<String> {
    ui_config.get("name")
        .and_then(|n| n.as_str().map(|s| s.to_string()))
        .or_else(|| {
            ui_config.get("layout")
                .and_then(|l| l.get("widgets"))
                .and_then(|w| w.as_array())
                .and_then(|arr| arr.first())
                .and_then(|first| first.get("title"))
                .and_then(|t| t.as_str().map(|s| s.to_string()))
        })
}

/// Build compose body from theory operations + ui_config
fn build_compose_from_theory_ops(
    theory: &Theory,
    ui_config: &Value,
    _widget_ops: &[&Operation],
) -> Vec<StmtTerm> {
    let mut body: Vec<StmtTerm> = vec![];
    
    // Get widgets from ui_config.layout.widgets
    if let Some(widgets) = ui_config
        .get("layout")
        .and_then(|l| l.get("widgets"))
        .and_then(|w| w.as_array())
    {
        // Map each widget to a theory operation application
        for (idx, widget_val) in widgets.iter().enumerate() {
            if let Some(widget_type) = widget_val.get("type").and_then(|t| t.as_str()) {
                // Find matching sort in theory
                let has_sort = theory.sorts.iter()
                    .any(|s| s.name.as_ref() == widget_type);
                
                if has_sort {
                    // Generate yield with provenance comment
                    let id_owned = widget_val.get("id")
                        .and_then(|i| i.as_str())
                        .map(|s| s.to_string())
                        .unwrap_or_else(|| format!("widget_{}", idx));
                    
                    let title = widget_val.get("title")
                        .and_then(|t| t.as_str())
                        .unwrap_or("");
                    
                    body.push(StmtTerm::Comment(format!(
                        "Spec: {} = {{ type = \"{}\"{}}}" ,
                        id_owned,
                        widget_type,
                        if title.is_empty() { "".to_string() } else { format!(", title = \"{}\"", title) }
                    )));
                    
                    // Build widget term from ui_config values
                    let widget_term = build_widget_term_from_json(widget_val);
                    body.push(StmtTerm::Yield {
                        widget: Box::new(widget_term),
                    });
                }
            }
        }
    }
    
    // If no widgets found, use theory operations as fallback
    if body.is_empty() {
        body = build_default_compose_from_theory(theory);
    }
    
    body
}

/// Build widget term from JSON ui_config
fn build_widget_term_from_json(widget: &Value) -> PythonTerm {
    let widget_type = widget.get("type")
        .and_then(|t| t.as_str())
        .unwrap_or("Static")
        .to_string();
    
    let id = widget.get("id").and_then(|i| i.as_str()).map(|s| s.to_string());
    
    let mut args: Vec<(String, ExprTerm)> = vec![];
    
    // Extract content/title
    if let Some(content) = widget.get("content").and_then(|c| c.as_str()) {
        args.push(("content".to_string(), ExprTerm::Str(content.to_string())));
    } else if let Some(title) = widget.get("title").and_then(|t| t.as_str()) {
        args.push(("content".to_string(), ExprTerm::Str(title.to_string())));
    }
    
    // Extract boolean props
    if let Some(true) = widget.get("show_clock").and_then(|s| s.as_bool()) {
        args.push(("show_clock".to_string(), ExprTerm::Bool(true)));
    }
    
    // Extract children recursively
    if let Some(children) = widget.get("children").and_then(|c| c.as_array()) {
        let child_terms: Vec<PythonTerm> = children.iter()
            .map(|c| build_widget_term_from_json(c))
            .collect();
        if !child_terms.is_empty() {
            args.push(("children".to_string(), ExprTerm::List(child_terms)));
        }
    }
    
    // Extract items for ListView
    if widget_type == "ListView" {
        if let Some(items) = widget.get("items").and_then(|i| i.as_array()) {
            let list_items: Vec<PythonTerm> = items.iter()
                .filter_map(|item| item.as_str())
                .map(|label| PythonTerm::Widget {
                    widget_type: "ListItem".to_string(),
                    args: vec![("children".to_string(), ExprTerm::List(vec![
                        PythonTerm::Widget {
                            widget_type: "Label".to_string(),
                            args: vec![("content".to_string(), ExprTerm::Str(label.to_string()))],
                            id: None,
                        }
                    ]))],
                    id: None,
                })
                .collect();
            args.push(("children".to_string(), ExprTerm::List(list_items)));
        }
    }
    
    PythonTerm::Widget {
        widget_type,
        args,
        id,
    }
}

/// Default compose when theory provides no specific widgets
fn build_default_compose_from_theory(theory: &Theory) -> Vec<StmtTerm> {
    let mut body = vec![];
    
    // Use theory sorts to generate default widgets
    for sort in &theory.sorts {
        let sort_name = sort.name.as_ref();
        match sort_name {
            "Header" => {
                body.push(StmtTerm::Comment("Theory: Header sort".to_string()));
                body.push(StmtTerm::Yield {
                    widget: Box::new(PythonTerm::Widget {
                        widget_type: "Header".to_string(),
                        args: vec![],
                        id: Some("header".to_string()),
                    }),
                });
            }
            "Sidebar" => {
                body.push(StmtTerm::Comment("Theory: Sidebar sort".to_string()));
                body.push(StmtTerm::Yield {
                    widget: Box::new(PythonTerm::Widget {
                        widget_type: "Vertical".to_string(),
                        args: vec![("id".to_string(), ExprTerm::Str("sidebar".to_string()))],
                        id: Some("sidebar".to_string()),
                    }),
                });
            }
            "Footer" => {
                body.push(StmtTerm::Comment("Theory: Footer sort".to_string()));
                body.push(StmtTerm::Yield {
                    widget: Box::new(PythonTerm::Widget {
                        widget_type: "Footer".to_string(),
                        args: vec![],
                        id: Some("footer".to_string()),
                    }),
                });
            }
            _ => {}
        }
    }
    
    // Ensure at least some content
    if body.is_empty() {
        body.push(StmtTerm::Comment("Theory: default compose".to_string()));
        body.push(StmtTerm::Yield {
            widget: Box::new(PythonTerm::Widget {
                widget_type: "Static".to_string(),
                args: vec![("content".to_string(), ExprTerm::Str("App".to_string()))],
                id: Some("content".to_string()),
            }),
        });
    }
    
    body
}

// ============================================================================
// OBSOLETE: All UIConfig-dependent functions removed
// Use direct NCL→code pipeline via parse_ncl_to_python_term
// ============================================================================

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
