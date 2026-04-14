{
  id = "litty",
  template = "lit",
  build_type = "typescript",
  
  phoenix_config = {
    project_name = "litty",
    project_description = "A cute kitty-themed Lit web components app with pastel colors and cat decorations",
  },
  
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
    files = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "src/main.ts"],
  },
  
  sorts = {
    Component = "Lit web component with @customElement decorator",
    Property = "Reactive property with @property decorator",
    Event = "DOM event binding",
    Template = "lit-html template",
    Style = "CSS tagged template",
  },
  
  operations = {
    mk_component = { arity = ["String", "Array Property"], result = "Component" },
    mk_property = { arity = ["String", "String"], result = "Property" },
    mk_template = { arity = ["String"], result = "Template" },
  },
  
  examples = [
    { name = "counter", input = "Counter with +/- buttons", output = "Lit component code" },
    { name = "todo-list", input = "Todo list app", output = "Lit components with state" },
    { name = "hero", input = "Hero section with gradient and cat theme", output = "Lit hero component" },
  ],
  
  theme_config = {
    background = "kitty/neko themed with soft pastel colors",
    colors = {
      primary = "#FFB6C1",
      secondary = "#FFDAB9",
      accent = "#E6E6FA",
    },
    aesthetic = "kawaii/cute with rounded corners and soft shadows",
    decorations = ["cat paw prints", "whiskers", "ears silhouettes", "hearts", "stars"],
  },
}