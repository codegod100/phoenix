@customElement('lit-counter')
export class LitCounter extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 1rem;
      background: %{surface0}%;
      border-radius: 12px;
      font-family: system-ui, sans-serif;
    }
    
    .counter {
      display: flex;
      align-items: center;
      gap: 1rem;
      justify-content: center;
    }
    
    .count {
      font-size: 2rem;
      font-weight: bold;
      color: %{text}%;
      min-width: 3rem;
      text-align: center;
    }
    
    button {
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-size: 1.2rem;
      font-weight: bold;
      transition: transform 0.1s, opacity 0.2s;
    }
    
    button:hover {
      transform: translateY(-2px);
      opacity: 0.9;
    }
    
    button:active {
      transform: translateY(0);
    }
    
    .decrement {
      background: %{secondary}%;
      color: %{base}%;
    }
    
    .increment {
      background: %{primary}%;
      color: %{base}%;
    }
  `;

  @property({ type: Number }) count = 0;

  render() {
    return html`
      <div class="counter">
        <button class="decrement" @click=${() => this.count--}>-</button>
        <span class="count">${this.count}</span>
        <button class="increment" @click=${() => this.count++}>+</button>
      </div>
    `;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'lit-counter': LitCounter;
  }
}
