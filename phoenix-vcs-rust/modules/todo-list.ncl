{
  id = "todo-list",
  name = "Todo List Component",
  version = "1.0.0",
  
  provides = ["ui-component", "elena-component"],
  needs = ["database", "styling"],
  
  generation = {
    target = "typescript",
    exports = ["TodoList"],
    resource_file = "todo-list.ts",
    
    vertices = [
      {
        type = "Import",
        source = "elenajs-core",
        items = ["Elena", "html"]
      },
      {
        type = "Import",
        source = "style-utils", 
        items = ["styles", "theme"]
      },
      {
        type = "ClassDecl",
        name = "TodoList",
        code = m%"RESOURCE:todo-list.ts"%
      }
    ]
  }
}
