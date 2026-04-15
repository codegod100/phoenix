interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

@customElement('todo-list')
export class TodoList extends LitElement {
  @state() private declare todos: Todo[];
  @state() private declare newTodoText: string;
  @state() private declare loading: boolean;

  constructor() {
    super();
    this.todos = [];
    this.newTodoText = '';
    this.loading = false;
  }

  static styles = css`
    :host {
      display: block;
      margin: 1rem 0;
    }
    
    .container {
      background: %{surface0}%;
      border-radius: 12px;
      padding: 1.5rem;
    }
    
    h3 {
      margin: 0 0 1rem 0;
      color: %{text}%;
    }
    
    .input-area {
      display: flex;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }
    
    input {
      flex: 1;
      padding: 0.75rem;
      border: 2px solid %{surface1}%;
      border-radius: 8px;
      background: %{base}%;
      color: %{text}%;
      font-size: 1rem;
    }
    
    input:focus {
      outline: none;
      border-color: %{primary}%;
    }
    
    button {
      padding: 0.75rem 1.5rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: opacity 0.2s;
    }
    
    button:hover {
      opacity: 0.9;
    }
    
    button:disabled {
      opacity: 0.5;
      cursor: not-allowed;
    }
    
    .add-btn {
      background: %{success}%;
      color: %{base}%;
    }
    
    .todo-item {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      padding: 0.75rem;
      background: %{base}%;
      border-radius: 8px;
      margin-bottom: 0.5rem;
    }
    
    .todo-item:last-child {
      margin-bottom: 0;
    }
    
    .todo-item.completed span {
      text-decoration: line-through;
      opacity: 0.6;
    }
    
    input[type="checkbox"] {
      width: 20px;
      height: 20px;
      accent-color: %{primary}%;
      cursor: pointer;
    }
    
    .todo-text {
      flex: 1;
      color: %{text}%;
    }
    
    .delete-btn {
      background: %{danger}%;
      color: %{base}%;
      padding: 0.5rem 1rem;
      font-size: 0.875rem;
    }
    
    .empty {
      text-align: center;
      color: %{text}%;
      opacity: 0.7;
      padding: 2rem;
    }
    
    .stats {
      margin-top: 1rem;
      padding-top: 1rem;
      border-top: 1px solid %{surface1}%;
      color: %{text}%;
      opacity: 0.8;
      font-size: 0.875rem;
    }
  `;

  connectedCallback() {
    super.connectedCallback();
    this.loadTodos();
  }

  async loadTodos() {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json();
      this.todos = data.todos || [];
    } catch (err) {
      console.error('Failed to load todos:', err);
    }
  }

  async addTodo() {
    if (!this.newTodoText.trim()) return;
    
    this.loading = true;
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this.newTodoText })
      });
      const data = await res.json();
      this.todos = [...this.todos, data];
      this.newTodoText = '';
    } catch (err) {
      console.error('Failed to add todo:', err);
    } finally {
      this.loading = false;
    }
  }

  async toggleTodo(id: number) {
    const todo = this.todos.find(t => t.id === id);
    if (!todo) return;
    
    try {
      await fetch(`/api/todos/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });
      this.todos = this.todos.map(t => 
        t.id === id ? { ...t, completed: !t.completed } : t
      );
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  }

  async deleteTodo(id: number) {
    try {
      await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      this.todos = this.todos.filter(t => t.id !== id);
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  }

  private handleKeydown(e: KeyboardEvent) {
    if (e.key === 'Enter') {
      this.addTodo();
    }
  }

  render() {
    const completed = this.todos.filter(t => t.completed).length;
    const total = this.todos.length;

    return html`
      <div class="container">
        <h3>📝 Todo List</h3>
        
        <div class="input-area">
          <input
            type="text"
            placeholder="Add a new todo..."
            .value=${this.newTodoText}
            @input=${(e: InputEvent) => this.newTodoText = (e.target as HTMLInputElement).value}
            @keydown=${this.handleKeydown}
          />
          <button 
            class="add-btn" 
            @click=${this.addTodo}
            ?disabled=${!this.newTodoText.trim() || this.loading}
          >
            ${this.loading ? 'Adding...' : 'Add'}
          </button>
        </div>

        ${this.todos.length === 0 
          ? html`<div class="empty">No todos yet. Add one above! ✨</div>`
          : this.todos.map(todo => html`
            <div class="todo-item ${todo.completed ? 'completed' : ''}">
              <input 
                type="checkbox" 
                .checked=${todo.completed}
                @change=${() => this.toggleTodo(todo.id)}
              />
              <span class="todo-text">${todo.text}</span>
              <button 
                class="delete-btn"
                @click=${() => this.deleteTodo(todo.id)}
              >
                Delete
              </button>
            </div>
          `)
        }

        ${total > 0 ? html`
          <div class="stats">
            ${completed}/${total} completed (${Math.round((completed / total) * 100)}%)
          </div>
        ` : ''}
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'todo-list': TodoList;
  }
}
