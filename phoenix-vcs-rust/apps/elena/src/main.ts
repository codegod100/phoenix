import { Elena, html } from '@elenajs/core';

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
  
  render() {
    return html`<div>todo list</div>`;
  }
}


export class UserCard extends Elena(HTMLElement) {
  static tagName = 'user-card';

  render() {
    return html`<div style="border: 2px dashed #ccc; padding: 1rem; margin: 1rem 0; border-radius: 8px;">
      <h3>User Card</h3>
      <p>Component placeholder - add vertices to NCL module for custom implementation</p>
    </div>`;
  }
}

export class WelcomeCard extends Elena(HTMLElement) {
  static tagName = 'welcome-card';

  render() {
    return html`<div style="border: 2px dashed #ccc; padding: 1rem; margin: 1rem 0; border-radius: 8px;">
      <h3>Welcome Card</h3>
      <p>Component placeholder - add vertices to NCL module for custom implementation</p>
    </div>`;
  }
}

// Root Application Component
export class ElenaApp extends Elena(HTMLElement) {
  static tagName = 'elena-app';

  render() {
    return html`
      <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
        <h1 style="color: #333; margin-bottom: 2rem;">Elena Dashboard</h1>
        
        <todo-list></todo-list>
        <user-card></user-card>
        <welcome-card></welcome-card>
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
