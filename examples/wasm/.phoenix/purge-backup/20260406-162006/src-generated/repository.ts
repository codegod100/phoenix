/**
 * Note Repository - Data access layer
 * IU-7a4f2e8c: Note Repository (HIGH)
 * 
 * Provides CRUD operations, search, and timestamp management
 * node-7a2e8c5f: Retry save failures 3 times
 */

import { Note, createNote, validateTitle } from './types.js';
import type { DatabaseInstance } from './database.js';

/**
 * Execute SQL using the promiser with callback to capture results
 */
async function execSql<T = unknown[]>(
  db: DatabaseInstance, 
  sql: string, 
  bind?: unknown[]
): Promise<T[]> {
  const rows: T[] = [];
  
  await db.promiser('exec', {
    dbId: db.dbId,
    sql,
    bind,
    callback: (row: { row: T[] | T }) => {
      // Handle both array results and object results
      if (Array.isArray(row.row)) {
        rows.push(row.row as T);
      } else if (row.row) {
        rows.push(row.row as T);
      }
    },
  });
  
  return rows;
}

/**
 * node-c7e3a9d2: Create note with title
 */
export async function createNoteInDb(
  db: DatabaseInstance,
  title: string,
  content: string = ''
): Promise<Note> {
  const validation = validateTitle(title);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const noteData = createNote(title, content);
  const now = Date.now();

  // Insert the note
  await db.promiser('exec', {
    dbId: db.dbId,
    sql: 'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
    bind: [noteData.title, noteData.content, now, now],
  });

  // Fetch the most recently created note
  const rows = await execSql<[number, string, string, number, number]>(db, 
    'SELECT id, title, content, created_at, updated_at FROM notes ORDER BY id DESC LIMIT 1'
  );

  if (rows.length === 0) {
    throw new Error('Failed to fetch created note');
  }

  const row = rows[0];
  return {
    id: row[0],
    title: row[1],
    content: row[2],
    createdAt: row[3],
    updatedAt: row[4],
  };
}

/**
 * node-1f6b8e45: View list sorted by updated_at (most recent first)
 * node-e8a5c3f9: Handle up to 1000 notes
 */
export async function getAllNotes(db: DatabaseInstance): Promise<Note[]> {
  const rows = await execSql<[number, string, string, number, number]>(db, 
    'SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC LIMIT 1000'
  );

  return rows.map(row => ({
    id: row[0],
    title: row[1],
    content: row[2],
    createdAt: row[3],
    updatedAt: row[4],
  }));
}

/**
 * node-a8d4c7f3: View full content of selected note
 */
export async function getNoteById(
  db: DatabaseInstance,
  id: number
): Promise<Note | null> {
  const rows = await execSql<[number, string, string, number, number]>(db, 
    'SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?',
    [id]
  );

  if (rows.length === 0) {
    return null;
  }

  const row = rows[0];
  return {
    id: row[0],
    title: row[1],
    content: row[2],
    createdAt: row[3],
    updatedAt: row[4],
  };
}

/**
 * node-5e9b2c81: Edit title and content
 * node-4b9e2d8a: Auto-refresh updated_at on save
 */
export async function updateNote(
  db: DatabaseInstance,
  id: number,
  title: string,
  content: string
): Promise<Note> {
  const validation = validateTitle(title);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const updatedAt = Date.now();

  // Update the note
  await db.promiser('exec', {
    dbId: db.dbId,
    sql: 'UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
    bind: [title, content, updatedAt, id],
  });

  // Fetch the updated note
  const note = await getNoteById(db, id);
  if (!note) {
    throw new Error('Note not found');
  }

  return note;
}

/**
 * node-2c7f5a9e: Delete with confirmation
 * node-f3c7a9b1: Permanent deletion (no soft-delete)
 */
export async function deleteNote(db: DatabaseInstance, id: number): Promise<void> {
  await db.promiser('exec', {
    dbId: db.dbId,
    sql: 'DELETE FROM notes WHERE id = ?',
    bind: [id],
  });
}

/**
 * node-d8a3f6c5: Search by title or content
 * node-5c3f7a9e: Search within 100ms
 */
export async function searchNotes(
  db: DatabaseInstance,
  query: string
): Promise<Note[]> {
  const searchTerm = `%${query.toLowerCase()}%`;

  const rows = await execSql<[number, string, string, number, number]>(db, 
    'SELECT id, title, content, created_at, updated_at FROM notes WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ? ORDER BY updated_at DESC LIMIT 1000',
    [searchTerm, searchTerm]
  );

  return rows.map(row => ({
    id: row[0],
    title: row[1],
    content: row[2],
    createdAt: row[3],
    updatedAt: row[4],
  }));
}

/**
 * node-7a2e8c5f: Retry save failures 3 times
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        console.log('[notes-app] Retry attempt', attempt, 'of', maxRetries);
        await new Promise(r => setTimeout(r, 100 * attempt));
      }
    }
  }
  
  throw lastError!;
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4',
  name: 'Note Repository',
  risk_tier: 'high',
  requirements: [
    'node-c7e3a9d2',
    'node-1f6b8e45',
    'node-a8d4c7f3',
    'node-5e9b2c81',
    'node-2c7f5a9e',
    'node-d8a3f6c5',
    'node-4b9e2d8a',
    'node-f3c7a9b1',
    'node-7a2e8c5f',
  ],
} as const;
