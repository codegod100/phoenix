//! Mermaid to ASCII Art Converter
//!
//! Converts Mermaid graph diagrams to ASCII art representations.

use std::collections::HashMap;

/// Simplify long tensor expression labels
fn simplify_label(label: &str) -> String {
    if label.len() < 40 {
        return label.to_string();
    }
    
    // Extract module names from complex tensor expressions
    let modules = [
        ("hono-server", "🌐 Hono"),
        ("sqlite", "🗄️ SQLite"),
        ("vite-dev-server", "⚡ Vite"),
        ("elenajs", "🎨 ElenaJS"),
        ("bun-runtime", "🚀 Bun"),
    ];
    
    let mut found = Vec::new();
    for (pattern, name) in &modules {
        if label.to_lowercase().contains(pattern) {
            found.push(*name);
        }
    }
    
    if found.is_empty() {
        let mut s = label.chars().take(25).collect::<String>();
        s.push_str("...");
        return s;
    }
    
    found.join(" → ")
}

/// Parse a simple Mermaid graph and convert to ASCII
pub fn mermaid_to_ascii(mermaid: &str, max_width: usize) -> String {
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
    generate_ascii_layout(&nodes, &connections, max_width)
}

fn generate_ascii_layout(
    nodes: &HashMap<String, String>,
    connections: &[(String, String, String)],
    max_width: usize,
) -> String {
    let mut result = String::new();
    
    // Calculate node display sizes
    let node_widths: HashMap<String, usize> = nodes.iter()
        .map(|(id, label)| {
            let display_len = label.chars().count();
            let width = display_len.max(10).min(max_width - 4);
            (id.clone(), width)
        })
        .collect();
    
    // Simple vertical layout: nodes stacked with connections between
    let node_ids: Vec<String> = nodes.keys().cloned().collect();
    
    for (i, node_id) in node_ids.iter().enumerate() {
        let label = nodes.get(node_id).unwrap();
        let width = node_widths.get(node_id).copied().unwrap_or(20);
        
        // Draw node box
        result.push_str(&draw_box(label, width));
        
        // Draw connection to next node
        if i < node_ids.len() - 1 {
            let next_id = &node_ids[i + 1];
            // Find if there's a connection between these nodes
            let has_connection = connections.iter()
                .any(|(from, to, _)| (from == node_id && to == next_id) || (from == next_id && to == node_id));
            
            if has_connection {
                result.push_str(&draw_connection(width, true));
            } else {
                result.push('\n');
            }
        }
    }
    
    // Add connection summary
    if !connections.is_empty() {
        result.push('\n');
        result.push_str("Connections:\n");
        for (from, to, arrow) in connections {
            let arrow_char = match arrow.as_str() {
                "==>" => "=>>",
                "-.->" => "~~>",
                "---" => "---",
                _ => "-->",
            };
            let from_label = nodes.get(from).map(|s| s.as_str()).unwrap_or(from);
            let to_label = nodes.get(to).map(|s| s.as_str()).unwrap_or(to);
            result.push_str(&format!("  {} {} {}\n", from_label, arrow_char, to_label));
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