/**
 * Nix Generator for Phoenix Regen
 * Generates clean Nix expressions using theory morphisms
 */

export function generateImpl(iu, config = {}) {
  const lines = [];
  const name = toKebabCase(iu.name);
  const functions = extractFunctions(iu);

  lines.push(`# ✅ CLEAN: ${iu.name} (${iu.short_id})`);
  lines.push(`# Description: ${iu.description}`);
  lines.push(`# Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push(`# Generated: Theory morphism (ThIU → ThNix → ThCode + ThLog)`);
  lines.push('');

  // === TYPES (as comments/docs) ===
  lines.push('# === TYPES ===');
  lines.push('# ${name} :: {');
  lines.push('#   id :: String;');
  lines.push('#   name :: String;');
  lines.push('# }');
  lines.push('');

  // === CLEAN IMPLEMENTATIONS ===
  lines.push('# === IMPLEMENTATIONS (fill in TODOs) ===');
  lines.push('');

  for (const func of functions) {
    lines.push(...generateCleanFunction(func, iu));
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
  lines.push(`    generated_at = "${new Date().toISOString()}";`);
  lines.push(`  };`);
  lines.push('');

  return lines.join('\n');
}

export function generateTests(iu, implPath) {
  const name = toKebabCase(iu.name);

  const lines = [];

  lines.push(`# ✅ Validation tests for ${iu.name} (${iu.short_id})`);
  lines.push(`# These tests validate structure, not behavior`);
  lines.push('');
  lines.push('# Traceability validation (structure only)');
  lines.push('let');
  lines.push(`  impl = import ./${name}.nix;`);
  lines.push('in');
  lines.push('{');
  lines.push('  # Traceability test (structure validation)');
  lines.push('  test-traceability = impl._phoenix.iu_id == "${iu.id}";');
  lines.push('');
  lines.push('  # Structure validation (NOT behavior testing)');
  lines.push('  test-has-exports = builtins.hasAttr "_phoenix" impl;');
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

export function getFileExtension() {
  return '.nix';
}

export function getTestFileExtension() {
  return '.test.nix';
}

export function getTestFilePattern() {
  return { suffix: '.test.nix' };
}

export function isTemplateGenerator() {
  return false;
}

// === MIGRATION SUPPORT ===

export function migrateImpl(iu, oldCode, config = {}) {
  const lines = [];
  const name = toKebabCase(iu.name);

  lines.push(`# 🔄 MIGRATED: ${iu.name} (${iu.short_id})`);
  lines.push(`# From: ${config.oldIuId || 'old IU'}`);
  lines.push(`# Overlap: ${config.overlapRatio || 'unknown'}`);
  lines.push('');

  // Extract old implementation (skip old traceability blocks)
  const cleanedCode = oldCode.replace(
    /# === PHOENIX VCS TRACEABILITY ===[\s\S]*?_phoenix = \{[\s\S]*?\};?/,
    ''
  ).replace(
    /# 🔴 RED:[\s\S]*?(?=# ===|$)/,
    ''
  );

  lines.push(cleanedCode.trim());
  lines.push('');

  // Add new traceability
  lines.push('# === PHOENIX VCS TRACEABILITY ===');
  lines.push('# DO NOT REMOVE — Required for VCS tracking');
  lines.push('{');
  lines.push(`  _phoenix = {`);
  lines.push(`    iu_id = "${iu.id}";`);
  lines.push(`    name = "${iu.name}";`);
  lines.push(`    risk_tier = "${iu.risk_tier}";`);
  lines.push(`    migrated_from = "${config.oldIuId || 'unknown'}";`);
  lines.push(`    migrated_at = "${new Date().toISOString()}";`);
  lines.push(`  };`);
  lines.push('');

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
        });
      } else if (exp.type === 'function' || exp.type === 'derivation') {
        functions.push({
          name: exp.name,
          type: exp.type,
          params: exp.params || [],
          description: exp.description || '',
        });
      }
    }
  }

  // Fallback: infer from IU name if no exports
  if (functions.length === 0) {
    const baseName = toKebabCase(iu.name);
    functions.push({
      name: `build-${baseName}`,
      type: 'derivation',
      params: [],
    });
  }

  return functions;
}

function generateCleanFunction(func, iu) {
  const lines = [];
  const funcName = toKebabCase(func.name);
  const isDerivation = func.type === 'derivation';

  // Determine log prefix
  const logPrefix = inferLogPrefix(funcName, iu.name);

  // Doc comment
  if (func.description) {
    lines.push(`# ${func.description}`);
  }

  // Traceability comment
  const canonId = iu.source_canon_ids?.[0] || 'node-xxxx';
  lines.push(`# @phoenix-canon: ${canonId}`);

  // Nix expression with auto-injected trace logging
  if (isDerivation) {
    lines.push(`${funcName} = {`);
    lines.push(`  # Auto-injected logging`);
    lines.push(`  builtins.trace "${logPrefix} Building ${funcName}" (`);
    lines.push(`    # TODO: Implement derivation logic`);
    lines.push(`    # Source: ${iu.source_canon_ids?.join(', ') || 'spec'}`);
    lines.push(`    pkgs.stdenv.mkDerivation {`);
    lines.push(`      name = "${funcName}";`);
    lines.push(`      src = ./.;`);
    lines.push(`      buildPhase = "echo 'TODO: Implement build';";`);
    lines.push(`    }`);
    lines.push(`  );`);
    lines.push(`};`);
  } else {
    lines.push(`${funcName} = args:`);
    lines.push(`  # Auto-injected logging`);
    lines.push(`  builtins.trace "${logPrefix} ${funcName} called" (`);
    lines.push(`    # TODO: Implement logic from requirements`);
    lines.push(`    # Source: ${iu.source_canon_ids?.join(', ') || 'spec'}`);
    lines.push(`    args`);
    lines.push(`  );`);
  }

  return lines;
}

function inferLogPrefix(funcName, iuName) {
  // Infer appropriate log prefix based on function name
  if (funcName.includes('build')) return '[BUILD]';
  if (funcName.includes('package')) return '[PACKAGE]';
  if (funcName.includes('shell')) return '[SHELL]';
  if (funcName.includes('dev')) return '[DEV]';
  if (funcName.includes('deploy')) return '[DEPLOY]';

  // Fall back to IU name
  const iuLower = iuName.toLowerCase();
  if (iuLower.includes('build')) return '[BUILD]';
  if (iuLower.includes('package')) return '[PACKAGE]';
  if (iuLower.includes('shell')) return '[SHELL]';

  return '[NIX]';
}

// === STRING UTILS ===

function toKebabCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.toLowerCase())
    .join('-')
    .replace(/-+$/, '');
}
