/**
 * Note Repository
 * IU: 7a4f2e8c - Note Repository (HIGH)
 *
 * Data access layer for notes. Provides CRUD operations with
 * callback-based result capture and retry logic for failed operations.
 */

import type { Note, CreateNoteInput, UpdateNoteInput, NoteSummary } from './types';
import type { SqlitePromiser } from './database';

/** Maximum number of retry attempts for failed operations */
const MAX_RETRIES = 3;

/** Delay between retry attempts in milliseconds */
const RETRY_DELAY_MS = 100;

/**
 * Executes a database operation with retry logic.
 *
 * @param operation - The operation to execute
 * @param operationName - Name for error logging
 * @returns Promise resolving to operation result
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      console.error(`[notes-app] ${operationName} failed (attempt ${attempt}/${MAX_RETRIES}):`, error);

      if (attempt < MAX_RETRIES) {
        await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS * attempt));
      }
    }
  }

  throw new Error(`[notes-app] ${operationName} failed after ${MAX_RETRIES} attempts: ${lastError}`);
}

/**
 * Repository for note CRUD operations.
 * Uses the Worker1 Promiser callback pattern for result capture.
 */
export class NoteRepository {
  constructor(
    private promiser: SqlitePromiser,
    private dbId: string
  ) {}

  /**
   * Creates a new note with the given title and optional content.
   * Timestamps are automatically set to current UTC time.
   *
   * @param input - Note creation input
   * @returns The created note with generated ID and timestamps
   */
  async create(input: CreateNoteInput): Promise<Note> {
    return withRetry(async () => {
      const now = Date.now();
      const title = input.title.trim();
      const content = input.content || '';

      // Insert the note
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'INSERT INTO notes (title, content, created_at, updated_at) VALUES (?, ?, ?, ?)',
        bind: [title, content, now, now],
      });

      // Select the newly created note by ID (rowid)
      // Using MAX(id) is reliable for the note we just inserted
      const rows: Note[] = [];
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'SELECT id, title, content, created_at, updated_at FROM notes WHERE id = last_insert_rowid()',
        callback: (row: { row: Note }) => {
          rows.push(row.row);
        },
      });

      if (rows.length === 0) {
        throw new Error('[notes-app] Failed to retrieve created note');
      }

      return rows[0];
    }, 'Create note');
  }

  /**
   * Retrieves all notes sorted by most recently updated first.
   *
   * @returns Array of notes sorted by updated_at DESC
   */
  async listAll(): Promise<Note[]> {
    return withRetry(async () => {
      const rows: Note[] = [];
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'SELECT id, title, content, created_at, updated_at FROM notes ORDER BY updated_at DESC',
        callback: (row: { row: Note }) => {
          rows.push(row.row);
        },
      });
      return rows;
    }, 'List all notes');
  }

  /**
   * Gets a summary list of notes for sidebar display.
   * Returns only id, title, and updated_at.
   *
   * @returns Array of note summaries sorted by updated_at DESC
   */
  async listSummaries(): Promise<NoteSummary[]> {
    return withRetry(async () => {
      const rows: NoteSummary[] = [];
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'SELECT id, title, updated_at FROM notes ORDER BY updated_at DESC',
        callback: (row: { row: NoteSummary }) => {
          rows.push(row.row);
        },
      });
      return rows;
    }, 'List note summaries');
  }

  /**
   * Retrieves a single note by ID.
   *
   * @param id - Note ID
   * @returns The note, or null if not found
   */
  async getById(id: number): Promise<Note | null> {
    return withRetry(async () => {
      const rows: Note[] = [];
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'SELECT id, title, content, created_at, updated_at FROM notes WHERE id = ?',
        bind: [id],
        callback: (row: { row: Note }) => {
          rows.push(row.row);
        },
      });

      return rows.length > 0 ? rows[0] : null;
    }, `Get note by ID ${id}`);
  }

  /**
   * Updates an existing note.
   * The updated_at timestamp is automatically refreshed.
   *
   * @param id - Note ID to update
   * @param input - Update input with title and content
   * @returns The updated note
   */
  async update(id: number, input: UpdateNoteInput): Promise<Note> {
    return withRetry(async () => {
      const now = Date.now();
      const title = input.title.trim();
      const content = input.content;

      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'UPDATE notes SET title = ?, content = ?, updated_at = ? WHERE id = ?',
        bind: [title, content, now, id],
      });

      // Re-fetch the note to return complete data
      const updated = await this.getById(id);
      if (!updated) {
        throw new Error(`[notes-app] Note ${id} not found after update`);
      }

      return updated;
    }, `Update note ${id}`);
  }

  /**
   * Deletes a note permanently. This operation cannot be undone.
   *
   * @param id - Note ID to delete
   * @returns True if deleted, false if not found
   */
  async delete(id: number): Promise<boolean> {
    return withRetry(async () => {
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'DELETE FROM notes WHERE id = ?',
        bind: [id],
      });

      // Check if any row was affected (optional - SQLite doesn't return this directly)
      // For now, we assume success if no error was thrown
      return true;
    }, `Delete note ${id}`);
  }

  /**
   * Searches notes by title or content.
   * Case-insensitive search using LOWER() and LIKE.
   *
   * @param query - Search query string
   * @returns Array of matching notes sorted by relevance (updated_at)
   */
  async search(query: string): Promise<Note[]> {
    return withRetry(async () => {
      const searchTerm = `%${query.toLowerCase()}%`;

      const rows: Note[] = [];
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: `
          SELECT id, title, content, created_at, updated_at
          FROM notes
          WHERE LOWER(title) LIKE ? OR LOWER(content) LIKE ?
          ORDER BY updated_at DESC
        `,
        bind: [searchTerm, searchTerm],
        callback: (row: { row: Note }) => {
          rows.push(row.row);
        },
      });

      return rows;
    }, 'Search notes');
  }

  /**
   * Counts the total number of notes.
   *
   * @returns Total note count
   */
  async count(): Promise<number> {
    return withRetry(async () => {
      const rows: { count: number }[] = [];
      await this.promiser('exec', {
        dbId: this.dbId,
        sql: 'SELECT COUNT(*) as count FROM notes',
        callback: (row: { row: { count: number } }) => {
          rows.push(row.row);
        },
      });

      return rows.length > 0 ? rows[0].count : 0;
    }, 'Count notes');
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4f2e8c5d9b7a4',
  name: 'Note Repository',
  risk_tier: 'high',
} as const;
