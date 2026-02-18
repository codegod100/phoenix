/**
 * Boundary Validator (Architectural Linter)
 *
 * Validates extracted dependencies against an IU's boundary policy.
 * Produces diagnostics for violations.
 */

import type { ImplementationUnit, BoundaryPolicy, EnforcementConfig } from './models/iu.js';
import type { DependencyGraph } from './dep-extractor.js';
import type { Diagnostic } from './models/diagnostic.js';

/**
 * Validate a dependency graph against an IU's boundary policy.
 */
export function validateBoundary(
  depGraph: DependencyGraph,
  iu: ImplementationUnit,
  iuIdToName?: Map<string, string>,
): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  const policy = iu.boundary_policy;
  const enforcement = iu.enforcement;

  // Validate imports
  for (const dep of depGraph.imports) {
    if (dep.is_relative) {
      // Check against forbidden_paths
      for (const forbidden of policy.code.forbidden_paths) {
        if (matchGlob(dep.source, forbidden)) {
          diagnostics.push({
            severity: enforcement.dependency_violation.severity,
            category: 'dependency_violation',
            subject: dep.source,
            message: `Import "${dep.source}" matches forbidden path pattern "${forbidden}"`,
            iu_id: iu.iu_id,
            source_file: depGraph.file_path,
            source_line: dep.source_line,
            recommended_actions: ['Remove the import or update boundary policy'],
          });
        }
      }
    } else {
      // Package import — check forbidden + allowed
      const pkgName = extractPackageName(dep.source);

      // Check forbidden packages (takes priority)
      if (policy.code.forbidden_packages.includes(pkgName)) {
        diagnostics.push({
          severity: enforcement.dependency_violation.severity,
          category: 'dependency_violation',
          subject: pkgName,
          message: `Package "${pkgName}" is forbidden by boundary policy`,
          iu_id: iu.iu_id,
          source_file: depGraph.file_path,
          source_line: dep.source_line,
          recommended_actions: ['Remove the dependency or update boundary policy'],
        });
      } else if (policy.code.allowed_packages.length > 0 && !policy.code.allowed_packages.includes(pkgName)) {
        // If allowed_packages is non-empty, check allowlist (only if not already caught by forbidden)
        diagnostics.push({
          severity: enforcement.dependency_violation.severity,
          category: 'dependency_violation',
          subject: pkgName,
          message: `Package "${pkgName}" is not in the allowed packages list`,
          iu_id: iu.iu_id,
          source_file: depGraph.file_path,
          source_line: dep.source_line,
          recommended_actions: [`Add "${pkgName}" to allowed_packages or remove the import`],
        });
      }
    }
  }

  // Validate side channels
  for (const sc of depGraph.side_channels) {
    const policyKey = sideChannelPolicyKey(sc.kind);
    const allowed = (policy.side_channels as Record<string, string[]>)[policyKey] ?? [];

    if (allowed.length === 0 || !allowed.includes(sc.identifier)) {
      diagnostics.push({
        severity: enforcement.side_channel_violation.severity,
        category: 'side_channel_violation',
        subject: sc.identifier,
        message: `Undeclared ${sc.kind} side channel: "${sc.identifier}"`,
        iu_id: iu.iu_id,
        source_file: depGraph.file_path,
        source_line: sc.source_line,
        recommended_actions: [
          `Declare "${sc.identifier}" in boundary_policy.side_channels.${policyKey}`,
          'Or remove the side-channel usage',
        ],
      });
    }
  }

  return diagnostics;
}

/**
 * Validate multiple files for one IU.
 */
export function validateIU(
  depGraphs: DependencyGraph[],
  iu: ImplementationUnit,
): Diagnostic[] {
  return depGraphs.flatMap(g => validateBoundary(g, iu));
}

/**
 * Detect boundary policy changes between two versions of an IU.
 */
export interface UnitBoundaryChange {
  iu_id: string;
  iu_name: string;
  changes: string[];
}

export function detectBoundaryChanges(
  before: ImplementationUnit,
  after: ImplementationUnit,
): UnitBoundaryChange | null {
  const changes: string[] = [];
  const bp = before.boundary_policy;
  const ap = after.boundary_policy;

  // Compare code policies
  for (const key of ['allowed_ius', 'allowed_packages', 'forbidden_ius', 'forbidden_packages', 'forbidden_paths'] as const) {
    const bv = JSON.stringify(bp.code[key].sort());
    const av = JSON.stringify(ap.code[key].sort());
    if (bv !== av) {
      changes.push(`code.${key} changed`);
    }
  }

  // Compare side channel policies
  for (const key of ['databases', 'queues', 'caches', 'config', 'external_apis', 'files'] as const) {
    const bv = JSON.stringify(bp.side_channels[key].sort());
    const av = JSON.stringify(ap.side_channels[key].sort());
    if (bv !== av) {
      changes.push(`side_channels.${key} changed`);
    }
  }

  if (changes.length === 0) return null;
  return { iu_id: after.iu_id, iu_name: after.name, changes };
}

/**
 * Simple glob matching (supports * and ** wildcards).
 */
function matchGlob(path: string, pattern: string): boolean {
  const regex = pattern
    .replace(/\*\*/g, '<<<GLOBSTAR>>>')
    .replace(/\*/g, '[^/]*')
    .replace(/<<<GLOBSTAR>>>/g, '.*');
  return new RegExp(`^${regex}$`).test(path);
}

/**
 * Extract npm package name from import specifier.
 * Handles scoped packages: @scope/pkg/sub → @scope/pkg
 */
function extractPackageName(specifier: string): string {
  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.slice(0, 2).join('/');
  }
  return specifier.split('/')[0];
}

function sideChannelPolicyKey(kind: string): string {
  switch (kind) {
    case 'external_api': return 'external_apis';
    case 'database': return 'databases';
    case 'queue': return 'queues';
    case 'cache': return 'caches';
    case 'file': return 'files';
    case 'config': return 'config';
    default: return kind;
  }
}
