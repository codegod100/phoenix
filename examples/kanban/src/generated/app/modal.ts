// IU-6: Modal System
// Auto-generated from Phoenix plan

export const _phoenix = {
  iu_id: 'modal-system-006',
  name: 'Modal System',
  risk_tier: 'high',
} as const;

export interface ModalField {
  name: string;
  label: string;
  type: 'text' | 'textarea';
  value?: string;
  placeholder?: string;
}

export interface ModalConfig {
  title: string;
  fields: ModalField[];
  confirmText: string;
  cancelText: string;
  onConfirm: (values: Record<string, string>) => void;
  onCancel?: () => void;
  destructive?: boolean;
}

export function createModalHTML(config: ModalConfig): string {
  const fieldsHTML = config.fields.map(field => {
    const value = field.value || '';
    if (field.type === 'textarea') {
      return `
        <div class="form-group">
          <label class="form-label">${field.label}</label>
          <textarea 
            name="${field.name}" 
            class="form-input form-textarea" 
            placeholder="${field.placeholder || ''}"
          >${escapeHtml(value)}</textarea>
        </div>
      `;
    }
    return `
      <div class="form-group">
        <label class="form-label">${field.label}</label>
        <input 
          type="text" 
          name="${field.name}" 
          class="form-input" 
          value="${escapeHtml(value)}"
          placeholder="${field.placeholder || ''}"
        />
      </div>
    `;
  }).join('');

  const confirmBtnClass = config.destructive ? 'btn-destructive' : 'btn-primary';

  return `
    <div class="modal-backdrop" id="modal-backdrop">
      <div class="modal">
        <div class="modal-header">
          <span class="modal-title">${escapeHtml(config.title)}</span>
          <button class="btn btn-ghost" id="modal-close">✕</button>
        </div>
        <div class="modal-body">
          ${fieldsHTML}
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" id="modal-cancel">${escapeHtml(config.cancelText)}</button>
          <button class="btn ${confirmBtnClass}" id="modal-confirm">${escapeHtml(config.confirmText)}</button>
        </div>
      </div>
    </div>
  `;
}

export function mountModal(config: ModalConfig): () => void {
  // Remove any existing modal
  closeModal();

  // Insert modal HTML
  const modalHTML = createModalHTML(config);
  const container = document.createElement('div');
  container.id = 'modal-container';
  container.innerHTML = modalHTML;
  document.body.appendChild(container);

  // Focus first input and position cursor at end
  const firstInput = container.querySelector('input, textarea') as HTMLInputElement | HTMLTextAreaElement;
  if (firstInput) {
    firstInput.focus();
    if (firstInput.value) {
      const len = firstInput.value.length;
      firstInput.setSelectionRange(len, len);
    }
  }

  // Event handlers
  const backdrop = container.querySelector('#modal-backdrop') as HTMLElement;
  const closeBtn = container.querySelector('#modal-close') as HTMLButtonElement;
  const cancelBtn = container.querySelector('#modal-cancel') as HTMLButtonElement;
  const confirmBtn = container.querySelector('#modal-confirm') as HTMLButtonElement;

  const handleClose = () => {
    closeModal();
    config.onCancel?.();
  };

  const handleConfirm = () => {
    const values: Record<string, string> = {};
    config.fields.forEach(field => {
      const input = container.querySelector(`[name="${field.name}"]`) as HTMLInputElement | HTMLTextAreaElement;
      values[field.name] = input?.value || '';
    });
    closeModal();
    config.onConfirm(values);
  };

  const handleKeydown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      handleClose();
    } else if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault();
      handleConfirm();
    }
  };

  // Attach event listeners
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) handleClose();
  });
  closeBtn.addEventListener('click', handleClose);
  cancelBtn.addEventListener('click', handleClose);
  confirmBtn.addEventListener('click', handleConfirm);
  document.addEventListener('keydown', handleKeydown);

  // Return cleanup function
  return () => {
    document.removeEventListener('keydown', handleKeydown);
  };
}

export function closeModal(): void {
  const existing = document.getElementById('modal-container');
  if (existing) {
    existing.remove();
  }
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
