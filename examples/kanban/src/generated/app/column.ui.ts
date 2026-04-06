// IU-8: Column UI Components
// Auto-generated from Phoenix plan

import type { Column, Card } from './models.js';
import { renderCardList, CARD_JS } from './card.ui.js';

export const _phoenix = {
  iu_id: 'column-ui-008',
  name: 'Column UI Components',
  risk_tier: 'high',
} as const;

export function renderColumn(column: Column, cards: Card[]): string {
  const cardsHTML = renderCardList(cards.filter(c => c.column_id === column.id));

  return `
    <div class="column" draggable="true" data-column-id="${column.id}" data-order="${column.order_index}">
      <div class="column-header" draggable="true" data-column-drag-handle="${column.id}">
        <span class="column-title">${escapeHtml(column.name)}</span>
        <div class="column-actions">
          <button class="btn btn-icon btn-edit" data-action="edit-col" data-column-id="${column.id}" title="Edit">✏️</button>
          <button class="btn btn-icon btn-delete" data-action="delete-col" data-column-id="${column.id}" title="Delete">🗑️</button>
        </div>
        <span class="column-count" id="count-${column.id}">${cards.length}</span>
      </div>
      <div class="column-cards" data-column-id="${column.id}">
        ${cardsHTML}
      </div>
      <div class="column-footer">
        <button class="btn btn-secondary" style="width:100%" data-action="add-card" data-column-id="${column.id}">+ Add Card</button>
      </div>
    </div>
    <div class="column-drop-zone" data-drop-zone="${column.id}"></div>
  `;
}

export function renderColumnList(columns: Column[], cards: Card[]): string {
  const sortedColumns = columns.sort((a, b) => a.order_index - b.order_index);
  let html = '<div class="columns-container">';
  for (const col of sortedColumns) {
    html += renderColumn(col, cards);
  }
  html += '</div>';
  return html;
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Client-side JavaScript for column interactions
export const COLUMN_JS = `
function initColumnHandlers() {
  // Column edit buttons
  document.querySelectorAll('[data-action="edit-col"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openColumnEditModal(btn.dataset.columnId);
    });
  });

  // Column delete buttons
  document.querySelectorAll('[data-action="delete-col"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openColumnDeleteModal(btn.dataset.columnId);
    });
  });

  // Add card buttons
  document.querySelectorAll('[data-action="add-card"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openAddCardModal(btn.dataset.columnId);
    });
  });

  // Column drag handles (header)
  document.querySelectorAll('[data-column-drag-handle]').forEach(header => {
    header.addEventListener('dragstart', handleColumnDragStart);
    header.addEventListener('dragend', handleColumnDragEnd);
  });

  // Column drop zones (between columns)
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.addEventListener('dragover', handleColumnDropOver);
    zone.addEventListener('dragleave', handleColumnDropLeave);
    zone.addEventListener('drop', handleColumnDrop);
  });

  // Card drop zones (for card drag-and-drop)
  document.querySelectorAll('.column').forEach(col => {
    col.addEventListener('dragover', handleColumnDragOver);
    col.addEventListener('dragleave', handleColumnDragLeave);
    col.addEventListener('drop', handleColumnCardDrop);
  });
}

let draggedColumnId = null;

function handleColumnDragStart(e) {
  draggedColumnId = this.dataset.columnDragHandle;
  const column = document.querySelector('[data-column-id="' + draggedColumnId + '"]');
  if (column) column.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('column-id', draggedColumnId);
  
  // Show drop zones between columns
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.classList.add('active');
  });
}

function handleColumnDragEnd(e) {
  const column = document.querySelector('[data-column-id="' + draggedColumnId + '"]');
  if (column) column.classList.remove('dragging');
  draggedColumnId = null;
  
  // Hide drop zones
  document.querySelectorAll('.column-drop-zone').forEach(zone => {
    zone.classList.remove('active', 'drag-over');
  });
}

function handleColumnDropOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleColumnDropLeave(e) {
  this.classList.remove('drag-over');
}

function handleColumnDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');
  
  const columnId = e.dataTransfer.getData('column-id');
  const dropZoneId = this.dataset.dropZone;
  
  if (!columnId || columnId === dropZoneId) return;
  
  const column = document.querySelector('[data-column-id="' + columnId + '"]');
  if (!column) return;
  
  // Calculate new order position
  const allColumns = Array.from(document.querySelectorAll('.column'));
  const dropZone = this;
  let newIndex = allColumns.findIndex(col => col.dataset.columnId === dropZoneId);
  const oldIndex = allColumns.findIndex(col => col.dataset.columnId === columnId);
  
  if (oldIndex < newIndex) {
    newIndex--; // Adjust because we're moving from before
  }
  newIndex = Math.max(0, newIndex);
  
  // Move column in DOM
  if (newIndex === 0) {
    const firstColumn = document.querySelector('.column');
    if (firstColumn && firstColumn !== column) {
      firstColumn.parentNode.insertBefore(column, firstColumn);
    }
  } else {
    const targetColumn = allColumns[newIndex];
    if (targetColumn && targetColumn !== column) {
      targetColumn.parentNode.insertBefore(column, targetColumn.nextSibling);
    }
  }
  
  // Update all order indexes
  document.querySelectorAll('.column').forEach((col, idx) => {
    col.dataset.order = idx;
  });
  
  // Call API
  fetch('/api/columns/' + columnId + '/move', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ order_index: newIndex })
  }).catch(err => {
    console.error('Column move failed:', err);
    // Revert would require page reload or tracking original positions
  });
}

function openColumnEditModal(columnId) {
  const col = document.querySelector('[data-column-id="' + columnId + '"]');
  const name = col.querySelector('.column-title').textContent;

  mountModal({
    title: 'Rename Column',
    fields: [
      { name: 'name', label: 'Column Name', type: 'text', value: name }
    ],
    confirmText: 'Save',
    cancelText: 'Cancel',
    onConfirm: (values) => {
      fetch('/api/columns/' + columnId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      .then(r => r.json())
      .then(updated => {
        updateColumnName(columnId, updated.name);
      });
    }
  });
}

function openColumnDeleteModal(columnId) {
  mountModal({
    title: 'Delete Column?',
    fields: [],
    confirmText: 'Delete',
    cancelText: 'Cancel',
    destructive: true,
    onConfirm: () => {
      fetch('/api/columns/' + columnId, { method: 'DELETE' })
        .then(() => {
          removeColumnFromDOM(columnId);
        });
    }
  });
}

function openAddCardModal(columnId) {
  mountModal({
    title: 'Add Card',
    fields: [
      { name: 'title', label: 'Title', type: 'text' },
      { name: 'description', label: 'Description (optional)', type: 'textarea' }
    ],
    confirmText: 'Add',
    cancelText: 'Cancel',
    onConfirm: (values) => {
      fetch('/api/cards', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: values.title,
          description: values.description || null,
          column_id: columnId
        })
      })
      .then(r => r.json())
      .then(card => {
        addCardToColumn(columnId, card);
      });
    }
  });
}

function updateColumnName(columnId, name) {
  const col = document.querySelector('[data-column-id="' + columnId + '"]');
  if (col) {
    col.querySelector('.column-title').textContent = name;
  }
}

function removeColumnFromDOM(columnId) {
  const col = document.querySelector('[data-column-id="' + columnId + '"]');
  if (col) col.remove();
}

function addCardToColumn(columnId, card) {
  const cardsContainer = document.querySelector('.column-cards[data-column-id="' + columnId + '"]');
  if (!cardsContainer) return;

  const cardHTML = createCardHTML(card);
  cardsContainer.insertAdjacentHTML('beforeend', cardHTML);

  const newCard = cardsContainer.lastElementChild;
  attachCardHandlers(newCard);

  updateColumnCount(columnId);
}

function createCardHTML(card) {
  const descHtml = card.description ? linkifyClient(card.description) : '';
  return \`
    <div class="card" draggable="true" data-card-id="\${card.id}" data-column-id="\${card.column_id}">
      <div class="card-actions">
        <button class="btn btn-icon btn-edit" data-action="edit" data-card-id="\${card.id}" title="Edit">✏️</button>
        <button class="btn btn-icon btn-delete" data-action="delete" data-card-id="\${card.id}" title="Delete">🗑️</button>
      </div>
      <div class="card-title">\${escapeHtml(card.title)}</div>
      \${descHtml ? \`<div class="card-description">\${descHtml}</div>\` : ''}
    </div>
  \`;
}

function updateColumnCount(columnId) {
  const col = document.querySelector('[data-column-id="' + columnId + '"]');
  if (!col) return;

  const count = col.querySelectorAll('.card').length;
  const badge = document.getElementById('count-' + columnId);
  if (badge) badge.textContent = count;
}

// Card drag-and-drop handlers (for dropping on columns)
function handleColumnDragOver(e) {
  // Only allow card drops, not column drops
  if (!e.dataTransfer.getData('text/plain')) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleColumnDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleColumnCardDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');

  const cardId = e.dataTransfer.getData('text/plain');
  const targetColumnId = this.dataset.columnId;

  if (!cardId || !targetColumnId) return;

  const card = document.querySelector('[data-card-id="' + cardId + '"]');
  if (!card) return;

  const sourceColumnId = card.dataset.columnId;
  if (sourceColumnId === targetColumnId) return;

  const cardsContainer = this.querySelector('.column-cards');
  const newOrder = cardsContainer.children.length;

  // Optimistic update
  cardsContainer.appendChild(card);
  card.dataset.columnId = targetColumnId;
  updateColumnCount(sourceColumnId);
  updateColumnCount(targetColumnId);

  // API call
  fetch('/api/cards/' + cardId + '/move', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      column_id: targetColumnId,
      order_index: newOrder
    })
  }).catch(err => {
    console.error('Card move failed:', err);
    // Revert
    const oldContainer = document.querySelector('.column-cards[data-column-id="' + sourceColumnId + '"]');
    if (oldContainer) {
      oldContainer.appendChild(card);
      card.dataset.columnId = sourceColumnId;
      updateColumnCount(sourceColumnId);
      updateColumnCount(targetColumnId);
    }
  });
}

function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
`;
