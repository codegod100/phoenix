# mu_ingest.ncl - Morphism: ThSpec → ThClause
# Load NCL spec and extract clauses (requirements) for processing

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.morphisms.ingest",
  description = "μ_ingest: Load NCL spec and extract requirement clauses",
  morphism = "mu_ingest",
  domain = "ThSpec",
  codomain = "ThClause",
  
  # The ingestion process:
  # 1. Load the .ncl spec (panproto validates it)
  # 2. Extract morphisms with generation directives
  # 3. Convert each generation directive to a clause
  
  # Sort mapping
  sort_map = {
    # Spec → ClauseGraph (the things we need to generate)
    "Spec" = "ClauseGraph",
    # Generation directives become clauses
    "GenDirective" = "Clause",
    # Morphism refs become clause types
    "MorphismRef" = "ClauseType",
    # Paths preserved
    "Path" = "Path",
    # Strings preserved
    "String" = "String",
  },
  
  # Operation mapping
  op_map = {
    # load → identity (we're mapping the loaded spec)
    "load" = "identity",
    # extract_generations → identity (gens become clauses)
    "extract_generations" = "identity",
    # output_path → clause_text (path becomes requirement text)
    "output_path" = "clause_text",
    # is_external → filter (we filter out external morphisms)
    "is_external" = "infer_type",
  },
  
  # Complement: what we don't generate
  complement_sort = "ExternalSpec",
  complement_ops = [
    {
      name = "external_morphisms",
      inputs = [{ name = "spec", sort = "Spec" }],
      output = "ExternalSpec"
    },
  ],
  
  # This morphism filters: only internal morphisms become clauses
  # External dependencies (like freeq-sdk) are in the complement
} | T.Morphism
