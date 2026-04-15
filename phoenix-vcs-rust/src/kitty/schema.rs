//! Kitty Schema: Formal Schema for String Diagrams
//!
//! Provides a formal definition of what constitutes a valid string diagram,
//! including:
//! - Type consistency (domain/codomain matching)
//! - Structural constraints (valid layer connections)
//! - Wire continuity (types flow properly through the diagram)
//! - Cup/cap validity (only matching adjoints can connect)
//!
//! This schema can be serialized, validated, and converted to panproto's
//! Layer 2 Schema for integration with the 4-layer architecture.

use crate::kitty::diagram::{Box, Diagram, Layer};
use crate::kitty::types::PregroupType;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

/// A formal schema for string diagrams.
///
/// Defines the structure and constraints that all valid diagrams
/// in a given category must satisfy.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DiagramSchema {
    /// Schema version for compatibility
    pub version: String,
    /// Name of this schema/category
    pub name: String,
    /// Valid atomic types (e.g., "n", "s", "User", "Task")
    pub atomic_types: Vec<String>,
    /// Valid box types (generators allowed in this category)
    pub box_schemas: Vec<BoxSchema>,
    /// Global constraints that must hold for all diagrams
    pub constraints: Vec<DiagramConstraint>,
    /// Maximum complexity allowed (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_layers: Option<usize>,
    /// Maximum tensor width (optional)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_width: Option<usize>,
}

/// Schema for a box (generator) type
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct BoxSchema {
    /// Name of the box type (e.g., "Word", "Cup", "Spider")
    pub name: String,
    /// Required domain types (can use wildcards like "*" for any)
    pub dom_pattern: TypePattern,
    /// Required codomain types
    pub cod_pattern: TypePattern,
    /// Whether this box can appear at the top level
    pub is_toplevel: bool,
    /// Maximum occurrences in a diagram (None = unlimited)
    #[serde(skip_serializing_if = "Option::is_none")]
    pub max_count: Option<usize>,
}

/// Pattern for matching types
#[derive(Debug, Clone, Serialize, Deserialize)]
pub enum TypePattern {
    /// Any single type
    Any,
    /// Any atomic type
    Atomic,
    /// Any complex (tensor) type
    Complex,
    /// Specific type name
    Exact(String),
    /// Type with specific base name (any adjoint)
    Base(String),
    /// Sequence of patterns
    Vec(Vec<TypePattern>),
    /// Empty (unit type)
    Unit,
    /// Tensor product of patterns
    Tensor(Vec<TypePattern>),
}

impl TypePattern {
    /// Check if a type matches this pattern
    pub fn matches(&self, typ: &PregroupType) -> bool {
        match self {
            TypePattern::Any => true,
            TypePattern::Atomic => typ.is_atomic(),
            TypePattern::Complex => typ.is_complex(),
            TypePattern::Exact(name) => typ.to_string() == *name,
            TypePattern::Base(base) => {
                typ.name().map(|n| n == base).unwrap_or(false)
            }
            TypePattern::Unit => typ.is_empty(),
            TypePattern::Vec(patterns) => {
                if typ.is_complex() {
                    let objects = typ.objects();
                    if objects.len() == patterns.len() {
                        objects.iter()
                            .zip(patterns.iter())
                            .all(|(obj, pat)| pat.matches(obj))
                    } else {
                        false
                    }
                } else if patterns.len() == 1 {
                    patterns[0].matches(typ)
                } else {
                    false
                }
            }
            TypePattern::Tensor(patterns) => {
                // Build expected type from patterns and compare
                let mut expected = PregroupType::empty();
                for pat in patterns {
                    // This is a simplified check
                    if !pat.matches(&PregroupType::empty()) {
                        return false;
                    }
                }
                true
            }
        }
    }

    /// Check if a sequence of types matches this pattern
    pub fn matches_seq(&self, types: &[PregroupType]) -> bool {
        match self {
            TypePattern::Vec(patterns) => {
                if types.len() == patterns.len() {
                    types.iter()
                        .zip(patterns.iter())
                        .all(|(t, p)| p.matches(t))
                } else {
                    false
                }
            }
            TypePattern::Any => true,  // Any matches any sequence
            TypePattern::Unit => types.is_empty(),
            _ => types.len() == 1 && self.matches(&types[0]),
        }
    }
}

/// Constraints on diagram structure
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum DiagramConstraint {
    /// Types must be balanced (every output is used as an input)
    TypeBalanced,
    /// No floating wires (all types must be connected)
    NoFloatingWires,
    /// Cups must connect matching adjoints
    ValidCupsOnly,
    /// No overlapping cups (planarity constraint)
    Planar,
    /// Sequential composition must be well-typed
    SequentialWellTyped,
    /// Custom constraint with description
    Custom { name: String, description: String },
}

/// Validation result for a diagram
#[derive(Debug, Clone)]
pub struct ValidationResult {
    pub is_valid: bool,
    pub errors: Vec<ValidationError>,
    pub warnings: Vec<ValidationWarning>,
}

#[derive(Debug, Clone)]
pub struct ValidationError {
    pub code: ErrorCode,
    pub message: String,
    pub location: Option<Location>,
}

#[derive(Debug, Clone)]
pub struct ValidationWarning {
    pub code: WarningCode,
    pub message: String,
    pub location: Option<Location>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum ErrorCode {
    TypeMismatch,
    InvalidCup,
    InvalidCap,
    InvalidSwap,
    InvalidComposition,
    UnknownBoxType,
    SchemaViolation,
    StructuralError,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum WarningCode {
    UnusedType,
    RedundantCup,
    NonPlanar,
    ComplexType,
}

#[derive(Debug, Clone)]
pub struct Location {
    pub layer: usize,
    pub box_index: usize,
}

/// Schema validator for diagrams
pub struct DiagramValidator {
    schema: DiagramSchema,
}

impl DiagramValidator {
    pub fn new(schema: DiagramSchema) -> Self {
        Self { schema }
    }

    /// Validate a diagram against the schema
    pub fn validate(&self, diagram: &Diagram) -> ValidationResult {
        let mut errors = vec![];
        let mut warnings = vec![];

        // Check layer count constraint
        if let Some(max) = self.schema.max_layers {
            if diagram.len() > max {
                errors.push(ValidationError {
                    code: ErrorCode::SchemaViolation,
                    message: format!("Diagram has {} layers, max allowed is {}", diagram.len(), max),
                    location: None,
                });
            }
        }

        // Validate each layer
        let layers = diagram.layers();
        for (idx, layer) in layers.iter().enumerate() {
            self.validate_layer(layer, idx, &mut errors, &mut warnings);
        }

        // Validate sequential composition between layers
        for i in 0..layers.len().saturating_sub(1) {
            let current_cod = layers[i].cod();
            let next_dom = layers[i + 1].dom();

            if current_cod != next_dom {
                errors.push(ValidationError {
                    code: ErrorCode::InvalidComposition,
                    message: format!(
                        "Layer {} cod {:?} doesn't match layer {} dom {:?}",
                        i, current_cod, i + 1, next_dom
                    ),
                    location: Some(Location { layer: i, box_index: 0 }),
                });
            }
        }

        // Check for valid cups only
        if self.schema.constraints.contains(&DiagramConstraint::ValidCupsOnly) {
            for cup in diagram.cups() {
                if let Box::Cup { left, right } = cup {
                    if !left.can_connect(right) {
                        errors.push(ValidationError {
                            code: ErrorCode::InvalidCup,
                            message: format!("Invalid cup: {} cannot connect to {}", left, right),
                            location: None,
                        });
                    }
                }
            }
        }

        // Check box schemas
        for (idx, layer) in layers.iter().enumerate() {
            if let Some(schema) = self.find_box_schema(&layer.inner_box) {
                // Validate domain
                let dom = layer.inner_box.dom();
                if !schema.dom_pattern.matches_seq(&dom) {
                    errors.push(ValidationError {
                        code: ErrorCode::TypeMismatch,
                        message: format!(
                            "Box domain {:?} doesn't match schema {:?}",
                            dom, schema.dom_pattern
                        ),
                        location: Some(Location { layer: idx, box_index: 0 }),
                    });
                }

                // Validate codomain
                let cod = layer.inner_box.cod();
                if !schema.cod_pattern.matches_seq(&cod) {
                    errors.push(ValidationError {
                        code: ErrorCode::TypeMismatch,
                        message: format!(
                            "Box codomain {:?} doesn't match schema {:?}",
                            cod, schema.cod_pattern
                        ),
                        location: Some(Location { layer: idx, box_index: 0 }),
                    });
                }
            } else if !self.is_builtin_box(&layer.inner_box) {
                errors.push(ValidationError {
                    code: ErrorCode::UnknownBoxType,
                    message: format!("Unknown box type: {:?}", layer.inner_box),
                    location: Some(Location { layer: idx, box_index: 0 }),
                });
            }
        }

        ValidationResult {
            is_valid: errors.is_empty(),
            errors,
            warnings,
        }
    }

    fn validate_layer(
        &self,
        layer: &Layer,
        idx: usize,
        errors: &mut Vec<ValidationError>,
        _warnings: &mut Vec<ValidationWarning>,
    ) {
        // Additional per-layer validation
        match &layer.inner_box {
            Box::Cup { left, right } => {
                if !left.can_connect(right) {
                    errors.push(ValidationError {
                        code: ErrorCode::InvalidCup,
                        message: format!("Cup types {} and {} cannot connect", left, right),
                        location: Some(Location { layer: idx, box_index: 0 }),
                    });
                }
            }
            Box::Cap { left, right } => {
                // Caps should produce adjoint pair
                if left.name() != right.name() || left.z() == 0 || right.z() == 0 {
                    errors.push(ValidationError {
                        code: ErrorCode::InvalidCap,
                        message: format!("Invalid cap: {} and {}", left, right),
                        location: Some(Location { layer: idx, box_index: 0 }),
                    });
                }
            }
            Box::Swap { left, right } => {
                // Swaps must be between same base type
                if left.base() != right.base() {
                    errors.push(ValidationError {
                        code: ErrorCode::InvalidSwap,
                        message: format!("Cannot swap different types: {} and {}", left, right),
                        location: Some(Location { layer: idx, box_index: 0 }),
                    });
                }
            }
            _ => {} // Words and other boxes validated by schema
        }
    }

    fn find_box_schema(&self, box_: &Box) -> Option<&BoxSchema> {
        let name = match box_ {
            Box::Word { .. } => "Word",
            Box::Cup { .. } => "Cup",
            Box::Cap { .. } => "Cap",
            Box::Swap { .. } => "Swap",
            Box::Spider { .. } => "Spider",
            Box::Id(_) => "Id",
        };

        self.schema.box_schemas.iter().find(|s| s.name == name)
    }

    fn is_builtin_box(&self, box_: &Box) -> bool {
        matches!(box_, Box::Id(_) | Box::Cup { .. } | Box::Cap { .. } | Box::Swap { .. })
    }
}

impl DiagramSchema {
    /// Create a default schema for API specifications
    pub fn api_schema() -> Self {
        Self {
            version: "1.0".to_string(),
            name: "API Specification".to_string(),
            atomic_types: vec![
                "User".to_string(),
                "Task".to_string(),
                "AuthToken".to_string(),
                "Input".to_string(),
                "Output".to_string(),
                "TaskCreated".to_string(),
                "TaskId".to_string(),
                "n".to_string(),
                "s".to_string(),
            ],
            box_schemas: vec![
                BoxSchema {
                    name: "Word".to_string(),
                    dom_pattern: TypePattern::Any,
                    cod_pattern: TypePattern::Any,
                    is_toplevel: true,
                    max_count: None,
                },
                BoxSchema {
                    name: "Cup".to_string(),
                    dom_pattern: TypePattern::Vec(vec![TypePattern::Any, TypePattern::Any]),
                    cod_pattern: TypePattern::Unit,
                    is_toplevel: false,
                    max_count: None,
                },
                BoxSchema {
                    name: "Cap".to_string(),
                    dom_pattern: TypePattern::Unit,
                    cod_pattern: TypePattern::Vec(vec![TypePattern::Any, TypePattern::Any]),
                    is_toplevel: false,
                    max_count: None,
                },
                BoxSchema {
                    name: "Id".to_string(),
                    dom_pattern: TypePattern::Any,
                    cod_pattern: TypePattern::Any,
                    is_toplevel: false,
                    max_count: None,
                },
            ],
            constraints: vec![
                DiagramConstraint::TypeBalanced,
                DiagramConstraint::ValidCupsOnly,
                DiagramConstraint::SequentialWellTyped,
            ],
            max_layers: Some(100),
            max_width: Some(50),
        }
    }

    /// Create a minimal schema for testing
    pub fn minimal() -> Self {
        Self {
            version: "1.0".to_string(),
            name: "Minimal".to_string(),
            atomic_types: vec!["n".to_string(), "s".to_string()],
            box_schemas: vec![
                BoxSchema {
                    name: "Word".to_string(),
                    dom_pattern: TypePattern::Atomic,
                    cod_pattern: TypePattern::Atomic,
                    is_toplevel: true,
                    max_count: None,
                },
            ],
            constraints: vec![],
            max_layers: None,
            max_width: None,
        }
    }

    /// Serialize to JSON
    pub fn to_json(&self) -> Result<String, serde_json::Error> {
        serde_json::to_string_pretty(self)
    }

    /// Deserialize from JSON
    pub fn from_json(json: &str) -> Result<Self, serde_json::Error> {
        serde_json::from_str(json)
    }
}

/// Extension trait for diagrams to support schema validation
pub trait DiagramSchemaExt {
    /// Validate against a schema
    fn validate(&self, schema: &DiagramSchema) -> ValidationResult;

    /// Check if valid against schema
    fn is_valid(&self, schema: &DiagramSchema) -> bool {
        self.validate(schema).is_valid
    }

    /// Get the implicit schema of this diagram
    fn infer_schema(&self) -> DiagramSchema;
}

impl DiagramSchemaExt for Diagram {
    fn validate(&self, schema: &DiagramSchema) -> ValidationResult {
        let validator = DiagramValidator::new(schema.clone());
        validator.validate(self)
    }

    fn infer_schema(&self) -> DiagramSchema {
        // Collect all types used
        let mut atomic_types = std::collections::HashSet::new();
        let mut box_schemas = vec![];

        for layer in self.layers() {
            // Collect types
            for typ in layer.dom() {
                if typ.is_atomic() {
                    if let Some(name) = typ.name() {
                        atomic_types.insert(name.to_string());
                    }
                }
            }

            // Collect box patterns
            let box_schema: Option<BoxSchema> = match &layer.inner_box {
                Box::Word { .. } => Some(BoxSchema {
                    name: "Word".to_string(),
                    dom_pattern: TypePattern::Any,
                    cod_pattern: TypePattern::Any,
                    is_toplevel: true,
                    max_count: None,
                }),
                Box::Cup { .. } => Some(BoxSchema {
                    name: "Cup".to_string(),
                    dom_pattern: TypePattern::Vec(vec![TypePattern::Any, TypePattern::Any]),
                    cod_pattern: TypePattern::Unit,
                    is_toplevel: false,
                    max_count: None,
                }),
                _ => None,
            };

            if let Some(bs) = box_schema {
                if !box_schemas.iter().any(|s: &BoxSchema| s.name == bs.name) {
                    box_schemas.push(bs);
                }
            }
        }

        DiagramSchema {
            version: "inferred-1.0".to_string(),
            name: "Inferred".to_string(),
            atomic_types: atomic_types.into_iter().collect(),
            box_schemas,
            constraints: vec![DiagramConstraint::ValidCupsOnly],
            max_layers: None,
            max_width: None,
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::kitty::types::PregroupType;

    #[test]
    fn test_api_schema() {
        let schema = DiagramSchema::api_schema();

        assert_eq!(schema.name, "API Specification");
        assert!(schema.atomic_types.contains(&"User".to_string()));
        assert!(schema.atomic_types.contains(&"Task".to_string()));
        assert!(!schema.box_schemas.is_empty());
    }

    #[test]
    fn test_schema_serialization() {
        let schema = DiagramSchema::api_schema();
        let json = schema.to_json().unwrap();

        println!("Schema JSON:\n{}", json);

        let deserialized = DiagramSchema::from_json(&json).unwrap();
        assert_eq!(deserialized.name, schema.name);
    }

    #[test]
    fn test_type_pattern_matching() {
        let n = PregroupType::atomic("n");
        let nr = n.adjoint_right();
        let complex = n.tensor(&nr);

        assert!(TypePattern::Any.matches(&n));
        assert!(TypePattern::Atomic.matches(&n));
        assert!(!TypePattern::Atomic.matches(&complex));
        assert!(TypePattern::Complex.matches(&complex));
        assert!(!TypePattern::Complex.matches(&n));
        assert!(TypePattern::Base("n".to_string()).matches(&n));
        assert!(TypePattern::Base("n".to_string()).matches(&nr));
        assert!(!TypePattern::Base("s".to_string()).matches(&n));
    }

    #[test]
    fn test_diagram_validation() {
        let schema = DiagramSchema::api_schema();

        // Create valid endpoint
        let auth = PregroupType::atomic("AuthToken");
        let input = PregroupType::atomic("Input");
        let output = PregroupType::atomic("Output");

        let word = Box::word("POST /tasks",
            vec![auth.clone(), input.clone()],
            vec![output.clone()]);

        let diagram = Diagram::from_box(word);

        let result = diagram.validate(&schema);
        assert!(result.is_valid, "Valid diagram failed validation: {:?}", result.errors);
    }

    #[test]
    fn test_invalid_cup_detection() {
        let schema = DiagramSchema {
            constraints: vec![DiagramConstraint::ValidCupsOnly],
            ..DiagramSchema::minimal()
        };

        // Try to create invalid cup
        let n = PregroupType::atomic("n");
        let s = PregroupType::atomic("s");

        // This should fail - n and s are not adjoints
        let cup = Box::cup(n, s);
        assert!(cup.is_err());
    }

    #[test]
    fn test_infer_schema() {
        let n = PregroupType::atomic("n");
        let word = Box::word("test", vec![n.clone()], vec![n]);
        let diagram = Diagram::from_box(word);

        let schema = diagram.infer_schema();
        assert!(schema.atomic_types.contains(&"n".to_string()));
        assert!(schema.box_schemas.iter().any(|b| b.name == "Word"));
    }
}
