# Theory Document Example for Simple TUI
# This is a panproto TheoryDocument that defines ThPythonTextual
# 
# Architecture: Each UI concept is its own sort - no UIConfig wrapper!
# The "ui config" is decomposed into separate sorts that work together.

{
  # TheoryDocument metadata (REQUIRED)
  id = "dev.phoenix.simple-tui",
  description = "A feature-rich terminal user interface built with Textual",
  
  # Theory name
  theory = "SimpleTUI",
  extends = [],
  
  # Sort declarations - each UI concept is a FIRST-CLASS SORT
  sorts = [
    # Artifact generation sub-theories
    { name = "ThPyproject", kind = { type = "structural" } },
    { name = "ThNix", kind = { type = "structural" } },
    { name = "ThApp", kind = { type = "structural" } },
    { name = "ThCSS", kind = { type = "structural" } },
    { name = "ThREADME", kind = { type = "structural" } },
    { name = "ThIntegratedApp", kind = { type = "structural" } },
    
    # UI types - each is its own sort!
    { name = "ProjectName", kind = { type = "val", value_kind = "string" } },
    { name = "ProjectDescription", kind = { type = "val", value_kind = "string" } },
    { name = "LayoutType", kind = { type = "val", value_kind = "string" } },
    { name = "LayoutColumns", kind = { type = "val", value_kind = "integer" } },
    { name = "LayoutRows", kind = { type = "val", value_kind = "string" } },
    { name = "LayoutGap", kind = { type = "val", value_kind = "integer" } },
    { name = "WidgetTree", kind = { type = "structural" } },
    { name = "KeyBindings", kind = { type = "structural" } },
    { name = "Styles", kind = { type = "structural" } },
    
    # Widget types (each is a sort)
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
    { name = "Number", kind = { type = "structural" } },
    { name = "Bool", kind = { type = "structural" } },
    { name = "Config", kind = { type = "structural" } },
  ],
  
  # Operations - constructors for each sort
  ops = [
    # Sub-theory generation
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
    
    # UI value constructors - each creates its own sort
    { name = "mk_project_name", inputs = [{ name = "name", sort = "String" }], output = "ProjectName" },
    { name = "mk_description", inputs = [{ name = "desc", sort = "String" }], output = "ProjectDescription" },
    { name = "mk_layout_type", inputs = [{ name = "type", sort = "String" }], output = "LayoutType" },
    { name = "mk_layout_columns", inputs = [{ name = "cols", sort = "Number" }], output = "LayoutColumns" },
    { name = "mk_layout_rows", inputs = [{ name = "rows", sort = "String" }], output = "LayoutRows" },
    { name = "mk_layout_gap", inputs = [{ name = "gap", sort = "Number" }], output = "LayoutGap" },
    
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
        { name = "children", sort = "WidgetTree" }
      ],
      output = "Sidebar"
    },
    { 
      name = "mk_main_content",
      inputs = [
        { name = "id", sort = "String" },
        { name = "title", sort = "String" },
        { name = "children", sort = "WidgetTree" }
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
        { name = "children", sort = "WidgetTree" }
      ],
      output = "Container"
    },
    
    # WidgetTree composition
    {
      name = "mk_widget_tree",
      inputs = [{ name = "widgets", sort = "Array Widget" }],
      output = "WidgetTree"
    },
    
    # Key bindings
    { 
      name = "mk_key_binding",
      inputs = [
        { name = "key", sort = "String" },
        { name = "action", sort = "String" },
        { name = "context", sort = "String" }
      ],
      output = "KeyBindings"
    },
    {
      name = "mk_key_bindings",
      inputs = [{ name = "bindings", sort = "Array KeyBindings" }],
      output = "KeyBindings"
    },
    
    # Styles
    {
      name = "mk_styles",
      inputs = [{ name = "styles", sort = "Styles" }],
      output = "Styles"
    },
    
    # Composition: ThNix uses this to build the app
    {
      name = "compose_app",
      inputs = [
        { name = "name", sort = "ProjectName" },
        { name = "desc", sort = "ProjectDescription" },
        { name = "layout_type", sort = "LayoutType" },
        { name = "widgets", sort = "WidgetTree" },
        { name = "keys", sort = "KeyBindings" },
        { name = "styles", sort = "Styles" },
      ],
      output = "ThIntegratedApp"
    },
  ],
  
  # Extra metadata (ignored by panproto, used by Phoenix)
  template = "python-textual",
  build_type = "python",
  version = "0.1.0",
  spec_version = "1.0",
  
  # Phoenix instance config - the actual values
  # Each field here maps to a sort in the theory
  phoenix_config = {
    project_name = "Simple TUI",
    project_description = "A simple terminal UI for task management",
    layout_type = "grid",
    layout_columns = 2,
    layout_rows = "1fr 4fr 1fr",
    layout_gap = 1,
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
