/**
 * Database Schema & Migrations
 * IU-8e5f3c9b: Schema & Migrations (MEDIUM)
 * 
 * Uses Worker1 Promiser API - 'exec' method for running SQL
 */

import type { DatabaseInstance } from './database.js';

/**
 * Current schema version
 */
export const CURRENT_SCHEMA_VERSION = 1;

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
 * Execute SQL without expecting results (DDL statements)
 */
async function execDdl(db: DatabaseInstance, sql: string): Promise<void> {
  await db.promiser('exec', { dbId: db.dbId, sql });
}

/**
 * node-d5c9a3f8: Single table named "notes"
 * node-1a7e5c9b: Notes table columns (id, title, content, created_at, updated_at)
 * node-a8f3d6c7: No AUTOINCREMENT, use rowid as stable identifier
 */
export async function createNotesTable(db: DatabaseInstance): Promise<void> {
  await execDdl(db, `
    CREATE TABLE IF NOT EXISTS notes (
      id INTEGER PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT DEFAULT '',
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    )
  `);
  
  await execDdl(db, 'CREATE INDEX IF NOT EXISTS idx_notes_updated_at ON notes(updated_at DESC)');
  await execDdl(db, 'CREATE INDEX IF NOT EXISTS idx_notes_title ON notes(title)');
}

/**
 * node-6e4b8d2c: Schema version tracking table
 */
export async function createSchemaVersionTable(db: DatabaseInstance): Promise<void> {
  await execDdl(db, `
    CREATE TABLE IF NOT EXISTS schema_version (
      version INTEGER PRIMARY KEY,
      applied_at INTEGER NOT NULL
    )
  `);
}

/**
 * Get the current schema version from the database
 */
export async function getCurrentVersion(db: DatabaseInstance): Promise<number> {
  try {
    const rows = await execSql<[number]>(db, 
      'SELECT version FROM schema_version ORDER BY version DESC LIMIT 1'
    );
    
    return rows[0]?.[0] ?? 0;
  } catch {
    return 0;
  }
}

/**
 * Record a schema version as applied
 */
export async function recordVersion(db: DatabaseInstance, version: number): Promise<void> {
  const now = Date.now();
  await db.promiser('exec', {
    dbId: db.dbId,
    sql: 'INSERT OR REPLACE INTO schema_version (version, applied_at) VALUES (?, ?)',
    bind: [version, now],
  });
}

/**
 * node-e3b8a4f6: Schema versioning and automatic migration
 * Apply pending migrations to bring database to current version
 */
export async function migrate(
  db: DatabaseInstance,
  targetVersion: number = CURRENT_SCHEMA_VERSION
): Promise<void> {
  await createSchemaVersionTable(db);
  
  const currentVersion = await getCurrentVersion(db);

  if (currentVersion === targetVersion) {
    console.log('[notes-app] Schema up to date (version', currentVersion, ')');
    return;
  }

  if (currentVersion > targetVersion) {
    throw new Error(
      `Database version (${currentVersion}) is ahead of app version (${targetVersion}). Downgrade not supported.`
    );
  }

  console.log('[notes-app] Migrating from version', currentVersion, 'to', targetVersion);

  if (currentVersion < 1 && targetVersion >= 1) {
    await createNotesTable(db);
    await recordVersion(db, 1);
    console.log('[notes-app] Applied migration: version 1 (initial schema)');
  }

  console.log('[notes-app] Migration complete at version', targetVersion);
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '8e5f3c9b7d2a8f5e3c9b7d2a8f5e3c9b7d2a8f5e3c9b7d2a8f5e3c9b7d2a8f5',
  name: 'Schema & Migrations',
  risk_tier: 'medium',
  requirements: [
    'node-d5c9a3f8',
    'node-1a7e5c9b',
    'node-6e4b8d2c',
    'node-9c2f7a5e',
    'node-a8f3d6c7',
  ],
} as const;
