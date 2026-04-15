//! Kitty: DisCoCat Categorical Compositional Semantics for Phoenix
//!
//! A Rust port of lambeq's pregroup grammar system, providing:
//!
//! 1. **Types** (`types`): Pregroup types with adjoints (n, n.r, n.l)
//! 2. **Diagrams** (`diagram`): String diagrams for categorical composition
//! 3. **Trees** (`tree`): Compact tree representation of pregroup structures
//! 4. **Parsers** (`parser`): CCG parsing and natural language understanding
//! 5. **Schema** (`schema`): Formal schema for diagram validation
//! 6. **Integration** (`integration`): Bridge to panproto's 4-layer architecture
//!
//! # Quick Start
//!
//! ```rust
//! use phoenix_vcs::kitty::{PregroupType, Diagram, Box, KittyBridge, DiagramSchema};
//!
//! // Create endpoint diagram
//! let auth = PregroupType::atomic("AuthToken");
//! let input = PregroupType::atomic("TaskInput");
//! let output = PregroupType::atomic("TaskCreated");
//!
//! let endpoint = Box::word("POST /tasks",
//!     vec![auth, input],
//!     vec![output]);
//!
//! let diagram = Diagram::from_box(endpoint);
//!
//! // Validate against formal schema
//! let schema = DiagramSchema::api_schema();
//! assert!(diagram.is_valid(&schema));
//!
//! // Generate NCL
//! let ncl = KittyBridge::diagram_to_ncl(&diagram)?;
//! ```
//!
//! # Architecture
//!
//! ```
//! spec.md ──► parser ──► Diagram ──► Schema ──► KittyBridge ──► NCL
//!              │            │           │
//!              ▼            ▼           ▼
//!         PregroupTree  Validation  Mermaid
//!              │
//!              ▼
//!         CCG Parse Tree
//!              │
//!              ▼
//!      Natural Language
//! ```

// Core modules
pub mod types;
pub mod diagram;
pub mod tree;
pub mod parser;
pub mod schema;
pub mod tensor_contract;
pub mod free_interface_demo;
pub mod panproto_schema_bridge;
pub mod integration;

// Capability-focused parsers (categorical/DisCoCat approach)
pub mod capability_parser;
pub mod categorical_capability;

// Re-exports for convenient access
pub use types::PregroupType;
pub use diagram::{Diagram, Layer, Box};
pub use tree::PregroupTreeNode;
pub use parser::{CCGType, CCGTree, SimpleCCGParser, NLAPIParser};
pub use schema::{DiagramSchema, DiagramValidator, ValidationResult, DiagramSchemaExt};
pub use tensor_contract::{TensorContractor, SolvedSpec, TensorContractExt, TensorView};
pub use panproto_schema_bridge::{KittyPanprotoSchemaBridge, ToPanprotoSchema, DiagramToPanproto};
pub use integration::{KittyBridge, APISpecBuilder};

/// Version information
pub const VERSION: &str = env!("CARGO_PKG_VERSION");

/// Prelude module for common imports
pub mod prelude {
    pub use super::{
        PregroupType,
        Diagram,
        Box,
        PregroupTreeNode,
        CCGType,
        KittyBridge,
        APISpecBuilder,
        DiagramSchema,
        DiagramSchemaExt,
        TensorContractExt,
        TensorContractor,
        KittyPanprotoSchemaBridge,
        ToPanprotoSchema,
    };
    pub use super::types::api_types;
    pub use super::integration::utils;
}

#[cfg(test)]
mod tests {
    use super::prelude::*;

    #[test]
    fn test_prelude_imports() {
        let _n = PregroupType::atomic("n");
        let _diagram = Diagram::empty();
        let _bridge = KittyBridge;
    }

    #[test]
    fn test_api_types() {
        let user = api_types::user();
        let task = api_types::task();
        let auth = api_types::auth_token();

        assert_eq!(user.to_string(), "User");
        assert_eq!(task.to_string(), "Task");
        assert_eq!(auth.to_string(), "AuthToken");
    }

    #[test]
    fn test_end_to_end() {
        // Create a simple endpoint
        let auth = api_types::auth_token();
        let input = api_types::input();
        let output = api_types::output();

        let endpoint = Box::word("POST /api/tasks",
            vec![auth.adjoint_left(), input.adjoint_left()],
            vec![output]);

        let diagram = Diagram::from_box(endpoint);

        // Convert to schema
        let schema = KittyBridge::diagram_to_schema(&diagram);

        assert!(!schema.vertices.is_empty());
        println!("Schema vertices: {}", schema.vertices.len());
    }
}
