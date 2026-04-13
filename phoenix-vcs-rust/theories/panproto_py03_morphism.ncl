# freeq-py/_schema.ncl
# Morphism: ThThinWrapper → ThSingleFile
# The PyO3 wrapper IS a thin wrapper AND a single-file terminal object

let T = import "panproto/theory.ncl" in

{
  id = "dev.freeq.morphisms.pyo3-constraints",
  description = "PyO3 module satisfies both thin-wrapper and single-file theories",
  morphism = "pyo3_is_thin_and_single",
  domain = "ThThinWrapper",
  codomain = "ThSingleFile",
  
  # Map sorts from thin wrapper to single file
  sort_map = {
    # Wrapper's Source maps to Unit's internal types
    "Source" = "Path",
    "Target" = "Unit", 
    "Inner" = "String",  # The module name
    "NoExtension" = "Empty",
    "DirectDelegation" = "Terminal",
    "Type" = "Path",
    "Wrapper" = "Unit",
    "SourceFunction" = "String",
    "TargetFunction" = "String",
  },
  
  # Map operations
  op_map = {
    # wrap → output_path (specifying where the unit goes)
    "wrap" = "output_path",
    # unwrap → no_mods (proving no external deps)
    "unwrap" = "no_mods",
    # inner_proof → identity on path
    "inner_proof" = "output_path",
    # transport → count_mods (verifying zero mods)
    "transport" = "count_mods",
    # empty → zero (proof of no extension)
    "empty" = "zero",
  },
} | T.Morphism
