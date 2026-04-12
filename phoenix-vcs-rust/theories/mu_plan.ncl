# mu_plan.ncl - Morphism: ThCanon → ThIU
# The planning phase: partition canonical nodes into implementation units

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.morphisms.plan",
  description = "μ_plan: Partition canonical graph into implementation units",
  morphism = "mu_plan",
  domain = "ThCanon",
  codomain = "ThIU",
  
  # Sort mapping
  sort_map = {
    # Canon graph → IU graph
    "CanonGraph" = "IUGraph",
    # Canon node → IU (many nodes map to one IU)
    "CanonNode" = "IU",
    # Node type → risk tier
    "NodeType" = "RiskTier",
    # Domain → language
    "Domain" = "Language",
    # Hash preserved
    "Hash" = "Hash",
    # String preserved
    "String" = "String",
    # Nat → Nat
    "Nat" = "Nat",
    # Complement → nothing (absorbed)
    "Complement" = "Complement",
    # DRate → nothing (absorbed into IU)
    "DRate" = "Complement",
  },
  
  # Operation mapping
  op_map = {
    # collapse → partition
    "collapse" = "partition",
    # unique_count → iu_count
    "unique_count" = "iu_count",
    # d_rate → nothing (part of complement)
    "d_rate" = "complement",
    # filter_domain → assess_risk
    "filter_domain" = "assess_risk",
    # empty → empty
    "empty" = "zero",
  },
  
  # The partition operation is key - it groups nodes by:
  # - Domain (auth, database, api, etc)
  # - Language marker (rust, python, etc)
  # - Risk tier (security nodes grouped for verification)
  
  # Complement: which nodes went into which IU
  complement_sort = "PlanComplement",
  complement_ops = [
    {
      name = "node_to_iu_mapping",
      inputs = [{ name = "canon", sort = "CanonGraph" }],
      output = "PlanComplement"
    },
  ],
} | T.Morphism
