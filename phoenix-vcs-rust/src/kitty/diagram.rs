//! Kitty Diagrams: String Diagrams for Categorical Composition
//!
//! Ported from lambeq's backend/grammar.py
//! Provides monoidal string diagrams for representing:
//! - API endpoints as boxes with input/output types
//! - Connections as cups between matching types
//! - Sequential (;) and tensor (@) composition

use crate::kitty::types::PregroupType;
use std::fmt;

/// A layer in a string diagram.
///
/// Each layer represents a box sitting on wires, with:
/// - `left`: types to the left of the box
/// - `box`: the box itself (generator)
/// - `right`: types to the right of the box
#[derive(Debug, Clone)]
pub struct Layer {
    /// Types to the left of the box
    pub left: Vec<PregroupType>,
    /// The box (generator)
    pub inner_box: Box,
    /// Types to the right of the box
    pub right: Vec<PregroupType>,
}

impl Layer {
    pub fn new(left: Vec<PregroupType>, box_: Box, right: Vec<PregroupType>) -> Self {
        Self {
            left,
            inner_box: box_,
            right,
        }
    }

    /// Get the domain (input types) of this layer
    pub fn dom(&self) -> Vec<PregroupType> {
        let mut dom = self.left.clone();
        dom.extend(self.inner_box.dom());
        dom.extend(self.right.clone());
        dom
    }

    /// Get the codomain (output types) of this layer
    pub fn cod(&self) -> Vec<PregroupType> {
        let mut cod = self.left.clone();
        cod.extend(self.inner_box.cod());
        cod.extend(self.right.clone());
        cod
    }
}

impl fmt::Display for Layer {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        write!(f, "{:?} {} {:?}", self.left, self.inner_box, self.right)
    }
}

/// A box (generator) in a string diagram.
///
/// Boxes represent the basic building blocks:
/// - `Word`: API endpoints, functions, values
/// - `Cup`: Connection when types match (adjunction)
/// - `Cap`: Creation of a pair of types
/// - `Swap`: Reordering of wires
/// - `Spider`: Merging/splitting of types (for special cases)
#[derive(Debug, Clone)]
pub enum Box {
    /// A word (lexical item) with domain and codomain types
    Word {
        name: String,
        dom: Vec<PregroupType>,
        cod: Vec<PregroupType>,
        /// Index in the original sentence/spec
        index: Option<usize>,
    },
    /// Cup: connects two types that are adjoints of each other
    /// (n @ n.r → unit)
    Cup {
        left: PregroupType,
        right: PregroupType,
    },
    /// Cap: creates a pair of types from unit
    /// (unit → n @ n.r)
    Cap {
        left: PregroupType,
        right: PregroupType,
    },
    /// Swap: exchanges two types
    Swap {
        left: PregroupType,
        right: PregroupType,
    },
    /// Spider: special Frobenius algebra structure for merging/splitting
    Spider {
        typ: PregroupType,
        n_legs_in: usize,
        n_legs_out: usize,
    },
    /// Identity on a type
    Id(PregroupType),
}

impl Box {
    /// Create a word box
    pub fn word(name: impl Into<String>, dom: Vec<PregroupType>, cod: Vec<PregroupType>) -> Self {
        Self::Word {
            name: name.into(),
            dom,
            cod,
            index: None,
        }
    }

    /// Create a word with index
    pub fn word_indexed(name: impl Into<String>, index: usize, dom: Vec<PregroupType>, cod: Vec<PregroupType>) -> Self {
        Self::Word {
            name: name.into(),
            dom,
            cod,
            index: Some(index),
        }
    }

    /// Create a cup between two types
    pub fn cup(left: PregroupType, right: PregroupType) -> Result<Self, String> {
        if left.can_connect(&right) {
            Ok(Self::Cup { left, right })
        } else {
            Err(format!("Cannot create cup: {} and {} are not adjoints", left, right))
        }
    }

    /// Create a cap for a type
    pub fn cap(typ: &PregroupType) -> Self {
        let left = typ.clone();
        let right = typ.adjoint_right();
        Self::Cap { left, right }
    }

    /// Create an identity box
    pub fn id(typ: PregroupType) -> Self {
        Self::Id(typ)
    }

    /// Get the domain (input types)
    pub fn dom(&self) -> Vec<PregroupType> {
        match self {
            Box::Word { dom, .. } => dom.clone(),
            Box::Cup { left, right } => vec![left.clone(), right.clone()],
            Box::Cap { .. } => vec![],
            Box::Swap { left, right } => vec![left.clone(), right.clone()],
            Box::Spider { typ, n_legs_in, .. } => {
                (0..*n_legs_in).map(|_| typ.clone()).collect()
            }
            Box::Id(t) => vec![t.clone()],
        }
    }

    /// Get the codomain (output types)
    pub fn cod(&self) -> Vec<PregroupType> {
        match self {
            Box::Word { cod, .. } => cod.clone(),
            Box::Cup { .. } => vec![],
            Box::Cap { left, right } => vec![left.clone(), right.clone()],
            Box::Swap { left, right } => vec![right.clone(), left.clone()],
            Box::Spider { typ, n_legs_out, .. } => {
                (0..*n_legs_out).map(|_| typ.clone()).collect()
            }
            Box::Id(t) => vec![t.clone()],
        }
    }

    /// Get the name (for words)
    pub fn name(&self) -> Option<&str> {
        match self {
            Box::Word { name, .. } => Some(name),
            _ => None,
        }
    }

    /// Check if this is a cup
    pub fn is_cup(&self) -> bool {
        matches!(self, Box::Cup { .. })
    }

    /// Check if this is a word
    pub fn is_word(&self) -> bool {
        matches!(self, Box::Word { .. })
    }
}

impl fmt::Display for Box {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            Box::Word { name, dom, cod, .. } => {
                let dom_str = if dom.is_empty() {
                    "unit".to_string()
                } else {
                    dom.iter().map(|t| t.to_string()).collect::<Vec<_>>().join(" @ ")
                };
                let cod_str = if cod.is_empty() {
                    "unit".to_string()
                } else {
                    cod.iter().map(|t| t.to_string()).collect::<Vec<_>>().join(" @ ")
                };
                write!(f, "{}: {} → {}", name, dom_str, cod_str)
            }
            Box::Cup { left, right } => {
                write!(f, "Cup({}, {})", left, right)
            }
            Box::Cap { left, right } => {
                write!(f, "Cap({}, {})", left, right)
            }
            Box::Swap { left, right } => {
                write!(f, "Swap({}, {})", left, right)
            }
            Box::Spider { typ, n_legs_in, n_legs_out } => {
                write!(f, "Spider({}: {} → {})", typ, n_legs_in, n_legs_out)
            }
            Box::Id(t) => {
                write!(f, "Id({})", t)
            }
        }
    }
}

/// A string diagram.
///
/// Represents a morphism in a monoidal category as a list of layers.
/// Each layer sits on top of the previous one, composing sequentially.
///
/// # Examples
/// ```
/// use phoenix_vcs::kitty::{PregroupType, Diagram, Box};
///
/// // Create endpoint: POST /tasks
/// let auth = PregroupType::atomic("AuthToken");
/// let input = PregroupType::atomic("TaskInput");
/// let output = PregroupType::atomic("TaskCreated");
///
/// let post_tasks = Box::word("POST /tasks",
///     vec![auth.clone(), input.clone()],
///     vec![output.clone()]);
///
/// let diagram = Diagram::from_box(post_tasks);
/// ```
#[derive(Debug, Clone)]
pub struct Diagram {
    layers: Vec<Layer>,
}

impl Diagram {
    /// Create empty diagram
    pub fn empty() -> Self {
        Self { layers: vec![] }
    }

    /// Create diagram from layers (for advanced composition)
    pub fn from_layers(layers: Vec<Layer>) -> Self {
        Self { layers }
    }

    /// Create diagram from a single box
    pub fn from_box(box_: Box) -> Self {
        let dom = box_.dom();
        let left = vec![];
        let right = vec![];

        Self {
            layers: vec![Layer::new(left, box_, right)],
        }
    }

    /// Create identity diagram on a type
    pub fn id(typ: PregroupType) -> Self {
        Self::from_box(Box::Id(typ))
    }

    /// Create identity on multiple types
    pub fn id_n(types: Vec<PregroupType>) -> Self {
        if types.is_empty() {
            Self::empty()
        } else if types.len() == 1 {
            Self::id(types.into_iter().next().unwrap())
        } else {
            // Create tensor of identities
            let boxes: Vec<_> = types.into_iter()
                .map(|t| Box::Id(t))
                .collect();
            Self::tensor_n(&boxes.iter()
                .map(|b| Self::from_box(b.clone()))
                .collect::<Vec<_>>())
        }
    }

    /// Sequential composition: self ; other
    /// (output of self feeds into input of other)
    pub fn then(&self, other: &Self) -> Result<Self, String> {
        if self.cod() != other.dom() {
            return Err(format!(
                "Cannot compose: cod {:?} != dom {:?}",
                self.cod(), other.dom()
            ));
        }

        let mut layers = self.layers.clone();
        layers.extend(other.layers.clone());

        Ok(Self { layers })
    }

    /// Tensor (parallel) composition: self @ other
    pub fn tensor(&self, other: &Self) -> Self {
        // Interleave layers from both diagrams
        let max_len = self.layers.len().max(other.layers.len());
        let mut layers = Vec::new();

        for i in 0..max_len {
            if i < self.layers.len() && i < other.layers.len() {
                // Merge layers side by side
                let left = &self.layers[i];
                let right = &other.layers[i];

                let merged_left: Vec<_> = left.left.iter()
                    .cloned()
                    .chain(right.left.iter().cloned())
                    .collect();

                let merged_box = Box::tensor_boxes(&left.inner_box, &right.inner_box);

                let merged_right: Vec<_> = left.right.iter()
                    .cloned()
                    .chain(right.right.iter().cloned())
                    .collect();

                layers.push(Layer::new(merged_left, merged_box, merged_right));
            } else if i < self.layers.len() {
                // Only left has this layer
                layers.push(self.layers[i].clone());
            } else {
                // Only right has this layer
                layers.push(other.layers[i].clone());
            }
        }

        Self { layers }
    }

    /// Tensor of multiple diagrams
    pub fn tensor_n(diagrams: &[Self]) -> Self {
        if diagrams.is_empty() {
            return Self::empty();
        }

        diagrams.iter().skip(1).fold(diagrams[0].clone(), |acc, d| {
            acc.tensor(d)
        })
    }

    /// Get domain (input types)
    pub fn dom(&self) -> Vec<PregroupType> {
        if self.layers.is_empty() {
            vec![]
        } else {
            self.layers[0].dom()
        }
    }

    /// Get codomain (output types)
    pub fn cod(&self) -> Vec<PregroupType> {
        if self.layers.is_empty() {
            vec![]
        } else {
            self.layers[self.layers.len() - 1].cod()
        }
    }

    /// Get all layers
    pub fn layers(&self) -> &[Layer] {
        &self.layers
    }

    /// Get all boxes
    pub fn boxes(&self) -> Vec<&Box> {
        self.layers.iter().map(|l| &l.inner_box).collect()
    }

    /// Get all cups
    pub fn cups(&self) -> Vec<&Box> {
        self.boxes().into_iter()
            .filter(|b| b.is_cup())
            .collect()
    }

    /// Get all words
    pub fn words(&self) -> Vec<&Box> {
        self.boxes().into_iter()
            .filter(|b| b.is_word())
            .collect()
    }

    /// Check if this is an identity diagram
    pub fn is_id(&self) -> bool {
        self.layers.len() == 1 &&
            matches!(self.layers[0].inner_box, Box::Id(_))
    }

    /// Get the number of layers
    pub fn len(&self) -> usize {
        self.layers.len()
    }

    pub fn is_empty(&self) -> bool {
        self.layers.is_empty()
    }

    /// Add a cup to eliminate matching types
    pub fn add_cup(&self, position: usize) -> Result<Self, String> {
        if position >= self.cod().len() - 1 {
            return Err("Invalid cup position".to_string());
        }

        let left_types: Vec<_> = self.cod().iter().take(position).cloned().collect();
        let type1 = self.cod()[position].clone();
        let type2 = self.cod()[position + 1].clone();
        let right_types: Vec<_> = self.cod().iter().skip(position + 2).cloned().collect();

        let cup = Box::cup(type1, type2)?;

        let cup_layer = Layer::new(left_types, cup, right_types);

        let mut layers = self.layers.clone();
        layers.push(cup_layer);

        Ok(Self { layers })
    }

    /// Generate Mermaid diagram representation
    pub fn to_mermaid(&self) -> String {
        let mut output = String::from("graph TD\n");
        let mut node_id = 0;

        for (layer_idx, layer) in self.layers.iter().enumerate() {
            match &layer.inner_box {
                Box::Word { name, .. } => {
                    output.push_str(&format!("  node{}[\"{}\"]\n", node_id, name));
                    node_id += 1;
                }
                Box::Cup { left, right } => {
                    output.push_str(&format!("  cup{}[\"Cup: {} @ {}\"]\n",
                        node_id, left, right));
                    node_id += 1;
                }
                _ => {}
            }
        }

        output
    }
}

impl Box {
    /// Helper for tensor product of boxes
    fn tensor_boxes(left: &Self, right: &Self) -> Self {
        match (left, right) {
            (Box::Id(t1), Box::Id(t2)) => {
                Box::Id(t1.tensor(t2))
            }
            _ => {
                // For now, represent as spider or complex word
                Box::Word {
                    name: format!("({} @ {})", left, right),
                    dom: [left.dom(), right.dom()].concat(),
                    cod: [left.cod(), right.cod()].concat(),
                    index: None,
                }
            }
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kitty::types::PregroupType;

    #[test]
    fn test_word_box() {
        let auth = PregroupType::atomic("AuthToken");
        let input = PregroupType::atomic("TaskInput");
        let output = PregroupType::atomic("TaskCreated");

        let word = Box::word("POST /tasks",
            vec![auth.clone(), input.clone()],
            vec![output.clone()]);

        assert_eq!(word.dom().len(), 2);
        assert_eq!(word.cod().len(), 1);
        assert_eq!(word.name(), Some("POST /tasks"));
    }

    #[test]
    fn test_cup_creation() {
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();

        let cup = Box::cup(n.clone(), nr.clone());
        assert!(cup.is_ok());

        let cup = cup.unwrap();
        assert!(cup.is_cup());
        assert!(cup.dom().len() == 2);
        assert!(cup.cod().is_empty());
    }

    #[test]
    fn test_cup_invalid() {
        let n = PregroupType::atomic("n");
        let s = PregroupType::atomic("s");

        let cup = Box::cup(n, s);
        assert!(cup.is_err());
    }

    #[test]
    fn test_diagram_composition() {
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();

        // Create "John" diagram: unit → n
        let john = Diagram::from_box(Box::word("John",
            vec![], vec![n.clone()]));

        // Create "sleeps" diagram: n → s
        let sleeps = Diagram::from_box(Box::word("sleeps",
            vec![n.clone()], vec![PregroupType::atomic("s")]));

        // Compose: John ; sleeps
        let sentence = john.then(&sleeps);
        assert!(sentence.is_ok());
    }

    #[test]
    fn test_diagram_tensor() {
        let n = PregroupType::atomic("n");
        let s = PregroupType::atomic("s");

        let d1 = Diagram::from_box(Box::word("a", vec![], vec![n.clone()]));
        let d2 = Diagram::from_box(Box::word("b", vec![], vec![s.clone()]));

        let tensor = d1.tensor(&d2);
        assert_eq!(tensor.cod().len(), 2);
    }

    #[test]
    fn test_mermaid_output() {
        let n = PregroupType::atomic("n");
        let diagram = Diagram::from_box(Box::word("test", vec![], vec![n]));

        let mermaid = diagram.to_mermaid();
        assert!(mermaid.contains("graph TD"));
        assert!(mermaid.contains("test"));
    }
}
