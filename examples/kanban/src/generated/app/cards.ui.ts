// Generated from IU: Cards (2cb00b550896bb61245884733f1ca723dd1ffc5022166984d834a54f3258b506)
// Source: spec/app.md - Cards section
// Dependencies: Board, Database

import { Card as CardType } from './database';
import { DesignSystem, Theme } from './design-system.ui';

export interface CardProps {
  card: CardType;
  onEdit: (card: CardType) => void;
  onDelete: (cardId: string) => void;
  onDragStart: (cardId: string) => void;
  onDragEnd: () => void;
}

export const CardComponent = {
  // Create card DOM element
  render(props: CardProps): HTMLElement {
    const card = document.createElement('div');
    card.className = 'kanban-card';
    card.draggable = true;
    card.dataset.cardId = props.card.id;
    
    // Apply styles from design system
    card.style.cssText = `
      background: ${DesignSystem.card.background};
      border-radius: ${DesignSystem.card.borderRadius};
      padding: ${DesignSystem.card.padding};
      box-shadow: ${DesignSystem.card.shadow};
      cursor: grab;
      margin-bottom: 8px;
      max-height: ${DesignSystem.card.maxHeight};
      overflow-y: auto;
    `;
    
    // Title (click to edit)
    const title = document.createElement('h4');
    title.textContent = props.card.title;
    title.style.cssText = `
      color: ${DesignSystem.typography.primary};
      margin: 0 0 4px 0;
      font-size: 14px;
      cursor: pointer;
    `;
    title.addEventListener('click', () => props.onEdit(props.card));
    
    // Description (if present)
    if (props.card.description) {
      const desc = document.createElement('p');
      desc.textContent = props.card.description;
      desc.style.cssText = `
        color: ${DesignSystem.typography.secondary};
        margin: 0;
        font-size: 12px;
        overflow-wrap: break-word;
      `;
      card.appendChild(desc);
    }
    
    card.appendChild(title);
    
    // Drag events
    card.addEventListener('dragstart', (e) => {
      card.style.opacity = '0.5';
      props.onDragStart(props.card.id);
      e.dataTransfer?.setData('text/plain', props.card.id);
    });
    
    card.addEventListener('dragend', () => {
      card.style.opacity = '1';
      props.onDragEnd();
    });
    
    return card;
  },

  // Card count badge update helper
  updateCountBadge(columnId: string, count: number): void {
    const badge = document.getElementById(`count-${columnId}`);
    if (badge) {
      badge.textContent = count.toString();
    }
  },

  // Validation: check if board has < 100 cards
  canAddCard(currentCardCount: number): boolean {
    return currentCardCount < 100;
  },

  // Validation: check title length
  validateTitle(title: string): { valid: boolean; error?: string } {
    if (title.length < 1) {
      return { valid: false, error: 'Title is required' };
    }
    if (title.length > 200) {
      return { valid: false, error: 'Title must be 200 characters or less' };
    }
    return { valid: true };
  }
};

// Card drag state
export const DragState = {
  draggedCardId: null as string | null,
  sourceColumnId: null as string | null,
  
  startDrag(cardId: string, columnId: string): void {
    this.draggedCardId = cardId;
    this.sourceColumnId = columnId;
  },
  
  endDrag(): void {
    this.draggedCardId = null;
    this.sourceColumnId = null;
  }
};
