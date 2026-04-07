/**
 * Phoenix VCS — Boundary Validator
 * 
 * Implements PRD Section 7 & 7.1: Boundary Policy Schema and Architectural Linter
 * Validates that generated code respects declared dependencies and side-channels.
 */

import { readFileSync } from 'node:fs';

export interface BoundaryPolicy {
  dependencies: {
    code: {
      allowed_ius?: string[];
      allowed_packages?: string[];
      forbidden_ius?: string[];
      forbidden_packages?: string[];
      forbidden_paths?: string[];
    };
    side_channels: {
      databases?: string[];
      queues?: string[];
      caches?: string[];
      config?: string[];
      external_apis?: string[];
      files?: string[];
    };
  };
}

export interface EnforcementConfig {
  dependency_violation: {
    severity: 'error' | 'warning';
  };
  side_channel_violation: {
    severity: 'warning' | 'error';
  };
}

export interface ExtractedDependency {
  type: 'iu_import' | 'package_import' | 'side_channel';
  source: string; // The IU or file where found
  target: string; // What's being imported/used
  line?: number;
  column?: number;
}

export interface ValidationDiagnostic {
  severity: 'error' | 'warning';
  category: 'boundary' | 'side_channel' | 'dependency';
  subject: string; // IU or file
  message: string;
  recommendation: string;
}

export interface BoundaryValidationResult {
  iu_id: string;
  file: string;
  diagnostics: ValidationDiagnostic[];
  has_errors: boolean;
  has_warnings: boolean;
  dependency_graph: ExtractedDependency[];
}

/**
 * Default boundary policy per PRD
 */
export function defaultBoundaryPolicy(): BoundaryPolicy {
  return {
    dependencies: {
      code: {
        allowed_ius: [],
        allowed_packages: [],
        forbidden_ius: [],
        forbidden_packages: [],
        forbidden_paths: [],
      },
      side_channels: {
        databases: [],
        queues: [],
        caches: [],
        config: [],
        external_apis: [],
        files: [],
      },
    },
  };
}

/**
 * Extract dependencies from TypeScript/JavaScript source code.
 * This is a simplified parser - a real implementation would use AST parsing.
 */
export function extractDependencies(sourceCode: string, filePath: string): ExtractedDependency[] {
  const deps: ExtractedDependency[] = [];
  const lines = sourceCode.split('\n');
  
  // Match import statements
  const importRegex = /import\s+(?:(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"];?/g;
  // Match require statements
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  // Match database/queue/cache side channels
  const sideChannelPatterns = [
    { type: 'database', regex: /new\s+(?:Database|SQLite|better-sqlite3|pg|mysql|redis)/i },
    { type: 'queue', regex: /new\s+(?:Queue|Bull|RabbitMQ|Kafka|SQS)/i },
    { type: 'cache', regex: /new\s+(?:Cache|Redis|Memcached)/i },
    { type: 'external_api', regex: /fetch\s*\(|axios|https?\.request/i },
    { type: 'file', regex: /fs\.(?:read|write|append)|readFile|writeFile/i },
  ];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Check imports
    let match;
    while ((match = importRegex.exec(line)) !== null) {
      const importPath = match[1];
      
      // Categorize the import
      let type: ExtractedDependency['type'] = 'package_import';
      if (importPath.startsWith('./') || importPath.startsWith('../')) {
        // Could be IU import - check if it points to generated directory
        if (importPath.includes('generated')) {
          type = 'iu_import';
        }
      }
      
      deps.push({
        type,
        source: filePath,
        target: importPath,
        line: lineNum,
        column: match.index,
      });
    }
    
    // Check requires
    while ((match = requireRegex.exec(line)) !== null) {
      deps.push({
        type: 'package_import',
        source: filePath,
        target: match[1],
        line: lineNum,
        column: match.index,
      });
    }
    
    // Check side channels
    for (const pattern of sideChannelPatterns) {
      if (pattern.regex.test(line)) {
        deps.push({
          type: 'side_channel',
          source: filePath,
          target: `${pattern.type}_usage`,
          line: lineNum,
        });
      }
    }
  }
  
  return deps;
}

/**
 * Validate boundary policy against extracted dependencies.
 * Per PRD 7.1: "Post-generation: Extract dependency graph, Validate against boundary policy"
 */
export function validateBoundary(
  iuId: string,
  filePath: string,
  sourceCode: string,
  policy: BoundaryPolicy,
  enforcement: EnforcementConfig
): BoundaryValidationResult {
  const deps = extractDependencies(sourceCode, filePath);
  const diagnostics: ValidationDiagnostic[] = [];
  
  // Check forbidden IU imports
  if (policy.dependencies.code.forbidden_ius) {
    for (const forbidden of policy.dependencies.code.forbidden_ius) {
      const violations = deps.filter(
        d => d.type === 'iu_import' && d.target.includes(forbidden)
      );
      
      for (const v of violations) {
        const severity = enforcement.dependency_violation.severity;
        diagnostics.push({
          severity,
          category: 'boundary',
          subject: iuId,
          message: `Forbidden IU import: ${forbidden} at line ${v.line}`,
          recommendation: `Remove import or update boundary policy to allow ${forbidden}`,
        });
      }
    }
  }
  
  // Check forbidden packages
  if (policy.dependencies.code.forbidden_packages) {
    for (const forbidden of policy.dependencies.code.forbidden_packages) {
      const violations = deps.filter(
        d => d.type === 'package_import' && d.target === forbidden
      );
      
      for (const v of violations) {
        const severity = enforcement.dependency_violation.severity;
        diagnostics.push({
          severity,
          category: 'dependency',
          subject: iuId,
          message: `Forbidden package: ${forbidden} at line ${v.line}`,
          recommendation: `Remove ${forbidden} or add to allowed_packages`,
        });
      }
    }
  }
  
  // Check undeclared side channels
  const declaredSideChannels = new Set([
    ...(policy.dependencies.side_channels.databases || []),
    ...(policy.dependencies.side_channels.queues || []),
    ...(policy.dependencies.side_channels.caches || []),
    ...(policy.dependencies.side_channels.external_apis || []),
    ...(policy.dependencies.side_channels.files || []),
  ]);
  
  const sideChannelDeps = deps.filter(d => d.type === 'side_channel');
  
  for (const sc of sideChannelDeps) {
    // Extract side channel type from target
    const channelType = sc.target.replace('_usage', '');
    
    // Check if this channel type is declared in policy
    const isDeclared = declaredSideChannels.has(channelType) ||
      declaredSideChannels.has(sc.target) ||
      declaredSideChannels.has('*'); // Wildcard allows any
    
    if (!isDeclared) {
      const severity = enforcement.side_channel_violation.severity;
      diagnostics.push({
        severity,
        category: 'side_channel',
        subject: iuId,
        message: `Undeclared side channel: ${channelType} at line ${sc.line}`,
        recommendation: `Add ${channelType} to boundary policy or refactor to use dependency injection`,
      });
    }
  }
  
  const has_errors = diagnostics.some(d => d.severity === 'error');
  const has_warnings = diagnostics.some(d => d.severity === 'warning');
  
  return {
    iu_id: iuId,
    file: filePath,
    diagnostics,
    has_errors,
    has_warnings,
    dependency_graph: deps,
  };
}

/**
 * Detect boundary changes between two versions of an IU.
 * Per PRD: Changes to dependencies trigger cascade re-validation.
 */
export interface UnitBoundaryChange {
  iu_id: string;
  added_deps: ExtractedDependency[];
  removed_deps: ExtractedDependency[];
  severity: 'minor' | 'major' | 'breaking';
}

export function detectBoundaryChanges(
  iuId: string,
  oldSource: string,
  newSource: string,
  filePath: string
): UnitBoundaryChange {
  const oldDeps = extractDependencies(oldSource, filePath);
  const newDeps = extractDependencies(newSource, filePath);
  
  const oldTargets = new Set(oldDeps.map(d => d.target));
  const newTargets = new Set(newDeps.map(d => d.target));
  
  const added = newDeps.filter(d => !oldTargets.has(d.target));
  const removed = oldDeps.filter(d => !newTargets.has(d.target));
  
  // Determine severity
  let severity: 'minor' | 'major' | 'breaking' = 'minor';
  
  // Added side channels are major
  if (added.some(d => d.type === 'side_channel')) {
    severity = 'major';
  }
  
  // Removed dependencies that others rely on could be breaking
  if (removed.length > 0 && added.length === 0) {
    severity = 'breaking'; // Contract narrowing
  }
  
  return {
    iu_id: iuId,
    added_deps: added,
    removed_deps: removed,
    severity,
  };
}

/**
 * Format boundary validation results for display
 */
export function formatBoundaryReport(results: BoundaryValidationResult[]): string {
  const lines: string[] = [];
  lines.push('🏗️  Phoenix VCS Boundary Validation');
  lines.push('');
  
  const withIssues = results.filter(r => r.diagnostics.length > 0);
  const clean = results.filter(r => r.diagnostics.length === 0);
  
  if (withIssues.length > 0) {
    lines.push('❌ VIOLATIONS DETECTED');
    lines.push('');
    
    for (const result of withIssues) {
      lines.push(`IU: ${result.iu_id.slice(0, 8)}... (${result.file})`);
      
      for (const diag of result.diagnostics) {
        const icon = diag.severity === 'error' ? '  ❌' : '  ⚠️';
        lines.push(`${icon} [${diag.category.toUpperCase()}] ${diag.message}`);
        lines.push(`      → ${diag.recommendation}`);
      }
      lines.push('');
    }
  }
  
  lines.push(`✅ Clean: ${clean.length} IUs`);
  lines.push(`⚠️  With issues: ${withIssues.length} IUs`);
  lines.push('');
  
  const hasErrors = results.some(r => r.has_errors);
  if (hasErrors) {
    lines.push('Status: 🔴 REJECTED - Boundary policy violations detected');
  } else if (withIssues.length > 0) {
    lines.push('Status: 🟡 WARNING - Non-blocking boundary issues');
  } else {
    lines.push('Status: 🟢 ACCEPTED - All boundaries respected');
  }
  
  return lines.join('\n');
}
