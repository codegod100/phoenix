// Catppuccin Mocha Theme
// https://github.com/catppuccin/catppuccin

const catppuccin = {
  rosewater: '#f5e0dc',
  flamingo: '#f2cdcd',
  pink: '#f5c2e7',
  mauve: '#cba6f7',
  red: '#f38ba8',
  maroon: '#eba0ac',
  peach: '#fab387',
  yellow: '#f9e2af',
  green: '#a6e3a1',
  teal: '#94e2d5',
  sky: '#89dceb',
  sapphire: '#74c7ec',
  blue: '#89b4fa',
  lavender: '#b4befe',
  text: '#cdd6f4',
  subtext1: '#bac2de',
  subtext0: '#a6adc8',
  overlay2: '#9399b2',
  overlay1: '#7f849c',
  overlay0: '#6c7086',
  surface2: '#585b70',
  surface1: '#45475a',
  surface0: '#313244',
  base: '#1e1e2e',
  mantle: '#181825',
  crust: '#11111b'
};

export class StyleUtils {
  static card(options = {}) {
    const { padding = '1.5rem', maxWidth = '500px', shadow = true } = options;
    return `
      background: ${catppuccin.surface0};
      border-radius: 12px;
      padding: ${padding};
      ${shadow ? `box-shadow: 0 4px 16px ${catppuccin.crust}40;` : ''}
      ${maxWidth ? `max-width: ${maxWidth};` : ''}
      border: 1px solid ${catppuccin.surface1};
    `;
  }

  static button(options = {}) {
    const { variant = 'primary', size = 'medium' } = options;

    const colors = {
      primary: catppuccin.mauve,
      danger: catppuccin.red,
      success: catppuccin.green,
      warning: catppuccin.peach,
      secondary: catppuccin.surface1
    };

    const sizes = {
      small: '0.4rem 0.8rem',
      medium: '0.75rem 1.5rem',
      large: '1rem 2rem'
    };

    return `
      padding: ${sizes[size]};
      background: ${colors[variant]};
      color: ${catppuccin.base};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: transform 0.1s, opacity 0.2s;
      &:hover {
        opacity: 0.9;
        transform: translateY(-1px);
      }
    `;
  }

  static input(options = {}) {
    return `
      flex: 1;
      padding: 0.75rem;
      background: ${catppuccin.surface1};
      border: 2px solid ${catppuccin.surface2};
      border-radius: 8px;
      color: ${catppuccin.text};
      font-size: 1rem;
      outline: none;
      transition: border-color 0.2s;
      &::placeholder {
        color: ${catppuccin.overlay0};
      }
      &:focus {
        border-color: ${catppuccin.mauve};
      }
    `;
  }

  static flex(options = {}) {
    const { gap = '0.5rem', align = 'center' } = options;
    return `
      display: flex;
      align-items: ${align};
      gap: ${gap};
    `;
  }
}

export const css = (strings, ...values) =>
  strings.reduce((acc, str, i) => acc + str + (values[i] || ''), '');

export const theme = {
  colors: catppuccin,
  spacing: {
    xs: '0.25rem',
    sm: '0.5rem',
    md: '1rem',
    lg: '1.5rem',
    xl: '2rem'
  }
};
