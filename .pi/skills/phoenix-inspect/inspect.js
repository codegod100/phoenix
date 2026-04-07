#!/usr/bin/env node
/**
 * Phoenix Inspect - Visualize Phoenix project structure
 * 
 * Shows spec → requirements → code traceability
 * Identifies gaps and coverage issues
 * 
 * Usage: node .pi/skills/phoenix-inspect/inspect.js [project-root]
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { resolve, join, relative } from 'path';

function shortHash(fullHash) {
  return fullHash?.slice(0, 8) || 'unknown';
}

function loadSpecFiles(projectRoot) {
  const specDir = join(projectRoot, 'spec');
  if (!existsSync(specDir)) {
    return [];
  }
  
  return readdirSync(specDir)
    .filter(f => f.endsWith('.md'))
    .map(f => ({
      name: f,
      path: join(specDir, f),
    }));
}

function loadCanonical(projectRoot) {
  const canonicalPath = join(projectRoot, '.phoenix', 'graphs', 'canonical.json');
  if (!existsSync(canonicalPath)) {
    return null;
  }
  return JSON.parse(readFileSync(canonicalPath, 'utf-8'));
}

function loadIUs(projectRoot) {
  const iusPath = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
  if (!existsSync(iusPath)) {
    return null;
  }
  return JSON.parse(readFileSync(iusPath, 'utf-8'));
}

function loadManifest(projectRoot) {
  const manifestPath = join(projectRoot, '.phoenix', 'manifests', 'generated_manifest.json');
  if (!existsSync(manifestPath)) {
    return null;
  }
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

function findPhoenixExports(projectRoot) {
  const exports = [];
  const generatedDir = join(projectRoot, 'src', 'generated');
  
  if (!existsSync(generatedDir)) {
    return exports;
  }
  
  function scanDir(dir, basePath) {
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relPath = relative(projectRoot, fullPath);
      
      if (entry.isDirectory()) {
        scanDir(fullPath, basePath);
      } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
        try {
          const content = readFileSync(fullPath, 'utf-8');
          const match = content.match(/iu_id:\s*['"]([^'"]+)['"]/);
          if (match) {
            exports.push({
              file: relPath,
              iu_id: match[1],
            });
          }
        } catch {
          // Skip files that can't be read
        }
      }
    }
  }
  
  try {
    scanDir(generatedDir, generatedDir);
  } catch {
    // Directory might not exist
  }
  
  return exports;
}

function buildTraceability(projectRoot) {
  const specFiles = loadSpecFiles(projectRoot);
  const canonical = loadCanonical(projectRoot);
  const ius = loadIUs(projectRoot);
  const manifest = loadManifest(projectRoot);
  const exports = findPhoenixExports(projectRoot);
  
  // Build lookup maps
  const canonById = new Map();
  if (canonical?.nodes) {
    for (const node of canonical.nodes) {
      canonById.set(node.canon_id, node);
    }
  }
  
  const iuById = new Map();
  if (ius?.ius) {
    for (const iu of ius.ius) {
      iuById.set(iu.id, iu);
    }
  }
  
  const exportsByIuId = new Map();
  for (const exp of exports) {
    exportsByIuId.set(exp.iu_id, exp);
  }
  
  // Calculate coverage
  const totalRequirements = canonical?.nodes?.length || 0;
  const coveredRequirements = new Set();
  
  if (ius?.ius) {
    for (const iu of ius.ius) {
      for (const canonId of iu.source_canon_ids || []) {
        coveredRequirements.add(canonId);
      }
    }
  }
  
  const totalIUs = ius?.ius?.length || 0;
  const implementedIUs = exports.length;
  
  return {
    specFiles,
    canonical,
    ius,
    manifest,
    exports,
    coverage: {
      totalRequirements,
      coveredRequirements: coveredRequirements.size,
      orphanRequirements: totalRequirements - coveredRequirements.size,
      totalIUs,
      implementedIUs,
      unimplementedIUs: totalIUs - implementedIUs,
    },
    lookups: {
      canonById,
      iuById,
      exportsByIuId,
    },
  };
}

function formatTraceability(traceability) {
  const lines = [];
  
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix Inspect — Project Traceability                        ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  // Spec files
  lines.push('📄 Specification Files:');
  if (traceability.specFiles.length === 0) {
    lines.push('   ⚠️  No spec files found in spec/');
  } else {
    for (const spec of traceability.specFiles) {
      lines.push(`   • ${spec.name}`);
    }
  }
  lines.push('');
  
  // Canonical requirements
  if (traceability.canonical) {
    lines.push(`📋 Canonical Requirements: ${traceability.canonical.node_count || 0}`);
    lines.push(`   Bootstrap: ${traceability.canonical.bootstrap_state || 'unknown'}`);
    lines.push(`   D-rate: ${((traceability.canonical.d_rate || 0) * 100).toFixed(1)}% (${traceability.canonical.d_rate_level || 'unknown'})`);
    lines.push('');
    
    // Show some requirements
    const nodes = traceability.canonical.nodes?.slice(0, 5) || [];
    if (nodes.length > 0) {
      lines.push('   Sample Requirements:');
      for (const node of nodes) {
        const text = node.statement?.slice(0, 50) || 'N/A';
        lines.push(`      [${node.short_id}] ${text}...`);
      }
      if (traceability.canonical.nodes?.length > 5) {
        lines.push(`      ... and ${traceability.canonical.nodes.length - 5} more`);
      }
      lines.push('');
    }
  } else {
    lines.push('📋 Canonical Requirements: ❌ Not generated');
    lines.push('   Run phoenix-canonicalize to extract requirements');
    lines.push('');
  }
  
  // Implementation Units
  if (traceability.ius) {
    lines.push(`📝 Implementation Units: ${traceability.ius.iu_count || 0}`);
    lines.push('');
    
    for (const iu of traceability.ius.ius?.slice(0, 5) || []) {
      const hasCode = traceability.lookups.exportsByIuId.has(iu.id);
      const icon = hasCode ? '✅' : '⏳';
      const status = hasCode ? 'implemented' : 'planned';
      
      const tierIcon = iu.risk_tier === 'critical' ? '🔴' :
                       iu.risk_tier === 'high' ? '🟠' :
                       iu.risk_tier === 'medium' ? '🟡' : '🔵';
      
      lines.push(`   ${icon} ${iu.short_id}: ${iu.name} ${tierIcon} ${status}`);
      lines.push(`      Requirements: ${iu.source_canon_ids?.length || 0}`);
      lines.push(`      Output: ${iu.output_path}`);
      lines.push('');
    }
    
    if (traceability.ius.ius?.length > 5) {
      lines.push(`   ... and ${traceability.ius.ius.length - 5} more IUs`);
      lines.push('');
    }
  } else {
    lines.push('📝 Implementation Units: ❌ Not planned');
    lines.push('   Run phoenix-plan to create IUs');
    lines.push('');
  }
  
  // Generated files
  if (traceability.exports.length > 0) {
    lines.push(`🚀 Generated Files: ${traceability.exports.length}`);
    for (const exp of traceability.exports.slice(0, 5)) {
      const iu = traceability.lookups.iuById.get(exp.iu_id);
      const iuRef = iu ? iu.short_id : shortHash(exp.iu_id);
      lines.push(`   • ${exp.file} → ${iuRef}`);
    }
    if (traceability.exports.length > 5) {
      lines.push(`   ... and ${traceability.exports.length - 5} more files`);
    }
    lines.push('');
  }
  
  // Manifest
  if (traceability.manifest) {
    const fileCount = Object.keys(traceability.manifest.files || {}).length;
    lines.push(`📦 Manifest: ${fileCount} tracked files`);
    lines.push(`   Generated: ${traceability.manifest.generated_at}`);
    lines.push('');
  } else {
    lines.push('📦 Manifest: ❌ Not generated');
    lines.push('   Run phoenix-regen to create manifest');
    lines.push('');
  }
  
  // Coverage summary
  lines.push('─'.repeat(64));
  lines.push('📊 Coverage Summary:');
  lines.push('');
  lines.push(`   Requirements: ${traceability.coverage.coveredRequirements}/${traceability.coverage.totalRequirements}`);
  lines.push(`   IUs Planned: ${traceability.coverage.totalIUs}`);
  lines.push(`   IUs Implemented: ${traceability.coverage.implementedIUs}`);
  lines.push('');
  
  const coveragePct = traceability.coverage.totalRequirements > 0
    ? Math.round((traceability.coverage.coveredRequirements / traceability.coverage.totalRequirements) * 100)
    : 0;
  
  lines.push(`   Overall Coverage: ${coveragePct}%`);
  lines.push('');
  
  // Gaps
  if (traceability.coverage.orphanRequirements > 0) {
    lines.push('⚠️  Gaps Found:');
    lines.push(`   • ${traceability.coverage.orphanRequirements} requirements not in any IU`);
    
    // Find specific orphan requirements
    if (traceability.canonical?.nodes) {
      const coveredIds = new Set();
      for (const iu of traceability.ius?.ius || []) {
        for (const id of iu.source_canon_ids || []) {
          coveredIds.add(id);
        }
      }
      
      const orphans = traceability.canonical.nodes.filter(n => !coveredIds.has(n.canon_id));
      lines.push('');
      lines.push('   Orphan Requirements:');
      for (const orphan of orphans.slice(0, 5)) {
        const text = orphan.statement?.slice(0, 40) || 'N/A';
        lines.push(`      - [${orphan.short_id}] ${text}...`);
      }
      if (orphans.length > 5) {
        lines.push(`      ... and ${orphans.length - 5} more`);
      }
    }
    lines.push('');
  }
  
  if (traceability.coverage.unimplementedIUs > 0) {
    lines.push(`   • ${traceability.coverage.unimplementedIUs} IUs planned but not generated`);
    lines.push('');
  }
  
  // Recommendations
  if (traceability.coverage.orphanRequirements === 0 && 
      traceability.coverage.unimplementedIUs === 0 &&
      coveragePct === 100) {
    lines.push('✅ All requirements covered and implemented!');
  } else {
    lines.push('🔧 Recommendations:');
    if (!traceability.canonical) {
      lines.push('   1. Run phoenix-canonicalize to extract requirements');
    }
    if (!traceability.ius) {
      lines.push('   2. Run phoenix-plan to organize IUs');
    }
    if (traceability.coverage.unimplementedIUs > 0) {
      lines.push(`   3. Run phoenix-regen to generate ${traceability.coverage.unimplementedIUs} pending IUs`);
    }
    if (traceability.coverage.orphanRequirements > 0) {
      lines.push(`   4. Update IUs to cover ${traceability.coverage.orphanRequirements} orphan requirements`);
    }
    if (!traceability.manifest) {
      lines.push('   5. Verify with phoenix-drift after generation');
    }
  }
  
  return lines.join('\n');
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');

console.log('🔍 Phoenix Inspect');
console.log(`   Project: ${projectRoot}`);
console.log('');

try {
  const traceability = buildTraceability(projectRoot);
  console.log(formatTraceability(traceability));
  console.log('');
  
  // Exit code based on coverage
  if (traceability.coverage.coveredRequirements === 0 && traceability.coverage.totalRequirements > 0) {
    process.exit(1); // Requirements exist but not covered
  }
  if (traceability.coverage.unimplementedIUs > 0) {
    process.exit(1); // IUs pending
  }
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
