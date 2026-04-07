#!/usr/bin/env node
/**
 * Phoenix Drift - Detect drift between manifest and working tree
 * 
 * This skill uses phoenix-vcs-core for actual drift detection.
 * 
 * Usage: node .pi/skills/phoenix-drift/drift.js [project-root]
 */

import { loadManifest, detectDrift, formatDriftReport } from '../phoenix-vcs-core/lib/drift.js';
import { existsSync } from 'fs';
import { resolve } from 'path';

const projectRoot = resolve(process.argv[2] || '.');

if (!existsSync(projectRoot)) {
  console.error(`❌ Project not found: ${projectRoot}`);
  process.exit(1);
}

const manifestPath = resolve(projectRoot, '.phoenix/manifests/generated_manifest.json');
if (!existsSync(manifestPath)) {
  console.error(`❌ No manifest found at ${manifestPath}`);
  console.error('Run phoenix-regen first to create manifest');
  process.exit(1);
}

console.log('🔍 Phoenix VCS Drift Detection');
console.log(`   Project: ${projectRoot}\n`);

try {
  const manifest = loadManifest(projectRoot);
  if (!manifest) {
    console.error('❌ Failed to load manifest');
    process.exit(1);
  }

  const report = detectDrift(projectRoot, manifest);
  console.log(formatDriftReport(report));

  process.exit(report.has_blocking_drift ? 1 : 0);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
