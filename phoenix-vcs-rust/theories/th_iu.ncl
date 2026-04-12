# th_iu.ncl - Theory of Implementation Units
# Partitioned canonical nodes into buildable units

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.theories.iu",
  description = "Theory of Implementation Units (partitioned requirements)",
  theory = "ThIU",
  
  sorts = [
    # IU Graph
    T.simple "IUGraph",
    # Individual Implementation Unit
    { name = "IU", params = [
      { name = "iu_id", sort = "Hash" },
      { name = "name", sort = "String" },
      { name = "contract", sort = "String" },
      { name = "risk_tier", sort = "RiskTier" },
      { name = "target_lang", sort = "Language" }
    ]},
    # Risk tier (low, medium, high)
    { name = "RiskTier", params = [{ name = "level", sort = "String" }] },
    # Target language
    { name = "Language", params = [{ name = "lang", sort = "String" }] },
    # Output file path
    { name = "OutputPath", params = [{ name = "path", sort = "String" }] },
    # Canon node references
    { name = "CanonRef", params = [{ name = "node_id", sort = "Hash" }] },
    # Hash type
    T.simple "Hash",
    # Text
    T.simple "String",
    # IU count
    { name = "Nat", kind = { type = "val", value_kind = "integer" } },
  ],
  
  ops = [
    # Partition canon graph into IUs
    {
      name = "partition",
      inputs = [
        { name = "canon", sort = "CanonGraph" },
        { name = "lang", sort = "Language" }
      ],
      output = "IUGraph"
    },
    # Plan single IU (simplified mode)
    {
      name = "plan_single",
      inputs = [
        { name = "canon", sort = "CanonGraph" },
        { name = "name", sort = "String" },
        { name = "lang", sort = "Language" }
      ],
      output = "IU"
    },
    # Compute IU ID from contract and sources
    {
      name = "iu_hash",
      inputs = [
        { name = "name", sort = "String" },
        { name = "contract", sort = "String" },
        { name = "sources", sort = "CanonSet" }
      ],
      output = "Hash"
    },
    # Get output path for IU
    {
      name = "output_path",
      inputs = [
        { name = "iu", sort = "IU" },
        { name = "lang", sort = "Language" }
      ],
      output = "OutputPath"
    },
    # Determine risk tier from canon nodes
    {
      name = "assess_risk",
      inputs = [{ name = "nodes", sort = "CanonSet" }],
      output = "RiskTier"
    },
    # Count IUs in graph
    {
      name = "iu_count",
      inputs = [{ name = "graph", sort = "IUGraph" }],
      output = "Nat"
    },
    # Zero
    {
      name = "zero",
      output = "Nat"
    },
    # One
    {
      name = "one",
      output = "Nat"
    },
  ],
  
  equations = [
    # Simplified planning: plan_single produces exactly 1 IU
    {
      name = "single_plan",
      lhs = "iu_count(partition(canon, lang))",
      rhs = "one()"
    } | { condition = "simplified_mode" },
    
    # IU hash is deterministic
    {
      name = "iu_hash_deterministic",
      lhs = "iu_hash(name, contract, sources)",
      rhs = "iu_hash(name, contract, sources)"
    },
    
    # Output path preserved across operations
    {
      name = "path_preservation",
      lhs = "output_path(iu, lang)",
      rhs = "output_path(iu, lang)"
    },
  ],
  
  # Policies for IU merging
  policies = [
    # High risk IUs get additional verification
    T.custom_policy "risk_high" "RiskTier" "if level = 'high' then verify_all"
  ],
} | T.Theory
