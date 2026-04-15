//! Kitty Parsers: CCG and DisCoCat Parsing
//!
//! Ported from lambeq's text2diagram/ccg*.py and bobcat/*.py
//!
//! Provides:
//! - CCGType: Combinatory Categorial Grammar types with directions
//! - CCGParser: Chart parsing with supertagging
//! - CCG-to-Pregroup conversion
//! - Natural language → formal specification pipeline

use crate::kitty::diagram::{Box, Diagram};
use crate::kitty::tree::{PregroupTreeNode, SpecParser};
use crate::kitty::types::PregroupType;
use std::collections::HashMap;

/// Direction for CCG types
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash)]
pub enum Direction {
    /// Right: X/Y means Y is on the right
    Right,  // /
    /// Left: X\Y means Y is on the left
    Left,   // \
}

impl Direction {
    pub fn opposite(&self) -> Self {
        match self {
            Direction::Right => Direction::Left,
            Direction::Left => Direction::Right,
        }
    }

    pub fn from_char(c: char) -> Option<Self> {
        match c {
            '/' => Some(Direction::Right),
            '\\' => Some(Direction::Left),
            _ => None,
        }
    }

    pub fn to_char(&self) -> char {
        match self {
            Direction::Right => '/',
            Direction::Left => '\\',
        }
    }
}

impl std::fmt::Display for Direction {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        write!(f, "{}", self.to_char())
    }
}

/// A CCG type
///
/// Either atomic or complex:
/// - Atomic: just a name like "n", "s", "np"
/// - Complex: result direction argument like "s/np" or "np\n"
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum CCGType {
    /// Atomic type with name
    Atomic { name: String },
    /// Complex type: result direction argument
    Complex {
        result: std::boxed::Box<CCGType>,
        direction: Direction,
        argument: std::boxed::Box<CCGType>,
    },
}

impl CCGType {
    /// Create atomic type
    pub fn atomic(name: impl Into<String>) -> Self {
        Self::Atomic { name: name.into() }
    }

    /// Create complex type
    pub fn complex(result: CCGType, direction: Direction, argument: CCGType) -> Self {
        Self::Complex {
            result: std::boxed::Box::new(result),
            direction,
            argument: std::boxed::Box::new(argument),
        }
    }

    /// Check if atomic
    pub fn is_atomic(&self) -> bool {
        matches!(self, Self::Atomic { .. })
    }

    /// Check if complex
    pub fn is_complex(&self) -> bool {
        matches!(self, Self::Complex { .. })
    }

    /// Check if argument appears on right (X/Y)
    pub fn is_over(&self) -> bool {
        matches!(self, Self::Complex { direction: Direction::Right, .. })
    }

    /// Check if argument appears on left (X\Y)
    pub fn is_under(&self) -> bool {
        matches!(self, Self::Complex { direction: Direction::Left, .. })
    }

    /// Convert to pregroup type
    ///
    /// CCG X/Y → pregroup X @ Y.r
    /// CCG X\Y → pregroup X @ Y.l
    pub fn to_pregroup(&self) -> Vec<PregroupType> {
        match self {
            Self::Atomic { name } => {
                vec![PregroupType::atomic(name.clone())]
            }
            Self::Complex { result, direction, argument } => {
                let mut types = result.to_pregroup();
                let arg_types = argument.to_pregroup();

                // Take first type of argument and add adjoint
                if let Some(first_arg) = arg_types.first() {
                    let adjoint = match direction {
                        Direction::Right => first_arg.adjoint_right(),
                        Direction::Left => first_arg.adjoint_left(),
                    };
                    types.push(adjoint);
                }

                types
            }
        }
    }

    /// Parse from string
    pub fn parse(s: &str) -> Result<Self, String> {
        Self::parse_with_index(s, 0).map(|(t, _)| t)
    }

    fn parse_with_index(s: &str, start: usize) -> Result<(Self, usize), String> {
        // Find first / or \ outside parentheses
        let mut depth = 0;
        let mut i = start;

        while i < s.len() {
            let c = s.chars().nth(i).unwrap();

            match c {
                '(' => depth += 1,
                ')' => depth -= 1,
                '/' | '\\' if depth == 0 => {
                    // Found separator
                    let left = &s[start..i];
                    let dir = Direction::from_char(c).unwrap();

                    let (result, _) = if left.starts_with('(') && left.ends_with(')') {
                        Self::parse_with_index(&left[1..left.len()-1], 0)?
                    } else {
                        (Self::atomic(left.trim()), left.len())
                    };

                    // Parse argument (remainder)
                    let (argument, consumed) = Self::parse_with_index(s, i + 1)?;
                    return Ok((
                        Self::complex(result, dir, argument),
                        consumed
                    ));
                }
                _ => {}
            }

            i += 1;
        }

        // Atomic type
        let name = s[start..].trim().to_string();
        if name.is_empty() {
            return Err("Empty type name".to_string());
        }

        Ok((Self::atomic(name), s.len()))
    }
}

impl std::fmt::Display for CCGType {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::Atomic { name } => write!(f, "{}", name),
            Self::Complex { result, direction, argument } => {
                if result.is_complex() {
                    write!(f, "({}){} {}", result, direction, argument)
                } else {
                    write!(f, "{}{} {}", result, direction, argument)
                }
            }
        }
    }
}

/// CCG Grammar rule
#[derive(Debug, Clone, Copy)]
pub enum CCGRule {
    /// Forward application: X/Y Y → X
    ForwardApp,
    /// Backward application: Y X\Y → X
    BackwardApp,
    /// Forward composition: X/Y Y/Z → X/Z
    ForwardComp,
    /// Backward composition: Y\Z X\Y → X\Z
    BackwardComp,
    /// Forward crossing: X/Y Y\Z → X\Z
    ForwardCross,
    /// Backward crossing: Y/Z X\Y → X/Z
    BackwardCross,
    /// Type raising: X → T/(T\X) or T\(T/X)
    TypeRaise,
}

impl CCGRule {
    pub fn apply(&self, left: &CCGType, right: &CCGType) -> Option<CCGType> {
        match self {
            Self::ForwardApp => {
                // X/Y Y → X
                if let CCGType::Complex { result, direction: Direction::Right, argument } = left {
                    if argument.as_ref() == right {
                        return Some((**result).clone());
                    }
                }
                None
            }
            Self::BackwardApp => {
                // Y X\Y → X
                if let CCGType::Complex { result, direction: Direction::Left, argument } = right {
                    if argument.as_ref() == left {
                        return Some((**result).clone());
                    }
                }
                None
            }
            _ => None, // Other rules for future implementation
        }
    }
}

/// A CCG parse tree node
#[derive(Debug, Clone)]
pub struct CCGTree {
    pub typ: CCGType,
    pub rule: Option<CCGRule>,
    pub left: Option<std::boxed::Box<CCGTree>>,
    pub right: Option<std::boxed::Box<CCGTree>>,
    pub word: Option<String>,
    pub span: (usize, usize),
}

impl CCGTree {
    /// Create leaf node (word)
    pub fn leaf(word: impl Into<String>, typ: CCGType, position: usize) -> Self {
        Self {
            typ,
            rule: None,
            left: None,
            right: None,
            word: Some(word.into()),
            span: (position, position + 1),
        }
    }

    /// Create internal node (rule application)
    pub fn node(rule: CCGRule, typ: CCGType, left: CCGTree, right: CCGTree) -> Self {
        let left_start = left.span.0;
        let right_end = right.span.1;
        Self {
            typ,
            rule: Some(rule),
            left: Some(std::boxed::Box::new(left)),
            right: Some(std::boxed::Box::new(right)),
            word: None,
            span: (left_start, right_end),
        }
    }

    /// Check if leaf
    pub fn is_leaf(&self) -> bool {
        self.word.is_some()
    }

    /// Get all words in order
    pub fn words(&self) -> Vec<(usize, String, CCGType)> {
        let mut words = vec![];
        self.collect_words(&mut words);
        words.sort_by_key(|(idx, _, _)| *idx);
        words
    }

    fn collect_words(&self, words: &mut Vec<(usize, String, CCGType)>) {
        if let Some(ref w) = self.word {
            words.push((self.span.0, w.clone(), self.typ.clone()));
        }
        if let Some(ref left) = self.left {
            left.collect_words(words);
        }
        if let Some(ref right) = self.right {
            right.collect_words(words);
        }
    }

    /// Convert to pregroup diagram
    pub fn to_diagram(&self) -> Diagram {
        // Convert to pregroup tree first
        let tree = self.to_pregroup_tree();
        // Then to diagram
        crate::kitty::tree::tree_to_diagram(&tree)
    }

    /// Convert to pregroup tree
    fn to_pregroup_tree(&self) -> PregroupTreeNode {
        let words = self.words();
        let root = words.last().cloned();

        let (root_word, root_idx, root_type) = if let Some((idx, word, ccg_type)) = root {
            let pregroup_types = ccg_type.to_pregroup();
            let typ = pregroup_types.first()
                .cloned()
                .unwrap_or_else(|| PregroupType::atomic("s"));
            (word, idx, typ)
        } else {
            ("root".to_string(), 0, PregroupType::atomic("s"))
        };

        let mut root_node = PregroupTreeNode::new(root_word, root_idx, root_type);

        // Add children
        for (i, (idx, word, ccg_type)) in words.iter().enumerate().take(words.len() - 1) {
            let pregroup_types = ccg_type.to_pregroup();
            let typ = pregroup_types.first()
                .cloned()
                .unwrap_or_else(|| PregroupType::atomic("n"));

            let child = PregroupTreeNode::new(word.clone(), *idx, typ);
            root_node.add_child(child);
        }

        root_node
    }
}

/// Simple rule-based CCG parser
pub struct SimpleCCGParser {
    /// Lexicon: word → possible types
    lexicon: HashMap<String, Vec<CCGType>>,
    /// Root categories to accept
    root_cats: Vec<String>,
}

impl SimpleCCGParser {
    pub fn new() -> Self {
        let mut lexicon = HashMap::new();

        // Basic English lexicon for API descriptions
        lexicon.insert("create".to_string(), vec![
            CCGType::parse("s/np").unwrap(),
        ]);
        lexicon.insert("get".to_string(), vec![
            CCGType::parse("s/np").unwrap(),
        ]);
        lexicon.insert("update".to_string(), vec![
            CCGType::parse("s/np").unwrap(),
        ]);
        lexicon.insert("delete".to_string(), vec![
            CCGType::parse("s/np").unwrap(),
        ]);
        lexicon.insert("a".to_string(), vec![
            CCGType::parse("np/n").unwrap(),
        ]);
        lexicon.insert("the".to_string(), vec![
            CCGType::parse("np/n").unwrap(),
        ]);
        lexicon.insert("task".to_string(), vec![
            CCGType::atomic("n"),
        ]);
        lexicon.insert("user".to_string(), vec![
            CCGType::atomic("n"),
        ]);
        lexicon.insert("with".to_string(), vec![
            CCGType::parse("(s\\np)\\(s\\np)").unwrap(),
        ]);

        Self {
            lexicon,
            root_cats: vec!["s".to_string()],
        }
    }

    /// Parse sentence into CCG tree
    pub fn parse(&self, sentence: &str) -> Result<CCGTree, String> {
        let words: Vec<_> = sentence.split_whitespace().collect();

        // Chart parsing (Cyk algorithm variant)
        let n = words.len();

        // chart[i][j] = possible parses for span i..j
        let mut chart: Vec<Vec<Vec<CCGTree>>> = vec![vec![vec![]; n + 1]; n];

        // Initialize with lexical items
        for (i, word) in words.iter().enumerate() {
            let types = self.lexicon.get(*word).cloned()
                .unwrap_or_else(|| vec![CCGType::atomic("n")]);

            for typ in types {
                chart[i][i + 1].push(CCGTree::leaf(*word, typ, i));
            }
        }

        // Fill chart
        for span in 2..=n {
            for i in 0..=(n - span) {
                let j = i + span;

                for k in (i + 1)..j {
                    // Try combining chart[i][k] with chart[k][j]
                    let left_trees = chart[i][k].clone();
                    let right_trees = chart[k][j].clone();

                    for left in &left_trees {
                        for right in &right_trees {
                            // Try all rules
                            for rule in &[CCGRule::ForwardApp, CCGRule::BackwardApp] {
                                if let Some(result) = rule.apply(&left.typ, &right.typ) {
                                    chart[i][j].push(CCGTree::node(
                                        *rule,
                                        result,
                                        left.clone(),
                                        right.clone()
                                    ));
                                }
                            }
                        }
                    }
                }
            }
        }

        // Find valid parses
        let parses: Vec<_> = chart[0][n].iter()
            .filter(|t| self.root_cats.contains(&t.typ.to_string()))
            .cloned()
            .collect();

        if parses.is_empty() {
            return Err(format!("No valid parse for: {}", sentence));
        }

        // Return first parse (could return all or use beam search)
        Ok(parses[0].clone())
    }
}

/// Natural language API specification parser
pub struct NLAPIParser {
    ccg_parser: SimpleCCGParser,
}

impl NLAPIParser {
    pub fn new() -> Self {
        Self {
            ccg_parser: SimpleCCGParser::new(),
        }
    }

    /// Parse natural language description into API specification
    ///
    /// Example: "create a task" → POST /tasks endpoint
    pub fn parse(&self, description: &str) -> Result<APIEndpoint, String> {
        let ccg_tree = self.ccg_parser.parse(description)?;
        let diagram = ccg_tree.to_diagram();

        // Extract endpoint info from diagram
        let words = diagram.words();
        let method = self.infer_method(&words);
        let path = self.infer_path(&words);

        Ok(APIEndpoint {
            method,
            path,
            description: description.to_string(),
            diagram,
        })
    }

    fn infer_method(&self, words: &Vec<&Box>) -> String {
        for word in words {
            if let Some(name) = word.name() {
                match name {
                    "create" | "POST" => return "POST".to_string(),
                    "get" | "GET" => return "GET".to_string(),
                    "update" | "PUT" => return "PUT".to_string(),
                    "delete" | "DELETE" => return "DELETE".to_string(),
                    _ => {}
                }
            }
        }
        "GET".to_string() // Default
    }

    fn infer_path(&self, words: &Vec<&Box>) -> String {
        // Extract nouns as path components
        let nouns: Vec<_> = words.iter()
            .filter(|w| {
                if let Some(name) = w.name() {
                    matches!(name, "task" | "user" | "project")
                } else {
                    false
                }
            })
            .filter_map(|w| w.name())
            .collect();

        if nouns.is_empty() {
            "/".to_string()
        } else {
            format!("/{}", nouns.join("s/"))
        }
    }
}

/// Parsed API endpoint from natural language
#[derive(Debug, Clone)]
pub struct APIEndpoint {
    pub method: String,
    pub path: String,
    pub description: String,
    pub diagram: Diagram,
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_ccg_type_atomic() {
        let t = CCGType::atomic("np");
        assert!(t.is_atomic());
        assert!(!t.is_complex());
        assert_eq!(t.to_string(), "np");
    }

    #[test]
    fn test_ccg_type_complex() {
        let np = CCGType::atomic("np");
        let s = CCGType::atomic("s");
        let complex = CCGType::complex(s, Direction::Right, np);

        assert!(complex.is_complex());
        assert!(complex.is_over());
        assert_eq!(complex.to_string(), "s/ np");
    }

    #[test]
    fn test_ccg_parse() {
        let t = CCGType::parse("s/np").unwrap();
        assert!(t.is_complex());
        assert!(t.is_over());

        let t = CCGType::parse("np\\n").unwrap();
        assert!(t.is_under());
    }

    #[test]
    fn test_ccg_to_pregroup() {
        let s_np = CCGType::parse("s/np").unwrap();
        let pregroup = s_np.to_pregroup();

        assert_eq!(pregroup.len(), 2);
        assert_eq!(pregroup[0].to_string(), "s");
        assert_eq!(pregroup[1].to_string(), "np.r");
    }

    #[test]
    fn test_rule_application() {
        let s_np = CCGType::parse("s/np").unwrap();
        let np = CCGType::atomic("np");

        let result = CCGRule::ForwardApp.apply(&s_np, &np);
        assert!(result.is_some());
        assert_eq!(result.unwrap().to_string(), "s");
    }

    #[test]
    fn test_simple_parser() {
        let parser = SimpleCCGParser::new();

        // Test lexical lookup
        let result = parser.parse("create a task");
        assert!(result.is_ok());

        let tree = result.unwrap();
        assert_eq!(tree.typ.to_string(), "s");
    }

    #[test]
    fn test_direction() {
        let right = Direction::Right;
        let left = Direction::Left;

        assert_eq!(right.opposite(), Direction::Left);
        assert_eq!(left.opposite(), Direction::Right);
        assert_eq!(right.to_char(), '/');
        assert_eq!(left.to_char(), '\\');
    }
}
