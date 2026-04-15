//! Kitty-Panproto Schema Bridge
//!
//! Converts Kitty's DiagramSchema to panproto's formal Schema format using
//! SchemaBuilder for proper construction.
//!
//! This bridges:
//! - Layer 1 (Theory): DisCoCat GAT with tensor contraction equations
//! - Layer 2 (Schema): Panproto Schema with vertices=types, edges=cups
//! - Layer 3 (Lens): Bidirectional sync between kitty and panproto
//! - Layer 4 (Expr): Code generation via emit_with_protocol

use panproto_schema::{SchemaBuilder, Schema};
use panproto_schema::Protocol;
use panproto_gat::Name;
use crate::kitty::schema::{DiagramSchema, BoxSchema, TypePattern};
use crate::kitty::diagram::Diagram;
use crate::kitty::types::PregroupType;

/// Bridge between kitty's categorical schema and panproto's schema
pub struct KittyPanprotoSchemaBridge;

impl KittyPanprotoSchemaBridge {
    //===========================================================================
    // Layer 1 → 2: DiagramSchema → Panproto Schema via Builder
    //===========================================================================

    /// Convert a kitty DiagramSchema to panproto Schema using SchemaBuilder
    ///
    /// This creates a proper panproto schema with:
    /// - Vertices for atomic types and their adjoints
    /// - Vertices for box generators
    /// - Edges for cups/caps (contraction structure)
    /// - Edges for domain/codomain relationships
    pub fn to_panproto_schema(kitty_schema: &DiagramSchema) -> Result<Schema, String> {
        // Create a protocol for tensor networks
        let protocol = Self::create_tensor_protocol();
        let mut builder = SchemaBuilder::new(&protocol);

        // Add special "any" type vertex for generic patterns
        builder = builder
            .vertex("type_any", "pregroup_type", Some("kitty.types.any"))
            .map_err(|e| format!("Failed to add any type vertex: {:?}", e))?;

        // Add vertices for atomic types
        for type_name in &kitty_schema.atomic_types {
            builder = builder
                .vertex(
                    &format!("type_{}", type_name),
                    "pregroup_type",
                    Some(&format!("kitty.types.{}", type_name)),
                )
                .map_err(|e| format!("Failed to add type vertex: {:?}", e))?;

            // Add adjoint types
            builder = builder
                .vertex(
                    &format!("type_{}_r", type_name),
                    "pregroup_type_adjoint",
                    Some(&format!("kitty.types.{}.r", type_name)),
                )
                .map_err(|e| format!("Failed to add adjoint vertex: {:?}", e))?;

            builder = builder
                .vertex(
                    &format!("type_{}_l", type_name),
                    "pregroup_type_adjoint",
                    Some(&format!("kitty.types.{}.l", type_name)),
                )
                .map_err(|e| format!("Failed to add adjoint vertex: {:?}", e))?;
        }

        // Add vertices for box generators
        for (idx, box_schema) in kitty_schema.box_schemas.iter().enumerate() {
            let box_id = format!("box_{}_{}", idx, box_schema.name);
            builder = builder
                .vertex(&box_id, "box_generator", Some(&format!("kitty.boxes.{}", box_schema.name)))
                .map_err(|e| format!("Failed to add box vertex: {:?}", e))?;

            // Add domain edges (inputs)
            builder = Self::add_domain_edges(builder, &box_id, &box_schema.dom_pattern)?;

            // Add codomain edges (outputs)
            builder = Self::add_codomain_edges(builder, &box_id, &box_schema.cod_pattern)?;
        }

        // Add cup/cap edges for contraction structure
        for type_name in &kitty_schema.atomic_types {
            // Cup: type ⊗ type.r → I
            builder = builder
                .edge(
                    &format!("type_{}", type_name),
                    &format!("type_{}_r", type_name),
                    "cup",
                    Some(&format!("cup_{}", type_name)),
                )
                .map_err(|e| format!("Failed to add cup edge: {:?}", e))?;

            // Cap: I → type.r ⊗ type (reverse direction)
            builder = builder
                .edge(
                    &format!("type_{}_r", type_name),
                    &format!("type_{}", type_name),
                    "cap",
                    Some(&format!("cap_{}", type_name)),
                )
                .map_err(|e| format!("Failed to add cap edge: {:?}", e))?;
        }

        // Build the schema
        builder.build().map_err(|e| format!("Failed to build schema: {:?}", e))
    }

    /// Create a protocol definition for tensor network schemas
    fn create_tensor_protocol() -> Protocol {
        let obj_kinds = vec![
            Name::new("pregroup_type"),
            Name::new("pregroup_type_adjoint"),
            Name::new("box_generator"),
            Name::new("cup_node"),
            Name::new("cap_node"),
            Name::new("word"),
            Name::new("cup"),
            Name::new("cap"),
            Name::new("swap"),
            Name::new("spider"),
            Name::new("id"),
        ];

        let edge_kinds = vec![
            Name::new("cup"),
            Name::new("cap"),
            Name::new("domain"),
            Name::new("codomain"),
            Name::new("tensor_product"),
            Name::new("sequential"),
        ];

        Protocol {
            name: "tensor_network".to_string(),
            schema_theory: "tensor_network_schema".to_string(),
            instance_theory: "tensor_network_instance".to_string(),
            schema_composition: None,
            instance_composition: None,
            edge_rules: vec![], // Would need proper EdgeRule definitions
            obj_kinds: obj_kinds.into_iter().map(|n| n.as_str().to_string()).collect(),
            constraint_sorts: vec![],
            ..Default::default()
        }
    }

    fn add_domain_edges(
        mut builder: SchemaBuilder,
        box_id: &str,
        pattern: &TypePattern,
    ) -> Result<SchemaBuilder, String> {
        match pattern {
            TypePattern::Unit => {
                // No inputs - no edges needed
            }
            TypePattern::Any => {
                // Generic input - type_any already exists
                builder = builder
                    .edge("type_any", box_id, "domain", Some("input"))
                    .map_err(|e| format!("Failed to add domain edge: {:?}", e))?;
            }
            TypePattern::Vec(patterns) => {
                // First create input vertices, then edges
                for (idx, _) in patterns.iter().enumerate() {
                    let input_id = format!("{}_input_{}", box_id, idx);
                    builder = builder
                        .vertex(&input_id, "pregroup_type", Some(&format!("kitty.input.{}.{}", box_id, idx)))
                        .map_err(|e| format!("Failed to add input vertex: {:?}", e))?;
                }
                for (idx, _) in patterns.iter().enumerate() {
                    builder = builder
                        .edge(
                            &format!("{}_input_{}", box_id, idx),
                            box_id,
                            "domain",
                            Some(&format!("input_{}", idx)),
                        )
                        .map_err(|e| format!("Failed to add domain edge: {:?}", e))?;
                }
            }
            _ => {
                // Single input - create vertex first
                let input_id = format!("{}_input", box_id);
                builder = builder
                    .vertex(&input_id, "pregroup_type", Some(&format!("kitty.input.{}", box_id)))
                    .map_err(|e| format!("Failed to add input vertex: {:?}", e))?;
                builder = builder
                    .edge(&input_id, box_id, "domain", Some("input"))
                    .map_err(|e| format!("Failed to add domain edge: {:?}", e))?;
            }
        }
        Ok(builder)
    }

    fn add_codomain_edges(
        mut builder: SchemaBuilder,
        box_id: &str,
        pattern: &TypePattern,
    ) -> Result<SchemaBuilder, String> {
        match pattern {
            TypePattern::Unit => {
                // No outputs
            }
            TypePattern::Any => {
                // Generic output - type_any already exists
                builder = builder
                    .edge(box_id, "type_any", "codomain", Some("output"))
                    .map_err(|e| format!("Failed to add codomain edge: {:?}", e))?;
            }
            TypePattern::Vec(patterns) => {
                // First create output vertices, then edges
                for (idx, _) in patterns.iter().enumerate() {
                    let output_id = format!("{}_output_{}", box_id, idx);
                    builder = builder
                        .vertex(&output_id, "pregroup_type", Some(&format!("kitty.output.{}.{}", box_id, idx)))
                        .map_err(|e| format!("Failed to add output vertex: {:?}", e))?;
                }
                for (idx, _) in patterns.iter().enumerate() {
                    builder = builder
                        .edge(
                            box_id,
                            &format!("{}_output_{}", box_id, idx),
                            "codomain",
                            Some(&format!("output_{}", idx)),
                        )
                        .map_err(|e| format!("Failed to add codomain edge: {:?}", e))?;
                }
            }
            _ => {
                // Single output - create vertex first
                let output_id = format!("{}_output", box_id);
                builder = builder
                    .vertex(&output_id, "pregroup_type", Some(&format!("kitty.output.{}", box_id)))
                    .map_err(|e| format!("Failed to add output vertex: {:?}", e))?;
                builder = builder
                    .edge(box_id, &output_id, "codomain", Some("output"))
                    .map_err(|e| format!("Failed to add codomain edge: {:?}", e))?;
            }
        }
        Ok(builder)
    }

    //===========================================================================
    // Layer 2: Diagram → Schema Instance
    //===========================================================================

    /// Convert a specific diagram to a panproto schema instance
    ///
    /// This represents a concrete tensor network as a schema where:
    /// - Vertices = boxes in the diagram
    /// - Edges = wires (type connections)
    pub fn diagram_to_schema_instance(diagram: &Diagram) -> Result<Schema, String> {
        let protocol = Self::create_tensor_protocol();
        let mut builder = SchemaBuilder::new(&protocol);
        let mut created_types = std::collections::HashSet::new();

        let boxes = diagram.boxes();

        // Add vertices for each box
        for (idx, box_) in boxes.iter().enumerate() {
            let name = box_.name().unwrap_or("unnamed");
            let kind = match box_ {
                crate::kitty::diagram::Box::Word { .. } => "word",
                crate::kitty::diagram::Box::Cup { .. } => "cup",
                crate::kitty::diagram::Box::Cap { .. } => "cap",
                crate::kitty::diagram::Box::Swap { .. } => "swap",
                crate::kitty::diagram::Box::Spider { .. } => "spider",
                crate::kitty::diagram::Box::Id(_) => "id",
            };

            let vertex_id = format!("box_{}_{}", idx, name);
            builder = builder
                .vertex(&vertex_id, kind, Some(&format!("kitty.diagram.box{}", idx)))
                .map_err(|e| format!("Failed to add diagram vertex: {:?}", e))?;

            // Add type edges for domain (inputs)
            for (type_idx, typ) in box_.dom().iter().enumerate() {
                let type_id = format!("type_{}_{}", idx, typ.to_string().replace(".", "_"));
                let type_kind = if typ.is_atomic() { "pregroup_type" } else { "complex_type" };

                // Ensure type vertex exists (only create once)
                if !created_types.contains(&type_id) {
                    builder = builder
                        .vertex(&type_id, type_kind, Some(&format!("kitty.type.{}", typ)))
                        .map_err(|e| format!("Failed to add type vertex: {:?}", e))?;
                    created_types.insert(type_id.clone());
                }

                // Input edge: type → box
                builder = builder
                    .edge(&type_id, &vertex_id, "domain", Some(&format!("input_{}", type_idx)))
                    .map_err(|e| format!("Failed to add type edge: {:?}", e))?;
            }

            // Add type edges for codomain (outputs)
            for (type_idx, typ) in box_.cod().iter().enumerate() {
                let type_id = format!("type_{}_{}", idx, typ.to_string().replace(".", "_"));
                let type_kind = if typ.is_atomic() { "pregroup_type" } else { "complex_type" };

                // Ensure type vertex exists (only create once)
                if !created_types.contains(&type_id) {
                    builder = builder
                        .vertex(&type_id, type_kind, Some(&format!("kitty.type.{}", typ)))
                        .map_err(|e| format!("Failed to add type vertex: {:?}", e))?;
                    created_types.insert(type_id.clone());
                }

                // Output edge: box → type
                builder = builder
                    .edge(&vertex_id, &type_id, "codomain", Some(&format!("output_{}", type_idx)))
                    .map_err(|e| format!("Failed to add type edge: {:?}", e))?;
            }
        }

        builder.build().map_err(|e| format!("Failed to build diagram schema: {:?}", e))
    }

    //===========================================================================
    // Layer 4: Schema → Visual Representations
    //===========================================================================

    /// Generate Mermaid diagram from schema
    pub fn schema_to_mermaid(schema: &DiagramSchema) -> String {
        let mut output = String::from("graph TD\n");

        // Add type nodes
        for type_name in &schema.atomic_types {
            output.push_str(&format!("  type_{}[\"{}\"]\n", type_name, type_name));
            output.push_str(&format!("  type_{}_r[\"{}.r\"]\n", type_name, type_name));
        }

        // Add box nodes
        for (idx, box_schema) in schema.box_schemas.iter().enumerate() {
            output.push_str(&format!(
                "  box_{}[\"{}\"]\n",
                idx, box_schema.name
            ));
        }

        // Add cup edges
        for type_name in &schema.atomic_types {
            output.push_str(&format!(
                "  type_{} -- \"cup\" --> type_{}_r\n",
                type_name, type_name
            ));
        }

        output
    }
}

/// Extension trait for converting kitty schemas to panproto
pub trait ToPanprotoSchema {
    fn to_panproto(&self) -> Result<Schema, String>;
    fn to_mermaid(&self) -> String;
}

impl ToPanprotoSchema for DiagramSchema {
    fn to_panproto(&self) -> Result<Schema, String> {
        KittyPanprotoSchemaBridge::to_panproto_schema(self)
    }

    fn to_mermaid(&self) -> String {
        KittyPanprotoSchemaBridge::schema_to_mermaid(self)
    }
}

/// Extension trait for diagrams
pub trait DiagramToPanproto {
    fn to_schema_instance(&self) -> Result<Schema, String>;
}

impl DiagramToPanproto for Diagram {
    fn to_schema_instance(&self) -> Result<Schema, String> {
        KittyPanprotoSchemaBridge::diagram_to_schema_instance(self)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_schema_to_panproto() {
        let kitty_schema = DiagramSchema::api_schema();
        let panproto_schema = kitty_schema.to_panproto();

        if let Err(e) = &panproto_schema {
            println!("Error converting to panproto: {}", e);
        }

        assert!(panproto_schema.is_ok(), "Failed to convert schema: {:?}", panproto_schema.err());
        let schema = panproto_schema.unwrap();

        // Should have vertices for types
        assert!(!schema.vertices.is_empty());
        println!("Converted {} kitty types to panproto vertices", schema.vertices.len());
    }

    #[test]
    fn test_diagram_to_schema_instance() {
        use crate::kitty::types::PregroupType;
        use crate::kitty::diagram::{Box, Diagram};

        // Create simple diagram
        let n = PregroupType::atomic("n");
        let word = Box::word("test", vec![n.clone()], vec![n]);
        let diagram = Diagram::from_box(word);

        let instance = diagram.to_schema_instance();

        if let Err(e) = &instance {
            println!("Error converting diagram: {}", e);
        }

        assert!(instance.is_ok(), "Failed to convert diagram: {:?}", instance.err());
        let schema = instance.unwrap();
        println!("Diagram instance has {} vertices", schema.vertices.len());
    }

    #[test]
    fn test_schema_to_mermaid() {
        let kitty_schema = DiagramSchema::minimal();
        let mermaid = kitty_schema.to_mermaid();

        assert!(mermaid.contains("graph TD"));
        assert!(mermaid.contains("cup"));
        println!("Mermaid output:\n{}", mermaid);
    }

    #[test]
    fn test_tensor_protocol_creation() {
        let protocol = KittyPanprotoSchemaBridge::create_tensor_protocol();

        assert_eq!(protocol.name.as_str(), "tensor_network");
        assert!(!protocol.obj_kinds.is_empty());
        // Edge rules may be empty in our minimal protocol

        println!("Tensor protocol has {} object kinds", protocol.obj_kinds.len());
        println!("Tensor protocol has {} edge rules", protocol.edge_rules.len());
    }
}
