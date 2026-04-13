# freeq-py/_schema.ncl
# Panproto GAT theory for FreeQ PyO3 wrapper constraints
# This is REAL category theory, not metaphor

let T = import "panproto/theory.ncl" in

# Theory: ThinWrappers
# Defines the algebraic structure of a "thin boundary" - 
# a wrapper that adds no new semantics, only structural transport
{
  id = "dev.freeq.theories.thin-wrapper",
  description = "Theory of thin wrapper boundaries - functors with no extension",
  theory = "ThThinWrapper",
  
  sorts = [
    # Source type being wrapped
    { name = "Source", params = [{ name = "T", sort = "Type" }] },
    # Target wrapper type
    { name = "Target", params = [{ name = "T", sort = "Type" }] },
    # The inner type held by wrapper (complement)
    { name = "Inner", params = [{ name = "T", sort = "Type" }] },
    # Proof that wrapper holds ONLY the inner type
    { name = "NoExtension", params = [{ name = "w", sort = "Wrapper" }] },
    # Proof that methods delegate directly
    { name = "DirectDelegation", params = [
      { name = "f", sort = "SourceFunction" },
      { name = "g", sort = "TargetFunction" }
    ]},
    # Type class of functions
    T.simple "Type",
    T.simple "Wrapper", 
    T.simple "SourceFunction",
    T.simple "TargetFunction",
  ],
  
  ops = [
    # Functor mapping: Source(T) -> Target(T)
    {
      name = "wrap",
      inputs = [{ name = "s", sort = "Source" }],
      output = "Target"
    },
    # Get the inner value from wrapper
    {
      name = "unwrap",
      inputs = [{ name = "t", sort = "Target" }],
      output = "Source"
    },
    # Prove: wrapper.inner = original
    {
      name = "inner_proof",
      inputs = [{ name = "w", sort = "Wrapper" }],
      output = "Inner"
    },
    # Transport a function across the boundary
    {
      name = "transport",
      inputs = [
        { name = "f", sort = "SourceFunction" },
        { name = "s", sort = "Source" }
      ],
      output = "Target"
    },
    # Nullary: empty wrapper proof
    {
      name = "empty",
      output = "NoExtension"
    },
  ],
  
  # Equations enforcing thin boundary properties
  equations = [
    # wrap(unwrap(t)) = t  (retraction)
    {
      name = "wrap_unwrap_id",
      lhs = "wrap(unwrap(t))",
      rhs = "t"
    },
    # unwrap(wrap(s)) = s  (section)
    {
      name = "unwrap_wrap_id", 
      lhs = "unwrap(wrap(s))",
      rhs = "s"
    },
    # transport(f, s) = wrap(f(unwrap(wrap(s))))  (naturality)
    {
      name = "naturality",
      lhs = "transport(f, s)",
      rhs = "wrap(f(unwrap(wrap(s))))"
    },
  ],
  
  # Directed equations: computational direction
  directed_equations = [
    # wrapper.inner = original (put, no creation)
    {
      name = "no_extension",
      lhs = "inner_proof(w)",
      rhs = "original",
      impl_expr = "w.inner",
      source_kind = "Wrapper",
      target_kind = "Source"
    },
  ],
} | T.Theory
