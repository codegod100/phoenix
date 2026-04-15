export class ElenaApp extends Elena(HTMLElement) {
  static tagName = 'elena-app';

  render() {
    return html`
      <div style="max-width: 1200px; margin: 0 auto; padding: 2rem; background: %{base}%; min-height: 100vh;">
        <h1 style="color: %{text}%; margin-bottom: 2rem; font-family: system-ui, sans-serif;">Elena Dashboard</h1>
        <welcome-card title="Welcome" message="Elena Dashboard - Styled"></welcome-card>
        <user-card name="%{userCardName}%" email="%{userCardEmail}%"></user-card>
        <todo-list></todo-list>
      </div>
    `;
  }
}

// Mount the application
document.addEventListener('DOMContentLoaded', () => {
  const app = document.createElement('elena-app');
  document.body.style.background = '%{base}%';
  document.body.style.margin = '0';
  document.body.appendChild(app);
  console.log('Elena Dashboard mounted');
});
