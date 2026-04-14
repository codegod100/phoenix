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
    format = "ts_code",
    files = [
      "package.json",
      "tsconfig.json",
      "vite.config.ts",
      "index.html",
      "src/main.ts",
      "src/components/*.ts",
    ],
  },
  
  sorts = {
    Component = "Lit web component with @customElement decorator",
    Property = "Reactive property with @property decorator",
    Event = "DOM event binding",
    Template = "lit-html template tagged with html``",
    Style = "CSS tagged template with css``",
    CSSProperties = "CSS custom properties for theming",
  },
  
  operations = {
    mk_component = {
      arity = ["String", "Array Property", "Template", "Style"],
      result = "Component",
      description = "Create a Lit web component with properties, template, and styles",
    },
    mk_property = {
      arity = ["String", "String"],
      result = "Property",
      description = "Create a reactive property with name and type",
    },
    mk_template = {
      arity = ["String"],
      result = "Template",
      description = "Create a lit-html template from HTML string",
    },
    mk_event = {
      arity = ["String", "String"],
      result = "Event",
      description = "Create an event handler binding with event name and handler",
    },
    mk_style = {
      arity = ["String"],
      result = "Style",
      description = "Create CSS styles from CSS string",
    },
  },
  
  examples = [
    {
      name = "todo-list",
      input = "Todo list with add, toggle, and delete functionality",
      output = "TodoComponent with reactive array of todo items",
    },
    {
      name = "counter",
      input = "Counter with increment and decrement buttons",
      output = "CounterComponent with numeric state and click handlers",
    },
  ],
}