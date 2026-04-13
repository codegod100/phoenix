# Contract-Based Template for Python-Textual (Theory Document Format)
# 
# This template generates a panproto TheoryDocument that can be loaded
# by panproto_theory_dsl::load() as ThPythonTextual.
#
# The TheoryDocument structure is:
# {
#   id = "...",
#   description = "...",
#   theory = {          # <-- TheorySpec record (not string!)
#     theory = "...",   # Theory name inside the spec
#     sorts = [...],
#     ops = [...],
#   },
#   ui_config = {...},  # Instance data
# }

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
    kind | { type | String },  # { type = "structural" } or { type = "variable" }
  },
  
  # OpSpec for operation declarations
  OpSpec = {
    name | String,
    inputs | Array InputSpec,
    output | String,
  },
  
  # TheorySpec - the theory definition record
  TheorySpec = {
    theory | String,           # Theory name (e.g., "SimpleTUI")
    extends | Array String,    # Parent theories (optional)
    sorts | Array SortSpec,    # Sort declarations
    ops | Array OpSpec,        # Operation declarations
  },
  
  # Layout configuration
  LayoutConfig = {
    type | String,
    columns | Number,
    rows | String,
    gap | Number,
    widgets | Array Widget,
  },
  
  # UI configuration (instance of the theory)
  UIConfig = {
    name | String,
    description | String,
    layout | LayoutConfig,
    key_bindings | Array KeyBinding,
    styles | { _ : String },
  }

# The panproto TheoryDocument format
in {
  # Required TheoryDocument fields
  id | String,              # e.g., "dev.phoenix.simple-tui"
  description | String,     # Human-readable description
  
  # Theory definition - TheorySpec record containing sorts, ops, etc.
  theory | TheorySpec,
  
  # UI configuration (instance of the theory - the actual spec values)
  ui_config | UIConfig,
  
  # Metadata (for compatibility)
  template | String,        # FIXED: "python-textual"
  build_type | String,      # FIXED: "python"
  version | String,
  spec_version | String,
}
