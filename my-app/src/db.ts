import { Database } from 'bun:sqlite';
import { existsSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';

const DB_PATH = process.env.DB_PATH ?? 'data/app.db';

const dir = dirname(DB_PATH);
if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

const db = new Database(DB_PATH);
db.exec('PRAGMA journal_mode = WAL');
db.exec('PRAGMA foreign_keys = ON');

const migrations: Array<{ name: string; sql: string }> = [];

export function registerMigration(name: string, sql: string): void {
  migrations.push({ name, sql });
}

export function runMigrations(): void {
  for (const m of migrations) {
    db.exec(m.sql);
  }
}

// Convenience wrappers that match LLM expectations
export function queryAll(sql: string, params?: any[]): any[] {
  return db.prepare(sql).all(...(params || []));
}

export function queryRow(sql: string, params?: any[]): any | null {
  return db.prepare(sql).get(...(params || []));
}

export { db };
