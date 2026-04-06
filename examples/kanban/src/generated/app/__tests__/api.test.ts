// Generated tests for API IU

import { describe, it, expect, beforeEach } from 'bun:test';
import { API } from '../api';
import { Database } from '../database';

describe('API', () => {
  beforeEach(() => {
    Database.clear();
    Database.initDefaults();
  });

  describe('GET /board', () => {
    it('should return board state with columns and cards', () => {
      const state = API.getBoard();
      expect(state.columns.length).toBe(3);
      expect(state.columns[0].cards).toBeDefined();
    });
  });

  describe('POST /cards', () => {
    it('should create a new card', () => {
      const col = Database.getAllColumns()[0];
      const card = API.createCard({ title: 'New Card' }, col.id);
      expect(card.title).toBe('New Card');
      expect(card.column_id).toBe(col.id);
    });

    it('should create card with description', () => {
      const col = Database.getAllColumns()[0];
      const card = API.createCard({ title: 'Card', description: 'Desc' }, col.id);
      expect(card.description).toBe('Desc');
    });

    it('should validate title length (1-200 chars)', () => {
      const col = Database.getAllColumns()[0];
      expect(() => API.createCard({ title: '' }, col.id)).toThrow();
      expect(() => API.createCard({ title: 'a'.repeat(201) }, col.id)).toThrow();
    });

    it('should validate column exists (400 if not)', () => {
      let error: any;
      try {
        API.createCard({ title: 'Test' }, 'non-existent');
      } catch (e) {
        error = e;
      }
      expect(error?.statusCode).toBe(400);
    });

    it('should enforce max 100 cards per board', () => {
      const col = Database.getAllColumns()[0];
      for (let i = 0; i < 100; i++) {
        API.createCard({ title: `Card ${i}` }, col.id);
      }
      expect(() => API.createCard({ title: 'One too many' }, col.id)).toThrow('Maximum 100 cards');
    });
  });

  describe('PATCH /cards/:id', () => {
    it('should update card title', () => {
      const col = Database.getAllColumns()[0];
      const card = API.createCard({ title: 'Original' }, col.id);
      const updated = API.updateCard(card.id, { title: 'Updated' });
      expect(updated?.title).toBe('Updated');
    });

    it('should update card description', () => {
      const col = Database.getAllColumns()[0];
      const card = API.createCard({ title: 'Card', description: 'Old' }, col.id);
      const updated = API.updateCard(card.id, { description: 'New' });
      expect(updated?.description).toBe('New');
    });

    it('should validate title length on update', () => {
      const col = Database.getAllColumns()[0];
      const card = API.createCard({ title: 'Card' }, col.id);
      expect(() => API.updateCard(card.id, { title: '' })).toThrow();
      expect(() => API.updateCard(card.id, { title: 'a'.repeat(201) })).toThrow();
    });

    it('should return undefined for non-existent card', () => {
      const updated = API.updateCard('non-existent', { title: 'Test' });
      expect(updated).toBeUndefined();
    });
  });

  describe('PATCH /cards/:id/move', () => {
    it('should move card to different column', () => {
      const cols = Database.getAllColumns();
      const card = API.createCard({ title: 'Move me' }, cols[0].id);
      const moved = API.moveCard(card.id, { column_id: cols[1].id, order_index: 0 });
      expect(moved?.column_id).toBe(cols[1].id);
    });

    it('should validate column exists on move (400 if not)', () => {
      const col = Database.getAllColumns()[0];
      const card = API.createCard({ title: 'Test' }, col.id);
      
      let error: any;
      try {
        API.moveCard(card.id, { column_id: 'non-existent', order_index: 0 });
      } catch (e) {
        error = e;
      }
      expect(error?.statusCode).toBe(400);
    });

    it('should auto-rebalance order on conflicts', () => {
      const cols = Database.getAllColumns();
      API.createCard({ title: 'A' }, cols[1].id);
      API.createCard({ title: 'B' }, cols[1].id);
      
      const card = API.createCard({ title: 'Move me' }, cols[0].id);
      API.moveCard(card.id, { column_id: cols[1].id, order_index: 0 });
      
      const cards = Database.getCardsByColumn(cols[1].id);
      expect(cards[0].order_index).toBe(0);
      expect(cards[1].order_index).toBe(1);
      expect(cards[2].order_index).toBe(2);
    });
  });

  describe('DELETE /cards/:id', () => {
    it('should remove a card', () => {
      const col = Database.getAllColumns()[0];
      const card = API.createCard({ title: 'Delete me' }, col.id);
      const deleted = API.deleteCard(card.id);
      expect(deleted).toBe(true);
    });

    it('should return false for non-existent card', () => {
      const deleted = API.deleteCard('non-existent');
      expect(deleted).toBe(false);
    });
  });

  describe('POST /columns', () => {
    it('should create a new column', () => {
      const col = API.createColumn({ name: 'New Column' });
      expect(col.name).toBe('New Column');
    });

    it('should validate column name is required', () => {
      expect(() => API.createColumn({ name: '' })).toThrow('Column name is required');
    });
  });

  describe('PATCH /columns/:id', () => {
    it('should rename a column', () => {
      const col = Database.getAllColumns()[0];
      const renamed = API.renameColumn(col.id, 'Renamed');
      expect(renamed?.name).toBe('Renamed');
    });

    it('should validate name is required', () => {
      const col = Database.getAllColumns()[0];
      expect(() => API.renameColumn(col.id, '')).toThrow('Column name is required');
    });

    it('should return undefined for non-existent column', () => {
      const renamed = API.renameColumn('non-existent', 'Name');
      expect(renamed).toBeUndefined();
    });
  });

  describe('DELETE /columns/:id', () => {
    it('should delete a column and its cards', () => {
      // Create a column with a card
      const col = API.createColumn({ name: 'To Delete' });
      API.createCard({ title: 'Card in deleted column' }, col.id);
      
      // Delete the column
      const deleted = API.deleteColumn(col.id);
      expect(deleted).toBe(true);
      
      // Column should be gone
      expect(Database.getColumn(col.id)).toBeUndefined();
      // Cards in that column should be gone too
      expect(Database.getCardsByColumn(col.id)).toHaveLength(0);
    });

    it('should return false for non-existent column', () => {
      const deleted = API.deleteColumn('non-existent');
      expect(deleted).toBe(false);
    });
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: '4905258e2d2765e92ba112cb439aa28ed9e195b97ee8d8f6a632a16074e4de54',
  name: 'Api',
  risk_tier: 'medium'
} as const;
