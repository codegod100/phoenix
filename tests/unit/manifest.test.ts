import { describe, it, expect, beforeEach } from 'vitest';
import { mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { ManifestManager } from '../../src/manifest.js';
import type { IUManifest } from '../../src/models/manifest.js';

describe('ManifestManager', () => {
  let tempDir: string;
  let manager: ManifestManager;

  beforeEach(() => {
    tempDir = mkdtempSync(join(tmpdir(), 'phoenix-manifest-'));
    manager = new ManifestManager(tempDir);
  });

  function makeIUManifest(id: string, files: Record<string, { hash: string; size: number }>): IUManifest {
    return {
      iu_id: id,
      iu_name: `IU-${id}`,
      files: Object.fromEntries(
        Object.entries(files).map(([path, { hash, size }]) => [
          path, { path, content_hash: hash, size },
        ])
      ),
      regen_metadata: {
        model_id: 'test', promptpack_hash: 'abc',
        toolchain_version: '1.0', generated_at: new Date().toISOString(),
      },
    };
  }

  it('returns empty manifest when none exists', () => {
    const manifest = manager.load();
    expect(Object.keys(manifest.iu_manifests)).toHaveLength(0);
  });

  it('records and retrieves a single IU manifest', () => {
    const ium = makeIUManifest('iu1', { 'src/a.ts': { hash: 'aaa', size: 100 } });
    manager.recordIU(ium);
    const retrieved = manager.getIUManifest('iu1');
    expect(retrieved).not.toBeNull();
    expect(retrieved!.iu_name).toBe('IU-iu1');
  });

  it('records multiple IU manifests', () => {
    const iu1 = makeIUManifest('iu1', { 'src/a.ts': { hash: 'aaa', size: 100 } });
    const iu2 = makeIUManifest('iu2', { 'src/b.ts': { hash: 'bbb', size: 200 } });
    manager.recordAll([iu1, iu2]);
    expect(manager.getIUManifest('iu1')).not.toBeNull();
    expect(manager.getIUManifest('iu2')).not.toBeNull();
  });

  it('returns null for non-existent IU', () => {
    expect(manager.getIUManifest('nonexistent')).toBeNull();
  });

  it('lists all tracked files', () => {
    const iu1 = makeIUManifest('iu1', { 'src/a.ts': { hash: 'a', size: 1 } });
    const iu2 = makeIUManifest('iu2', { 'src/b.ts': { hash: 'b', size: 2 }, 'src/c.ts': { hash: 'c', size: 3 } });
    manager.recordAll([iu1, iu2]);
    const files = manager.getAllTrackedFiles();
    expect(files).toHaveLength(3);
    expect(files).toContain('src/a.ts');
    expect(files).toContain('src/b.ts');
    expect(files).toContain('src/c.ts');
  });

  it('overwrites existing IU manifest on re-record', () => {
    const v1 = makeIUManifest('iu1', { 'src/a.ts': { hash: 'old', size: 100 } });
    manager.recordIU(v1);
    const v2 = makeIUManifest('iu1', { 'src/a.ts': { hash: 'new', size: 200 } });
    manager.recordIU(v2);
    const retrieved = manager.getIUManifest('iu1');
    expect(retrieved!.files['src/a.ts'].content_hash).toBe('new');
  });
});
