/**
 * Database Layer - SQLite WASM initialization
 * IU-9d3c7e5a: Database Layer (HIGH)
 * 
 * Uses @sqlite.org/sqlite-wasm with Worker1 Promiser pattern
 * node-f9c6e4b8: Non-blocking main thread operations
 */

import { sqlite3Worker1Promiser, type Worker1Promiser } from '@sqlite.org/sqlite-wasm';

const log = (...args: unknown[]) => console.log('[notes-app]', ...args);
const error = (...args: unknown[]) => console.error('[notes-app]', ...args);

/**
 * node-a1b4c7e9: SQLite WASM for data persistence
 * node-9d7c1e5a: Database filename "notes.sqlite3"
 * node-8f2e5b8c: OPFS for persistent storage when available
 * node-5c9a2d71: Fallback to in-memory database
 */
const DB_FILENAME = 'file:notes.sqlite3?vfs=opfs';
const DB_FILENAME_MEMORY = ':memory:';

export interface DatabaseInstance {
  dbId: string;
  promiser: Worker1Promiser;
  filename: string;
  isOpfs: boolean;
}

interface OpenResponse {
  dbId: string;
  result: {
    filename: string;
  };
}

/**
 * Initialize SQLite database with OPFS support
 * node-c9e4b7a2: Status indicator for ready state
 * node-b5e7c9a4: Error message on initialization failure
 */
export async function initializeDatabase(): Promise<DatabaseInstance> {
  try {
    log('Initializing SQLite3...');

    // Initialize the promiser (Worker1 pattern)
    const promiser = await new Promise<Worker1Promiser>((resolve) => {
      sqlite3Worker1Promiser({
        onready: resolve,
      });
    });

    log('SQLite3 ready, checking OPFS availability...');

    // Try OPFS first
    let openResponse: OpenResponse;
    let isOpfs: boolean;

    try {
      openResponse = await promiser('open', {
        filename: DB_FILENAME,
      }) as OpenResponse;
      isOpfs = true;
      log('OPFS available, using persistent storage:', openResponse.result.filename);
    } catch (err) {
      // Fall back to in-memory
      log('OPFS unavailable, falling back to in-memory database');
      openResponse = await promiser('open', {
        filename: DB_FILENAME_MEMORY,
      }) as OpenResponse;
      isOpfs = false;
      log('Using in-memory database:', openResponse.result.filename);
    }

    return {
      dbId: openResponse.dbId,
      promiser,
      filename: openResponse.result.filename,
      isOpfs,
    };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    error('Database initialization failed:', errMsg);
    throw new Error(`Failed to initialize database: ${errMsg}`);
  }
}

/**
 * node-3c9f6e8a: Error display if OPFS unavailable with instructions
 */
export function getOpfsInstructions(): string {
  return `
OPFS (Origin Private File System) is unavailable.

To enable OPFS for persistent storage, your server must set these headers:
  Cross-Origin-Opener-Policy: same-origin
  Cross-Origin-Embedder-Policy: require-corp

Without these headers, notes will be stored in memory only and will be lost when you close the tab.

For local development with Vite, add to vite.config.js:
  server: {
    headers: {
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Embedder-Policy': 'require-corp',
    }
  }
  `.trim();
}

/**
 * Check if OPFS is available (without opening a database)
 */
export async function checkOpfsSupport(): Promise<boolean> {
  try {
    if (typeof navigator === 'undefined') return false;
    const storage = navigator.storage;
    if (!storage?.getDirectory) return false;
    await storage.getDirectory();
    return true;
  } catch {
    return false;
  }
}

/**
 * Close the database connection
 */
export async function closeDatabase(
  db: DatabaseInstance
): Promise<void> {
  try {
    await db.promiser('close', { dbId: db.dbId });
    log('Database closed:', db.filename);
  } catch (err) {
    error('Error closing database:', err);
  }
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3',
  name: 'Database Layer',
  risk_tier: 'high',
  requirements: [
    'node-a1b4c7e9',
    'node-8f2e5b8c',
    'node-5c9a2d71',
    'node-e3b8a4f6',
    'node-9d7c1e5a',
    'node-b4f8e2c9',
    'node-f9c6e4b8',
    'node-b5e7c9a4',
    'node-c9e4b7a2',
  ],
} as const;
