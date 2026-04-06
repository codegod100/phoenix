// IU-10: Drag and Drop System
// Auto-generated from Phoenix plan

export const _phoenix = {
  iu_id: 'drag-drop-010',
  name: 'Drag and Drop System',
  risk_tier: 'high',
} as const;

// Global dragged card reference - must be set for proper column detection
export let draggedCardId: string | null = null;
export let draggedSourceColumnId: string | null = null;

/**
 * Initialize drag and drop handlers for all cards and columns
 */
export function initDragAndDrop(): void {
  initCardDragHandlers();
  initColumnDropHandlers();
}

/**
 * Attach drag handlers to a card element
 */
export function attachCardDragHandlers(card: HTMLElement): void {
  card.addEventListener('dragstart', handleCardDragStart);
  card.addEventListener('dragend', handleCardDragEnd);
}

/**
 * Initialize drag handlers for all existing cards
 */
function initCardDragHandlers(): void {
  document.querySelectorAll<HTMLElement>('.card').forEach(card => {
    attachCardDragHandlers(card);
  });
}

/**
 * Initialize drop handlers for all columns
 */
function initColumnDropHandlers(): void {
  document.querySelectorAll<HTMLElement>('.column').forEach(column => {
    attachColumnDropHandlers(column);
  });
}

/**
 * Attach drop handlers to a column element
 */
export function attachColumnDropHandlers(column: HTMLElement): void {
  column.addEventListener('dragover', handleColumnDragOver);
  column.addEventListener('dragleave', handleColumnDragLeave);
  column.addEventListener('drop', handleColumnDrop);
}

/**
 * Handle drag start on card
 * Sets global draggedCard variable for proper detection by column handlers
 */
function handleCardDragStart(this: HTMLElement, e: DragEvent): void {
  draggedCardId = this.dataset.cardId || null;
  draggedSourceColumnId = this.dataset.columnId || null;

  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedCardId || '');

  // Visual feedback on all columns
  document.querySelectorAll('.column').forEach(col => {
    col.classList.add('drop-ready');
  });
}

/**
 * Handle drag end on card
 */
function handleCardDragEnd(this: HTMLElement, e: DragEvent): void {
  this.classList.remove('dragging');

  // Clear visual feedback
  document.querySelectorAll('.column').forEach(col => {
    col.classList.remove('drag-over', 'drop-ready');
  });

  draggedCardId = null;
  draggedSourceColumnId = null;
}

/**
 * Handle drag over column
 * Provides visual feedback
 */
function handleColumnDragOver(this: HTMLElement, e: DragEvent): void {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

/**
 * Handle drag leave column
 */
function handleColumnDragLeave(this: HTMLElement, e: DragEvent): void {
  this.classList.remove('drag-over');
}

/**
 * Handle drop on column
 * Calls move API and updates UI dynamically without page reload
 */
function handleColumnDrop(this: HTMLElement, e: DragEvent): void {
  e.preventDefault();
  this.classList.remove('drag-over');

  const cardId = e.dataTransfer.getData('text/plain');
  const targetColumnId = this.dataset.columnId;

  if (!cardId || !targetColumnId) return;

  const card = document.querySelector<HTMLElement>(`[data-card-id="${cardId}"]`);
  if (!card) return;

  const sourceColumnId = card.dataset.columnId;

  // Skip if dropped in same column (no move needed)
  if (sourceColumnId === targetColumnId) return;

  const cardsContainer = this.querySelector<HTMLElement>('.column-cards');
  if (!cardsContainer) return;

  const newOrderIndex = cardsContainer.children.length;

  // Optimistic UI update - move card immediately
  cardsContainer.appendChild(card);
  card.dataset.columnId = targetColumnId;

  // Update column counts in real-time without page reload
  updateColumnCount(sourceColumnId);
  updateColumnCount(targetColumnId);

  // Call API to persist the move
  fetch(`/api/cards/${cardId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      column_id: targetColumnId,
      order_index: newOrderIndex
    })
  })
  .then(response => {
    if (!response.ok) throw new Error('Move failed');
    return response.json();
  })
  .catch(error => {
    console.error('Drag and drop failed:', error);
    // Revert on failure - move card back
    revertCardMove(card, sourceColumnId);
  });
}

/**
 * Update column count badge in real-time
 * When card moved between columns, source count decrements by 1, destination increments by 1
 * When moved within same column (reordering), counts remain unchanged
 */
function updateColumnCount(columnId: string | null): void {
  if (!columnId) return;

  const column = document.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`);
  if (!column) return;

  const cardCount = column.querySelectorAll('.card').length;
  const badge = document.getElementById(`count-${columnId}`);

  if (badge) {
    badge.textContent = String(cardCount);
  }
}

/**
 * Revert a card move on API failure
 */
function revertCardMove(card: HTMLElement, originalColumnId: string | null): void {
  if (!originalColumnId) return;

  const originalContainer = document.querySelector<HTMLElement>(
    `.column-cards[data-column-id="${originalColumnId}"]`
  );

  if (originalContainer) {
    originalContainer.appendChild(card);
    card.dataset.columnId = originalColumnId;

    // Restore counts
    const currentColumnId = card.dataset.columnId;
    if (currentColumnId && currentColumnId !== originalColumnId) {
      updateColumnCount(currentColumnId);
    }
    updateColumnCount(originalColumnId);
  }
}

// CSS classes used (must be defined in styles):
// .dragging - applied to card being dragged
// .drop-ready - applied to columns when drag starts
// .drag-over - applied to column when card is dragged over
