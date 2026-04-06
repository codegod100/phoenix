// Generated from IU: Design System (bf83ac25db7a555eb990ae0055538ad1b8dcbe200de27c76ccf218bb1a607959)
// Source: spec/app.md - Design System section
// Theme: Catppuccin Mocha

export const Theme = {
  colors: {
    // Base
    base: '#1e1e2e',
    mantle: '#181825',
    crust: '#11111b',
    
    // Surfaces
    surface0: '#313244',
    surface1: '#45475a',
    surface2: '#585b70',
    
    // Text
    text: '#cdd6f4',
    subtext0: '#a6adc8',
    subtext1: '#bac2de',
    
    // Accents
    blue: '#89b4fa',
    lavender: '#b4befe',
    sapphire: '#74c7ec',
    sky: '#89dceb',
    teal: '#94e2d5',
    green: '#a6e3a1',
    yellow: '#f9e2af',
    peach: '#fab387',
    maroon: '#eba0ac',
    red: '#f38ba8',
    mauve: '#cba6f7',
    pink: '#f5c2e7',
    flamingo: '#f2cdcd',
    rosewater: '#f5e0dc'
  }
} as const;

// Server-side rendering helpers (for server.ts compatibility)
export function renderModal(title: string, content: string, confirmText = 'Confirm', cancelText = 'Cancel', destructive = false): string {
  const primaryBg = destructive ? Theme.colors.red : Theme.colors.blue;
  const primaryColor = Theme.colors.base;
  
  return `
    <div class="modal-backdrop" style="
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.7);
      backdrop-filter: blur(4px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 1000;
    ">
      <div class="modal-container" style="
        background: ${Theme.colors.mantle};
        border-radius: 8px;
        min-width: 400px;
        max-width: 90vw;
      ">
        <div style="
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          border-bottom: 1px solid ${Theme.colors.surface0};
        ">
          <h2 style="margin: 0; color: ${Theme.colors.text}; font-size: 18px;">${title}</h2>
          <button onclick="this.closest('.modal-backdrop').remove()" style="
            background: transparent; border: none;
            color: ${Theme.colors.subtext0}; font-size: 24px; cursor: pointer;
          ">×</button>
        </div>
        <div style="padding: 24px;">${content}</div>
        <div style="
          display: flex;
          justify-content: flex-end;
          gap: 12px;
          padding: 16px 24px;
          border-top: 1px solid ${Theme.colors.surface0};
        ">
          <button onclick="this.closest('.modal-backdrop').remove()" style="
            background: transparent; color: ${Theme.colors.text};
            border: 1px solid ${Theme.colors.subtext0};
            border-radius: 6px; padding: 8px 16px; cursor: pointer;
          ">${cancelText}</button>
          <button style="
            background: ${primaryBg}; color: ${primaryColor};
            border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer;
          ">${confirmText}</button>
        </div>
      </div>
    </div>
  `;
}

export function renderInputField(label: string, name: string, type = 'text', value = '', placeholder = ''): string {
  return `
    <label style="color: ${Theme.colors.subtext0}; font-size: 12px; display: block; margin-bottom: 4px;">${label}</label>
    <input type="${type}" name="${name}" value="${value}" placeholder="${placeholder}" style="
      width: 100%; background: ${Theme.colors.surface0};
      border: 1px solid ${Theme.colors.surface1}; color: ${Theme.colors.text};
      border-radius: 6px; padding: 8px 12px; box-sizing: border-box;
    ">
  `;
}

export const designSystemStyles = `
  :root {
    --cat-base: ${Theme.colors.base};
    --cat-mantle: ${Theme.colors.mantle};
    --cat-crust: ${Theme.colors.crust};
    --cat-surface0: ${Theme.colors.surface0};
    --cat-surface1: ${Theme.colors.surface1};
    --cat-text: ${Theme.colors.text};
    --cat-subtext0: ${Theme.colors.subtext0};
    --cat-blue: ${Theme.colors.blue};
    --cat-red: ${Theme.colors.red};
    --cat-green: ${Theme.colors.green};
    --cat-yellow: ${Theme.colors.yellow};
  }
  body {
    background: var(--cat-base);
    color: var(--cat-text);
    font-family: system-ui, -apple-system, sans-serif;
    margin: 0;
  }
`;

export const DesignSystem = {
  // Layout
  layout: {
    boardBackground: Theme.colors.base,
    columnBackground: Theme.colors.surface0,
    cardBackground: Theme.colors.surface0,
    headerBackground: Theme.colors.mantle
  },

  // Typography
  typography: {
    primary: Theme.colors.text,
    secondary: Theme.colors.subtext0,
    fontFamily: 'system-ui, -apple-system, sans-serif'
  },

  // Components
  button: {
    primary: {
      background: Theme.colors.blue,
      color: Theme.colors.base,
      borderRadius: '6px',
      padding: '8px 16px'
    },
    secondary: {
      background: 'transparent',
      color: Theme.colors.text,
      border: `1px solid ${Theme.colors.subtext0}`,
      borderRadius: '6px',
      padding: '8px 16px'
    },
    destructive: {
      background: Theme.colors.red,
      color: Theme.colors.base,
      borderRadius: '6px',
      padding: '8px 16px'
    },
    ghost: {
      background: 'transparent',
      color: Theme.colors.subtext0,
      borderRadius: '6px',
      padding: '8px 16px'
    }
  },

  input: {
    background: Theme.colors.surface0,
    border: `1px solid ${Theme.colors.surface1}`,
    borderFocus: Theme.colors.blue,
    color: Theme.colors.text,
    borderRadius: '6px',
    padding: '8px 12px'
  },

  modal: {
    backdrop: 'rgba(0,0,0,0.7)',
    background: Theme.colors.mantle,
    borderRadius: '8px',
    padding: '24px'
  },

  // Status colors
  status: {
    success: Theme.colors.green,
    warning: Theme.colors.yellow,
    error: Theme.colors.red,
    info: Theme.colors.blue
  },

  // Card styles
  card: {
    maxHeight: '200px',
    background: Theme.colors.base,  // Use darker base color for cards
    borderRadius: '6px',
    shadow: '0 2px 4px rgba(0,0,0,0.2)',
    padding: '12px'
  },

  // Badge styles
  badge: {
    background: Theme.colors.surface0,
    color: Theme.colors.blue,
    borderRadius: '10px',
    padding: '2px 8px',
    fontSize: '12px'
  }
} as const;

// Phoenix traceability
export const _phoenix = {
  iu_id: '8d3ef5cc48c3b7630b398cbd74c0948f278a81b59dc569ddd3166378e62a22e5',
  name: 'Designsystem',
  risk_tier: 'medium'
} as const;
