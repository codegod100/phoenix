/**
 * Python Generator for Phoenix Regen
 * Generates clean implementations with auto-injected logging using theory morphisms
 */

export function generateImpl(iu, config = {}) {
  const lines = [];
  const className = toPascalCase(iu.name);
  const functions = extractFunctions(iu);
  const snakeName = toSnakeCase(iu.name);

  // Read codegen instruction for logging requirements if available
  const codegenInstruction = loadCodegenInstruction(config.projectRoot);
  const loggingConfig = codegenInstruction?.logging || {};

  lines.push(`# ✅ CLEAN: ${iu.name} (${iu.short_id})`);
  lines.push(`# Description: ${iu.description}`);
  lines.push(`# Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push(`# Generated: Theory morphism (ThIU → ThPython → ThCode + ThLog)`);
  lines.push('');

  // === IMPORTS ===
  lines.push('# === IMPORTS ===');
  lines.push('import logging');
  lines.push('from dataclasses import dataclass, field');
  lines.push('from typing import Optional, List, Dict, Any, Callable');
  lines.push('from datetime import datetime');
  lines.push('');
  lines.push('logger = logging.getLogger(__name__)');
  lines.push('');

  // === TYPES (dataclasses) ===
  lines.push('# === TYPES ===');
  lines.push('');
  lines.push('@dataclass(slots=True)');
  lines.push(`class ${className}:`);
  lines.push(`    """${iu.description || className} data model.`);
  lines.push('    ');
  lines.push(`    REQUIREMENT: ${iu.source_canon_ids?.[0] || 'From spec'}`);
  lines.push(`    """`);
  lines.push(`    id: str`);
  lines.push(`    name: Optional[str] = None`);
  lines.push(`    created_at: datetime = field(default_factory=datetime.now)`);
  lines.push('');

  // === CLEAN IMPLEMENTATIONS ===
  lines.push('# === IMPLEMENTATIONS (fill in TODOs) ===');
  lines.push('');

  for (const func of functions) {
    lines.push(...generateCleanFunction(func, className, iu, loggingConfig));
    lines.push('');
  }

  // Traceability
  lines.push('# === PHOENIX VCS TRACEABILITY ===');
  lines.push('# DO NOT REMOVE — Required for VCS tracking');
  lines.push('_phoenix = {');
  lines.push(`    "iu_id": "${iu.id}",`);
  lines.push(`    "name": "${iu.name}",`);
  lines.push(`    "risk_tier": "${iu.risk_tier}",`);
  lines.push(`    "generated_at": "${new Date().toISOString()}",`);
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

export function generateTests(iu, implPath) {
  // Optional: Generate minimal validation test
  // This is NOT TDD - just validates the code structure
  const className = toPascalCase(iu.name);
  const moduleName = toSnakeCase(iu.name);

  const lines = [];

  lines.push(`# ✅ Validation tests for ${iu.name} (${iu.short_id})`);
  lines.push(`# These tests validate structure, not behavior`);
  lines.push('');
  lines.push(`from ${moduleName} import _phoenix, ${className}`);
  lines.push('');
  lines.push('# Traceability test (validates VCS identity)');
  lines.push('def test_traceability():');
  lines.push('    """Verify Phoenix VCS traceability is present."""');
  lines.push('    assert _phoenix is not None');
  lines.push(`    assert _phoenix["iu_id"] == "${iu.id}"`);
  lines.push(`    assert _phoenix["name"] == "${iu.name}"`);
  lines.push('');
  lines.push('# Structure validation (NOT behavior testing)');
  lines.push('def test_model_structure():');
  lines.push(`    """Verify ${className} can be instantiated."""`);
  lines.push(`    instance = ${className}(id="test-123")`);
  lines.push('    assert instance.id == "test-123"');
  lines.push('');

  return lines.join('\n');
}

export function getFileExtension() {
  return '.py';
}

export function getTestFileExtension() {
  return { prefix: 'test_', suffix: '.py' };
}

export function getTestFilePattern() {
  return { prefix: 'test_', suffix: '.py' };
}

export function isTemplateGenerator() {
  return false;
}

// === MIGRATION SUPPORT ===

export function migrateImpl(iu, oldCode, config = {}) {
  // Simple migration: wrap old code with new traceability header
  const lines = [];
  const className = toPascalCase(iu.name);

  lines.push(`# 🔄 MIGRATED: ${iu.name} (${iu.short_id})`);
  lines.push(`# From: ${config.oldIuId || 'old IU'}`);
  lines.push(`# Overlap: ${config.overlapRatio || 'unknown'}`);
  lines.push('');

  // Extract old implementation body (skip old traceability blocks)
  const cleanedCode = oldCode.replace(
    /# === PHOENIX VCS TRACEABILITY ===[\s\S]*?_phoenix = \{[\s\S]*?\}/,
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
  lines.push('_phoenix = {');
  lines.push(`    "iu_id": "${iu.id}",`);
  lines.push(`    "name": "${iu.name}",`);
  lines.push(`    "risk_tier": "${iu.risk_tier}",`);
  lines.push(`    "migrated_from": "${config.oldIuId || 'unknown'}",`);
  lines.push(`    "migrated_at": "${new Date().toISOString()}",`);
  lines.push('}');
  lines.push('');

  return lines.join('\n');
}

// === HELPER FUNCTIONS ===

function loadCodegenInstruction(projectRoot) {
  try {
    const fs = require('fs');
    const path = require('path');
    const instructionPath = path.join(projectRoot, '.phoenix', 'codegen-instruction.md');
    if (!fs.existsSync(instructionPath)) {
      return null;
    }
    const content = fs.readFileSync(instructionPath, 'utf-8');
    // Parse logging section from instruction
    const loggingMatch = content.match(/### Logging & Tracing Requirements[\s\S]*?(?=###|$)/);
    if (loggingMatch) {
      return { logging: { enabled: true, raw: loggingMatch[0] } };
    }
    return null;
  } catch (e) {
    return null;
  }
}

function extractFunctions(iu) {
  const functions = [];

  // Extract from boundary exports
  if (iu.boundary?.exports) {
    for (const exp of iu.boundary.exports) {
      if (typeof exp === 'string') {
        functions.push({
          name: exp,
          type: 'method',
          params: [],
          returns: 'None',
        });
      } else if (exp.type === 'function' || exp.type === 'method') {
        functions.push({
          name: exp.name,
          type: exp.type,
          params: exp.params || [],
          returns: exp.returns || 'None',
          description: exp.description || '',
        });
      }
    }
  }

  // Fallback: infer from IU name if no exports
  if (functions.length === 0) {
    const baseName = toSnakeCase(iu.name);
    functions.push({
      name: `process_${baseName}`,
      type: 'function',
      params: [{ name: 'data', type: 'Any' }],
      returns: 'Any',
    });
  }

  return functions;
}

function generateCleanFunction(func, className, iu, loggingConfig) {
  const lines = [];
  const funcName = toSnakeCase(func.name);
  const isMethod = func.type === 'method';
  const selfParam = isMethod ? 'self' : '';

  // Determine log prefix based on function name
  const logPrefix = inferLogPrefix(funcName, iu.name);

  // Docstring
  lines.push(`def ${funcName}(${generateParams(func, selfParam)}):`);
  lines.push(`    """${func.description || funcName + ' implementation.'}`);
  lines.push('    ');
  lines.push(`    REQUIREMENT: From ${iu.name} (${iu.short_id})`);
  lines.push(`    """`);

  // Traceability comment
  const canonId = iu.source_canon_ids?.[0] || 'node-xxxx';
  lines.push(`    # @phoenix-canon: ${canonId}`);

  // Auto-injected logging (entry point)
  if (isMethod) {
    lines.push(`    logger.info(f"${logPrefix} ${funcName} called")`);
  } else {
    lines.push(`    logger.info(f"${logPrefix} ${funcName} called")`);
  }

  // State transition logging for special methods
  if (funcName.includes('auth') && funcName.includes('completed')) {
    lines.push(`    logger.info(f"${logPrefix} Auth completed, updating session")`);
  }
  if (funcName.includes('mount')) {
    lines.push(`    logger.info(f"${logPrefix} Starting initialization")`);
  }

  // TODO placeholder
  lines.push('    # TODO: Implement logic from requirements');
  lines.push(`    # Source: ${iu.source_canon_ids?.join(', ') || 'spec'}`);

  // Default return
  if (func.returns && func.returns !== 'None') {
    lines.push(`    return None  # TODO: Return ${func.returns}`);
  }

  return lines;
}

function generateParams(func, selfParam) {
  const params = [];
  if (selfParam) {
    params.push(selfParam);
  }
  if (func.params) {
    for (const p of func.params) {
      params.push(`${p.name}: ${p.type || 'Any'}`);
    }
  }
  return params.join(', ');
}

function inferLogPrefix(funcName, iuName) {
  // Infer appropriate log prefix based on function name
  if (funcName.includes('auth')) return '[AUTH]';
  if (funcName.includes('mount')) return '[MOUNT]';
  if (funcName.includes('save') || funcName.includes('load')) return '[IO]';
  if (funcName.includes('connect') || funcName.includes('send')) return '[BROKER]';
  if (funcName.includes('watch')) return '[REACTIVE]';
  if (funcName.includes('on_')) return '[EVENT]';
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

function toKebabCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.toLowerCase())
    .join('-')
    .replace(/-+$/, '');
}

function toSnakeCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.toLowerCase())
    .join('_')
    .replace(/_+$/, '');
}
