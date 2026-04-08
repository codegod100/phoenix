/**
 * Nix Generator for Phoenix Regen
 * Generates RED (failing) Nix expression stubs for TDD
 */

export function generateImpl(iu, config = {}) {
  const lines = [];
  const name = toKebabCase(iu.name);
  const functions = extractFunctions(iu);

  lines.push(`# 🔴 RED: ${iu.name} (${iu.short_id})`);
  lines.push(`# Description: ${iu.description}`);
  lines.push(`# Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  lines.push(`# TDD CYCLE:`);
  lines.push(`# 1. Tests are designed to FAIL with current code`);
  lines.push(`# 2. Run: nix eval .#${name} --json`);
  lines.push(`# 3. See 🔴 RED (tests fail)`);
  lines.push(`# 4. Fix functions below to make tests GREEN`);
  lines.push(`# 5. Run evidence to validate`);
  lines.push('');

  // === TYPES (as comments/docs) ===
  lines.push('# === TYPES ===');
  lines.push('# ${name} :: {');
  lines.push('#   id :: String;');
  lines.push('#   name :: String;');
  lines.push('# }');
  lines.push('');

  // === RED IMPLEMENTATIONS ===
  lines.push('# === RED IMPLEMENTATIONS (fix to make tests pass) ===');
  lines.push('');

  for (const func of functions) {
    lines.push(...generateWrongFunction(func, iu));
    lines.push('');
  }

  // Traceability
  lines.push('# === PHOENIX VCS TRACEABILITY ===');
  lines.push('# DO NOT REMOVE — Required for VCS tracking');
  lines.push('{');
  lines.push(`  _phoenix = {`);
  lines.push(`    iu_id = "${iu.id}";`);
  lines.push(`    name = "${iu.name}";`);
  lines.push(`    risk_tier = "${iu.risk_tier}";`);
  lines.push(`  };`);
  lines.push('');

  // Export all functions
  for (const func of functions) {
    lines.push(`  inherit ${func.name};`);
  }
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

export function generateTests(iu, implPath) {
  const name = toKebabCase(iu.name);
  const functions = extractFunctions(iu);

  const lines = [];

  lines.push(`# 🔴 RED: Tests designed to FAIL — fix implementation to pass`);
  lines.push(`# ${iu.name} (${iu.short_id})`);
  lines.push(`# Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  lines.push(`# TDD CYCLE:`);
  lines.push(`# 1. nix build .#test-${name}`);
  lines.push(`# 2. 🔴 See RED (tests fail)`);
  lines.push(`# 3. Fix ${name}.nix implementations`);
  lines.push(`# 4. 🟢 See GREEN (tests pass)`);
  lines.push('');

  // Import the implementation
  lines.push(`{ pkgs ? import <nixpkgs> {} }:`);
  lines.push('');
  lines.push(`let`);
  lines.push(`  ${name} = import ./${name}.nix;`);
  lines.push(`in`);
  lines.push('');
  lines.push(`pkgs.runCommand "test-${name}" {} ''`);

  // Traceability test
  lines.push(`  echo "🟢 GREEN: Checking traceability..."`);
  lines.push(`  test "${iu.id}" = "${iu.id}" || exit 1`);
  lines.push('');

  // Failing tests for each function
  for (const func of functions) {
    lines.push(...generateFailingTest(func, name, iu));
  }

  lines.push(`  touch $out`);
  lines.push(`''`);
  lines.push('');

  return lines.join('\n');
}

export function getFileExtension() {
  return '.nix';
}

export function getTestFilePattern() {
  return { suffix: '.test.nix', subdir: null };
}

// === HELPERS ===

function toKebabCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.toLowerCase())
    .join('-')
    .replace(/-+$/, '');
}

function toCamelCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map((w, i) => i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join('');
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
      const name = match[0];
      const camelName = toCamelCase(name);
      if (!seen.has(camelName)) {
        seen.add(camelName);
        functions.push({ name: camelName, type, original: match[0] });
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

function generateWrongFunction(func, iu) {
  const lines = [];

  lines.push(`# 🔴 RED: ${func.original}`);
  lines.push(`# TDD: Fix this function to make tests pass`);
  lines.push(`${func.name} = item:`);

  const output = iu.contract?.outputs?.[0] || 'process the item';

  switch (func.type) {
    case 'validate':
      lines.push(`  # 🔴 RED: WRONG — always returns false`);
      lines.push(`  # Should validate: ${iu.contract?.invariants?.[0] || 'TBD'}`);
      lines.push(`  false  # ← Always false!`);
      break;

    case 'query':
    case 'create':
      lines.push(`  # 🔴 RED: WRONG — returns object with mismatched ID`);
      lines.push(`  {`);
      lines.push(`    id = "WRONG_'' + item.id;  # ← Bug: adds 'WRONG_' prefix`);
      lines.push(`    name = "not implemented";`);
      lines.push(`  }`);
      break;

    case 'list':
      lines.push(`  # 🔴 RED: WRONG — returns empty list`);
      lines.push(`  []  # ← Should return actual list`);
      break;

    case 'delete':
      lines.push(`  # 🔴 RED: WRONG — always returns false`);
      lines.push(`  builtins.trace "Delete called with: ''${item.id}" false  # ← Should return true`);
      break;

    case 'process':
    default:
      lines.push(`  # 🔴 RED: WRONG — returns input unchanged`);
      lines.push(`  # Should: ${output}`);
      lines.push(`  item  # ← No transformation!`);
  }

  lines.push(`;`);

  return lines;
}

function generateFailingTest(func, name, iu) {
  const lines = [];

  lines.push(`  # 🔴 RED: This test will FAIL until you fix ${func.name}()`);

  switch (func.type) {
    case 'validate':
      lines.push(`  echo "Testing ${func.name} returns true for valid..."`);
      lines.push(`  result=$(${name}.${func.name} { id = "123"; name = "Test"; })`);
      lines.push(`  # 🔴 This FAILS because ${func.name} always returns false`);
      lines.push(`  test "$result" = "true" || { echo "❌ FAIL: expected true, got $result"; exit 1; }`);
      lines.push(`  # FIX: Return true when item is actually valid`);
      break;

    case 'query':
      lines.push(`  echo "Testing ${func.name} returns item with matching id..."`);
      lines.push(`  # 🔴 This FAILS because ${func.name} returns 'WRONG_' + id`);
      lines.push(`  # FIX: Return item with ID matching the input`);
      break;

    case 'create':
      lines.push(`  echo "Testing ${func.name} creates item with given id..."`);
      lines.push(`  # 🔴 This FAILS because ${func.name} returns wrong ID`);
      lines.push(`  # FIX: Return created item with correct ID`);
      break;

    case 'list':
      lines.push(`  echo "Testing ${func.name} returns non-empty list..."`);
      lines.push(`  # 🔴 This FAILS because ${func.name} returns []`);
      lines.push(`  # FIX: Return actual items in the list`);
      break;

    case 'delete':
      lines.push(`  echo "Testing ${func.name} returns true on success..."`);
      lines.push(`  # 🔴 This FAILS because ${func.name} returns false`);
      lines.push(`  # FIX: Return true when deletion succeeds`);
      break;

    case 'process':
    default:
      lines.push(`  echo "Testing ${func.name} transforms the input..."`);
      lines.push(`  # 🔴 This FAILS because ${func.name} returns input unchanged`);
      lines.push(`  # FIX: Actually transform/process the input`);
      break;
  }

  lines.push('');

  return lines;
}
