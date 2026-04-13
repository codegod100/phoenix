//! Tree-sitter based spec parser
//! 
//! Parses the actual spec schema:
//! - ui_config.layout.widgets = { header = {...}, sidebar = {...}, ... }

use tree_sitter::Node;
use crate::pipeline::widget_config::{UIConfig, WidgetConfig, map_widget_type};

/// Extract string field from a record node
fn get_field<'a>(node: Node<'a>, name: &str, content: &'a str) -> Option<String> {
    let text = |n: Node<'a>| -> &str { &content[n.start_byte()..n.end_byte()] };
    
    for child in node.children(&mut node.walk()) {
        if child.kind() == "field_decl" {
            for field_def in child.children(&mut child.walk()) {
                if field_def.kind() == "field_def" {
                    let parts: Vec<_> = field_def.children(&mut field_def.walk()).collect();
                    
                    // Find field_path (the name)
                    if let Some(&path) = parts.iter().find(|&&n| n.kind() == "field_path") {
                        if text(path).trim() == name {
                            // Value is at index 2 (after field_path and =)
                            if let Some(&val) = parts.iter().nth(2) {
                                let s = text(val).trim();
                                // Unwrap quotes
                                return Some(s.trim_matches('"').to_string());
                            }
                        }
                    }
                }
            }
        } else if child.kind() == "last_field" {
            // last_field contains field_decl which contains field_def
            for field_decl in child.children(&mut child.walk()) {
                if field_decl.kind() == "field_decl" {
                    for field_def in field_decl.children(&mut field_decl.walk()) {
                        if field_def.kind() == "field_def" {
                            let parts: Vec<_> = field_def.children(&mut field_def.walk()).collect();
                            
                            // Find field_path (the name)
                            if let Some(&path) = parts.iter().find(|&&n| n.kind() == "field_path") {
                                if text(path).trim() == name {
                                    // Value is at index 2 (after field_path and =)
                                    if let Some(&val) = parts.iter().nth(2) {
                                        let s = text(val).trim();
                                        // Unwrap quotes
                                        return Some(s.trim_matches('"').to_string());
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    None
}

/// Unwrap nested wrapper nodes to get to the actual content
/// Also skips past comments to find the actual record
fn unwrap<'a>(node: Node<'a>) -> Node<'a> {
    let mut current = node;
    for _ in 0..20 {
        match current.kind() {
            "term" | "uni_term" | "infix_expr" | "applicative" | "record_operand" | "atom" => {
                let children: Vec<_> = current.children(&mut current.walk()).collect();
                // Skip comments at the start
                let non_comment = children.iter().find(|&&c| {
                    let kind = c.kind();
                    kind != "comment" && kind != "line_comment" && kind != "block_comment"
                });
                if let Some(&child) = non_comment {
                    current = child;
                } else if let Some(&first) = children.first() {
                    current = first;
                } else { break; }
            }
            _ => break,
        }
    }
    current
}

/// Find a field by name at any depth, return its value node
fn find_field_recursive<'a>(node: Node<'a>, name: &str, content: &'a str, depth: usize) -> Option<Node<'a>> {
    let text = |n: Node<'a>| -> &str { &content[n.start_byte()..n.end_byte()] };
    
    // Check if this node is a field_decl with the target name
    if node.kind() == "field_decl" || node.kind() == "last_field" {
        for field_def in node.children(&mut node.walk()) {
            if field_def.kind() == "field_def" {
                let parts: Vec<_> = field_def.children(&mut field_def.walk()).collect();
                if let Some(&path) = parts.iter().find(|&&n| n.kind() == "field_path") {
                    if text(path).trim() == name {
                        return parts.iter().nth(2).copied();
                    }
                }
            }
        }
    }
    
    // Recurse into children
    if depth < 25 {
        for child in node.children(&mut node.walk()) {
            if let Some(found) = find_field_recursive(child, name, content, depth + 1) {
                return Some(found);
            }
        }
    }
    None
}

/// Extract UI config from spec
pub fn extract_ui_config(content: &str) -> Option<UIConfig> {
    let clean: String = content.lines()
        .filter(|l| !l.starts_with("## Source:"))
        .collect::<Vec<_>>()
        .join("\n");
    
    let mut parser = tree_sitter::Parser::new();
    parser.set_language(&tree_sitter_nickel::LANGUAGE.into()).ok()?;
    let tree = parser.parse(&clean, None)?;
    let root = unwrap(tree.root_node());
    
    let mut config = UIConfig::default();
    config.title = get_field(root, "name", &clean);
    
    // Find ui_config.layout.widgets recursively
    if let Some(widgets_val) = find_field_recursive(root, "widgets", &clean, 0) {
        let widgets_node = unwrap(widgets_val);
        
        // widgets is a record with named fields: header, sidebar, main, footer
        if widgets_node.kind() == "uni_record" || widgets_node.kind() == "record" {
            // Known widget names in order
            for widget_name in ["header", "sidebar", "main", "footer"] {
                if let Some(widget_val) = find_field_recursive(widgets_node, widget_name, &clean, 0) {
                    if let Some(widget) = parse_widget(widget_val, widget_name, &clean) {
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

/// Parse a widget from its record value
fn parse_widget<'a>(node: Node<'a>, default_id: &str, content: &'a str) -> Option<WidgetConfig> {
    let record = unwrap(node);
    if record.kind() != "uni_record" && record.kind() != "record" {
        return None;
    }
    
    let wtype = get_field(record, "type", content)
        .map(|t| map_widget_type(&t))
        .unwrap_or_else(|| "Static".to_string());
    
    let mut widget = WidgetConfig::new(wtype);
    // Use explicit id from record if present, otherwise use default
    widget.id = get_field(record, "id", content).or_else(|| Some(default_id.to_string()));
    widget.title = get_field(record, "title", content);
    widget.content = get_field(record, "content", content);
    
    // Extract additional properties from spec
    // Header properties
    if let Some(val) = get_field(record, "show_clock", content) {
        widget.props.push(("show_clock".to_string(), val));
    }
    if let Some(val) = get_field(record, "subtitle", content) {
        widget.props.push(("subtitle".to_string(), val));
    }
    
    // LogView properties
    if let Some(val) = get_field(record, "max_lines", content) {
        widget.props.push(("max_lines".to_string(), val));
    }
    if let Some(val) = get_field(record, "follow_tail", content) {
        widget.props.push(("follow_tail".to_string(), val));
    }
    if let Some(val) = get_field(record, "scroll_keys", content) {
        widget.props.push(("scroll_keys".to_string(), val));
    }
    
    // Footer properties
    if let Some(val) = get_field(record, "show_bindings", content) {
        widget.props.push(("show_bindings".to_string(), val));
    }
    if let Some(val) = get_field(record, "show_commands", content) {
        widget.props.push(("show_commands".to_string(), val));
    }
    if let Some(val) = get_field(record, "custom_sections", content) {
        widget.props.push(("custom_sections".to_string(), val));
    }
    
    // Common widget properties
    if let Some(val) = get_field(record, "focusable", content) {
        widget.props.push(("focusable".to_string(), val));
    }
    if let Some(val) = get_field(record, "focus_order", content) {
        widget.props.push(("focus_order".to_string(), val));
    }
    if let Some(val) = get_field(record, "css_class", content) {
        widget.props.push(("css_class".to_string(), val));
    }
    
    // Grid layout properties
    if let Some(val) = get_field(record, "row", content) {
        widget.props.push(("row".to_string(), val));
    }
    if let Some(val) = get_field(record, "col", content) {
        widget.props.push(("col".to_string(), val));
    }
    if let Some(val) = get_field(record, "col_span", content) {
        widget.props.push(("col_span".to_string(), val));
    }
    if let Some(val) = get_field(record, "row_span", content) {
        widget.props.push(("row_span".to_string(), val));
    }
    
    // List properties
    if let Some(val) = get_field(record, "items", content) {
        widget.props.push(("items".to_string(), val));
    }
    if let Some(val) = get_field(record, "capture_keys", content) {
        widget.props.push(("capture_keys".to_string(), val));
    }
    if let Some(val) = get_field(record, "on_select", content) {
        widget.props.push(("on_select".to_string(), val));
    }
    
    // Parse children if present
    if let Some(children_val) = find_field_recursive(record, "children", content, 0) {
        let children_node = unwrap(children_val);
        
        // Children is an array like [ { ... }, { ... } ]
        if children_node.kind() == "[" || children_node.kind() == "array" {
            // Look at parent atom to find array elements
            if let Some(parent) = children_node.parent() {
                if parent.kind() == "atom" {
                    for child in parent.children(&mut parent.walk()) {
                        if child.kind() == "term" || child.kind() == "uni_term" {
                            // Use explicit id from child if present, else generate
                            let child_record = unwrap(child);
                            let child_id = get_field(child_record, "id", content)
                                .unwrap_or_else(|| format!("{}_child", default_id));
                            if let Some(parsed) = parse_widget(child, &child_id, content) {
                                widget.children.push(parsed);
                            }
                        }
                    }
                }
            }
        }
    }
    
    Some(widget)
}

#[cfg(test)]
mod tests {
    use super::*;

    fn parse(text: &str) -> tree_sitter::Tree {
        let mut parser = tree_sitter::Parser::new();
        parser.set_language(&tree_sitter_nickel::LANGUAGE.into()).unwrap();
        parser.parse(text, None).unwrap()
    }

    #[test]
    fn test_parse_real_spec() {
        let spec = include_str!("/home/nandi/code/simple-tui/spec.ncl");
        let config = extract_ui_config(spec).expect("Should parse real spec");
        // Real spec should have at least header, sidebar, main
        assert!(!config.widgets.is_empty(), "Should parse some widgets from real spec");
        assert!(config.widgets.len() >= 4, "Should have at least 4 widgets");
    }

    #[test]
    fn test_get_field_basic() {
        let text = r#"{ id = "header", type = "Header", title = "Test" }"#;
        let tree = parse(text);
        let record = unwrap(tree.root_node());
        
        assert_eq!(get_field(record, "id", text), Some("header".to_string()));
        assert_eq!(get_field(record, "type", text), Some("Header".to_string()));
        assert_eq!(get_field(record, "title", text), Some("Test".to_string()));
    }

    #[test]
    fn test_get_field_with_trailing_comma() {
        let text = r#"{ id = "a", type = "B", }"#;
        let tree = parse(text);
        let record = unwrap(tree.root_node());
        
        assert_eq!(get_field(record, "id", text), Some("a".to_string()));
        assert_eq!(get_field(record, "type", text), Some("B".to_string()));
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
        
        let config = extract_ui_config(spec).expect("Should parse spec");
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
        
        let config = extract_ui_config(spec).expect("Should parse");
        assert_eq!(config.widgets.len(), 1);
        
        let sidebar = &config.widgets[0];
        assert_eq!(sidebar.id, Some("sidebar".to_string()));
        assert_eq!(sidebar.children.len(), 2);
    }
}
