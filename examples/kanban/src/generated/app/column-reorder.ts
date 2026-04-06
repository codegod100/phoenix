// IU-12: Column Reorder System
// Auto-generated from Phoenix plan
// Clean separation - only handles COLUMN drag-and-drop reordering

export const _phoenix = {
  iu_id: 'column-reorder-012',
  name: 'Column Reorder System',
  risk_tier: 'high',
} as const;

// Global state for column dragging
let draggedColumnId: string | null = null;

/**
 * Initialize column reordering system
 */
export function initColumnReorder(): void {
  initColumnHeaderHandlers();
  initDropZones();
}

/**
 * Attach drag handlers to column headers
 */
function initColumnHeaderHandlers(): void {
  document.querySelectorAll<HTMLElement>('.column-header').forEach(header => {
    header.draggable = true;
    header.addEventListener('dragstart', handleColumnDragStart);
    header.addEventListener('dragend', handleColumnDragEnd);
  });
}

/**
 * Initialize or recreate drop zones between columns
 */
export function initDropZones(): void {
  // Remove existing drop zones
  document.querySelectorAll('.column-drop-zone').forEach(zone => zone.remove());

  const board = document.getElementById('board');
  if (!board) return;

  const columns = Array.from(board.querySelectorAll<HTMLElement>('.column'));
  const addBtn = document.getElementById('add-column-btn');

  // Create drop zone after each column
  columns.forEach((col, index) => {
    const dropZone = document.createElement('div');
    dropZone.className = 'column-drop-zone';
    dropZone.dataset.afterColumn = col.dataset.columnId || '';
    dropZone.dataset.position = String(index + 1);

    dropZone.addEventListener('dragover', handleDropZoneDragOver);
    dropZone.addEventListener('dragleave', handleDropZoneDragLeave);
    dropZone.addEventListener('drop', handleDropZoneDrop);

    // Insert after column, before next element
    const nextElement = col.nextElementSibling;
    if (nextElement && nextElement !== addBtn) {
      board.insertBefore(dropZone, nextElement);
    } else if (addBtn) {
      board.insertBefore(dropZone, addBtn);
    } else {
      board.appendChild(dropZone);
    }
  });

  // Also create a drop zone at the beginning (before first column)
  if (columns.length > 0) {
    const firstDropZone = document.createElement('div');
    firstDropZone.className = 'column-drop-zone';
    firstDropZone.dataset.beforeFirst = 'true';
    firstDropZone.dataset.position = '0';

    firstDropZone.addEventListener('dragover', handleDropZoneDragOver);
    firstDropZone.addEventListener('dragleave', handleDropZoneDragLeave);
    firstDropZone.addEventListener('drop', handleDropZoneDrop);

    const firstColumn = columns[0];
    board.insertBefore(firstDropZone, firstColumn);
  }
}

function handleColumnDragStart(this: HTMLElement, e: DragEvent): void {
  const column = this.closest('.column') as HTMLElement | null;
  if (!column) return;

  draggedColumnId = column.dataset.columnId || null;
  column.classList.add('dragging');

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('column-id', draggedColumnId || '');

  // Show drop zones
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.classList.add('active');
  });
}

function handleColumnDragEnd(this: HTMLElement, e: DragEvent): void {
  const column = this.closest('.column') as HTMLElement | null;
  if (column) column.classList.remove('dragging');

  draggedColumnId = null;

  // Hide drop zones
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.classList.remove('active', 'drag-over');
  });
}

function handleDropZoneDragOver(this: HTMLElement, e: DragEvent): void {
  if (!draggedColumnId) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleDropZoneDragLeave(this: HTMLElement, e: DragEvent): void {
  this.classList.remove('drag-over');
}

function handleDropZoneDrop(this: HTMLElement, e: DragEvent): void {
  e.preventDefault();
  this.classList.remove('drag-over');

  const columnId = e.dataTransfer.getData('column-id');
  if (!columnId) return;

  const column = document.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`);
  if (!column) return;

  // Calculate new position based on drop zone
  const position = parseInt(this.dataset.position || '0', 10);

  // Move column in DOM
  if (this.dataset.beforeFirst === 'true') {
    const board = document.getElementById('board');
    const firstCol = board?.querySelector('.column');
    if (firstCol && board) {
      board.insertBefore(column, firstCol);
    }
  } else {
    const afterColumnId = this.dataset.afterColumn;
    const afterColumn = document.querySelector<HTMLElement>(`[data-column-id="${afterColumnId}"]`);
    if (afterColumn && afterColumn.nextSibling) {
      afterColumn.parentNode?.insertBefore(column, afterColumn.nextSibling);
    }
  }

  // Recreate drop zones and update order
  initDropZones();
  updateColumnOrders();

  // API call
  fetch(`/api/columns/${columnId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_index: position })
  }).catch(err => {
    console.error('Column reorder failed:', err);
  });
}

function updateColumnOrders(): void {
  document.querySelectorAll<HTMLElement>('.column').forEach((col, idx) => {
    col.dataset.order = String(idx);
  });
}
