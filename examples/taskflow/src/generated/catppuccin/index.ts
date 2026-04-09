/**
 * @phoenix-iu: f56c1390c9aa63a575c0cdd0949d9dcd609dacc3c189d44e1e640f3f9244aa64
 * @phoenix-name: Catppuccin Domain
 * @phoenix-risk: MEDIUM
 */
/**
 * @phoenix-canon: 023acc45de3711aa6d5855347d8a60b343256b329a9be25fca3be4155af18b5b
 * Requirement: The dashboard must use the Catppuccin Mocha color palette exclusively
 * 
 * @phoenix-canon: e2ea22fa125ca39ba88de43bd4642b2d562c76bb31e0157fbf474db5c9a9e35d
 * Definition: Background color is 1e1e2e base, card background is 313244 surface0
 * 
 * @phoenix-canon: 5897f7d834296f08d73a8358b63926b3afeaca580879cb965d0fa5bbcabcbd26
 * Definition: Text color is cdd6f4 text, secondary text is a6adc8 subtext0
 * 
 * @phoenix-canon: b90a45d9d76100ea664f3ed94adbdcafed02c913bfb323e3e8ea62573ebdfe35
 * Definition: Primary accent is 89b4fa blue, success is a6e3a1 green, warning is f9e2af yellow, danger is f38ba8 red
 * 
 * @phoenix-canon: ed4b8264171a7006e90435b07d66972b0cdc3260b0daa15a4c356a4c694390ee
 * Definition: Priority critical is f38ba8 red, high is fab387 peach, medium is f9e2af yellow, low is a6e3a1 green
 * 
 * @phoenix-canon: 894211f4ec8a7d51cc0951a9c45d3b1efb6817e90587121e99bed051a67895bc
 * Definition: Status open is 6c7086 overlay0, in_progress is 89b4fa blue, review is cba6f7 mauve, done is a6e3a1 green
 * 
 * @phoenix-canon: a7e9866bf870807da012639ea4f851d1246105efe849adde0d9f5b4ed73dff04
 * Constraint: No theme toggle or system preference detection - Catppuccin Mocha is the only theme
 * 
 * Catppuccin Domain - Risk Tier: medium
 */

export interface ColorPalette {
  base: string;
  mantle: string;
  crust: string;
  surface0: string;
  surface1: string;
  surface2: string;
  overlay0: string;
  overlay1: string;
  overlay2: string;
  text: string;
  subtext0: string;
  subtext1: string;
  lavender: string;
  blue: string;
  sapphire: string;
  sky: string;
  teal: string;
  green: string;
  yellow: string;
  peach: string;
  maroon: string;
  red: string;
  mauve: string;
  pink: string;
  flamingo: string;
  rosewater: string;
}

/**
 * Catppuccin Mocha color palette
 * @phoenix-canon: 023acc45de3711aa6d5855347d8a60b343256b329a9be25fca3be4155af18b5b
 * @phoenix-canon: e2ea22fa125ca39ba88de43bd4642b2d562c76bb31e0157fbf474db5c9a9e35d
 * @phoenix-canon: 5897f7d834296f08d73a8358b63926b3afeaca580879cb965d0fa5bbcabcbd26
 */
export const mocha: ColorPalette = {
  base: "#1e1e2e",
  mantle: "#181825",
  crust: "#11111b",
  surface0: "#313244",
  surface1: "#45475a",
  surface2: "#585b70",
  overlay0: "#6c7086",
  overlay1: "#7f849c",
  overlay2: "#9399b2",
  text: "#cdd6f4",
  subtext0: "#a6adc8",
  subtext1: "#bac2de",
  lavender: "#b4befe",
  blue: "#89b4fa",
  sapphire: "#74c7ec",
  sky: "#89dceb",
  teal: "#94e2d5",
  green: "#a6e3a1",
  yellow: "#f9e2af",
  peach: "#fab387",
  maroon: "#eba0ac",
  red: "#f38ba8",
  mauve: "#cba6f7",
  pink: "#f5c2e7",
  flamingo: "#f2cdcd",
  rosewater: "#f5e0dc"
};

/**
 * Semantic colors for UI elements
 * @phoenix-canon: b90a45d9d76100ea664f3ed94adbdcafed02c913bfb323e3e8ea62573ebdfe35
 */
export const semantic = {
  primary: mocha.blue,
  success: mocha.green,
  warning: mocha.yellow,
  danger: mocha.red,
  info: mocha.sky
};

/**
 * Priority colors
 * @phoenix-canon: ed4b8264171a7006e90435b07d66972b0cdc3260b0daa15a4c356a4c694390ee
 */
export const priorityColors = {
  critical: mocha.red,
  high: mocha.peach,
  medium: mocha.yellow,
  low: mocha.green
};

/**
 * Status colors
 * @phoenix-canon: 894211f4ec8a7d51cc0951a9c45d3b1efb6817e90587121e99bed051a67895bc
 * @phoenix-canon: 1cedce764142f7d8e0d2e01c0dbc6fca0c9b28d615770a15dac414e831c81b08
 */
export const statusColors = {
  open: mocha.overlay0,
  in_progress: mocha.blue,
  review: mocha.mauve,
  done: mocha.green,
  archived: mocha.surface1
};

/**
 * Generate CSS custom properties
 * @phoenix-canon: 3b90fe0067a3d588c01a9d4a5ace94162874cdf14455ff6b93bfa97f6a618fc3
 */
export function generateCSSVariables(): string {
  return `
    :root {
      /* Base */
      --ctp-base: ${mocha.base};
      --ctp-mantle: ${mocha.mantle};
      --ctp-crust: ${mocha.crust};
      
      /* Surface */
      --ctp-surface0: ${mocha.surface0};
      --ctp-surface1: ${mocha.surface1};
      --ctp-surface2: ${mocha.surface2};
      
      /* Overlay */
      --ctp-overlay0: ${mocha.overlay0};
      --ctp-overlay1: ${mocha.overlay1};
      --ctp-overlay2: ${mocha.overlay2};
      
      /* Text */
      --ctp-text: ${mocha.text};
      --ctp-subtext0: ${mocha.subtext0};
      --ctp-subtext1: ${mocha.subtext1};
      
      /* Colors */
      --ctp-lavender: ${mocha.lavender};
      --ctp-blue: ${mocha.blue};
      --ctp-sapphire: ${mocha.sapphire};
      --ctp-sky: ${mocha.sky};
      --ctp-teal: ${mocha.teal};
      --ctp-green: ${mocha.green};
      --ctp-yellow: ${mocha.yellow};
      --ctp-peach: ${mocha.peach};
      --ctp-maroon: ${mocha.maroon};
      --ctp-red: ${mocha.red};
      --ctp-mauve: ${mocha.mauve};
      --ctp-pink: ${mocha.pink};
      --ctp-flamingo: ${mocha.flamingo};
      --ctp-rosewater: ${mocha.rosewater};
      
      /* Semantic */
      --ctp-primary: ${semantic.primary};
      --ctp-success: ${semantic.success};
      --ctp-warning: ${semantic.warning};
      --ctp-danger: ${semantic.danger};
      --ctp-info: ${semantic.info};
    }
  `;
}
