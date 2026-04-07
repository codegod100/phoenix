#!/usr/bin/env node
/**
 * Phoenix Cascade - Graph-based failure propagation
 * 
 * Usage: node .pi/skills/phoenix-cascade/cascade.js <command> [args...]
 * 
 * Commands:
 *   cascade <iu-id>     - Compute cascade for failed IU
 *   invalidate <ids...> - Compute selective invalidation
 */

import { 
  buildDependencyGraph, 
  computeCascade, 
  formatCascadeEvent,
  computeInvalidation,
  formatInvalidationReport 
} from '../phoenix-vcs-core/lib/cascade.js';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

const command = process.argv[2];

if (!command || command === '--help') {
  console.log('Phoenix Cascade');
  console.log('');
  console.log('Usage:');
  console.log('  node cascade.js cascade <iu-id>         Compute cascade');
  console.log('  node cascade.js invalidate <id> [id]  Selective invalidation');
  console.log('');
  console.log('Examples:');
  console.log('  node cascade.js cascade ec4737a7...');
  console.log('  node cascade.js invalidate node-a1b2 node-b2c3');
  process.exit(0);
}

const projectRoot = resolve('.');
const iusPath = resolve(projectRoot, '.phoenix/graphs/ius.json');

if (!existsSync(iusPath)) {
  console.error(`❌ No IU graph found at ${iusPath}`);
  process.exit(1);
}

try {
  const iusData = JSON.parse(readFileSync(iusPath, 'utf-8'));
  const graph = buildDependencyGraph(iusData.ius || []);

  if (command === 'cascade') {
    const iuId = process.argv[3];
    if (!iuId) {
      console.error('❌ Usage: cascade <iu-id>');
      process.exit(1);
    }

    console.log('⚡ Phoenix Cascade');
    console.log(`   Failed IU: ${iuId.slice(0, 16)}...\n`);

    const event = computeCascade(graph, iuId, 'unit_tests', 'Test failure');
    console.log(formatCascadeEvent(event));

  } else if (command === 'invalidate') {
    const canonIds = process.argv.slice(3);
    if (canonIds.length === 0) {
      console.error('❌ Usage: invalidate <canon-id-1> [canon-id-2...]');
      process.exit(1);
    }

    console.log('🎯 Phoenix Selective Invalidation');
    console.log(`   Changed requirements: ${canonIds.length}\n`);

    const iuToCanonMap = new Map();
    for (const iu of iusData.ius || []) {
      iuToCanonMap.set(iu.iu_id, iu.source_canon_ids || []);
    }

    const invalidated = computeInvalidation(graph, canonIds, iuToCanonMap);
    console.log(formatInvalidationReport(canonIds, invalidated));

  } else {
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
  }

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
