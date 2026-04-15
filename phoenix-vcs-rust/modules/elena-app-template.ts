export class ElenaApp extends Elena(HTMLElement) {
  static tagName = 'elena-app';

  render() {
    return html`
      <div style="max-width: 1200px; margin: 0 auto; padding: 2rem; background: ${theme.colors.base}; min-height: 100vh;">
        <h1 style="color: ${theme.colors.text}; margin-bottom: 2rem; font-family: system-ui, sans-serif;">Elena Dashboard 🧋</h1>
        <welcome-card title="Welcome" message="Elena Dashboard with Catppuccin Theme"></welcome-card>
        <user-card name="%{userCardName}%" email="%{userCardEmail}%"></user-card>
        <todo-list></todo-list>
      </div>
    `;
  }
}

// Mount the application
document.addEventListener('DOMContentLoaded', () => {
  const app = document.createElement('elena-app');
  document.body.style.background = theme.colors.base;
  document.body.style.margin = '0';
  document.body.appendChild(app);
  console.log('Elena Dashboard mounted with Catppuccin theme');
});
