// IU-7: Board UI
// Auto-generated from Phoenix plan

import type { Column, Card, Board } from './models.js';
import { renderColumnList, COLUMN_JS } from './column.ui.js';
import { CARD_JS } from './card.ui.js';

export const _phoenix = {
  iu_id: 'board-ui-007',
  name: 'Board UI',
  risk_tier: 'high',
} as const;

export function renderBoard(columns: Column[], cards: Card[]): string {
  const columnsHTML = renderColumnList(columns, cards);

  return `
    <div id="board">
      ${columnsHTML}
      <button class="add-column-btn" id="add-column-btn">+ Add Column</button>
    </div>
  `;
}

// Client-side JavaScript for board-level interactions
export const BOARD_JS = `
function initBoardHandlers() {
  // Add column button
  const addColBtn = document.getElementById('add-column-btn');
  if (addColBtn) {
    addColBtn.addEventListener('click', openAddColumnModal);
  }
}

function openAddColumnModal() {
  mountModal({
    title: 'Add Column',
    fields: [
      { name: 'name', label: 'Column Name', type: 'text' }
    ],
    confirmText: 'Add',
    cancelText: 'Cancel',
    onConfirm: (values) => {
      fetch('/api/columns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      .then(r => r.json())
      .then(column => {
        addColumnToDOM(column);
      });
    }
  });
}

function addColumnToDOM(column) {
  const board = document.getElementById('board');
  const addBtn = document.getElementById('add-column-btn');

  const colHTML = createColumnHTML(column);
  addBtn.insertAdjacentHTML('beforebegin', colHTML);

  const newCol = addBtn.previousElementSibling;
  initColumnHandlersForElement(newCol);
}

function createColumnHTML(column) {
  return \`
    <div class="column" data-column-id="\${column.id}" data-order="\${column.order_index}">
      <div class="column-header">
        <span class="column-title">\${escapeHtml(column.name)}</span>
        <div class="column-actions">
          <button class="btn btn-icon btn-edit" data-action="edit-col" data-column-id="\${column.id}" title="Edit">✏️</button>
          <button class="btn btn-icon btn-delete" data-action="delete-col" data-column-id="\${column.id}" title="Delete">🗑️</button>
        </div>
        <span class="column-count" id="count-\${column.id}">0</span>
      </div>
      <div class="column-cards" data-column-id="\${column.id}"></div>
      <div class="column-footer">
        <button class="btn btn-secondary" style="width:100%" data-action="add-card" data-column-id="\${column.id}">+ Add Card</button>
      </div>
    </div>
  \`;
}

function initColumnHandlersForElement(col) {
  // Edit button
  const editBtn = col.querySelector('[data-action="edit-col"]');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openColumnEditModal(editBtn.dataset.columnId);
    });
  }

  // Delete button
  const deleteBtn = col.querySelector('[data-action="delete-col"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openColumnDeleteModal(deleteBtn.dataset.columnId);
    });
  }

  // Add card button
  const addBtn = col.querySelector('[data-action="add-card"]');
  if (addBtn) {
    addBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAddCardModal(addBtn.dataset.columnId);
    });
  }

  // Drop zone
  col.addEventListener('dragover', handleColumnDragOver);
  col.addEventListener('dragleave', handleColumnDragLeave);
  col.addEventListener('drop', handleColumnDrop);
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
`;
