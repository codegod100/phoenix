interface Todo {
  id: number;
  text: string;
  completed: boolean;
}

export class TodoList extends Elena(HTMLElement) {
  static tagName = 'todo-list';

  todos: Todo[] = [];

  async firstUpdated() {
    await this.loadTodos();
  }

  connectedCallback() {
    super.connectedCallback();
    this._attachListeners();
  }

  _attachListeners() {
    const root = this.shadowRoot || this;
    const form = root.querySelector('form');
    const list = root.querySelector('ul');

    if (form) form.addEventListener('submit', this._onSubmit);
    if (list) list.addEventListener('click', this._onListClick);
  }

  _onSubmit = (e: Event) => {
    e.preventDefault();
    const target = e.target as HTMLFormElement;
    const input = target.querySelector('input[type="text"]') as HTMLInputElement | null;
    const val = input?.value?.trim();
    if (val) {
      this.addTodo(val).then(success => {
        if (success && input) input.value = '';
      });
    }
  };

  _onListClick = (e: Event) => {
    const target = e.target as HTMLElement;
    if (target.dataset?.action === 'delete' && target.dataset?.id) {
      this.deleteTodo(parseInt(target.dataset.id));
    } else if ((target as HTMLInputElement).type === 'checkbox' && target.dataset?.id) {
      this.toggleTodo(parseInt(target.dataset.id));
    }
  };

  async loadTodos() {
    try {
      const res = await fetch('/api/todos');
      const data = await res.json() as { todos: Todo[] };
      this.todos = data.todos || [];
      this.requestUpdate();
    } catch (err) {
      console.error('Failed to load todos:', err);
    }
  }

  async addTodo(text: string) {
    if (!text.trim()) return false;
    try {
      const res = await fetch('/api/todos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        await this.loadTodos();
        return true;
      }
    } catch (err) {
      console.error('Failed to add todo:', err);
    }
    return false;
  }

  async toggleTodo(id: number) {
    const todo = this.todos.find((t: Todo) => t.id === id);
    if (!todo) return;
    try {
      const res = await fetch(`/api/todos/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !todo.completed })
      });
      if (res.ok) await this.loadTodos();
    } catch (err) {
      console.error('Failed to toggle todo:', err);
    }
  }

  async deleteTodo(id: number) {
    try {
      const res = await fetch(`/api/todos/${id}`, { method: 'DELETE' });
      if (res.ok) await this.loadTodos();
    } catch (err) {
      console.error('Failed to delete todo:', err);
    }
  }

  render() {
    const completedCount = this.todos.filter((t: Todo) => t.completed).length;
    const total = this.todos.length;

    // Use StyleUtils for consistent, reusable styling
    // Config from NCL: buttonVariant = %{buttonVariant}%, checkboxAccent = %{checkboxAccent}%
    return html`
      <div style="${StyleUtils.card()}">
        <h2 style="${StyleUtils.flex({ gap: '0.5rem' })}; margin: 0 0 1rem 0; color: ${theme.colors.text};">
          <span>✅</span>
          <span>Todo List</span>
          <span style="margin-left: auto; font-size: 0.85rem; color: ${theme.colors.subtext0}; font-weight: normal;">
            ${completedCount}/${total}
          </span>
        </h2>

        <form style="${StyleUtils.flex()}; margin-bottom: 1rem;">
          <input
            type="text"
            placeholder="What needs to be done?"
            style="${StyleUtils.input()}"
          />
          <button type="submit" style="${StyleUtils.button({ variant: '%{buttonVariant}%' })}">
            Add
          </button>
        </form>

        <ul style="list-style: none; padding: 0; margin: 0;">
          ${this.todos.map((todo: Todo) => html`
            <li style="${StyleUtils.flex({ gap: '0.75rem' })}; padding: 0.75rem; border-bottom: 1px solid ${theme.colors.surface1};">
              <input
                type="checkbox"
                data-id="${todo.id}"
                ${todo.completed ? 'checked' : ''}
                style="width: 20px; height: 20px; cursor: pointer; accent-color: ${theme.colors.%{checkboxAccent}%};"
              />
              <span style="flex: 1; ${todo.completed ? `text-decoration: line-through; color: ${theme.colors.overlay0};` : `color: ${theme.colors.text};`}">
                ${todo.text}
              </span>
              <button
                data-action="delete"
                data-id="${todo.id}"
                type="button"
                style="${StyleUtils.button({ variant: 'danger', size: 'small' })}"
              >
                🗑️
              </button>
            </li>
          `)}
        </ul>

        ${this.todos.length === 0 ? html`
          <div style="text-align: center; padding: 2rem; color: ${theme.colors.overlay0};">
            <div style="font-size: 3rem; margin-bottom: 0.5rem;">📝</div>
            <div>No todos yet. Add one above!</div>
          </div>
        ` : ''}
      </div>
    `;
  }
}
