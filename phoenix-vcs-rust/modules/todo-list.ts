export class TodoList extends Elena(HTMLElement) {
  static tagName = 'todo-list';
  
  todos = [];
  newTodo = '';
  
  async firstUpdated() {
    await this.loadTodos();
    this._setupListeners();
  }
  
  _setupListeners() {
    // Form submit handler using ID
    const form = this.shadowRoot?.querySelector('#todo-form');
    const input = this.shadowRoot?.querySelector('#todo-input');
    
    if (form) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input?.value?.trim();
        if (val) {
          this.newTodo = val;
          this.addTodo(e);
          if (input) input.value = '';
        }
      });
    }
    
    // Event delegation for checkboxes and delete buttons
    const list = this.shadowRoot?.querySelector('ul');
    if (list) {
      list.addEventListener('click', (e) => {
        const target = e.target;
        
        // Handle checkbox toggle
        if (target.type === 'checkbox' && target.dataset.id) {
          e.preventDefault();
          this.toggleTodo(parseInt(target.dataset.id));
        }
        
        // Handle delete button
        if (target.dataset.action === 'delete' && target.dataset.id) {
          e.preventDefault();
          this.deleteTodo(parseInt(target.dataset.id));
        }
      });
    }
  }
  
  async loadTodos() {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      this.todos = data.todos || [];
      this.requestUpdate();
    } catch (err) {
      console.error('Failed to load todos:', err);
    }
  }
  
  async addTodo(e) {
    e.preventDefault();
    if (!this.newTodo.trim()) return;
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this.newTodo })
      });
      if (res.ok) {
        this.newTodo = '';
        // Clear input
        const input = this.shadowRoot?.querySelector('input[type="text"]');
        if (input) input.value = '';
        await this.loadTodos();
      }
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
  }
  
  async toggleTodo(id) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });
      if (res.ok) {
        await this.loadTodos();
      }
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  }
  
  async deleteTodo(id) {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (res.ok) {
        await this.loadTodos();
      }
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  }
  
  render() {
    const completedCount = this.todos.filter(t => t.completed).length;
    const total = this.todos.length;
    
    return html`
      <div style="background: white; border-radius: 12px; padding: 1.5rem; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-width: 500px;">
        <h2 style="margin: 0 0 1rem 0; color: #333; display: flex; align-items: center; gap: 0.5rem;">
          <span>✅</span>
          <span>Todo List</span>
          <span style="margin-left: auto; font-size: 0.85rem; color: #666; font-weight: normal;">
            ${completedCount}/${total}
          </span>
        </h2>
        
        <form id="todo-form" style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
          <input
            id="todo-input"
            type="text"
            placeholder="What needs to be done?"
            style="flex: 1; padding: 0.75rem; border: 2px solid #e0e0e0; border-radius: 8px; font-size: 1rem; outline: none;"
          />
          <button
            type="submit"
            style="padding: 0.75rem 1.5rem; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600;"
          >
            Add
          </button>
        </form>
        
        <ul style="list-style: none; padding: 0; margin: 0;">
          ${this.todos.map(todo => html`
            <li style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem; border-bottom: 1px solid #f0f0f0; transition: background 0.2s;">
              <input
                type="checkbox"
                data-id="${todo.id}"
                ${todo.completed ? 'checked' : ''}
                style="width: 20px; height: 20px; cursor: pointer; accent-color: #667eea;"
              />
              <span style="flex: 1; ${todo.completed ? 'text-decoration: line-through; color: #999;' : 'color: #333;'}">
                ${todo.text}
              </span>
              <button
                data-action="delete"
                data-id="${todo.id}"
                style="padding: 0.4rem 0.8rem; background: #ff6b6b; color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;"
              >
                🗑️
              </button>
            </li>
          `).join('')}
        </ul>
        
        ${this.todos.length === 0 ? html`
          <div style="text-align: center; padding: 2rem; color: #999;">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">📝</div>
            <div>No todos yet. Add one above!</div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
