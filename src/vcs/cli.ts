#!/usr/bin/env node
/**
 * Phoenix VCS CLI
 * 
 * Command-line interface for the Phoenix VCS core.
 * 
 * Commands:
 *   status              - Show complete VCS state
 *   drift               - Detect drift between manifest and working tree
 *   boundary <file>     - Validate boundary policy for a file
 *   cascade <iu-id>     - Compute cascade for a failed IU
 *   invalidate <spec>   - Compute selective invalidation for spec changes
 * 
 * Example:
 *   npx phoenix-vcs status
 *   npx phoenix-vcs drift
 *   npx phoenix-vcs boundary src/generated/app/database.ts
 */

import { 
  getVCSStatus, 
  formatVCSStatus,
  detectDrift,
  formatDriftReport,
  loadManifest,
  validateBoundary,
  formatBoundaryReport,
  defaultBoundaryPolicy,
  buildDependencyGraph,
  computeCascade,
  formatCascadeEvent,
  computeInvalidation,
  formatInvalidationReport,
  fileHash,
} from './index.js';

import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createHash } from 'node:crypto';

const USAGE = `
Phoenix VCS — Command Line Interface

Usage: npx phoenix-vcs <command> [options]

Commands:
  status                    Show complete VCS state (diagnostics, drift, evidence)
  drift                     Detect drift between manifest and working tree
  boundary <file>           Validate boundary policy for a file
  cascade <iu-id>           Compute cascade actions for a failed IU
  shadow <old> <new>        Compare two canonical graphs (upgrade safety)
  invalidate <canon-ids...> Compute selective invalidation for spec changes
  help                      Show this help

Examples:
  npx phoenix-vcs status                    # Full status check
  npx phoenix-vcs drift                       # Check for manual edits
  npx phoenix-vcs boundary ./src/app.ts       # Validate file boundaries
  npx phoenix-vcs cascade abc123...          # Compute failure cascade
  npx phoenix-vcs invalidate node-abc node-def  # What IUs need regen?
`;

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(USAGE);
    process.exit(0);
  }
  
  const projectRoot = process.cwd();
  
  try {
    switch (command) {
      case 'status': {
        console.log('🔍 Running Phoenix VCS status check...\n');
        const state = await getVCSStatus(projectRoot);
        console.log(formatVCSStatus(state));
        process.exit(state.status === 'HEALTHY' ? 0 : 1);
      }
      
      case 'drift': {
        console.log('🔍 Running drift detection...\n');
        const manifest = loadManifest(projectRoot);
        if (!manifest) {
          console.error('❌ No manifest found. Run phoenix pipeline first.');
          process.exit(1);
        }
        
        const report = detectDrift(projectRoot, manifest);
        console.log(formatDriftReport(report));
        process.exit(report.has_blocking_drift ? 1 : 0);
      }
      
      case 'boundary': {
        const filePath = args[1];
        if (!filePath) {
          console.error('❌ Usage: npx phoenix-vcs boundary <file>');
          process.exit(1);
        }
        
        const fullPath = resolve(projectRoot, filePath);
        if (!existsSync(fullPath)) {
          console.error(`❌ File not found: ${filePath}`);
          process.exit(1);
        }
        
        console.log(`🔍 Validating boundary for ${filePath}...\n`);
        
        const sourceCode = readFileSync(fullPath, 'utf-8');
        // Extract IU ID from _phoenix export
        const iuIdMatch = sourceCode.match(/iu_id:\s*['"]([^'"]+)['"]/);
        const iuId = iuIdMatch?.[1] || 'unknown';
        
        const policy = defaultBoundaryPolicy();
        const result = validateBoundary(iuId, filePath, sourceCode, policy, {
          dependency_violation: { severity: 'error' },
          side_channel_violation: { severity: 'warning' },
        });
        
        console.log(formatBoundaryReport([result]));
        process.exit(result.has_errors ? 1 : 0);
      }
      
      case 'cascade': {
        const iuId = args[1];
        if (!iuId) {
          console.error('❌ Usage: npx phoenix-vcs cascade <iu-id>');
          process.exit(1);
        }
        
        // Load IU graph
        const iusPath = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
        if (!existsSync(iusPath)) {
          console.error('❌ No IU graph found. Run phoenix pipeline first.');
          process.exit(1);
        }
        
        const iusData = JSON.parse(readFileSync(iusPath, 'utf-8'));
        const graph = buildDependencyGraph(iusData.ius || []);
        
        // Simulate a failure
        const event = computeCascade(graph, iuId, 'unit_tests', 'Test suite failed');
        console.log(formatCascadeEvent(event));
        process.exit(0);
      }
      
      case 'shadow': {
        // Simplified shadow pipeline demo
        console.log('🔍 Shadow Pipeline (Upgrade Safety Check)\n');
        console.log('This would compare old vs new canonicalization.');
        console.log('Use the programmatic API for full shadow pipeline.');
        process.exit(0);
      }
      
      case 'invalidate': {
        const changedIds = args.slice(1);
        if (changedIds.length === 0) {
          console.error('❌ Usage: npx phoenix-vcs invalidate <canon-id> [canon-id...]');
          process.exit(1);
        }
        
        // Load IU graph and mapping
        const iusPath = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
        if (!existsSync(iusPath)) {
          console.error('❌ No IU graph found. Run phoenix pipeline first.');
          process.exit(1);
        }
        
        const iusData = JSON.parse(readFileSync(iusPath, 'utf-8'));
        const graph = buildDependencyGraph(iusData.ius || []);
        
        // Build IU to canon mapping
        const iuToCanonMap = new Map<string, string[]>();
        for (const iu of iusData.ius || []) {
          iuToCanonMap.set(iu.iu_id, iu.source_canon_ids || []);
        }
        
        const invalidated = computeInvalidation(graph, changedIds, iuToCanonMap);
        console.log(formatInvalidationReport(changedIds, invalidated));
        process.exit(0);
      }
      
      default: {
        console.error(`❌ Unknown command: ${command}`);
        console.log(USAGE);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error(`❌ Error: ${error}`);
    process.exit(1);
  }
}

main();
