/**
 * Drift Detection — compares working tree vs generated manifest.
 *
 * Detects when generated files have been manually edited without
 * a waiver, which breaks the provenance chain.
 */

import { readFileSync, existsSync } from 'node:fs';
import type { GeneratedManifest, DriftEntry, DriftReport, DriftWaiver } from './models/manifest.js';
import { DriftStatus } from './models/manifest.js';
import { sha256 } from './semhash.js';

/**
 * Check all files in the manifest against the working tree.
 */
export function detectDrift(
  manifest: GeneratedManifest,
  projectRoot: string,
  waivers?: Map<string, DriftWaiver>,
): DriftReport {
  const entries: DriftEntry[] = [];

  for (const iuManifest of Object.values(manifest.iu_manifests)) {
    for (const [filePath, entry] of Object.entries(iuManifest.files)) {
      const fullPath = projectRoot + '/' + filePath;
      const waiver = waivers?.get(filePath);

      if (!existsSync(fullPath)) {
        entries.push({
          status: DriftStatus.MISSING,
          file_path: filePath,
          iu_id: iuManifest.iu_id,
          expected_hash: entry.content_hash,
        });
        continue;
      }

      const actualContent = readFileSync(fullPath, 'utf8');
      const actualHash = sha256(actualContent);

      if (actualHash === entry.content_hash) {
        entries.push({
          status: DriftStatus.CLEAN,
          file_path: filePath,
          iu_id: iuManifest.iu_id,
          expected_hash: entry.content_hash,
          actual_hash: actualHash,
        });
      } else if (waiver) {
        entries.push({
          status: DriftStatus.WAIVED,
          file_path: filePath,
          iu_id: iuManifest.iu_id,
          expected_hash: entry.content_hash,
          actual_hash: actualHash,
          waiver,
        });
      } else {
        entries.push({
          status: DriftStatus.DRIFTED,
          file_path: filePath,
          iu_id: iuManifest.iu_id,
          expected_hash: entry.content_hash,
          actual_hash: actualHash,
        });
      }
    }
  }

  const clean = entries.filter(e => e.status === DriftStatus.CLEAN).length;
  const drifted = entries.filter(e => e.status === DriftStatus.DRIFTED).length;
  const missing = entries.filter(e => e.status === DriftStatus.MISSING).length;
  const waived = entries.filter(e => e.status === DriftStatus.WAIVED).length;

  let summary: string;
  if (drifted === 0 && missing === 0) {
    summary = `All ${clean} generated files are clean.${waived > 0 ? ` ${waived} waived.` : ''}`;
  } else {
    const parts: string[] = [];
    if (drifted > 0) parts.push(`${drifted} drifted`);
    if (missing > 0) parts.push(`${missing} missing`);
    summary = `DRIFT DETECTED: ${parts.join(', ')}. ${clean} clean.`;
  }

  return { entries, clean_count: clean, drifted_count: drifted, missing_count: missing, summary };
}
