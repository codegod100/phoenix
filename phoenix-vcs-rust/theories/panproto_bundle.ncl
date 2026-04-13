# freeq-py/_schema.ncl
# Bundle: All panproto theories for FreeQ PyO3 constraints

let T = import "panproto/theory.ncl" in

{
  id = "dev.freeq.bundle.constraints",
  description = "Complete theory bundle for FreeQ PyO3 code generation constraints",
  bundle = "FreeQConstraints",
  
  theories = [
    # Theory 1: Thin wrappers (no semantic extension)
    {
      theory = "ThThinWrapper",
      description = "Functors with no extension between Rust and Python",
      sorts = [
        T.simple "Source",
        T.simple "Target", 
        T.simple "Inner",
        T.simple "NoExtension",
      ],
      ops = [
        T.unary "wrap" "Source" "Target",
        T.unary "unwrap" "Target" "Source",
        T.nullary "empty" "NoExtension",
      ],
      equations = [
        T.eq "wrap_unwrap_id" "wrap(unwrap(t))" "t",
        T.eq "unwrap_wrap_id" "unwrap(wrap(s))" "s",
      ],
    },
    
    # Theory 2: Single file units (terminal objects)
    {
      theory = "ThSingleFile",
      description = "Terminal objects in Mod_Rust - no incoming module arrows",
      sorts = [
        T.simple "Unit",
        T.simple "ModDecl",
        { name = "Nat", kind = { type = "val", value_kind = "integer" } },
      ],
      ops = [
        T.unary "count_mods" "Unit" "Nat",
        { name = "zero", inputs = [], output = "Nat" },
      ],
      equations = [
        T.eq "no_mods" "count_mods(u)" "zero",
      ],
      policies = [
        T.fail_on_conflict "forbid_mods" "ModDecl",
      ],
    },
  ],
  
  morphisms = [
    # The PyO3 module satisfies both constraints
    {
      morphism = "pyo3_constraints",
      domain = "ThThinWrapper",
      codomain = "ThSingleFile",
      sort_map = { "Target" = "Unit", "NoExtension" = "Empty" },
      op_map = { "wrap" = "output_path", "empty" = "zero" },
    },
  ],
  
  # These are the constraints the pipeline should enforce
  protocols = [
    {
      protocol = "enforce_thin_wrapper",
      schema_theory = "ThThinWrapper",
      instance_theory = "ThSingleFile",
      edge_rules = [
        { edge_kind = "wrap", src_kind = "Source", tgt_kind = "Target" },
        { edge_kind = "unwrap", src_kind = "Target", tgt_kind = "Source" },
      ],
    },
    {
      protocol = "enforce_single_file",
      schema_theory = "ThSingleFile", 
      instance_theory = "ThSingleFile",
      edge_rules = [
        { edge_kind = "forbids", src_kind = "Unit", tgt_kind = "ModDecl" },
      ],
    },
  ],
} | T.Bundle
