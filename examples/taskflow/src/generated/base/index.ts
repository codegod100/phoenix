/**
 * @phoenix-iu: e9b69935bcb821300653dcd028025f27a298f3d860ef6c15a58dd52fb6c23d67
 * @phoenix-name: Base Domain
 * @phoenix-risk: HIGH
 */
/**
 * @phoenix-canon: 1d98cea9ca41391bc76e51d98ac04fee4a9e3102e35531f0d24c36d6f84c890b
 * Requirement: The dashboard must use CSS custom properties for theming with primary, danger, success, and warning colors
 * 
 * @phoenix-canon: 9d6580bab6570e4d048e2cdb217a4d00b822643e23e7cb7ecab6110447268789
 * Requirement: Cards must have subtle shadows, rounded corners of 8px, and hover effects
 * 
 * @phoenix-canon: 58b80bc522aa2f198e2ecf315d1090e964ffa1afda871081c13e095e0d3ab4ae
 * Requirement: The font must be system-ui with appropriate size hierarchy (h1: 1.5rem, body: 0.95rem)
 * 
 * @phoenix-canon: c90f58ebacff9b6580bbc38f7293e86dffe115780059ef2dc2ea5722ed44a802
 * Requirement: Buttons must have rounded corners, appropriate padding, and cursor pointer
 * 
 * @phoenix-canon: 39f5873bbfd3cbb1ee4672724e123099c1909fe5e523f989b89ea05e195c9e24
 * Requirement: Date inputs must use a custom date picker component styled with Catppuccin Mocha theme
 * 
 * @phoenix-canon: 71c8e6f5c3ef8d2003292ba737f09cf038956ab66bcdbcda9cac53ccc3d52e87
 * Requirement: The custom date picker must display a calendar grid with proper month and year navigation
 * 
 * @phoenix-canon: 2333b8650b4e8b80b2984dfed30d9bcf08945af4b0595db02967e30e4aee78f0
 * Requirement: Date picker days must have hover states and selected day highlighting using theme colors
 * 
 * @phoenix-canon: 0e495d1ee4c2f6a6c7a2155c09f47a678a9e9a3c67f0f00d96e16634613c770a
 * Requirement: Date picker popover must use ctp-surface0 background with ctp-surface1 borders
 * 
 * Base Domain - Risk Tier: high
 */

/**
 * Base CSS styles for the dashboard
 * @phoenix-canon: 1d98cea9ca41391bc76e51d98ac04fee4a9e3102e35531f0d24c36d6f84c890b
 * @phoenix-canon: 58b80bc522aa2f198e2ecf315d1090e964ffa1afda871081c13e095e0d3ab4ae
 */
export function getBaseStyles(): string {
  return `
    * { box-sizing: border-box; margin: 0; padding: 0; }
    
    body {
      font-family: system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 0.95rem;
      line-height: 1.5;
      background: var(--ctp-base);
      color: var(--ctp-text);
      min-height: 100vh;
    }
    
    h1 { font-size: 1.5rem; font-weight: 600; }
    h2 { font-size: 1.25rem; font-weight: 600; }
    h3 { font-size: 1.1rem; font-weight: 600; }
    
    button {
      cursor: pointer;
      border: none;
      border-radius: 6px;
      padding: 8px 16px;
      font-size: 0.9rem;
      font-family: inherit;
      transition: opacity 0.2s;
    }
    
    button:hover { opacity: 0.9; }
    button:disabled { opacity: 0.5; cursor: not-allowed; }
    
    input, select, textarea {
      font-family: inherit;
      font-size: 0.95rem;
      padding: 8px 12px;
      border: 1px solid var(--ctp-surface1);
      border-radius: 6px;
      background: var(--ctp-surface0);
      color: var(--ctp-text);
    }
    
    input:focus, select:focus, textarea:focus {
      outline: none;
      border-color: var(--ctp-blue);
    }
    
    /* Card styles */
    .card {
      background: var(--ctp-surface0);
      border-radius: 8px;
      padding: 16px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.2);
      transition: transform 0.2s, box-shadow 0.2s;
    }
    
    .card:hover {
      transform: translateY(-2px);
      box-shadow: 0 4px 16px rgba(0,0,0,0.3);
    }
  `;
}

/**
 * Button variants
 * @phoenix-canon: c90f58ebacff9b6580bbc38f7293e86dffe115780059ef2dc2ea5722ed44a802
 */
export function getButtonStyles(): string {
  return `
    .btn-primary { background: var(--ctp-blue); color: var(--ctp-crust); }
    .btn-success { background: var(--ctp-green); color: var(--ctp-crust); }
    .btn-warning { background: var(--ctp-yellow); color: var(--ctp-crust); }
    .btn-danger { background: var(--ctp-red); color: var(--ctp-crust); }
    .btn-secondary { background: var(--ctp-surface1); color: var(--ctp-text); }
    
    .btn-sm { padding: 4px 8px; font-size: 0.8rem; }
    .btn-lg { padding: 12px 24px; font-size: 1rem; }
  `;
}
