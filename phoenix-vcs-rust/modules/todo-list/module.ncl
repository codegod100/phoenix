{
  id = "todo-list",
  name = "Todo List Component",
  description = "Interactive todo management with API integration",
  version = "1.0.0",
  
  generation = {
    protocol = "typescript",
    vertex_kinds = ["ImportDecl", "ClassDecl"],
    
    vertices = [
      { 
        id = "todo_list_class", 
        kind = "ClassDecl", 
        text = "export class TodoList extends Elena(HTMLElement) {\n  static tagName = 'todo-list';\n  static props = ['newTodo'];\n  \n  todos = [];\n  newTodo = '';\n  \n  async firstUpdated() {\n    await this.loadTodos();\n  }\n  \n  async loadTodos() {\n    const res = await fetch('/api/todos');\n    const data = await res.json();\n    this.todos = data.todos || [];\n    this.requestUpdate();\n  }\n  \n  async addTodo(e) {\n    e.preventDefault();\n    if (!this.newTodo.trim()) return;\n    const res = await fetch('/api/todos', {\n      method: 'POST',\n      headers: { 'Content-Type': 'application/json' },\n      body: JSON.stringify({ text: this.newTodo })\n    });\n    if (res.ok) {\n      this.newTodo = '';\n      await this.loadTodos();\n    }\n  }\n  \n  render() {\n    return html`<div>todo list</div>`;\n  }\n}\n"
      }
    ],
    
    config_placeholders = {}
  },
  
  provides = [
    { interface = "WebComponent", properties = { tag = "todo-list", framework = "elenajs" } }
  ],
  
  needs = [
    { interface = "HttpServer", strategy = { type = "first_available" }, optional = false }
  ],
  
  language = "typescript",
  is_infrastructure = false
}
