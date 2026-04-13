# Phoenix Theory Contract
# A spec that can be loaded as a panproto theory

# UI Widget sort
let Widget = {
  type | String,
  id | String,
  title | String,
  content | String,
  children | Array Widget,
  props | { _ : String },
} in

# Layout configuration sort
let Layout = {
  type | String,
  columns | Number,
  rows | String,
  gap | Number,
} in

# Key binding sort
let KeyBinding = {
  key | String,
  action | String,
  context | String,
} in

# The theory document format for panproto_theory_dsl
{
  # Required theory metadata
  id | String,
  description | String,
  
  # The theory definition
  theory | String,  # Theory name (e.g., "SimpleTUI")
  
  # Theory sorts (types in our domain)
  sorts | Array {
    name | String,           # e.g., "Header", "Sidebar", "Footer"
    kind | String,           # "structural" | "variable"
  },
  
  # Theory operations (constructors/transforms)
  ops | Array {
    name | String,           # e.g., "header", "sidebar", "compose"
    inputs | Array String,   # Input sort names
    output | String,         # Output sort name
  },
  
  # UI configuration (instance of the theory)
  ui_config | {
    theme | String,
    show_header | Bool,
    show_footer | Bool,
    refresh_rate_hz | Number,
    
    layout | Layout,
    
    widgets | Array Widget,
    
    key_bindings | Array KeyBinding,
    
    styles | { _ : String },
  },
  
  # Project metadata
  name | String,
  version | String,
  build_type | String,
}
