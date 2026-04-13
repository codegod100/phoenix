# freeq-py/_schema.ncl
# Theory of single-file terminal compilation units
# A terminal object in Mod_Rust (no incoming arrows from other modules)

let T = import "panproto/theory.ncl" in

{
  id = "dev.freeq.theories.single-file",
  description = "Theory of terminal compilation units - single file, no module deps",
  theory = "ThSingleFile",
  
  sorts = [
    # The compilation unit (terminal object)
    { name = "Unit", params = [{ name = "path", sort = "Path" }] },
    # Module declarations (FORBIDDEN in this theory)
    { name = "ModDecl", params = [
      { name = "name", sort = "String" },
      { name = "target", sort = "Path" }
    ]},
    # File system paths
    T.simple "Path",
    # String names
    T.simple "String",
    # Proof of terminality (no incoming arrows)
    { name = "Terminal", params = [{ name = "u", sort = "Unit" }] },
    # Empty (no mod declarations)
    T.simple "Empty",
  ],
  
  ops = [
    # Count mod declarations in a unit
    {
      name = "count_mods",
      inputs = [{ name = "u", sort = "Unit" }],
      output = "Nat"
    },
    # Prove: unit has no mod declarations
    {
      name = "no_mods",
      inputs = [{ name = "u", sort = "Unit" }],
      output = "Empty"
    },
    # Get output path
    {
      name = "output_path",
      inputs = [{ name = "u", sort = "Unit" }],
      output = "Path"
    },
    # Check if mod declaration is forbidden
    {
      name = "is_forbidden",
      inputs = [{ name = "m", sort = "ModDecl" }],
      output = "Bool"
    },
    # Constant: zero mod declarations
    {
      name = "zero",
      output = "Nat"
    },
    # Constant: true (forbidden)
    {
      name = "true",
      output = "Bool"
    },
  ],
  
  equations = [
    # count_mods(unit) = 0  (no mod declarations)
    {
      name = "no_mod_declarations",
      lhs = "count_mods(u)",
      rhs = "zero()"
    },
    # is_forbidden(mod_decl) = true  (all mod decls are forbidden)
    {
      name = "all_mods_forbidden",
      lhs = "is_forbidden(m)",
      rhs = "true()"
    },
  ],
  
  # Policies for conflict resolution
  policies = [
    # If we find a mod declaration, fail (don't auto-resolve)
    T.fail_on_conflict "forbid_mods" "ModDecl"
  ],
} | T.Theory
