// Generated from IU: API (16d86aaf6719e3ba15e04be70b2d6898dd29e40513c3195f7422ca9fae3fa01a)
// Source: spec/app.md - API section

import { Database, Column, Card } from './database';

export interface BoardState {
  columns: (Column & { cards: Card[] })[];
}

export interface CreateCardRequest {
  title: string;
  description?: string;
}

export interface CreateColumnRequest {
  name: string;
}

export interface UpdateCardRequest {
  title?: string;
  description?: string | null;
}

export interface MoveCardRequest {
  column_id: string;
  order_index: number;
}

export const API = {
  // GET /board - returns full board state
  getBoard(): BoardState {
    const columns = Database.getAllColumns();
    return {
      columns: columns.map(col => ({
        ...col,
        cards: Database.getCardsByColumn(col.id)
      }))
    };
  },

  // POST /cards - creates a new card
  createCard(request: CreateCardRequest, columnId: string): Card {
    if (!request.title || request.title.length < 1 || request.title.length > 200) {
      throw new Error('Title must be 1-200 characters');
    }
    
    // Validate column exists
    if (!Database.getColumn(columnId)) {
      const error = new Error(`Column ${columnId} does not exist`);
      (error as any).statusCode = 400;
      throw error;
    }
    
    const cards = Database.getCardsByColumn(columnId);
    
    // Check max cards limit (100 per board)
    const allCards = Database.getBoardState().cards;
    if (allCards.length >= 100) {
      throw new Error('Maximum 100 cards per board');
    }
    
    const order_index = cards.length;
    return Database.createCard(request.title, request.description || null, columnId, order_index);
  },

  // PATCH /cards/:id - updates card
  updateCard(id: string, request: UpdateCardRequest): Card | undefined {
    if (request.title !== undefined && (request.title.length < 1 || request.title.length > 200)) {
      throw new Error('Title must be 1-200 characters');
    }
    
    return Database.updateCard(id, request);
  },

  // PATCH /cards/:id/move - moves card to different column
  moveCard(id: string, request: MoveCardRequest): Card | undefined {
    // Validate column exists (400 if not)
    if (!Database.getColumn(request.column_id)) {
      const error = new Error(`Column ${request.column_id} does not exist`);
      (error as any).statusCode = 400;
      throw error;
    }
    
    // Card order is 0-indexed, auto-rebalanced on conflicts (handled in Database.moveCard)
    return Database.moveCard(id, request.column_id, request.order_index);
  },

  // DELETE /cards/:id - removes card
  deleteCard(id: string): boolean {
    return Database.deleteCard(id);
  },

  // POST /columns - creates a new column
  createColumn(request: CreateColumnRequest): Column {
    if (!request.name || request.name.trim().length === 0) {
      throw new Error('Column name is required');
    }
    
    const columns = Database.getAllColumns();
    const order_index = columns.length;
    return Database.createColumn(request.name, order_index);
  },

  // PATCH /columns/:id - renames a column
  renameColumn(id: string, name: string): Column | undefined {
    if (!name || name.trim().length === 0) {
      throw new Error('Column name is required');
    }
    
    return Database.updateColumn(id, { name });
  },

  // DELETE /columns/:id - removes column and all its cards
  deleteColumn(id: string): boolean {
    return Database.deleteColumn(id);
  }
};

// Server-compatible function exports (for server.ts using bun:sqlite)
// These wrap the in-memory Database for server-side usage

export function getBoard(): BoardState {
  return API.getBoard();
}

export function createCard(_db: unknown, title: string, description: string | null, columnId: string): Card {
  return API.createCard({ title, description: description || undefined }, columnId);
}

export function updateCard(_db: unknown, id: string | number, title: string | undefined, description: string | null | undefined): Card | undefined {
  return API.updateCard(String(id), { title, description });
}

export function moveCard(_db: unknown, id: string | number, columnId: string, orderIndex: number): Card | undefined {
  return API.moveCard(String(id), { column_id: columnId, order_index: orderIndex });
}

export function deleteCard(_db: unknown, id: string | number): boolean {
  return API.deleteCard(String(id));
}

export function createColumn(_db: unknown, name: string): Column {
  return API.createColumn({ name });
}

export function renameColumn(_db: unknown, id: string | number, name: string): Column | undefined {
  return API.renameColumn(String(id), name);
}

export function deleteColumn(_db: unknown, id: string | number): boolean {
  return API.deleteColumn(String(id));
}

// Phoenix traceability
export const _phoenix = {
  iu_id: '4905258e2d2765e92ba112cb439aa28ed9e195b97ee8d8f6a632a16074e4de54',
  name: 'Api',
  risk_tier: 'medium',
} as const;
