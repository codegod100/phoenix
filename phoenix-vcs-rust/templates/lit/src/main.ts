import { LitElement, html, css } from 'lit';
import { customElement, property } from 'lit/decorators.js';

// Example: Simple counter component
@customElement('my-counter')
export class MyCounter extends LitElement {
  static styles = css`
    :host {
      display: block;
      padding: 16px;
      font-family: system-ui, sans-serif;
    }
    button {
      padding: 8px 16px;
      font-size: 1rem;
      cursor: pointer;
    }
    span {
      margin: 0 8px;
      font-weight: bold;
    }
  `;

  @property({ type: Number })
  count = 0;

  render() {
    return html`
      <div>
        <button @click=${this._decrement}>-</button>
        <span>${this.count}</span>
        <button @click=${this._increment}>+</button>
      </div>
    `;
  }

  private _increment() {
    this.count++;
  }

  private _decrement() {
    this.count--;
  }
}

// Main app entry
console.log('Lit app initialized');
