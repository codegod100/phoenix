// IU-5: Design System / CSS
// Auto-generated from Phoenix plan

export const _phoenix = {
  iu_id: 'design-system-005',
  name: 'Design System',
  risk_tier: 'medium',
} as const;

// Catppuccin Mocha palette
export const COLORS = {
  base: '#1e1e2e',
  mantle: '#181825',
  surface0: '#313244',
  surface1: '#45475a',
  text: '#cdd6f4',
  subtext1: '#a6adc8',
  blue: '#89b4fa',
  pink: '#f38ba8',
  green: '#a6e3a1',
  yellow: '#f9e2af',
} as const;

export const STYLES = `
:root {
  --base: ${COLORS.base};
  --mantle: ${COLORS.mantle};
  --surface0: ${COLORS.surface0};
  --surface1: ${COLORS.surface1};
  --text: ${COLORS.text};
  --subtext1: ${COLORS.subtext1};
  --blue: ${COLORS.blue};
  --pink: ${COLORS.pink};
  --green: ${COLORS.green};
  --yellow: ${COLORS.yellow};
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  background: var(--base);
  color: var(--text);
  overflow: hidden;
}

#board {
  display: flex;
  gap: 16px;
  padding: 16px;
  height: 100vh;
  width: 100vw;
  overflow-x: auto;
  overflow-y: hidden;
}

.column {
  flex-shrink: 0;
  width: 300px;
  height: 100%;
  background: var(--mantle);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
}

.column-header {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--surface1);
  position: relative;
}

.column-title {
  font-weight: 600;
  font-size: 14px;
  flex: 1;
}

.column-actions {
  display: none;
  position: absolute;
  right: 48px;
  gap: 4px;
}

.column-header:hover .column-actions {
  display: flex;
}

.column-count {
  background: var(--surface0);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: var(--subtext1);
  min-width: 24px;
  text-align: center;
}

.column-cards {
  flex: 1;
  overflow-y: auto;
  padding: 8px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.column-footer {
  padding: 12px;
  border-top: 1px solid var(--surface1);
}

.card {
  background: var(--base);
  border-radius: 6px;
  padding: 12px;
  cursor: grab;
  position: relative;
  max-height: 200px;
  overflow-y: auto;
}

.card:hover {
  box-shadow: 0 2px 8px rgba(0,0,0,0.3);
}

.card-actions {
  display: none;
  position: absolute;
  top: 8px;
  right: 8px;
  gap: 4px;
}

.card:hover .card-actions {
  display: flex;
}

.card-title {
  font-weight: 500;
  font-size: 14px;
  margin-bottom: 4px;
  padding-right: 48px;
}

.card-description {
  font-size: 12px;
  color: var(--subtext1);
  white-space: pre-wrap;
  word-break: break-word;
}

.card-description a {
  color: var(--blue);
  text-decoration: underline;
}

.btn {
  border: none;
  cursor: pointer;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}

.btn-icon {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background: var(--base);
}

.btn-icon:hover {
  background: var(--surface0);
}

.btn-edit:hover {
  color: var(--blue);
}

.btn-delete:hover {
  color: var(--pink);
}

.btn-primary {
  background: var(--blue);
  color: var(--base);
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.btn-primary:hover {
  opacity: 0.9;
}

.btn-secondary {
  background: transparent;
  color: var(--text);
  border: 1px solid var(--subtext1);
  padding: 8px 16px;
  border-radius: 6px;
}

.btn-secondary:hover {
  border-color: var(--text);
}

.btn-destructive {
  background: var(--pink);
  color: var(--base);
  padding: 8px 16px;
  border-radius: 6px;
  font-weight: 500;
}

.btn-ghost {
  background: transparent;
  color: var(--subtext1);
}

.btn-ghost:hover {
  color: var(--text);
}

.add-column-btn {
  flex-shrink: 0;
  width: 300px;
  height: fit-content;
  padding: 12px;
  background: var(--surface0);
  border: 2px dashed var(--surface1);
  border-radius: 8px;
  color: var(--subtext1);
  cursor: pointer;
}

.add-column-btn:hover {
  border-color: var(--blue);
  color: var(--blue);
}

/* Modal styles */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal {
  background: var(--mantle);
  border-radius: 8px;
  width: 90%;
  max-width: 400px;
  max-height: 90vh;
  overflow: hidden;
}

.modal-header {
  padding: 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 1px solid var(--surface1);
}

.modal-title {
  font-weight: 600;
  font-size: 16px;
}

.modal-body {
  padding: 16px;
}

.modal-footer {
  padding: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  border-top: 1px solid var(--surface1);
}

.form-group {
  margin-bottom: 16px;
}

.form-label {
  display: block;
  font-size: 12px;
  color: var(--subtext1);
  margin-bottom: 4px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  width: 100%;
  padding: 10px 12px;
  background: var(--surface0);
  border: 1px solid var(--surface1);
  border-radius: 6px;
  color: var(--text);
  font-size: 14px;
}

.form-input:focus {
  outline: none;
  border-color: var(--blue);
}

.form-textarea {
  resize: vertical;
  min-height: 80px;
}

/* Column drag and drop */
.column-header {
  cursor: grab;
}

.column-header:active {
  cursor: grabbing;
}

.column.dragging {
  opacity: 0.5;
  transform: rotate(2deg);
}

.column-drop-zone {
  width: 8px;
  flex-shrink: 0;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: default;
}

.column-drop-zone.active {
  width: 40px;
  background: var(--surface0);
  border: 2px dashed var(--blue);
}

.column-drop-zone.drag-over {
  background: var(--blue);
  border-color: var(--text);
}

.columns-container {
  display: flex;
  gap: 0;
  height: 100%;
}

/* Drag and drop states */
.card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.column.drag-over {
  background: var(--surface0);
}

/* Scrollbars */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: transparent;
}

::-webkit-scrollbar-thumb {
  background: var(--surface1);
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--subtext1);
}
`;

export function getStyles(): string {
  return STYLES;
}
