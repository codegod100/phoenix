//! Theory → Schema Compiler (Layer 1 → Layer 2)
//!
//! Compiles GAT theories into Schema graphs for code generation.

use std::collections::HashMap;
use std::sync::Arc;

#[cfg(feature = "panproto")]
use panproto_gat::{Theory, Sort, Operation, SortKind};
#[cfg(feature = "panproto")]
use panproto_schema::{Schema, Vertex, Edge, Protocol};
#[cfg(feature = "panproto")]
use panproto_gat::Name;

/// Schema compilation error
#[derive(Debug, Clone)]
pub enum SchemaError {
    MissingSort(String),
    InvalidOperation(String),
    InvalidTheory(String),
}

impl std::fmt::Display for SchemaError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            SchemaError::MissingSort(s) => write!(f, "Missing sort: {}", s),
            SchemaError::InvalidOperation(s) => write!(f, "Invalid operation: {}", s),
            SchemaError::InvalidTheory(s) => write!(f, "Invalid theory: {}", s),
        }
    }
}

impl std::error::Error for SchemaError {}

/// Compiles a GAT theory to a Schema graph
/// 
/// This is the bridge between Layer 1 (GAT/math) and Layer 2 (Schema/graphs).
#[cfg(feature = "panproto")]
pub struct TheoryCompiler;

#[cfg(feature = "panproto")]
impl TheoryCompiler {
    /// Compile theory to schema
    pub fn compile(theory: &Theory) -> Result<Schema, SchemaError> {
        // Create vertices for each sort
        let mut vertices: HashMap<Name, Vertex> = HashMap::new();
        let mut sort_to_vertex: HashMap<Arc<str>, Name> = HashMap::new();
        
        for sort in &theory.sorts {
            let vertex = Self::sort_to_vertex(sort)?;
            let name = vertex.id.clone();
            sort_to_vertex.insert(Arc::clone(&sort.name), name.clone());
            vertices.insert(name, vertex);
        }
        
        // Create edges for each operation
        let mut edges: HashMap<Edge, Name> = HashMap::new();
        
        for op in &theory.ops {
            if let Some(edge) = Self::operation_to_edge(op, &sort_to_vertex)? {
                edges.insert(edge.0, edge.1);
            }
        }
        
        // Build schema with all required fields
        let schema = Schema {
            protocol: "codegen".to_string(),
            vertices,
            edges,
            hyper_edges: HashMap::new(),
            constraints: HashMap::new(),
            required: HashMap::new(),
            nsids: HashMap::new(),
            variants: HashMap::new(),
            orderings: HashMap::new(),
            recursion_points: HashMap::new(),
            spans: HashMap::new(),
            usage_modes: HashMap::new(),
            nominal: HashMap::new(),
            coercions: HashMap::new(),
            defaults: HashMap::new(),
            mergers: HashMap::new(),
            policies: HashMap::new(),
            between: HashMap::new(),
            incoming: HashMap::new(),
            outgoing: HashMap::new(),
        };
        
        Ok(schema)
    }
    
    /// Convert a GAT Sort to a Schema Vertex
    fn sort_to_vertex(sort: &Sort) -> Result<Vertex, SchemaError> {
        let id = Name::from(sort.name.as_ref());
        
        // Map sort kind to vertex kind
        let kind = match sort.kind {
            SortKind::Structural => Name::from("type"),
            SortKind::Val(_) => Name::from("data"),
            _ => Name::from("type"),
        };
        
        Ok(Vertex {
            id,
            kind,
            nsid: None,
        })
    }
    
    /// Convert a GAT Operation to a Schema Edge
    fn operation_to_edge(
        op: &Operation,
        sort_to_vertex: &HashMap<Arc<str>, Name>,
    ) -> Result<Option<(Edge, Name)>, SchemaError> {
        // Get source from first input
        let (_, src_sort) = op.inputs.first()
            .ok_or_else(|| SchemaError::InvalidOperation(
                format!("Operation {} has no inputs", op.name)
            ))?;
        
        let src_name = sort_to_vertex.get(src_sort)
            .ok_or_else(|| SchemaError::MissingSort(
                format!("Source sort not found: {}", src_sort)
            ))?;
        
        // Get target from output
        let tgt_name = sort_to_vertex.get(&op.output)
            .ok_or_else(|| SchemaError::MissingSort(
                format!("Target sort not found: {}", op.output)
            ))?;
        
        // Create edge
        let edge = Edge {
            src: src_name.clone(),
            tgt: tgt_name.clone(),
            kind: Name::from("generates"),
            name: Some(Name::from(op.name.as_ref())),
        };
        
        Ok(Some((edge, Name::from("generates"))))
    }
}

/// Compile Lit theory to schema
#[cfg(feature = "panproto")]
pub fn compile_lit_theory() -> Result<Schema, SchemaError> {
    use crate::pipeline::lit_theory_lifted::lit_theory_with_lifting;
    
    let theory = lit_theory_with_lifting();
    TheoryCompiler::compile(&theory)
}

/// Schema-based code generator
#[cfg(feature = "panproto")]
pub struct SchemaCodeGenerator;

#[cfg(feature = "panproto")]
impl SchemaCodeGenerator {
    /// Generate code from schema
    pub fn generate(schema: &Schema, config: &serde_json::Value) -> HashMap<String, String> {
        // Analyze schema to find artifact generation edges
        let artifacts: Vec<_> = schema.edges.iter()
            .filter(|(_, kind)| kind.as_ref() == "generates")
            .map(|(edge, _)| (edge.src.clone(), edge.tgt.clone(), edge.name.clone()))
            .collect();
        
        println!("Schema has {} artifact generation edges", artifacts.len());
        for (src, tgt, name) in &artifacts {
            println!("  {} → {} ({:?})", src, tgt, name);
        }
        
        // Delegate to Expr generator for actual code generation
        use crate::pipeline::expr_codegen::generate_with_expr;
        let project_name = config.get("project_name")
            .and_then(|p| p.as_str())
            .unwrap_or("generated");
        
        generate_with_expr(config, project_name)
    }
}

// ============================================================================
// When panproto is disabled
// ============================================================================

#[cfg(not(feature = "panproto"))]
pub struct TheoryCompiler;

#[cfg(not(feature = "panproto"))]
impl TheoryCompiler {
    pub fn compile(_theory: ()) -> Result<(), SchemaError> {
        Err(SchemaError::InvalidTheory("panproto feature not enabled".into()))
    }
}

#[cfg(not(feature = "panproto"))]
pub fn compile_lit_theory() -> Result<(), SchemaError> {
    Err(SchemaError::InvalidTheory("panproto feature not enabled".into()))
}

#[cfg(not(feature = "panproto"))]
pub struct SchemaCodeGenerator;

#[cfg(not(feature = "panproto"))]
impl SchemaCodeGenerator {
    pub fn generate(_schema: (), _config: &serde_json::Value) -> HashMap<String, String> {
        let mut outputs = HashMap::new();
        outputs.insert("package.json".into(), "{\"name\": \"generated\"}".into());
        outputs
    }
}
