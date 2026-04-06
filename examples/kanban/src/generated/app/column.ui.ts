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
    <div class="column" data-column-id="${column.id}" data-order="${column.order_index}">
      <div class="column-header">
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
  `;
}

export function renderColumnList(columns: Column[], cards: Card[]): string {
  return columns
    .sort((a, b) => a.order_index - b.order_index)
    .map(col => renderColumn(col, cards))
    .join('');
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

  // Column drop zones
  document.querySelectorAll('.column').forEach(col => {
    col.addEventListener('dragover', handleColumnDragOver);
    col.addEventListener('dragleave', handleColumnDragLeave);
    col.addEventListener('drop', handleColumnDrop);
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

function handleColumnDragOver(e) {
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';
  this.classList.add('drag-over');
}

function handleColumnDragLeave(e) {
  this.classList.remove('drag-over');
}

function handleColumnDrop(e) {
  e.preventDefault();
  this.classList.remove('drag-over');

  const cardId = e.dataTransfer.getData('text/plain');
  const newColumnId = this.dataset.columnId;

  if (!cardId || !newColumnId) return;

  const card = document.querySelector('[data-card-id="' + cardId + '"]');
  if (!card) return;

  const oldColumnId = card.dataset.columnId;
  if (oldColumnId === newColumnId) return;

  const cardsContainer = this.querySelector('.column-cards');
  const newOrder = cardsContainer.children.length;

  // Optimistic UI update
  cardsContainer.appendChild(card);
  card.dataset.columnId = newColumnId;
  updateColumnCount(oldColumnId);
  updateColumnCount(newColumnId);

  // API call
  fetch('/api/cards/' + cardId + '/move', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ column_id: newColumnId, order_index: newOrder })
  })
  .then(r => {
    if (!r.ok) throw new Error('Move failed');
    return r.json();
  })
  .catch(err => {
    console.error('Move failed:', err);
    // Revert on failure
    const oldContainer = document.querySelector('.column-cards[data-column-id="' + oldColumnId + '"]');
    if (oldContainer) {
      oldContainer.appendChild(card);
      card.dataset.columnId = oldColumnId;
      updateColumnCount(oldColumnId);
      updateColumnCount(newColumnId);
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
