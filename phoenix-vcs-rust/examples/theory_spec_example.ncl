# Theory Document Example for Simple TUI
# This is a panproto TheoryDocument that defines ThPythonTextual
# 
# Structure:
# - id: TheoryDocument identifier (required)
# - description: Human-readable description (required)
# - theory: TheorySpec record containing sorts, ops, and ui_config (instance)

{
  # TheoryDocument metadata (REQUIRED by panproto)
  id = "dev.phoenix.simple-tui",
  description = "A feature-rich terminal user interface built with Textual",
  
  # Theory definition - TheorySpec record (REQUIRED structure)
  # The theory field contains: theory name, extends, sorts, ops
  # AND the ui_config as nested data (panproto ignores unknown fields in TheorySpec)
  theory = {
    # Theory name inside the spec
    theory = "SimpleTUI",
    extends = [],
    
    # Sort declarations - sub-theories + UI widget types
    sorts = [
      # Artifact generation sub-theories
      { name = "ThPyproject", kind = { type = "structural" } },
      { name = "ThNix", kind = { type = "structural" } },
      { name = "ThApp", kind = { type = "structural" } },
      { name = "ThCSS", kind = { type = "structural" } },
      { name = "ThREADME", kind = { type = "structural" } },
      { name = "ThIntegratedApp", kind = { type = "structural" } },
      # UI widget types
      { name = "Header", kind = { type = "structural" } },
      { name = "Sidebar", kind = { type = "structural" } },
      { name = "MainContent", kind = { type = "structural" } },
      { name = "Footer", kind = { type = "structural" } },
      { name = "ListView", kind = { type = "structural" } },
      { name = "LogView", kind = { type = "structural" } },
      { name = "Static", kind = { type = "structural" } },
      { name = "Container", kind = { type = "structural" } },
      # Primitives
      { name = "String", kind = { type = "structural" } },
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
      # Widget constructors
      { 
        name = "header",
        inputs = [{ name = "title", sort = "String" }],
        output = "Header"
      },
      { 
        name = "sidebar",
        inputs = [],
        output = "Sidebar"
      },
      { 
        name = "main",
        inputs = [],
        output = "MainContent"
      },
      { 
        name = "footer",
        inputs = [{ name = "text", sort = "String" }],
        output = "Footer"
      },
      { 
        name = "compose",
        inputs = [
          { name = "h", sort = "Header" },
          { name = "s", sort = "Sidebar" },
          { name = "m", sort = "MainContent" },
          { name = "f", sort = "Footer" }
        ],
        output = "UIConfig"
      },
      # Key binding constructor
      { 
        name = "bind_key",
        inputs = [
          { name = "key", sort = "String" },
          { name = "action", sort = "String" }
        ],
        output = "KeyBinding"
      },
    ],
    
    # UI CONFIGURATION (nested inside theory record)
    # This is instance data, not part of the theory structure
    # Phoenix extracts this after loading the theory
    ui_config = {
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
      # Phoenix metadata (not part of theory)
      template = "python-textual",
      build_type = "python",
      version = "0.1.0",
    },
  },
}
