# Contract-Based Template for Python-Textual (Theory Document Format)
# 
# This template generates a panproto TheoryDocument that can be loaded
# by panproto_theory_dsl::load() as ThPythonTextual.
#
# Key insight: UIConfig is now a proper SORT in the theory, not an extra field!
# The actual config values go in phoenix_config (extra field, ignored by panproto)

# Forward declarations for recursive types
let rec
  # Widget sort definition (recursive for children)
  Widget = {
    type | String,
    id | String,
    title | String,
    content | String,
    children | Array Widget,
    props | { _ : String },
  },
  
  # KeyBinding sort definition
  KeyBinding = {
    key | String,
    action | String,
    context | String,
  },
  
  # InputSpec for operation inputs
  InputSpec = {
    name | String,
    sort | String,
  },
  
  # SortSpec for sort declarations
  SortSpec = {
    name | String,
    kind | { type | String },
  },
  
  # OpSpec for operation declarations
  OpSpec = {
    name | String,
    inputs | Array InputSpec,
    output | String,
  },
  
  # Directed equation for defining terms
  DirectedEqSpec = {
    name | String,
    lhs | String,
    rhs | String,
    impl_expr | String,
  },
  
  # Phoenix config - instance data (not part of theory)
  PhoenixConfig = {
    name | String,
    description | String,
    layout | {
      type | String,
      columns | Number,
      rows | String,
      gap | Number,
      widgets | Array Widget,
    },
    key_bindings | Array KeyBinding,
    styles | { _ : String },
  }

# The panproto TheoryDocument format (FLAT structure)
in {
  # Required TheoryDocument fields
  id | String,
  description | String,
  
  # Theory name (string, not record)
  theory | String,
  
  # Sort declarations - at TOP LEVEL
  sorts | Array SortSpec,
  
  # Operations - at TOP LEVEL  
  ops | Array OpSpec,
  
  # Directed equations (optional) - define actual UI terms
  directed_equations | Array DirectedEqSpec,
  
  # Phoenix instance config - at TOP LEVEL (extra field, ignored by panproto)
  phoenix_config | PhoenixConfig,
  
  # Extra metadata (ignored by panproto)
  template | String,
  build_type | String,
  version | String,
  spec_version | String,
}
