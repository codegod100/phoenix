import { Elena, html } from '@elenajs/core';

export class TodoList extends Elena(HTMLElement) {
  static tagName = 'todo-list';
  
  todos = [];
  newTodo = '';
  
  async firstUpdated() {
    await this.loadTodos();
    this._setupListeners();
  }
  
  _setupListeners() {
    const input = this.shadowRoot?.querySelector('#todo-input');
    const addButton = this.shadowRoot?.querySelector('#add-btn');
    
    const handleAdd = () => {
      const val = input?.value?.trim();
      if (val) {
        this.newTodo = val;
        this.addTodo({ preventDefault: () => {}, stopPropagation: () => {} });
        if (input) input.value = '';
      }
    };
    
    // Bind Add button click
    if (addButton) {
      addButton.addEventListener('click', handleAdd);
    }
    
    // Handle Enter key in input
    if (input) {
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleAdd();
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
            type="button"
            id="add-btn"
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


export class UserCard extends Elena(HTMLElement) {
  static tagName = 'user-card';
  static props = ['name', 'email'];
  
  name = '';
  email = '';
  
  render() {
    const initials = this.name.split(' ').map(n => n[0]).join('').toUpperCase();
    return html`
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 1rem 0; display: flex; align-items: center; gap: 1rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
          ${initials}
        </div>
        <div>
          <h3 style="margin: 0;">${this.name}</h3>
          <p style="margin: 0; color: #666;">${this.email}</p>
        </div>
      </div>
    `;
  }
}


export class WelcomeCard extends Elena(HTMLElement) {
  static tagName = 'welcome-card';
  static props = ['title', 'message'];
  
  title = 'Welcome';
  message = 'Get started with Elena Dashboard';
  
  render() {
    return html`
      <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; padding: 2rem; margin: 1rem 0; color: white;">
        <h2 style="margin: 0 0 0.5rem 0;">${this.title}</h2>
        <p style="margin: 0; opacity: 0.9;">${this.message}</p>
        <div style="margin-top: 1rem;">
          <span style="display: inline-block; background: rgba(255,255,255,0.2); padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;">
            ElenaJS + Hono
          </span>
        </div>
      </div>
    `;
  }
}


export class ElenaApp extends Elena(HTMLElement) {
  static tagName = 'elena-app';

  render() {
    return html`
      <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
        <h1 style="color: #333; margin-bottom: 2rem;">Elena Dashboard</h1>
        <welcome-card title="Welcome" message="Elena Dashboard with SQLite persistence"></welcome-card>
        <user-card name="Alice Smith" email="alice@example.com"></user-card>
        <todo-list></todo-list>
      </div>
    `;
  }
}

// Register all web components
customElements.define('todo-list', TodoList);
customElements.define('user-card', UserCard);
customElements.define('welcome-card', WelcomeCard);
customElements.define('elena-app', ElenaApp);

// Mount the application
document.addEventListener('DOMContentLoaded', () => {
  const app = document.createElement('elena-app');
  document.body.appendChild(app);
  console.log('Elena Dashboard mounted');
});

