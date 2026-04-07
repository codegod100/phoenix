/**
 * Graph operations - Cascade and selective invalidation
 */

/**
 * Build dependency graph from IUs
 */
export function buildDependencyGraph(ius) {
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

/**
 * Get transitive dependents (what depends on this IU)
 */
export function getTransitiveDependents(graph, iuId, visited = new Set()) {
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

/**
 * Compute cascade actions when evidence fails
 */
export function computeCascade(graph, failedIuId, evidenceKind, failureReason) {
  const affected = getTransitiveDependents(graph, failedIuId);
  const failedNode = graph.nodes.get(failedIuId);
  
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
    cascade_depth: Math.max(0, ...affected.map(id => {
      let depth = 0;
      let current = id;
      while (current !== failedIuId) {
        const deps = graph.edges.get(current) || [];
        if (deps.includes(failedIuId)) break;
        depth++;
        current = deps[0];
        if (!current) break;
      }
      return depth;
    }))
  };
}

/**
 * Compute selective invalidation from changed canon IDs
 */
export function computeInvalidation(graph, changedCanonIds, iuToCanonMap) {
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

/**
 * Format cascade event for display
 */
export function formatCascadeEvent(event) {
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

/**
 * Format invalidation report
 */
export function formatInvalidationReport(changedCanonIds, invalidatedIus) {
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
