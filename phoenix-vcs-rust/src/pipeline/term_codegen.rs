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
    Call { func: Box<ExprTerm>, args: Vec<ExprTerm> },
    Null,
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
            term_to_python_with_indent(css, out, indent + 1);
            out.push_str(&format!("{}    \"\"\"\n\n", ind));
            
            // Methods
            for method in methods {
                term_to_python_with_indent(method, out, indent + 1);
                out.push('\n');
            }
        }
        
        CSS { rules } => {
            for rule in rules {
                out.push_str(&format!("{}    {} {{\n", ind, rule.selector));
                for (prop, val) in &rule.properties {
                    out.push_str(&format!("{}        {}: {};\n", ind, prop, val));
                }
                out.push_str(&format!("{}    }}\n", ind));
            }
        }
        
        Method { name, params, return_type, body } => {
            let params_str = params.iter()
                .map(|(n, t)| format!("{}: {}", n, t))
                .collect::<Vec<_>>()
                .join(", ");
            out.push_str(&format!("{}    def {}({}) -> {}:\n", ind, name, params_str, return_type));
            
            for stmt in body {
                term_to_python_with_indent(stmt, out, indent + 2);
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
            out.push_str(&format!("{}yield ", ind));
            term_to_python_with_indent(widget, out, indent);
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
        
        _ => {
            out.push_str(&format!("{}# TODO: {:?}\n", ind, term));
        }
    }
}

fn expr_to_python(expr: &ExprTerm, out: &mut String) {
    match expr {
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

// ============================================================================
// Term Morphism: IU → PythonTerm
// ============================================================================

/// μ_iu_to_python: Morphism from ImplementationUnit to PythonTerm
/// 
/// This constructs the code term algebraically from the IU, no templates.
pub fn iu_to_python_term(iu: &ImplementationUnit) -> PythonTerm {
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
        // yield Vertical(Static(...), ...)
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
            target: Box::new(Widget { widget_type: "app".to_string(), args: vec![], id: None }),
            value: Box::new(Call {
                func: Box::new(Widget { widget_type: format!("{}App", class_name), args: vec![], id: None }),
                args: vec![],
            }),
        },
        // app.run()
        ExprStmt {
            expr: Box::new(Call {
                func: Box::new(Widget { widget_type: "app.run".to_string(), args: vec![], id: None }),
                args: vec![],
            }),
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
pub fn generate_from_term(iu: &ImplementationUnit) -> String {
    let term = iu_to_python_term(iu);
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
        }
    }
    
    #[test]
    fn test_term_construction() {
        let iu = make_test_iu("simple-tui");
        let term = iu_to_python_term(&iu);
        
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
        let code = generate_from_term(&iu);
        
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
