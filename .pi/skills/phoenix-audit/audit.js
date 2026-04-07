#!/usr/bin/env node
/**
 * Phoenix Audit - Boundary validation and architectural linting
 * 
 * Usage: node .pi/skills/phoenix-audit/audit.js <file-path>
 */

import { validateBoundary, formatBoundaryReport } from '../phoenix-vcs-core/lib/boundary.js';
import { readFileSync, existsSync } from 'fs';
import { resolve, relative } from 'path';

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
  
  // Extract IU ID from _phoenix export
  const iuIdMatch = sourceCode.match(/iu_id:\s*['"]([^'"]+)['"]/);
  const iuId = iuIdMatch?.[1] || 'unknown';
  
  // Default policy (would be loaded from IU in real usage)
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
