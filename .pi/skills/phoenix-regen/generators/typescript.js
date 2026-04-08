/**
 * TypeScript Generator for Phoenix Regen
 * Generates RED (failing) TypeScript/Vitest code for TDD
 */

export function generateImpl(iu, config = {}) {
  const lines = [];
  const domainName = toPascalCase(iu.name);
  const functions = extractFunctions(iu);

  lines.push(`// 🔴 RED: ${iu.name} (${iu.short_id})`);
  lines.push(`// Description: ${iu.description}`);
  lines.push(`// Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  lines.push(`// TDD CYCLE:`);
  lines.push(`// 1. Tests are designed to FAIL with current code`);
  lines.push(`// 2. Run: npm test -- ${iu.short_id.toLowerCase()}`);
  lines.push(`// 3. See RED (tests fail)`);
  lines.push(`// 4. Fix functions below to make tests GREEN`);
  lines.push(`// 5. Run evidence to validate`);
  lines.push('');

  // === TYPES ===
  lines.push('// === TYPES ===');
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
    lines.push(...generateWrongFunction(func, domainName, iu));
    lines.push('');
  }

  // Traceability
  lines.push('// === PHOENIX VCS TRACEABILITY ===');
  lines.push('');
  lines.push('/** @internal Phoenix VCS traceability — do not remove. */');
  lines.push('export const _phoenix = {');
  lines.push(`  iu_id: '${iu.id}',`);
  lines.push(`  name: '${iu.name}',`);
  lines.push(`  risk_tier: '${iu.risk_tier}',`);
  lines.push('} as const;');
  lines.push('');

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
  lines.push(`// TDD CYCLE:`);
  lines.push(`// 1. npm test -- ${iu.short_id.toLowerCase()}`);
  lines.push(`// 2. 🔴 See RED (tests fail)`);
  lines.push(`// 3. Fix ../index.ts implementations`);
  lines.push(`// 4. 🟢 See GREEN (tests pass)`);
  lines.push('');
  lines.push(`import { describe, it, expect } from 'vitest';`);

  const imports = ['_phoenix', ...functions.map(f => f.name)].join(', ');
  lines.push(`import { ${imports} } from '../index.js';`);
  lines.push('');
  lines.push(`describe('${iu.name}', () => {`);

  // Traceability test (always passes)
  lines.push('  // 🟢 GREEN: Traceability (always passes)');
  lines.push("  it('has traceability export', () => {");
  lines.push('    expect(_phoenix).toBeDefined();');
  lines.push(`    expect(_phoenix.iu_id).toBe('${iu.id}');`);
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

// === HELPERS ===

function toPascalCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('')
    .replace(/Domain$/, '');
}

function toCamelCase(str) {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function extractFunctions(iu) {
  const functions = [];
  const text = (iu.contract?.description || '') + ' ' + (iu.contract?.invariants?.join(' ') || '');

  const patterns = [
    { pattern: /\b(calculate|compute|derive|get|find|lookup)\w*\b/gi, type: 'query' },
    { pattern: /\b(create|add|new|make)\w*\b/gi, type: 'create' },
    { pattern: /\b(validate|verify|check|isValid)\w*\b/gi, type: 'validate' },
    { pattern: /\b(process|handle|update|transform|convert)\w*\b/gi, type: 'process' },
    { pattern: /\b(delete|remove|clear)\w*\b/gi, type: 'delete' },
    { pattern: /\b(list|getAll|enumerate)\w*\b/gi, type: 'list' },
  ];

  const seen = new Set();

  for (const { pattern, type } of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[0].toLowerCase();
      if (!seen.has(name)) {
        seen.add(name);
        functions.push({ name: toCamelCase(name), type, original: match[0] });
      }
    }
  }

  if (functions.length === 0) {
    functions.push({
      name: 'process',
      type: 'process',
      original: 'process'
    });
  }

  return functions.slice(0, 4);
}

function generateWrongFunction(func, domainName, iu) {
  const lines = [];

  lines.push(`/**`);
  lines.push(` * 🔴 RED: ${func.original}`);
  lines.push(` *`);
  lines.push(` * TDD: Fix this function to make tests pass`);
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
      lines.push(`  console.log('Delete called with:', id);`);
      lines.push(`  return false; // ← Should return true if deleted`);
      lines.push('}');
      break;

    case 'process':
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

  lines.push(`  // 🔴 RED: This test will FAIL until you fix ${func.name}()`);

  switch (func.type) {
    case 'validate':
      lines.push(`  it('${func.name} returns true for valid input', () => {`);
      lines.push(`    const item: ${domainName} = { id: '123', name: 'Test' };`);
      lines.push(`    // 🔴 This FAILS because ${func.name} always returns false`);
      lines.push(`    expect(${func.name}(item)).toBe(true);`);
      lines.push(`    // FIX: Return true when item is actually valid`);
      lines.push('  });');
      break;

    case 'query':
      lines.push(`  it('${func.name} returns item with matching id', () => {`);
      lines.push(`    const id = 'abc123';`);
      lines.push(`    const result = ${func.name}(id);`);
      lines.push(`    // 🔴 This FAILS because ${func.name} returns 'WRONG_' + id`);
      lines.push(`    expect(result).not.toBeNull();`);
      lines.push(`    expect(result?.id).toBe(id); // ← Will be 'WRONG_abc123'`);
      lines.push(`    // FIX: Return item with ID matching the input`);
      lines.push('  });');
      break;

    case 'create':
      lines.push(`  it('${func.name} creates item with given id', () => {`);
      lines.push(`    const id = 'new123';`);
      lines.push(`    const result = ${func.name}(id);`);
      lines.push(`    // 🔴 This FAILS because ${func.name} returns wrong ID`);
      lines.push(`    expect(result).not.toBeNull();`);
      lines.push(`    expect(result?.id).toBe(id);`);
      lines.push(`    // FIX: Return created item with correct ID`);
      lines.push('  });');
      break;

    case 'list':
      lines.push(`  it('${func.name} returns non-empty array', () => {`);
      lines.push(`    const result = ${func.name}();`);
      lines.push(`    // 🔴 This FAILS because ${func.name} returns []`);
      lines.push(`    expect(result.length).toBeGreaterThan(0);`);
      lines.push(`    // FIX: Return actual items in the list`);
      lines.push('  });');
      break;

    case 'delete':
      lines.push(`  it('${func.name} returns true on success', () => {`);
      lines.push(`    const result = ${func.name}('some-id');`);
      lines.push(`    // 🔴 This FAILS because ${func.name} returns false`);
      lines.push(`    expect(result).toBe(true);`);
      lines.push(`    // FIX: Return true when deletion succeeds`);
      lines.push('  });');
      break;

    case 'process':
    default:
      lines.push(`  it('${func.name} transforms the input', () => {`);
      lines.push(`    const input: ${domainName} = { id: '123', name: 'In' };`);
      lines.push(`    const result = ${func.name}(input);`);
      lines.push(`    // 🔴 This FAILS because ${func.name} returns input unchanged`);
      lines.push(`    expect(result).not.toBe(input); // Should be new object`);
      lines.push(`    // FIX: Actually transform/process the input`);
      lines.push(`    // Then add: expect(result.name).toBe('Expected Output')`);
      lines.push('  });');
  }

  return lines;
}
