// CONTRACT: API IU - REST endpoints for board, cards, and columns
// INVARIANT: GET /board returns full board state with columns and cards
// INVARIANT: POST /cards creates a new card with title and optional description
// INVARIANT: PATCH /cards/:id updates card title/description
// INVARIANT: PATCH /cards/:id/move moves card to different column with new order
// INVARIANT: DELETE /cards/:id removes a card
// INVARIANT: POST /columns creates a new column
// INVARIANT: PATCH /columns/:id renames a column
// INVARIANT: Moving card validates column exists (400 if not)
// INVARIANT: Card order is 0-indexed integer, automatically rebalanced on conflicts

import { Database } from 'bun:sqlite';

export type Card = {
  id: number;
  title: string;
  description: string | null;
  column_id: number;
  order_index: number;
  created_at: string;
};

export type Column = {
  id: number;
  name: string;
  order_index: number;
  created_at: string;
  cards: Card[];
};

export type Board = {
  columns: Column[];
};

// Get full board state
export function getBoard(db: Database): Board {
  const columns = db.prepare('SELECT * FROM columns ORDER BY order_index').all() as Omit<Column, 'cards'>[];
  const cards = db.prepare('SELECT * FROM cards ORDER BY column_id, order_index').all() as Card[];
  
  return {
    columns: columns.map(col => ({
      ...col,
      cards: cards.filter(c => c.column_id === col.id)
    }))
  };
}

// Create a new card
export function createCard(
  db: Database,
  title: string,
  description: string | null,
  column_id: number
): Card {
  // Validate column exists
  const column = db.prepare('SELECT id FROM columns WHERE id = ?').get(column_id);
  if (!column) throw new Error('Column not found');

  // Validate title length
  if (title.length < 1 || title.length > 200) {
    throw new Error('Title must be 1-200 characters');
  }

  // Check max cards limit (100 per board)
  const count = db.prepare('SELECT COUNT(*) as count FROM cards').get() as { count: number };
  if (count.count >= 100) throw new Error('Maximum 100 cards allowed');

  // Get max order_index for this column
  const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM cards WHERE column_id = ?').get(column_id) as { max: number | null };
  const order_index = (maxOrder.max ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO cards (title, description, column_id, order_index) VALUES (?, ?, ?, ?)'
  ).run(title, description, column_id, order_index);

  return {
    id: Number(result.lastInsertRowid),
    title,
    description,
    column_id,
    order_index,
    created_at: new Date().toISOString()
  };
}

// Update card title/description
export function updateCard(
  db: Database,
  id: number,
  title?: string,
  description?: string | null
): Card {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card | undefined;
  if (!card) throw new Error('Card not found');

  const newTitle = title ?? card.title;
  const newDesc = description !== undefined ? description : card.description;

  if (newTitle.length < 1 || newTitle.length > 200) {
    throw new Error('Title must be 1-200 characters');
  }

  db.prepare('UPDATE cards SET title = ?, description = ? WHERE id = ?')
    .run(newTitle, newDesc, id);

  return { ...card, title: newTitle, description: newDesc };
}

// Move card to different column with new order
export function moveCard(
  db: Database,
  id: number,
  column_id: number,
  order_index: number
): Card {
  // Validate column exists
  const column = db.prepare('SELECT id FROM columns WHERE id = ?').get(column_id);
  if (!column) throw new Error('Column not found');

  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card | undefined;
  if (!card) throw new Error('Card not found');

  // If moving within same column, reorder
  if (card.column_id === column_id) {
    if (order_index > card.order_index) {
      // Moving down: shift cards between old+1 and new up by 1
      db.prepare(
        'UPDATE cards SET order_index = order_index - 1 WHERE column_id = ? AND order_index > ? AND order_index <= ?'
      ).run(column_id, card.order_index, order_index);
    } else if (order_index < card.order_index) {
      // Moving up: shift cards between new and old-1 down by 1
      db.prepare(
        'UPDATE cards SET order_index = order_index + 1 WHERE column_id = ? AND order_index >= ? AND order_index < ?'
      ).run(column_id, order_index, card.order_index);
    }
  } else {
    // Moving to different column: shift cards in target column up
    db.prepare(
      'UPDATE cards SET order_index = order_index + 1 WHERE column_id = ? AND order_index >= ?'
    ).run(column_id, order_index);
  }

  db.prepare('UPDATE cards SET column_id = ?, order_index = ? WHERE id = ?')
    .run(column_id, order_index, id);

  return { ...card, column_id, order_index };
}

// Delete a card
export function deleteCard(db: Database, id: number): void {
  const card = db.prepare('SELECT * FROM cards WHERE id = ?').get(id) as Card | undefined;
  if (!card) throw new Error('Card not found');

  // Reorder remaining cards in the column
  db.prepare(
    'UPDATE cards SET order_index = order_index - 1 WHERE column_id = ? AND order_index > ?'
  ).run(card.column_id, card.order_index);

  db.prepare('DELETE FROM cards WHERE id = ?').run(id);
}

// Create a new column
export function createColumn(db: Database, name: string): Column {
  if (!name || name.trim().length === 0) {
    throw new Error('Column name is required');
  }

  const maxOrder = db.prepare('SELECT MAX(order_index) as max FROM columns').get() as { max: number | null };
  const order_index = (maxOrder.max ?? -1) + 1;

  const result = db.prepare(
    'INSERT INTO columns (name, order_index) VALUES (?, ?)'
  ).run(name, order_index);

  return {
    id: Number(result.lastInsertRowid),
    name,
    order_index,
    created_at: new Date().toISOString(),
    cards: []
  };
}

// Rename a column
export function renameColumn(db: Database, id: number, name: string): Column {
  if (!name || name.trim().length === 0) {
    throw new Error('Column name is required');
  }

  const column = db.prepare('SELECT * FROM columns WHERE id = ?').get(id) as Column | undefined;
  if (!column) throw new Error('Column not found');

  db.prepare('UPDATE columns SET name = ? WHERE id = ?').run(name, id);

  return { ...column, name };
}

export const _phoenix = {
  iu_id: 'bc7a5e2be9006e1e47d83a68f394a84edf0a72430fe4c371467c8c01e0ac663c',
  name: 'API',
  risk_tier: 'high',
  canon_ids: []
} as const;
