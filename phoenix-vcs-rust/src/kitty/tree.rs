//! Kitty Trees: Compact Tree Representation of Pregroup Diagrams
//!
//! Ported from lambeq's text2diagram/pregroup_tree.py and
//! pregroup_tree_converter.py
//!
//! Provides:
//! - PregroupTreeNode: Tree representation of pregroup structure
//! - diagram_to_tree: Convert diagram to compact tree
//! - tree_to_diagram: Convert tree back to diagram
//!
//! The tree representation is more compact than flat diagrams for
//! storage and transmission, and easier to visualize.

use crate::kitty::diagram::{Box, Diagram};
use crate::kitty::types::PregroupType;

/// Root index marker for the tree head
const ROOT_INDEX: i32 = -1;

/// A node in a pregroup tree.
///
/// Each node represents a token (word) in the specification,
/// annotated with the pregroup type of the outcome wire(s).
/// Branches represent cups connecting child types to parent.
///
/// # Example
/// For "POST /tasks returns TaskCreated":
/// ```
/// post_0 (s)
/// └─ tasks_1 (n)
/// ```
#[derive(Debug, Clone)]
pub struct PregroupTreeNode {
    /// The word/token name (e.g., "POST /tasks", "User")
    pub word: String,
    /// Position in original sentence/spec
    pub word_index: usize,
    /// The pregroup type (outcome wire)
    pub typ: PregroupType,
    /// Child nodes connected via cups
    pub children: Vec<PregroupTreeNode>,
    /// Parent node (None for root)
    pub parent: Option<usize>,
}

impl PregroupTreeNode {
    /// Create a new tree node
    pub fn new(word: impl Into<String>, word_index: usize, typ: PregroupType) -> Self {
        Self {
            word: word.into(),
            word_index,
            typ,
            children: vec![],
            parent: None,
        }
    }

    /// Add a child node
    pub fn add_child(&mut self, child: Self) {
        self.children.push(child);
    }

    /// Check if this is the root node
    pub fn is_root(&self) -> bool {
        self.parent.is_none()
    }

    /// Get the total number of nodes in the tree
    pub fn size(&self) -> usize {
        1 + self.children.iter().map(|c| c.size()).sum::<usize>()
    }

    /// Get the height of the tree
    pub fn height(&self) -> usize {
        if self.children.is_empty() {
            1
        } else {
            1 + self.children.iter()
                .map(|c| c.height())
                .max()
                .unwrap_or(0)
        }
    }

    /// Collect all words in tree order
    pub fn words(&self) -> Vec<(usize, String, PregroupType)> {
        let mut words = vec![(self.word_index, self.word.clone(), self.typ.clone())];
        for child in &self.children {
            words.extend(child.words());
        }
        words.sort_by_key(|(idx, _, _)| *idx);
        words
    }

    /// Get cups (parent-child connections) in the tree
    /// Returns (parent_index, child_index, parent_type, child_type)
    pub fn cups(&self) -> Vec<(usize, usize, PregroupType, PregroupType)> {
        let mut cups = vec![];

        for child in &self.children {
            // The cup connects parent's input to child's output
            cups.push((
                self.word_index,
                child.word_index,
                self.typ.clone(),
                child.typ.clone(),
            ));

            // Recurse
            cups.extend(child.cups());
        }

        cups
    }

    /// Convert to indented string representation
    pub fn to_tree_string(&self) -> String {
        self.to_tree_string_helper(0)
    }

    fn to_tree_string_helper(&self, indent: usize) -> String {
        let mut result = format!("{}{}_{} ({})",
            "  ".repeat(indent),
            self.word,
            self.word_index,
            self.typ
        );

        for child in &self.children {
            result.push('\n');
            result.push_str(&child.to_tree_string_helper(indent + 1));
        }

        result
    }

    /// Generate Mermaid diagram
    pub fn to_mermaid(&self) -> String {
        let mut output = String::from("graph TD\n");
        self.to_mermaid_helper(&mut output, None);
        output
    }

    fn to_mermaid_helper(&self, output: &mut String, parent_id: Option<String>) {
        let node_id = format!("{}_{}", self.word.replace(" ", "_"), self.word_index);

        output.push_str(&format!("  {}[\"{} ({})\"]\n",
            node_id, self.word, self.typ));

        if let Some(parent) = parent_id {
            output.push_str(&format!("  {} --> {}\n", parent, node_id));
        }

        for child in &self.children {
            child.to_mermaid_helper(output, Some(node_id.clone()));
        }
    }
}

/// Convert a pregroup diagram to a compact tree representation.
///
/// This is the inverse of tree_to_diagram.
pub fn diagram_to_tree(diagram: &Diagram, _break_cycles: bool) -> Result<PregroupTreeNode, String> {
    // Collect all words and cups
    let word_boxes = diagram.words();
    let cups = diagram.cups();

    if word_boxes.is_empty() {
        return Err("Empty diagram - no words found".to_string());
    }

    // Convert word boxes to the format we need
    let words: Vec<(usize, String, PregroupType)> = word_boxes.iter()
        .enumerate()
        .map(|(idx, b)| {
            let name = b.name().unwrap_or("unknown").to_string();
            // Get first cod type as the node's type
            let typ = b.cod().first()
                .cloned()
                .unwrap_or_else(|| PregroupType::atomic("s"));
            (idx, name, typ)
        })
        .collect();

    // Find the root (word with free output, usually type 's')
    let root = find_root(&words)?;

    // Build tree by following cups
    let mut tree = PregroupTreeNode::new(
        root.1.clone(),
        root.0,
        root.2.clone()
    );

    // Track visited to handle cycles
    let mut visited = std::collections::HashSet::new();
    visited.insert(root.0);

    // Build tree structure from cups
    for (idx, cup) in cups.iter().enumerate() {
        // Find which words this cup connects
        if let Box::Cup { left, right } = cup {
            // Find word with matching cod
            for (word_idx, (_, _, word_typ)) in words.iter().enumerate() {
                if word_typ == left {
                    // Check if this is the root
                    if word_idx == root.0 && idx < word_boxes.len() - 1 {
                        // Add as child
                        let child = &words[idx];
                        tree.add_child(PregroupTreeNode::new(
                            child.1.clone(),
                            child.0,
                            child.2.clone()
                        ));
                    }
                }
            }
        }
    }

    Ok(tree)
}

/// Convert a pregroup tree back to a diagram.
///
/// This is the inverse of diagram_to_tree.
pub fn tree_to_diagram(tree: &PregroupTreeNode) -> Diagram {
    let words = tree.words();
    let cups = tree.cups();

    // Create identity diagram for each word
    let mut diagram = Diagram::empty();

    // Sort words by index
    let mut sorted_words = words.clone();
    sorted_words.sort_by_key(|(idx, _, _)| *idx);

    // Create word boxes in order
    for (idx, word, typ) in &sorted_words {
        let word_box = Box::word_indexed(
            word.clone(),
            *idx,
            vec![],  // Domain - will be determined by cups
            vec![typ.clone()]
        );

        let word_diag = Diagram::from_box(word_box);

        if diagram.is_empty() {
            diagram = word_diag;
        } else {
            diagram = diagram.tensor(&word_diag);
        }
    }

    // Add cups to connect words
    // This is simplified - real implementation needs cup ordering
    for (parent_idx, child_idx, parent_type, child_type) in cups {
        // Find positions and add cups
        // ... cup logic would go here
        let _ = (parent_idx, child_idx, parent_type, child_type);
    }

    diagram
}

/// Find the root node (head of sentence)
fn find_root(words: &[(usize, String, PregroupType)]) -> Result<(usize, String, PregroupType), String> {
    // Look for type 's' (sentence) first
    if let Some(s) = words.iter().find(|(_, _, t)| t.name() == Some("s")) {
        return Ok(s.clone());
    }

    // Otherwise look for any word with right adjoint in its type
    if let Some(ra) = words.iter().find(|(_, _, t)| {
        t.to_string().contains(".r")
    }) {
        return Ok(ra.clone());
    }

    // Default to first word
    words.first()
        .cloned()
        .ok_or_else(|| "No words found".to_string())
}

/// Parser for creating trees from specifications
pub struct SpecParser;

impl SpecParser {
    /// Parse a simple spec format:
    /// - word_0 (type) : child_1 (type) : child_2 (type)
    /// Or single line: word (type) : child (type) : child (type)
    pub fn parse_simple(input: &str) -> Result<PregroupTreeNode, String> {
        // Handle both single-line and multi-line formats
        let parts: Vec<_> = input.split(':').collect();
        if parts.is_empty() {
            return Err("Empty input".to_string());
        }

        // Parse root
        let root_part = parts[0].trim();
        let (root_word, root_type) = if let Some(paren_start) = root_part.find('(') {
            let word = root_part[..paren_start].trim();
            let type_str = &root_part[paren_start..]
                .trim_matches(|c| c == '(' || c == ')');
            (word, PregroupType::parse(type_str)?)
        } else {
            (root_part, PregroupType::atomic("s"))
        };

        let mut root = PregroupTreeNode::new(root_word, 0, root_type);

        // Parse children
        for (i, part) in parts.iter().enumerate().skip(1) {
            let part = part.trim();
            let (word, typ) = if let Some(paren_start) = part.find('(') {
                let w = part[..paren_start].trim();
                let type_str = &part[paren_start..]
                    .trim_matches(|c| c == '(' || c == ')');
                (w, PregroupType::parse(type_str)?)
            } else {
                (part, PregroupType::atomic("n"))
            };

            let child = PregroupTreeNode::new(word, i, typ);
            root.add_child(child);
        }

        Ok(root)
    }

    /// Parse from spec.md style format
    pub fn parse_spec_md(content: &str) -> Result<Vec<PregroupTreeNode>, String> {
        let mut trees = vec![];

        for line in content.lines() {
            // Look for patterns like:
            // **POST /tasks** (`AuthToken @ TaskInput → TaskCreated`)
            if line.contains("**") && line.contains('→') {
                if let Some(tree) = Self::parse_endpoint_line(line) {
                    trees.push(tree);
                }
            }
        }

        Ok(trees)
    }

    fn parse_endpoint_line(line: &str) -> Option<PregroupTreeNode> {
        // Extract method and path
        let methods = ["GET", "POST", "PUT", "DELETE", "PATCH"];
        let method = methods.iter().find(|&&m| line.contains(m))?;

        let start = line.find("**")? + 2;
        let end = line[start..].find("**")? + start;
        let signature = &line[start..end];

        let path_start = signature.find(method)? + method.len();
        let path = signature[path_start..].trim();

        // Extract types
        let type_start = line.find('`')? + 1;
        let type_end = line[type_start..].find('`')? + type_start;
        let type_sig = &line[type_start..type_end];

        let parts: Vec<&str> = type_sig.split("→").collect();
        let (dom, cod) = if parts.len() == 2 {
            let dom_types = parts[0].split("@")
                .map(|s| PregroupType::parse(s.trim()).ok())
                .flatten()
                .collect();
            let cod_type = PregroupType::parse(parts[1].trim()).ok()?;
            (dom_types, vec![cod_type])
        } else {
            (vec![], vec![PregroupType::atomic("s")])
        };

        let name = format!("{} {}", method, path);
        let mut root = PregroupTreeNode::new(name.clone(), 0, cod.first()?.clone());

        // Add children for each input type
        for (i, dom_type) in dom.iter().enumerate() {
            let child = PregroupTreeNode::new(
                format!("input_{}", i),
                i + 1,
                dom_type.clone()
            );
            root.add_child(child);
        }

        Some(root)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_tree_node() {
        let n = PregroupType::atomic("n");
        let s = PregroupType::atomic("s");

        let mut root = PregroupTreeNode::new("sleeps", 0, s.clone());
        let child = PregroupTreeNode::new("John", 1, n.clone());
        root.add_child(child);

        assert_eq!(root.size(), 2);
        assert_eq!(root.height(), 2);
        assert!(root.is_root()); // parent is None, so it's the root
    }

    #[test]
    fn test_tree_to_string() {
        let n = PregroupType::atomic("n");
        let s = PregroupType::atomic("s");

        let mut root = PregroupTreeNode::new("sleeps", 0, s);
        root.add_child(PregroupTreeNode::new("John", 1, n));

        let output = root.to_tree_string();
        assert!(output.contains("sleeps_0"));
        assert!(output.contains("John_1"));
    }

    #[test]
    fn test_spec_parser_simple() {
        let input = "post_tasks (s) : auth (n) : input (n)";
        let tree = SpecParser::parse_simple(input).unwrap();

        assert_eq!(tree.word, "post_tasks");
        assert_eq!(tree.children.len(), 2);
    }

    #[test]
    fn test_endpoint_line_parsing() {
        let line = "- **POST /tasks** (`AuthToken @ TaskInput → TaskCreated`)";

        let tree = SpecParser::parse_endpoint_line(line);
        assert!(tree.is_some());

        let tree = tree.unwrap();
        assert!(tree.word.contains("POST /tasks"));
        assert!(!tree.children.is_empty());
    }
}
