/**
 * Phoenix VCS — Cascade Engine
 * 
 * Implements PRD Section 11: Cascading Failure Semantics
 * Graph-based failure propagation with explicit cascade actions.
 */

import type { EvidenceRecord, EvidenceStatus } from './evidence.js';

export interface IUNode {
  iu_id: string;
  dependencies: string[]; // IU IDs this IU depends on
  dependents: string[]; // IU IDs that depend on this IU
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
  output_files: string[];
}

export interface IUGraph {
  nodes: Map<string, IUNode>;
  edges: Array<{ from: string; to: string }>;
}

export type CascadeAction = 
  | { type: 'RETYPECHECK'; target_iu: string; reason: string }
  | { type: 'REBOUNDARY_CHECK'; target_iu: string; reason: string }
  | { type: 'RETEST'; target_iu: string; test_tags: string[]; reason: string }
  | { type: 'REGENERATE'; target_iu: string; reason: string }
  | { type: 'BLOCK'; target_iu: string; reason: string };

export interface CascadeEvent {
  source_iu: string;
  source_failure: string;
  timestamp: string;
  actions: CascadeAction[];
  affected_ius: string[];
}

/**
 * Build IU dependency graph from IU definitions.
 * Per PRD: Side-channel dependencies create graph edges for invalidation.
 */
export function buildDependencyGraph(ius: Array<{
  iu_id: string;
  dependencies?: string[];
  risk_tier: 'low' | 'medium' | 'high' | 'critical';
  output_files: string[];
}>): IUGraph {
  const nodes = new Map<string, IUNode>();
  const edges: Array<{ from: string; to: string }> = [];
  
  // First pass: create nodes
  for (const iu of ius) {
    nodes.set(iu.iu_id, {
      iu_id: iu.iu_id,
      dependencies: iu.dependencies || [],
      dependents: [], // Will fill in second pass
      risk_tier: iu.risk_tier,
      output_files: iu.output_files,
    });
  }
  
  // Second pass: establish edges and dependents
  for (const iu of ius) {
    const node = nodes.get(iu.iu_id);
    if (!node) continue;
    
    for (const depId of node.dependencies) {
      edges.push({ from: iu.iu_id, to: depId });
      
      // Add to dependent's list
      const depNode = nodes.get(depId);
      if (depNode && !depNode.dependents.includes(iu.iu_id)) {
        depNode.dependents.push(iu.iu_id);
      }
    }
  }
  
  return { nodes, edges };
}

/**
 * Get all transitive dependents of an IU (downstream dependencies).
 * Used when an IU fails - all dependents need re-validation.
 */
export function getTransitiveDependents(
  graph: IUGraph,
  iuId: string,
  visited: Set<string> = new Set()
): string[] {
  const node = graph.nodes.get(iuId);
  if (!node) return [];
  
  const result: string[] = [];
  
  for (const dependent of node.dependents) {
    if (visited.has(dependent)) continue;
    visited.add(dependent);
    
    result.push(dependent);
    // Recursively get their dependents
    result.push(...getTransitiveDependents(graph, dependent, visited));
  }
  
  return result;
}

/**
 * Get all transitive dependencies of an IU (upstream dependencies).
 * Used when regenerating - all dependencies must be valid first.
 */
export function getTransitiveDependencies(
  graph: IUGraph,
  iuId: string,
  visited: Set<string> = new Set()
): string[] {
  const node = graph.nodes.get(iuId);
  if (!node) return [];
  
  const result: string[] = [];
  
  for (const dep of node.dependencies) {
    if (visited.has(dep)) continue;
    visited.add(dep);
    
    result.push(dep);
    // Recursively get their dependencies
    result.push(...getTransitiveDependencies(graph, dep, visited));
  }
  
  return result;
}

/**
 * Compute cascade actions when an IU's evidence fails.
 * Per PRD Section 11: "Failure propagation is explicit and graph-based"
 */
export function computeCascade(
  graph: IUGraph,
  failedIuId: string,
  failureKind: EvidenceRecord['kind'],
  failureDetails: string
): CascadeEvent {
  const timestamp = new Date().toISOString();
  const actions: CascadeAction[] = [];
  const affectedIus = getTransitiveDependents(graph, failedIuId);
  
  // Source IU is blocked
  actions.push({
    type: 'BLOCK',
    target_iu: failedIuId,
    reason: `Evidence failure: ${failureKind} - ${failureDetails}`,
  });
  
  // For each dependent, determine required re-validation
  for (const dependentId of affectedIus) {
    const node = graph.nodes.get(dependentId);
    if (!node) continue;
    
    // Always re-run typecheck and boundary validation
    actions.push({
      type: 'RETYPECHECK',
      target_iu: dependentId,
      reason: `Type-safety check required: dependency ${failedIuId.slice(0, 8)}... failed`,
    });
    
    actions.push({
      type: 'REBOUNDARY_CHECK',
      target_iu: dependentId,
      reason: `Boundary validation required: dependency ${failedIuId.slice(0, 8)}... failed`,
    });
    
    // Re-run relevant tests
    // In a real system, we'd tag tests with dependencies
    actions.push({
      type: 'RETEST',
      target_iu: dependentId,
      test_tags: [failedIuId.slice(0, 8)], // Tag with dependency prefix
      reason: `Tests tagged with ${failedIuId.slice(0, 8)} must be re-run`,
    });
    
    // High/critical risk dependents may need regeneration
    if (node.risk_tier === 'high' || node.risk_tier === 'critical') {
      actions.push({
        type: 'REGENERATE',
        target_iu: dependentId,
        reason: `High-risk IU may be affected by ${failedIuId.slice(0, 8)}... failure`,
      });
    }
  }
  
  return {
    source_iu: failedIuId,
    source_failure: failureKind,
    timestamp,
    actions,
    affected_ius: affectedIus,
  };
}

/**
 * Compute selective invalidation when a spec changes.
 * Per PRD Section 0: "Changing one spec line invalidates only the dependent subtree"
 */
export function computeInvalidation(
  graph: IUGraph,
  changedCanonIds: string[],
  iuToCanonMap: Map<string, string[]> // IU ID -> canon IDs it implements
): string[] {
  const invalidated = new Set<string>();
  
  // Find all IUs that implement changed canonical requirements
  for (const [iuId, canonIds] of iuToCanonMap) {
    const hasOverlap = canonIds.some(canonId => changedCanonIds.includes(canonId));
    if (hasOverlap) {
      invalidated.add(iuId);
      
      // Add all transitive dependents (cascade invalidation)
      const dependents = getTransitiveDependents(graph, iuId);
      for (const dep of dependents) {
        invalidated.add(dep);
      }
    }
  }
  
  return Array.from(invalidated);
}

/**
 * Detect circular dependencies in the IU graph.
 */
export function detectCircularDependencies(graph: IUGraph): string[][] {
  const cycles: string[][] = [];
  const visited = new Set<string>();
  const recursionStack = new Set<string>();
  
  function dfs(nodeId: string, path: string[]): void {
    visited.add(nodeId);
    recursionStack.add(nodeId);
    path.push(nodeId);
    
    const node = graph.nodes.get(nodeId);
    if (node) {
      for (const dep of node.dependencies) {
        if (!visited.has(dep)) {
          dfs(dep, [...path]);
        } else if (recursionStack.has(dep)) {
          // Found cycle
          const cycleStart = path.indexOf(dep);
          cycles.push(path.slice(cycleStart));
        }
      }
    }
    
    recursionStack.delete(nodeId);
  }
  
  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      dfs(nodeId, []);
    }
  }
  
  return cycles;
}

/**
 * Topological sort of IUs for regeneration order.
 * Dependencies must be regenerated before dependents.
 */
export function topologicalSort(graph: IUGraph): string[] {
  const visited = new Set<string>();
  const tempMark = new Set<string>();
  const result: string[] = [];
  
  function visit(nodeId: string): void {
    if (tempMark.has(nodeId)) {
      throw new Error(`Circular dependency detected at ${nodeId}`);
    }
    if (visited.has(nodeId)) return;
    
    tempMark.add(nodeId);
    const node = graph.nodes.get(nodeId);
    
    if (node) {
      for (const dep of node.dependencies) {
        visit(dep);
      }
    }
    
    tempMark.delete(nodeId);
    visited.add(nodeId);
    result.push(nodeId);
  }
  
  for (const nodeId of graph.nodes.keys()) {
    if (!visited.has(nodeId)) {
      visit(nodeId);
    }
  }
  
  return result;
}

/**
 * Format cascade event for display
 */
export function formatCascadeEvent(event: CascadeEvent): string {
  const lines: string[] = [];
  lines.push('⚡ Phoenix VCS Cascade Event');
  lines.push(`   Source: ${event.source_iu.slice(0, 8)}... (${event.source_failure})`);
  lines.push(`   Time: ${event.timestamp}`);
  lines.push(`   Affected IUs: ${event.affected_ius.length}`);
  lines.push('');
  
  // Group actions by type
  const byType = new Map<string, CascadeAction[]>();
  for (const action of event.actions) {
    const list = byType.get(action.type) || [];
    list.push(action);
    byType.set(action.type, list);
  }
  
  for (const [type, actions] of byType) {
    lines.push(`   ${type}:`);
    for (const action of actions) {
      lines.push(`      → ${action.target_iu.slice(0, 8)}...`);
      lines.push(`        ${action.reason}`);
    }
    lines.push('');
  }
  
  return lines.join('\n');
}

/**
 * Format invalidation report
 */
export function formatInvalidationReport(
  changedCanonIds: string[],
  invalidatedIus: string[]
): string {
  const lines: string[] = [];
  lines.push('🎯 Phoenix VCS Selective Invalidation');
  lines.push('');
  lines.push(`Changed requirements: ${changedCanonIds.length}`);
  for (const canonId of changedCanonIds.slice(0, 5)) {
    lines.push(`   ${canonId.slice(0, 8)}...`);
  }
  if (changedCanonIds.length > 5) {
    lines.push(`   ... and ${changedCanonIds.length - 5} more`);
  }
  lines.push('');
  lines.push(`Invalidated IUs: ${invalidatedIus.length}`);
  for (const iuId of invalidatedIus) {
    lines.push(`   ${iuId.slice(0, 8)}...`);
  }
  lines.push('');
  lines.push(`Selective rate: ${invalidatedIus.length > 0 ? 'partial' : 'none'}`);
  
  return lines.join('\n');
}
