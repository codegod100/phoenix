/**
 * TypeScript Generator for Phoenix Regen
 * Generates RED (failing) TypeScript/Vitest code for TDD
 * 
 * Uses language-agnostic comment-based IU tracking:
 *   // @phoenix-iu: <iu_id>
 *   // @phoenix-name: <name>
 *   // @phoenix-risk: <tier>
 *   // @phoenix-canon: <canon_id>... // REQUIREMENT: <text>
 */

import { 
  formatPhoenixComments, 
  formatCanonComment,
  parsePhoenixComments,
  extractImplementationBody,
  updatePhoenixComments 
} from '../lib/traceability.js';

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

/**
 * Load canonical data for embedding requirements in code
 */
function loadCanonicalData(projectRoot) {
  try {
    const canonPath = join(projectRoot, '.phoenix', 'graphs', 'canonical.json');
    if (existsSync(canonPath)) {
      const data = JSON.parse(readFileSync(canonPath, 'utf-8'));
      return new Map((data.nodes || []).map(n => [n.canon_id, n]));
    }
  } catch (e) {
    // Silent fail - canonical embedding is optional
    console.log(`      ⚠️  Could not load canonical data: ${e.message}`);
  }
  return new Map();
}

export function generateImpl(iu, config = {}) {
  const lines = [];
  const domainName = toPascalCase(iu.name);
  const functions = extractFunctions(iu);
  
  // Load canonical data for traceability
  const canonMap = loadCanonicalData(config.projectRoot || '.');

  // Header with IU traceability
  lines.push(`// 🔴 RED: ${iu.name} (${iu.short_id})`);
  lines.push(`// Description: ${iu.description}`);
  lines.push(`// Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  
  // Language-agnostic IU tracking via comments
  lines.push(formatPhoenixComments({
    iu: iu.id,
    name: iu.name,
    risk: iu.risk_tier,
    shortId: iu.short_id,
  }));
  lines.push('');
  
  // Embed canonical requirements this IU implements
  if (iu.source_canon_ids && iu.source_canon_ids.length > 0) {
    lines.push('// === IMPLEMENTED REQUIREMENTS ===');
    lines.push('');
    for (const canonId of iu.source_canon_ids.slice(0, 10)) { // Limit to first 10
      const canon = canonMap.get(canonId);
      if (canon) {
        lines.push(formatCanonComment(canonId, canon.statement, canon.type));
        lines.push('');
      }
    }
    lines.push('');
  }
  
  lines.push(`// TDD CYCLE:`);
  lines.push(`// 1. Tests are designed to FAIL with current code`);
  lines.push(`// 2. Run: npm test -- ${iu.short_id.toLowerCase()}`);
  lines.push(`// 3. See 🔴 RED (tests fail)`);
  lines.push(`// 4. Fix functions below to make tests 🟢 GREEN`);
  lines.push(`// 5. Run evidence to validate`);
  lines.push('');

  // === TYPES ===
  lines.push('// === TYPES ===');
  lines.push('// @phoenix-gen: types');
  lines.push('');
  lines.push(`export interface ${domainName} {`);
  lines.push(`  id: string;`);
  lines.push(`  name?: string;`);
  lines.push('}');
  lines.push('');

  // === RED IMPLEMENTATIONS ===
  lines.push('// === RED IMPLEMENTATIONS (fix to make tests pass) ===');
  lines.push('');

  for (const func of functions) {
    // Map function to a canonical requirement if possible
    const canonId = iu.source_canon_ids?.[functions.indexOf(func) % iu.source_canon_ids.length];
    const canon = canonId ? canonMap.get(canonId) : null;
    
    lines.push(...generateWrongFunction(func, domainName, iu, canon));
    lines.push('');
  }

  return lines.join('\n');
}

export function generateTests(iu, implPath) {
  const domainName = toPascalCase(iu.name);
  const functions = extractFunctions(iu);

  const lines = [];

  lines.push(`// 🔴 RED: Tests designed to FAIL — fix implementation to pass`);
  lines.push(`// ${iu.name} (${iu.short_id})`);
  lines.push(`// Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  
  // Language-agnostic IU traceability in tests too
  lines.push(formatPhoenixComments({
    iu: iu.id,
    name: iu.name,
    risk: iu.risk_tier,
    shortId: iu.short_id,
  }));
  lines.push('');
  
  lines.push(`// TDD CYCLE:`);
  lines.push(`// 1. npm test -- ${iu.short_id.toLowerCase()}`);
  lines.push(`// 2. 🔴 See RED (tests fail)`);
  lines.push(`// 3. Fix ../index.ts implementations`);
  lines.push(`// 4. 🟢 See GREEN (tests pass)`);
  lines.push('');
  lines.push(`import { describe, it, expect } from 'vitest';`);

  // Import functions only (no _phoenix - we use comment-based traceability)
  const imports = functions.map(f => f.name).join(', ');
  if (imports) {
    lines.push(`import { ${imports} } from '../index.js';`);
  } else {
    lines.push(`import * as impl from '../index.js';`);
  }
  lines.push('');
  lines.push(`describe('${iu.name}', () => {`);

  // Traceability test via comment parsing (language-agnostic)
  lines.push('  // 🟢 GREEN: Traceability (always passes)');
  lines.push("  it('has phoenix traceability comments', () => {");
  lines.push("    // Read the impl file and check for @phoenix-iu comment");
  lines.push("    const fs = require('fs');");
  lines.push("    const path = require('path');");
  lines.push("    const implPath = path.join(__dirname, '..', 'index.ts');");
  lines.push("    const impl = fs.readFileSync(implPath, 'utf-8');");
  lines.push(`    expect(impl).toMatch(/@phoenix-iu:.*${iu.id.slice(0, 16)}/);`);
  lines.push('  });');
  lines.push('');

  // Failing tests for each function
  for (const func of functions) {
    lines.push(...generateFailingTest(func, domainName, iu));
    lines.push('');
  }

  lines.push('});');
  lines.push('');

  return lines.join('\n');
}

export function getFileExtension() {
  return '.ts';
}

export function getTestFileExtension() {
  return '.test.ts';
}

/**
 * Migrate implementation from old IU to new IU
 * Updates traceability comments while preserving implementation
 */
export function migrateImpl(iu, oldCode, config = {}) {
  const domainName = toPascalCase(iu.name);
  
  // Try to extract implementation body using traceability utilities
  let implementationBody = extractImplementationBody(oldCode);
  
  if (!implementationBody) {
    // No implementation section found, treat as new
    console.log(`      ⚠️  No implementation section in old code, generating fresh stub`);
    return generateImpl(iu, config);
  }
  
  // Update phoenix comments in the implementation
  const newInfo = {
    iu: iu.id,
    name: iu.name,
    risk: iu.risk_tier,
    shortId: iu.short_id,
    migrated: config.oldIuId,
  };
  
  const migratedCode = updatePhoenixComments(oldCode, newInfo);
  
  // If we successfully updated comments, use that result
  // Otherwise fall back to wrapping the body
  if (migratedCode && migratedCode !== oldCode) {
    return migratedCode;
  }
  
  // Fallback: wrap the extracted body with new header
  const lines = [];
  lines.push(`// 🔄 MIGRATED: ${iu.name} (${iu.short_id})`);
  lines.push(`// Description: ${iu.description}`);
  lines.push(`// Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  if (config.oldIuId) {
    lines.push(`// Migrated from: ${config.oldIuId.slice(0, 16)}...`);
  }
  if (config.overlapRatio) {
    lines.push(`// Canonical overlap: ${Math.round(config.overlapRatio * 100)}%`);
  }
  lines.push('');
  lines.push(formatPhoenixComments(newInfo));
  lines.push('');
  lines.push(`// TDD CYCLE:`);
  lines.push(`// 1. Tests are designed to FAIL with current code`);
  lines.push(`// 2. Run: npm test -- ${iu.short_id.toLowerCase()}`);
  lines.push(`// 3. See 🔴 RED (tests fail)`);
  lines.push(`// 4. Fix functions below to make tests 🟢 GREEN`);
  lines.push(`// 5. Run evidence to validate`);
  lines.push('');
  
  // Clean up old headers from the body
  implementationBody = implementationBody.replace(/^\/\/ (🔴 RED|🔄 MIGRATED):.*\n/g, '');
  implementationBody = implementationBody.replace(/^\/\/ @phoenix-.*\n/g, '');
  
  lines.push(implementationBody);
  
  return lines.join('\n');
}

// === HELPERS ===

function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    .replace(/Domain$/, '');
}

// JavaScript/TypeScript reserved words that can't be used as function names
const RESERVED_WORDS = new Set([
  'break', 'case', 'catch', 'class', 'const', 'continue', 'debugger', 'default',
  'delete', 'do', 'else', 'enum', 'export', 'extends', 'false', 'finally',
  'for', 'function', 'if', 'implements', 'import', 'in', 'instanceof',
  'interface', 'let', 'new', 'null', 'package', 'private', 'protected',
  'public', 'return', 'static', 'super', 'switch', 'this', 'throw', 'true',
  'try', 'typeof', 'var', 'void', 'while', 'with', 'yield'
]);

/**
 * Escape reserved words by appending underscore
 */
function escapeReserved(name) {
  return RESERVED_WORDS.has(name) ? name + '_' : name;
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  const camel = pascal.charAt(0).toLowerCase() + pascal.slice(1);
  return escapeReserved(camel);
}

function extractFunctions(iu) {
  const functions = [];
  const text = (iu.contract?.description || '') + ' ' + (iu.contract?.invariants?.join(' ') || '');

  const patterns = [
    { pattern: /\b(calculate|compute|derive|get|find|lookup)\w*\b/gi, type: 'query' },
    { pattern: /\b(validate|check|verify|ensure|confirm)\w*\b/gi, type: 'validate' },
    { pattern: /\b(create|add|insert|new)\w*\b/gi, type: 'create' },
    { pattern: /\b(update|modify|edit|change|set)\w*\b/gi, type: 'update' },
    { pattern: /\b(delete|remove|clear|drop)\w*\b/gi, type: 'delete' },
    { pattern: /\b(list|getAll|findAll|select)\w*\b/gi, type: 'list' },
    { pattern: /\b(process|handle|execute|run|perform)\w*\b/gi, type: 'process' },
  ];

  const seen = new Set();
  for (const { pattern, type } of patterns) {
    const matches = text.matchAll(pattern);
    for (const match of matches) {
      const name = toCamelCase(match[0]);
      if (!seen.has(name)) {
        seen.add(name);
        functions.push({ name, type, original: match[0] });
      }
    }
  }

  // Ensure at least one function
  if (functions.length === 0) {
    functions.push({ name: escapeReserved('process'), type: 'process', original: 'process' });
  }

  return functions.slice(0, 5);
}

function generateWrongFunction(func, domainName, iu, canon = null) {
  const lines = [];

  // Add canonical traceability if available
  if (canon) {
    lines.push(formatCanonComment(canon.canon_id || canon.id, canon.statement, canon.type));
  }
  
  lines.push(`/**`);
  lines.push(` * 🔴 RED: ${func.original}`);
  lines.push(` *`);
  lines.push(` * TDD: Fix this function to make tests pass`);
  lines.push(` * @phoenix-gen: function`);
  lines.push(` */`);

  const output = iu.contract?.outputs?.[0] || 'process the item';

  switch (func.type) {
    case 'validate':
      lines.push(`export function ${func.name}(item: ${domainName}): boolean {`);
      lines.push(`  // 🔴 RED: WRONG — always returns false`);
      lines.push(`  // Should validate: ${iu.contract?.invariants?.[0] || 'TBD'}`);
      lines.push(`  return false;`);
      lines.push('}');
      break;

    case 'query':
    case 'create':
      lines.push(`export function ${func.name}(id: string): ${domainName} | null {`);
      lines.push(`  // 🔴 RED: WRONG — returns object with mismatched ID`);
      lines.push(`  return {`);
      lines.push(`    id: 'WRONG_' + id, // ← Bug: adds 'WRONG_' prefix`);
      lines.push(`    name: 'not implemented'`);
      lines.push(`  };`);
      lines.push('}');
      break;

    case 'list':
      lines.push(`export function ${func.name}(): ${domainName}[] {`);
      lines.push(`  // 🔴 RED: WRONG — returns empty array`);
      lines.push(`  return []; // ← Should return actual list`);
      lines.push('}');
      break;

    case 'delete':
      lines.push(`export function ${func.name}(id: string): boolean {`);
      lines.push(`  // 🔴 RED: WRONG — always returns false`);
      lines.push(`  // Should delete the item and return success`);
      lines.push(`  return false;`);
      lines.push('}');
      break;

    case 'update':
      lines.push(`export function ${func.name}(item: ${domainName}): ${domainName} {`);
      lines.push(`  // 🔴 RED: WRONG — returns input unchanged`);
      lines.push(`  // Should: ${output}`);
      lines.push(`  return item; // ← No transformation!`);
      lines.push('}');
      break;

    default:
      lines.push(`export function ${func.name}(item: ${domainName}): ${domainName} {`);
      lines.push(`  // 🔴 RED: WRONG — returns input unchanged`);
      lines.push(`  // Should: ${output}`);
      lines.push(`  return item; // ← No transformation!`);
      lines.push('}');
  }

  return lines;
}

function generateFailingTest(func, domainName, iu) {
  const lines = [];

  switch (func.type) {
    case 'validate':
      lines.push(`  // 🔴 RED: ${func.name} should validate items`);
      lines.push(`  it('${func.name} validates ${domainName.toLowerCase()}', () => {`);
      lines.push(`    const item: ${domainName} = { id: '1', name: 'test' };`);
      lines.push(`    expect(${func.name}(item)).toBe(true); // 🔴 Currently returns false`);
      lines.push('  });');
      break;

    case 'query':
    case 'create':
      lines.push(`  // 🔴 RED: ${func.name} should return correct data`);
      lines.push(`  it('${func.name} returns ${domainName.toLowerCase()} by id', () => {`);
      lines.push(`    const result = ${func.name}('test-id');`);
      lines.push(`    expect(result).not.toBeNull();`);
      lines.push(`    expect(result?.id).toBe('test-id'); // 🔴 Currently 'WRONG_test-id'`);
      lines.push('  });');
      break;

    case 'list':
      lines.push(`  // 🔴 RED: ${func.name} should return non-empty list`);
      lines.push(`  it('${func.name} returns list of ${domainName.toLowerCase()}', () => {`);
      lines.push(`    const result = ${func.name}();`);
      lines.push(`    expect(result.length).toBeGreaterThan(0); // 🔴 Currently returns []`);
      lines.push('  });');
      break;

    case 'delete':
      lines.push(`  // 🔴 RED: ${func.name} should delete and return success`);
      lines.push(`  it('${func.name} deletes ${domainName.toLowerCase()}', () => {`);
      lines.push(`    expect(${func.name}('test-id')).toBe(true); // 🔴 Currently returns false`);
      lines.push('  });');
      break;

    default:
      lines.push(`  // 🔴 RED: ${func.name} should transform input`);
      lines.push(`  it('${func.name} processes ${domainName.toLowerCase()}', () => {`);
      lines.push(`    const item: ${domainName} = { id: '1', name: 'test' };`);
      lines.push(`    const result = ${func.name}(item);`);
      lines.push(`    expect(result).not.toBe(item); // 🔴 Currently returns same object`);
      lines.push('  });');
  }

  return lines;
}
