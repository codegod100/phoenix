# mu_canon.ncl - Morphism: ThClause → ThCanon
# The canonicalization phase: collapse duplicate clauses

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.morphisms.canon",
  description = "μ_canon: Collapse duplicate clauses into canonical nodes",
  morphism = "mu_canon",
  domain = "ThClause",
  codomain = "ThCanon",
  
  # Sort mapping
  sort_map = {
    # Clause graph becomes canon graph
    "ClauseGraph" = "CanonGraph",
    # Individual clause → canonical node
    "Clause" = "CanonNode",
    # Clause type → node type
    "ClauseType" = "NodeType",
    # Hash preserved
    "Hash" = "Hash",
    # Path preserved
    "Path" = "Path",
    # String preserved
    "String" = "String",
    # Nat → Nat (counts preserved)
    "Nat" = "Nat",
    # Duplicate info maps to complement
    "Duplicate" = "Complement",
  },
  
  # Operation mapping
  op_map = {
    # hash_clause → identity (already a hash)
    "hash_clause" = "identity",
    # normalize → normalize (preserved)
    "normalize" = "normalize",
    # cardinality(total) → (unique_count, d_rate)
    "cardinality" = "unique_count",
    # find_duplicates → complement
    "find_duplicates" = "complement",
    # infer_type → node domain
    "infer_type" = "filter_domain",
    # empty → empty
    "empty" = "empty",
  },
  
  # The morphism contracts:
  # - Duplicate clauses (same hash) collapse to single node
  # - Count goes from total → unique
  # - D-rate computed as complement
  
  # Complement: duplicate information
  complement_sort = "CanonComplement",
  complement_ops = [
    {
      name = "canon_complement",
      inputs = [
        { name = "original", sort = "ClauseGraph" },
        { name = "canon", sort = "CanonGraph" }
      ],
      output = "CanonComplement"
    },
  ],
  
  # Equations enforced by this morphism
  equations = [
    # d_rate = 1 - (unique/total)
    {
      name = "d_rate_from_collapse",
      lhs = "d_rate(cardinality(clauses), unique_count(collapse(clauses)))",
      rhs = "complement(original, canon).d_rate"
    },
  ],
} | T.Morphism
