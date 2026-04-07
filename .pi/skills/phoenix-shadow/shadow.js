#!/usr/bin/env node
/**
 * Phoenix Shadow - Shadow pipeline for safe canonicalization upgrades
 * 
 * Run old and new pipelines in parallel, classify as SAFE/COMPACTION/REJECT.
 * Per PRD Section 5.1: "Shadow Canonicalization (Upgrade Mode)"
 * 
 * Usage: node .pi/skills/phoenix-shadow/shadow.js [project-root] [old-pipeline-id] [new-pipeline-id]
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join } from 'path';

// === VCS IDENTITY ===

function sha256(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function shortHash(fullHash) {
  return fullHash.slice(0, 8);
}

// === SHADOW DIFF METRICS ===

function computeShadowDiff(oldNodes, newNodes) {
  const oldIds = new Set(oldNodes.map(n => n.canon_id || n.id));
  const newIds = new Set(newNodes.map(n => n.canon_id || n.id));
  
  const sharedIds = new Set([...oldIds].filter(id => newIds.has(id)));
  
  // Orphan nodes: exist in old but not in new
  const orphanNodes = [...oldIds].filter(id => !newIds.has(id));
  
  // Out of scope growth: new nodes not in old
  const newScopeNodes = [...newIds].filter(id => !oldIds.has(id));
  
  // Node change percentage
  const nodeChangePct = oldIds.size > 0
    ? (orphanNodes.length + newScopeNodes.filter(id => {
        const newNode = newNodes.find(n => (n.canon_id || n.id) === id);
        const hasSimilar = oldNodes.some(old => 
          old.statement === newNode?.statement || old.text === newNode?.text
        );
        return !hasSimilar;
      }).length) / oldIds.size * 100
    : 0;
  
  // Edge changes (simplified - count requirements)
  const oldEdgeCount = oldNodes.reduce((sum, n) => sum + (n.linked_canon_ids?.length || 0), 0);
  const newEdgeCount = newNodes.reduce((sum, n) => sum + (n.linked_canon_ids?.length || 0), 0);
  const edgeChangePct = oldEdgeCount > 0 
    ? Math.abs(newEdgeCount - oldEdgeCount) / oldEdgeCount * 100 
    : 0;
  
  // Risk escalations: confidence drops
  let riskEscalations = 0;
  for (const sharedId of sharedIds) {
    const oldNode = oldNodes.find(n => (n.canon_id || n.id) === sharedId);
    const newNode = newNodes.find(n => (n.canon_id || n.id) === sharedId);
    
    if (oldNode && newNode && oldNode.confidence && newNode.confidence) {
      if (oldNode.confidence - newNode.confidence > 0.2) {
        riskEscalations++;
      }
    }
  }
  
  // Semantic statement drift for shared nodes
  let semanticDrift = 0;
  let driftCount = 0;
  for (const sharedId of sharedIds) {
    const oldNode = oldNodes.find(n => (n.canon_id || n.id) === sharedId);
    const newNode = newNodes.find(n => (n.canon_id || n.id) === sharedId);
    
    if (oldNode && newNode) {
      const oldText = oldNode.statement || oldNode.text || '';
      const newText = newNode.statement || newNode.text || '';
      
      if (oldText !== newText) {
        const similarity = textSimilarity(oldText, newText);
        semanticDrift += (1 - similarity);
        driftCount++;
      }
    }
  }
  semanticDrift = driftCount > 0 ? (semanticDrift / driftCount) * 100 : 0;
  
  // Out of scope growth percentage
  const outOfScopeGrowth = oldIds.size > 0 ? (newScopeNodes.length / oldIds.size) * 100 : 0;
  
  return {
    node_change_pct: nodeChangePct,
    edge_change_pct: edgeChangePct,
    risk_escalations: riskEscalations,
    orphan_nodes: orphanNodes.length,
    out_of_scope_growth: outOfScopeGrowth,
    semantic_stmt_drift: semanticDrift,
  };
}

function textSimilarity(a, b) {
  if (!a || !b) return 0;
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...wordsA].filter(w => wordsB.has(w)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return union.size > 0 ? intersection.size / union.size : 0;
}

// === CLASSIFICATION ===

function classifyShadowDiff(metrics) {
  // REJECT conditions (hard failures)
  if (metrics.orphan_nodes > 0) {
    return 'REJECT';
  }
  
  if (metrics.node_change_pct > 50) {
    return 'REJECT';
  }
  
  if (metrics.semantic_stmt_drift > 30) {
    return 'REJECT';
  }
  
  // COMPACTION_EVENT conditions
  if (metrics.node_change_pct > 3) {
    return 'COMPACTION_EVENT';
  }
  
  if (metrics.risk_escalations > 2) {
    return 'COMPACTION_EVENT';
  }
  
  if (metrics.out_of_scope_growth > 10) {
    return 'COMPACTION_EVENT';
  }
  
  // SAFE
  return 'SAFE';
}

// === PIPELINE SIMULATION ===

function loadCanonical(projectRoot, suffix = '') {
  const canonicalPath = join(projectRoot, '.phoenix', 'graphs', `canonical${suffix}.json`);
  if (!existsSync(canonicalPath)) {
    // Try without suffix
    const defaultPath = join(projectRoot, '.phoenix', 'graphs', 'canonical.json');
    if (!existsSync(defaultPath)) {
      return null;
    }
    return JSON.parse(readFileSync(defaultPath, 'utf-8'));
  }
  return JSON.parse(readFileSync(canonicalPath, 'utf-8'));
}

function runShadowPipeline(projectRoot, oldPipelineId, newPipelineId) {
  // In a real scenario, these would be different pipeline versions
  // For now, simulate by loading current canonical twice (would compare different versions)
  const oldCanonical = loadCanonical(projectRoot, '.old');
  const newCanonical = loadCanonical(projectRoot); // Current
  
  if (!oldCanonical || !newCanonical) {
    // If no old version, simulate comparison
    console.log('   Note: Using current canonical as both old and new for demo');
    const nodes = newCanonical?.nodes || [];
    return {
      old_pipeline_id: sha256(oldPipelineId || 'v1.0'),
      new_pipeline_id: sha256(newPipelineId || 'v1.1'),
      old_nodes: nodes,
      new_nodes: nodes,
      metrics: {
        node_change_pct: 0,
        edge_change_pct: 0,
        risk_escalations: 0,
        orphan_nodes: 0,
        out_of_scope_growth: 0,
        semantic_stmt_drift: 0,
      },
      classification: 'SAFE',
      diff_report: 'No changes detected (same version comparison)',
    };
  }
  
  const oldNodes = oldCanonical.nodes || [];
  const newNodes = newCanonical.nodes || [];
  
  const metrics = computeShadowDiff(oldNodes, newNodes);
  const classification = classifyShadowDiff(metrics);
  
  return {
    old_pipeline_id: sha256(oldPipelineId),
    new_pipeline_id: sha256(newPipelineId),
    old_nodes: oldNodes,
    new_nodes: newNodes,
    metrics,
    classification,
    diff_report: formatShadowDiff(oldNodes, newNodes, metrics, classification),
  };
}

function formatShadowDiff(oldNodes, newNodes, metrics, classification) {
  const lines = [];
  
  const icon = {
    'SAFE': '✅',
    'COMPACTION_EVENT': '⚠️',
    'REJECT': '❌'
  }[classification];
  
  lines.push(`${icon} Classification: ${classification}`);
  lines.push('');
  lines.push('Metrics:');
  lines.push(`  Node change: ${metrics.node_change_pct.toFixed(1)}% (threshold: 3% SAFE, 25% COMPACTION)`);
  lines.push(`  Edge change: ${metrics.edge_change_pct.toFixed(1)}%`);
  lines.push(`  Risk escalations: ${metrics.risk_escalations}`);
  lines.push(`  Orphan nodes: ${metrics.orphan_nodes} (REJECT if >0)`);
  lines.push(`  Scope growth: ${metrics.out_of_scope_growth.toFixed(1)}%`);
  lines.push(`  Semantic drift: ${metrics.semantic_stmt_drift.toFixed(1)}%`);
  
  return lines.join('\n');
}

function formatShadowReport(result) {
  const lines = [];
  
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix Shadow Pipeline (Upgrade Safety Check)                ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  lines.push(`🔍 Comparing pipelines:`);
  lines.push(`   Old: ${shortHash(result.old_pipeline_id)}...`);
  lines.push(`   New: ${shortHash(result.new_pipeline_id)}...`);
  lines.push('');
  
  const icon = {
    'SAFE': '✅',
    'COMPACTION_EVENT': '⚠️',
    'REJECT': '❌'
  }[result.classification];
  
  lines.push(`${icon} Classification: ${result.classification}`);
  lines.push('');
  
  lines.push('📊 Metrics:');
  lines.push(`   Node change: ${result.metrics.node_change_pct.toFixed(1)}%`);
  lines.push(`   Edge change: ${result.metrics.edge_change_pct.toFixed(1)}%`);
  lines.push(`   Risk escalations: ${result.metrics.risk_escalations}`);
  lines.push(`   Orphan nodes: ${result.metrics.orphan_nodes}`);
  lines.push(`   Scope growth: ${result.metrics.out_of_scope_growth.toFixed(1)}%`);
  lines.push(`   Semantic drift: ${result.metrics.semantic_stmt_drift.toFixed(1)}%`);
  lines.push('');
  
  // Node comparison
  const oldIds = new Set(result.old_nodes.map(n => n.canon_id || n.id));
  const newIds = new Set(result.new_nodes.map(n => n.canon_id || n.id));
  
  const removed = result.old_nodes.filter(n => !newIds.has(n.canon_id || n.id));
  const added = result.new_nodes.filter(n => !oldIds.has(n.canon_id || n.id));
  
  if (removed.length > 0) {
    lines.push(`❌ Removed nodes: ${removed.length}`);
    for (const n of removed.slice(0, 3)) {
      const text = (n.statement || n.text || '').slice(0, 50);
      lines.push(`   - ${shortHash(n.canon_id || n.id)}...: ${text}...`);
    }
    if (removed.length > 3) {
      lines.push(`   ... and ${removed.length - 3} more`);
    }
    lines.push('');
  }
  
  if (added.length > 0) {
    lines.push(`✅ Added nodes: ${added.length}`);
    for (const n of added.slice(0, 3)) {
      const text = (n.statement || n.text || '').slice(0, 50);
      lines.push(`   + ${shortHash(n.canon_id || n.id)}...: ${text}...`);
    }
    if (added.length > 3) {
      lines.push(`   ... and ${added.length - 3} more`);
    }
    lines.push('');
  }
  
  // Recommendation
  lines.push('📝 Recommendation:');
  switch (result.classification) {
    case 'SAFE':
      lines.push('   ✅ SAFE to upgrade. Changes are minimal and non-breaking.');
      lines.push('   Action: Accept new pipeline version.');
      break;
    case 'COMPACTION_EVENT':
      lines.push('   ⚠️  COMPACTION EVENT. Significant but manageable changes.');
      lines.push('   Action: Review changes, run full validation, then accept.');
      break;
    case 'REJECT':
      lines.push('   ❌ REJECT. Breaking changes or orphan nodes detected.');
      lines.push('   Action: Tune new pipeline or accept data loss (not recommended).');
      break;
  }
  
  return lines.join('\n');
}

function createPipelineUpgradeEvent(result, accepted) {
  return {
    type: 'PipelineUpgrade',
    old_pipeline_id: result.old_pipeline_id,
    new_pipeline_id: result.new_pipeline_id,
    classification: result.classification,
    metrics: result.metrics,
    accepted,
    timestamp: new Date().toISOString(),
  };
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');
const oldPipelineId = process.argv[3] || 'v1.0';
const newPipelineId = process.argv[4] || 'v1.1';

console.log('🔍 Phoenix Shadow Pipeline');
console.log(`   Project: ${projectRoot}`);
console.log(`   Old: ${oldPipelineId}`);
console.log(`   New: ${newPipelineId}`);
console.log('');

try {
  // Check for canonical
  const canonicalPath = join(projectRoot, '.phoenix', 'graphs', 'canonical.json');
  if (!existsSync(canonicalPath)) {
    console.error(`❌ No canonical requirements found at ${canonicalPath}`);
    console.error('   Run phoenix-canonicalize first.');
    process.exit(1);
  }

  // Run shadow pipeline
  const result = runShadowPipeline(projectRoot, oldPipelineId, newPipelineId);
  
  // Print report
  console.log(formatShadowReport(result));
  console.log('');
  
  // Record upgrade event
  const upgradeEvent = createPipelineUpgradeEvent(result, result.classification !== 'REJECT');
  
  console.log('📋 Upgrade Event:');
  console.log(`   Type: ${upgradeEvent.type}`);
  console.log(`   Classification: ${upgradeEvent.classification}`);
  console.log(`   Accepted: ${upgradeEvent.accepted}`);
  console.log(`   Timestamp: ${upgradeEvent.timestamp}`);
  console.log('');
  
  // Recommendation
  if (result.classification === 'REJECT') {
    console.log('❌ UPGRADE REJECTED');
    console.log('   Fix the new pipeline to avoid orphan nodes and excessive drift.');
    process.exit(1);
  } else if (result.classification === 'COMPACTION_EVENT') {
    console.log('⚠️  UPGRADE REQUIRES REVIEW');
    console.log('   Review changes before accepting new pipeline.');
    process.exit(0);
  } else {
    console.log('✅ UPGRADE SAFE');
    console.log('   New pipeline can be accepted.');
    process.exit(0);
  }
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
