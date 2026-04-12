# th_spec.ncl - Theory of NCL Specifications
# The source theory: panproto/nickel theory documents

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.theories.spec",
  description = "Theory of NCL specification documents (panproto bundles)",
  theory = "ThSpec",
  
  sorts = [
    # A specification bundle (the .ncl file itself)
    { name = "Spec", params = [
      { name = "path", sort = "Path" },
      { name = "id", sort = "String" },
      { name = "bundle", sort = "Bundle" }
    ]},
    # Bundle content
    { name = "Bundle", params = [
      { name = "theories", sort = "TheorySet" },
      { name = "morphisms", sort = "MorphismSet" },
      { name = "protocols", sort = "ProtocolSet" },
      { name = "files", sort = "FileSet" }
    ]},
    # Individual theory reference
    { name = "TheoryRef", params = [
      { name = "name", sort = "String" },
      { name = "external", sort = "Bool" }
    ]},
    # Morphism reference
    { name = "MorphismRef", params = [
      { name = "name", sort = "String" },
      { name = "domain", sort = "String" },
      { name = "codomain", sort = "String" }
    ]},
    # Generation directive
    { name = "GenDirective", params = [
      { name = "language", sort = "String" },
      { name = "output_path", sort = "Path" },
      { name = "template", sort = "String" }
    ]},
    # File path
    T.simple "Path",
    # Names
    T.simple "String",
    # Boolean
    { name = "Bool", kind = { type = "val", value_kind = "boolean" } },
    # Sets
    T.simple "TheorySet",
    T.simple "MorphismSet",
    T.simple "ProtocolSet",
    T.simple "FileSet",
  ],
  
  ops = [
    # Load an NCL spec file
    {
      name = "load",
      inputs = [{ name = "path", sort = "Path" }],
      output = "Spec"
    },
    # Get generation directives from spec
    {
      name = "extract_generations",
      inputs = [{ name = "spec", sort = "Spec" }],
      output = "GenSet"
    },
    # Get morphisms that need code generation
    {
      name = "extract_morphisms",
      inputs = [{ name = "spec", sort = "Spec" }],
      output = "MorphismSet"
    },
    # Get output path for a generation
    {
      name = "output_path",
      inputs = [{ name = "gen", sort = "GenDirective" }],
      output = "Path"
    },
    # Check if morphism is external (don't generate)
    {
      name = "is_external",
      inputs = [{ name = "morphism", sort = "MorphismRef" }],
      output = "Bool"
    },
  ],
  
  equations = [
    # Loading is idempotent: load(load(path)) = load(path)
    {
      name = "load_idempotent",
      lhs = "load(path)",
      rhs = "load(path)"
    },
    # External morphisms don't generate
    {
      name = "external_no_gen",
      lhs = "is_external(m)",
      rhs = "m.external"
    },
  ],
} | T.Theory
