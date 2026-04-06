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
  iu_id: 'fc4e93f9d3a4a19648eca9f01c566b88f3e1d3d13da5fd2e6fdfeead404bc0c7',
  name: 'Design System',
  risk_tier: 'medium',
  canon_ids: [
    '0b2afc1848d8c0d9a4f7c7da5e14226acf6226b10c3fbc209b3cc5db0171346f',
    '0b83f19af72e9f48745c0590665534e3979e914efc65c1db3a8e0ac68aa4334c',
    '112295381ecfb6e48e908fcf59b4e374c852961327e02f3792935a0622007f6e',
    '2078adf8c87194a670651eeca0feeb52ae159122461356cb25c5943970e86090',
    '2137e71c68a84e9f2e475268bfe2e7aad74a8318b8af22089d7fff5df0eaf637',
    '21e8d3c87d99488debdf7f74f7e2f80027c1a3cb699ccfc680771f684515f4a7',
    '2784474a2650d12d9b5560795c66627a4bf578574c64282118c29d241d86813d',
    '2be8ddc8ffff6e520c8c29e95cdb8f619c0f097d6dc97b2497b184cb9b7002b1',
    '303c7725532910ab5016fdcd30119946fdd82cddcd1669c9c34cd654debdb31a',
    '3e9509d9089ddeace896aa8a451291d48dfa0973fd5b1b44c67590823341e7e8',
    '45ffed136c2e2afa9a59efb80ed97d3fdbd407984bc6df23eecf37e396c82298',
    '48499a5a8a151d714195f2a3028c8ff99a9237fbcc26641bc0c73fc0f8283b3b',
    '49e24ce6b601a7a156e5cd52754e8e2a684f1c2cbde0f7020016851685abcee8',
    '5165b3a903cb9f8679ef44418be208712450b0b0d15ab9d8e85fce41a1628478',
    '67c762ffc807c0cb2aa0e05a9d1fc11303fdaa526b945e6590041819d8d25915',
    '699408b807d0065154f7ebb475b4df0c5c265b9a8bec3232fcf9fe937155954f',
    '72f8c48964bbfc47c32d086e1aba2a63736afe91d348987c9b9a4e7016d05577',
    '7cf35eed850f28393d2dfca26a38fa5b4c596890f2c53b6869a8e66e5948515f',
    '8f4e1758cfbb355cc2ee146af3e884054d7d75b2ae8a4d999d88018d980f8f00',
    '8fe6c5dc94f91f484329270981b59fadda944902ec87777ff0e05a25e0bddcb6',
    '905d132dfa83c81e511dc33e2228237b5b868e439afa312ac6cecfd6747433f1',
    '97141a2def12cd032b016875a88693265796774f87c9a873b1f3f83840781e25',
    '9f6b7ef6d437b194b28985492bb8828ea07b0ef1131e54c130eb64e1e999639f',
    'a009f6030e39855ea512bf698a56eb4c8f3b7eb64b18003dae3057ead1186309',
    'b6b6606e9161932046dbacc0531f0867cc4178416f245abc574d1c85834f7a25',
    'bca44fead9b0a6ed467b90cfe04ed2539ba84f8e9274b1d6ced0a662ba5a163d',
    'e1a3f056b44f114ee02e973d72f55677a9697fd89580ccfd6b5675a9ffa31ab5',
    'ea59ce8107d99883dcd49e1a3ef746929c11e4dec4a8f843ba43206675fb6ba0',
    'fba5023daba365b10641c593ebca672c5c66dfd125145a5972dc02378abe01b2',
    'fd152c3071d17af5c810f45bcc6eb801febe68e8251cdab7a28ec7b813e34404',
    'fee18b29e4ce68a341bc2fa31f344d8f49a025fdf2857ccf1978efb93fc507e2'
  ]
} as const;
