# Template for Python Textual TUI Applications
# Fill in {{slots}} from spec.md

{
  # SLOT: app_name - The application name (required)
  name = "{{app_name}}",
  
  # SLOT: app_description - Brief description (required)
  description = "{{app_description}}",
  
  # Fixed template selection
  template = "python-textual",
  build_type = "python",
  
  # SLOT: spec_version - Spec format version
  spec_version = "{{spec_version}}",
  
  # SLOT: version - App semantic version
  version = "{{version}}",
  
  # UI Configuration
  ui_config = {
    # SLOT: theme - "dark" or "light"
    theme = "{{theme}}",
    
    # SLOT: show_header - true/false
    show_header = {{show_header}},
    
    # SLOT: show_footer - true/false  
    show_footer = {{show_footer}},
    
    # SLOT: refresh_rate_hz - Animation refresh rate
    refresh_rate_hz = {{refresh_rate_hz}},
    
    # Layout configuration
    layout = {
      # SLOT: layout_type - "grid", "vertical", "horizontal"
      type = "{{layout_type}}",
      
      # SLOT: grid_columns - Number of columns (if grid)
      columns = {{grid_columns}},
      
      # SLOT: grid_rows - Row sizes like "1fr 3fr auto"
      rows = "{{grid_rows}}",
      
      # SLOT: grid_gap - Gap between cells
      gap = {{grid_gap}},
      
      # Focus management
      focus = {
        # SLOT: focus_initial - Widget id for initial focus
        initial = "{{focus_initial}}",
        
        # SLOT: focus_wrap - true/false for tab wrapping
        wrap = {{focus_wrap}},
      },
      
      # SLOT: widgets - Array of widget records (required)
      # Each widget: { type, id?, title?, children?, ...props }
      widgets = {{widgets}},
    },
    
    # SLOT: key_bindings - Array of { key, action, context? }
    key_bindings = {{key_bindings}},
    
    # SLOT: styles - CSS-like styling record
    styles = {{styles}},
  },
  
  # SLOT: data_model - State and configuration schema
  data_model = {{data_model}},
  
  # SLOT: integrations - External services/APIs
  integrations = {{integrations}},
}
