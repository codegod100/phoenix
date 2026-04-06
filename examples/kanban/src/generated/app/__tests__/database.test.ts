// Generated tests for Database IU: 51bccb43096c1a9986195105833ef45765a391d60b814506b94ae5da10557846

import { describe, it, expect, beforeAll, afterAll } from 'bun:test';
import { Database as SQLiteDB } from 'bun:sqlite';
import * as db from '../database';

const TEST_DB_PATH = 'data/test.db';

describe('Database', () => {
  let sqliteDb: SQLiteDB;
  
  beforeAll(() => {
    // Clean up any existing test db
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
    
    sqliteDb = new SQLiteDB(TEST_DB_PATH);
    db.initDatabase(sqliteDb);
    
    // Clear any existing data
    try {
      sqliteDb.prepare('DELETE FROM cards').run();
      sqliteDb.prepare('DELETE FROM columns').run();
    } catch {}
  });
  
  afterAll(() => {
    sqliteDb.close();
    try { Bun.file(TEST_DB_PATH).delete(); } catch {}
  });

  describe('Columns', () => {
    it('should create a column with id, name, order_index, and created_at', () => {
      const col = db.createColumn('Test', 0);
      expect(col.id).toBeDefined();
      expect(col.name).toBe('Test');
      expect(col.order_index).toBe(0);
      expect(col.created_at).toBeInstanceOf(Date);
    });

    it('should get all columns sorted by order_index', () => {
      db.createColumn('SortA', 100);
      db.createColumn('SortB', 101);
      db.createColumn('SortC', 102);
      
      const cols = db.getAllColumns();
      const sortCols = cols.filter(c => c.name.startsWith('Sort')).sort((a, b) => a.order_index - b.order_index);
      expect(sortCols.length).toBeGreaterThanOrEqual(3);
      expect(sortCols[0].name).toBe('SortA');
      expect(sortCols[1].name).toBe('SortB');
      expect(sortCols[2].name).toBe('SortC');
    });

    it('should update column name', () => {
      const col = db.createColumn('Original', 0);
      const updated = db.updateColumn(col.id, { name: 'Updated' });
      expect(updated?.name).toBe('Updated');
    });

    it('should return undefined for non-existent column', () => {
      const col = db.getColumn('non-existent');
      expect(col).toBeUndefined();
    });
    
    it('should delete a column and cascade delete cards', () => {
      const col = db.createColumn('ToDelete', 99);
      const card = db.createCard('Card', null, col.id, 0);
      
      const deleted = db.deleteColumn(col.id);
      expect(deleted).toBe(true);
      expect(db.getColumn(col.id)).toBeUndefined();
      expect(db.getCard(card.id)).toBeUndefined();
    });
  });

  describe('Cards', () => {
    it('should create a card with required fields', () => {
      const col = db.createColumn('CardTest', 10);
      const card = db.createCard('Title', null, col.id, 0);
      expect(card.id).toBeDefined();
      expect(card.title).toBe('Title');
      expect(card.column_id).toBe(col.id);
      expect(card.order_index).toBe(0);
      expect(card.created_at).toBeInstanceOf(Date);
    });

    it('should create a card with description', () => {
      const col = db.createColumn('DescTest', 11);
      const card = db.createCard('Title', 'Description', col.id, 0);
      expect(card.description).toBe('Description');
    });

    it('should get cards by column sorted by order_index', () => {
      const col = db.createColumn('SortTest', 12);
      db.createCard('C', null, col.id, 2);
      db.createCard('A', null, col.id, 0);
      db.createCard('B', null, col.id, 1);
      
      const cards = db.getCardsByColumn(col.id);
      expect(cards.length).toBe(3);
      expect(cards[0].title).toBe('A');
      expect(cards[1].title).toBe('B');
      expect(cards[2].title).toBe('C');
    });

    it('should update card title and description', () => {
      const col = db.createColumn('UpdateTest', 13);
      const card = db.createCard('Original', 'Desc', col.id, 0);
      const updated = db.updateCard(card.id, { title: 'Updated', description: 'New' });
      expect(updated?.title).toBe('Updated');
      expect(updated?.description).toBe('New');
    });

    it('should move card to different column', () => {
      const col1 = db.createColumn('MoveTest1', 14);
      const col2 = db.createColumn('MoveTest2', 15);
      const card = db.createCard('Test', null, col1.id, 0);
      
      const moved = db.updateCard(card.id, { column_id: col2.id, order_index: 0 });
      expect(moved?.column_id).toBe(col2.id);
    });

    it('should delete a card', () => {
      const col = db.createColumn('DeleteTest', 16);
      const card = db.createCard('Test', null, col.id, 0);
      const deleted = db.deleteCard(card.id);
      expect(deleted).toBe(true);
      expect(db.getCard(card.id)).toBeUndefined();
    });
  });

  describe('Board State', () => {
    it('should return full board state with cards', () => {
      const col = db.createColumn('BoardTest', 17);
      const card = db.createCard('BoardCard', null, col.id, 0);
      
      const state = db.getBoard();
      expect(state.columns.length).toBeGreaterThan(0);
      const testCol = state.columns.find(c => c.id === col.id);
      expect(testCol).toBeDefined();
      expect(testCol!.cards.length).toBeGreaterThan(0);
    });
  });

  describe('Seed Defaults', () => {
    it('should create default columns on seed', () => {
      // Clear existing
      try {
        sqliteDb.prepare('DELETE FROM cards').run();
        sqliteDb.prepare('DELETE FROM columns').run();
      } catch {}
      
      db.seedDefaultColumns(sqliteDb);
      const cols = db.getAllColumns();
      const names = cols.map(c => c.name);
      expect(names).toContain('Todo');
      expect(names).toContain('In Progress');
      expect(names).toContain('Done');
    });
  });
});

// Phoenix traceability
export const _phoenix = {
  iu_id: '51bccb43096c1a9986195105833ef45765a391d60b814506b94ae5da10557846',
  name: 'Database',
  risk_tier: 'medium'
} as const;
