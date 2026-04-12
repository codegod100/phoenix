# phoenix_pipeline.ncl - Complete pipeline as theory composition
# The entire Phoenix VCS pipeline as panproto morphisms

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.bundle.pipeline",
  description = "Phoenix VCS Pipeline - Formal theory composition for code generation",
  bundle = "PhoenixPipeline",
  
  # === THEORIES ===
  theories = [
    # Source: NCL Specifications
    {
      theory = "ThSpec",
      description = "NCL specification documents",
      sorts = ["Spec", "Bundle", "GenDirective"],
    },
    
    # Ingested: Clause Graph
    {
      theory = "ThClause",
      description = "Parsed requirement clauses",
      sorts = ["ClauseGraph", "Clause", "ClauseType"],
    },
    
    # Canonicalized: Unique Nodes
    {
      theory = "ThCanon",
      description = "Deduplicated canonical nodes",
      sorts = ["CanonGraph", "CanonNode", "DRate"],
    },
    
    # Planned: Implementation Units
    {
      theory = "ThIU",
      description = "Partitioned implementation units",
      sorts = ["IUGraph", "IU", "RiskTier"],
    },
    
    # Target: Generated Code
    {
      theory = "ThCode",
      description = "Generated source code files",
      sorts = ["CodeModule", "CodeFile", "Language"],
    },
  ],
  
  # === MORPHISMS (Pipeline Steps) ===
  morphisms = [
    # Step 1: Ingest (load NCL spec)
    {
      morphism = "mu_ingest",
      domain = "ThSpec",
      codomain = "ThClause",
      sort_map = {
        "GenDirective" = "Clause",
        "Path" = "Path",
      },
    },
    
    # Step 2: Canonicalize (deduplicate)
    {
      morphism = "mu_canon",
      domain = "ThClause",
      codomain = "ThCanon",
      sort_map = {
        "ClauseGraph" = "CanonGraph",
        "Clause" = "CanonNode",
      },
    },
    
    # Step 3: Plan (partition into IUs)
    {
      morphism = "mu_plan",
      domain = "ThCanon",
      codomain = "ThIU",
      sort_map = {
        "CanonGraph" = "IUGraph",
        "CanonNode" = "IU",
      },
    },
    
    # Step 4: Codegen (generate files)
    {
      morphism = "mu_codegen",
      domain = "ThIU",
      codomain = "ThCode",
      sort_map = {
        "IU" = "CodeFile",
        "Language" = "Language",
      },
    },
  ],
  
  # === COMPOSITION ===
  # The full pipeline is a composition: μ_total = μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest
  compositions = [
    {
      result = "PhoenixPipeline",
      description = "Complete spec-to-code pipeline",
      bases = ["ThSpec", "ThClause", "ThCanon", "ThIU", "ThCode"],
      
      steps = [
        # μ_ingest: ThSpec → ThClause
        { left = "ThSpec", right = "ThClause", shared_sorts = ["Path", "String"] },
        # μ_canon: ThClause → ThCanon  
        { left = "ThClause", right = "ThCanon", shared_sorts = ["Hash", "Path"] },
        # μ_plan: ThCanon → ThIU
        { left = "ThCanon", right = "ThIU", shared_sorts = ["Hash", "String"] },
        # μ_codegen: ThIU → ThCode
        { left = "ThIU", right = "ThCode", shared_sorts = ["Hash", "Path", "String"] },
      ],
    },
  ],
  
  # === PROTOCOLS ===
  protocols = [
    {
      protocol = "PipelineExecution",
      description = "Execute the complete pipeline on an NCL spec",
      schema_theory = "ThSpec",
      instance_theory = "ThCode",
      
      edge_rules = [
        { edge_kind = "ingest", src_kind = "Spec", tgt_kind = "Clause" },
        { edge_kind = "canonicalize", src_kind = "Clause", tgt_kind = "Canon" },
        { edge_kind = "plan", src_kind = "Canon", tgt_kind = "IU" },
        { edge_kind = "generate", src_kind = "IU", tgt_kind = "Code" },
      ],
    },
    
    {
      protocol = "ThinBoundary",
      description = "Enforce thin wrapper constraints on generated code",
      schema_theory = "ThThinWrapper",  # from freeq constraints
      instance_theory = "ThCode",
      
      edge_rules = [
        { edge_kind = "wrap", src_kind = "RustType", tgt_kind = "PythonType" },
        { edge_kind = "forbid_mod", src_kind = "Code", tgt_kind = "ModDecl" },
      ],
    },
  ],
  
  # === CLI INTERFACE ===
  # This bundle can be executed
  executable = {
    name = "phoenix-vcs",
    description = "Phoenix VCS - Theory-driven code generation",
    
    commands = [
      {
        name = "pipeline",
        description = "Run the complete pipeline on an NCL spec",
        input = "Spec",
        output = "CodeModule",
        morphism = "PhoenixPipeline",
      },
      {
        name = "validate",
        description = "Validate an NCL spec against theory",
        input = "Spec",
        output = "Bool",
      },
      {
        name = "compile",
        description = "Compile theories without generating code",
        input = "Spec",
        output = "CanonGraph",
        morphism = "mu_ingest ∘ mu_canon",
      },
    ],
  },
  
} | T.Bundle
