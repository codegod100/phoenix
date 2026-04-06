// IU-12: Column Reorder System
// Auto-generated from Phoenix plan
// Smart drop zones: only on edges NOT touching the dragged column

export const _phoenix = {
  iu_id: 'column-reorder-012',
  name: 'Column Reorder System',
  risk_tier: 'high',
} as const;

let draggedColumnId: string | null = null;
let draggedColumnIndex: number = -1;

/**
 * Initialize column reordering system
 */
export function initColumnReorder(): void {
  initColumnHeaderHandlers();
  initDropZones(); // Create all zones initially (hidden)
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
 * Create all drop zones, but only activate non-touching ones during drag
 */
function initDropZones(): void {
  // Remove existing
  document.querySelectorAll('.column-drop-zone').forEach(zone => zone.remove());

  const board = document.getElementById('board');
  if (!board) return;

  const columns = Array.from(board.querySelectorAll<HTMLElement>('.column'));
  if (columns.length <= 1) return; // No reordering possible with 0-1 columns

  const addBtn = document.getElementById('add-column-btn');

  // Create zones at every edge position
  // Position 0 = before first column
  // Position N = after column N-1
  const zones: { element: HTMLElement; position: number }[] = [];

  // Zone 0: before first column
  const zone0 = document.createElement('div');
  zone0.className = 'column-drop-zone';
  zone0.dataset.position = '0';
  zone0.addEventListener('dragover', handleDropZoneDragOver);
  zone0.addEventListener('dragleave', handleDropZoneDragLeave);
  zone0.addEventListener('drop', handleDropZoneDrop);
  board.insertBefore(zone0, columns[0]);
  zones.push({ element: zone0, position: 0 });

  // Zones 1..N: after each column
  columns.forEach((col, index) => {
    const zone = document.createElement('div');
    zone.className = 'column-drop-zone';
    zone.dataset.position = String(index + 1);
    zone.addEventListener('dragover', handleDropZoneDragOver);
    zone.addEventListener('dragleave', handleDropZoneDragLeave);
    zone.addEventListener('drop', handleDropZoneDrop);

    const nextEl = col.nextElementSibling;
    if (nextEl && nextEl.id !== 'add-column-btn') {
      board.insertBefore(zone, nextEl);
    } else if (addBtn) {
      board.insertBefore(zone, addBtn);
    } else {
      board.appendChild(zone);
    }
    zones.push({ element: zone, position: index + 1 });
  });

  return zones;
}

function handleColumnDragStart(this: HTMLElement, e: DragEvent): void {
  const column = this.closest('.column') as HTMLElement | null;
  if (!column) return;

  draggedColumnId = column.dataset.columnId || null;
  column.classList.add('dragging');

  // Calculate index of dragged column
  const columns = Array.from(document.querySelectorAll<HTMLElement>('.column'));
  draggedColumnIndex = columns.findIndex(col => col.dataset.columnId === draggedColumnId);

  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('column-id', draggedColumnId || '');

  // Activate only zones NOT touching the dragged column
  // If dragging column at index i, zones at position i and i+1 touch it
  document.querySelectorAll<HTMLElement>('.column-drop-zone').forEach(zone => {
    const position = parseInt(zone.dataset.position || '0', 10);

    // A zone touches the dragged column if:
    // - position == draggedColumnIndex (zone before the column)
    // - position == draggedColumnIndex + 1 (zone after the column)
    const touchesDraggedColumn = position === draggedColumnIndex || position === draggedColumnIndex + 1;

    if (!touchesDraggedColumn) {
      zone.classList.add('active');
    }
  });
}

function handleColumnDragEnd(this: HTMLElement, e: DragEvent): void {
  const column = this.closest('.column') as HTMLElement | null;
  if (column) column.classList.remove('dragging');

  draggedColumnId = null;
  draggedColumnIndex = -1;

  // Hide all drop zones
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.classList.remove('active', 'drag-over');
  });
}

function handleDropZoneDragOver(this: HTMLElement, e: DragEvent): void {
  if (!draggedColumnId) return;

  // Only allow drop on active zones
  if (!this.classList.contains('active')) return;

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

  // Only allow drop on active zones
  if (!this.classList.contains('active')) return;

  const columnId = e.dataTransfer.getData('column-id');
  if (!columnId) return;

  const column = document.querySelector<HTMLElement>(`[data-column-id="${columnId}"]`);
  if (!column) return;

  const insertPosition = parseInt(this.dataset.position || '0', 10);
  const columns = Array.from(document.querySelectorAll<HTMLElement>('.column'));

  // Move column in DOM
  if (insertPosition === 0) {
    // Move to beginning
    const board = document.getElementById('board');
    const firstCol = board?.querySelector('.column');
    if (firstCol && board) {
      board.insertBefore(column, firstCol);
    }
  } else {
    // Find the column that's currently at position insertPosition - 1
    // We need to insert after it
    const targetCol = columns[insertPosition - 1];
    if (targetCol && targetCol !== column && targetCol.nextSibling) {
      targetCol.parentNode?.insertBefore(column, targetCol.nextSibling);
    }
  }

  // Recreate drop zones (they got messed up by DOM reorder)
  initDropZones();

  // API call
  fetch(`/api/columns/${columnId}/move`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_index: insertPosition })
  }).catch(err => {
    console.error('Column reorder failed:', err);
  });
}
