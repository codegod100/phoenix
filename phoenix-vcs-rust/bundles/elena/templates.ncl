# ElenaJS Bundle Template Files
# Using Nickel string interpolation for templates

{
  # package.json template
  package_json = fun { project_name, description } => m%"{
  "name": "%{project_name}",
  "version": "0.1.0",
  "description": "%{description}",
  "type": "module",
  "scripts": {
    "dev": "concurrently \"bun run dev:server\" \"bun run dev:client\"",
    "dev:server": "bun run src/server.ts",
    "dev:client": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "start": "bun run dist/server.js"
  },
  "dependencies": {
    "elenajs": "^1.0.0",
    "hono": "^3.12.0",
    "@hono/node-server": "^1.8.0"
  },
  "devDependencies": {
    "@types/bun": "latest",
    "concurrently": "^8.2.0",
    "typescript": "^5.3.0",
    "vite": "^5.0.0"
  }
}"%,
  
  # tsconfig.json template (static)
  tsconfig_json = m%"{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "declaration": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}"%,
  
  # vite.config.ts template
  vite_config = m%"import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3000'
    }
  },
  build: {
    outDir: 'dist/public',
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
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 20px;
      font-family: system-ui, -apple-system, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
    }
  </style>
</head>
<body>
  <%{tag_name}-app></%{tag_name}-app>
</body>
</html>
"%,
  
  # Server template (Hono)
  server_ts = fun { project_name } => m%"import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { logger } from 'hono/logger';
import { cors } from 'hono/cors';

const app = new Hono();

app.use('*', logger());
app.use('*', cors({ origin: '*' }));

app.get('/api/health', (c) => {
  return c.json({ 
    status: 'ok', 
    service: '%{project_name}',
    timestamp: new Date().toISOString()
  });
});

app.get('/api/users', (c) => {
  return c.json({
    users: [
      { id: 1, name: 'Alice', email: 'alice@example.com' },
      { id: 2, name: 'Bob', email: 'bob@example.com' },
    ]
  });
});

const port = process.env.PORT || 3000;

serve({ fetch: app.fetch, port: Number(port) }, (info) => {
  console.log(\`🚀 %{project_name} at http://localhost:\${info.port}\`);
});
"%,
  
  # Welcome component template
  welcome_component = fun { title, message, accent_color } => 
    let color = accent_color | default "#764ba2" in
    m%"import { Component } from 'elenajs';

export class WelcomeCard extends Component {
  static get componentName() { return 'welcome-card'; }
  
  static get properties() {
    return {
      title: { type: String, default: '%{title}' },
      message: { type: String, default: '%{message}' }
    };
  }

  render() {
    return \`
      <style>
        :host {
          display: block;
          background: white;
          border-radius: 16px;
          padding: 32px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.2);
          margin-bottom: 24px;
        }
        .welcome { text-align: center; }
        .welcome h1 {
          color: %{color};
          font-size: 2.5rem;
          margin: 0 0 16px 0;
        }
        .welcome p {
          color: #666;
          font-size: 1.25rem;
          margin: 0;
          line-height: 1.6;
        }
      </style>
      <div class="welcome">
        <h1>\${this.title}</h1>
        <p>\${this.message}</p>
      </div>
    \`;
  }
}
"%,
  
  # Todo list component template
  todo_component = m%"import { Component } from 'elenajs';

export class TodoList extends Component {
  static get componentName() { return 'todo-list'; }
  
  static get properties() {
    return {
      todos: { type: Array, default: [] },
      newTodo: { type: String, default: '' }
    };
  }

  async loadTodos() {
    const res = await fetch('/api/todos');
    const data = await res.json();
    this.todos = data.todos;
  }

  addTodo() {
    if (!this.newTodo.trim()) return;
    this.todos = [...this.todos, { id: Date.now(), text: this.newTodo, completed: false }];
    this.newTodo = '';
  }

  toggleTodo(id) {
    this.todos = this.todos.map(t => t.id === id ? { ...t, completed: !t.completed } : t);
  }

  deleteTodo(id) {
    this.todos = this.todos.filter(t => t.id !== id);
  }

  render() {
    return \`
      <style>
        :host {
          display: block;
          background: white;
          border-radius: 16px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.1);
        }
        h2 { color: #333; margin: 0 0 20px 0; }
        .input-row { display: flex; gap: 12px; margin-bottom: 20px; }
        input {
          flex: 1;
          padding: 12px 16px;
          border: 2px solid #e0e0e0;
          border-radius: 8px;
          font-size: 1rem;
        }
        button {
          padding: 12px 24px;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        ul { list-style: none; padding: 0; margin: 0; }
        li {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 0;
          border-bottom: 1px solid #f0f0f0;
        }
        span.completed { text-decoration: line-through; color: #999; }
      </style>
      <h2>✨ Todo List</h2>
      <div class="input-row">
        <input type="text" .value="\${this.newTodo}" 
               @input="\${e => this.newTodo = e.target.value}"
               @keypress="\${e => e.key === 'Enter' && this.addTodo()}"
               placeholder="What needs to be done?" />
        <button @click="\${this.addTodo}">Add</button>
      </div>
      <ul>
        \${this.todos.map(todo => \`
          <li>
            <input type="checkbox" .checked="\${todo.completed}" 
                   @change="\${() => this.toggleTodo(todo.id)}" />
            <span class="\${todo.completed ? 'completed' : ''}">\${todo.text}</span>
            <button @click="\${() => this.deleteTodo(todo.id)}">Delete</button>
          </li>
        \`).join('')}
      </ul>
    \`;
  }
}
"%,
  
  # User card component template
  user_card_component = fun { name, email } => m%"import { Component } from 'elenajs';

export class UserCard extends Component {
  static get componentName() { return 'user-card'; }
  
  static get properties() {
    return {
      name: { type: String, default: '%{name}' },
      email: { type: String, default: '%{email}' }
    };
  }

  render() {
    const initials = this.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    
    return \`
      <style>
        :host {
          display: block;
          background: white;
          border-radius: 12px;
          padding: 20px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .card {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .avatar {
          width: 56px;
          height: 56px;
          border-radius: 50%;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          font-weight: 700;
          font-size: 1.25rem;
        }
        .info h3 { margin: 0; color: #333; font-size: 1.125rem; }
        .info p { margin: 4px 0 0 0; color: #666; font-size: 0.875rem; }
      </style>
      <div class="card">
        <div class="avatar">\${initials}</div>
        <div class="info">
          <h3>\${this.name}</h3>
          <p>\${this.email}</p>
        </div>
      </div>
    \`;
  }
}
"%,
  
  # Main app component template
  main_component = fun { tag_name, class_name, title, components } => m%"import { Component } from 'elenajs';

%{components}

export class %{class_name}App extends Component {
  static get componentName() { return '%{tag_name}-app'; }

  render() {
    return \`
      <style>
        :host {
          display: block;
          max-width: 600px;
          margin: 40px auto;
        }
      </style>
      <welcome-card></welcome-card>
      <todo-list></todo-list>
      <user-card></user-card>
    \`;
  }
}

customElements.define(%{class_name}App.componentName, %{class_name}App);
console.log('🌸 %{title} loaded');
"%,
}
