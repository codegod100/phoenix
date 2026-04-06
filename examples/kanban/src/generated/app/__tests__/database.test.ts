// Generated tests for Database IU

import { describe, it, expect, beforeEach } from 'bun:test';
import { Database, Column, Card } from '../database';

describe('Database', () => {
  beforeEach(() => {
    Database.clear();
  });

  describe('Columns', () => {
    it('should create a column with id, name, order_index, and created_at', () => {
      const col = Database.createColumn('Test', 0);
      expect(col.id).toBeDefined();
      expect(col.name).toBe('Test');
      expect(col.order_index).toBe(0);
      expect(col.created_at).toBeInstanceOf(Date);
    });

    it('should get all columns sorted by order_index', () => {
      Database.createColumn('C', 2);
      Database.createColumn('A', 0);
      Database.createColumn('B', 1);
      
      const cols = Database.getAllColumns();
      expect(cols.length).toBe(3);
      expect(cols[0].name).toBe('A');
      expect(cols[1].name).toBe('B');
      expect(cols[2].name).toBe('C');
    });

    it('should update column name', () => {
      const col = Database.createColumn('Original', 0);
      const updated = Database.updateColumn(col.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('should return undefined for non-existent column', () => {
      const col = Database.getColumn('non-existent');
      expect(col).toBeUndefined();
    });
  });

  describe('Cards', () => {
    let column: Column;

    beforeEach(() => {
      column = Database.createColumn('Test', 0);
    });

    it('should create a card with required fields', () => {
      const card = Database.createCard('Title', null, column.id, 0);
      expect(card.id).toBeDefined();
      expect(card.title).toBe('Title');
      expect(card.column_id).toBe(column.id);
      expect(card.order_index).toBe(0);
      expect(card.created_at).toBeInstanceOf(Date);
    });

    it('should create a card with description', () => {
      const card = Database.createCard('Title', 'Description', column.id, 0);
      expect(card.description).toBe('Description');
    });

    it('should get cards by column sorted by order_index', () => {
      Database.createCard('C', null, column.id, 2);
      Database.createCard('A', null, column.id, 0);
      Database.createCard('B', null, column.id, 1);
      
      const cards = Database.getCardsByColumn(column.id);
      expect(cards.length).toBe(3);
      expect(cards[0].title).toBe('A');
      expect(cards[1].title).toBe('B');
      expect(cards[2].title).toBe('C');
    });

    it('should update card title and description', () => {
      const card = Database.createCard('Original', 'Desc', column.id, 0);
      const updated = Database.updateCard(card.id, { title: 'Updated', description: 'New' });
      expect(updated?.title).toBe('Updated');
      expect(updated?.description).toBe('New');
    });

    it('should move card to different column with rebalancing', () => {
      const col2 = Database.createColumn('Col2', 1);
      const card = Database.createCard('Test', null, column.id, 0);
      
      const moved = Database.moveCard(card.id, col2.id, 0);
      expect(moved?.column_id).toBe(col2.id);
    });

    it('should throw when moving to non-existent column', () => {
      const card = Database.createCard('Test', null, column.id, 0);
      expect(() => Database.moveCard(card.id, 'non-existent', 0)).toThrow();
    });

    it('should delete a card', () => {
      const card = Database.createCard('Test', null, column.id, 0);
      const deleted = Database.deleteCard(card.id);
      expect(deleted).toBe(true);
      expect(Database.getCard(card.id)).toBeUndefined();
    });
  });

  describe('Board State', () => {
    it('should return full board state', () => {
      const col = Database.createColumn('Col', 0);
      const card = Database.createCard('Card', null, col.id, 0);
      
      const state = Database.getBoardState();
      expect(state.columns.length).toBe(1);
      expect(state.cards.length).toBe(1);
    });
  });

  describe('Init Defaults', () => {
    it('should create default columns on init', () => {
      Database.initDefaults();
      const cols = Database.getAllColumns();
      expect(cols.length).toBe(3);
      expect(cols[0].name).toBe('Todo');
      expect(cols[1].name).toBe('In Progress');
      expect(cols[2].name).toBe('Done');
    });
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: '51bccb43096c1a9986195105833ef45765a391d60b814506b94ae5da10557846',
  name: 'Database',
  risk_tier: 'medium'
} as const;
