import { UserLogic } from './component-logic';

@customElement('user-card')
export class UserCard extends LitElement {
  @property({ type: String }) declare name: string;
  @property({ type: String }) declare email: string;

  constructor() {
    super();
    this.name = 'User';
    this.email = 'user@example.com';
  }

  static styles = css`
    :host {
      display: block;
    }
    
    .user-card {
      border: 1px solid %{surface0}%;
      border-radius: 8px;
      padding: 1rem;
      margin: 1rem 0;
      display: flex;
      align-items: center;
      gap: 1rem;
      background: %{surface0}%;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .user-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .avatar {
      width: 48px;
      height: 48px;
      border-radius: 50%;
      background: %{mauve}%;
      display: flex;
      align-items: center;
      justify-content: center;
      color: %{base}%;
      font-weight: bold;
      font-size: 1.2rem;
    }
    
    .info h3 {
      margin: 0;
      color: %{text}%;
      font-size: 1.1rem;
    }
    
    .info p {
      margin: 0.25rem 0 0 0;
      color: %{text}%;
      opacity: 0.7;
      font-size: 0.9rem;
    }
    
    .invalid-email {
      color: %{danger}%;
      font-size: 0.8rem;
      margin-top: 0.25rem;
    }
  `;

  private getInitials(): string {
    return UserLogic.getInitials(this.name);
  }

  render() {
    const isValidEmail = UserLogic.isValidEmail(this.email);

    return html`
      <div class="user-card">
        <div class="avatar">${this.getInitials()}</div>
        <div class="info">
          <h3>${this.name}</h3>
          <p>${this.email}</p>
          ${!isValidEmail ? html`<span class="invalid-email">Invalid email</span>` : ''}
        </div>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'user-card': UserCard;
  }
}
