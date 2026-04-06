// Generated: Dashboard Page & Theme (IU-b2c3d4e5f6789012345678abcdef901234567890)
// Description: HTML page structure, Catppuccin theme, responsive layout

export const CATPPUCCIN_COLORS = {
  base: '#1e1e2e',
  surface0: '#313244',
  surface1: '#585b70',
  text: '#cdd6f4',
  subtext0: '#a6adc8',
  blue: '#89b4fa',
  green: '#a6e3a1',
  yellow: '#f9e2af',
  red: '#f38ba8',
  peach: '#fab387',
  mauve: '#cba6f7',
  overlay0: '#6c7086',
} as const;

export const PRIORITY_COLORS: Record<string, string> = {
  critical: CATPPUCCIN_COLORS.red,
  high: CATPPUCCIN_COLORS.peach,
  medium: CATPPUCCIN_COLORS.yellow,
  low: CATPPUCCIN_COLORS.green,
};

export const STATUS_COLORS: Record<string, string> = {
  open: CATPPUCCIN_COLORS.overlay0,
  in_progress: CATPPUCCIN_COLORS.blue,
  review: CATPPUCCIN_COLORS.mauve,
  done: CATPPUCCIN_COLORS.green,
  archived: CATPPUCCIN_COLORS.surface1,
};

export function generateCSS(): string {
  return `
    :root {
      --ctp-base: ${CATPPUCCIN_COLORS.base};
      --ctp-surface0: ${CATPPUCCIN_COLORS.surface0};
      --ctp-surface1: ${CATPPUCCIN_COLORS.surface1};
      --ctp-text: ${CATPPUCCIN_COLORS.text};
      --ctp-subtext0: ${CATPPUCCIN_COLORS.subtext0};
      --ctp-primary: ${CATPPUCCIN_COLORS.blue};
      --ctp-success: ${CATPPUCCIN_COLORS.green};
      --ctp-warning: ${CATPPUCCIN_COLORS.yellow};
      --ctp-danger: ${CATPPUCCIN_COLORS.red};
      --ctp-peach: ${CATPPUCCIN_COLORS.peach};
      --ctp-mauve: ${CATPPUCCIN_COLORS.mauve};
      --ctp-overlay0: ${CATPPUCCIN_COLORS.overlay0};
    }

    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      font-family: system-ui, -apple-system, sans-serif;
      font-size: 0.95rem;
      background: var(--ctp-base);
      color: var(--ctp-text);
      line-height: 1.5;
      min-height: 100vh;
    }

    .header {
      padding: 16px 24px;
      height: 32px;
      display: flex;
      align-items: center;
      justify-content: center;
      border-bottom: 1px solid var(--ctp-surface0);
    }

    .header h1 {
      font-size: 1.5rem;
      font-weight: 600;
    }

    .container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }

    .card {
      background: var(--ctp-surface0);
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.3);
      transition: transform 0.2s, box-shadow 0.2s;
    }

    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
    }

    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.9rem;
      transition: opacity 0.2s;
    }

    .btn:hover {
      opacity: 0.9;
    }

    .btn-primary {
      background: var(--ctp-primary);
      color: var(--ctp-base);
    }

    .btn-danger {
      background: var(--ctp-danger);
      color: var(--ctp-base);
    }

    .btn-success {
      background: var(--ctp-success);
      color: var(--ctp-base);
    }

    @media (max-width: 768px) {
      .container {
        padding: 16px;
      }
    }
  `;
}

export function renderDashboardPage(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>TaskFlow</title>
  <style>${generateCSS()}</style>
</head>
<body>
  <header class="header">
    <h1>TaskFlow</h1>
  </header>
  <main class="container">
    ${content}
  </main>
</body>
</html>`;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'b2c3d4e5f6789012345678abcdef901234567890',
  name: 'Dashboard Page & Theme',
  risk_tier: 'high',
} as const;
