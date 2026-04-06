// Generated from IU: Database (3a7c98df84dab8dcc333d70c9d351e2aaa2cbda2093f4571f871179d1dfa7ed5)
// Source: spec/app.md - Database section

export interface Column {
  id: string;
  name: string;
  order_index: number;
  created_at: Date;
}

export interface Card {
  id: string;
  title: string;
  description: string | null;
  column_id: string;
  order_index: number;
  created_at: Date;
}

// In-memory store (can be replaced with SQLite/PostgreSQL)
const columns = new Map<string, Column>();
const cards = new Map<string, Card>();

export const Database = {
  // Columns
  createColumn(name: string, order_index: number): Column {
    const id = crypto.randomUUID();
    const column: Column = {
      id,
      name,
      order_index,
      created_at: new Date()
    };
    columns.set(id, column);
    return column;
  },

  getColumn(id: string): Column | undefined {
    return columns.get(id);
  },

  getAllColumns(): Column[] {
    return Array.from(columns.values()).sort((a, b) => a.order_index - b.order_index);
  },

  updateColumn(id: string, updates: Partial<Pick<Column, 'name'>>): Column | undefined {
    const column = columns.get(id);
    if (!column) return undefined;
    
    if (updates.name !== undefined) {
      column.name = updates.name;
    }
    return column;
  },

  deleteColumn(id: string): boolean {
    // Delete all cards in this column first
    const cardsToDelete = Array.from(cards.values()).filter(c => c.column_id === id);
    for (const card of cardsToDelete) {
      cards.delete(card.id);
    }
    return columns.delete(id);
  },

  // Cards
  createCard(title: string, description: string | null, column_id: string, order_index: number): Card {
    const id = crypto.randomUUID();
    const card: Card = {
      id,
      title,
      description,
      column_id,
      order_index,
      created_at: new Date()
    };
    cards.set(id, card);
    return card;
  },

  getCard(id: string): Card | undefined {
    return cards.get(id);
  },

  getCardsByColumn(column_id: string): Card[] {
    return Array.from(cards.values())
      .filter(c => c.column_id === column_id)
      .sort((a, b) => a.order_index - b.order_index);
  },

  updateCard(id: string, updates: Partial<Pick<Card, 'title' | 'description'>>): Card | undefined {
    const card = cards.get(id);
    if (!card) return undefined;
    
    if (updates.title !== undefined) card.title = updates.title;
    if (updates.description !== undefined) card.description = updates.description;
    return card;
  },

  moveCard(id: string, new_column_id: string, new_order_index: number): Card | undefined {
    // Validate column exists
    if (!columns.has(new_column_id)) {
      throw new Error(`Column ${new_column_id} does not exist`);
    }
    
    const card = cards.get(id);
    if (!card) return undefined;
    
    card.column_id = new_column_id;
    card.order_index = new_order_index;
    
    // Rebalance order indices on conflict
    const columnCards = this.getCardsByColumn(new_column_id);
    for (let i = 0; i < columnCards.length; i++) {
      columnCards[i].order_index = i;
    }
    
    return card;
  },

  deleteCard(id: string): boolean {
    return cards.delete(id);
  },

  // Board state
  getBoardState(): { columns: Column[]; cards: Card[] } {
    return {
      columns: this.getAllColumns(),
      cards: Array.from(cards.values())
    };
  },

  // Initialize with default columns
  initDefaults(): void {
    if (columns.size === 0) {
      this.createColumn('Todo', 0);
      this.createColumn('In Progress', 1);
      this.createColumn('Done', 2);
    }
  },

  // Clear all data (for testing)
  clear(): void {
    columns.clear();
    cards.clear();
  }
};

// Server-compatible exports (for bun:sqlite compatibility)
export function initDatabase(_db?: unknown): void {
  // In-memory database is already initialized
  // This function exists for API compatibility with server.ts
}

export function registerMigrations(_db: unknown, _migrations: unknown[]): void {
  // No-op for in-memory database
}

export function seedDefaultColumns(_db?: unknown): void {
  Database.initDefaults();
}

// Phoenix traceability
export const _phoenix = {
  iu_id: '51bccb43096c1a9986195105833ef45765a391d60b814506b94ae5da10557846',
  name: 'Database',
  risk_tier: 'medium',
} as const;
