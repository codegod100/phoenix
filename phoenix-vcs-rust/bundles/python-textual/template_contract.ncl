# Contract-Based Template for Python-Textual
# 
# This template uses Nickel contracts to define the shape of the spec.
# The LLM generates Nickel code that must satisfy these contracts.

{
  # Contract: Application metadata
  name | String,
  description | String,
  
  # Fixed values (not generated)
  template = "python-textual",
  build_type = "python",
  
  # Contract: Version info
  spec_version | String,
  version | String,
  
  # Contract: UI configuration
  ui_config | {
    theme | String,  # "dark" or "light"
    show_header | Bool,
    show_footer | Bool,
    refresh_rate_hz | Number,
    
    # Contract: Layout structure
    layout | {
      type | String,      # "grid", "vertical", "horizontal"
      columns | Number,   # for grid
      rows | String,      # e.g., "1fr 3fr auto"
      gap | Number,
      
      # Contract: Focus management
      focus | {
        initial | String,   # widget id
        wrap | Bool,
      },
      
      # Contract: Widget tree - this is the main generated content
      widgets | Array Widget,
    },
    
    # Contract: Key bindings
    key_bindings | Array KeyBinding,
    
    # Contract: Styling
    styles | Dyn,  # Flexible record for CSS-like styling
  },
  
  # Contract: Optional data model
  data_model | Dyn,
  
  # Contract: Optional integrations
  integrations | Dyn,
}

# Widget contract - defines valid widget shapes
let Widget = {
  type | String,  # "Header", "Footer", "Container", "ListView", "Static", "Input", etc.
  id | String,    # unique identifier
  title | String, # optional label/title
  children | Array Widget,  # nested widgets
  
  # Widget-type specific fields are dynamic
  # Header: show_clock | Bool
  # ListView: items | Array String, focusable | Bool
  # Static: content | String
  # Input: placeholder | String
  # ...etc
} in {}

# KeyBinding contract
let KeyBinding = {
  key | String,       # e.g., "q", "enter", "ctrl+c"
  action | String,    # e.g., "quit", "help", "focus_next"
  context | String,   # "global", "navigation", "input"
} in {}
