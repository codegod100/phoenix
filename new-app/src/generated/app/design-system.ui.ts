// CONTRACT: Design System IU - Catppuccin Mocha theme with modal, button, input components
// INVARIANT: Theme MUST use ONLY Catppuccin Mocha palette
// INVARIANT: Background SHALL be #1e1e2e (base), #181825 (mantle) for headers
// INVARIANT: Surface/cards MUST use #313244
// INVARIANT: Primary accent MUST be #89b4fa (blue) for buttons
// INVARIANT: Destructive actions MUST use #f38ba8 (pink)
// INVARIANT: Text MUST use #cdd6f4 (primary), #a6adc8 (secondary)
// INVARIANT: Modal backdrop MUST use rgba(0,0,0,0.7) with blur
// INVARIANT: Input fields MUST have visible labels above
// INVARIANT: Textarea MUST allow vertical resize only

export type ModalConfig = {
  title: string;
  content: string;
  primaryAction?: {
    label: string;
    onClick: () => void;
    variant?: 'primary' | 'destructive';
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
  onClose?: () => void;
};

// Render modal HTML
export function renderModal(config: ModalConfig): string {
  const { title, content, primaryAction, secondaryAction } = config;
  
  const primaryBtn = primaryAction ? `
    <button class="btn ${primaryAction.variant === 'destructive' ? 'btn-destructive' : 'btn-primary'}" 
            onclick="modalPrimaryAction()">${escapeHtml(primaryAction.label)}</button>
  ` : '';
  
  const secondaryBtn = secondaryAction ? `
    <button class="btn btn-secondary" onclick="modalSecondaryAction()">${escapeHtml(secondaryAction.label)}</button>
  ` : '';

  return `
    <div class="modal-backdrop" id="modal-backdrop" onclick="closeModal(event)">
      <div class="modal-container" onclick="event.stopPropagation()">
        <div class="modal-header">
          <h3 class="modal-title">${escapeHtml(title)}</h3>
          <button class="modal-close" onclick="closeModal()">×</button>
        </div>
        <div class="modal-body">
          ${content}
        </div>
        <div class="modal-footer">
          ${secondaryBtn}
          ${primaryBtn}
        </div>
      </div>
    </div>
  `;
}

// Create input field with visible label
export function renderInputField(props: {
  id: string;
  label: string;
  type?: 'text' | 'textarea';
  value?: string;
  placeholder?: string;
  maxLength?: number;
}): string {
  const { id, label, type = 'text', value = '', placeholder = '', maxLength } = props;
  
  const input = type === 'textarea' 
    ? `<textarea id="${id}" class="input-field" placeholder="${escapeHtml(placeholder)}" 
                ${maxLength ? `maxlength="${maxLength}"` : ''} rows="4">${escapeHtml(value)}</textarea>`
    : `<input type="text" id="${id}" class="input-field" value="${escapeHtml(value)}" 
              placeholder="${escapeHtml(placeholder)}" ${maxLength ? `maxlength="${maxLength}"` : ''} />`;

  return `
    <div class="input-group">
      <label class="input-label" for="${id}">${escapeHtml(label)}</label>
      ${input}
    </div>
  `;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Design System CSS
export const designSystemStyles = `
/* Modal Dialog */
.modal-backdrop {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: #181825;
  border-radius: 8px;
  min-width: 400px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #313244;
}

.modal-title {
  margin: 0;
  font-size: 1.1em;
  font-weight: 600;
  color: #cdd6f4;
}

.modal-close {
  background: transparent;
  border: none;
  color: #a6adc8;
  font-size: 1.5em;
  cursor: pointer;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.modal-close:hover {
  background: rgba(243, 139, 168, 0.1);
  color: #f38ba8;
}

.modal-body {
  padding: 20px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px;
  border-top: 1px solid #313244;
}

/* Buttons */
.btn {
  padding: 8px 16px;
  border-radius: 6px;
  border: none;
  font-size: 0.95em;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background: #89b4fa;
  color: #1e1e2e;
}

.btn-primary:hover {
  background: #74c7ec;
}

.btn-destructive {
  background: #f38ba8;
  color: #1e1e2e;
}

.btn-destructive:hover {
  background: #eba0ac;
}

.btn-secondary {
  background: transparent;
  border: 1px solid #a6adc8;
  color: #cdd6f4;
}

.btn-secondary:hover {
  background: rgba(166, 173, 192, 0.1);
}

/* Input Fields */
.input-group {
  margin-bottom: 16px;
}

.input-label {
  display: block;
  color: #a6adc8;
  font-size: 0.85em;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input-field {
  width: 100%;
  background: #313244;
  border: 1px solid #45475a;
  border-radius: 6px;
  padding: 10px 12px;
  color: #cdd6f4;
  font-family: inherit;
  font-size: 1em;
  box-sizing: border-box;
}

.input-field:focus {
  outline: none;
  border-color: #89b4fa;
}

textarea.input-field {
  resize: vertical;
  min-height: 80px;
}
`;

export const _phoenix = {
  iu_id: 'afda77fbdc75e670969185226515dfd3c92210e5c094793797fa1f54d6ffcafc',
  name: 'Design System',
  risk_tier: 'high',
  canon_ids: []
} as const;
