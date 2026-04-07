#!/usr/bin/env node
/**
 * Phoenix Audit - Boundary validation and architectural linting
 * 
 * Self-contained skill - no external dependencies except Node.js stdlib
 * 
 * Usage: node .pi/skills/phoenix-audit/audit.js <file-path>
 */

import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';

// === VCS BOUNDARY FUNCTIONS (inlined) ===

function extractImports(sourceCode) {
  const imports = [];
  
  const es6Regex = /import\s+(?:.*?\s+from\s+)?['"]([^'"]+)['"];?/g;
  let match;
  while ((match = es6Regex.exec(sourceCode)) !== null) {
    imports.push({ type: 'es6', source: match[1] });
  }
  
  const cjsRegex = /require\s*\(\s*['"]([^'"]+)['"]\s*\)/g;
  while ((match = cjsRegex.exec(sourceCode)) !== null) {
    imports.push({ type: 'cjs', source: match[1] });
  }
  
  return imports;
}

function detectSideChannels(sourceCode) {
  const channels = [];
  
  const patterns = [
    { name: 'database', regex: /\b(db|database|pool|connection|prisma|mongoose|sequelize)\b/i },
    { name: 'filesystem', regex: /\b(fs\.|readFile|writeFile|mkdir|readdir)\b/ },
    { name: 'network', regex: /\b(fetch|axios|http|request|WebSocket|socket)\b/i },
    { name: 'process', regex: /\b(process\.env|child_process|spawn|exec)\b/ },
    { name: 'crypto', regex: /\b(crypto|hash|encrypt|decrypt|sign|verify)\b/i },
    { name: 'cache', regex: /\b(redis|cache|memcached|lru)\b/i }
  ];
  
  for (const { name, regex } of patterns) {
    if (regex.test(sourceCode)) {
      channels.push(name);
    }
  }
  
  return [...new Set(channels)];
}

function validateBoundary(iuId, filePath, sourceCode, policy, enforcement) {
  const violations = [];
  const imports = extractImports(sourceCode);
  const sideChannels = detectSideChannels(sourceCode);
  
  for (const forbidden of policy.forbidden_iu_imports || []) {
    const importMatch = imports.find(imp => imp.source.includes(forbidden));
    if (importMatch) {
      violations.push({
        type: 'dependency_violation',
        severity: enforcement.dependency_violation?.severity || 'error',
        message: `Forbidden import of IU ${forbidden}`,
        location: importMatch.source
      });
    }
  }
  
  for (const forbidden of policy.forbidden_packages || []) {
    const pkgMatch = imports.find(imp => imp.source === forbidden || imp.source.startsWith(`${forbidden}/`));
    if (pkgMatch) {
      violations.push({
        type: 'dependency_violation',
        severity: enforcement.dependency_violation?.severity || 'error',
        message: `Forbidden package: ${forbidden}`,
        location: pkgMatch.source
      });
    }
  }
  
  const required = new Set(policy.required_side_channels || []);
  for (const channel of sideChannels) {
    if (!required.has(channel)) {
      violations.push({
        type: 'side_channel_violation',
        severity: enforcement.side_channel_violation?.severity || 'warning',
        message: `Undeclared side channel: ${channel}`,
        location: 'detected in source'
      });
    }
  }
  
  const errors = violations.filter(v => v.severity === 'error');
  const warnings = violations.filter(v => v.severity === 'warning');
  
  return {
    iu_id: iuId,
    file: filePath,
    has_errors: errors.length > 0,
    has_warnings: warnings.length > 0,
    diagnostics: violations,
    summary: {
      errors: errors.length,
      warnings: warnings.length,
      imports_checked: imports.length,
      side_channels_detected: sideChannels
    }
  };
}

function formatBoundaryReport(results) {
  const lines = [];
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix VCS Boundary Validation                               ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  let totalErrors = 0;
  let totalWarnings = 0;
  
  for (const result of results) {
    const icon = result.has_errors ? '❌' : result.has_warnings ? '⚠️' : '✅';
    lines.push(`${icon} ${result.file}`);
    
    if (result.diagnostics.length > 0) {
      for (const d of result.diagnostics) {
        const sevIcon = d.severity === 'error' ? '  ❌' : '  ⚠️';
        lines.push(`${sevIcon} ${d.message}`);
        if (d.location && d.location !== 'detected in source') {
          lines.push(`     at: ${d.location}`);
        }
      }
      lines.push('');
    }
    
    totalErrors += result.summary.errors;
    totalWarnings += result.summary.warnings;
  }
  
  lines.push('─────────────────────────────────────────────────────────────');
  if (totalErrors > 0) {
    lines.push(`Status: ❌ REJECTED (${totalErrors} errors, ${totalWarnings} warnings)`);
  } else if (totalWarnings > 0) {
    lines.push(`Status: ⚠️ WARNING (${totalWarnings} warnings)`);
  } else {
    lines.push('Status: ✅ PASSED');
  }
  
  return lines.join('\n');
}

// === MAIN EXECUTION ===

const filePath = process.argv[2];

if (!filePath) {
  console.error('Usage: node audit.js <file-path>');
  console.error('Example: node audit.js src/generated/app/dashboard.ts');
  process.exit(1);
}

const projectRoot = resolve('.');
const fullPath = resolve(projectRoot, filePath);

if (!existsSync(fullPath)) {
  console.error(`❌ File not found: ${filePath}`);
  process.exit(1);
}

console.log('🔍 Phoenix Audit');
console.log(`   File: ${relative(projectRoot, fullPath)}\n`);

try {
  const sourceCode = readFileSync(fullPath, 'utf-8');
  
  const iuIdMatch = sourceCode.match(/iu_id:\s*['"]([^'"]+)['"]/);
  const iuId = iuIdMatch?.[1] || 'unknown';
  
  const policy = {
    forbidden_iu_imports: [],
    forbidden_packages: [],
    required_side_channels: [],
    allowed_imports: ['*']
  };
  
  const enforcement = {
    dependency_violation: { severity: 'error' },
    side_channel_violation: { severity: 'warning' }
  };

  const result = validateBoundary(iuId, filePath, sourceCode, policy, enforcement);
  console.log(formatBoundaryReport([result]));

  process.exit(result.has_errors ? 1 : 0);
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
