{
  # ThLit: Theory for Lit Web Components Applications
  
  id = "litty",
  template = "lit",
  
  theory_name = "ThLit", 
  description = "Theory for generating TypeScript web applications using Lit framework",
  version = "0.1.0",
  
  source = {
    theory = "ThSpec",
    format = "spec_md",
  },
  
  target = {
    theory = "ThLit",
    format = "js_code",
    files = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "src/main.ts", "src/components/*.ts"],
  },
  
  sorts = {
    Component = "Lit web component with @customElement decorator, rendering reactive template with properties and events",
    Property = "Reactive property with @property decorator defining component state",
    Event = "DOM event binding for component communication",
    Template = "lit-html template with expressions and directives",
    Style = "CSS tagged template for component scoped styles",
  },
  
  operations = {
    mk_component = { arity = ["String", "Array Property", "Template", "Style"], result = "Component" },
    mk_property = { arity = ["String", "String"], result = "Property" },
    mk_template = { arity = ["String"], result = "Template" },
    mk_style = { arity = ["String"], result = "Style" },
    mk_event = { arity = ["String", "String"], result = "Event" },
  },
  
  examples = [
    { name = "hero", input = "Hero section with gradient background, title, subtitle, and cat decorations", output = "Lit component with gradient styling and decorative elements" },
    { name = "counter", input = "Counter with +/- buttons and cat paw icons", output = "Lit component with reactive count property and paw-styled buttons" },
    { name = "todo-list", input = "Todo list with add, toggle, and delete functionality", output = "Lit components with array property and paw checkbox styling" },
  ],
  
  phoenix_config = {
    project_name = "litty",
    project_description = "A cute kitty-themed Lit web components app with pastel colors and cat decorations",
    theme = "kawaii",
    colors = {
      primary = "#FFB6C1",
      secondary = "#98FB98",
      accent = "#E6E6FA",
    },
  },
}