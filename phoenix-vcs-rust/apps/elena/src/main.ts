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

