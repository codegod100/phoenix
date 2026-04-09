# Dashboard Base UI

Core dashboard page structure, theme, and layout.

## Page Structure

- REQUIREMENT: The dashboard must render a complete HTML page with inline CSS and JavaScript
- REQUIREMENT: The page must be encoded in UTF-8 with proper charset meta tag
- REQUIREMENT: The page must include a viewport meta tag for responsive scaling
- REQUIREMENT: The page must display a spacious header with the title "TaskFlow" with comfortable vertical padding ~48px height, centered content, and larger text with font-weight 600
- REQUIREMENT: The dashboard must use CSS custom properties for all Catppuccin colors
- REQUIREMENT: The layout must be responsive with single column on mobile and multi-column grid on desktop

## Catppuccin Theme

- REQUIREMENT: The dashboard must use the Catppuccin Mocha color palette exclusively
- DEFINITION: Background color is #1e1e2e (base), card background is #313244 (surface0)
- DEFINITION: Text color is #cdd6f4 (text), secondary text is #a6adc8 (subtext0)
- DEFINITION: Primary accent is #89b4fa (blue), success is #a6e3a1 (green), warning is #f9e2af (yellow), danger is #f38ba8 (red)
- DEFINITION: Priority critical is #f38ba8 (red), high is #fab387 (peach), medium is #f9e2af (yellow), low is #a6e3a1 (green)
- DEFINITION: Status open is #6c7086 (overlay0), in_progress is #89b4fa (blue), review is #cba6f7 (mauve), done is #a6e3a1 (green), archived is #585b70 (surface1 - dimmed)
- REQUIREMENT: The dashboard must use CSS custom properties for all Catppuccin colors
- CONSTRAINT: No theme toggle or system preference detection - Catppuccin Mocha is the only theme

## Base Styles

- REQUIREMENT: The dashboard must use CSS custom properties for theming with --primary, --danger, --success, and --warning colors
- REQUIREMENT: Cards must have subtle shadows, rounded corners of 8px, and hover effects
- REQUIREMENT: The font must be system-ui with appropriate size hierarchy (h1: 1.5rem, body: 0.95rem)
- REQUIREMENT: Buttons must have rounded corners, appropriate padding, and cursor pointer
- REQUIREMENT: Date inputs must use a custom date picker component styled with Catppuccin Mocha theme
- REQUIREMENT: The custom date picker must display a calendar grid with proper month and year navigation
- REQUIREMENT: Date picker days must have hover states and selected day highlighting using theme colors
- REQUIREMENT: Date picker popover must use --ctp-surface0 background with --ctp-surface1 borders

## Tab Navigation Design

- REQUIREMENT: The active tab must use a straight horizontal highlight line underneath the tab text
- DEFINITION: The highlight line must be a 3px solid line using the primary accent color (#89b4fa)
- DEFINITION: The highlight line must span the full width of the tab button
- DEFINITION: The highlight line must have no rounded corners or curved edges
- CONSTRAINT: The tab button must use border-radius: 0 to ensure perfectly straight edges
- CONSTRAINT: The highlight line must not use any box-shadow or gradient effects that could create a curved appearance
- REQUIREMENT: Inactive tabs must show no underline or highlight
- REQUIREMENT: The tab container must have a subtle bottom border separator line using surface0 color
- DEFINITION: The tab highlight must animate with a 200ms transition when switching between tabs
