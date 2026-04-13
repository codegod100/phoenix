# th_spec.ncl - Theory of NCL Specifications
# INPUT: _schema.ncl - defines the spec document structure
# This theory provides GAT operations to transform schema-defined specs into the pipeline

let T = import "panproto/theory.ncl" in
let Schema = import "../_schema.ncl" in

{
  id = "phoenix.theories.spec",
  description = "Theory of NCL specification documents (input from schema v3.0.0)",
  theory = "ThSpec",
  
  # === SORTS (from schema types) ===
  sorts = [
    # A spec document (instance of schema)
    { name = "SpecDoc", params = [
      { name = "schema_version", sort = "SchemaVersion" },
      { name = "requirements", sort = "Requirements" },
      { name = "design", sort = "Design" }
    ]},
    
    # Schema version identifier
    { name = "SchemaVersion", kind = { type = "val", value_kind = "string" } },
    
    # Requirements array (from schema.types.requirement)
    { name = "Requirements", params = [
      { name = "items", sort = "Array Requirement" }
    ]},
    
    # Single requirement (from schema.types.requirement)
    { name = "Requirement", params = [
      { name = "description", sort = "String" },
      { name = "priority", sort = "Priority" }
    ]},
    
    # Priority levels from schema
    { name = "Priority", kind = { type = "val", value_kind = "string" } },  # "must" | "should" | "could"
    
    # Design section (from schema.types.design)
    { name = "Design", params = [
      { name = "outputs", sort = "Outputs" },
      { name = "notes", sort = "Maybe String" },
      { name = "deps", sort = "Array String" }
    ]},
    
    # Outputs array (from schema.types.output)
    { name = "Outputs", params = [
      { name = "items", sort = "Array Output" }
    ]},
    
    # Single output (from schema.types.output)
    { name = "Output", params = [
      { name = "path", sort = "Path" },
      { name = "language", sort = "Language" },
      { name = "framework", sort = "Maybe String" }
    ]},
    
    # Language from schema enum
    { name = "Language", kind = { type = "val", value_kind = "string" } },  # "rust" | "python" | "typescript"
    
    # Path type
    T.simple "Path",
    
    # String type
    T.simple "String",
    
    # Maybe/Option
    { name = "Maybe", params = [{ name = "T", sort = "Type" }] },
    
    # Validation result
    { name = "ValidationResult", params = [
      { name = "valid", sort = "Bool" },
      { name = "errors", sort = "Array String" }
    ]},
    
    # Boolean
    { name = "Bool", kind = { type = "val", value_kind = "boolean" } },
  ],
  
  # === OPERATIONS (transform schema to pipeline) ===
  ops = [
    # Load a spec document conforming to schema
    {
      name = "load",
      inputs = [{ name = "path", sort = "Path" }],
      output = "SpecDoc"
    },
    
    # Validate against schema rules
    {
      name = "validate",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "ValidationResult"
    },
    
    # Extract requirements as clauses for pipeline
    {
      name = "extract_clauses",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "ClauseSet"
    },
    
    # Extract outputs as generation directives
    {
      name = "extract_outputs",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "GenSet"
    },
    
    # Get schema version
    {
      name = "schema_version",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "SchemaVersion"
    },
    
    # Check if spec matches expected schema version
    {
      name = "version_compatible",
      inputs = [
        { name = "doc", sort = "SpecDoc" },
        { name = "expected", sort = "SchemaVersion" }
      ],
      output = "Bool"
    },
    
    # Count requirements
    {
      name = "requirement_count",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "Nat"
    },
    
    # Count outputs
    {
      name = "output_count",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "Nat"
    },
    
    # Get output path for a specific language
    {
      name = "output_for_language",
      inputs = [
        { name = "doc", sort = "SpecDoc" },
        { name = "lang", sort = "Language" }
      ],
      output = "Maybe Path"
    },
  ],
  
  # === EQUATIONS (schema invariants) ===
  equations = [
    # Schema version is preserved through load
    {
      name = "version_preserved",
      lhs = "schema_version(load(path))",
      rhs = "load(path).schema_version"
    },
    
    # Validation enforces schema rules
    {
      name = "validation_enforces_requirements",
      lhs = "validate(doc).valid",
      rhs = "true"
    } | { condition = "requirement_count(doc) > 0 AND output_count(doc) > 0" },
    
    # Clause count equals requirement count
    {
      name = "clauses_from_requirements",
      lhs = "cardinality(extract_clauses(doc))",
      rhs = "requirement_count(doc)"
    },
    
    # Output count equals generation directive count
    {
      name = "gens_from_outputs",
      lhs = "cardinality(extract_outputs(doc))",
      rhs = "output_count(doc)"
    },
    
    # Compatible version check
    {
      name = "version_check",
      lhs = "version_compatible(doc, '3.0.0')",
      rhs = "schema_version(doc) == '3.0.0'"
    },
  ],
  
  # === SCHEMA REFERENCE ===
  # Link to the input schema that defines valid documents
  input_schema = {
    path = "../_schema.ncl",
    version = Schema.schema_version,
    required_fields = Schema.required,
    types = Schema.types,
    rules = Schema.rules,
  },
  
} | T.Theory
