//! Spec Parsing - Formal tree-sitter based extraction
//! 
//! This module now delegates to the formal ADT in widget_config.rs
//! and the tree-sitter based extraction in ncl.rs.
//! 
//! The old string-based parsing has been replaced with proper AST traversal
//! for robust, deterministic spec extraction.

// Re-export the formal ADT types
pub use crate::pipeline::widget_config::{UIConfig, WidgetConfig, map_widget_type, default_ui_config};

/// Parse UI configuration using formal tree-sitter extraction
/// 
/// This is the main entry point - delegates to the formal parser
/// which uses tree-sitter for robust AST-based extraction.
pub fn parse_ui_config(spec_content: &str) -> Option<UIConfig> {
    eprintln!("DEBUG parse_ui_config: called with {} chars", spec_content.len());
    let result = crate::ncl::extract_ui_config(spec_content);
    eprintln!("DEBUG parse_ui_config: result = {:?}", result.as_ref().map(|r| format!("{} widgets", r.widgets.len())));
    result
}

/// Build compose body from parsed spec widgets
/// 
/// Generates the body of the compose() method from the widget tree.
pub fn build_compose_body_from_spec(widgets: &[WidgetConfig]) -> Vec<crate::pipeline::term_codegen::PythonTerm> {
    use crate::pipeline::term_codegen::PythonTerm;
    use crate::pipeline::term_codegen::PythonTerm::*;
    
    widgets.iter().map(|w| {
        Yield {
            widget: Box::new(build_widget_term(w)),
        }
    }).collect()
}

/// Build CSS from parsed spec styles
/// 
/// Generates CSS definitions from the styles extracted from the spec.
pub fn build_css_from_spec(styles: &[(String, String, String)]) -> crate::pipeline::term_codegen::PythonTerm {
    use crate::pipeline::term_codegen::PythonTerm;
    
    let css_rules: Vec<String> = styles.iter().map(|(selector, prop, value)| {
        format!("{} {{\n        {}: {};\n    }}", selector, prop, value)
    }).collect();
    
    PythonTerm::Str(css_rules.join("\n    "))
}

/// Build a widget term from widget config
fn build_widget_term(widget: &WidgetConfig) -> crate::pipeline::term_codegen::PythonTerm {
    use crate::pipeline::term_codegen::PythonTerm;
    use crate::pipeline::term_codegen::PythonTerm::*;
    
    let children_terms: Vec<PythonTerm> = widget.children.iter()
        .map(|c| build_widget_term(c))
        .collect();
    
    let args = if let Some(ref content) = widget.content {
        vec![("content".to_string(), Str(content.clone()))]
    } else if !children_terms.is_empty() {
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
