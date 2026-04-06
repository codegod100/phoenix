// @ts-nocheck
// @vitest-environment happy-dom
// Generated tests for Cards IU

import { describe, it, expect, beforeEach } from 'bun:test';
import { CardComponent, DragState } from '../cards.ui';
import { Database } from '../database';

describe('CardComponent', () => {
  beforeEach(() => {
    Database.clear();
    DragState.endDrag();
  });

  it('should create card element', () => {
    const card = Database.createCard('Test Card', null, 'col-1', 0);
    const el = CardComponent.render({
      card,
      onEdit: () => {},
      onDelete: () => {},
      onDragStart: () => {},
      onDragEnd: () => {}
    });
    
    expect(el.className).toBe('kanban-card');
    expect(el.draggable).toBe(true);
    expect(el.dataset.cardId).toBe(card.id);
  });

  it('should display card title', () => {
    const card = Database.createCard('My Title', null, 'col-1', 0);
    const el = CardComponent.render({
      card,
      onEdit: () => {},
      onDelete: () => {},
      onDragStart: () => {},
      onDragEnd: () => {}
    });
    
    const title = el.querySelector('h4');
    expect(title?.textContent).toBe('My Title');
  });

  it('should display description if present', () => {
    const card = Database.createCard('Title', 'My Description', 'col-1', 0);
    const el = CardComponent.render({
      card,
      onEdit: () => {},
      onDelete: () => {},
      onDragStart: () => {},
      onDragEnd: () => {}
    });
    
    const desc = el.querySelector('p');
    expect(desc?.textContent).toBe('My Description');
  });

  it('should call onEdit when title clicked', () => {
    const card = Database.createCard('Title', null, 'col-1', 0);
    let edited = false;
    
    const el = CardComponent.render({
      card,
      onEdit: () => { edited = true; },
      onDelete: () => {},
      onDragStart: () => {},
      onDragEnd: () => {}
    });
    
    const title = el.querySelector('h4');
    title?.dispatchEvent(new Event('click'));
    expect(edited).toBe(true);
  });

  it('should validate title (1-200 chars)', () => {
    expect(CardComponent.validateTitle('')).toEqual({ valid: false, error: 'Title is required' });
    expect(CardComponent.validateTitle('a'.repeat(201))).toEqual({ valid: false, error: 'Title must be 200 characters or less' });
    expect(CardComponent.validateTitle('Valid')).toEqual({ valid: true });
  });

  it('should allow add when under 100 cards', () => {
    expect(CardComponent.canAddCard(99)).toBe(true);
    expect(CardComponent.canAddCard(100)).toBe(false);
  });

  it('should update count badge', () => {
    // Create a mock badge element
    const badge = document.createElement('span');
    badge.id = 'count-test-col';
    badge.textContent = '5';
    document.body.appendChild(badge);
    
    CardComponent.updateCountBadge('test-col', 10);
    expect(badge.textContent).toBe('10');
    
    document.body.removeChild(badge);
  });
});

describe('DragState', () => {
  it('should track drag state', () => {
    DragState.startDrag('card-1', 'col-1');
    expect(DragState.draggedCardId).toBe('card-1');
    expect(DragState.sourceColumnId).toBe('col-1');
    
    DragState.endDrag();
    expect(DragState.draggedCardId).toBeNull();
    expect(DragState.sourceColumnId).toBeNull();
  });
});
