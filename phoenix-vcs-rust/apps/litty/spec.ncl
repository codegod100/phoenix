{
  # ThLit: Theory for Lit Web Components Applications
  
  theory_id = "litty",
  theory_name = "ThLit",
  description = "A cute kitty-themed Lit web components app with pastel colors and cat decorations",
  version = "0.1.0",
  
  source = {
    theory = "ThSpec",
    format = "spec_md",
  },
  
  target = {
    theory = "ThLit",
    format = "js_code",
    files = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "src/main.ts"],
  },
  
  # Sort kinds (value vs structural)
  sort_kinds = {
    Component = { type = "structural" },
    Property = { type = "val", value_kind = "string" },
    Event = { type = "val", value_kind = "string" },
    Template = { type = "structural" },
    Style = { type = "structural" },
    Color = { type = "val", value_kind = "string" },
    Layout = { type = "val", value_kind = "string" },
  },
  
  # Sorts (domain types)
  sorts = {
    HeroSection = "Hero component with gradient background, cat-themed title and subtitle, decorative elements",
    Counter = "Reactive counter with paw print buttons, rounded card design, soft shadow",
    TodoList = "Todo list with paw checkbox, pastel items, soft rounded corners",
    Component = "Lit web component with @customElement decorator",
    Property = "Reactive property with @property decorator",
    Event = "DOM event binding",
    Template = "lit-html template",
    Style = "CSS tagged template",
    Color = "Hex color value for theming",
    Gradient = "Gradient background configuration",
    Decoration = "Cat-themed decorative elements (paw prints, ears, whiskers)",
  },
  
  # Operations (constructors)
  operations = {
    mk_hero = {
      arity = ["String", "String", "Array Decoration"],
      result = "HeroSection",
      description = "Create hero section with title, subtitle, and decorative elements",
    },
    mk_counter = {
      arity = ["Number"],
      result = "Counter",
      description = "Create reactive counter component with initial value",
    },
    mk_todo_list = {
      arity = ["Array String"],
      result = "TodoList",
      description = "Create todo list component with initial items",
    },
    mk_component = {
      arity = ["String", "Array Property", "Template", "Style"],
      result = "Component",
      description = "Create Lit component with name, properties, template, and styles",
    },
    mk_property = {
      arity = ["String", "String"],
      result = "Property",
      description = "Create reactive property with name and type",
    },
    mk_decoration = {
      arity = ["String", "String"],
      result = "Decoration",
      description = "Create decorative element with type and content",
    },
  },
  
  # Phoenix instance configuration
  phoenix_config = {
    project_name = "litty",
    project_description = "A cute kitty-themed Lit web components app with pastel colors and cat decorations",
    framework = "lit",
    language = "typescript",
    build_tool = "vite",
    theme = "kitty",
    color_palette = {
      primary = "#FFB6C1",
      secondary = "#E6E6FA",
      accent_peach = "#FFDAB9",
      accent_mint = "#98FB98",
      background = "#FFF5F8",
      text = "#4A4A4A",
    },
    components = [
      "HeroSection",
      "Counter",
      "TodoList",
    ],
  },
  
  examples = [
    {
      name = "hero-component",
      input = "Title: 'Welcome to Litty! 🐱', Subtitle: 'A purr-fect web components demo'",
      output = "HeroSection with gradient pink/purple background, cat ear decorations",
    },
    {
      name = "counter-component",
      input = "Initial value: 0",
      output = "Counter with paw print buttons, mint/cream background, soft shadow",
    },
    {
      name = "todo-list",
      input = "Items: ['Feed kitty', 'Pet the cat', 'Play with yarn']",
      output = "Todo list with paw-print checkboxes, pastel colored items",
    },
  ],
}