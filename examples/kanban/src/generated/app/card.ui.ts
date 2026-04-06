// IU-9: Card UI Components
// Auto-generated from Phoenix plan

import { linkify } from './linkify.js';
import type { Card } from './models.js';

export const _phoenix = {
  iu_id: 'card-ui-009',
  name: 'Card UI Components',
  risk_tier: 'high',
} as const;

export function renderCard(card: Card): string {
  const linkifiedDesc = card.description ? linkify(card.description) : '';

  return `
    <div class="card" draggable="true" data-card-id="${card.id}" data-column-id="${card.column_id}">
      <div class="card-actions">
        <button class="btn btn-icon btn-edit" data-action="edit" data-card-id="${card.id}" title="Edit">✏️</button>
        <button class="btn btn-icon btn-delete" data-action="delete" data-card-id="${card.id}" title="Delete">🗑️</button>
      </div>
      <div class="card-title">${escapeHtml(card.title)}</div>
      ${linkifiedDesc ? `<div class="card-description">${linkifiedDesc}</div>` : ''}
    </div>
  `;
}

export function renderCardList(cards: Card[]): string {
  return cards.map(card => renderCard(card)).join('');
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// Client-side JavaScript for card interactions
export const CARD_JS = `
// Global dragged card reference
let draggedCard = null;

function initCardHandlers() {
  document.querySelectorAll('.card').forEach(card => {
    attachCardHandlers(card);
  });
}

function attachCardHandlers(card) {
  // Drag events
  card.addEventListener('dragstart', handleDragStart);
  card.addEventListener('dragend', handleDragEnd);

  // Edit button
  const editBtn = card.querySelector('[data-action="edit"]');
  if (editBtn) {
    editBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCardEditModal(card.dataset.cardId);
    });
  }

  // Delete button
  const deleteBtn = card.querySelector('[data-action="delete"]');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      openCardDeleteModal(card.dataset.cardId);
    });
  }
}

function handleDragStart(e) {
  draggedCard = this;
  this.classList.add('dragging');
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', this.dataset.cardId);
}

function handleDragEnd(e) {
  this.classList.remove('dragging');
  draggedCard = null;
  document.querySelectorAll('.column').forEach(col => {
    col.classList.remove('drag-over');
  });
}

function openCardEditModal(cardId) {
  const card = document.querySelector('[data-card-id="' + cardId + '"]');
  const title = card.querySelector('.card-title').textContent;
  const descEl = card.querySelector('.card-description');
  const description = descEl ? descEl.textContent : '';

  mountModal({
    title: 'Edit Card',
    fields: [
      { name: 'title', label: 'Title', type: 'text', value: title },
      { name: 'description', label: 'Description', type: 'textarea', value: description }
    ],
    confirmText: 'Save',
    cancelText: 'Cancel',
    onConfirm: (values) => {
      fetch('/api/cards/' + cardId, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values)
      })
      .then(r => r.json())
      .then(updated => {
        updateCardInDOM(updated);
      });
    }
  });
}

function openCardDeleteModal(cardId) {
  mountModal({
    title: 'Delete Card?',
    fields: [],
    confirmText: 'Delete',
    cancelText: 'Cancel',
    destructive: true,
    onConfirm: () => {
      fetch('/api/cards/' + cardId, { method: 'DELETE' })
        .then(() => {
          removeCardFromDOM(cardId);
        });
    }
  });
}

function updateCardInDOM(card) {
  const el = document.querySelector('[data-card-id="' + card.id + '"]');
  if (!el) return;

  const descHtml = card.description ? linkifyClient(card.description) : '';
  el.querySelector('.card-title').textContent = card.title;
  const descEl = el.querySelector('.card-description');
  if (descHtml) {
    if (descEl) {
      descEl.innerHTML = descHtml;
    } else {
      const newDesc = document.createElement('div');
      newDesc.className = 'card-description';
      newDesc.innerHTML = descHtml;
      el.appendChild(newDesc);
    }
  } else if (descEl) {
    descEl.remove();
  }
}

function removeCardFromDOM(cardId) {
  const el = document.querySelector('[data-card-id="' + cardId + '"]');
  if (el) {
    const columnId = el.dataset.columnId;
    el.remove();
    updateColumnCount(columnId);
  }
}

// Client-side linkify
function linkifyClient(text) {
  if (!text) return '';
  const regex = new RegExp('https?://[^\\\\s<\\\\n\\\\r]+', 'gi');
  return text.split('\\n').map(function(line) {
    return line.replace(regex, function(url) {
      const cleanUrl = url.replace(/&amp;/g, '&');
      return '<a href="' + cleanUrl + '" target="_blank" rel="noopener">' + cleanUrl + '</a>';
    });
  }).join('\\n');
}
`;
