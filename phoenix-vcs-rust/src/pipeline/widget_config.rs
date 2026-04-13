//! Formal ADT for UI widget configurations
//! 
//! This module defines algebraic data types for parsing widget trees from specs.
//! Uses tree-sitter for robust formal parsing instead of string manipulation.

use serde::{Deserialize, Serialize};

/// UI Configuration extracted from spec
#[derive(Debug, Clone, Default, Serialize, Deserialize)]
pub struct UIConfig {
    pub title: Option<String>,
    pub widgets: Vec<WidgetConfig>,
    pub show_clock: bool,
    pub has_list: bool,
    pub styles: Vec<(String, String, String)>, // (selector, property, value)
    pub focus_initial: Option<String>,
    pub focus_wrap: bool,
}

/// Widget configuration - algebraic tree structure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WidgetConfig {
    pub widget_type: String,  // Header, Footer, Vertical, Horizontal, ListView, Static, etc.
    pub id: Option<String>,
    pub content: Option<String>,
    pub title: Option<String>,
    pub children: Vec<WidgetConfig>,
    pub props: Vec<(String, String)>, // Additional properties as key-value pairs
}

impl WidgetConfig {
    /// Create a simple widget
    pub fn new(widget_type: impl Into<String>) -> Self {
        Self {
            widget_type: widget_type.into(),
            id: None,
            content: None,
            title: None,
            children: Vec::new(),
            props: Vec::new(),
        }
    }

    /// Add an id
    pub fn with_id(mut self, id: impl Into<String>) -> Self {
        self.id = Some(id.into());
        self
    }

    /// Add content
    pub fn with_content(mut self, content: impl Into<String>) -> Self {
        self.content = Some(content.into());
        self
    }

    /// Add a child
    pub fn with_child(mut self, child: WidgetConfig) -> Self {
        self.children.push(child);
        self
    }
}

/// Map spec widget types to Textual widget types
pub fn map_widget_type(spec_type: &str) -> String {
    match spec_type {
        "Header" => "Header",
        "Footer" => "Footer",
        "Container" => "Vertical",  // Default container is Vertical
        "Vertical" => "Vertical",
        "Horizontal" => "Horizontal",
        "Static" => "Static",
        "Label" => "Label",
        "List" => "ListView",
        "ListView" => "ListView",
        "ListItem" => "ListItem",
        "LogView" => "Log",
        "Log" => "Log",
        "Input" => "Input",
        "Button" => "Button",
        "TextArea" => "TextArea",
        "DataTable" => "DataTable",
        _ => "Static",  // Default fallback
    }.to_string()
}

/// Extract UI config from tree-sitter parsed Nickel AST
/// 
/// This is the formal entry point - takes the raw Nickel spec content
/// and returns a structured UI configuration.
pub fn extract_ui_config_from_ncl(content: &str) -> Option<UIConfig> {
    // For now, delegate to the tree-sitter based extraction
    // This will be implemented to walk the AST properly
    crate::ncl::extract_ui_config(content)
}

/// Build default UI config for simple apps
pub fn default_ui_config(name: &str) -> UIConfig {
    UIConfig {
        title: Some(name.to_string()),
        widgets: vec![
            WidgetConfig::new("Header")
                .with_content(name),
            WidgetConfig::new("Vertical")
                .with_id("content")
                .with_content("Application ready"),
            WidgetConfig::new("Footer"),
        ],
        show_clock: true,
        has_list: false,
        styles: default_styles(),
        focus_initial: None,
        focus_wrap: false,
    }
}

fn default_styles() -> Vec<(String, String, String)> {
    vec![
        ("Screen".to_string(), "align".to_string(), "center middle".to_string()),
        ("Screen".to_string(), "background".to_string(), "$surface".to_string()),
    ]
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_widget_config_builder() {
        let widget = WidgetConfig::new("Vertical")
            .with_id("sidebar")
            .with_content("Navigation")
            .with_child(WidgetConfig::new("ListView"));
        
        assert_eq!(widget.widget_type, "Vertical");
        assert_eq!(widget.id, Some("sidebar".to_string()));
        assert_eq!(widget.children.len(), 1);
    }

    #[test]
    fn test_map_widget_types() {
        assert_eq!(map_widget_type("Header"), "Header");
        assert_eq!(map_widget_type("List"), "ListView");
        assert_eq!(map_widget_type("Container"), "Vertical");
        assert_eq!(map_widget_type("Unknown"), "Static");
    }
}
