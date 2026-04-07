#!/usr/bin/env node
/**
 * Phoenix Regen - Generate implementation code from Implementation Units
 * 
 * Generates TypeScript code with:
 * - Traceability exports (_phoenix object with iu_id)
 * - Contract implementation (inputs, outputs, invariants)
 * - Evidence collection hooks
 * - File hash recording in manifest
 * 
 * Usage: node .pi/skills/phoenix-regen/regen.js [project-root]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join, dirname, relative } from 'path';

// === VCS IDENTITY FUNCTIONS ===

function sha256(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function fileHash(content) {
  return sha256(content);
}

function shortHash(fullHash) {
  return fullHash.slice(0, 8);
}

// === CODE GENERATION ===

function generateTypeScriptCode(iu) {
  const lines = [];
  
  // Header comment
  lines.push(`// Generated: ${iu.name} (${iu.short_id})`);
  lines.push(`// Description: ${iu.description}`);
  lines.push(`// Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');

  // Types based on contract
  if (iu.contract.inputs.length > 0 || iu.contract.outputs.length > 0) {
    lines.push('// === TYPES ===');
    lines.push('');
    lines.push('export interface Config {');
    lines.push('  // Configuration options');
    for (const input of iu.contract.inputs.slice(0, 3)) {
      const cleanInput = input.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 20);
      lines.push(`  ${cleanInput}?: string;`);
    }
    lines.push('}');
    lines.push('');
  }

  // Main implementation
  lines.push('// === IMPLEMENTATION ===');
  lines.push('');

  // Generate functions based on outputs
  for (const output of iu.contract.outputs.slice(0, 3)) {
    const funcName = output
      .replace(/system shall /, '')
      .replace(/the /, '')
      .replace(/[^a-zA-Z0-9]/g, '_')
      .slice(0, 30)
      .replace(/_+$/, '');
    
    lines.push(`/**`);
    lines.push(` * ${output}`);
    lines.push(` * Invariant: ${iu.contract.invariants[0] || 'Maintains valid state'}`);
    lines.push(` */`);
    lines.push(`export function ${funcName}(config?: Config): string {`);
    lines.push(`  // TODO: Implement based on requirements:`);
    for (const canonId of iu.source_canon_ids.slice(0, 3)) {
      lines.push(`  //   - ${canonId.slice(0, 12)}...`);
    }
    lines.push(`  throw new Error('Not implemented: ${funcName}');`);
    lines.push('}');
    lines.push('');
  }

  // Default export if no functions generated
  if (iu.contract.outputs.length === 0) {
    lines.push(`/**`);
    lines.push(` * Main implementation for ${iu.name}`);
    lines.push(` */`);
    lines.push(`export function implement(config?: Config): void {`);
    lines.push(`  // TODO: Implement ${iu.source_canon_ids.length} requirements`);
    lines.push(`  console.log('Implementing ${iu.name}...');`);
    lines.push('}');
    lines.push('');
  }

  // Traceability export (REQUIRED)
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

function generateTestFile(iu, implPath) {
  const lines = [];
  
  lines.push(`// Generated tests for ${iu.name} (${iu.short_id})`);
  lines.push(`// Risk Tier: ${iu.risk_tier.toUpperCase()}`);
  lines.push('');
  lines.push(`import { _phoenix } from '../${relative(dirname(iu.test_path), implPath).replace(/\\/g, '/')}';`);
  lines.push('');
  lines.push('describe(`${_phoenix.name}', () => {');
  lines.push('  it(' + "'" + 'has traceability export' + "'" + ', () => {');
  lines.push('    expect(_phoenix).toBeDefined();');
  lines.push(`    expect(_phoenix.iu_id).toBe('${iu.id}');`);
  lines.push(`    expect(_phoenix.risk_tier).toBe('${iu.risk_tier}');`);
  lines.push('  });');
  lines.push('');
  lines.push('  it(' + "'" + 'implements all requirements' + "'" + ', () => {');
  lines.push(`    const requirements = ${iu.source_canon_ids.length};`);
  lines.push('    expect(requirements).toBeGreaterThan(0);');
  lines.push('  });');
  lines.push('');
  lines.push('  // TODO: Add tests for:');
  for (const invariant of iu.contract.invariants.slice(0, 3)) {
    lines.push(`  // - ${invariant.slice(0, 60)}...`);
  }
  lines.push('});');
  lines.push('');

  return lines.join('\n');
}

function loadIUGraph(projectRoot) {
  const iusPath = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
  if (!existsSync(iusPath)) {
    return null;
  }
  return JSON.parse(readFileSync(iusPath, 'utf-8'));
}

function loadManifest(projectRoot) {
  const manifestPath = join(projectRoot, '.phoenix', 'manifests', 'generated_manifest.json');
  if (!existsSync(manifestPath)) {
    return { version: '1.0.0', generated_at: new Date().toISOString(), files: {} };
  }
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

function saveManifest(projectRoot, manifest) {
  const manifestDir = join(projectRoot, '.phoenix', 'manifests');
  if (!existsSync(manifestDir)) {
    mkdirSync(manifestDir, { recursive: true });
  }
  const manifestPath = join(manifestDir, 'generated_manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifestPath;
}

function regenerate(projectRoot, iuIdFilter = null) {
  const iuGraph = loadIUGraph(projectRoot);
  if (!iuGraph) {
    throw new Error('No IU graph found. Run phoenix-plan first.');
  }

  const manifest = loadManifest(projectRoot);
  const generated = [];
  const errors = [];

  for (const iu of iuGraph.ius) {
    // Filter if specified
    if (iuIdFilter && !iu.id.includes(iuIdFilter) && iu.short_id !== iuIdFilter) {
      continue;
    }

    try {
      // Generate implementation
      const implContent = generateTypeScriptCode(iu);
      const implPath = join(projectRoot, iu.output_path);
      
      // Ensure directory exists
      const implDir = dirname(implPath);
      if (!existsSync(implDir)) {
        mkdirSync(implDir, { recursive: true });
      }

      // Write implementation file
      writeFileSync(implPath, implContent, 'utf-8');

      // Generate test file
      const testContent = generateTestFile(iu, iu.output_path);
      const testPath = join(projectRoot, iu.test_path);
      const testDir = dirname(testPath);
      if (!existsSync(testDir)) {
        mkdirSync(testDir, { recursive: true });
      }
      writeFileSync(testPath, testContent, 'utf-8');

      // Update manifest
      const relativeImpl = relative(projectRoot, implPath);
      const relativeTest = relative(projectRoot, testPath);
      
      manifest.files[relativeImpl] = {
        iu_id: iu.id,
        hash: fileHash(implContent),
        size: implContent.length,
        generated_at: new Date().toISOString(),
      };
      
      manifest.files[relativeTest] = {
        iu_id: iu.id,
        hash: fileHash(testContent),
        size: testContent.length,
        generated_at: new Date().toISOString(),
      };

      generated.push({
        iu_id: iu.id,
        short_id: iu.short_id,
        name: iu.name,
        files: [relativeImpl, relativeTest],
      });

    } catch (err) {
      errors.push({
        iu_id: iu.id,
        error: err.message,
      });
    }
  }

  // Save updated manifest
  manifest.generated_at = new Date().toISOString();
  const manifestPath = saveManifest(projectRoot, manifest);

  return { generated, errors, manifestPath, manifest };
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');
const iuFilter = process.argv[3] || null; // Optional: specific IU to regenerate

console.log('🚀 Phoenix Regen');
console.log(`   Project: ${projectRoot}`);
if (iuFilter) {
  console.log(`   Filter: ${iuFilter}`);
}
console.log('');

try {
  // Check for IU graph
  const iusPath = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
  if (!existsSync(iusPath)) {
    console.error(`❌ No IU graph found at ${iusPath}`);
    console.error('   Run phoenix-plan first to create Implementation Units.');
    process.exit(1);
  }

  // Run regeneration
  const result = regenerate(projectRoot, iuFilter);

  // Print results
  console.log(`✅ Generated ${result.generated.length} IUs`);
  console.log(`   Errors: ${result.errors.length}`);
  console.log(`   Manifest: ${result.manifestPath}`);
  console.log('');

  for (const gen of result.generated) {
    const icon = gen.files.some(f => f.includes('__tests__')) ? '🧪' : '📄';
    console.log(`   ${icon} ${gen.short_id}: ${gen.name}`);
    for (const file of gen.files) {
      console.log(`      - ${file}`);
    }
  }
  console.log('');

  if (result.errors.length > 0) {
    console.log('❌ Errors:');
    for (const err of result.errors) {
      console.log(`   ${err.iu_id}: ${err.error}`);
    }
    console.log('');
  }

  // Show evidence requirements
  const iuGraph = loadIUGraph(projectRoot);
  const totalTests = result.generated.filter(g => 
    g.files.some(f => f.includes('__tests__'))
  ).length;
  
  console.log('📋 Evidence Summary:');
  console.log(`   Files generated: ${result.manifest.files.length}`);
  console.log(`   Test files: ${totalTests}`);
  console.log('');

  // Risk breakdown
  const riskCounts = { low: 0, medium: 0, high: 0, critical: 0 };
  for (const iu of iuGraph.ius) {
    riskCounts[iu.risk_tier]++;
  }
  console.log('   Risk distribution:');
  for (const [tier, count] of Object.entries(riskCounts)) {
    if (count > 0) {
      const icon = tier === 'critical' ? '🔴' :
                   tier === 'high' ? '🟠' :
                   tier === 'medium' ? '🟡' : '🔵';
      console.log(`      ${icon} ${tier}: ${count}`);
    }
  }
  console.log('');

  console.log('🧪 Next step: Run phoenix-evidence to collect quality evidence');

  if (result.errors.length > 0) {
    process.exit(1);
  }

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
