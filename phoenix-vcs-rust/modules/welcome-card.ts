// Catppuccin Mocha Theme
const theme = {
  colors: {
    base: '#1e1e2e',
    mantle: '#181825',
    crust: '#11111b',
    surface0: '#313244',
    surface1: '#45475a',
    text: '#cdd6f4',
    subtext1: '#bac2de',
    mauve: '#cba6f7',
    lavender: '#b4befe',
    pink: '#f5c2e7'
  }
};

export class WelcomeCard extends Elena(HTMLElement) {
  static tagName = 'welcome-card';
  static props = ['title', 'message'];
  
  title = 'Welcome';
  message = 'Get started with Elena Dashboard';
  
  render() {
    return html`
      <div style="background: linear-gradient(135deg, ${theme.colors.mauve} 0%, ${theme.colors.lavender} 100%); border-radius: 12px; padding: 2rem; margin: 1rem 0; color: ${theme.colors.base};">
        <h2 style="margin: 0 0 0.5rem 0;">${this.title}</h2>
        <p style="margin: 0; opacity: 0.9;">${this.message}</p>
        <div style="margin-top: 1rem;">
          <span style="display: inline-block; background: ${theme.colors.base}30; padding: 0.25rem 0.75rem; border-radius: 9999px; font-size: 0.875rem;">
            🧋 ElenaJS + Hono
          </span>
        </div>
      </div>
    `;
  }
}
