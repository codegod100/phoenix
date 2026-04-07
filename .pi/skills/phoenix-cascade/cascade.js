#!/usr/bin/env node
/**
 * Phoenix Cascade - Graph-based failure propagation and selective invalidation
 * 
 * Self-contained skill - no external dependencies except Node.js stdlib
 * 
 * Usage: node .pi/skills/phoenix-cascade/cascade.js <command> [args...]
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, join } from 'path';

// === VCS CASCADE FUNCTIONS (inlined) ===

function buildDependencyGraph(ius) {
  const graph = {
    nodes: new Map(),
    edges: new Map()
  };
  
  for (const iu of ius) {
    graph.nodes.set(iu.iu_id, iu);
    graph.edges.set(iu.iu_id, iu.dependencies || []);
  }
  
  return graph;
}

function getTransitiveDependents(graph, iuId, visited = new Set()) {
  const dependents = [];
  
  for (const [nodeId, deps] of graph.edges.entries()) {
    if (deps.includes(iuId) && !visited.has(nodeId)) {
      visited.add(nodeId);
      dependents.push(nodeId);
      dependents.push(...getTransitiveDependents(graph, nodeId, visited));
    }
  }
  
  return dependents;
}

function computeCascade(graph, failedIuId, evidenceKind, failureReason) {
  const affected = getTransitiveDependents(graph, failedIuId);
  
  return {
    timestamp: new Date().toISOString(),
    source: {
      iu_id: failedIuId,
      evidence_kind: evidenceKind,
      failure_reason: failureReason
    },
    actions: {
      BLOCK: [failedIuId],
      RETYPECHECK: affected,
      REBOUNDARY_CHECK: affected.filter(id => {
        const node = graph.nodes.get(id);
        return node && (node.dependencies || []).includes(failedIuId);
      }),
      RETEST: affected.map(id => ({
        iu_id: id,
        tags: [failedIuId]
      })),
      REGENERATE: affected.filter(id => {
        const node = graph.nodes.get(id);
        return node && node.risk_tier === 'high';
      })
    },
    affected_ius: affected,
    cascade_depth: affected.length > 0 ? 1 : 0
  };
}

function computeInvalidation(graph, changedCanonIds, iuToCanonMap) {
  const invalidated = new Set();
  
  for (const [iuId, canonIds] of iuToCanonMap.entries()) {
    for (const canonId of changedCanonIds) {
      if (canonIds.includes(canonId)) {
        invalidated.add(iuId);
        const dependents = getTransitiveDependents(graph, iuId);
        dependents.forEach(d => invalidated.add(d));
        break;
      }
    }
  }
  
  return [...invalidated];
}

function formatCascadeEvent(event) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix VCS Cascade Event                                     ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`⚡ Source: ${event.source.iu_id.slice(0, 16)}... (${event.source.evidence_kind})`);
  lines.push(`   Affected IUs: ${event.affected_ius.length}`);
  lines.push(`   Cascade depth: ${event.cascade_depth}`);
  lines.push('');
  
  const { actions } = event;
  
  if (actions.BLOCK.length > 0) {
    lines.push('🚫 BLOCK:');
    for (const id of actions.BLOCK) {
      lines.push(`   → ${id.slice(0, 16)}...`);
    }
    lines.push('');
  }
  
  if (actions.RETYPECHECK.length > 0) {
    lines.push('🔍 RETYPECHECK:');
    for (const id of actions.RETYPECHECK.slice(0, 5)) {
      lines.push(`   → ${id.slice(0, 16)}...`);
    }
    if (actions.RETYPECHECK.length > 5) {
      lines.push(`   ... and ${actions.RETYPECHECK.length - 5} more`);
    }
    lines.push('');
  }
  
  if (actions.REGENERATE.length > 0) {
    lines.push('🔄 REGENERATE (high-risk):');
    for (const id of actions.REGENERATE) {
      lines.push(`   → ${id.slice(0, 16)}...`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

function formatInvalidationReport(changedCanonIds, invalidatedIus) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix VCS Selective Invalidation                            ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  lines.push(`📝 Changed requirements: ${changedCanonIds.length}`);
  for (const id of changedCanonIds) {
    lines.push(`   • ${id.slice(0, 16)}...`);
  }
  lines.push('');
  lines.push(`🎯 Invalidated IUs: ${invalidatedIus.length}`);
  for (const id of invalidatedIus) {
    lines.push(`   • IU-${id.slice(0, 16)}...`);
  }
  lines.push('');
  
  return lines.join('\n');
}

// === MAIN EXECUTION ===

const command = process.argv[2];

if (!command || command === '--help') {
  console.log('Phoenix Cascade');
  console.log('');
  console.log('Usage:');
  console.log('  node cascade.js cascade <iu-id>         Compute cascade');
  console.log('  node cascade.js invalidate <id> [id]      Selective invalidation');
  console.log('');
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
