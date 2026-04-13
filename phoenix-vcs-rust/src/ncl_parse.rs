//! Minimal tree-sitter based spec parser for V2 schema
//! 
//! Only parses what we need:
//! - Top-level `name` field  
//! - Top-level `widgets` array
//! - Each widget's `id`, `type`, `title`, `content`, `children`

use tree_sitter::Node;

/// Extract string value from field like `name = "value"`
fn extract_string_field(node: Node, field_name: &str, content: &str) -> Option<String> {
    let text = |n: Node| -> String { content[n.start_byte()..n.end_byte()].to_string() };
    
    // Check direct field_decl children
    for child in node.children(&mut node.walk()) {
        if child.kind() == "field_decl" {
            // field_decl contains field_def
            for field_def in child.children(&mut child.walk()) {
                if field_def.kind() == "field_def" {
                    let children: Vec<_> = field_def.children(&mut field_def.walk()).collect();
                    
                    // children[0] = field_path, children[1] = "=", children[2] = value
                    if let Some(&path) = children.iter().find(|&&n| n.kind() == "field_path") {
                        if text(path).trim() == field_name {
                            if let Some(&val) = children.iter().nth(2) {
                                let s = text(val).trim().to_string();
                                return Some(s.trim_matches('"').to_string());
                            }
                        }
                    }
                }
            }
        }
    }
    
    // Check last_field (trailing field without comma)
    for child in node.children(&mut node.walk()) {
        if child.kind() == "last_field" {
            // last_field -> field_decl -> field_def
            for field_decl in child.children(&mut child.walk()) {
                if field_decl.kind() == "field_decl" {
                    for field_def in field_decl.children(&mut field_decl.walk()) {
                        if field_def.kind() == "field_def" {
                            let children: Vec<_> = field_def.children(&mut field_def.walk()).collect();
                            if let Some(&path) = children.iter().find(|&&n| n.kind() == "field_path") {
                                if text(path).trim() == field_name {
                                    if let Some(&val) = children.iter().nth(2) {
                                        let s = text(val).trim().to_string();
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

/// Unwrap nested term/uni_term/infix_expr/applicative/record_operand/atom nodes
fn unwrap_term(node: Node) -> Node {
    let mut current = node;
    for _ in 0..10 {
        match current.kind() {
            "term" | "uni_term" | "infix_expr" | "applicative" | "record_operand" | "atom" => {
                let children: Vec<_> = current.children(&mut current.walk()).collect();
                if let Some(&first) = children.first() {
                    current = first;
                } else {
                    break;
                }
            }
            _ => break,
        }
    }
    current
}

/// Extract UI config from V2 schema (flat widgets array)
pub fn extract_ui_config_v2(content: &str) -> Option<crate::pipeline::widget_config::UIConfig> {
    use crate::pipeline::widget_config::{UIConfig, WidgetConfig, map_widget_type};
    
    let clean: String = content.lines()
        .filter(|l| !l.starts_with("## Source:"))
        .collect::<Vec<_>>()
        .join("\n");
    
    let mut parser = tree_sitter::Parser::new();
    parser.set_language(&tree_sitter_nickel::LANGUAGE.into()).ok()?;
    let tree = parser.parse(&clean, None)?;
    let root = unwrap_term(tree.root_node());
    
    let mut config = UIConfig::default();
    
    // Extract name
    config.title = extract_string_field(root, "name", &clean);
    
    // Find widgets field
    let text = |n: Node| -> String { clean[n.start_byte()..n.end_byte()].to_string() };
    
    for child in root.children(&mut root.walk()) {
        if child.kind() == "field_decl" {
            for field_def in child.children(&mut child.walk()) {
                if field_def.kind() == "field_def" {
                    let children: Vec<_> = field_def.children(&mut field_def.walk()).collect();
                    if let Some(&path) = children.iter().find(|&&n| n.kind() == "field_path") {
                        if text(path).trim() == "widgets" {
                            // Found widgets field, value should be array
                            if let Some(&val) = children.iter().nth(2) {
                                // Unwrap to find [ node
                                let array_node = unwrap_term(val);
                                if array_node.kind() == "[" {
                                    // Array elements are in parent atom
                                    if let Some(parent) = array_node.parent() {
                                        if parent.kind() == "atom" {
                                            for elem in parent.children(&mut parent.walk()) {
                                                if elem.kind() == "term" || elem.kind() == "uni_term" {
                                                    if let Some(w) = parse_widget_v2(elem, &clean) {
                                                        config.widgets.push(w);
                                                    }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
    
    Some(config)
}

/// Parse a single widget from V2 schema
fn parse_widget_v2(node: Node, content: &str) -> Option<crate::pipeline::widget_config::WidgetConfig> {
    use crate::pipeline::widget_config::{WidgetConfig, map_widget_type};
    
    let record = unwrap_term(node);
    if record.kind() != "uni_record" && record.kind() != "record" {
        return None;
    }
    
    let id = extract_string_field(record, "id", content)?;
    let wtype = extract_string_field(record, "type", content)
        .map(|t| map_widget_type(&t))
        .unwrap_or_else(|| "Static".to_string());
    
    let mut widget = WidgetConfig::new(wtype);
    widget.id = Some(id);
    widget.title = extract_string_field(record, "title", content);
    widget.content = extract_string_field(record, "content", content);
    
    // TODO: Parse children recursively
    
    Some(widget)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tree_sitter::Parser;

    fn parse(text: &str) -> tree_sitter::Tree {
        let mut parser = Parser::new();
        parser.set_language(&tree_sitter_nickel::LANGUAGE.into()).unwrap();
        parser.parse(text, None).unwrap()
    }

    #[test]
    fn test_extract_from_record() {
        let text = r#"{ id = "header", type = "Header", title = "Test" }"#;
        let tree = parse(text);
        let root = tree.root_node();
        
        // Root is term -> uni_term -> ... -> uni_record
        let record = unwrap_term(root);
        assert_eq!(record.kind(), "uni_record");
        
        assert_eq!(extract_string_field(record, "id", text), Some("header".to_string()));
        assert_eq!(extract_string_field(record, "type", text), Some("Header".to_string()));
        assert_eq!(extract_string_field(record, "title", text), Some("Test".to_string()));
    }

    #[test]
    fn test_extract_with_trailing_comma() {
        let text = r#"{ id = "a", type = "B", }"#;
        let tree = parse(text);
        let root = tree.root_node();
        let record = unwrap_term(root);
        
        assert_eq!(extract_string_field(record, "id", text), Some("a".to_string()));
        assert_eq!(extract_string_field(record, "type", text), Some("B".to_string()));
    }

    #[test]
    fn test_extract_full_v2_spec() {
        let spec = r#"{
            name = "test-app",
            widgets = [
                { id = "header", type = "Header", title = "Test" },
                { id = "main", type = "Static" },
            ],
        }"#;
        
        let config = extract_ui_config_v2(spec).expect("Should parse V2 spec");
        assert_eq!(config.title, Some("test-app".to_string()));
        assert_eq!(config.widgets.len(), 2);
        assert_eq!(config.widgets[0].id, Some("header".to_string()));
        assert_eq!(config.widgets[0].title, Some("Test".to_string()));
        assert_eq!(config.widgets[1].id, Some("main".to_string()));
    }
}
