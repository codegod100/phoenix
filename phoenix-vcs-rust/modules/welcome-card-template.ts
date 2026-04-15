@customElement('welcome-card')
export class WelcomeCard extends LitElement {
  @property({ type: String }) title = 'Welcome';
  @property({ type: String }) message = 'Get started with Lit';

  static styles = css`
    :host {
      display: block;
    }
    
    .welcome {
      background: linear-gradient(135deg, %{mauve}% 0%, %{lavender}% 100%);
      border-radius: 12px;
      padding: 2rem;
      margin: 1rem 0;
      color: %{base}%;
      box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);
    }
    
    h2 {
      margin: 0 0 0.5rem 0;
      font-size: 1.5rem;
    }
    
    p {
      margin: 0;
      opacity: 0.9;
    }
    
    .badge {
      display: inline-block;
      background: %{base}%30;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      margin-top: 1rem;
    }
  `;

  render() {
    return html`
      <div class="welcome">
        <h2>${this.title}</h2>
        <p>${this.message}</p>
        <span class="badge">🎨 Theme: %{activeTheme}%</span>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'welcome-card': WelcomeCard;
  }
}
