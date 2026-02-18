import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ContentStore } from '../../src/store/content-store.js';

describe('ContentStore', () => {
  let store: ContentStore;

  beforeEach(() => {
    const tempDir = mkdtempSync(join(tmpdir(), 'phoenix-cs-'));
    store = new ContentStore(tempDir);
  });

  it('stores and retrieves an object', () => {
    const obj = { name: 'test', value: 42 };
    store.put('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890', obj);
    const retrieved = store.get('abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890');
    expect(retrieved).toEqual(obj);
  });

  it('returns null for non-existent object', () => {
    expect(store.get('0000001234567890abcdef1234567890abcdef1234567890abcdef1234567890')).toBeNull();
  });

  it('reports existence correctly', () => {
    const id = 'aabbcc1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    expect(store.has(id)).toBe(false);
    store.put(id, { test: true });
    expect(store.has(id)).toBe(true);
  });

  it('handles multiple objects with same prefix', () => {
    const id1 = 'aa00001234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    const id2 = 'aa00002234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    store.put(id1, { which: 'first' });
    store.put(id2, { which: 'second' });
    expect(store.get<{ which: string }>(id1)?.which).toBe('first');
    expect(store.get<{ which: string }>(id2)?.which).toBe('second');
  });

  it('overwrites existing object', () => {
    const id = 'bbccdd1234567890abcdef1234567890abcdef1234567890abcdef1234567890';
    store.put(id, { version: 1 });
    store.put(id, { version: 2 });
    expect(store.get<{ version: number }>(id)?.version).toBe(2);
  });
});
