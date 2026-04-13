//! Spec Parsing - Delegates to ncl_parse for tree-sitter based extraction

pub use crate::pipeline::widget_config::{UIConfig, WidgetConfig, map_widget_type, default_ui_config};
use crate::pipeline::term_codegen::PythonTerm;

/// Parse UI configuration using tree-sitter
/// 
/// Delegates to ncl_parse which handles the actual spec schema:
/// ui_config.layout.widgets = { header = {...}, sidebar = {...}, ... }
pub fn parse_ui_config(spec_content: &str) -> Option<UIConfig> {
    crate::ncl_parse::extract_ui_config(spec_content)
}

/// Build compose body from parsed widgets
pub fn build_compose_body_from_spec(widgets: &[WidgetConfig]) -> Vec<PythonTerm> {
    widgets.iter().map(|w| {
        PythonTerm::Yield {
            widget: Box::new(build_widget_term(w)),
        }
    }).collect()
}

/// Build a widget term from config
fn build_widget_term(widget: &WidgetConfig) -> PythonTerm {
    let children_terms: Vec<PythonTerm> = widget.children.iter()
        .map(|c| build_widget_term(c))
        .collect();
    
    let args = if let Some(content) = &widget.content {
        vec![("content".to_string(), PythonTerm::Str(content.clone()))]
    } else if !children_terms.is_empty() {
        // For containers with children
        vec![("children".to_string(), PythonTerm::List(children_terms))]
    } else {
        vec![]
    };
    
    PythonTerm::Widget {
        widget_type: widget.widget_type.clone(),
        args,
        id: widget.id.clone(),
    }
}

/// Build CSS from parsed styles
pub fn build_css_from_spec(_styles: &[(String, String, String)]) -> PythonTerm {
    PythonTerm::CSS { rules: vec![] }
}
