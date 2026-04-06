// Generated from IU: Board (d9277914d698b234552a62e6190900d4dcf69e2cdb32ea6add0b506313c5e438)
// Source: spec/app.md - Board section

import { Column, Database } from './database';
import { DesignSystem } from './design-system.ui';

export interface BoardProps {
  onColumnAdd: () => void;
}

export const BoardComponent = {
  // Create board container
  render(props: BoardProps): HTMLElement {
    const board = document.createElement('div');
    board.className = 'kanban-board';
    board.style.cssText = `
      display: flex;
      flex-direction: row;
      gap: 16px;
      padding: 16px;
      background: ${DesignSystem.layout.boardBackground};
      min-height: 100vh;
      overflow-x: auto;
      align-items: flex-start;
    `;
    
    // Add-column button at the right
    const addButton = this.createAddColumnButton(props.onColumnAdd);
    board.appendChild(addButton);
    
    return board;
  },

  // Create column element
  createColumn(column: Column, cardCount: number): HTMLElement {
    const col = document.createElement('div');
    col.className = 'kanban-column';
    col.dataset.columnId = column.id;
    col.style.cssText = `
      background: ${DesignSystem.layout.columnBackground};
      border-radius: 8px;
      min-width: 280px;
      max-width: 280px;
      display: flex;
      flex-direction: column;
      max-height: calc(100vh - 32px);
    `;
    
    // Header with title and count badge
    const header = document.createElement('div');
    header.style.cssText = `
      padding: 12px 16px;
      border-bottom: 1px solid ${DesignSystem.layout.boardBackground};
      display: flex;
      justify-content: space-between;
      align-items: center;
    `;
    
    const title = document.createElement('h3');
    title.textContent = column.name;
    title.style.cssText = `
      margin: 0;
      color: ${DesignSystem.typography.primary};
      font-size: 14px;
      font-weight: 600;
    `;
    
    const badge = document.createElement('span');
    badge.id = `count-${column.id}`;
    badge.textContent = cardCount.toString();
    badge.style.cssText = `
      background: ${DesignSystem.badge.background};
      color: ${DesignSystem.badge.color};
      border-radius: ${DesignSystem.badge.borderRadius};
      padding: ${DesignSystem.badge.padding};
      font-size: ${DesignSystem.badge.fontSize};
    `;
    
    header.appendChild(title);
    header.appendChild(badge);
    col.appendChild(header);
    
    // Card container (scrollable)
    const cardContainer = document.createElement('div');
    cardContainer.className = 'column-cards';
    cardContainer.style.cssText = `
      flex: 1;
      overflow-y: auto;
      padding: 12px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    `;
    
    // Allow dropping cards
    cardContainer.addEventListener('dragover', (e) => {
      e.preventDefault();
      cardContainer.style.background = 'rgba(137, 180, 250, 0.1)';
    });
    
    cardContainer.addEventListener('dragleave', () => {
      cardContainer.style.background = 'transparent';
    });
    
    cardContainer.addEventListener('drop', (e) => {
      e.preventDefault();
      cardContainer.style.background = 'transparent';
      // Drop handling is done by parent component
    });
    
    col.appendChild(cardContainer);
    
    // Add-card button at bottom
    const addCardBtn = this.createAddCardButton(column.id);
    col.appendChild(addCardBtn);
    
    return col;
  },

  createAddColumnButton(onClick: () => void): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = '+ Add Column';
    btn.style.cssText = `
      background: transparent;
      border: 2px dashed ${DesignSystem.colors.surface1};
      color: ${DesignSystem.typography.secondary};
      border-radius: 8px;
      padding: 12px 24px;
      cursor: pointer;
      min-width: 280px;
      height: fit-content;
      font-size: 14px;
    `;
    btn.addEventListener('click', onClick);
    return btn;
  },

  createAddCardButton(columnId: string): HTMLElement {
    const btn = document.createElement('button');
    btn.textContent = '+ Add Card';
    btn.dataset.columnId = columnId;
    btn.style.cssText = `
      background: transparent;
      border: none;
      color: ${DesignSystem.typography.secondary};
      padding: 12px;
      cursor: pointer;
      font-size: 12px;
      text-align: left;
    `;
    btn.addEventListener('mouseenter', () => {
      btn.style.background = DesignSystem.colors.surface1;
    });
    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });
    return btn;
  },

  // Default columns constraint
  getDefaultColumns(): string[] {
    return ['Todo', 'In Progress', 'Done'];
  },

  // Constraint: columns can't be deleted below 1
  canDeleteColumn(columnCount: number): boolean {
    return columnCount > 1;
  }
};

// Phoenix traceability
export const _phoenix = {
  iu_id: 'e6a25c27559f3dcdda1e24c563f0c34fe26bac56d1b1d38dbe6dabfde3ddb5ec',
  name: 'Board',
  risk_tier: 'medium',
} as const;
