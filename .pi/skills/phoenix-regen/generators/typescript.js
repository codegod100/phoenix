/**
 * TypeScript Generator for Phoenix Regen
 * Generates clean TypeScript implementations using theory morphisms
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
  lines.push(`// ✅ CLEAN: ${iu.name} (${iu.short_id})`);
  lines.push(`// Description: ${iu.description}`);
  lines.push(`// Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push(`// Generated: Theory morphism (ThIU → ThTypeScript → ThCode + ThLog)`);
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
  
  lines.push('');

  // === IMPORTS ===
  lines.push('// === IMPORTS ===');
  lines.push('');
  lines.push("import { logger } from './logger'; // Auto-injected logging");
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

  // === CLEAN IMPLEMENTATIONS ===
  lines.push('// === IMPLEMENTATIONS (fill in TODOs) ===');
  lines.push('');

  for (const func of functions) {
    // Map function to a canonical requirement if possible
    const canonId = iu.source_canon_ids?.[functions.indexOf(func) % iu.source_canon_ids.length];
    const canon = canonId ? canonMap.get(canonId) : null;
    
    lines.push(...generateCleanFunction(func, domainName, iu, canon));
    lines.push('');
  }

  return lines.join('\n');
}

export function generateTests(iu, implPath) {
  const domainName = toPascalCase(iu.name);
  const functions = extractFunctions(iu);

  const lines = [];

  lines.push(`// ✅ Validation tests for ${iu.name} (${iu.short_id})`);
  lines.push(`// These tests validate structure, not behavior`);
  lines.push('');
  
  // Language-agnostic IU traceability in tests too
  lines.push(formatPhoenixComments({
    iu: iu.id,
    name: iu.name,
    risk: iu.risk_tier,
    shortId: iu.short_id,
  }));
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
  lines.push('  // Traceability validation (structure only)');
  lines.push("  it('has phoenix traceability comments', () => {");
  lines.push("    // Read the impl file and check for @phoenix-iu comment");
  lines.push("    const fs = require('fs');");
  lines.push("    const path = require('path');");
  lines.push("    const implPath = path.join(__dirname, '..', 'index.ts');");
  lines.push("    const impl = fs.readFileSync(implPath, 'utf-8');");
  lines.push(`    expect(impl).toMatch(/@phoenix-iu:.*${iu.id.slice(0, 16)}/);`);
  lines.push('  });');
  lines.push('');

  // Structure validation tests (NOT behavior)
  for (const func of functions) {
    lines.push(`  // Structure validation for ${func.name}`);
    lines.push(`  it('has ${func.name} function', () => {`);
    lines.push(`    expect(typeof ${func.name}).toBe('function');`);
    lines.push('  });');
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

export function getTestFilePattern() {
  return { subdir: '__tests__', suffix: '.test.ts' };
}

export function isTemplateGenerator() {
  return false;
}

// === MIGRATION SUPPORT ===

export function migrateImpl(iu, oldCode, config = {}) {
  // Parse old phoenix comments
  const oldTrace = parsePhoenixComments(oldCode);
  
  const lines = [];
  lines.push(`// 🔄 MIGRATED: ${iu.name} (${iu.short_id})`);
  lines.push(`// From: ${config.oldIuId || oldTrace.iu || 'old IU'}`);
  lines.push(`// Overlap: ${config.overlapRatio || 'unknown'}`);
  lines.push('');
  
  // Update traceability comments while preserving implementation
  const newTrace = {
    iu: iu.id,
    name: iu.name,
    risk: iu.risk_tier,
    shortId: iu.short_id,
  };
  
  const updatedCode = updatePhoenixComments(oldCode, newTrace);
  lines.push(updatedCode);
  
  return lines.join('\n');
}

// === HELPER FUNCTIONS ===

function extractFunctions(iu) {
  const functions = [];

  // Extract from boundary exports
  if (iu.boundary?.exports) {
    for (const exp of iu.boundary.exports) {
      if (typeof exp === 'string') {
        functions.push({
          name: exp,
          type: 'function',
          params: [],
          returns: 'void',
        });
      } else if (exp.type === 'function' || exp.type === 'method') {
        functions.push({
          name: exp.name,
          type: exp.type,
          params: exp.params || [],
          returns: exp.returns || 'void',
          description: exp.description || '',
        });
      }
    }
  }

  // Fallback: infer from IU name if no exports
  if (functions.length === 0) {
    const baseName = toCamelCase(iu.name);
    functions.push({
      name: `process${baseName}`,
      type: 'function',
      params: [{ name: 'data', type: 'unknown' }],
      returns: 'unknown',
    });
  }

  return functions;
}

function generateCleanFunction(func, domainName, iu, canon) {
  const lines = [];
  const isAsync = func.name.includes('load') || func.name.includes('fetch') || func.name.includes('async');
  const returnType = func.returns || (isAsync ? 'Promise<void>' : 'void');

  // Determine log prefix
  const logPrefix = inferLogPrefix(func.name, iu.name);

  // JSDoc with canon reference
  lines.push(`/**`);
  if (func.description) {
    lines.push(` * ${func.description}`);
    lines.push(` *`);
  }
  if (canon) {
    lines.push(` * REQUIREMENT: ${canon.statement.slice(0, 80)}${canon.statement.length > 80 ? '...' : ''}`);
    lines.push(` * @phoenix-canon: ${canon.canon_id || canon.id}`);
    lines.push(` *`);
  } else if (iu.source_canon_ids?.[0]) {
    lines.push(` * @phoenix-canon: ${iu.source_canon_ids[0]}`);
    lines.push(` *`);
  }
  lines.push(` * @phoenix-iu: ${iu.id.slice(0, 16)}...`);
  lines.push(` */`);

  // Function signature
  const asyncKeyword = isAsync ? 'async ' : '';
  const params = func.params?.map(p => `${p.name}: ${p.type || 'unknown'}`).join(', ') || '';
  lines.push(`export ${asyncKeyword}function ${func.name}(${params}): ${returnType} {`);

  // Auto-injected logging
  lines.push(`  console.log('${logPrefix} ${func.name} called');`);
  
  // Special logging for lifecycle/auth methods
  if (func.name.includes('auth') && func.name.includes('completed')) {
    lines.push(`  console.log('${logPrefix} Auth completed, updating session');`);
  }
  if (func.name.includes('mount')) {
    lines.push(`  console.log('${logPrefix} Starting initialization');`);
  }

  // TODO placeholder
  lines.push(`  // TODO: Implement logic from requirements`);
  lines.push(`  // Source: ${iu.source_canon_ids?.join(', ') || 'spec'}`);

  // Default return
  if (returnType !== 'void' && returnType !== 'Promise<void>') {
    if (isAsync) {
      lines.push(`  return Promise.resolve(null); // TODO: Implement`);
    } else {
      lines.push(`  return null as any; // TODO: Implement`);
    }
  }

  lines.push(`}`);

  return lines;
}

function inferLogPrefix(funcName, iuName) {
  // Infer appropriate log prefix based on function name
  if (funcName.includes('auth')) return '[AUTH]';
  if (funcName.includes('mount')) return '[MOUNT]';
  if (funcName.includes('save') || funcName.includes('load')) return '[IO]';
  if (funcName.includes('connect') || funcName.includes('send')) return '[BROKER]';
  if (funcName.includes('watch')) return '[REACTIVE]';
  if (funcName.includes('on')) return '[EVENT]';
  if (funcName.includes('render') || funcName.includes('compose')) return '[UI]';
  if (funcName.includes('state')) return '[STATE]';

  // Fall back to IU name
  const iuLower = iuName.toLowerCase();
  if (iuLower.includes('auth')) return '[AUTH]';
  if (iuLower.includes('broker')) return '[BROKER]';
  if (iuLower.includes('ui')) return '[UI]';

  return '[GENERAL]';
}

// === STRING UTILS ===

function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toKebabCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.toLowerCase())
    .join('-')
    .replace(/-+$/, '');
}
