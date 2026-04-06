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
    background: Theme.colors.surface0,
    borderRadius: '6px',
    padding: '12px',
    shadow: '0 2px 4px rgba(0,0,0,0.2)'
  },

  // Badge
  badge: {
    background: Theme.colors.surface1,
    color: Theme.colors.subtext0,
    borderRadius: '12px',
    padding: '2px 8px',
    fontSize: '12px'
  }
};
