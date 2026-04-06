// CONTRACT: UI IU - Main UI shell and page structure
// INVARIANT: Display board as horizontal row of columns
// INVARIANT: Dark theme: bg #1e1e2e

import type { Board } from './api.js';
import { renderBoard, boardStyles } from './board.ui.js';
import { cardsStyles } from './cards.ui.js';

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
  </style>
</head>
<body>
  ${renderBoard(board)}
  
  <script>
    // Drag and drop handlers
    let draggedCard = null;
    
    document.querySelectorAll('.column-card').forEach(card => {
      card.addEventListener('dragstart', (e) => {
        draggedCard = card;
        card.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });
      
      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        draggedCard = null;
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
        const columnId = column.dataset.columnId;
        const siblings = Array.from(column.children);
        const orderIndex = siblings.indexOf(draggedCard);
        
        try {
          await fetch('/api/cards/' + cardId + '/move', {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ column_id: parseInt(columnId), order_index: orderIndex })
          });
        } catch (err) {
          console.error('Failed to move card:', err);
          location.reload();
        }
      });
    });
    
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
    
    // Card actions
    async function addCard(columnId) {
      const title = prompt('Card title:');
      if (!title) return;
      const description = prompt('Description (optional):') || null;
      
      try {
        await fetch('/api/cards', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ column_id: columnId, title, description })
        });
        location.reload();
      } catch (err) {
        alert('Failed to create card');
      }
    }
    
    async function editCard(id) {
      const card = document.querySelector('[data-card-id="' + id + '"]');
      const titleEl = card.querySelector('.card-title');
      const descEl = card.querySelector('.card-desc');
      const currentTitle = titleEl.textContent;
      const currentDesc = descEl ? descEl.textContent : '';
      
      const title = prompt('Card title:', currentTitle);
      if (title === null) return;
      const description = prompt('Description:', currentDesc);
      if (description === null) return;
      
      try {
        await fetch('/api/cards/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title, description: description || null })
        });
        location.reload();
      } catch (err) {
        alert('Failed to update card');
      }
    }
    
    async function deleteCard(id) {
      if (!confirm('Delete this card?')) return;
      
      try {
        await fetch('/api/cards/' + id, { method: 'DELETE' });
        location.reload();
      } catch (err) {
        alert('Failed to delete card');
      }
    }
    
    // Column actions
    async function addColumn() {
      const name = prompt('Column name:');
      if (!name) return;
      
      try {
        await fetch('/api/columns', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        location.reload();
      } catch (err) {
        alert('Failed to create column');
      }
    }
    
    async function editColumnName(id) {
      const col = document.querySelector('[data-column-id="' + id + '"]');
      const nameEl = col.querySelector('.column-name');
      const currentName = nameEl.textContent;
      
      const name = prompt('Column name:', currentName);
      if (!name || name === currentName) return;
      
      try {
        await fetch('/api/columns/' + id, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name })
        });
        location.reload();
      } catch (err) {
        alert('Failed to rename column');
      }
    }
  </script>
</body>
</html>
  `;
}

export const _phoenix = {
  iu_id: '93738e46037d6490e08021a2fe93cc340fa6871937f6c75937cbe6c71500e5a2',
  name: 'UI',
  risk_tier: 'medium',
  canon_ids: []
} as const;
