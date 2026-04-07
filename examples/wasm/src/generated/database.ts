/**
 * Database Layer
 * IU: 9d3c7e5a - Database Layer (HIGH)
 *
 * Manages SQLite WASM initialization via Worker1 Promiser pattern.
 * Handles OPFS storage with in-memory fallback.
 */

import { runMigrations } from './schema';

/** SQLite Promiser type from @sqlite.org/sqlite-wasm Worker1 */
export type SqlitePromiser = {
  (command: 'open', config: { filename: string; vfs?: string }): Promise<{
    dbId: string;
    message?: string;
  }>;
  (command: 'close', config: { dbId: string }): Promise<{ message?: string }>;
  (command: 'exec', config: {
    dbId: string;
    sql: string;
    bind?: unknown[];
    callback?: (row: { row: unknown }) => void;
  }): Promise<{ result: { message?: string } }>;
};

/** Database configuration options */
export interface DatabaseConfig {
  /** Database filename - uses OPFS by default */
  filename?: string;
  /** Whether to use in-memory database */
  memory?: boolean;
}

/** Database connection state */
export interface DatabaseState {
  /** Database identifier from SQLite */
  dbId: string;
  /** The promiser instance for operations */
  promiser: SqlitePromiser;
  /** Whether using persistent OPFS storage */
  isPersistent: boolean;
  /** Whether database is initialized and ready */
  isReady: boolean;
}

/** Error thrown when database initialization fails */
export class DatabaseError extends Error {
  constructor(
    message: string,
    public readonly cause?: unknown
  ) {
    super(`[notes-app] Database error: ${message}`);
    this.name = 'DatabaseError';
  }
}

/** OPFS filename with vfs parameter */
const OPFS_FILENAME = 'file:notes.sqlite3?vfs=opfs';

/** In-memory database filename */
const MEMORY_FILENAME = ':memory:';

/**
 * Creates a SQLite promiser using the Worker1 pattern.
 * Dynamically imports @sqlite.org/sqlite-wasm to avoid bundling issues.
 *
 * @returns Promise resolving to the promiser instance
 */
async function createPromiser(): Promise<SqlitePromiser> {
  try {
    // Dynamic import to avoid Vite bundling issues with sqlite-wasm
    const sqlite3Module = await import('@sqlite.org/sqlite-wasm');
    
    // First initialize the sqlite3 module (required for Worker1 to work)
    await sqlite3Module.default();
    
    // Now create the Worker1 promiser - it creates a worker internally
    const promiser = await sqlite3Module.sqlite3Worker1Promiser();
    
    return promiser;
  } catch (error) {
    console.error('[notes-app] Failed to create SQLite promiser:', error);
    throw new DatabaseError('Failed to initialize SQLite WASM', error);
  }
}

/**
 * Checks if OPFS (Origin Private File System) is available.
 * Requires cross-origin isolation (COOP/COEP headers).
 *
 * @returns True if OPFS is available
 */
function isOPFSAvailable(): boolean {
  try {
    // Check for cross-origin isolation
    if (!globalThis.crossOriginIsolated) {
      console.log('[notes-app] Cross-origin isolation not available - OPFS requires COOP/COEP headers');
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Opens a database connection using OPFS or in-memory fallback.
 *
 * @param config - Database configuration
 * @returns Promise resolving to database state
 */
async function openDatabase(config: DatabaseConfig = {}): Promise<DatabaseState> {
  const promiser = await createPromiser();

  // Determine storage type
  const useOPFS = !config.memory && isOPFSAvailable();
  const filename = useOPFS ? (config.filename || OPFS_FILENAME) : MEMORY_FILENAME;

  console.log(`[notes-app] Opening database: ${useOPFS ? 'OPFS' : 'in-memory'}`);

  try {
    const response = await promiser('open', {
      filename,
      vfs: useOPFS ? 'opfs' : undefined,
    });

    // Extract dbId from response - it may be in different formats depending on sqlite-wasm version
    let dbId: string;

    if (response.dbId) {
      dbId = response.dbId;
    } else if (typeof response === 'object' && 'result' in response) {
      // Some versions nest the result
      const result = (response as { result?: { dbId?: string } }).result;
      dbId = result?.dbId || '';
    } else {
      throw new DatabaseError('Unexpected response format from SQLite open');
    }

    if (!dbId) {
      throw new DatabaseError('Failed to get database ID from SQLite');
    }

    return {
      dbId,
      promiser,
      isPersistent: useOPFS,
      isReady: false,
    };
  } catch (error) {
    console.error('[notes-app] Failed to open database:', error);
    throw new DatabaseError('Failed to open database', error);
  }
}

/**
 * Initializes the database with migrations and schema validation.
 *
 * @param state - Database state from openDatabase
 * @returns Promise resolving to initialized database state
 */
async function initializeDatabase(state: DatabaseState): Promise<DatabaseState> {
  try {
    await runMigrations(state.promiser, state.dbId, (msg) => console.log(msg));
    state.isReady = true;
    console.log('[notes-app] Database initialized successfully');
    return state;
  } catch (error) {
    console.error('[notes-app] Database initialization failed:', error);
    throw new DatabaseError('Failed to initialize database schema', error);
  }
}

/**
 * Database manager singleton.
 * Handles connection lifecycle and provides access to the promiser.
 */
class DatabaseManager {
  private state: DatabaseState | null = null;
  private initPromise: Promise<DatabaseState> | null = null;

  /**
   * Initializes the database connection.
   * Safe to call multiple times - returns existing connection if available.
   *
   * @param config - Optional database configuration
   * @returns Promise resolving to database state
   */
  async init(config?: DatabaseConfig): Promise<DatabaseState> {
    // Return existing ready state
    if (this.state?.isReady) {
      return this.state;
    }

    // Return in-progress initialization
    if (this.initPromise) {
      return this.initPromise;
    }

    // Start new initialization
    this.initPromise = this.doInit(config);

    try {
      this.state = await this.initPromise;
      return this.state;
    } catch (error) {
      this.initPromise = null;
      throw error;
    }
  }

  private async doInit(config?: DatabaseConfig): Promise<DatabaseState> {
    const state = await openDatabase(config);
    return initializeDatabase(state);
  }

  /**
   * Gets the current database state.
   * Throws if database is not initialized.
   */
  getState(): DatabaseState {
    if (!this.state?.isReady) {
      throw new DatabaseError('Database not initialized. Call init() first.');
    }
    return this.state;
  }

  /**
   * Gets the SQLite promiser instance.
   * Throws if database is not initialized.
   */
  getPromiser(): SqlitePromiser {
    return this.getState().promiser;
  }

  /**
   * Gets the database ID for operations.
   * Throws if database is not initialized.
   */
  getDbId(): string {
    return this.getState().dbId;
  }

  /**
   * Checks if the database is using persistent storage (OPFS).
   */
  isPersistent(): boolean {
    return this.getState().isPersistent;
  }

  /**
   * Checks if the database is ready for operations.
   */
  isReady(): boolean {
    return this.state?.isReady ?? false;
  }

  /**
   * Closes the database connection.
   */
  async close(): Promise<void> {
    if (!this.state) return;

    try {
      await this.state.promiser('close', { dbId: this.state.dbId });
    } catch (error) {
      console.error('[notes-app] Error closing database:', error);
    }

    this.state = null;
    this.initPromise = null;
  }
}

/** Singleton database manager instance */
export const db = new DatabaseManager();

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3c7e5a8f2b9d3',
  name: 'Database Layer',
  risk_tier: 'high',
} as const;
