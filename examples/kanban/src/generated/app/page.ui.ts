// IU-11: Main UI Page
// Auto-generated from Phoenix plan
// Delegates all functionality to specialized IUs

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
    // ==========================================
    // IU-6: Modal System (inline for self-contained page)
    // ==========================================
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
          firstInput.setSelectionRange(firstInput.value.length, firstInput.value.length);
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

    // ==========================================
    // IU-9: Card UI (inline functions)
    // ==========================================
    let draggedCardId = null;
    let draggedSourceColumnId = null;

    function initCardHandlers() {
      document.querySelectorAll('.card').forEach(card => {
        attachCardHandlers(card);
      });
    }

    function attachCardHandlers(card) {
      card.draggable = true;
      card.addEventListener('dragstart', handleCardDragStart);
      card.addEventListener('dragend', handleCardDragEnd);

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

    function handleCardDragStart(e) {
      draggedCardId = this.dataset.cardId;
      draggedSourceColumnId = this.dataset.columnId;
      this.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', draggedCardId);
      document.querySelectorAll('.column').forEach(col => col.classList.add('drop-ready'));
    }

    function handleCardDragEnd(e) {
      this.classList.remove('dragging');
      document.querySelectorAll('.column').forEach(col => col.classList.remove('drop-ready', 'drag-over'));
      draggedCardId = null;
      draggedSourceColumnId = null;
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
              const card = document.querySelector('[data-card-id="' + cardId + '"]');
              if (card) {
                const columnId = card.dataset.columnId;
                card.remove();
                updateColumnCount(columnId);
              }
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

    function updateColumnCount(columnId) {
      const col = document.querySelector('[data-column-id="' + columnId + '"]');
      if (!col) return;
      const count = col.querySelectorAll('.card').length;
      const badge = document.getElementById('count-' + columnId);
      if (badge) badge.textContent = count;
    }

    // ==========================================
    // IU-10: Card Drag and Drop (inline)
    // ==========================================
    function initCardDragAndDrop() {
      document.querySelectorAll('.column').forEach(col => {
        col.addEventListener('dragover', handleColumnCardDragOver);
        col.addEventListener('dragleave', handleColumnCardDragLeave);
        col.addEventListener('drop', handleColumnCardDrop);
      });
    }

    function handleColumnCardDragOver(e) {
      if (!draggedCardId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.classList.add('drag-over');
    }

    function handleColumnCardDragLeave(e) {
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

      cardsContainer.appendChild(card);
      card.dataset.columnId = targetColumnId;
      updateColumnCount(sourceColumnId);
      updateColumnCount(targetColumnId);

      fetch('/api/cards/' + cardId + '/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          column_id: targetColumnId,
          order_index: newOrder
        })
      }).catch(err => {
        console.error('Card move failed:', err);
        const oldContainer = document.querySelector('.column-cards[data-column-id="' + sourceColumnId + '"]');
        if (oldContainer) {
          oldContainer.appendChild(card);
          card.dataset.columnId = sourceColumnId;
          updateColumnCount(sourceColumnId);
          updateColumnCount(targetColumnId);
        }
      });
    }

    // ==========================================
    // IU-8: Column UI (inline)
    // ==========================================
    function initColumnHandlers() {
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
            col.querySelector('.column-title').textContent = updated.name;
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
              const col = document.querySelector('[data-column-id="' + columnId + '"]');
              if (col) {
                col.remove();
                if (typeof initDropZones === 'function') initDropZones();
              }
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
            addCardToColumnInline(columnId, card);
          });
        }
      });
    }

    function addCardToColumnInline(columnId, card) {
      const cardsContainer = document.querySelector('.column-cards[data-column-id="' + columnId + '"]');
      if (!cardsContainer) return;

      const descHtml = card.description ? linkifyClient(card.description) : '';
      const cardHTML = \`
        <div class="card" draggable="true" data-card-id="\${card.id}" data-column-id="\${card.column_id}">
          <div class="card-actions">
            <button class="btn btn-icon btn-edit" data-action="edit" data-card-id="\${card.id}" title="Edit">✏️</button>
            <button class="btn btn-icon btn-delete" data-action="delete" data-card-id="\${card.id}" title="Delete">🗑️</button>
          </div>
          <div class="card-title">\${escapeHtml(card.title)}</div>
          \${descHtml ? \`<div class="card-description">\${descHtml}</div>\` : ''}
        </div>
      \`;

      cardsContainer.insertAdjacentHTML('beforeend', cardHTML);
      attachCardHandlers(cardsContainer.lastElementChild);
      updateColumnCount(columnId);
    }

    // ==========================================
    // IU-12: Column Reorder System (inline)
    // ==========================================
    let draggedColumnId = null;

    function initColumnReorder() {
      document.querySelectorAll('.column-header').forEach(header => {
        header.draggable = true;
        header.addEventListener('dragstart', handleColumnDragStart);
        header.addEventListener('dragend', handleColumnDragEnd);
      });
      initDropZones();
    }

    function initDropZones() {
      document.querySelectorAll('.column-drop-zone').forEach(zone => zone.remove());

      const board = document.getElementById('board');
      if (!board) return;

      const columns = Array.from(board.querySelectorAll('.column'));
      const addBtn = document.getElementById('add-column-btn');

      // Drop zone at beginning
      if (columns.length > 0) {
        const firstZone = document.createElement('div');
        firstZone.className = 'column-drop-zone';
        firstZone.dataset.position = '0';
        firstZone.addEventListener('dragover', handleDropZoneDragOver);
        firstZone.addEventListener('dragleave', handleDropZoneDragLeave);
        firstZone.addEventListener('drop', handleDropZoneDrop);
        board.insertBefore(firstZone, columns[0]);
      }

      // Drop zones after each column
      columns.forEach((col, index) => {
        const dropZone = document.createElement('div');
        dropZone.className = 'column-drop-zone';
        dropZone.dataset.position = String(index + 1);
        dropZone.addEventListener('dragover', handleDropZoneDragOver);
        dropZone.addEventListener('dragleave', handleDropZoneDragLeave);
        dropZone.addEventListener('drop', handleDropZoneDrop);

        const nextEl = col.nextElementSibling;
        if (nextEl && nextEl !== addBtn) {
          board.insertBefore(dropZone, nextEl);
        } else if (addBtn) {
          board.insertBefore(dropZone, addBtn);
        } else {
          board.appendChild(dropZone);
        }
      });
    }

    function handleColumnDragStart(e) {
      const column = this.closest('.column');
      if (!column) return;

      draggedColumnId = column.dataset.columnId;
      column.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('column-id', draggedColumnId);

      document.querySelectorAll('.column-drop-zone').forEach(zone => {
        zone.classList.add('active');
      });
    }

    function handleColumnDragEnd(e) {
      const column = this.closest('.column');
      if (column) column.classList.remove('dragging');
      draggedColumnId = null;

      document.querySelectorAll('.column-drop-zone').forEach(zone => {
        zone.classList.remove('active', 'drag-over');
      });
    }

    function handleDropZoneDragOver(e) {
      if (!draggedColumnId) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      this.classList.add('drag-over');
    }

    function handleDropZoneDragLeave(e) {
      this.classList.remove('drag-over');
    }

    function handleDropZoneDrop(e) {
      e.preventDefault();
      this.classList.remove('drag-over');

      const columnId = e.dataTransfer.getData('column-id');
      if (!columnId) return;

      const column = document.querySelector('[data-column-id="' + columnId + '"]');
      if (!column) return;

      const position = parseInt(this.dataset.position || '0', 10);

      // Move column in DOM
      const board = document.getElementById('board');
      const columns = Array.from(board.querySelectorAll('.column'));

      if (position === 0) {
        board.insertBefore(column, columns[0]);
      } else if (position < columns.length) {
        board.insertBefore(column, columns[position]);
      } else {
        const addBtn = document.getElementById('add-column-btn');
        board.insertBefore(column, addBtn);
      }

      // Recreate drop zones
      initDropZones();

      // API call
      fetch('/api/columns/' + columnId + '/move', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_index: position })
      }).catch(err => console.error('Column reorder failed:', err));
    }

    // ==========================================
    // IU-7: Board UI (inline)
    // ==========================================
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
            addColumnToDOMInline(column);
          });
        }
      });
    }

    function addColumnToDOMInline(column) {
      const board = document.getElementById('board');
      const addBtn = document.getElementById('add-column-btn');

      const colHTML = \`
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

      addBtn.insertAdjacentHTML('beforebegin', colHTML);

      const newCol = addBtn.previousElementSibling;
      const header = newCol.querySelector('.column-header');
      header.draggable = true;
      header.addEventListener('dragstart', handleColumnDragStart);
      header.addEventListener('dragend', handleColumnDragEnd);

      // Attach button handlers
      newCol.querySelector('[data-action="edit-col"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openColumnEditModal(column.id);
      });
      newCol.querySelector('[data-action="delete-col"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openColumnDeleteModal(column.id);
      });
      newCol.querySelector('[data-action="add-card"]')?.addEventListener('click', (e) => {
        e.stopPropagation();
        openAddCardModal(column.id);
      });

      // Attach drop handlers
      newCol.addEventListener('dragover', handleColumnCardDragOver);
      newCol.addEventListener('dragleave', handleColumnCardDragLeave);
      newCol.addEventListener('drop', handleColumnCardDrop);

      // Recreate drop zones
      initDropZones();
    }

    // ==========================================
    // Initialize everything on DOM ready
    // ==========================================
    document.addEventListener('DOMContentLoaded', () => {
      initCardHandlers();
      initCardDragAndDrop();
      initColumnHandlers();
      initColumnReorder();
      initBoardHandlers();
    });
  </script>
</body>
</html>`;
}
