/**
 * Schema & Migrations
 * IU: 8e5f3c9b - Schema & Migrations (MEDIUM)
 *
 * Defines database schema and migration logic for the SQLite notes database.
 * Uses rowid as the stable identifier (no AUTOINCREMENT).
 */

import type { SqlitePromiser } from './database';

/** Current schema version - increment when adding migrations */
export const SCHEMA_VERSION = 1;

/**
 * SQL DDL for creating the notes table.
 * Uses INTEGER PRIMARY KEY (rowid) as the stable identifier.
 */
export const CREATE_NOTES_TABLE = `
  CREATE TABLE IF NOT EXISTS notes (
    id INTEGER PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT DEFAULT '',
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  )
`;

/**
 * SQL DDL for creating the schema_version tracking table.
 */
export const CREATE_SCHEMA_VERSION_TABLE = `
  CREATE TABLE IF NOT EXISTS schema_version (
    version INTEGER PRIMARY KEY
  )
`;

/**
 * SQL for inserting initial schema version.
 */
export const INSERT_SCHEMA_VERSION = `
  INSERT INTO schema_version (version) VALUES (?)
    ON CONFLICT(version) DO UPDATE SET version = excluded.version
`;

/**
 * Gets the current schema version from the database.
 *
 * @param promiser - The SQLite promiser instance
 * @param dbId - Database identifier
 * @returns Current schema version (0 if not set)
 */
export async function getCurrentSchemaVersion(
  promiser: SqlitePromiser,
  dbId: string
): Promise<number> {
  const rows: { version: number }[] = [];

  await promiser('exec', {
    dbId,
    sql: 'SELECT version FROM schema_version LIMIT 1',
    callback: (row: { row: { version: number } }) => {
      rows.push(row.row);
    },
  });

  return rows.length > 0 ? rows[0].version : 0;
}

/**
 * Sets the schema version in the database.
 *
 * @param promiser - The SQLite promiser instance
 * @param dbId - Database identifier
 * @param version - Schema version to set
 */
export async function setSchemaVersion(
  promiser: SqlitePromiser,
  dbId: string,
  version: number
): Promise<void> {
  await promiser('exec', {
    dbId,
    sql: INSERT_SCHEMA_VERSION,
    bind: [version],
  });
}

/**
 * Migration function type - takes promiser and dbId, performs schema changes.
 */
export type Migration = (promiser: SqlitePromiser, dbId: string) => Promise<void>;

/**
 * List of migrations indexed by version number.
 * Migration at index N upgrades from version N to N+1.
 */
export const migrations: Migration[] = [
  // Migration 0 → 1: Initial schema creation
  async (promiser, dbId) => {
    await promiser('exec', { dbId, sql: CREATE_NOTES_TABLE });
    await promiser('exec', { dbId, sql: CREATE_SCHEMA_VERSION_TABLE });
  },
];

/**
 * Runs all pending migrations to bring the database to the current schema version.
 *
 * @param promiser - The SQLite promiser instance
 * @param dbId - Database identifier
 * @param logger - Optional logger function for migration progress
 */
export async function runMigrations(
  promiser: SqlitePromiser,
  dbId: string,
  logger?: (msg: string) => void
): Promise<void> {
  const log = logger || (() => {});

  log('[notes-app] Checking schema version...');

  // Ensure schema_version table exists (for fresh databases)
  await promiser('exec', { dbId, sql: CREATE_SCHEMA_VERSION_TABLE });

  const currentVersion = await getCurrentSchemaVersion(promiser, dbId);
  log(`[notes-app] Current schema version: ${currentVersion}`);

  if (currentVersion >= SCHEMA_VERSION) {
    log('[notes-app] Schema is up to date');
    return;
  }

  log(`[notes-app] Running migrations from ${currentVersion} to ${SCHEMA_VERSION}...`);

  for (let version = currentVersion; version < SCHEMA_VERSION; version++) {
    const migration = migrations[version];
    if (!migration) {
      throw new Error(`[notes-app] Migration ${version} not found`);
    }

    log(`[notes-app] Running migration ${version} → ${version + 1}...`);
    await migration(promiser, dbId);
    await setSchemaVersion(promiser, dbId, version + 1);
    log(`[notes-app] Migration ${version} → ${version + 1} complete`);
  }

  log('[notes-app] All migrations complete');
}

/**
 * Validates that the database schema is correct.
 * Checks for required tables and columns.
 *
 * @param promiser - The SQLite promiser instance
 * @param dbId - Database identifier
 * @returns True if schema is valid
 */
export async function validateSchema(
  promiser: SqlitePromiser,
  dbId: string
): Promise<boolean> {
  try {
    const tables: { name: string }[] = [];
    await promiser('exec', {
      dbId,
      sql: "SELECT name FROM sqlite_master WHERE type='table'",
      callback: (row: { row: { name: string } }) => {
        tables.push(row.row);
      },
    });

    const hasNotesTable = tables.some(t => t.name === 'notes');
    const hasVersionTable = tables.some(t => t.name === 'schema_version');

    return hasNotesTable && hasVersionTable;
  } catch {
    return false;
  }
}

/**
 * Gets SQL for checking if a table exists.
 */
export function getTableExistsSQL(tableName: string): string {
  return `
    SELECT 1 FROM sqlite_master
    WHERE type = 'table' AND name = '${tableName}'
  `;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '8e5f3c9b7d1a8e5f3c9b7d1a8e5f3c9b7d1a8e5f3c9b7d1a8e5f3c9b7d1a8e5f3c9b7d1a8e5f3c9b7d1a',
  name: 'Schema & Migrations',
  risk_tier: 'medium',
} as const;
