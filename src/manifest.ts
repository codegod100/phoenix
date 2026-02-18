/**
 * Generated Manifest manager — tracks generated files for drift detection.
 */

import { writeFileSync, readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import type { GeneratedManifest, IUManifest } from './models/manifest.js';

export class ManifestManager {
  private manifestPath: string;

  constructor(phoenixRoot: string) {
    const dir = join(phoenixRoot, 'manifests');
    mkdirSync(dir, { recursive: true });
    this.manifestPath = join(dir, 'generated_manifest.json');
  }

  load(): GeneratedManifest {
    if (!existsSync(this.manifestPath)) {
      return { iu_manifests: {}, generated_at: '' };
    }
    return JSON.parse(readFileSync(this.manifestPath, 'utf8'));
  }

  save(manifest: GeneratedManifest): void {
    writeFileSync(this.manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
  }

  /**
   * Record a single IU's generated files into the manifest.
   */
  recordIU(iuManifest: IUManifest): void {
    const manifest = this.load();
    manifest.iu_manifests[iuManifest.iu_id] = iuManifest;
    manifest.generated_at = new Date().toISOString();
    this.save(manifest);
  }

  /**
   * Record multiple IU manifests at once.
   */
  recordAll(iuManifests: IUManifest[]): void {
    const manifest = this.load();
    for (const m of iuManifests) {
      manifest.iu_manifests[m.iu_id] = m;
    }
    manifest.generated_at = new Date().toISOString();
    this.save(manifest);
  }

  /**
   * Get manifest for a specific IU.
   */
  getIUManifest(iuId: string): IUManifest | null {
    const manifest = this.load();
    return manifest.iu_manifests[iuId] ?? null;
  }

  /**
   * Get all tracked file paths across all IUs.
   */
  getAllTrackedFiles(): string[] {
    const manifest = this.load();
    const files: string[] = [];
    for (const iuManifest of Object.values(manifest.iu_manifests)) {
      files.push(...Object.keys(iuManifest.files));
    }
    return files;
  }
}
