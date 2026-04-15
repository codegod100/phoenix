// Theme colors - injected from theme.ncl via NCL import

export const catppuccin = {
  rosewater: '#ffd6d6',
  flamingo: '#ffb8b8',
  pink: '#ff9ece',
  mauve: '#c5a3ff',
  red: '#e85d75',
  maroon: '#d47085',
  peach: '#ff9e80',
  yellow: '#ffdf80',
  green: '#85d175',
  teal: '#7ee0c5',
  sky: '#6aaaff',
  sapphire: '#81c1ff',
  blue: '#5294e2',
  lavender: '#a8b5ff',
  text: '#d3dae3',
  subtext1: '#b6bcc8',
  subtext0: '#9aa0ac',
  overlay2: '#7c818c',
  overlay1: '#666b77',
  overlay0: '#50555f',
  surface2: '#4b5162',
  surface1: '#404552',
  surface0: '#383c4a',
  base: '#2f343f',
  mantle: '#262b33',
  crust: '#1e2227'
};

export class StyleUtils {
  static card(options: { padding?: string; maxWidth?: string; shadow?: boolean } = {}) {
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

  static button(options: { variant?: string; size?: string } = {}) {
    const { variant = 'primary', size = 'medium' } = options;

    const colors: Record<string, string> = {
      primary: catppuccin.mauve,
      danger: catppuccin.red,
      success: catppuccin.green,
      warning: catppuccin.peach,
      secondary: catppuccin.surface1,
      mauve: catppuccin.mauve,
      teal: catppuccin.teal
    };

    const sizes: Record<string, string> = {
      small: '0.4rem 0.8rem',
      medium: '0.75rem 1.5rem',
      large: '1rem 2rem'
    };

    return `
      padding: ${sizes[size]};
      background: ${colors[variant] || catppuccin.mauve};
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

  static input() {
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

  static flex(options: { gap?: string; align?: string } = {}) {
    const { gap = '0.5rem', align = 'center' } = options;
    return `
      display: flex;
      align-items: ${align};
      gap: ${gap};
    `;
  }
}

export const css = (strings: TemplateStringsArray, ...values: (string | number)[]): string =>
  strings.reduce((acc: string, str: string, i: number) => acc + str + (values[i] || ''), '');

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
