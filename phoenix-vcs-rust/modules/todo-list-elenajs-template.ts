import { Todo, TodoStats, TodoLogic, Api } from './component-logic';

export function TodoList() {
  return Elena.reactive({
    todos: [] as Todo[],
    newTodoText: '',
    loading: false,

    // Load todos on mount
    async connected() {
      await this.loadTodos();
    },

    async loadTodos() {
      try {
        const res = await fetch(Api.todos);
        const data = await res.json();
        this.todos = data.todos.map(TodoLogic.fromApi);
      } catch (err) {
        console.error('Failed to load todos:', err);
      }
    },

    async addTodo() {
      if (!TodoLogic.validateText(this.newTodoText)) return;
      
      this.loading = true;
      try {
        const res = await fetch(Api.todos, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: this.newTodoText.trim() })
        });
        const data = await res.json();
        this.todos = TodoLogic.add(this.todos, TodoLogic.fromApi(data));
        this.newTodoText = '';
      } catch (err) {
        console.error('Failed to add todo:', err);
      } finally {
        this.loading = false;
      }
    },

    async toggleTodo(id: number) {
      const todo = this.todos.find(t => t.id === id);
      if (!todo) return;
      
      // Optimistic update
      this.todos = TodoLogic.toggle(this.todos, id);
      
      try {
        await fetch(Api.todo(id), {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ completed: !todo.completed })
        });
      } catch (err) {
        // Revert
        this.todos = TodoLogic.toggle(this.todos, id);
        console.error('Failed to toggle todo:', err);
      }
    },

    async deleteTodo(id: number) {
      const previous = this.todos;
      this.todos = TodoLogic.delete(this.todos, id);
      
      try {
        await fetch(Api.todo(id), { method: 'DELETE' });
      } catch (err) {
        this.todos = previous;
        console.error('Failed to delete todo:', err);
      }
    },

    handleKeydown(e: KeyboardEvent) {
      if (e.key === 'Enter') {
        this.addTodo();
      }
    },

    render() {
      const stats = TodoLogic.getStats(this.todos);

      return html`
        <div class="container" style="
          background: %{surface0}%;
          border-radius: 12px;
          padding: 1.5rem;
          margin: 1rem 0;
        ">
          <h3 style="margin: 0 0 1rem 0; color: %{text}%;">📝 Todo List</h3>
          
          <div style="display: flex; gap: 0.5rem; margin-bottom: 1rem;">
            <input
              type="text"
              placeholder="Add a new todo..."
              .value=${this.newTodoText}
              @input=${(e: InputEvent) => this.newTodoText = (e.target as HTMLInputElement).value}
              @keydown=${this.handleKeydown}
              style="
                flex: 1;
                padding: 0.75rem;
                border: 2px solid %{surface1}%;
                border-radius: 8px;
                background: %{base}%;
                color: %{text}%;
                font-size: 1rem;
              "
            />
            <button 
              @click=${this.addTodo}
              ?disabled=${!TodoLogic.validateText(this.newTodoText) || this.loading}
              style="
                padding: 0.75rem 1.5rem;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                background: %{success}%;
                color: %{base}%;
                opacity: ${!TodoLogic.validateText(this.newTodoText) || this.loading ? '0.5' : '1'};
              "
            >
              ${this.loading ? 'Adding...' : 'Add'}
            </button>
          </div>

          ${this.todos.length === 0 
            ? html`<div style="text-align: center; color: %{text}%; opacity: 0.7; padding: 2rem;">
              No todos yet. Add one above! ✨
            </div>`
            : this.todos.map(todo => html`
              <div style="
                display: flex;
                align-items: center;
                gap: 0.75rem;
                padding: 0.75rem;
                background: %{base}%;
                border-radius: 8px;
                margin-bottom: 0.5rem;
                text-decoration: ${todo.completed ? 'line-through' : 'none'};
                opacity: ${todo.completed ? '0.6' : '1'};
              ">
                <input 
                  type="checkbox" 
                  .checked=${todo.completed}
                  @change=${() => this.toggleTodo(todo.id)}
                  style="width: 20px; height: 20px; cursor: pointer;"
                />
                <span style="flex: 1; color: %{text}%;">${todo.text}</span>
                <button 
                  @click=${() => this.deleteTodo(todo.id)}
                  style="
                    background: %{danger}%;
                    color: %{base}%;
                    padding: 0.5rem 1rem;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    font-size: 0.875rem;
                  "
                >
                  Delete
                </button>
              </div>
            `)
          }

          ${stats.total > 0 ? html`
            <div style="
              margin-top: 1rem;
              padding-top: 1rem;
              border-top: 1px solid %{surface1}%;
              color: %{text}%;
              opacity: 0.8;
              font-size: 0.875rem;
            ">
              ${stats.completed}/${stats.total} completed (${stats.percentComplete}%)
            </div>
          ` : ''}
        </div>
      `;
    }
  });
}

Elena.define('todo-list', TodoList);

declare global {
  interface HTMLElementTagNameMap {
    'todo-list': ReturnType<typeof TodoList>;
  }
}
