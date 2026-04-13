# Contract-Based Template for Python-Textual (Theory Document Format)
# 
# Architecture: UI concepts are DECOMPOSED into separate sorts
# No UIConfig wrapper - each concept (name, layout, widgets, etc.) is its own sort!

# Forward declarations for recursive types
let rec
  # Widget tree (recursive for children)
  Widget = {
    type | String,
    id | String,
    title | String,
    content | String,
    children | Array Widget,
    props | { _ : String },
  },
  
  # Key binding
  KeyBinding = {
    key | String,
    action | String,
    context | String,
  },
  
  # Input for operation
  InputSpec = {
    name | String,
    sort | String,
  },
  
  # Sort kind - use "val" for value sorts (strings, numbers)
  ValKind = { type | String, value_kind | String },
  StructuralKind = { type | String },
  
  # Sort declaration
  SortSpec = {
    name | String,
    kind | ValKind or StructuralKind,
  },
  
  # Operation
  OpSpec = {
    name | String,
    inputs | Array InputSpec,
    output | String,
  },
  
  # Phoenix instance config
  PhoenixConfig = {
    project_name | String,
    project_description | String,
    layout_type | String,
    layout_columns | Number,
    layout_rows | String,
    layout_gap | Number,
    widgets | Array Widget,
    key_bindings | Array KeyBinding,
    styles | { _ : String },
  }

# TheoryDocument format - each UI concept is its own sort!
in {
  # Required fields
  id | String,
  description | String,
  theory | String,
  
  # Sorts - each UI concept is a FIRST-CLASS SORT
  sorts | Array SortSpec,
  
  # Operations - constructors for each sort
  ops | Array OpSpec,
  
  # Phoenix instance data
  phoenix_config | PhoenixConfig,
  
  # Metadata
  template | String,
  build_type | String,
  version | String,
  spec_version | String,
}
