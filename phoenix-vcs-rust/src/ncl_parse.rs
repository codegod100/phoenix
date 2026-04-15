//! Nickel-lang based spec parser
//! 
//! Parses the actual spec schema:
//! - ui_config.layout.widgets = { header = {...}, sidebar = {...}, ... }

use nickel_lang::{Context, Expr};
use crate::pipeline::widget_config::{UIConfig, WidgetConfig, map_widget_type};

/// Extract string field from a record
fn get_field(record: &nickel_lang::Record, name: &str) -> Option<String> {
    record.value_by_name(name)?.as_str().map(|s| s.to_string())
}

/// Extract UI config from spec
pub fn extract_ui_config(content: &str) -> Option<UIConfig> {
    // Parse with nickel-lang
    let mut context = Context::new();
    let expr = context.eval_deep(content).ok()?;
    let record = expr.as_record()?;
    
    let mut config = UIConfig::default();
    config.title = get_field(&record, "name");
    
    // Find ui_config.layout.widgets - need to keep intermediates alive
    let ui_config_expr = record.value_by_name("ui_config")?;
    let ui_config = ui_config_expr.as_record()?;
    let layout_expr = ui_config.value_by_name("layout")?;
    let layout = layout_expr.as_record()?;
    
    // Try array format first: widgets = [ {...}, {...} ]
    if let Some(widgets_expr) = layout.value_by_name("widgets") {
        if let Some(array) = widgets_expr.as_array() {
            for i in 0..array.len() {
                if let Some(widget_expr) = array.get(i) {
                    if let Some(widget) = parse_widget(&widget_expr, &format!("widget_{}", i)) {
                        config.widgets.push(widget);
                    }
                }
            }
        } else if let Some(widgets_record) = widgets_expr.as_record() {
            // Record format: widgets = { header = {...}, sidebar = {...} }
            for widget_name in ["header", "sidebar", "main", "footer"] {
                if let Some(widget_expr) = widgets_record.value_by_name(widget_name) {
                    if let Some(widget) = parse_widget(&widget_expr, widget_name) {
                        config.widgets.push(widget);
                    }
                }
            }
        }
    }
    
    // Detect if any widget is a list
    config.has_list = config.widgets.iter()
        .any(|w| w.widget_type == "ListView" || 
             w.children.iter().any(|c| c.widget_type == "ListView"));
    
    Some(config)
}

/// Parse a widget from its value
fn parse_widget(expr: &Expr, default_id: &str) -> Option<WidgetConfig> {
    let record = expr.as_record()?;
    
    let wtype = get_field(&record, "type")
        .map(|t| map_widget_type(&t))
        .unwrap_or_else(|| "Static".to_string());
    
    let mut widget = WidgetConfig::new(wtype);
    // Use explicit id from record if present, otherwise use default
    widget.id = get_field(&record, "id").or_else(|| Some(default_id.to_string()));
    widget.title = get_field(&record, "title");
    widget.content = get_field(&record, "content");
    
    // Extract additional properties from spec
    // Header properties
    if let Some(val) = get_field(&record, "show_clock") {
        widget.props.push(("show_clock".to_string(), val));
    }
    if let Some(val) = get_field(&record, "subtitle") {
        widget.props.push(("subtitle".to_string(), val));
    }
    
    // LogView properties
    if let Some(val) = get_field(&record, "max_lines") {
        widget.props.push(("max_lines".to_string(), val));
    }
    if let Some(val) = get_field(&record, "follow_tail") {
        widget.props.push(("follow_tail".to_string(), val));
    }
    if let Some(val) = get_field(&record, "scroll_keys") {
        widget.props.push(("scroll_keys".to_string(), val));
    }
    
    // Footer properties
    if let Some(val) = get_field(&record, "show_bindings") {
        widget.props.push(("show_bindings".to_string(), val));
    }
    if let Some(val) = get_field(&record, "show_commands") {
        widget.props.push(("show_commands".to_string(), val));
    }
    if let Some(val) = get_field(&record, "custom_sections") {
        widget.props.push(("custom_sections".to_string(), val));
    }
    
    // Common widget properties
    if let Some(val) = get_field(&record, "focusable") {
        widget.props.push(("focusable".to_string(), val));
    }
    if let Some(val) = get_field(&record, "focus_order") {
        widget.props.push(("focus_order".to_string(), val));
    }
    if let Some(val) = get_field(&record, "css_class") {
        widget.props.push(("css_class".to_string(), val));
    }
    
    // Grid layout properties
    if let Some(val) = get_field(&record, "row") {
        widget.props.push(("row".to_string(), val));
    }
    if let Some(val) = get_field(&record, "col") {
        widget.props.push(("col".to_string(), val));
    }
    if let Some(val) = get_field(&record, "col_span") {
        widget.props.push(("col_span".to_string(), val));
    }
    if let Some(val) = get_field(&record, "row_span") {
        widget.props.push(("row_span".to_string(), val));
    }
    
    // List properties
    if let Some(val) = get_field(&record, "items") {
        widget.props.push(("items".to_string(), val));
    }
    if let Some(val) = get_field(&record, "capture_keys") {
        widget.props.push(("capture_keys".to_string(), val));
    }
    if let Some(val) = get_field(&record, "on_select") {
        widget.props.push(("on_select".to_string(), val));
    }
    
    // Parse children if present
    if let Some(children_expr) = record.value_by_name("children") {
        if let Some(array) = children_expr.as_array() {
            for i in 0..array.len() {
                if let Some(child_expr) = array.get(i) {
                    let child_id = format!("{}_child_{}", default_id, i);
                    if let Some(parsed) = parse_widget(&child_expr, &child_id) {
                        widget.children.push(parsed);
                    }
                }
            }
        }
    }
    
    Some(widget)
}

/// Direct extraction of widgets from NCL (no UIConfig intermediate)
pub fn extract_widgets_direct(ncl_content: &str) -> Vec<crate::pipeline::term_codegen::WidgetData> {
    // For now, delegate to extract_ui_config and convert
    // In a full implementation, this would parse directly to WidgetData
    if let Some(ui_config) = extract_ui_config(ncl_content) {
        ui_config.widgets.iter().map(|w| convert_widget_config(w)).collect()
    } else {
        vec![]
    }
}

/// Direct extraction of title from NCL
pub fn extract_title_direct(ncl_content: &str) -> Option<String> {
    if let Some(ui_config) = extract_ui_config(ncl_content) {
        ui_config.title
    } else {
        None
    }
}

/// Direct extraction of layout from NCL
pub fn extract_layout_direct(ncl_content: &str) -> crate::pipeline::term_codegen::LayoutData {
    if let Some(ui_config) = extract_ui_config(ncl_content) {
        crate::pipeline::term_codegen::LayoutData {
            layout_type: ui_config.layout_type,
            grid_columns: ui_config.grid_columns,
            grid_rows: ui_config.grid_rows,
            grid_gap: ui_config.grid_gap,
            styles: ui_config.styles,
        }
    } else {
        crate::pipeline::term_codegen::LayoutData::default()
    }
}

/// Convert WidgetConfig to WidgetData
fn convert_widget_config(w: &WidgetConfig) -> crate::pipeline::term_codegen::WidgetData {
    crate::pipeline::term_codegen::WidgetData {
        widget_type: w.widget_type.clone(),
        id: w.id.clone(),
        content: w.content.clone(),
        title: w.title.clone(),
        children: w.children.iter().map(|c| convert_widget_config(c)).collect(),
        props: w.props.clone(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(text: &str) -> Option<UIConfig> {
        extract_ui_config(text)
    }

    #[test]
    fn test_parse_real_spec() {
        let spec = include_str!("/home/nandi/code/simple-tui/spec.ncl");
        let config = parse(spec).expect("Should parse real spec");
        // Real spec uses array format with nested containers
        // Parser extracts top-level widgets (not recursively into children)
        assert!(!config.widgets.is_empty(), "Should parse at least 1 top-level widget from real spec");
        // Should have header, main_container, footer at minimum
        assert!(config.widgets.len() >= 3, "Should have at least 3 top-level widgets (header, main_container, footer)");
    }

    #[test]
    fn test_get_field_basic() {
        let text = r#"{ id = "header", type = "Header", title = "Test" }"#;
        
        let mut context = Context::new();
        let expr = context.eval_deep(text).expect("Should parse");
        let record = expr.as_record().expect("Should be record");
        
        assert_eq!(get_field(&record, "id"), Some("header".to_string()));
        assert_eq!(get_field(&record, "type"), Some("Header".to_string()));
        assert_eq!(get_field(&record, "title"), Some("Test".to_string()));
    }

    #[test]
    fn test_extract_full_spec() {
        let spec = r#"{
            name = "test-app",
            ui_config = {
                layout = {
                    widgets = {
                        header = { type = "Header", title = "H" },
                        sidebar = { type = "Vertical", title = "S" },
                        main = { type = "Static", title = "M" },
                        footer = { type = "Footer", title = "F" },
                    },
                },
            },
        }"#;
        
        let config = parse(spec).expect("Should parse spec");
        assert_eq!(config.title, Some("test-app".to_string()));
        assert_eq!(config.widgets.len(), 4);
        
        let ids: Vec<_> = config.widgets.iter()
            .map(|w| w.id.as_deref().unwrap_or("none"))
            .collect();
        assert_eq!(ids, vec!["header", "sidebar", "main", "footer"]);
    }

    #[test]
    fn test_extract_widget_with_children() {
        let spec = r#"{
            ui_config = {
                layout = {
                    widgets = {
                        sidebar = {
                            type = "Vertical",
                            id = "sidebar",
                            title = "Navigation",
                            children = [
                                { type = "List", id = "nav_list" },
                                { type = "Static", content = "Ready" },
                            ],
                        },
                    },
                },
            },
        }"#;
        
        let config = parse(spec).expect("Should parse");
        assert_eq!(config.widgets.len(), 1);
        
        let sidebar = &config.widgets[0];
        assert_eq!(sidebar.id, Some("sidebar".to_string()));
        assert_eq!(sidebar.children.len(), 2);
    }
}
