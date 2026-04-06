// IU-10: Drag and Drop System
// Auto-generated from Phoenix plan

export const _phoenix = {
  iu_id: 'drag-drop-010',
  name: 'Drag and Drop System',
  risk_tier: 'high',
} as const;

// Global dragged item references
export let draggedCardId: string | null = null;
export let draggedSourceColumnId: string | null = null;
export let draggedColumnId: string | null = null;

/**
 * Initialize all drag and drop handlers (cards and columns)
 */
export function initDragAndDrop(): void {
  initCardDragHandlers();
  initColumnDragHandlers();
}

// ==========================================
// CARD DRAG AND DROP
// ==========================================

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
 * Handle drag start on card
 */
function handleCardDragStart(this: HTMLElement, e: DragEvent): void {
  draggedCardId = this.dataset.cardId || null;
  draggedSourceColumnId = this.dataset.columnId || null;

  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', draggedCardId || '');
  e.dataTransfer.setData('type', 'card');

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

  document.querySelectorAll('.column').forEach(col => {
    col.classList.remove('drag-over', 'drop-ready');
  });

  draggedCardId = null;
  draggedSourceColumnId = null;
}

// ==========================================
// COLUMN DRAG AND DROP (REORDERING)
// ==========================================

/**
 * Initialize drag handlers for all column headers
 */
function initColumnDragHandlers(): void {
  document.querySelectorAll<HTMLElement>('[data-column-drag-handle]').forEach(header => {
    attachColumnHeaderDragHandlers(header);
  });

  // Initialize drop zones between columns
  document.querySelectorAll<HTMLElement>('.column-drop-zone').forEach(zone => {
    attachColumnDropZoneHandlers(zone);
  });
}

/**
 * Attach drag handlers to a column header
 */
export function attachColumnHeaderDragHandlers(header: HTMLElement): void {
  header.addEventListener('dragstart', handleColumnDragStart);
  header.addEventListener('dragend', handleColumnDragEnd);
}

/**
 * Attach drop handlers to a column drop zone
 */
export function attachColumnDropZoneHandlers(zone: HTMLElement): void {
  zone.addEventListener('dragover', handleColumnZoneDragOver);
  zone.addEventListener('dragleave', handleColumnZoneDragLeave);
  zone.addEventListener('drop', handleColumnZoneDrop);
}

/**
 * Handle drag start on column header (for column reordering)
 */
function handleColumnDragStart(this: HTMLElement, e: DragEvent): void {
  draggedColumnId = this.dataset.columnDragHandle || null;
  const column = document.querySelector<HTMLElement>(`[data-column-id="${draggedColumnId}"]`);

  if (column) column.classList.add('dragging');

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('type', 'column');
  e.dataTransfer.setData('column-id', draggedColumnId || '');

  // Show drop zones between columns
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.classList.add('active');
  });
}

/**
 * Handle drag end on column header
 */
function handleColumnDragEnd(this: HTMLElement, e: DragEvent): void {
  const column = document.querySelector<HTMLElement>(`[data-column-id="${draggedColumnId}"]`);
  if (column) column.classList.remove('dragging');

  draggedColumnId = null;

  // Hide drop zones
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.classList.remove('active', 'drag-over');
  });
}

/**
 * Handle drag over column drop zone
 */
function handleColumnZoneDragOver(this: HTMLElement, e: DragEvent): void {
  const type = e.dataTransfer.getData('type');
  if (type !== 'column') return;

  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

/**
 * Handle drag leave column drop zone
 */
function handleColumnZoneDragLeave(this: HTMLElement, e: DragEvent): void {
  this.classList.remove('drag-over');
}

/**
 * Handle drop on column drop zone (for column reordering)
 */
function handleColumnZoneDrop(this: HTMLElement, e: DragEvent): void {
  e.preventDefault();
  this.classList.remove('drag-over');

  const columnId = e.dataTransfer.getData('column-id');
  const dropZoneId = this.dataset.dropZone;

  if (!columnId || !dropZoneId || columnId === dropZoneId) return;

  const column = document.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`);
  if (!column) return;

  // Calculate new order position
  const allColumns = Array.from(document.querySelectorAll<HTMLElement>('.column'));
  const targetIndex = allColumns.findIndex(col => col.dataset.columnId === dropZoneId);
  const sourceIndex = allColumns.findIndex(col => col.dataset.columnId === columnId);

  if (targetIndex === -1 || sourceIndex === -1) return;

  let newIndex = targetIndex;
  if (sourceIndex < targetIndex) {
    newIndex--; // Adjust because we're moving from before
  }
  newIndex = Math.max(0, newIndex);

  // Move column in DOM
  const container = column.parentElement;
  const dropZone = this;

  if (newIndex === 0) {
    const firstColumn = document.querySelector('.column');
    if (firstColumn && firstColumn !== column) {
      container?.insertBefore(column, firstColumn);
    }
  } else {
    const columns = document.querySelectorAll('.column');
    const targetColumn = columns[newIndex];
    if (targetColumn && targetColumn !== column) {
      container?.insertBefore(column, targetColumn.nextSibling);
    }
  }

  // Move the drop zone along with the column for correct positioning
  const allDropZones = document.querySelectorAll('.column-drop-zone');
  allDropZones.forEach(zone => zone.remove());

  // Re-create drop zones between columns
  recreateDropZones();

  // Update all order indexes
  document.querySelectorAll('.column').forEach((col, idx) => {
    col.dataset.order = String(idx);
  });

  // Call API to persist
  fetch(`/api/columns/${columnId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_index: newIndex })
  }).catch(err => {
    console.error('Column move failed:', err);
    // Revert on failure would require page reload
  });
}

/**
 * Recreate drop zones between columns
 */
function recreateDropZones(): void {
  const board = document.getElementById('board');
  if (!board) return;

  // Get all columns except the add-column button
  const columns = Array.from(board.querySelectorAll('.column'));

  // Remove existing drop zones
  board.querySelectorAll('.column-drop-zone').forEach(zone => zone.remove());

  // Add drop zones between columns
  columns.forEach((col, index) => {
    const dropZone = document.createElement('div');
    dropZone.className = 'column-drop-zone';
    dropZone.dataset.dropZone = col.dataset.columnId || '';
    attachColumnDropZoneHandlers(dropZone);

    // Insert after each column
    if (col.nextSibling) {
      board.insertBefore(dropZone, col.nextSibling);
    } else {
      board.appendChild(dropZone);
    }
  });
}

// ==========================================
// COLUMN DROP HANDLERS (FOR CARD DROPS)
// ==========================================

/**
 * Initialize drop handlers for all columns (for card drops)
 */
export function initColumnDropHandlers(): void {
  document.querySelectorAll<HTMLElement>('.column').forEach(column => {
    attachColumnDropHandlers(column);
  });
}

/**
 * Attach drop handlers to a column element (for card drops)
 */
export function attachColumnDropHandlers(column: HTMLElement): void {
  column.addEventListener('dragover', handleColumnDragOver);
  column.addEventListener('dragleave', handleColumnDragLeave);
  column.addEventListener('drop', handleColumnCardDrop);
}

/**
 * Handle drag over column (for card drops)
 */
function handleColumnDragOver(this: HTMLElement, e: DragEvent): void {
  // Check if dragging a card (not a column)
  if (e.dataTransfer.types.includes('column-id')) return;

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
 * Handle drop on column (for card drops)
 */
function handleColumnCardDrop(this: HTMLElement, e: DragEvent): void {
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

  const newOrderIndex = cardsContainer.children.length;

  // Optimistic UI update
  cardsContainer.appendChild(card);
  card.dataset.columnId = targetColumnId;

  // Update column counts in real-time
  updateColumnCount(sourceColumnId);
  updateColumnCount(targetColumnId);

  // API call
  fetch(`/api/cards/${cardId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      column_id: targetColumnId,
      order_index: newOrderIndex
    })
  }).catch(error => {
    console.error('Drag and drop failed:', error);
    // Revert on failure
    revertCardMove(card, sourceColumnId, targetColumnId);
  });
}

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

/**
 * Update column count badge in real-time
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

// CSS classes used:
// .dragging - applied to item being dragged
// .drop-ready - applied to columns when drag starts
// .drag-over - applied to drop target
// .column-drop-zone.active - shows drop zone between columns
// .column-drop-zone.drag-over - highlights active drop target
