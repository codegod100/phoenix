// @ts-nocheck
// @vitest-environment happy-dom
// Generated tests for Board IU

import { describe, it, expect, beforeEach } from 'bun:test';
import { BoardComponent } from '../board.ui';
import { Database } from '../database';

describe('BoardComponent', () => {
  beforeEach(() => {
    Database.clear();
  });

  it('should create board element', () => {
    const board = BoardComponent.render({ onColumnAdd: () => {} });
    expect(board.className).toBe('kanban-board');
  });

  it('should create column with header and count badge', () => {
    const col = Database.createColumn('Test', 0);
    const colEl = BoardComponent.createColumn(col, 5);
    
    expect(colEl.dataset.columnId).toBe(col.id);
    expect(colEl.className).toBe('kanban-column');
    
    const badge = colEl.querySelector(`#count-${col.id}`);
    expect(badge?.textContent).toBe('5');
  });

  it('should have add-column button', () => {
    let clicked = false;
    const board = BoardComponent.render({ 
      onColumnAdd: () => { clicked = true; } 
    });
    
    const addBtn = board.querySelector('button');
    expect(addBtn?.textContent).toContain('Add Column');
  });

  it('should have add-card button in column', () => {
    const col = Database.createColumn('Test', 0);
    const colEl = BoardComponent.createColumn(col, 0);
    
    const addBtn = colEl.querySelector('button[data-column-id]');
    expect(addBtn?.textContent).toContain('Add Card');
    expect(addBtn?.getAttribute('data-column-id')).toBe(col.id);
  });

  it('should provide default columns', () => {
    const defaults = BoardComponent.getDefaultColumns();
    expect(defaults).toEqual(['Todo', 'In Progress', 'Done']);
  });

  it('should allow delete when more than 1 column', () => {
    expect(BoardComponent.canDeleteColumn(2)).toBe(true);
    expect(BoardComponent.canDeleteColumn(1)).toBe(false);
  });

  it('should create scrollable card container', () => {
    const col = Database.createColumn('Test', 0);
    const colEl = BoardComponent.createColumn(col, 0);
    
    const container = colEl.querySelector('.column-cards');
    expect(container).not.toBeNull();
  });
});
