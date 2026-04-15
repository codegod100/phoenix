@customElement('elena-app')
export class ElenaApp extends LitElement {
  static styles = css`
    :host {
      display: block;
      min-height: 100vh;
      background: %{base}%;
      color: %{text}%;
      font-family: system-ui, -apple-system, sans-serif;
    }
    
    .container {
      max-width: 800px;
      margin: 0 auto;
      padding: 2rem;
    }
    
    h1 {
      margin: 0 0 0.5rem 0;
      font-size: 2.5rem;
      background: linear-gradient(135deg, %{primary}% 0%, %{lavender}% 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
    }
    
    .subtitle {
      color: %{text}%;
      opacity: 0.7;
      margin: 0 0 0.5rem 0;
    }
    
    .theme-badge {
      display: inline-block;
      background: %{primary}%30;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      margin-bottom: 2rem;
    }
    
    slot {
      display: block;
    }
  `;

  render() {
    return html`
      <div class="container">
        <h1>%{title}%</h1>
        <p class="subtitle">Built with Lit Web Components</p>
        <span class="theme-badge">🎨 Theme: %{activeTheme}%</span>
        <slot></slot>
      </div>
    `;
  }
}

// Mount the application
document.addEventListener('DOMContentLoaded', () => {
  const app = document.createElement('elena-app');
  
  // Create welcome card
  const welcome = document.createElement('welcome-card');
  welcome.setAttribute('title', 'Welcome');
  welcome.setAttribute('message', '%{title}% - Lit Edition');
  app.appendChild(welcome);
  
  // Create user card
  const userCard = document.createElement('user-card');
  userCard.setAttribute('name', '%{userCardName}%');
  userCard.setAttribute('email', '%{userCardEmail}%');
  app.appendChild(userCard);
  
  // Create todo list
  const todoList = document.createElement('todo-list');
  app.appendChild(todoList);
  
  document.body.style.margin = '0';
  document.body.style.background = '%{base}%';
  document.body.appendChild(app);
  
  console.log('Lit Elena App mounted with theme: %{activeTheme}%');
});

declare global {
  interface HTMLElementTagNameMap {
    'elena-app': ElenaApp;
  }
}
