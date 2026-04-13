# Theory Document Example for Simple TUI
# This is a panproto TheoryDocument that defines ThPythonTextual
# 
# Architecture:
# - Sorts: ThPyproject, ThNix, ThApp, ThCSS, ThREADME, UIConfig, Widget, etc.
# - Operations: generate_* ops produce artifacts, mk_ui_config produces UIConfig
# - The ui_config is a TERM (instance) of sort UIConfig defined via equations

{
  # TheoryDocument metadata (REQUIRED)
  id = "dev.phoenix.simple-tui",
  description = "A feature-rich terminal user interface built with Textual",
  
  # Theory name (string, not record)
  theory = "SimpleTUI",
  extends = [],
  
  # Sort declarations
  sorts = [
    # Artifact generation sub-theories
    { name = "ThPyproject", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThApp", kind = { type = "structural" } },
    { name = "ThCSS", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },
    # UI types - UIConfig is now a proper sort!
    { name = "UIConfig", kind = { type = "structural" } },
    { name = "Widget", kind = { type = "structural" } },
    { name = "Header", kind = { type = "structural" } },
    { name = "Sidebar", kind = { type = "structural" } },
    { name = "MainContent", kind = { type = "structural" } },
    { name = "Footer", kind = { type = "structural" } },
    { name = "ListView", kind = { type = "structural" } },
    { name = "LogView", kind = { type = "structural" } },
    { name = "Static", kind = { type = "structural" } },
    { name = "Container", kind = { type = "structural" } },
    { name = "KeyBinding", kind = { type = "structural" } },
    # Primitives
    { name = "String", kind = { type = "structural" } },
    { name = "Number", kind = { type = "structural" } },
    { name = "Bool", kind = { type = "structural" } },
    { name = "Config", kind = { type = "structural" } },
  ],
  
  # Operations - constructors for the theory
  ops = [
    # Sub-theory generation operations
    { 
      name = "generate_pyproject",
      inputs = [
        { name = "theory", sort = "ThPyproject" },
        { name = "config", sort = "Config" }
      ],
      output = "TOML"
    },
    { 
      name = "generate_nix",
      inputs = [
        { name = "theory", sort = "ThNix" },
        { name = "config", sort = "Config" }
      ],
      output = "Nix"
    },
    { 
      name = "generate_app",
      inputs = [
        { name = "theory", sort = "ThApp" },
        { name = "config", sort = "Config" }
      ],
      output = "Python"
    },
    { 
      name = "generate_css",
      inputs = [
        { name = "theory", sort = "ThCSS" },
        { name = "config", sort = "Config" }
      ],
      output = "CSS"
    },
    { 
      name = "generate_readme",
      inputs = [
        { name = "theory", sort = "ThREADME" },
        { name = "config", sort = "Config" }
      ],
      output = "Markdown"
    },
    # Composition operation
    {
      name = "compose_app",
      inputs = [
        { name = "pyproject", sort = "TOML" },
        { name = "app", sort = "Python" },
        { name = "css", sort = "CSS" },
        { name = "readme", sort = "Markdown" },
        { name = "config", sort = "Config" }
      ],
      output = "ThIntegratedApp"
    },
    # UIConfig constructor - this creates the UIConfig instance!
    {
      name = "mk_ui_config",
      inputs = [
        { name = "name", sort = "String" },
        { name = "description", sort = "String" },
        { name = "layout_type", sort = "String" },
        { name = "columns", sort = "Number" },
        { name = "rows", sort = "String" },
        { name = "gap", sort = "Number" },
        { name = "widgets", sort = "Array Widget" },
        { name = "key_bindings", sort = "Array KeyBinding" },
      ],
      output = "UIConfig"
    },
    # Widget constructors
    { 
      name = "mk_header",
      inputs = [
        { name = "id", sort = "String" },
        { name = "title", sort = "String" },
        { name = "show_clock", sort = "Bool" }
      ],
      output = "Header"
    },
    { 
      name = "mk_sidebar",
      inputs = [
        { name = "id", sort = "String" },
        { name = "title", sort = "String" },
        { name = "children", sort = "Array Widget" }
      ],
      output = "Sidebar"
    },
    { 
      name = "mk_main_content",
      inputs = [
        { name = "id", sort = "String" },
        { name = "title", sort = "String" },
        { name = "children", sort = "Array Widget" }
      ],
      output = "MainContent"
    },
    { 
      name = "mk_footer",
      inputs = [
        { name = "id", sort = "String" },
        { name = "text", sort = "String" }
      ],
      output = "Footer"
    },
    { 
      name = "mk_list_view",
      inputs = [
        { name = "id", sort = "String" },
        { name = "items", sort = "Array String" },
        { name = "focusable", sort = "Bool" }
      ],
      output = "ListView"
    },
    { 
      name = "mk_static",
      inputs = [
        { name = "id", sort = "String" },
        { name = "content", sort = "String" }
      ],
      output = "Static"
    },
    { 
      name = "mk_log_view",
      inputs = [
        { name = "id", sort = "String" },
        { name = "max_lines", sort = "Number" },
        { name = "follow_tail", sort = "Bool" }
      ],
      output = "LogView"
    },
    { 
      name = "mk_container",
      inputs = [
        { name = "id", sort = "String" },
        { name = "title", sort = "String" },
        { name = "children", sort = "Array Widget" }
      ],
      output = "Container"
    },
    # Key binding constructor
    { 
      name = "mk_key_binding",
      inputs = [
        { name = "key", sort = "String" },
        { name = "action", sort = "String" },
        { name = "context", sort = "String" }
      ],
      output = "KeyBinding"
    },
  ],
  
  # Directed equations - these define the actual UI config INSTANCE
  # as a term in the theory. The ui_config is now a proper term!
  directed_equations = [
    {
      name = "ui_config",
      lhs = "UIConfig",
      rhs = "mk_ui_config(...)",
      impl_expr = "mk_ui_config(name, desc, layout, cols, rows, gap, widgets, keys)",
    },
  ],
  
  # Extra metadata (ignored by panproto, used by Phoenix)
  template = "python-textual",
  build_type = "python",
  version = "0.1.0",
  spec_version = "1.0",
  
  # Phoenix-specific: the ui_config values for easy extraction
  # This is NOT part of the theory - it's instance data Phoenix uses
  # Extract this field after loading the theory
  phoenix_config = {
    name = "Simple TUI",
    description = "A simple terminal UI for task management",
    layout = {
      type = "grid",
      columns = 2,
      rows = "1fr 4fr 1fr",
      gap = 1,
      widgets = [
        { type = "Header", id = "header", title = "Simple TUI", show_clock = true },
        { type = "Sidebar", id = "sidebar", title = "Navigation", children = [
          { type = "ListView", id = "nav_list", items = ["Home", "Tasks", "Settings"], focusable = true }
        ]},
        { type = "Container", id = "main", title = "Main Content", children = [
          { type = "Static", id = "welcome", content = "Welcome to Simple TUI" },
          { type = "LogView", id = "log", max_lines = 100, follow_tail = true }
        ]},
        { type = "Footer", id = "footer", text = "Press 'q' to quit, 'h' for help" }
      ],
    },
    key_bindings = [
      { key = "q", action = "quit", context = "global" },
      { key = "h", action = "help", context = "global" },
      { key = "tab", action = "focus_next", context = "global" },
      { key = "enter", action = "select", context = "list" },
    ],
    styles = {
      primary = "#3B82F6",
      secondary = "#64748B",
      background = "#0F172A",
    },
  },
}
