// Catppuccin Mocha Theme - injected from theme.ncl via NCL import

export const catppuccin = {
  rosewater: '%{rosewater}%',
  flamingo: '%{flamingo}%',
  pink: '%{pink}%',
  mauve: '%{mauve}%',
  red: '%{red}%',
  maroon: '%{maroon}%',
  peach: '%{peach}%',
  yellow: '%{yellow}%',
  green: '%{green}%',
  teal: '%{teal}%',
  sky: '%{sky}%',
  sapphire: '%{sapphire}%',
  blue: '%{blue}%',
  lavender: '%{lavender}%',
  text: '%{text}%',
  subtext1: '%{subtext1}%',
  subtext0: '%{subtext0}%',
  overlay2: '%{overlay2}%',
  overlay1: '%{overlay1}%',
  overlay0: '%{overlay0}%',
  surface2: '%{surface2}%',
  surface1: '%{surface1}%',
  surface0: '%{surface0}%',
  base: '%{base}%',
  mantle: '%{mantle}%',
  crust: '%{crust}%'
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
