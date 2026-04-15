//! Tensor Contraction: Solving Specifications via Categorical Tensor Networks
//!
//! This module implements the insight that:
//! - **Tensors are displaced scalars** (multi-dimensional values waiting for contraction)
//! - **Types are tensor indices** (pregroup types n, n.r are like tensor legs)
//! - **Cups are contractions** (connecting n ↔ n.r performs index summation)
//! - **Diagrams are tensor networks** (boxes = tensors, wires = shared indices)
//! - **Fully contracted diagrams = scalars = solved specs**
//!
//! The spec is "solved" when all internal wires are contracted, leaving only
//! the external interface (free wires) as the minimal viable specification.
//!
//! # Mathematical Foundation
//!
//! In a monoidal category, a morphism f: A → B can be seen as a tensor with:
//! - Input indices = domain A (contravariant/contravariant legs)
//! - Output indices = codomain B (covariant legs)
//! - Composition = tensor contraction over matching indices
//!
//! A cup η: I → A ⊗ A* is the unit that creates a pair of dual indices.
//! A cap ε: A* ⊗ A → I is the counit that contracts dual indices.
//!
//! The zigzag identity (ε ⊗ id) ∘ (id ⊗ η) = id is exactly tensor contraction!
//!
//! # Algorithm
//!
//! 1. **Parse** spec.md into diagram (tensor network)
//! 2. **Identify** contractible pairs (matching adjoints n ↔ n.r)
//! 3. **Contract** in optimal order (like tensor network optimization)
//! 4. **Result** is contracted diagram = simplified/verified specification
//!
//! # Example
//!
//! ```
//! POST /tasks: AuthToken @ TaskInput → TaskCreated
//! GET /tasks/:id: AuthToken @ TaskId → Task
//! Database: TaskCreated ↔ TaskId
//! ```
//!
//! Contracts to:
//! ```
//! POST /tasks → GET /tasks/:id  (chained via database connection)
//! AuthToken → AuthToken         (common input type, remains free)
//! ```

use crate::kitty::diagram::{Box, Diagram, Layer};
use crate::kitty::types::PregroupType;
use std::collections::{HashMap, HashSet};

/// A tensor view of a pregroup type.
///
/// In this view, each atomic type is an index with a "direction":
/// - z = 0: covariant index (output, ket)
/// - z > 0: contravariant index (input, bra)
///
/// A type like `n @ n.r` represents a tensor with one covariant and one
/// contravariant index - i.e., a linear map (matrix).
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct TensorIndex {
    pub name: String,
    pub dimension: usize,
    pub direction: IndexDirection,
    pub adjoint_order: i32, // z value: 0=base, >0=right adjoint, <0=left
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum IndexDirection {
    /// Covariant (output, like a ket |n⟩)
    Covariant,  // z = 0
    /// Contravariant (input, like a bra ⟨n|)
    Contravariant, // z ≠ 0, can connect to covariant
}

impl TensorIndex {
    pub fn from_pregroup(typ: &PregroupType, dim: usize) -> Vec<Self> {
        if typ.is_complex() {
            // Decompose tensor product into multiple indices
            typ.objects()
                .iter()
                .flat_map(|t| Self::from_pregroup(t, dim))
                .collect()
        } else if let Some(name) = typ.name() {
            let direction = if typ.z() == 0 {
                IndexDirection::Covariant
            } else {
                IndexDirection::Contravariant
            };

            vec![Self {
                name: name.to_string(),
                dimension: dim,
                direction,
                adjoint_order: typ.z(),
            }]
        } else {
            vec![]
        }
    }

    /// Check if this index can contract with another
    pub fn can_contract(&self, other: &Self) -> bool {
        // Same base name
        self.name == other.name
            // One covariant, one contravariant
            && self.direction != other.direction
            // Complementary adjoint orders (z values sum to 0 for base + adjoint)
            && (self.adjoint_order + other.adjoint_order == 0
                || (self.adjoint_order == 0 && other.adjoint_order != 0)
                || (self.adjoint_order != 0 && other.adjoint_order == 0))
    }

    /// Contract with another index, returning the result
    pub fn contract(&self, other: &Self) -> Result<ContractedIndex, String> {
        if !self.can_contract(other) {
            return Err(format!(
                "Cannot contract {} with {}",
                self.name, other.name
            ));
        }

        Ok(ContractedIndex {
            name: self.name.clone(),
            contraction_value: self.dimension, // The "trace" value
        })
    }
}

/// Result of contracting two indices
#[derive(Debug, Clone)]
pub struct ContractedIndex {
    pub name: String,
    pub contraction_value: usize,
}

/// A tensor view of a box in the diagram.
///
/// Each box is a tensor T^{i₁...iₙ}_{j₁...jₘ} where:
/// - Upper indices (i) = output types (covariant)
/// - Lower indices (j) = input types (contravariant)
#[derive(Debug, Clone)]
pub struct TensorView {
    pub name: String,
    pub indices: Vec<TensorIndex>,
    pub rank: (usize, usize), // (output_rank, input_rank)
}

impl TensorView {
    pub fn from_box(box_: &Box, default_dim: usize) -> Self {
        let name = box_.name().unwrap_or("unnamed").to_string();

        // Convert domain (inputs) to contravariant indices
        let mut indices = vec![];
        for typ in box_.dom() {
            let mut idxs = TensorIndex::from_pregroup(&typ, default_dim);
            // Domain types become contravariant
            for idx in &mut idxs {
                idx.direction = IndexDirection::Contravariant;
            }
            indices.extend(idxs);
        }

        // Convert codomain (outputs) to covariant indices
        let output_start = indices.len();
        for typ in box_.cod() {
            let mut idxs = TensorIndex::from_pregroup(&typ, default_dim);
            // Codomain types are covariant
            for idx in &mut idxs {
                idx.direction = IndexDirection::Covariant;
            }
            indices.extend(idxs);
        }

        let input_rank = output_start;
        let output_rank = indices.len() - output_start;

        Self {
            name,
            indices,
            rank: (output_rank, input_rank),
        }
    }

    /// Get all indices that can contract (contravariant ones looking for covariant partners)
    pub fn contractible_indices(&self) -> Vec<(usize, &TensorIndex)> {
        self.indices
            .iter()
            .enumerate()
            .filter(|(_, idx)| idx.direction == IndexDirection::Contravariant)
            .map(|(i, idx)| (i, idx))
            .collect()
    }

    /// Get free indices (not yet contracted)
    pub fn free_indices(&self) -> Vec<(usize, &TensorIndex)> {
        self.indices
            .iter()
            .enumerate()
            .collect()
    }
}

/// A contraction plan for a tensor network.
///
/// Similar to how tensor network algorithms optimize contraction order
/// (like in quantum computing or machine learning), we find the optimal
/// sequence of contractions to "solve" the specification.
#[derive(Debug, Clone)]
pub struct ContractionPlan {
    pub steps: Vec<ContractionStep>,
    pub estimated_complexity: f64,
    pub resulting_free_indices: Vec<String>,
}

#[derive(Debug, Clone)]
pub struct ContractionStep {
    pub step_number: usize,
    pub box_a: usize,  // Index into tensor list
    pub index_a: usize, // Index into box A's indices
    pub box_b: usize,  // Index into tensor list
    pub index_b: usize, // Index into box B's indices
    pub contracted_type: String,
}

/// Solves a specification by contracting the tensor network.
pub struct TensorContractor;

impl TensorContractor {
    /// Solve a diagram by finding and performing all possible contractions.
    ///
    /// This "evaluates" the categorical diagram to its simplest form,
    /// where all internal connections are made explicit and all contractible
    /// pairs are reduced.
    pub fn solve(diagram: &Diagram) -> SolvedSpec {
        let tensors: Vec<_> = diagram
            .boxes()
            .iter()
            .map(|b| TensorView::from_box(b, 2)) // Default dim = 2
            .collect();

        // Find all possible contractions
        let mut contractions = vec![];
        let mut contracted_pairs = HashSet::new();

        for (i, tensor_a) in tensors.iter().enumerate() {
            for (idx_a, index_a) in tensor_a.contractible_indices() {
                // Look for matching index in other tensors
                for (j, tensor_b) in tensors.iter().enumerate() {
                    if i == j {
                        continue;
                    } // Can't self-contract in this model

                    for (idx_b, index_b) in tensor_b.free_indices() {
                        // Check if already contracted
                        let pair = if i < j {
                            (i, idx_a, j, idx_b)
                        } else {
                            (j, idx_b, i, idx_a)
                        };

                        if contracted_pairs.contains(&pair) {
                            continue;
                        }

                        // Check if indices can contract
                        if index_a.can_contract(index_b) {
                            contractions.push(ContractionStep {
                                step_number: contractions.len(),
                                box_a: i,
                                index_a: idx_a,
                                box_b: j,
                                index_b: idx_b,
                                contracted_type: index_a.name.clone(),
                            });
                            contracted_pairs.insert(pair);
                        }
                    }
                }
            }
        }

        // Compute resulting free indices (external interface)
        let mut free_indices = HashSet::new();
        for (i, tensor) in tensors.iter().enumerate() {
            for (idx, index) in tensor.free_indices() {
                // Check if this index was contracted
                let was_contracted = contractions.iter().any(|c| {
                    (c.box_a == i && c.index_a == idx) || (c.box_b == i && c.index_b == idx)
                });

                // Also check if this box itself is a contraction (Cup, etc.)
                // Cups internally contract their indices
                let is_internal_contraction = matches!(
                    diagram.layers().get(i).map(|l| &l.inner_box),
                    Some(Box::Cup { .. })
                );

                if !was_contracted && !is_internal_contraction {
                    free_indices.insert(format!("{}.{}", tensor.name, index.name));
                }
            }
        }

        // Check if fully contracted before moving free_indices
        let is_fully_contracted = free_indices.is_empty();

        // Estimate complexity (similar to tensor network cost)
        let complexity: f64 = contractions
            .iter()
            .map(|c| {
                let dim_a = tensors[c.box_a].indices[c.index_a].dimension as f64;
                let dim_b = tensors[c.box_b].indices[c.index_b].dimension as f64;
                dim_a * dim_b
            })
            .sum();

        SolvedSpec {
            original: diagram.clone(),
            contractions,
            free_interface: free_indices.into_iter().collect(),
            complexity,
            is_fully_contracted,
        }
    }

    /// Greedy contraction: always contract the smallest indices first
    /// (like optimal tensor network contraction)
    pub fn solve_greedy(diagram: &Diagram) -> SolvedSpec {
        let mut result = Self::solve(diagram);

        // Sort contractions by complexity (ascending)
        result
            .contractions
            .sort_by_key(|c| c.box_a + c.box_b); // Simplified heuristic

        result
    }

    /// Find the "scalar" form - maximum contraction
    ///
    /// This finds the closest we can get to a fully contracted diagram,
    /// revealing the "essential" specification without redundant connections.
    pub fn find_scalar_form(diagram: &Diagram) -> Option<Diagram> {
        let solved = Self::solve(diagram);

        // If already fully contracted, return as-is
        if solved.is_fully_contracted {
            return Some(diagram.clone());
        }

        // Otherwise, construct a new diagram with only free wires as external
        // and all contracted pairs as explicit cups
        let mut new_layers = vec![];

        // Add all original boxes
        for layer in diagram.layers() {
            new_layers.push(layer.clone());
        }

        // Add explicit cups for each contraction
        for step in &solved.contractions {
            // In a real implementation, we'd add Cup layers here
            // For now, this is conceptual
            let _ = (step.box_a, step.box_b); // Use step values
        }

        // This is a simplified version - full implementation would
        // actually reconstruct the diagram with optimal cup placement
        Some(Diagram::from_layers(new_layers))
    }

    /// Compute the "value" of a fully contracted diagram
    ///
    /// For a closed diagram (no free wires), this computes a scalar
    /// "score" representing the complexity/simplicity of the spec.
    pub fn compute_scalar_value(diagram: &Diagram) -> f64 {
        let solved = Self::solve(diagram);

        if !solved.is_fully_contracted {
            return f64::INFINITY; // Can't compute for open diagrams
        }

        // Scalar "value" is inverse of complexity (simpler = better)
        1.0 / (1.0 + solved.complexity)
    }

    /// Check if a spec is "solvable" (all types can be connected)
    pub fn is_solvable(diagram: &Diagram) -> bool {
        let tensors: Vec<_> = diagram
            .boxes()
            .iter()
            .map(|b| TensorView::from_box(b, 2))
            .collect();

        // Count occurrences of each base type by direction
        let mut type_counts: HashMap<String, (i32, i32)> = HashMap::new(); // (covariant, contravariant)

        for tensor in &tensors {
            for (_, index) in tensor.free_indices() {
                let entry = type_counts
                    .entry(index.name.clone())
                    .or_insert((0, 0));

                match index.direction {
                    IndexDirection::Covariant => entry.0 += 1,
                    IndexDirection::Contravariant => entry.1 += 1,
                }
            }
        }

        // A spec is solvable if for every type, covariant count == contravariant count
        // (every output has a matching input)
        type_counts
            .values()
            .all(|(cov, contra)| cov == contra)
    }
}

/// A solved specification - the result of tensor contraction
#[derive(Debug, Clone)]
pub struct SolvedSpec {
    pub original: Diagram,
    pub contractions: Vec<ContractionStep>,
    pub free_interface: Vec<String>,
    pub complexity: f64,
    pub is_fully_contracted: bool,
}

impl SolvedSpec {
    /// Generate a human-readable summary
    pub fn summary(&self) -> String {
        let mut output = String::new();

        output.push_str(&format!("Solved Specification\n"));
        output.push_str(&format!("==================\n"));
        output.push_str(&format!(
            "Contractions performed: {}\n",
            self.contractions.len()
        ));
        output.push_str(&format!("Complexity score: {:.2}\n", self.complexity));
        output.push_str(&format!(
            "Fully contracted: {}\n",
            self.is_fully_contracted
        ));

        if !self.free_interface.is_empty() {
            output.push_str(&format!("\nFree interface (external):\n"));
            for idx in &self.free_interface {
                output.push_str(&format!("  - {}\n", idx));
            }
        }

        output.push_str(&format!("\nContraction sequence:\n"));
        for step in &self.contractions {
            output.push_str(&format!(
                "  {}. {}.{} ↔ {}.{} ({})\n",
                step.step_number,
                step.box_a,
                step.index_a,
                step.box_b,
                step.index_b,
                step.contracted_type
            ));
        }

        output
    }

    /// Generate Mermaid diagram showing contractions
    pub fn to_contraction_mermaid(&self) -> String {
        let mut output = String::from("graph TD\n");

        // Add nodes for original boxes
        for (i, layer) in self.original.layers().iter().enumerate() {
            if let Some(name) = layer.inner_box.name() {
                output.push_str(&format!("  box{}[\"{}\"]\n", i, name));
            }
        }

        // Add contraction edges
        for step in &self.contractions {
            output.push_str(&format!(
                "  box{} -- \"{}\" --> box{}\n",
                step.box_a, step.contracted_type, step.box_b
            ));
        }

        output
    }
}

/// Extension trait for diagram contraction
pub trait TensorContractExt {
    /// Solve this diagram via tensor contraction
    fn solve(&self) -> SolvedSpec;

    /// Check if solvable (type balanced)
    fn is_solvable(&self) -> bool;

    /// Get tensor view
    fn as_tensor_network(&self) -> Vec<TensorView>;

    /// Compute scalar value if fully contracted
    fn scalar_value(&self) -> Option<f64>;
}

impl TensorContractExt for Diagram {
    fn solve(&self) -> SolvedSpec {
        TensorContractor::solve(self)
    }

    fn is_solvable(&self) -> bool {
        TensorContractor::is_solvable(self)
    }

    fn as_tensor_network(&self) -> Vec<TensorView> {
        self.boxes()
            .iter()
            .map(|b| TensorView::from_box(b, 2))
            .collect()
    }

    fn scalar_value(&self) -> Option<f64> {
        let solved = self.solve();
        if solved.is_fully_contracted {
            Some(solved.complexity.recip())
        } else {
            None
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kitty::types::PregroupType;

    #[test]
    fn test_tensor_index_from_pregroup() {
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();

        let n_indices = TensorIndex::from_pregroup(&n, 2);
        assert_eq!(n_indices.len(), 1);
        assert_eq!(n_indices[0].name, "n");
        assert_eq!(n_indices[0].direction, IndexDirection::Covariant);

        let nr_indices = TensorIndex::from_pregroup(&nr, 2);
        assert_eq!(nr_indices[0].direction, IndexDirection::Contravariant);
    }

    #[test]
    fn test_can_contract() {
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();

        let n_idx = &TensorIndex::from_pregroup(&n, 2)[0];
        let nr_idx = &TensorIndex::from_pregroup(&nr, 2)[0];

        assert!(n_idx.can_contract(nr_idx));
        assert!(nr_idx.can_contract(n_idx));

        // Same type cannot contract
        let n2_idx = &TensorIndex::from_pregroup(&n, 2)[0];
        assert!(!n_idx.can_contract(n2_idx));
    }

    #[test]
    fn test_simple_diagram_solve() {
        // Simple: n → n (identity)
        let n = PregroupType::atomic("n");
        let word = Box::word("id", vec![n.clone()], vec![n]);
        let diagram = Diagram::from_box(word);

        let solved = TensorContractor::solve(&diagram);
        println!("{}", solved.summary());

        // Should have one free index (not contracted since only one box)
        assert!(!solved.is_fully_contracted);
        assert!(!solved.free_interface.is_empty());
    }

    #[test]
    fn test_contractible_pair() {
        // n @ n.r → I (cup)
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();

        let cup = Box::cup(n, nr).unwrap();
        let diagram = Diagram::from_box(cup);

        let solved = diagram.solve();
        println!("\nCup diagram solved:\n{}", solved.summary());

        // A cup should be fully contracted
        assert!(solved.is_fully_contracted);
        assert!(solved.free_interface.is_empty());
    }

    #[test]
    fn test_is_solvable() {
        // Balanced: n → n (solvable)
        let n = PregroupType::atomic("n");
        let n2 = n.clone();
        let balanced = Diagram::from_box(Box::word("f", vec![n.clone()], vec![n2]));
        assert!(balanced.is_solvable());

        // Unbalanced: n → n @ n (not solvable - two outputs, one input)
        let n_for_input = n.clone();
        let double_n = n.tensor(&n_for_input);
        let unbalanced = Diagram::from_box(Box::word("g", vec![n], vec![double_n]));
        assert!(!unbalanced.is_solvable());
    }

    #[test]
    fn test_api_endpoint_as_tensor() {
        let auth = PregroupType::atomic("AuthToken");
        let input = PregroupType::atomic("TaskInput");
        let output = PregroupType::atomic("TaskCreated");

        let endpoint = Box::word(
            "POST /tasks",
            vec![auth.clone(), input.clone()],
            vec![output.clone()],
        );

        let tensor = TensorView::from_box(&endpoint, 2);
        println!("\nAPI Endpoint Tensor:\n{:?}", tensor);

        assert_eq!(tensor.rank.0, 1); // One output
        assert_eq!(tensor.rank.1, 2); // Two inputs
    }
}
