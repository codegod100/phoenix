/**
 * Phoenix VCS — Drift Detection Engine
 * 
 * Implements PRD Section 9: Drift Detection
 * Compares working tree against generated_manifest to detect:
 * - Unlabeled manual edits
 * - Out-of-sync generated code
 * - Missing requirements
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileHash, shortHash } from './identity.js';

export interface FileEntry {
  iu_id: string;
  hash: string;
  size: number;
  generated_at: string;
}

export interface GeneratedManifest {
  version: string;
  generated_at: string;
  files: Record<string, FileEntry>;
}

export interface DriftEntry {
  file: string;
  status: 'CLEAN' | 'MODIFIED' | 'MISSING' | 'ORPHAN' | 'WAIVED';
  expected_hash?: string;
  actual_hash?: string;
  iu_id: string;
  waiver?: {
    type: 'promote_to_requirement' | 'temporary_patch' | 'manual_override';
    expires?: string;
    signed_by?: string;
  };
}

export interface DriftReport {
  timestamp: string;
  project_root: string;
  entries: DriftEntry[];
  summary: {
    clean: number;
    modified: number;
    missing: number;
    orphan: number;
    waived: number;
  };
  has_blocking_drift: boolean;
}

/**
 * Load the generated manifest from .phoenix/manifests/
 */
export function loadManifest(projectRoot: string): GeneratedManifest | null {
  const manifestPath = join(projectRoot, '.phoenix', 'manifests', 'generated_manifest.json');
  if (!existsSync(manifestPath)) {
    return null;
  }
  
  try {
    const content = readFileSync(manifestPath, 'utf-8');
    return JSON.parse(content) as GeneratedManifest;
  } catch {
    return null;
  }
}

/**
 * Detect drift between manifest and working tree.
 * Per PRD Section 9: Manual edits must be labeled or they block acceptance.
 */
export function detectDrift(
  projectRoot: string,
  manifest: GeneratedManifest,
  waivers: Map<string, DriftEntry['waiver']> = new Map()
): DriftReport {
  const entries: DriftEntry[] = [];
  const seenFiles = new Set<string>();
  let modified = 0;
  let missing = 0;
  let clean = 0;
  let waived = 0;
  
  // Check each file in manifest
  for (const [filePath, entry] of Object.entries(manifest.files)) {
    seenFiles.add(filePath);
    const fullPath = join(projectRoot, filePath);
    
    // Check for waiver
    const waiver = waivers.get(filePath);
    
    if (!existsSync(fullPath)) {
      const driftEntry: DriftEntry = {
        file: filePath,
        status: waiver ? 'WAIVED' : 'MISSING',
        iu_id: entry.iu_id,
        expected_hash: entry.hash,
        waiver: waiver || undefined,
      };
      entries.push(driftEntry);
      if (waiver) waived++; else missing++;
      continue;
    }
    
    // File exists - check hash
    const content = readFileSync(fullPath, 'utf-8');
    const actualHash = fileHash(content);
    
    if (actualHash === entry.hash) {
      entries.push({
        file: filePath,
        status: 'CLEAN',
        expected_hash: entry.hash,
        actual_hash: actualHash,
        iu_id: entry.iu_id,
      });
      clean++;
    } else {
      const driftEntry: DriftEntry = {
        file: filePath,
        status: waiver ? 'WAIVED' : 'MODIFIED',
        expected_hash: entry.hash,
        actual_hash: actualHash,
        iu_id: entry.iu_id,
        waiver: waiver || undefined,
      };
      entries.push(driftEntry);
      if (waiver) waived++; else modified++;
    }
  }
  
  // Find orphan files (not in manifest but in generated directory)
  // This would require scanning the directory - simplified here
  const orphan = 0;
  
  const hasBlockingDrift = (modified + missing) > 0;
  
  return {
    timestamp: new Date().toISOString(),
    project_root: projectRoot,
    entries,
    summary: {
      clean,
      modified,
      missing,
      orphan,
      waived,
    },
    has_blocking_drift: hasBlockingDrift,
  };
}

/**
 * Format drift report for display (like `phoenix status`)
 */
export function formatDriftReport(report: DriftReport): string {
  const lines: string[] = [];
  lines.push('🔍 Phoenix VCS Drift Detection');
  lines.push(`   ${report.timestamp}`);
  lines.push('');
  
  // Group by severity
  const blocking = report.entries.filter(e => e.status === 'MODIFIED' || e.status === 'MISSING');
  const warnings = report.entries.filter(e => e.status === 'ORPHAN');
  const ok = report.entries.filter(e => e.status === 'CLEAN');
  const waived = report.entries.filter(e => e.status === 'WAIVED');
  
  if (blocking.length > 0) {
    lines.push('❌ BLOCKING DRIFT (acceptance blocked)');
    lines.push('   Manual edits detected without waiver. Per PRD Section 9:');
    lines.push('   "Manual edits must be labeled: promote_to_requirement, waiver (signed),');
    lines.push('    or temporary_patch (expires)."');
    lines.push('');
    
    for (const entry of blocking) {
      const shortExpected = shortHash(entry.expected_hash!);
      const shortActual = entry.actual_hash ? shortHash(entry.actual_hash) : 'N/A';
      lines.push(`   ${entry.file}`);
      lines.push(`      IU: ${shortHash(entry.iu_id)}`);
      if (entry.status === 'MODIFIED') {
        lines.push(`      Expected: ${shortExpected} → Actual: ${shortActual}`);
      } else {
        lines.push(`      File missing (expected: ${shortExpected})`);
      }
    }
    lines.push('');
  }
  
  if (waived.length > 0) {
    lines.push('⚠️  WAIVED DRIFT (documented exceptions)');
    for (const entry of waived) {
      lines.push(`   ${entry.file}`);
      lines.push(`      Waiver: ${entry.waiver?.type}${entry.waiver?.expires ? ` (expires: ${entry.waiver.expires})` : ''}`);
    }
    lines.push('');
  }
  
  if (warnings.length > 0) {
    lines.push('⚠️  ORPHAN FILES (not tracked in manifest)');
    for (const entry of warnings) {
      lines.push(`   ${entry.file}`);
    }
    lines.push('');
  }
  
  // Summary
  lines.push('─'.repeat(50));
  lines.push(`Summary: ${report.summary.clean} clean, ${report.summary.modified} modified, ${report.summary.missing} missing, ${report.summary.waived} waived`);
  
  if (report.has_blocking_drift) {
    lines.push('');
    lines.push('Status: 🔴 REJECTED - Drift detected without waivers');
    lines.push('Action: Label edits with waiver or revert to generated version');
  } else {
    lines.push('Status: 🟢 ACCEPTED - No blocking drift');
  }
  
  return lines.join('\n');
}

/**
 * Create a waiver for manual edits (PRD Section 9)
 */
export function createWaiver(
  filePath: string,
  type: 'promote_to_requirement' | 'temporary_patch' | 'manual_override',
  options: { expires?: string; signed_by?: string } = {}
): DriftEntry['waiver'] {
  return {
    type,
    expires: options.expires,
    signed_by: options.signed_by,
  };
}
