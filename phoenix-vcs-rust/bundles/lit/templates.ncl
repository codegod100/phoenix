# Lit Bundle Template Files
# Using Nickel string interpolation (m%"..."%) for templates

{
  # package.json template
  package_json = fun { project_name, description } => m%"{
  "name": "%{project_name}",
  "version": "0.1.0",
  "description": "%{description}",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview"
  },
  "dependencies": {
    "lit": "^3.0.0"
  },
  "devDependencies": {
    "typescript": "^5.2.0",
    "vite": "^5.0.0"
  }
}"%,
  
  # tsconfig.json template (static)
  tsconfig_json = m%"{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "lib": ["ES2020", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "experimentalDecorators": true,
    "useDefineForClassFields": false,
    "outDir": "./dist",
    "rootDir": "./src"
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}"%,
  
  # vite.config.ts template (static)
  vite_config = m%"import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    open: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true
  }
});
"%,
  
  # index.html template
  index_html = fun { tag_name, title } => m%"<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>%{title}</title>
  <script type="module" src="/src/main.ts"></script>
  <style>
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: #f5f5f5;
    }
  </style>
</head>
<body>
  <%{tag_name}-app></%{tag_name}-app>
</body>
</html>
"%,
  
  # Component templates
  hero_component = fun { message, subtitle, gradient_from, gradient_to } => 
    let from = gradient_from | default "#667eea" in
    let to = gradient_to | default "#764ba2" in
    m%"// Hero Component
@customElement('hero-image')
export class HeroImage extends LitElement {
  static styles = css\`
    :host {
      display: block;
      width: 100%;
    }
    .hero {
      background: linear-gradient(135deg, %{from} 0%, %{to} 100%);
      color: white;
      padding: 80px 20px;
      text-align: center;
      border-radius: 12px;
      margin-bottom: 24px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .hero h1 {
      font-size: 3.5rem;
      font-weight: bold;
      margin: 0;
      text-shadow: 2px 2px 4px rgba(0,0,0,0.3);
      letter-spacing: 2px;
    }
    .hero p {
      font-size: 1.5rem;
      margin: 16px 0 0 0;
      opacity: 0.9;
    }
  \`;

  render() {
    return html\`
      <div class="hero">
        <h1>%{message}</h1>
        <p>%{subtitle}</p>
      </div>
    \`;
  }
}
"%,
  
  counter_component = m%"// Simple Counter Component
@customElement('simple-counter')
export class SimpleCounter extends LitElement {
  static styles = css\`
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
  \`;

  @property({ type: Number }) count = 0;

  render() {
    return html\`
      <div class="counter">
        <button @click=\${() => this.count--}>-</button>
        <span>\${this.count}</span>
        <button @click=\${() => this.count++}>+</button>
      </div>
    \`;
  }
}
"%,
  
  todo_list_component = m%"// Todo List Component
@customElement('todo-list')
export class TodoList extends LitElement {
  static styles = css\`
    :host {
      display: block;
      padding: 16px;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      margin-bottom: 16px;
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
  \`;

  @property({ type: Array }) todos = [];
  @property({ type: String }) newTodoText = '';

  render() {
    const remaining = this.todos.filter(t => !t.completed).length;
    
    return html\`
      <h2>Todo List</h2>
      <div class="input-row">
        <input
          .value=\${this.newTodoText}
          @input=\${e => this.newTodoText = e.target.value}
          @keydown=\${e => e.key === 'Enter' && this._addTodo()}
          placeholder="Add a new todo..."
        />
        <button @click=\${this._addTodo}>Add</button>
      </div>
      <ul>
        \${this.todos.map(todo => html\`
          <li>
            <input
              type="checkbox"
              .checked=\${todo.completed}
              @change=\${() => this._toggleTodo(todo.id)}
            />
            <span class=\${todo.completed ? 'completed' : ''}>\${todo.text}</span>
            <button class="delete-btn" @click=\${() => this._deleteTodo(todo.id)}>Delete</button>
          </li>
        \`)}
      </ul>
      <div>\${remaining} of \${this.todos.length} remaining</div>
    \`;
  }

  _addTodo() {
    if (!this.newTodoText.trim()) return;
    this.todos = [...this.todos, {
      id: Date.now(),
      text: this.newTodoText.trim(),
      completed: false
    }];
    this.newTodoText = '';
  }

  _toggleTodo(id) {
    this.todos = this.todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    );
  }

  _deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
  }
}
"%,
  
  # Main app component template
  main_component = fun { tag_name, class_name, title, components } => m%"// phoenix: iu_id = "%{tag_name}-app"
// Generated by Phoenix VCS

import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

%{components}

// Main App Component
@customElement('%{tag_name}-app')
export class %{class_name}App extends LitElement {
  static styles = css\`
    :host {
      display: block;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
  \`;

  render() {
    return html\`
      <hero-image></hero-image>
      <simple-counter></simple-counter>
      <todo-list></todo-list>
    \`;
  }
}

console.log('🔥 %{title} app loaded');
"%,
}
