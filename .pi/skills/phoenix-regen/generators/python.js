/**
 * Python Generator for Phoenix Regen
 * Generates RED (failing) Python/pytest code for TDD
 */

export function generateImpl(iu, config = {}) {
  const lines = [];
  const className = toPascalCase(iu.name);
  const functions = extractFunctions(iu);
  const snakeName = toSnakeCase(iu.name);

  lines.push(`# 🔴 RED: ${iu.name} (${iu.short_id})`);
  lines.push(`# Description: ${iu.description}`);
  lines.push(`# Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  lines.push(`# TDD CYCLE:`);
  lines.push(`# 1. Run: pytest test_${snakeName}.py -v`);
  lines.push(`# 2. See 🔴 RED (tests fail)`);
  lines.push(`# 3. Fix functions below to make tests GREEN`);
  lines.push(`# 4. Run evidence to validate`);
  lines.push('');

  // Imports
  lines.push('from dataclasses import dataclass');
  lines.push('from typing import Optional, List');
  lines.push('');

  // === TYPES (dataclasses) ===
  lines.push('# === TYPES ===');
  lines.push('');
  lines.push('@dataclass');
  lines.push(`class ${className}:`);
  lines.push(`    id: str`);
  lines.push(`    name: Optional[str] = None`);
  lines.push('');

  // === RED IMPLEMENTATIONS ===
  lines.push('# === RED IMPLEMENTATIONS (fix to make tests pass) ===');
  lines.push('');

  for (const func of functions) {
    lines.push(...generateWrongFunction(func, className, iu));
    lines.push('');
  }

  // Traceability
  lines.push('# === PHOENIX VCS TRACEABILITY ===');
  lines.push('# DO NOT REMOVE — Required for VCS tracking');
  lines.push('_phoenix = {');
  lines.push(`    "iu_id": "${iu.id}",`);
  lines.push(`    "name": "${iu.name}",`);
  lines.push(`    "risk_tier": "${iu.risk_tier}",`);
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

export function generateTests(iu, implPath) {
  const className = toPascalCase(iu.name);
  const functions = extractFunctions(iu);
  const moduleName = toSnakeCase(iu.name);

  const lines = [];

  lines.push(`# 🔴 RED: Tests designed to FAIL — fix implementation to pass`);
  lines.push(`# ${iu.name} (${iu.short_id})`);
  lines.push(`# Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  lines.push(`# TDD CYCLE:`);
  lines.push(`# 1. pytest test_${moduleName}.py -v`);
  lines.push(`# 2. 🔴 See RED (tests fail)`);
  lines.push(`# 3. Fix ${moduleName}.py implementations`);
  lines.push(`# 4. 🟢 See GREEN (tests pass)`);
  lines.push('');
  lines.push(`import pytest`);
  lines.push(`from ${moduleName} import _phoenix, ${className}, ${functions.map(f => f.name).join(', ')}`);
  lines.push('');

  // Traceability test (always passes)
  lines.push('# 🟢 GREEN: Traceability (always passes)');
  lines.push('def test_traceability():');
  lines.push('    assert _phoenix is not None');
  lines.push(`    assert _phoenix["iu_id"] == "${iu.id}"`);
  lines.push('');

  // Failing tests for each function
  for (const func of functions) {
    lines.push(...generateFailingTest(func, className, iu));
    lines.push('');
  }

  return lines.join('\n');
}

export function getFileExtension() {
  return '.py';
}

export function getTestFileExtension() {
  return '_test.py';  // or test_*.py depending on convention
}

export function getTestFilePrefix() {
  return 'test_';  // pytest convention
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

function toSnakeCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.toLowerCase())
    .join('_')
    .replace(/_+$/, '');
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
    { pattern: /\b(validate|verify|check|is_valid)\w*\b/gi, type: 'validate' },
    { pattern: /\b(process|handle|update|transform|convert)\w*\b/gi, type: 'process' },
    { pattern: /\b(delete|remove|clear)\w*\b/gi, type: 'delete' },
    { pattern: /\b(list|get_all|enumerate)\w*\b/gi, type: 'list' },
  ];

  const seen = new Set();

  for (const { pattern, type } of patterns) {
    let match;
    while ((match = pattern.exec(text)) !== null) {
      const name = match[0].toLowerCase();
      const snakeName = name.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (!seen.has(snakeName)) {
        seen.add(snakeName);
        functions.push({ name: snakeName, type, original: match[0] });
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

function generateWrongFunction(func, className, iu) {
  const lines = [];

  lines.push(`# 🔴 RED: ${func.original}`);
  lines.push(`# TDD: Fix this function to make tests pass`);
  lines.push(`def ${func.name}(item: ${className}) -> ${getReturnType(func.type, className)}:`);

  const output = iu.contract?.outputs?.[0] || 'process the item';

  switch (func.type) {
    case 'validate':
      lines.push(`    # 🔴 RED: WRONG — always returns False`);
      lines.push(`    # Should validate: ${iu.contract?.invariants?.[0] || 'TBD'}`);
      lines.push(`    return False  # ← Always false!`);
      break;

    case 'query':
    case 'create':
      lines.push(`    # 🔴 RED: WRONG — returns object with mismatched ID`);
      lines.push(`    return ${className}(`);
      lines.push(`        id=f"WRONG_{item.id}",  # ← Bug: adds 'WRONG_' prefix`);
      lines.push(`        name="not implemented"`);
      lines.push(`    )`);
      break;

    case 'list':
      lines.push(`    # 🔴 RED: WRONG — returns empty list`);
      lines.push(`    return []  # ← Should return actual list`);
      break;

    case 'delete':
      lines.push(`    # 🔴 RED: WRONG — always returns False`);
      lines.push(`    print(f"Delete called with: {item_id}")`);
      lines.push(`    return False  # ← Should return True if deleted`);
      break;

    case 'process':
    default:
      lines.push(`    # 🔴 RED: WRONG — returns input unchanged`);
      lines.push(`    # Should: ${output}`);
      lines.push(`    return item  # ← No transformation!`);
  }

  return lines;
}

function getReturnType(funcType, className) {
  switch (funcType) {
    case 'validate':
    case 'delete':
      return 'bool';
    case 'list':
      return `List[${className}]`;
    case 'query':
    case 'create':
      return `Optional[${className}]`;
    case 'process':
    default:
      return className;
  }
}

function generateFailingTest(func, className, iu) {
  const lines = [];

  lines.push(`# 🔴 RED: This test will FAIL until you fix ${func.name}()`);

  switch (func.type) {
    case 'validate':
      lines.push(`def test_${func.name}_returns_true_for_valid():`);
      lines.push(`    item = ${className}(id="123", name="Test")`);
      lines.push(`    # 🔴 This FAILS because ${func.name} always returns False`);
      lines.push(`    assert ${func.name}(item) is True`);
      lines.push(`    # FIX: Return True when item is actually valid`);
      break;

    case 'query':
      lines.push(`def test_${func.name}_returns_item_with_matching_id():`);
      lines.push(`    item_id = "abc123"`);
      lines.push(`    result = ${func.name}(${className}(id=item_id))`);
      lines.push(`    # 🔴 This FAILS because ${func.name} returns 'WRONG_' + id`);
      lines.push(`    assert result is not None`);
      lines.push(`    assert result.id == item_id  # ← Will be 'WRONG_abc123'`);
      lines.push(`    # FIX: Return item with ID matching the input`);
      break;

    case 'create':
      lines.push(`def test_${func.name}_creates_item_with_given_id():`);
      lines.push(`    item_id = "new123"`);
      lines.push(`    result = ${func.name}(${className}(id=item_id))`);
      lines.push(`    # 🔴 This FAILS because ${func.name} returns wrong ID`);
      lines.push(`    assert result is not None`);
      lines.push(`    assert result.id == item_id`);
      lines.push(`    # FIX: Return created item with correct ID`);
      break;

    case 'list':
      lines.push(`def test_${func.name}_returns_non_empty_list():`);
      lines.push(`    result = ${func.name}()`);
      lines.push(`    # 🔴 This FAILS because ${func.name} returns []`);
      lines.push(`    assert len(result) > 0`);
      lines.push(`    # FIX: Return actual items in the list`);
      break;

    case 'delete':
      lines.push(`def test_${func.name}_returns_true_on_success():`);
      lines.push(`    result = ${func.name}("some-id")`);
      lines.push(`    # 🔴 This FAILS because ${func.name} returns False`);
      lines.push(`    assert result is True`);
      lines.push(`    # FIX: Return True when deletion succeeds`);
      break;

    case 'process':
    default:
      lines.push(`def test_${func.name}_transforms_input():`);
      lines.push(`    input_item = ${className}(id="123", name="In")`);
      lines.push(`    result = ${func.name}(input_item)`);
      lines.push(`    # 🔴 This FAILS because ${func.name} returns input unchanged`);
      lines.push(`    assert result is not input_item  # Should be new object`);
      lines.push(`    # FIX: Actually transform/process the input`);
      lines.push(`    # Then add: assert result.name == "Expected Output"`);
      break;
  }

  return lines;
}
