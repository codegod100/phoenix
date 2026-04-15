//! Mermaid to ASCII Art Converter
//!
//! Converts Mermaid graph diagrams to ASCII art representations.

use std::collections::HashMap;

/// Extract type flow from tensor expression
fn simplify_label(label: &str) -> String {
    if label.len() < 40 {
        return label.to_string();
    }
    
    // Extract type transitions: X → Y pattern
    let mut types: Vec<String> = Vec::new();
    
    // Parse capability interfaces like "HttpServer", "Database", "DevServer", etc.
    for part in label.split(|c: char| c == '@' || c == ':' || c == '(' || c == ')' || c == '→' || c == ',') {
        let trimmed = part.trim();
        if trimmed.is_empty() { continue; }
        
        // Skip internal type suffixes like .l .r
        let base_type = trimmed.split('.').next().unwrap_or(trimmed);
        
        // Only keep meaningful type names (capitalized or specific keywords)
        if base_type.chars().next().map(|c| c.is_uppercase()).unwrap_or(false)
           || ["unit", "wire", "cap"].contains(&base_type.to_lowercase().as_str()) {
            let simplified = match base_type {
                "Logging" => "📝 Log",
                "Database" => "🗄️ DB",  
                "HttpServer" => "🌐 HTTP",
                "DevServer" => "⚡ Dev",
                "WebComponents" => "🎨 UI",
                "JavaScriptRuntime" => "🚀 JS",
                "unit" => "∅",
                t => t,
            };
            if !types.contains(&simplified.to_string()) {
                types.push(simplified.to_string());
            }
        }
    }
    
    if types.len() < 2 {
        let mut s = label.chars().take(30).collect::<String>();
        s.push_str("...");
        return s;
    }
    
    types.join(" → ")
}

/// Parse a simple Mermaid graph and convert to ASCII
/// Includes component names in the output
pub fn mermaid_to_ascii_with_components(
    mermaid: &str, 
    max_width: usize,
    component_names: &[String]
) -> String {
    let lines: Vec<&str> = mermaid.lines().collect();
    
    // Parse nodes and connections
    let mut nodes: HashMap<String, String> = HashMap::new();
    let mut connections: Vec<(String, String, String)> = Vec::new(); // (from, to, arrow_type)
    
    for line in &lines {
        let trimmed = line.trim();
        if trimmed.is_empty() || trimmed.starts_with("graph") {
            continue;
        }
        
        // Parse node definition: nodeId["label"]
        if trimmed.contains('[') && trimmed.contains(']') && !trimmed.contains("-->") {
            if let Some(id_end) = trimmed.find('[') {
                let id = trimmed[..id_end].trim().to_string();
                if let Some(label_start) = trimmed.find('[') {
                    if let Some(label_end) = trimmed.rfind(']') {
                        let label = trimmed[label_start+1..label_end].trim().to_string();
                        nodes.insert(id, label);
                    }
                }
            }
        }
        
        // Parse connection: A --> B or A ==> B or A -.-> B
        let arrow_types = [
            ("==>", "==>"),
            ("-.->", "-.->"),
            ("-->", "-->"),
            ("---", "---"),
        ];
        
        for (arrow, arrow_type) in &arrow_types {
            if trimmed.contains(arrow) {
                let parts: Vec<&str> = trimmed.split(arrow).collect();
                if parts.len() == 2 {
                    let from = parts[0].trim().to_string();
                    let to = parts[1].trim().to_string();
                    connections.push((from, to, arrow_type.to_string()));
                }
                break;
            }
        }
    }
    
    if nodes.is_empty() {
        return "(No nodes found in diagram)".to_string();
    }
    
    // Generate ASCII layout
    generate_ascii_layout(&nodes, &connections, max_width, component_names)
}

/// Legacy wrapper without components (for backward compatibility)
pub fn mermaid_to_ascii(mermaid: &str, max_width: usize) -> String {
    mermaid_to_ascii_with_components(mermaid, max_width, &[])
}

/// Generate ASCII layout showing both type flow and components
fn generate_ascii_layout(
    nodes: &HashMap<String, String>,
    connections: &[(String, String, String)],
    max_width: usize,
    component_names: &[String],
) -> String {
    let mut result = String::new();
    
    // Get the type flow from the first node (tensor expression)
    let type_flow = if let Some((_, label)) = nodes.iter().next() {
        simplify_label(label)
    } else {
        "(no tensor)".to_string()
    };
    
    // Draw type flow banner
    let banner_width = type_flow.chars().count() + 4;
    result.push_str("╔");
    result.push_str(&"═".repeat(banner_width));
    result.push_str("╗\n║ ");
    result.push_str(&type_flow);
    result.push_str(" ║\n╚");
    result.push_str(&"═".repeat(banner_width));
    result.push_str("╝\n\n");
    
    // Draw component boxes
    result.push_str("Components:\n");
    for (i, comp) in component_names.iter().enumerate() {
        let display = format!(" {} {}", i + 1, comp);
        result.push_str(&draw_component_box(&display, max_width / 2));
        if i < component_names.len() - 1 {
            result.push_str("      │\n      ▼\n");
        }
    }
    
    result
}

fn draw_box(label: &str, width: usize) -> String {
    let mut result = String::new();
    // Simplify long tensor expression labels
    let simplified = simplify_label(label);
    
    let truncated = if simplified.chars().count() > width - 2 {
        let mut s = simplified.chars().take(width - 5).collect::<String>();
        s.push_str("...");
        s
    } else {
        simplified
    };
    
    let content_len = truncated.chars().count();
    let padding = (width - content_len) / 2;
    let extra = (width - content_len) % 2;
    
    // Top border
    result.push_str(&format!("+{}+\n", "-".repeat(width)));
    
    // Content line
    let left_pad = " ".repeat(padding);
    let right_pad = " ".repeat(padding + extra);
    result.push_str(&format!("|{}{}{}|\n", left_pad, truncated, right_pad));
    
    // Bottom border
    result.push_str(&format!("+{}+\n", "-".repeat(width)));
    
    result
}

fn draw_connection(width: usize, has_arrow: bool) -> String {
    let center = width / 2;
    let mut line = String::new();
    
    // Draw vertical arrow
    for _ in 0..2 {
        line.push_str(&" ".repeat(center));
        line.push('|');
        line.push('\n');
    }
    
    if has_arrow {
        line.push_str(&" ".repeat(center - 1));
        line.push('V');
        line.push('\n');
    }
    
    line
}

fn draw_component_box(label: &str, width: usize) -> String {
    let mut result = String::new();
    let content_len = label.chars().count();
    let box_width = content_len.max(20).min(width);
    let padding = (box_width - content_len) / 2;
    
    // Top border
    result.push_str("┌");
    result.push_str(&"─".repeat(box_width + 2));
    result.push_str("┐\n");
    
    // Content with padding
    let left_pad = " ".repeat(padding + 1);
    let right_pad = " ".repeat(box_width - content_len - padding + 1);
    result.push_str("│");
    result.push_str(&left_pad);
    result.push_str(label);
    result.push_str(&right_pad);
    result.push_str("│\n");
    
    // Bottom border
    result.push_str("└");
    result.push_str(&"─".repeat(box_width + 2));
    result.push_str("┘\n");
    
    result
}

/// Simple text-based tree layout for diagrams
pub fn diagram_to_ascii_tree(diagram: &str, max_width: usize) -> String {
    let lines: Vec<&str> = diagram.lines().collect();
    let mut nodes: Vec<(String, String)> = Vec::new(); // (id, label)
    
    for line in &lines {
        let trimmed = line.trim();
        if trimmed.contains('[') && trimmed.contains(']') {
            if let Some(id_end) = trimmed.find('[') {
                let id = trimmed[..id_end].trim().to_string();
                if let Some(label_start) = trimmed.find('[') {
                    if let Some(label_end) = trimmed.rfind(']') {
                        let label = trimmed[label_start+1..label_end].trim().to_string();
                        nodes.push((id, label));
                    }
                }
            }
        }
    }
    
    if nodes.is_empty() {
        return "(Empty diagram)".to_string();
    }
    
    // Simple horizontal layout with arrows
    let mut result = String::new();
    let mut first = true;
    
    for (_, label) in &nodes {
        if !first {
            result.push_str(" --> ");
        }
        result.push('[');
        // Truncate if too long
        let display = if label.len() > 15 {
            format!("{}...", &label[..12])
        } else {
            label.clone()
        };
        result.push_str(&display);
        result.push(']');
        first = false;
    }
    
    result.push('\n');
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_mermaid_to_ascii() {
        let mermaid = r#"graph TD
  node0["Hono Server"]
  node1["SQLite"]
  node2["Vite Dev"]
  node0 --> node1
  node0 --> node2"#;

        let ascii = mermaid_to_ascii(mermaid, 60);
        assert!(ascii.contains("+"));
        assert!(ascii.contains("Hono Server") || ascii.contains("Hono"));
        println!("{}", ascii);
    }

    #[test]
    fn test_diagram_to_ascii_tree() {
        let diagram = r#"graph TD
  node0["A"]
  node1["B"]
  node2["C"]"#;

        let ascii = diagram_to_ascii_tree(diagram, 60);
        assert!(ascii.contains("[A]"));
        assert!(ascii.contains("[B]"));
        assert!(ascii.contains("-->"));
    }
}