// Generated tests for API IU: 16d86aaf6719e3ba15e04be70b2d6898dd29e40513c3195f7422ca9fae3fa01a

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database as SQLiteDB } from 'bun:sqlite';
import * as api from '../api';
import * as db from '../database';

const TEST_DB_PATH = 'data/test-api.db';

describe('API', () => {
  let sqliteDb: SQLiteDB;
  
  beforeAll(() => {
    // Clean up any existing test db
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
    
    sqliteDb = new SQLiteDB(TEST_DB_PATH);
    // Initialize database with schema
    sqliteDb.exec('PRAGMA foreign_keys = ON');
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS columns (id TEXT PRIMARY KEY, name TEXT NOT NULL, order_index INTEGER NOT NULL, created_at TEXT NOT NULL)`);
    sqliteDb.exec(`CREATE TABLE IF NOT EXISTS cards (id TEXT PRIMARY KEY, title TEXT NOT NULL, description TEXT, column_id TEXT NOT NULL, order_index INTEGER NOT NULL, created_at TEXT NOT NULL, FOREIGN KEY (column_id) REFERENCES columns(id) ON DELETE CASCADE)`);
    
    // Seed with test data
    const count = sqliteDb.prepare('SELECT COUNT(*) as count FROM columns').get() as { count: number };
    if (count.count === 0) {
      const now = new Date().toISOString();
      const uuid = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      sqliteDb.prepare('INSERT INTO columns (id, name, order_index, created_at) VALUES (?, ?, ?, ?)').run(uuid(), 'Todo', 0, now);
      sqliteDb.prepare('INSERT INTO columns (id, name, order_index, created_at) VALUES (?, ?, ?, ?)').run(uuid(), 'In Progress', 1, now);
      sqliteDb.prepare('INSERT INTO columns (id, name, order_index, created_at) VALUES (?, ?, ?, ?)').run(uuid(), 'Done', 2, now);
    }
    
    // Initialize the module's database functions
    db.initDatabase(sqliteDb);
  });
  
  afterAll(() => {
    sqliteDb.close();
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
  });

  describe('GET /board', () => {
    it('should return board state with columns and cards', () => {
      const state = api.getBoard();
      expect(state.columns.length).toBe(3);
      expect(state.columns[0].cards).toBeDefined();
    });
  });

  describe('POST /cards', () => {
    it('should create a new card', () => {
      const cols = db.getAllColumns();
      const col = cols[0];
      const card = api.createCard({ title: 'New Card' }, col.id);
      expect(card.title).toBe('New Card');
      expect(card.column_id).toBe(col.id);
    });

    it('should create card with description', () => {
      const col = db.getAllColumns()[0];
      const card = api.createCard({ title: 'Card', description: 'Desc' }, col.id);
      expect(card.description).toBe('Desc');
    });

    it('should validate title length (1-200 chars)', () => {
      const col = db.getAllColumns()[0];
      expect(() => api.createCard({ title: '' }, col.id)).toThrow();
      expect(() => api.createCard({ title: 'a'.repeat(201) }, col.id)).toThrow();
    });

    it('should validate column exists (400 if not)', () => {
      expect(() => api.createCard({ title: 'Test' }, 'non-existent')).toThrow();
    });

    it('should enforce max 100 cards per board', () => {
      const col = db.getAllColumns()[0];
      // Create 100 cards first (tests may have some already)
      const existing = db.getBoard().columns.flatMap(c => c.cards).length;
      for (let i = 0; i < 100 - existing; i++) {
        api.createCard({ title: `Card ${i}` }, col.id);
      }
      expect(() => api.createCard({ title: 'Overflow' }, col.id)).toThrow('Maximum 100 cards');
    });
  });

  describe('PATCH /cards/:id', () => {
    it('should update card title', () => {
      const col = db.getAllColumns()[0];
      const card = api.createCard({ title: 'Original' }, col.id);
      const updated = api.updateCard(card.id, { title: 'Updated' });
      expect(updated?.title).toBe('Updated');
    });

    it('should update card description', () => {
      const col = db.getAllColumns()[0];
      const card = api.createCard({ title: 'Card', description: 'Old' }, col.id);
      const updated = api.updateCard(card.id, { description: 'New' });
      expect(updated?.description).toBe('New');
    });

    it('should validate title length on update', () => {
      const col = db.getAllColumns()[0];
      const card = api.createCard({ title: 'Valid' }, col.id);
      expect(() => api.updateCard(card.id, { title: '' })).toThrow();
      expect(() => api.updateCard(card.id, { title: 'a'.repeat(201) })).toThrow();
    });

    it('should return undefined for non-existent card', () => {
      const result = api.updateCard('non-existent', { title: 'Test' });
      expect(result).toBeUndefined();
    });
  });

  describe('PATCH /cards/:id/move', () => {
    it('should move card to different column', () => {
      const cols = db.getAllColumns();
      const col1 = cols[0];
      const col2 = cols[1];
      const card = api.createCard({ title: 'Move Me' }, col1.id);
      
      const moved = api.moveCard(card.id, { column_id: col2.id, order_index: 0 });
      expect(moved?.column_id).toBe(col2.id);
    });

    it('should validate column exists on move (400 if not)', () => {
      const col = db.getAllColumns()[0];
      const card = api.createCard({ title: 'Test' }, col.id);
      expect(() => api.moveCard(card.id, { column_id: 'non-existent', order_index: 0 })).toThrow();
    });
  });

  describe('DELETE /cards/:id', () => {
    it('should remove a card', () => {
      const col = db.getAllColumns()[0];
      const card = api.createCard({ title: 'Delete Me' }, col.id);
      const deleted = api.deleteCard(card.id);
      expect(deleted).toBe(true);
    });

    it('should return false for non-existent card', () => {
      const result = api.deleteCard('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('POST /columns', () => {
    it('should create a new column', () => {
      const col = api.createColumn({ name: 'New Column' });
      expect(col.name).toBe('New Column');
    });

    it('should validate column name is required', () => {
      expect(() => api.createColumn({ name: '' })).toThrow();
    });
  });

  describe('PATCH /columns/:id', () => {
    it('should rename a column', () => {
      const col = api.createColumn({ name: 'Old Name' });
      const updated = api.renameColumn(col.id, { name: 'New Name' });
      expect(updated?.name).toBe('New Name');
    });

    it('should validate name is required', () => {
      const col = api.createColumn({ name: 'Valid' });
      expect(() => api.renameColumn(col.id, { name: '' })).toThrow();
    });

    it('should return undefined for non-existent column', () => {
      const result = api.renameColumn('non-existent', { name: 'Test' });
      expect(result).toBeUndefined();
    });
  });

  describe('DELETE /columns/:id', () => {
    it('should delete a column and its cards', () => {
      const col = api.createColumn({ name: 'ToDelete' });
      api.createCard({ title: 'Card in col' }, col.id);
      
      const deleted = api.deleteColumn(col.id);
      expect(deleted).toBe(true);
      expect(db.getColumn(col.id)).toBeUndefined();
    });

    it('should return false for non-existent column', () => {
      const result = api.deleteColumn('non-existent');
      expect(result).toBe(false);
    });
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: '16d86aaf6719e3ba15e04be70b2d6898dd29e40513c3195f7422ca9fae3fa01a',
  name: 'Api',
  risk_tier: 'medium'
} as const;
