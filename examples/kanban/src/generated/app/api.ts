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
  }
};
