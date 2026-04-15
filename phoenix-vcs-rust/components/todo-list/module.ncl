{
  id = "todo-list",
  name = "Todo List Component",
  
  # Self-describing code generation
  generation = {
    protocol = "typescript",
    
    vertex_kinds = [
      "ImportDecl",
      "ClassDecl",
      "ExprStmt"
    ],
    
    # The complete component as one ClassDecl vertex
    # This is the actual TypeScript code that will be emitted
    vertices = [
      {
        id = "todo_list_class",
        kind = "ClassDecl",
        text = ''
export class TodoList extends Elena(HTMLElement) {
  static tagName = 'todo-list';
  static props = ['newTodo'];
  
  todos = [];
  newTodo = '';
  
  async firstUpdated() {
    await this.loadTodos();
  }
  
  async loadTodos() {
    const res = await fetch('/api/todos');
    const data = await res.json();
    this.todos = data.todos || [];
    this.requestUpdate();
  }
  
  onInput(e) {
    this.newTodo = e.target.value;
  }
  
  async addTodo(e) {
    e.preventDefault();
    if (!this.newTodo.trim()) return;
    
    const res = await fetch('/api/todos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: this.newTodo })
    });
    
    if (res.ok) {
      this.newTodo = '';
      await this.loadTodos();
    }
  }
  
  async toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    
    const res = await fetch(`/api/todos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed: !todo.completed })
    });
    
    if (res.ok) {
      await this.loadTodos();
    }
  }
  
  async deleteTodo(id) {
    const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
    if (res.ok) {
      await this.loadTodos();
    }
  }
  
  render() {
    return html`
      <div style="padding: 1rem; font-family: system-ui, sans-serif;">
        <h2 style="margin-top: 0;">Todo List</h2>
        
        <form @submit=${this.addTodo.bind(this)} style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input 
            type="text" 
            .value=${this.newTodo}
            @input=${this.onInput.bind(this)}
            placeholder="What needs to be done?"
            style="flex: 1; padding: 0.5rem; border: 1px solid #ddd; border-radius: 0.25rem;"
          />
          <button 
            type="submit"
            style="padding: 0.5rem 1rem; background: #667eea; color: white; border: none; border-radius: 0.25rem; cursor: pointer;"
          >
            Add
          </button>
        </form>
        
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${this.todos.map(todo => html`
            <li style="display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem; border-bottom: 1px solid #eee;">
              <input 
                type="checkbox" 
                .checked=${todo.completed}
                @change=${() => this.toggleTodo(todo.id)}
                style="cursor: pointer;"
              />
              <span style="flex: 1; ${todo.completed ? 'text-decoration: line-through; opacity: 0.6;' : ''}">
                ${todo.text}
              </span>
              <button 
                @click=${() => this.deleteTodo(todo.id)}
                style="padding: 0.25rem 0.5rem; background: #ff4757; color: white; border: none; border-radius: 0.25rem; cursor: pointer; font-size: 0.875rem;"
              >
                Delete
              </button>
            </li>
          `)}
        </ul>
        
        ${this.todos.length === 0 ? html`<p style="color: #999; text-align: center; padding: 2rem;">No todos yet. Add one above!</p>` : ''}
      </div>
    `;
  }
}
        ''
      }
    ]
  },
  
  provides = [
    {
      interface = "WebComponent",
      properties = {
        tag = "todo-list",
        category = "data"
      }
    }
  ],
  
  needs = [
    {
      interface = "ComponentFramework",
      optional = false
    }
  ]
}
