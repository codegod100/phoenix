// IU-10: Card Drag and Drop
// Auto-generated from Phoenix plan
// Clean separation - only handles CARD drag-and-drop

export const _phoenix = {
  iu_id: 'card-dragdrop-010',
  name: 'Card Drag and Drop',
  risk_tier: 'high',
} as const;

// Global state for card dragging
export let draggedCardId: string | null = null;
export let draggedSourceColumnId: string | null = null;

/**
 * Initialize card drag and drop handlers
 */
export function initCardDragAndDrop(): void {
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    attachCardDragHandlers(card);
  });

  document.querySelectorAll<HTMLElement>('.column').forEach(column => {
    attachColumnDropHandlers(column);
  });
}

/**
 * Attach drag handlers to a card element
 */
export function attachCardDragHandlers(card: HTMLElement): void {
  card.draggable = true;
  card.addEventListener('dragstart', handleCardDragStart);
  card.addEventListener('dragend', handleCardDragEnd);
}

/**
 * Attach drop handlers to a column (for card drops)
 */
export function attachColumnDropHandlers(column: HTMLElement): void {
  column.addEventListener('dragover', handleCardDragOver);
  column.addEventListener('dragleave', handleCardDragLeave);
  column.addEventListener('drop', handleCardDrop);
}

function handleCardDragStart(this: HTMLElement, e: DragEvent): void {
  draggedCardId = this.dataset.cardId || null;
  draggedSourceColumnId = this.dataset.columnId || null;

  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedCardId || '');

  // Visual feedback
  document.querySelectorAll('.column').forEach(col => {
    col.classList.add('drop-ready');
  });
}

function handleCardDragEnd(this: HTMLElement, e: DragEvent): void {
  this.classList.remove('dragging');
  document.querySelectorAll('.column').forEach(col => {
    col.classList.remove('drop-ready', 'drag-over');
  });

  draggedCardId = null;
  draggedSourceColumnId = null;
}

function handleCardDragOver(this: HTMLElement, e: DragEvent): void {
  if (!draggedCardId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleCardDragLeave(this: HTMLElement, e: DragEvent): void {
  this.classList.remove('drag-over');
}

function handleCardDrop(this: HTMLElement, e: DragEvent): void {
  e.preventDefault();
  this.classList.remove('drag-over');

  const cardId = e.dataTransfer.getData('text/plain');
  const targetColumnId = this.dataset.columnId;

  if (!cardId || !targetColumnId) return;

  const card = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
  if (!card) return;

  const sourceColumnId = card.dataset.columnId;
  if (sourceColumnId === targetColumnId) return;

  const cardsContainer = this.querySelector<HTMLElement>('.column-cards');
  if (!cardsContainer) return;

  const newOrder = cardsContainer.children.length;

  // Move card in DOM
  cardsContainer.appendChild(card);
  card.dataset.columnId = targetColumnId;

  // Update counts
  updateColumnCount(sourceColumnId);
  updateColumnCount(targetColumnId);

  // API call
  fetch(`/api/cards/${cardId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      column_id: targetColumnId,
      order_index: newOrder
    })
  }).catch(err => {
    console.error('Card move failed:', err);
    revertCardMove(card, sourceColumnId, targetColumnId);
  });
}

function updateColumnCount(columnId: string | null): void {
  if (!columnId) return;
  const column = document.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`);
  if (!column) return;

  const count = column.querySelectorAll('.card').length;
  const badge = document.getElementById(`count-${columnId}`);
  if (badge) badge.textContent = String(count);
}

function revertCardMove(
  card: HTMLElement,
  originalColumnId: string | null,
  currentColumnId: string | null
): void {
  if (!originalColumnId) return;

  const originalContainer = document.querySelector<HTMLElement>(
    `.column-cards[data-column-id="${originalColumnId}"]`
  );

  if (originalContainer) {
    originalContainer.appendChild(card);
    card.dataset.columnId = originalColumnId;
    updateColumnCount(currentColumnId);
    updateColumnCount(originalColumnId);
  }
}
