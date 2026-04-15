export class UserCard extends Elena(HTMLElement) {
  static tagName = 'user-card';
  static props = ['name', 'email'];

  name = '';
  email = '';

  render() {
    const initials = this.name.split(' ').map(n => n[0]).join('').toUpperCase();
    return html`
      <div style="border: 1px solid #ddd; border-radius: 8px; padding: 1rem; margin: 1rem 0; display: flex; align-items: center; gap: 1rem;">
        <div style="width: 48px; height: 48px; border-radius: 50%; background: %{avatarColor}%; display: flex; align-items: center; justify-content: center; color: white; font-weight: bold;">
          ${initials}
        </div>
        <div>
          <h3 style="margin: 0;">${this.name}</h3>
          <p style="margin: 0; color: #666;">${this.email}</p>
        </div>
      </div>
    `;
  }
}
