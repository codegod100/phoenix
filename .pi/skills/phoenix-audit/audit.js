#!/usr/bin/env node
/**
 * Phoenix Audit - Boundary validation and architectural linting
 * 
 * Validates that generated code respects declared dependencies and side-channels.
 * Per PRD Section 7 & 7.1: Boundary Policy Schema and Architectural Linter
 * 
 * Usage: node .pi/skills/phoenix-audit/audit.js <file-path>
 */

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { resolve, join, relative, basename } from 'path';

// === FILE WALKER ===

function findFiles(dir, extension = '.ts') {
  const files = [];
  
  function walk(currentDir) {
    const entries = readdirSync(currentDir);
    for (const entry of entries) {
      const fullPath = join(currentDir, entry);
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        walk(fullPath);
      } else if (entry.endsWith(extension) && !entry.endsWith('.test.ts')) {
        files.push(fullPath);
      }
    }
  }
  
  if (existsSync(dir)) {
    walk(dir);
  }
  
  return files;
}

// === VCS BOUNDARY VALIDATION (from src/vcs/boundary.ts) ===

function defaultBoundaryPolicy() {
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

function extractDependencies(sourceCode, filePath) {
  const deps = [];
  const lines = sourceCode.split('\n');
  
  // Match import statements
  const importRegex = /import\s+(?:(?:{[^}]*}|\*\s+as\s+\w+|\w+)\s+from\s+)?['"]([^'"]+)['"];?/g;
  // Match require statements
  const requireRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  // Match side channel patterns
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
      let type = 'package_import';
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

function validateBoundary(iuId, filePath, sourceCode, policy, enforcement) {
  const deps = extractDependencies(sourceCode, filePath);
  const diagnostics = [];
  
  // Check forbidden IU imports
  if (policy.dependencies?.code?.forbidden_ius) {
    for (const forbidden of policy.dependencies.code.forbidden_ius) {
      const violations = deps.filter(
        d => d.type === 'iu_import' && d.target.includes(forbidden)
      );
      
      for (const v of violations) {
        const severity = enforcement?.dependency_violation?.severity || 'error';
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
  if (policy.dependencies?.code?.forbidden_packages) {
    for (const forbidden of policy.dependencies.code.forbidden_packages) {
      const violations = deps.filter(
        d => d.type === 'package_import' && d.target === forbidden
      );
      
      for (const v of violations) {
        const severity = enforcement?.dependency_violation?.severity || 'error';
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
    ...(policy.dependencies?.side_channels?.databases || []),
    ...(policy.dependencies?.side_channels?.queues || []),
    ...(policy.dependencies?.side_channels?.caches || []),
    ...(policy.dependencies?.side_channels?.external_apis || []),
    ...(policy.dependencies?.side_channels?.files || []),
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
      const severity = enforcement?.side_channel_violation?.severity || 'warning';
      diagnostics.push({
        severity,
        category: 'side_channel',
        subject: iuId,
        message: `Undeclared side channel: ${channelType} at line ${sc.line}`,
        recommendation: `Add ${channelType} to boundary policy or refactor to use dependency injection`,
      });
    }
  }
  
  // Check for phoenix traceability comment (supports both IU and deliverable formats)
  const hasPhoenixComment = sourceCode.includes('@phoenix-iu:') || sourceCode.includes('@phoenix-deliverable:');
  
  if (!hasPhoenixComment) {
    diagnostics.push({
      severity: 'error',
      category: 'traceability',
      subject: iuId,
      message: `Missing @phoenix-iu or @phoenix-deliverable traceability comment`,
      recommendation: `Add // @phoenix-iu: <hash> or // @phoenix-deliverable: <type> comment at top of file`,
    });
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
    summary: {
      errors: diagnostics.filter(d => d.severity === 'error').length,
      warnings: diagnostics.filter(d => d.severity === 'warning').length,
      imports_checked: deps.filter(d => d.type !== 'side_channel').length,
      side_channels_detected: sideChannelDeps.map(d => d.target.replace('_usage', '')),
    }
  };
}

function formatBoundaryReport(results) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix VCS Boundary Validation                               ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
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

// === MAIN EXECUTION ===

const inputPath = process.argv[2];

if (!inputPath) {
  console.error('Usage: node audit.js <project-root|file-path>');
  console.error('Example: node audit.js examples/taskflow');
  console.error('Example: node audit.js src/generated/app/dashboard.ts');
  process.exit(1);
}

const projectRoot = resolve(inputPath);

if (!existsSync(projectRoot)) {
  console.error(`❌ Path not found: ${inputPath}`);
  process.exit(1);
}

console.log('🔍 Phoenix Audit');

const stat = statSync(projectRoot);
let filesToAudit = [];

if (stat.isDirectory()) {
  // Project root - find all generated files
  const generatedDir = join(projectRoot, 'src', 'generated');
  filesToAudit = findFiles(generatedDir, '.ts');
  console.log(`   Project: ${relative(resolve('.'), projectRoot)}`);
  console.log(`   Files: ${filesToAudit.length}\n`);
} else {
  // Single file
  filesToAudit = [projectRoot];
  console.log(`   File: ${relative(resolve('.'), projectRoot)}\n`);
}

if (filesToAudit.length === 0) {
  console.log('⚠️  No generated files to audit');
  process.exit(0);
}

try {
  const results = [];
  
  for (const filePath of filesToAudit) {
    const sourceCode = readFileSync(filePath, 'utf-8');
    
    // Extract ID from @phoenix-iu or @phoenix-deliverable comment
    const iuIdMatch = sourceCode.match(/@phoenix-iu:\s*([a-f0-9]+)/);
    const deliverableMatch = sourceCode.match(/@phoenix-deliverable:\s*(\w+)/);
    const iuId = iuIdMatch?.[1] || deliverableMatch?.[1] || basename(filePath);
    
    const policy = defaultBoundaryPolicy();
    const enforcement = {
      dependency_violation: { severity: 'error' },
      side_channel_violation: { severity: 'warning' }
    };

    const result = validateBoundary(iuId, filePath, sourceCode, policy, enforcement);
    results.push(result);
  }
  
  console.log(formatBoundaryReport(results));

  const hasErrors = results.some(r => r.has_errors);
  process.exit(hasErrors ? 1 : 0);

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
