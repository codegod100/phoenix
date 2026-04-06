// Generated from IU: Cards (2cb00b550896bb61245884733f1ca723dd1ffc5022166984d834a54f3258b506)
// Client-side entry point for Kanban board

import { Database } from './database';
import { API } from './api';
import { UI } from './ui.ui';
import { BoardComponent } from './board.ui';
import { CardComponent, DragState } from './cards.ui';
import { DesignSystem } from './design-system.ui';

export class KanbanApp {
  private boardEl: HTMLElement | null = null;

  init(): void {
    // Initialize database with default columns
    Database.initDefaults();
    
    // Apply theme
    UI.applyTheme();
    
    // Create board
    const app = document.getElementById('app');
    if (!app) {
      console.error('App container not found');
      return;
    }
    
    this.boardEl = BoardComponent.render({
      onColumnAdd: () => this.handleAddColumn()
    });
    
    app.appendChild(this.boardEl);
    
    // Render initial columns
    this.renderColumns();
  }

  private renderColumns(): void {
    if (!this.boardEl) return;
    
    const state = API.getBoard();
    
    // Clear existing columns (keep add button)
    const addBtn = this.boardEl.querySelector('button');
    this.boardEl.innerHTML = '';
    if (addBtn) this.boardEl.appendChild(addBtn);
    
    // Add columns
    for (const column of state.columns) {
      const colEl = BoardComponent.createColumn(column, column.cards.length);
      
      // Add cards to column
      const cardContainer = colEl.querySelector('.column-cards');
      if (cardContainer) {
        for (const card of column.cards) {
          const cardEl = CardComponent.render({
            card,
            onEdit: (c) => this.handleEditCard(c),
            onDelete: (id) => this.handleDeleteCard(id, column.id),
            onDragStart: (id) => DragState.startDrag(id, column.id),
            onDragEnd: () => DragState.endDrag()
          });
          cardContainer.appendChild(cardEl);
        }
        
        // Handle drop
        cardContainer.addEventListener('drop', (e) => {
          e.preventDefault();
          const cardId = e.dataTransfer?.getData('text/plain');
          if (cardId) {
            this.handleMoveCard(cardId, column.id);
          }
        });
      }
      
      // Add-card button handler
      const addCardBtn = colEl.querySelector('button[data-column-id]');
      if (addCardBtn) {
        addCardBtn.addEventListener('click', () => {
          const colId = addCardBtn.getAttribute('data-column-id');
          if (colId) this.handleAddCard(colId);
        });
      }
      
      this.boardEl.insertBefore(colEl, addBtn || null);
    }
  }

  private handleAddCard(columnId: string): void {
    const modal = UI.createCardModal(columnId, (req) => {
      try {
        API.createCard(req, columnId);
        this.renderColumns();
        UI.updateCardCount(columnId, 1);
      } catch (e) {
        console.error('Failed to create card:', e);
      }
    });
    document.body.appendChild(modal);
  }

  private handleEditCard(card: { id: string; title: string; description: string | null }): void {
    const modal = UI.editCardModal(card, (req) => {
      API.updateCard(card.id, req);
      this.renderColumns();
    });
    document.body.appendChild(modal);
  }

  private handleDeleteCard(cardId: string, columnId: string): void {
    const card = Database.getCard(cardId);
    if (!card) return;
    
    const modal = UI.deleteCardModal(card, () => {
      API.deleteCard(cardId);
      this.renderColumns();
      UI.updateCardCount(columnId, -1);
    });
    document.body.appendChild(modal);
  }

  private handleMoveCard(cardId: string, targetColumnId: string): void {
    const sourceColumnId = DragState.sourceColumnId;
    
    try {
      // Move to end of target column
      const targetCards = Database.getCardsByColumn(targetColumnId);
      API.moveCard(cardId, { column_id: targetColumnId, order_index: targetCards.length });
      
      this.renderColumns();
      
      // Update counts (real-time, no page reload)
      if (sourceColumnId && sourceColumnId !== targetColumnId) {
        UI.updateCardCount(sourceColumnId, -1);
        UI.updateCardCount(targetColumnId, 1);
      }
    } catch (e) {
      console.error('Failed to move card:', e);
    }
  }

  private handleAddColumn(): void {
    const modal = UI.createColumnModal((name) => {
      API.createColumn({ name });
      this.renderColumns();
    });
    document.body.appendChild(modal);
  }
}

// Auto-initialize if DOM is ready
if (typeof window !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      const app = new KanbanApp();
      app.init();
    });
  } else {
    const app = new KanbanApp();
    app.init();
  }
}

// Phoenix traceability
export const _phoenix = {
  iu_id: '5572ff34187af4f973ec761dafc11f4279689ad905ce6886acaba0fc423a3591',
  name: 'Cards',
  risk_tier: 'high'
} as const;
