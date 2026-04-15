export class ElenaApp extends Elena(HTMLElement) {
  static tagName = 'elena-app';

  render() {
    return html`
      <div style="max-width: 1200px; margin: 0 auto; padding: 2rem;">
        <h1 style="color: #333; margin-bottom: 2rem;">Elena Dashboard</h1>
        <welcome-card title="Welcome" message="Elena Dashboard with SQLite persistence"></welcome-card>
        <user-card name="%{userCardName}%" email="%{userCardEmail}%"></user-card>
        <todo-list></todo-list>
      </div>
    `;
  }
}

// Mount the application
document.addEventListener('DOMContentLoaded', () => {
  const app = document.createElement('elena-app');
  document.body.appendChild(app);
  console.log('Elena Dashboard mounted');
});
