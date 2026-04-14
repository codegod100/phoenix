{
  # ThLit: Theory for Lit Web Components Applications
  
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
  ],
}
