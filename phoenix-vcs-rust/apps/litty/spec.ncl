{
  # ThLit: Theory for Lit Web Components Applications
  
  id = "litty",
  template = "lit",
  theory_name = "ThLit",
  version = "0.1.0",
  description = "A simple web application using Lit framework for modern Web Components - todo list app demonstrating Lit reactive properties and event handling",
  
  source = {
    theory = "ThSpec",
    format = "spec_md",
  },
  
  target = {
    theory = "ThLit",
    format = "js_code",
    files = ["package.json", "tsconfig.json", "vite.config.ts", "index.html", "src/main.ts"],
  },
  
  phoenix_config = {
    project_name = "litty",
    project_description = "A simple Lit web components application with hero image, todo list, and counter components",
  },
  
  sorts = {
    Component = "Lit web component with @customElement decorator",
    Property = "Reactive property with @property decorator",
    Event = "DOM event binding",
    Template = "lit-html template",
    Style = "CSS tagged template",
    Hero = "Large hero section with welcome message",
    TodoItem = "Individual todo item with checkbox and delete action",
    Counter = "Reactive counter with increment/decrement buttons",
  },
  
  operations = {
    mk_component = {
      arity = ["String", "Array Property"],
      result = "Component",
      description = "Create Lit component with name and properties",
    },
    mk_property = {
      arity = ["String", "String"],
      result = "Property",
      description = "Create reactive property with name and type",
    },
    mk_hero = {
      arity = ["String"],
      result = "Hero",
      description = "Create hero section with welcome message",
    },
    mk_todo_item = {
      arity = ["String", "Bool"],
      result = "TodoItem",
      description = "Create todo item with text and completion state",
    },
    mk_counter = {
      arity = ["Number"],
      result = "Counter",
      description = "Create counter with initial value",
    },
    mk_template = {
      arity = ["String"],
      result = "Template",
      description = "Create lit-html template string",
    },
    mk_style = {
      arity = ["String"],
      result = "Style",
      description = "Create CSS tagged template",
    },
  },
  
  examples = [
    {
      name = "hero-section",
      input = "Hello World welcome message",
      output = "Lit component with large hero image displaying greeting",
    },
    {
      name = "todo-list",
      input = "Todo list with add, toggle, and delete functionality",
      output = "Lit components with reactive state management",
    },
    {
      name = "counter",
      input = "Counter with +/- buttons showing reactive state",
      output = "Lit component with reactive counter property",
    },
  ],
}