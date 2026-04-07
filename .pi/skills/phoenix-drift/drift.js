#!/usr/bin/env node
/**
 * Phoenix Drift - Detect drift between manifest and working tree
 * 
 * Self-contained skill - no external dependencies except Node.js stdlib
 * 
 * Usage: node .pi/skills/phoenix-drift/drift.js [project-root]
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { join, resolve, relative } from 'path';

// === VCS IDENTITY FUNCTIONS (inlined from original vcs-core) ===

function canonId(text) {
  return createHash('sha256').update(text).digest('hex');
}

function fileHash(content) {
  return canonId(content);
}

// === VCS DRIFT FUNCTIONS (inlined) ===

function loadManifest(projectRoot) {
  const manifestPath = join(projectRoot, '.phoenix/manifests/generated_manifest.json');
  if (!existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

function detectDrift(projectRoot, manifest) {
  const results = [];
  let hasBlockingDrift = false;
  
  for (const [filePath, expected] of Object.entries(manifest.files || {})) {
    const fullPath = join(projectRoot, filePath);
    
    if (!existsSync(fullPath)) {
      results.push({
        file: filePath,
        expected_hash: expected.hash,
        actual_hash: null,
        status: 'MISSING',
        is_blocking: true
      });
      hasBlockingDrift = true;
      continue;
    }
    
    const content = readFileSync(fullPath, 'utf-8');
    const actualHash = fileHash(content);
    
    if (actualHash !== expected.hash) {
      results.push({
        file: filePath,
        expected_hash: expected.hash,
        actual_hash: actualHash,
        status: 'MODIFIED',
        is_blocking: true
      });
      hasBlockingDrift = true;
    } else {
      results.push({
        file: filePath,
        expected_hash: expected.hash,
        actual_hash: actualHash,
        status: 'CLEAN',
        is_blocking: false
      });
    }
  }
  
  return {
    results,
    has_blocking_drift: hasBlockingDrift,
    summary: {
      clean: results.filter(r => r.status === 'CLEAN').length,
      modified: results.filter(r => r.status === 'MODIFIED').length,
      missing: results.filter(r => r.status === 'MISSING').length,
      total: results.length
    }
  };
}

function formatDriftReport(report) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix VCS Drift Detection                                   ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  const { clean, modified, missing, total } = report.summary;
  
  lines.push(`📊 Summary: ${clean} clean, ${modified} modified, ${missing} missing (${total} total)`);
  lines.push('');
  
  if (report.has_blocking_drift) {
    lines.push('❌ BLOCKING DRIFT (acceptance blocked)');
    lines.push('');
    
    const blocking = report.results.filter(r => r.is_blocking);
    if (blocking.length > 0) {
      lines.push('Modified files:');
      for (const r of blocking.filter(r => r.status === 'MODIFIED')) {
        lines.push(`  • ${r.file}`);
        lines.push(`    Expected: ${r.expected_hash.slice(0, 16)}...`);
        lines.push(`    Actual:   ${r.actual_hash.slice(0, 16)}...`);
      }
      
      const missingFiles = blocking.filter(r => r.status === 'MISSING');
      if (missingFiles.length > 0) {
        lines.push('');
        lines.push('Missing files:');
        for (const r of missingFiles) {
          lines.push(`  • ${r.file}`);
        }
      }
      
      lines.push('');
      lines.push('Actions:');
      lines.push('  1. Revert: git checkout src/generated/');
      lines.push('  2. Label: Create waiver in .phoenix/waivers.json');
    }
    
    lines.push('');
    lines.push('Status: 🔴 REJECTED');
  } else {
    lines.push('✅ No drift detected');
    lines.push('');
    lines.push('Status: 🟢 ACCEPTED');
  }
  
  return lines.join('\n');
}

// === MAIN EXECUTION ===

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
