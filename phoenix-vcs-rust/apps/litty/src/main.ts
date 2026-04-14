import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// Todo item data structure
interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

// Simple Counter Component
@customElement('simple-counter')
export class SimpleCounter extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 16px;
    }
    .counter {
      display: flex;
      align-items: center;
      gap: 16px;
      font-size: 1.2rem;
    }
    button {
      padding: 8px 16px;
      font-size: 1rem;
      cursor: pointer;
      border: none;
      border-radius: 4px;
      background: #007bff;
      color: white;
    }
    button:hover {
      background: #0056b3;
    }
    span {
      font-weight: bold;
      min-width: 40px;
      text-align: center;
    }
  `;

  @property({ type: Number })
  count = 0;

  render() {
    return html`
      <div class="counter">
        <button @click=${this._decrement}>-</button>
        <span>${this.count}</span>
        <button @click=${this._increment}>+</button>
      </div>
    `;
  }

  private _increment() {
    this.count++;
  }

  private _decrement() {
    this.count--;
  }
}

// Todo List Component
@customElement('todo-list')
export class TodoList extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h2 {
      margin-top: 0;
      color: #333;
    }
    .input-row {
      display: flex;
      gap: 8px;
      margin-bottom: 16px;
    }
    input {
      flex: 1;
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 1rem;
    }
    button {
      padding: 8px 16px;
      background: #28a745;
      color: white;
      border: none;
      border-radius: 4px;
      cursor: pointer;
    }
    button:hover {
      background: #218838;
    }
    ul {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    li {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 0;
      border-bottom: 1px solid #eee;
    }
    li:last-child {
      border-bottom: none;
    }
    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      cursor: pointer;
    }
    .completed {
      text-decoration: line-through;
      color: #888;
    }
    .delete-btn {
      margin-left: auto;
      background: #dc3545;
      padding: 4px 12px;
      font-size: 0.875rem;
    }
    .delete-btn:hover {
      background: #c82333;
    }
    .stats {
      margin-top: 16px;
      padding-top: 16px;
      border-top: 1px solid #eee;
      color: #666;
      font-size: 0.875rem;
    }
  `;

  @property({ type: Array })
  todos: Todo[] = [
    { id: 1, text: 'Learn Lit', completed: false },
    { id: 2, text: 'Build a todo app', completed: false },
    { id: 3, text: 'Master Web Components', completed: false },
  ];

  @property({ type: String })
  newTodoText = '';

  render() {
    const remaining = this.todos.filter(t => !t.completed).length;
    
    return html`
      <h2>Todo List</h2>
      <div class="input-row">
        <input
          .value=${this.newTodoText}
          @input=${this._onInput}
          @keydown=${this._onKeydown}
          placeholder="Add a new todo..."
        />
        <button @click=${this._addTodo}>Add</button>
      </div>
      <ul>
        ${this.todos.map(todo => html`
          <li>
            <input
              type="checkbox"
              .checked=${todo.completed}
              @change=${() => this._toggleTodo(todo.id)}
            />
            <span class=${todo.completed ? 'completed' : ''}>${todo.text}</span>
            <button class="delete-btn" @click=${() => this._deleteTodo(todo.id)}>Delete</button>
          </li>
        `)}
      </ul>
      <div class="stats">${remaining} of ${this.todos.length} remaining</div>
    `;
  }

  private _onInput(e: Event) {
    this.newTodoText = (e.target as HTMLInputElement).value;
  }

  private _onKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this._addTodo();
    }
  }

  private _addTodo() {
    if (!this.newTodoText.trim()) return;
    
    const newTodo: Todo = {
      id: Date.now(),
      text: this.newTodoText.trim(),
      completed: false,
    };
    
    this.todos = [...this.todos, newTodo];
    this.newTodoText = '';
  }

  private _toggleTodo(id: number) {
    this.todos = this.todos.map(todo =>
      todo.id === id ? { ...todo, completed: !todo.completed } : todo
    );
  }

  private _deleteTodo(id: number) {
    this.todos = this.todos.filter(todo => todo.id !== id);
  }
}

// Main App Component
@customElement('litty-app')
export class LittyApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    h1 {
      color: #333;
      text-align: center;
      margin-bottom: 24px;
    }
    .container {
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
  `;

  render() {
    return html`
      <h1>🔥 Litty - Lit Todo App</h1>
      <div class="container">
        <simple-counter></simple-counter>
        <todo-list></todo-list>
      </div>
    `;
  }
}

console.log('🔥 Litty app loaded');
