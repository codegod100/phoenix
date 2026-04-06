// CONTRACT: UI IU - Main UI shell and page structure
// INVARIANT: Display board as horizontal row of columns
// INVARIANT: Use styled modal dialogs for card creation, editing, and deletion
// INVARIANT: Do not use browser native alert() or prompt()
// INVARIANT: Dark theme: bg #1e1e2e

import type { Board } from './api.js';
import { renderBoard, boardStyles } from './board.ui.js';
import { cardsStyles } from './cards.ui.js';
import { designSystemStyles } from './design-system.ui.js';

export function renderPage(board: Board): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kanban Board</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #1e1e2e;
      color: #cdd6f4;
    }
    ${boardStyles}
    ${cardsStyles}
    ${designSystemStyles}
  </style>
</head>
<body>
  ${renderBoard(board)}
  
  <div id="modal-root"></div>
  
  <script>
    // Modal state and functions
    let currentModalConfig = null;
    
    function showModal(config) {
      currentModalConfig = config;
      const root = document.getElementById('modal-root');
      root.innerHTML = renderModalHTML(config);
      
      // Focus first input if exists
      const firstInput = root.querySelector('input, textarea');
      if (firstInput) firstInput.focus();
      
      // ESC key handler
      document.addEventListener('keydown', handleModalKeydown);
    }
    
    function closeModal() {
      document.getElementById('modal-root').innerHTML = '';
      currentModalConfig = null;
      document.removeEventListener('keydown', handleModalKeydown);
    }
    
    function handleModalKeydown(e) {
      if (e.key === 'Escape') {
        closeModal();
      }
    }
    
    function modalPrimaryAction() {
      if (currentModalConfig?.onPrimary) {
        currentModalConfig.onPrimary();
      }
    }
    
    function modalSecondaryAction() {
      if (currentModalConfig?.onSecondary) {
        currentModalConfig.onSecondary();
      }
      closeModal();
    }
    
    function renderModalHTML(config) {
      const primaryBtn = config.primaryLabel ? 
        '<button class="btn ' + (config.primaryVariant === 'destructive' ? 'btn-destructive' : 'btn-primary') + 
        '" onclick="modalPrimaryAction()">' + escapeHtml(config.primaryLabel) + '</button>' : '';
      
      const secondaryBtn = config.secondaryLabel ? 
        '<button class="btn btn-secondary" onclick="modalSecondaryAction()">' + 
        escapeHtml(config.secondaryLabel) + '</button>' : '';

      return '<div class="modal-backdrop" onclick="if(event.target===this)closeModal()">' +
        '<div class="modal-container" onclick="event.stopPropagation()">' +
          '<div class="modal-header">' +
            '<h3 class="modal-title">' + escapeHtml(config.title) + '</h3>' +
            '<button class="modal-close" onclick="closeModal()">×</button>' +
          '</div>' +
          '<div class="modal-body">' + config.content + '</div>' +
          '<div class="modal-footer">' + secondaryBtn + primaryBtn + '</div>' +
        '</div>' +
      '</div>';
    }
    
    function escapeHtml(text) {
      return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    }

    // Drag and drop handlers
    let draggedCard = null;
    let sourceColumnId = null;
    
    document.querySelectorAll('.column-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedCard = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
        // Capture source column at dragstart, before any DOM changes
        const sourceColumn = card.closest('.column');
        sourceColumnId = sourceColumn?.dataset.columnId;
        console.log('Drag started from column:', sourceColumnId);
      });
      
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCard = null;
        sourceColumnId = null;
      });
    });
    
    document.querySelectorAll('.column-cards').forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        if (!draggedCard) return;
        
        const afterElement = getDragAfterElement(column, e.clientY);
        if (afterElement) {
          column.insertBefore(draggedCard, afterElement);
        } else {
          column.appendChild(draggedCard);
        }
      });
      
      column.addEventListener('drop', async (e) => {
        e.preventDefault();
        if (!draggedCard) return;
        
        const cardId = draggedCard.dataset.cardId;
        const destColumnId = column.dataset.columnId;
        const siblings = Array.from(column.children);
        const orderIndex = siblings.indexOf(draggedCard);
        
        console.log('Drop event - sourceColumnId:', sourceColumnId, 'destColumnId:', destColumnId);
        
        try {
          await fetch('/api/cards/' + cardId + '/move', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column_id: parseInt(destColumnId), order_index: orderIndex })
          });
          
          // Recount ALL column badges from actual DOM state (most reliable)
          recountAllColumnCounts();
          console.log('Recounted all columns after move');
          // If same column, counts don't change (just reordering)
        } catch (err) {
          console.error('Failed to move card:', err);
          showError('Failed to move card');
          // On error, refresh to restore correct state
          location.reload();
        }
      });
    });
    
    // Recount all column badges from actual DOM card counts
    function recountAllColumnCounts() {
      document.querySelectorAll('.column').forEach(col => {
        const colId = col.dataset.columnId;
        const count = col.querySelectorAll('.column-card').length;
        const badge = document.getElementById('count-' + colId);
        if (badge) {
          badge.textContent = count;
          console.log('Column', colId, 'count updated to:', count);
        }
      });
    }
    
    function getDragAfterElement(container, y) {
      const draggableElements = [...container.querySelectorAll('.column-card:not(.dragging)')];
      
      return draggableElements.reduce((closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        
        if (offset < 0 && offset > closest.offset) {
          return { offset: offset, element: child };
        } else {
          return closest;
        }
      }, { offset: Number.NEGATIVE_INFINITY }).element;
    }
    
    function updateColumnCount(columnId) {
      const column = document.querySelector('[data-column-id="' + columnId + '"]');
      if (!column) return;
      const count = column.querySelectorAll('.column-card').length;
      const badge = document.getElementById('count-' + columnId);
      if (badge) badge.textContent = count;
    }
    
    function showError(message) {
      showModal({
        title: 'Error',
        content: '<p style="color:#f38ba8">' + escapeHtml(message) + '</p>',
        primaryLabel: 'OK',
        primaryVariant: 'primary',
        onPrimary: closeModal
      });
    }
    
    // Card actions with styled modals
    function addCard(columnId) {
      showModal({
        title: 'Add Card',
        content: 
          '<div class="input-group">' +
            '<label class="input-label" for="card-title">Title *</label>' +
            '<input type="text" id="card-title" class="input-field" placeholder="Enter card title" maxlength="200">' +
          '</div>' +
          '<div class="input-group">' +
            '<label class="input-label" for="card-desc">Description</label>' +
            '<textarea id="card-desc" class="input-field" placeholder="Enter description (optional)" maxlength="1000" rows="3"></textarea>' +
          '</div>',
        primaryLabel: 'Create',
        secondaryLabel: 'Cancel',
        onPrimary: async () => {
          const title = document.getElementById('card-title').value.trim();
          const description = document.getElementById('card-desc').value.trim() || null;
          
          if (!title) {
            document.getElementById('card-title').style.borderColor = '#f38ba8';
            return;
          }
          
          closeModal();
          try {
            await fetch('/api/cards', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ column_id: columnId, title, description })
            });
            location.reload();
          } catch (err) {
            showError('Failed to create card');
          }
        }
      });
    }
    
    function editCard(id) {
      const card = document.querySelector('[data-card-id="' + id + '"]');
      const titleEl = card.querySelector('.card-title');
      const descEl = card.querySelector('.card-desc');
      const currentTitle = titleEl.textContent;
      const currentDesc = descEl ? descEl.textContent : '';
      
      showModal({
        title: 'Edit Card',
        content: 
          '<div class="input-group">' +
            '<label class="input-label" for="edit-title">Title *</label>' +
            '<input type="text" id="edit-title" class="input-field" value="' + escapeHtml(currentTitle) + '" maxlength="200">' +
          '</div>' +
          '<div class="input-group">' +
            '<label class="input-label" for="edit-desc">Description</label>' +
            '<textarea id="edit-desc" class="input-field" rows="3" maxlength="1000">' + escapeHtml(currentDesc) + '</textarea>' +
          '</div>',
        primaryLabel: 'Save',
        secondaryLabel: 'Cancel',
        onPrimary: async () => {
          const title = document.getElementById('edit-title').value.trim();
          const description = document.getElementById('edit-desc').value.trim() || null;
          
          if (!title) {
            document.getElementById('edit-title').style.borderColor = '#f38ba8';
            return;
          }
          
          closeModal();
          try {
            await fetch('/api/cards/' + id, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, description })
            });
            location.reload();
          } catch (err) {
            showError('Failed to update card');
          }
        }
      });
    }
    
    function deleteCard(id) {
      showModal({
        title: 'Delete Card',
        content: '<p style="color:#a6adc8">Are you sure you want to delete this card? This action cannot be undone.</p>',
        primaryLabel: 'Delete',
        primaryVariant: 'destructive',
        secondaryLabel: 'Cancel',
        onPrimary: async () => {
          closeModal();
          try {
            await fetch('/api/cards/' + id, { method: 'DELETE' });
            location.reload();
          } catch (err) {
            showError('Failed to delete card');
          }
        }
      });
    }
    
    // Column actions with styled modals
    function addColumn() {
      showModal({
        title: 'Add Column',
        content: 
          '<div class="input-group">' +
            '<label class="input-label" for="col-name">Column Name *</label>' +
            '<input type="text" id="col-name" class="input-field" placeholder="Enter column name">' +
          '</div>',
        primaryLabel: 'Create',
        secondaryLabel: 'Cancel',
        onPrimary: async () => {
          const name = document.getElementById('col-name').value.trim();
          
          if (!name) {
            document.getElementById('col-name').style.borderColor = '#f38ba8';
            return;
          }
          
          closeModal();
          try {
            await fetch('/api/columns', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            location.reload();
          } catch (err) {
            showError('Failed to create column');
          }
        }
      });
    }
    
    function editColumnName(id) {
      const col = document.querySelector('[data-column-id="' + id + '"]');
      const nameEl = col.querySelector('.column-name');
      const currentName = nameEl.textContent;
      
      showModal({
        title: 'Rename Column',
        content: 
          '<div class="input-group">' +
            '<label class="input-label" for="rename-col">Column Name *</label>' +
            '<input type="text" id="rename-col" class="input-field" value="' + escapeHtml(currentName) + '">' +
          '</div>',
        primaryLabel: 'Save',
        secondaryLabel: 'Cancel',
        onPrimary: async () => {
          const name = document.getElementById('rename-col').value.trim();
          
          if (!name) {
            document.getElementById('rename-col').style.borderColor = '#f38ba8';
            return;
          }
          
          closeModal();
          try {
            await fetch('/api/columns/' + id, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name })
            });
            location.reload();
          } catch (err) {
            showError('Failed to rename column');
          }
        }
      });
    }
  </script>
</body>
</html>
  `;
}

export const _phoenix = {
  iu_id: '8479eab3613ec143616b6143a45015b7d8d8dd0d4821e14008fafbe07235fa66',
  name: 'UI',
  risk_tier: 'medium',
  canon_ids: []
} as const;
