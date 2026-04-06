// IU-2: Data Models & Operations
// Auto-generated from Phoenix plan

import { Database } from 'bun:sqlite';

export const _phoenix = {
  iu_id: 'data-models-002',
  name: 'Data Models & Operations',
  risk_tier: 'high',
} as const;

// Types
export interface Column {
  id: string;
  name: string;
  order_index: number;
  created_at: string;
}

export interface Card {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  order_index: number;
  created_at: string;
}

export interface Board {
  columns: Column[];
  cards: Card[];
}

const MAX_CARDS = 100;

// Validation
export function validateCardTitle(title: string): void {
  if (!title || title.length < 1 || title.length > 200) {
    throw new Error('Title must be 1-200 characters');
  }
}

export function validateColumnExists(db: Database, columnId: string): void {
  const col = db.query('SELECT id FROM columns WHERE id = $id').get({ $id: columnId });
  if (!col) {
    throw new Error(`Column ${columnId} does not exist`);
  }
}

export function checkCardLimit(db: Database): void {
  const count = db.query('SELECT COUNT(*) as count FROM cards').get() as { count: number };
  if (count.count >= MAX_CARDS) {
    throw new Error('Maximum 100 cards allowed');
  }
}

export function checkMinColumns(db: Database): number {
  const count = db.query('SELECT COUNT(*) as count FROM columns').get() as { count: number };
  return count.count;
}

// Read operations
export function getBoard(db: Database): Board {
  const columns = db.query<Column>('SELECT * FROM columns ORDER BY order_index').all();
  const cards = db.query<Card>('SELECT * FROM cards ORDER BY column_id, order_index').all();
  return { columns, cards };
}

export function getColumn(db: Database, id: string): Column | null {
  return db.query<Column>('SELECT * FROM columns WHERE id = $id').get({ $id: id });
}

export function getCard(db: Database, id: string): Card | null {
  return db.query<Card>('SELECT * FROM cards WHERE id = $id').get({ $id: id });
}

// Card CRUD
export function createCard(
  db: Database,
  title: string,
  description: string | null,
  columnId: string
): Card {
  validateCardTitle(title);
  validateColumnExists(db, columnId);
  checkCardLimit(db);

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  // Get next order index for this column
  const maxOrder = db.query<{ max_order: number }>(
    'SELECT MAX(order_index) as max_order FROM cards WHERE column_id = $col'
  ).get({ $col: columnId });
  const orderIndex = (maxOrder?.max_order ?? -1) + 1;

  db.run(`
    INSERT INTO cards (id, title, description, column_id, order_index, created_at)
    VALUES ($id, $title, $desc, $col, $order, $created)
  `, {
    $id: id,
    $title: title,
    $desc: description,
    $col: columnId,
    $order: orderIndex,
    $created: now
  });

  return { id, title, description, column_id: columnId, order_index: orderIndex, created_at: now };
}

export function updateCard(
  db: Database,
  id: string,
  title: string,
  description: string | null
): Card {
  validateCardTitle(title);
  
  const card = getCard(db, id);
  if (!card) throw new Error(`Card ${id} not found`);

  db.run(`
    UPDATE cards SET title = $title, description = $desc WHERE id = $id
  `, {
    $id: id,
    $title: title,
    $desc: description
  });

  return { ...card, title, description };
}

export function moveCard(
  db: Database,
  id: string,
  columnId: string,
  orderIndex: number
): Card {
  validateColumnExists(db, columnId);
  
  const card = getCard(db, id);
  if (!card) throw new Error(`Card ${id} not found`);

  const oldColumnId = card.column_id;

  db.run(`
    UPDATE cards SET column_id = $col, order_index = $order WHERE id = $id
  `, {
    $id: id,
    $col: columnId,
    $order: orderIndex
  });

  // Rebalance orders if needed
  rebalanceCardOrders(db, oldColumnId);
  if (oldColumnId !== columnId) {
    rebalanceCardOrders(db, columnId);
  }

  return { ...card, column_id: columnId, order_index: orderIndex };
}

export function deleteCard(db: Database, id: string): void {
  const card = getCard(db, id);
  if (!card) throw new Error(`Card ${id} not found`);

  db.run('DELETE FROM cards WHERE id = $id', { $id: id });
  rebalanceCardOrders(db, card.column_id);
}

// Column CRUD
export function createColumn(db: Database, name: string): Column {
  if (!name || name.length < 1) {
    throw new Error('Column name is required');
  }

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  
  const maxOrder = db.query<{ max_order: number }>(
    'SELECT MAX(order_index) as max_order FROM columns'
  ).get();
  const orderIndex = (maxOrder?.max_order ?? -1) + 1;

  db.run(`
    INSERT INTO columns (id, name, order_index, created_at)
    VALUES ($id, $name, $order, $created)
  `, {
    $id: id,
    $name: name,
    $order: orderIndex,
    $created: now
  });

  return { id, name, order_index: orderIndex, created_at: now };
}

export function renameColumn(db: Database, id: string, name: string): Column {
  if (!name || name.length < 1) {
    throw new Error('Column name is required');
  }

  const col = getColumn(db, id);
  if (!col) throw new Error(`Column ${id} not found`);

  db.run('UPDATE columns SET name = $name WHERE id = $id', { $id: id, $name: name });

  return { ...col, name };
}

export function moveColumn(db: Database, id: string, orderIndex: number): Column {
  const col = getColumn(db, id);
  if (!col) throw new Error(`Column ${id} not found`);

  db.run('UPDATE columns SET order_index = $order WHERE id = $id', {
    $id: id,
    $order: orderIndex
  });

  rebalanceColumnOrders(db);

  return { ...col, order_index: orderIndex };
}

export function deleteColumn(db: Database, id: string): void {
  const colCount = checkMinColumns(db);
  if (colCount <= 1) {
    throw new Error('Cannot delete the last column');
  }

  const col = getColumn(db, id);
  if (!col) throw new Error(`Column ${id} not found`);

  db.run('DELETE FROM columns WHERE id = $id', { $id: id });
  rebalanceColumnOrders(db);
}

// Rebalancing functions
function rebalanceCardOrders(db: Database, columnId: string): void {
  const cards = db.query<Card>(
    'SELECT * FROM cards WHERE column_id = $col ORDER BY order_index, created_at'
  ).all({ $col: columnId });

  for (let i = 0; i < cards.length; i++) {
    if (cards[i].order_index !== i) {
      db.run('UPDATE cards SET order_index = $order WHERE id = $id', {
        $id: cards[i].id,
        $order: i
      });
    }
  }
}

function rebalanceColumnOrders(db: Database): void {
  const columns = db.query<Column>(
    'SELECT * FROM columns ORDER BY order_index, created_at'
  ).all();

  for (let i = 0; i < columns.length; i++) {
    if (columns[i].order_index !== i) {
      db.run('UPDATE columns SET order_index = $order WHERE id = $id', {
        $id: columns[i].id,
        $order: i
      });
    }
  }
}
