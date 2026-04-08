#!/usr/bin/env node
/**
 * Phoenix Plan - Organize requirements into Implementation Units
 *
 * Groups canonical requirements into IUs with:
 * - Content-addressed IU IDs (SHA-256 of contract + requirements)
 * - Risk tier assignment (low/medium/high/critical)
 * - Contract definition (inputs, outputs, invariants)
 * - Boundary policies
 * - Evidence requirements
 *
 * Usage: node .pi/skills/phoenix-plan/plan.js [project-root]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join } from 'path';

// === VCS IDENTITY FUNCTIONS ===

function sha256(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function iuId(name, contract, sourceCanonIds) {
  const parts = [
    name.toLowerCase().trim(),
    contract.toLowerCase().trim(),
    ...sourceCanonIds.sort(),
  ];
  return sha256(parts.join('\x00'));
}

function shortHash(fullHash) {
  return fullHash.slice(0, 8);
}

// === RISK TIER DETERMINATION ===

function determineRiskTier(requirementCount, hasUI, hasSecurityRisk) {
  if (hasSecurityRisk || requirementCount > 20) {
    return 'critical';
  }
  if (requirementCount >= 10 || hasUI) {
    return 'high';
  }
  if (requirementCount >= 5) {
    return 'medium';
  }
  return 'low';
}

function getRequiredEvidence(tier) {
  switch (tier) {
    case 'low':
      return ['typecheck', 'lint', 'boundary_validation'];
    case 'medium':
      return ['typecheck', 'lint', 'boundary_validation', 'unit_tests'];
    case 'high':
      return [
        'typecheck', 'lint', 'boundary_validation', 'unit_tests',
        'property_tests', 'threat_note'
      ];
    case 'critical':
      return [
        'typecheck', 'lint', 'boundary_validation', 'unit_tests',
        'property_tests', 'threat_note', 'static_analysis', 'human_signoff'
      ];
    default:
      return ['typecheck'];
  }
}

// === OPERATION EXTRACTION FROM REQUIREMENTS ===

/**
 * Extract operation names from requirement statements.
 * Parses requirement text to identify functions that should be exported.
 * 
 * This uses GENERIC patterns - no application-specific logic.
 * Derives everything from canonical requirement text only.
 */
function extractOperationsFromRequirements(requirements) {
  const operations = new Set();
  
  for (const req of requirements) {
    const text = req.statement.toLowerCase();
    
    // Pattern: "provide a function to X"
    const provideMatch = text.match(/provide a function to (\w+)/);
    if (provideMatch) {
      operations.add(provideMatch[1]);
    }
    
    // Pattern: "system must provide X" / "must provide a function for X"
    const systemProvideMatch = text.match(/(?:system must|must) provide(?: a function for| a way to)? (\w+)/);
    if (systemProvideMatch) {
      operations.add(systemProvideMatch[1]);
    }
    
    // Pattern: "users must be able to X" (generic verb extraction)
    const userActionMatch = text.match(/users must be able to (\w+)/);
    if (userActionMatch) {
      operations.add(userActionMatch[1]);
    }
    
    // Pattern: "X must be Yable" (queryable, filterable, searchable, etc.)
    const ableMatch = text.match(/(\w+) must be (\w+able)/);
    if (ableMatch) {
      const entity = ableMatch[1];
      const capability = ableMatch[2].replace('able', ''); // queryable -> query
      operations.add(`${capability}${capitalize(entity)}`);
    }
    
    // Pattern: "X must be filterable by Y"
    const filterMatch = text.match(/must be filterable by (\w+)/);
    if (filterMatch) {
      operations.add(`filterBy${capitalize(filterMatch[1])}`);
    }
    
    // Pattern: "sortable by X"
    const sortMatch = text.match(/sortable by (\w+)/);
    if (sortMatch) {
      operations.add('sortBy');
    }
    
    // Pattern: "searchable by X"
    const searchMatch = text.match(/searchable by (\w+)/);
    if (searchMatch) {
      operations.add('search');
    }
  }
  
  return Array.from(operations);
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function loadCanonical(projectRoot) {
  const canonicalPath = join(projectRoot, '.phoenix', 'graphs', 'canonical.json');
  if (!existsSync(canonicalPath)) {
    return null;
  }
  return JSON.parse(readFileSync(canonicalPath, 'utf-8'));
}

function groupRequirementsIntoIUs(nodes) {
  // Group by section/feature area
  const groups = new Map();

  for (const node of nodes) {
    const section = node.section || 'General';
    const baseName = section.split(' ')[0]; // e.g., "Task Domain" -> "Task"

    if (!groups.has(baseName)) {
      groups.set(baseName, {
        name: baseName,
        section: section,
        requirements: [],
      });
    }
    groups.get(baseName).requirements.push(node);
  }

  return Array.from(groups.values());
}

function createIU(group, index) {
  const reqCount = group.requirements.length;
  const hasUI = group.requirements.some(r =>
    r.statement.includes('html') ||
    r.statement.includes('css') ||
    r.statement.includes('display') ||
    r.statement.includes('render')
  );
  const hasSecurity = group.requirements.some(r =>
    r.statement.includes('security') ||
    r.statement.includes('auth') ||
    r.statement.includes('encrypt')
  );

  const riskTier = determineRiskTier(reqCount, hasUI, hasSecurity);
  const sourceCanonIds = group.requirements.map(r => r.canon_id);

  const name = `${group.name} Domain`;
  const contract = `Implements ${group.name.toLowerCase()} functionality with ${reqCount} requirements`;

  const id = iuId(name, contract, sourceCanonIds);
  const shortId = `IU-${shortHash(id)}`;

  const inputs = [];
  const outputs = [];
  const invariants = [];

  // Extract inputs/outputs/invariants from requirements
  for (const req of group.requirements) {
    const text = req.statement;

    if (text.includes('input') || text.includes('parameter')) {
      inputs.push(text);
    }
    if (text.includes('output') || text.includes('return') || text.includes('render')) {
      outputs.push(text);
    }
    if (text.includes('shall not') || text.includes('must not') || text.includes('only')) {
      invariants.push(text);
    }
  }

  // Default invariants if none detected
  if (invariants.length === 0) {
    invariants.push('Valid state transitions only');
    invariants.push('Type safety maintained');
  }

  // Extract operations from requirements for boundary exports
  const operations = extractOperationsFromRequirements(group.requirements);
  
  // Create boundary with exports if operations found
  const boundary = operations.length > 0 ? {
    exports: operations
  } : undefined;

  return {
    id,
    short_id: shortId,
    name,
    kind: hasUI ? 'web-ui' : 'module',
    risk_tier: riskTier,
    description: contract,
    source_canon_ids: sourceCanonIds,
    contract: {
      description: contract,
      inputs: inputs.length > 0 ? inputs : ['Configuration', 'Data inputs'],
      outputs: outputs.length > 0 ? outputs : ['Processed results', 'Side effects'],
      invariants,
    },
    output_path: `src/generated/${group.name.toLowerCase().replace(/\s+/g, '-')}/index.ts`,
    test_path: `src/generated/${group.name.toLowerCase().replace(/\s+/g, '-')}/__tests__/index.test.ts`,
    dependencies: [],
    boundary_policy: {
      dependencies: {
        code: {
          allowed_ius: [],
          allowed_packages: [],
          forbidden_ius: [],
          forbidden_packages: [],
          forbidden_paths: ['node_modules/external-ui-lib'],
        },
        side_channels: {
          databases: hasSecurity ? [] : ['app.db'],
          queues: [],
          caches: [],
          config: [],
          external_apis: [],
          files: [],
        },
      },
    },
    boundary,
    evidence_policy: {
      required: getRequiredEvidence(riskTier),
    },
    tags: [group.name.toLowerCase(), hasUI ? 'ui' : 'core', `${riskTier}-risk`],
  };
}

function plan(projectRoot) {
  const canonical = loadCanonical(projectRoot);
  if (!canonical) {
    throw new Error('No canonical requirements found. Run phoenix-canonicalize first.');
  }

  const groups = groupRequirementsIntoIUs(canonical.nodes || []);
  const ius = groups.map((group, index) => createIU(group, index));

  // Calculate coverage
  const coveredCanonIds = new Set();
  for (const iu of ius) {
    for (const canonId of iu.source_canon_ids) {
      coveredCanonIds.add(canonId);
    }
  }

  const allCanonIds = new Set(canonical.nodes.map(n => n.canon_id));
  const orphanIds = [...allCanonIds].filter(id => !coveredCanonIds.has(id));

  return {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    iu_count: ius.length,
    coverage: {
      total_canon_nodes: canonical.nodes.length,
      covered_canon_nodes: coveredCanonIds.size,
      orphan_canon_ids: orphanIds,
    },
    ius,
  };
}

function writePlanMarkdown(projectRoot, plan) {
  const lines = [];
  lines.push('# Implementation Units');
  lines.push('');
  lines.push('Planned from canonical requirements. Each IU groups related requirements by feature area.');
  lines.push('');

  for (const iu of plan.ius) {
    lines.push(`---`);
    lines.push('');
    lines.push(`## ${iu.short_id}: ${iu.name} (${iu.risk_tier.toUpperCase()})`);
    lines.push('');
    lines.push(`**Description:** ${iu.description}`);
    lines.push('');
    lines.push(`**Risk Tier:** ${iu.risk_tier} (${iu.source_canon_ids.length} requirements)`);
    lines.push('');

    lines.push('**Canonical Requirements:**');
    for (const canonId of iu.source_canon_ids.slice(0, 10)) {
      lines.push(`- ${canonId.slice(0, 12)}...`);
    }
    if (iu.source_canon_ids.length > 10) {
      lines.push(`- ... and ${iu.source_canon_ids.length - 10} more`);
    }
    lines.push('');

    lines.push('**Contract:**');
    lines.push(`- Inputs: ${iu.contract.inputs.join(', ')}`);
    lines.push(`- Outputs: ${iu.contract.outputs.join(', ')}`);
    lines.push(`- Invariants: ${iu.contract.invariants.join(', ')}`);
    lines.push('');

    lines.push('**Output Files:**');
    lines.push(`- \`${iu.output_path}\``);
    lines.push(`- \`${iu.test_path}\``);
    lines.push('');

    lines.push('**Evidence Required:**');
    lines.push(iu.evidence_policy.required.map(e => `- ${e}`).join('\n'));
    lines.push('');
  }

  lines.push('---');
  lines.push('');
  lines.push('## Coverage Summary');
  lines.push('');
  lines.push(`- Total canonical nodes: ${plan.coverage.total_canon_nodes}`);
  lines.push(`- Covered: ${plan.coverage.covered_canon_nodes}`);
  lines.push(`- Orphans: ${plan.coverage.orphan_canon_ids.length}`);
  lines.push('');

  if (plan.coverage.orphan_canon_ids.length > 0) {
    lines.push('### Orphan Requirements (not assigned to any IU)');
    lines.push('');
    for (const orphan of plan.coverage.orphan_canon_ids) {
      lines.push(`- ${orphan.slice(0, 12)}...`);
    }
  }

  const mdPath = join(projectRoot, '.phoenix', 'plan.md');
  writeFileSync(mdPath, lines.join('\n'), 'utf-8');
  return mdPath;
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');

console.log('📝 Phoenix Plan');
console.log(`   Project: ${projectRoot}\n`);

try {
  // Check for canonical requirements
  const canonicalPath = join(projectRoot, '.phoenix', 'graphs', 'canonical.json');
  if (!existsSync(canonicalPath)) {
    console.error(`❌ No canonical requirements found at ${canonicalPath}`);
    console.error('   Run phoenix-canonicalize first to extract requirements.');
    process.exit(1);
  }

  // Run planning
  const planResult = plan(projectRoot);

  // Ensure output directory exists
  const outputDir = join(projectRoot, '.phoenix', 'graphs');
  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  // Write JSON output
  const jsonPath = join(outputDir, 'ius.json');
  writeFileSync(jsonPath, JSON.stringify(planResult, null, 2), 'utf-8');

  // Write Markdown output
  const mdPath = writePlanMarkdown(projectRoot, planResult);

  // Print results
  console.log(`✅ Planned ${planResult.iu_count} Implementation Units`);
  console.log(`   Coverage: ${planResult.coverage.covered_canon_nodes}/${planResult.coverage.total_canon_nodes} requirements`);
  console.log(`   Orphans: ${planResult.coverage.orphan_canon_ids.length}`);
  console.log('');

  // Show IU summary
  console.log('Implementation Units:');
  for (const iu of planResult.ius) {
    const icon = iu.risk_tier === 'critical' ? '🔴' :
                 iu.risk_tier === 'high' ? '🟠' :
                 iu.risk_tier === 'medium' ? '🟡' : '🔵';
    console.log(`   ${icon} ${iu.short_id}: ${iu.name} (${iu.risk_tier})`);
  }
  console.log('');

  console.log(`   JSON: ${jsonPath}`);
  console.log(`   Markdown: ${mdPath}`);
  console.log('');

  if (planResult.coverage.orphan_canon_ids.length > 0) {
    console.log('⚠️  WARNING: Some requirements not assigned to IUs');
    console.log('   Review orphan nodes and assign to appropriate IUs');
  }

  console.log('🚀 Next step: Run phoenix-regen to generate code for these IUs');

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
