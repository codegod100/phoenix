// IU-11: Main UI Page
// Auto-generated from Phoenix plan

import type { Board } from './models.js';
import { renderBoard, BOARD_JS } from './board.ui.js';
import { COLUMN_JS } from './column.ui.js';
import { CARD_JS } from './card.ui.js';
import { getStyles } from './styles.css.js';

export const _phoenix = {
  iu_id: 'main-page-011',
  name: 'Main UI Page',
  risk_tier: 'high',
} as const;

export function renderPage(board: Board): string {
  const styles = getStyles();
  const boardHTML = renderBoard(board.columns, board.cards);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban Board</title>
  <style>${styles}</style>
</head>
<body>
  ${boardHTML}

  <script>
    // Modal system (inline for self-contained page)
    let modalCleanup = null;

    function mountModal(config) {
      closeModal();

      const fieldsHTML = config.fields.map(field => {
        const value = field.value || '';
        if (field.type === 'textarea') {
          return \`
            <div class="form-group">
              <label class="form-label">\${field.label}</label>
              <textarea 
                name="\${field.name}" 
                class="form-input form-textarea" 
                placeholder="\${field.placeholder || ''}"
              >\${escapeHtml(value)}</textarea>
            </div>
          \`;
        }
        return \`
          <div class="form-group">
            <label class="form-label">\${field.label}</label>
            <input 
              type="text" 
              name="\${field.name}" 
              class="form-input" 
              value="\${escapeHtml(value)}"
              placeholder="\${field.placeholder || ''}"
            />
          </div>
        \`;
      }).join('');

      const confirmBtnClass = config.destructive ? 'btn-destructive' : 'btn-primary';

      const modalHTML = \`
        <div class="modal-backdrop" id="modal-backdrop">
          <div class="modal">
            <div class="modal-header">
              <span class="modal-title">\${escapeHtml(config.title)}</span>
              <button class="btn btn-ghost" id="modal-close">✕</button>
            </div>
            <div class="modal-body">
              \${fieldsHTML}
            </div>
            <div class="modal-footer">
              <button class="btn btn-secondary" id="modal-cancel">\${escapeHtml(config.cancelText)}</button>
              <button class="btn \${confirmBtnClass}" id="modal-confirm">\${escapeHtml(config.confirmText)}</button>
            </div>
          </div>
        </div>
      \`;

      const container = document.createElement('div');
      container.id = 'modal-container';
      container.innerHTML = modalHTML;
      document.body.appendChild(container);

      const firstInput = container.querySelector('input, textarea');
      if (firstInput) {
        firstInput.focus();
        if (firstInput.value) {
          const len = firstInput.value.length;
          firstInput.setSelectionRange(len, len);
        }
      }

      const backdrop = container.querySelector('#modal-backdrop');
      const closeBtn = container.querySelector('#modal-close');
      const cancelBtn = container.querySelector('#modal-cancel');
      const confirmBtn = container.querySelector('#modal-confirm');

      const handleClose = () => {
        closeModal();
        if (config.onCancel) config.onCancel();
      };

      const handleConfirm = () => {
        const values = {};
        config.fields.forEach(field => {
          const input = container.querySelector('[name="' + field.name + '"]');
          values[field.name] = input ? input.value : '';
        });
        closeModal();
        config.onConfirm(values);
      };

      const handleKeydown = (e) => {
        if (e.key === 'Escape') {
          handleClose();
        } else if (e.key === 'Enter' && !(e.target.tagName === 'TEXTAREA')) {
          e.preventDefault();
          handleConfirm();
        }
      };

      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) handleClose();
      });
      closeBtn.addEventListener('click', handleClose);
      cancelBtn.addEventListener('click', handleClose);
      confirmBtn.addEventListener('click', handleConfirm);
      document.addEventListener('keydown', handleKeydown);

      modalCleanup = () => {
        document.removeEventListener('keydown', handleKeydown);
      };
    }

    function closeModal() {
      if (modalCleanup) {
        modalCleanup();
        modalCleanup = null;
      }
      const existing = document.getElementById('modal-container');
      if (existing) existing.remove();
    }

    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Card handlers
    let draggedCard = null;

    function initCardHandlers() {
      document.querySelectorAll('.card').forEach(card => {
        attachCardHandlers(card);
      });
    }

    function attachCardHandlers(card) {
      card.addEventListener('dragstart', handleDragStart);
      card.addEventListener('dragend', handleDragEnd);

      const editBtn = card.querySelector('[data-action="edit"]');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openCardEditModal(card.dataset.cardId);
        });
      }

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
      let descEl = el.querySelector('.card-description');
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

    // Column handlers
    function initColumnHandlers() {
      // Edit/delete/add buttons
      document.querySelectorAll('[data-action="edit-col"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openColumnEditModal(btn.dataset.columnId);
        });
      });

      document.querySelectorAll('[data-action="delete-col"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openColumnDeleteModal(btn.dataset.columnId);
        });
      });

      document.querySelectorAll('[data-action="add-card"]').forEach(btn => {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          openAddCardModal(btn.dataset.columnId);
        });
      });

      // Column drag handlers (header for reordering)
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

      // Card drop handlers on columns
      document.querySelectorAll('.column').forEach(col => {
        col.addEventListener('dragover', handleColumnDragOver);
        col.addEventListener('dragleave', handleColumnDragLeave);
        col.addEventListener('drop', handleColumnCardDrop);
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

    // Card drag-and-drop handlers (on columns)
    function handleColumnDragOver(e) {
      // Only for card drops, not column drops
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
      const newColumnId = this.dataset.columnId;

      if (!cardId || !newColumnId) return;

      const card = document.querySelector('[data-card-id="' + cardId + '"]');
      if (!card) return;

      const oldColumnId = card.dataset.columnId;
      if (oldColumnId === newColumnId) return;

      const cardsContainer = this.querySelector('.column-cards');
      const newOrder = cardsContainer.children.length;

      cardsContainer.appendChild(card);
      card.dataset.columnId = newColumnId;
      updateColumnCount(oldColumnId);
      updateColumnCount(newColumnId);

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
        const oldContainer = document.querySelector('.column-cards[data-column-id="' + oldColumnId + '"]');
        if (oldContainer) {
          oldContainer.appendChild(card);
          card.dataset.columnId = oldColumnId;
          updateColumnCount(oldColumnId);
          updateColumnCount(newColumnId);
        }
      });
    }

    // Column drag-and-drop handlers (reordering)
    let draggedColumnId = null;

    function handleColumnDragStart(e) {
      draggedColumnId = this.dataset.columnDragHandle;
      const column = document.querySelector('[data-column-id="' + draggedColumnId + '"]');
      if (column) column.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('type', 'column');
      e.dataTransfer.setData('column-id', draggedColumnId);

      document.querySelectorAll('.column-drop-zone').forEach(zone => {
        zone.classList.add('active');
      });
    }

    function handleColumnDragEnd(e) {
      const column = document.querySelector('[data-column-id="' + draggedColumnId + '"]');
      if (column) column.classList.remove('dragging');
      draggedColumnId = null;
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

      if (!columnId || !dropZoneId || columnId === dropZoneId) return;

      const column = document.querySelector('[data-column-id="' + columnId + '"]');
      if (!column) return;

      const allColumns = Array.from(document.querySelectorAll('.column'));
      const targetIndex = allColumns.findIndex(col => col.dataset.columnId === dropZoneId);
      const sourceIndex = allColumns.findIndex(col => col.dataset.columnId === columnId);

      if (targetIndex === -1 || sourceIndex === -1) return;

      let newIndex = targetIndex;
      if (sourceIndex < targetIndex) {
        newIndex--;
      }
      newIndex = Math.max(0, newIndex);

      const container = column.parentElement;
      const columns = document.querySelectorAll('.column');
      const targetColumn = columns[newIndex];

      if (targetColumn && targetColumn !== column) {
        container.insertBefore(column, targetColumn.nextSibling);
      }

      // Recreate drop zones
      recreateDropZones();

      document.querySelectorAll('.column').forEach((col, idx) => {
        col.dataset.order = idx;
      });

      fetch('/api/columns/' + columnId + '/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_index: newIndex })
      }).catch(err => {
        console.error('Column move failed:', err);
      });
    }

    function recreateDropZones() {
      const board = document.getElementById('board');
      if (!board) return;

      board.querySelectorAll('.column-drop-zone').forEach(zone => zone.remove());

      const columns = Array.from(board.querySelectorAll('.column'));
      const addBtn = document.getElementById('add-column-btn');

      columns.forEach((col) => {
        const dropZone = document.createElement('div');
        dropZone.className = 'column-drop-zone';
        dropZone.dataset.dropZone = col.dataset.columnId;
        dropZone.addEventListener('dragover', handleColumnDropOver);
        dropZone.addEventListener('dragleave', handleColumnDropLeave);
        dropZone.addEventListener('drop', handleColumnDrop);
        board.insertBefore(dropZone, addBtn);
      });
    }

    // Board handlers
    function initBoardHandlers() {
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
      const editBtn = col.querySelector('[data-action="edit-col"]');
      if (editBtn) {
        editBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openColumnEditModal(editBtn.dataset.columnId);
        });
      }

      const deleteBtn = col.querySelector('[data-action="delete-col"]');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openColumnDeleteModal(deleteBtn.dataset.columnId);
        });
      }

      const addBtn = col.querySelector('[data-action="add-card"]');
      if (addBtn) {
        addBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          openAddCardModal(addBtn.dataset.columnId);
        });
      }

      col.addEventListener('dragover', handleColumnDragOver);
      col.addEventListener('dragleave', handleColumnDragLeave);
      col.addEventListener('drop', handleColumnDrop);
    }

    // Linkify client
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

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      initCardHandlers();
      initColumnHandlers();
      initBoardHandlers();
    });
  </script>
</body>
</html>`;
}
