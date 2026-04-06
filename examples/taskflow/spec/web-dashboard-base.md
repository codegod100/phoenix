# Dashboard Base UI

Core dashboard page structure, theme, and layout.

## Page Structure

- The dashboard must render a complete HTML page with inline CSS and JavaScript
- The page must display a compact header with the title "TaskFlow" (minimal vertical padding ~32px height, larger text)
- The dashboard must use CSS custom properties for all Catppuccin colors
- The layout must be responsive: single column on mobile, multi-column grid on desktop

## Catppuccin Theme

- The dashboard must use the Catppuccin Mocha color palette exclusively
- Background color: #1e1e2e (base), card background: #313244 (surface0)
- Text color: #cdd6f4 (text), secondary text: #a6adc8 (subtext0)
- Primary accent: #89b4fa (blue), success: #a6e3a1 (green), warning: #f9e2af (yellow), danger: #f38ba8 (red)
- Priority critical: #f38ba8 (red), high: #fab387 (peach), medium: #f9e2af (yellow), low: #a6e3a1 (green)
- Status open: #6c7086 (overlay0), in_progress: #89b4fa (blue), review: #cba6f7 (mauve), done: #a6e3a1 (green), archived: #585b70 (surface1 - dimmed)
- The dashboard must use CSS custom properties for all Catppuccin colors
- No theme toggle or system preference detection - Catppuccin Mocha is the only theme

## Base Styles

- The dashboard must use CSS custom properties for theming (--primary, --danger, --success, --warning colors)
- Cards must have subtle shadows, rounded corners (8px), and hover effects
- The font must be system-ui with appropriate size hierarchy (h1: 1.5rem, body: 0.95rem)
- Buttons must have rounded corners, appropriate padding, and cursor pointer
- Date inputs must use a custom date picker component styled with Catppuccin Mocha theme
- The custom date picker must display a calendar grid with proper month/year navigation
- Date picker days must have hover states and selected day highlighting using theme colors
- Date picker popover must use --ctp-surface0 background with --ctp-surface1 borders
