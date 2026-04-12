# th_canon.ncl - Theory of Canonicalized Requirements
# Collapsed duplicates, unique nodes only

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.theories.canon",
  description = "Theory of canonicalized requirement nodes (duplicates collapsed)",
  theory = "ThCanon",
  
  sorts = [
    # Canonical node graph
    T.simple "CanonGraph",
    # Unique canonical node
    { name = "CanonNode", params = [
      { name = "id", sort = "Hash" },
      { name = "statement", sort = "String" },
      { name = "domain", sort = "Domain" },
      { name = "node_type", sort = "NodeType" }
    ]},
    # Node type (requirement, definition, constraint, etc)
    { name = "NodeType", params = [{ name = "t", sort = "String" }] },
    # Domain categorization
    { name = "Domain", params = [{ name = "d", sort = "String" }] },
    # Content hash
    T.simple "Hash",
    # D-rate (deduplication rate)
    { name = "DRate", kind = { type = "val", value_kind = "float" } },
    # Complement: info lost during canonicalization
    { name = "Complement", params = [
      { name = "duplicates", sort = "Nat" },
      { name = "timestamp", sort = "String" }
    ]},
    # Count types
    { name = "Nat", kind = { type = "val", value_kind = "integer" } },
  ],
  
  ops = [
    # Collapse duplicates from clause graph
    {
      name = "collapse",
      inputs = [{ name = "clauses", sort = "ClauseGraph" }],
      output = "CanonGraph"
    },
    # Count unique nodes
    {
      name = "unique_count",
      inputs = [{ name = "graph", sort = "CanonGraph" }],
      output = "Nat"
    },
    # Compute D-rate: 1 - (unique/total)
    {
      name = "d_rate",
      inputs = [
        { name = "total", sort = "Nat" },
        { name = "unique", sort = "Nat" }
      ],
      output = "DRate"
    },
    # Extract complement (info lost)
    {
      name = "complement",
      inputs = [
        { name = "original", sort = "ClauseGraph" },
        { name = "canon", sort = "CanonGraph" }
      ],
      output = "Complement"
    },
    # Get nodes by domain
    {
      name = "filter_domain",
      inputs = [
        { name = "graph", sort = "CanonGraph" },
        { name = "domain", sort = "Domain" }
      ],
      output = "CanonGraph"
    },
    # Zero
    {
      name = "zero",
      output = "Nat"
    },
  ],
  
  equations = [
    # unique_count(collapse(clauses)) ≤ cardinality(clauses)
    {
      name = "collapse_reduces",
      lhs = "unique_count(collapse(clauses))",
      rhs = "cardinality(clauses)"
    } | { direction = "≤" },
    
    # d_rate(total, unique) = 1 - (unique/total)
    {
      name = "d_rate_def",
      lhs = "d_rate(total, unique)",
      rhs = "1.0 - (unique/total)"
    },
    
    # Collapsing twice is idempotent: collapse(collapse(x)) = collapse(x)
    {
      name = "collapse_idempotent",
      lhs = "collapse(collapse(clauses))",
      rhs = "collapse(clauses)"
    },
  ],
  
  # Merge policies for canonicalization
  policies = [
    # When merging duplicate clauses, keep the first occurrence
    T.keep_left "first_occurrence" "CanonNode"
  ],
} | T.Theory
