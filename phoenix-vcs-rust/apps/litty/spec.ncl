{
  id = "litty",
  description = "Simple todo list app using Lit web components with TypeScript",
  template = "lit",
  build_type = "typescript",
  
  phoenix_config = {
    project_name = "litty",
    project_description = "Simple Lit Web Components App",
    template = "lit",
    build_type = "typescript",
  },
  
  sorts = [
    { name = "TodoItem", kind = { type = "structural" } },
    { name = "LittyApp", kind = { type = "structural" } },
    { name = "TodoList", kind = { type = "structural" } },
    { name = "SimpleCounter", kind = { type = "structural" } },
  ],
  
  ops = [
    { name = "mk_todo_item", inputs = [{ name = "text", sort = "String" }], output = "TodoItem" },
    { name = "mk_litty_app", inputs = [], output = "LittyApp" },
    { name = "mk_todo_list", inputs = [], output = "TodoList" },
    { name = "mk_simple_counter", inputs = [], output = "SimpleCounter" },
  ],
  
  dependencies = {
    extra = ["lit", "typescript", "vite"],
  },
}
