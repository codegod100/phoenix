# mu_ingest.ncl - Morphism: ThSpec → ThClause
# INPUT: SpecDoc conforming to _schema.ncl
# OUTPUT: ClauseGraph for pipeline processing
# 
# This morphism transforms schema-defined specifications into the clause
# representation used by the rest of the pipeline.

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.morphisms.ingest",
  description = "μ_ingest: Ingest schema-defined NCL spec into clause graph",
  morphism = "mu_ingest",
  domain = "ThSpec",
  codomain = "ThClause",
  
  # === SORT MAPPING (Schema → Pipeline) ===
  sort_map = {
    # Spec document becomes clause graph
    "SpecDoc" = "ClauseGraph",
    
    # Each requirement becomes a clause
    "Requirement" = "Clause",
    
    # Each output becomes a clause (generation directive)
    "Output" = "Clause",
    
    # Priority maps to clause type/risk
    "Priority" = "ClauseType",
    
    # Language maps to clause domain
    "Language" = "Domain",
    
    # Path preserved through morphism
    "Path" = "Path",
    
    # String preserved
    "String" = "String",
    
    # Schema version becomes metadata
    "SchemaVersion" = "String",
    
    # Validation result becomes clause metadata
    "ValidationResult" = "Complement",
  },
  
  # === OPERATION MAPPING ===
  op_map = {
    # load → identity (we're mapping the loaded doc)
    "load" = "identity",
    
    # validate → validate_clauses (validate produces clauses or errors)
    "validate" = "validate_clauses",
    
    # extract_clauses → identity (requirements become clauses)
    "extract_clauses" = "identity",
    
    # extract_outputs → identity (outputs become clauses)
    "extract_outputs" = "identity",
    
    # schema_version → clause_meta (attached to all clauses)
    "schema_version" = "clause_meta",
    
    # version_compatible → filter (only compatible specs proceed)
    "version_compatible" = "filter_compatible",
    
    # requirement_count → cardinality
    "requirement_count" = "cardinality",
    
    # output_count → cardinality
    "output_count" = "cardinality",
    
    # output_for_language → filter_domain
    "output_for_language" = "filter_domain",
  },
  
  # === COMPLEMENT: Schema info not in clauses ===
  complement_sort = "IngestMetadata",
  complement_ops = [
    {
      name = "schema_metadata",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "IngestMetadata"
    },
    {
      name = "validation_errors",
      inputs = [{ name = "doc", sort = "SpecDoc" }],
      output = "Array String"
    },
  ],
  
  # === EQUATIONS (ingestion invariants) ===
  equations = [
    # Each requirement produces exactly one clause
    {
      name = "req_to_clause",
      lhs = "cardinality(extract_clauses(load(path)))",
      rhs = "requirement_count(load(path))"
    },
    
    # Each output produces exactly one clause
    {
      name = "output_to_clause", 
      lhs = "cardinality(extract_outputs(load(path)))",
      rhs = "output_count(load(path))"
    },
    
    # Incompatible version → empty clause graph
    {
      name = "version_filter",
      lhs = "extract_clauses(doc)",
      rhs = "empty()"
    } | { condition = "NOT version_compatible(doc, '3.0.0')" },
    
    # Priority maps to clause type
    {
      name = "priority_mapping",
      lhs = "infer_type(clause_from_req(req))",
      rhs = "priority_to_type(req.priority)"
    },
  ],
  
  # === PRIORITY → TYPE CONVERSION ===
  priority_map = {
    "must" = "Required",
    "should" = "Recommended", 
    "could" = "Optional",
  },
  
  # === LANGUAGE → DOMAIN CONVERSION ===
  language_map = {
    "rust" = "RustDomain",
    "python" = "PythonDomain",
    "typescript" = "TypeScriptDomain",
  },
  
} | T.Morphism
