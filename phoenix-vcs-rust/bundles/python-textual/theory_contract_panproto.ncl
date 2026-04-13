# Contract-Based Template for Python-Textual (Theory Document Format)
# 
# This template generates a panproto TheoryDocument that can be loaded
# by panproto_theory_dsl::load() as ThPythonTextual.
#
# The TheoryDocument structure is:
# {
#   id = "...",
#   description = "...",
#   theory = {          # <-- TheorySpec record
#     theory = "...",   # Theory name inside the spec
#     extends = [...],
#     sorts = [...],
#     ops = [...],
#     ui_config = {...},  # Instance data nested inside
#   }
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
    kind | { type | String },
  },
  
  # OpSpec for operation declarations
  OpSpec = {
    name | String,
    inputs | Array InputSpec,
    output | String,
  },
  
  # UI configuration nested inside theory
  UIConfig = {
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
    # Phoenix metadata
    template | String,
    build_type | String,
    version | String,
  },
  
  # TheorySpec - the theory definition record
  TheorySpec = {
    theory | String,           # Theory name
    extends | Array String,    # Parent theories
    sorts | Array SortSpec,    # Sort declarations
    ops | Array OpSpec,        # Operation declarations
    ui_config | UIConfig,      # Instance data (nested)
  }

# The panproto TheoryDocument format
in {
  # Required TheoryDocument fields
  id | String,
  description | String,
  
  # Theory definition - TheorySpec record containing sorts, ops, ui_config
  theory | TheorySpec,
}
