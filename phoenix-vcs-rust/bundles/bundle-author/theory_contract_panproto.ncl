{
  # ThBundleDef: Theory of Bundle Definition
  # A GAT for defining new Phoenix VCS template bundles
  
  theory_id = "bundle-author",
  theory_name = "ThBundleDef",
  version = "0.1.0",
  
  # Description
  description = "Theory for creating new Phoenix VCS template bundles. A bundle definition specifies the 5 files that constitute a complete code generation bundle for a target language/framework.",
  
  # Source theory (what we parse from spec.md)
  source = {
    theory = "ThSpec",
    format = "spec_md",
    grammar = "markdown",
  },
  
  # Target theory (what we generate - a bundle definition)
  target = {
    theory = "ThBundleDef",
    format = "panproto",
    files = [
      "bundle.ncl",
      "template_contract.ncl", 
      "theory_contract_panproto.ncl",
      "prompt_theory.md",
      "prompt_contract.md",
    ],
  },
  
  # Sorts (types in the theory)
  sorts = {
    BundleId = "Identifier for the new bundle (e.g., swift-vapor)",
    BundleMeta = "Bundle metadata (name, description, keywords)",
    TargetConfig = "Target configuration (build_type, framework, language)",
    FileSpec = "Specification for a bundle file",
    DepSpec = "Dependency specification for generated apps",
    TheoryMorphism = "Formal morphism name (e.g., μ_swift_vapor)",
  },
  
  # Operations (constructors)
  operations = {
    # mk_bundle_def: creates a bundle definition
    mk_bundle_def = {
      arity = [
        "BundleId",       # id
        "BundleMeta",     # metadata
        "TargetConfig",   # target configuration
        "List FileSpec",  # files (must be 5)
        "List DepSpec",   # dependencies
        "TheoryMorphism", # formal morphism
      ],
      result = "BundleDef",
    },
    
    # mk_bundle_meta: creates bundle metadata
    mk_bundle_meta = {
      arity = [
        "String",         # name
        "String",         # description
        "String",         # version
        "List String",    # keywords
      ],
      result = "BundleMeta",
    },
    
    # mk_target_config: creates target configuration
    mk_target_config = {
      arity = [
        "String",         # build_type (python, rust, swift, etc.)
        "String",         # template (bundle id)
        "String",         # framework
        "String",         # language
      ],
      result = "TargetConfig",
    },
    
    # mk_file_spec: creates a file specification
    mk_file_spec = {
      arity = [
        "String",         # path
        "String",         # description
        "String",         # theory (ThBundleMeta, ThContract, etc.)
      ],
      result = "FileSpec",
    },
  },
  
  # Equations (algebraic laws)
  equations = [
    # Identity: bundle definition has 5 files
    "∀ bd: BundleDef. length(bd.files) = 5",
    
    # Required files must be present
    "∀ bd: BundleDef. has_file(bd, \"bundle.ncl\") ∧ has_file(bd, \"template_contract.ncl\") ∧ has_file(bd, \"theory_contract_panproto.ncl\") ∧ has_file(bd, \"prompt_theory.md\") ∧ has_file(bd, \"prompt_contract.md\")",
    
    # Build type must be valid
    "∀ bd: BundleDef. bd.target.build_type ∈ {python, rust, typescript, bun, swift, go, bundle}",
    
    # Template must match bundle id
    "∀ bd: BundleDef. bd.target.template = bd.bundle.id",
    
    # Main generation morphism
    "μ_bundle_def: ThSpec → ThBundleDef",
    
    # Composition: bundle def → bundle files
    "generate_bundle_def = μ_bundle_def ∘ μ_files ∘ μ_contracts",
  ],
  
  # Axioms (properties that must hold)
  axioms = [
    "Bundle id must be kebab-case (lowercase with hyphens)",
    "Bundle name must be Title Case",
    "All 5 bundle files must have valid theories assigned",
    "Dependencies must be valid package names",
    "Theory morphism must follow naming convention (μ_*)",
  ],
  
  # Examples
  examples = [
    {
      name = "swift-vapor",
      input = "Swift Vapor web API server bundle",
      output = "5 files defining Swift Vapor code generation",
    },
    {
      name = "go-fiber",
      input = "Go Fiber web framework bundle",
      output = "5 files defining Go Fiber code generation",
    },
    {
      name = "java-spring",
      input = "Java Spring Boot bundle",
      output = "5 files defining Java Spring code generation",
    },
  ],
  
  # Morphisms to other theories
  morphisms = {
    # To bundle files
    to_bundle_files = {
      source = "ThBundleDef",
      target = "ThFileGen",
      description = "Generate the 5 bundle files",
    },
    
    # To bundle implementation
    to_bundle_impl = {
      source = "ThBundleDef",
      target = "ThBundleImpl",
      description = "Create runnable bundle implementation",
    },
  },
}
