# th_clause.ncl - Theory of Clauses
# Intermediate representation: parsed but not normalized

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.theories.clause",
  description = "Theory of parsed requirement clauses",
  theory = "ThClause",
  
  sorts = [
    # A clause graph (collection of clauses with relations)
    T.simple "ClauseGraph",
    # Individual clause
    { name = "Clause", params = [
      { name = "id", sort = "Hash" },
      { name = "text", sort = "String" },
      { name = "source_file", sort = "Path" }
    ]},
    # Clause type/requirement kind
    { name = "ClauseType", params = [{ name = "kind", sort = "String" }] },
    # SHA-256 hash
    T.simple "Hash",
    # File path
    T.simple "Path",
    # Text content
    T.simple "String",
    # Clause count
    { name = "Nat", kind = { type = "val", value_kind = "integer" } },
    # Duplicate indicator
    T.simple "Duplicate",
  ],
  
  ops = [
    # Hash a clause (SHA-256 of normalized text)
    {
      name = "hash_clause",
      inputs = [{ name = "clause", sort = "Clause" }],
      output = "Hash"
    },
    # Normalize clause text (clean for comparison)
    {
      name = "normalize",
      inputs = [{ name = "text", sort = "String" }],
      output = "String"
    },
    # Count clauses in graph
    {
      name = "cardinality",
      inputs = [{ name = "graph", sort = "ClauseGraph" }],
      output = "Nat"
    },
    # Identify duplicates (same hash)
    {
      name = "find_duplicates",
      inputs = [{ name = "graph", sort = "ClauseGraph" }],
      output = "DuplicateSet"
    },
    # Get clause type from text
    {
      name = "infer_type",
      inputs = [{ name = "text", sort = "String" }],
      output = "ClauseType"
    },
    # Empty graph
    {
      name = "empty",
      output = "ClauseGraph"
    },
  ],
  
  equations = [
    # Normalization is idempotent: normalize(normalize(x)) = normalize(x)
    {
      name = "normalize_idempotent",
      lhs = "normalize(normalize(text))",
      rhs = "normalize(text)"
    },
    # Same normalized text → same hash
    {
      name = "hash_deterministic",
      lhs = "hash_clause(c1)",
      rhs = "hash_clause(c2)
    } | { condition = "normalize(clause_text(c1)) = normalize(clause_text(c2))" },
  ],
} | T.Theory
