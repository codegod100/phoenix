// CONTRACT: Cards UI IU - Display and interaction for cards
// INVARIANT: Cards show title and optional description
// INVARIANT: Inline editing: click card title to edit
// INVARIANT: Drag-and-drop cards between columns
// INVARIANT: Card max-height 200px with scroll for long descriptions

export type CardProps = {
  id: number;
  title: string;
  description: string | null;
  onEdit: (id: number, title: string, description: string | null) => void;
  onDelete: (id: number) => void;
};

export function renderCard(props: CardProps): string {
  const { id, title, description } = props;
  
  return `
    <div class="card" data-card-id="${id}" draggable="true">
      <div class="card-title" onclick="editCard(${id})">${escapeHtml(title)}</div>
      ${description ? `<div class="card-desc">${escapeHtml(description)}</div>` : ''}
      <button class="card-delete" onclick="deleteCard(${id})">×</button>
    </div>
  `;
}

export function renderCardEdit(id: number, title: string, description: string | null): string {
  return `
    <div class="card card-editing" data-card-id="${id}">
      <input type="text" class="card-title-input" value="${escapeHtml(title)}" 
             maxlength="200" placeholder="Card title" />
      <textarea class="card-desc-input" placeholder="Description (optional)" 
                maxlength="1000">${description ? escapeHtml(description) : ''}</textarea>
      <div class="card-actions">
        <button onclick="saveCardEdit(${id})">Save</button>
        <button onclick="cancelCardEdit(${id})">Cancel</button>
      </div>
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

// CSS for cards - Dark theme: bg #1e1e2e, cards #313244, accents #89b4fa
export const cardsStyles = `
.card {
  background: #313244;
  border-radius: 6px;
  padding: 12px;
  margin-bottom: 8px;
  cursor: grab;
  position: relative;
  max-height: 200px;
  overflow-y: auto;
}

.card.dragging {
  opacity: 0.5;
  cursor: grabbing;
}

.card-title {
  font-weight: 500;
  color: #cdd6f4;
  cursor: text;
  word-break: break-word;
}

.card-title:hover {
  background: rgba(137, 180, 250, 0.1);
  border-radius: 3px;
}

.card-desc {
  color: #a6adc8;
  font-size: 0.9em;
  margin-top: 6px;
  word-break: break-word;
}

.card-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  background: transparent;
  border: none;
  color: #f38ba8;
  cursor: pointer;
  opacity: 0;
  transition: opacity 0.2s;
}

.card:hover .card-delete {
  opacity: 1;
}

.card-title-input, .card-desc-input {
  width: 100%;
  background: #1e1e2e;
  border: 1px solid #89b4fa;
  border-radius: 4px;
  padding: 6px;
  color: #cdd6f4;
  font-family: inherit;
  box-sizing: border-box;
}

.card-title-input {
  font-weight: 500;
  margin-bottom: 6px;
}

.card-desc-input {
  resize: vertical;
  min-height: 60px;
  max-height: 120px;
}

.card-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
}

.card-actions button {
  padding: 4px 12px;
  border-radius: 4px;
  border: none;
  cursor: pointer;
}

.card-actions button:first-child {
  background: #89b4fa;
  color: #1e1e2e;
}

.card-actions button:last-child {
  background: #313244;
  color: #cdd6f4;
}
`;

export const _phoenix = {
  iu_id: '860b6c52862e00771c7d2556da143ca8e953766bd26cf246d1d4feda7c4e8093',
  name: 'Cards',
  risk_tier: 'medium',
  canon_ids: []
} as const;
