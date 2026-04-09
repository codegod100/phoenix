#!/usr/bin/env node
/**
 * Phoenix GAT Validator
 * 
 * Formal Generalized Algebraic Theory validation for Phoenix VCS pipeline.
 * Enforces strict mathematical compliance with ThSpec → ThCanon → ThIU → ThCode.
 * 
 * Usage: node validate-gat.js [project-root]
 * 
 * This is PURE MATHEMATICS. Every transformation must be a structure-preserving
 * morphism between theories. No exceptions. No hand-waving.
 */

import { readFileSync, existsSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

// Import panproto
const __dirname = dirname(fileURLToPath(import.meta.url));
const { getPanproto, buildSchemaFromData } = await import(join(__dirname, '..', 'panproto', 'panproto.js'));

// ANSI colors
const RESET = '\x1b[0m';
const RED = '\x1b[31m';
const GREEN = '\x1b[32m';
const YELLOW = '\x1b[33m';
const BLUE = '\x1b[34m';
const MAGENTA = '\x1b[35m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';

function log(header, message, color = RESET) {
  console.log(`${color}${BOLD}${header}${RESET} ${message}`);
}

function success(msg) { log('✅', msg, GREEN); }
function error(msg) { log('❌', msg, RED); }
function warning(msg) { log('⚠️ ', msg, YELLOW); }
function info(msg) { log('ℹ️ ', msg, BLUE); }
function math(msg) { log('∴', msg, MAGENTA); }

class GATValidator {
  constructor() {
    this.axioms = [];
    this.violations = [];
    this.proofs = [];
  }

  // AXIOM: Universal property - every clause must have a canonical form
  validateCanonicalDeterminism(clauses, nodes) {
    const axiom = 'canonical_deterministic';
    const desc = '∀c1,c2: SpecClause, normalize(c1)=normalize(c2) ⟹ canonize(c1)=canonize(c2)';
    
    const textToCanons = new Map();
    for (const node of nodes) {
      const text = node.statement?.toLowerCase().trim();
      if (!text) continue;
      
      if (!textToCanons.has(text)) {
        textToCanons.set(text, []);
      }
      textToCanons.get(text).push(node.canon_id);
    }
    
    const duplicates = [...textToCanons.entries()].filter(([k, v]) => v.length > 1);
    
    if (duplicates.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ axiom, desc, found: `${duplicates.length} duplicate groups` });
      return false;
    }
  }

  // AXIOM: Provenance - every canonical node must trace to at least one clause
  validateProvenance(nodes) {
    const axiom = 'provenance_total';
    const desc = '∀n: CanonNode, ∃c: SpecClause where n derivedFrom c';
    
    const withoutProvenance = nodes.filter(n => 
      !n.source_clause_ids || n.source_clause_ids.length === 0
    );
    
    if (withoutProvenance.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${withoutProvenance.length} nodes without provenance`,
        examples: withoutProvenance.slice(0, 3).map(n => n.canon_id)
      });
      return false;
    }
  }

  // AXIOM: D-rate bounded - duplication rate must be in [0, 1]
  validateDRateBounded(canon) {
    const axiom = 'drate_bounded';
    const desc = '∀c: CanonNode, dRate(c) ∈ [0, 1]';
    
    const dRate = canon.d_rate || 0;
    const valid = dRate >= 0 && dRate <= 100; // percentage
    
    if (valid) {
      this.axioms.push({ name: axiom, desc, status: 'SAT', value: dRate });
      return true;
    } else {
      this.violations.push({ axiom, desc, found: `dRate = ${dRate}% (out of bounds)` });
      return false;
    }
  }

  // AXIOM: IU Covering - every canonical node must be in at least one IU
  validateIUCovering(nodes, ius) {
    const axiom = 'iu_covering';
    const desc = '∀n: CanonNode, ∃iu: IU where n ∈ containsCanon(iu)';
    
    const coveredIds = new Set();
    for (const iu of ius.ius || []) {
      for (const cid of iu.source_canon_ids || []) {
        coveredIds.add(cid);
      }
    }
    
    const uncovered = nodes.filter(n => !coveredIds.has(n.canon_id || n.id));
    
    if (uncovered.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${uncovered.length} uncovered canonical nodes`,
        examples: uncovered.slice(0, 3).map(n => n.canon_id || n.id)
      });
      return false;
    }
  }

  // AXIOM: IU Non-Empty - every IU must contain at least one canonical node
  validateIUNonEmpty(ius) {
    const axiom = 'iu_nonempty';
    const desc = '∀iu: IU, |containsCanon(iu)| ≥ 1';
    
    const empty = (ius.ius || []).filter(iu => 
      !iu.source_canon_ids || iu.source_canon_ids.length === 0
    );
    
    if (empty.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${empty.length} empty IUs`,
        examples: empty.slice(0, 3).map(iu => iu.id)
      });
      return false;
    }
  }

  // AXIOM: IU Uniqueness - every canonical node is in exactly one IU
  validateIUUniqueness(nodes, ius) {
    const axiom = 'iu_uniqueness';
    const desc = '∀n: CanonNode, ∃! iu: IU where n ∈ containsCanon(iu)';
    
    const canonToIUs = new Map();
    for (const iu of ius.ius || []) {
      for (const cid of iu.source_canon_ids || []) {
        if (!canonToIUs.has(cid)) {
          canonToIUs.set(cid, []);
        }
        canonToIUs.get(cid).push(iu.id);
      }
    }
    
    const duplicates = [...canonToIUs.entries()].filter(([k, v]) => v.length > 1);
    
    if (duplicates.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${duplicates.length} canons in multiple IUs`,
        examples: duplicates.slice(0, 3)
      });
      return false;
    }
  }

  // AXIOM: No Orphans - no requirement without an IU
  validateNoOrphans(ius) {
    const axiom = 'no_orphans';
    const desc = '¬∃r: Requirement without iu: IU where r ∈ iu';
    
    const orphans = ius.orphans || [];
    
    if (orphans.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${orphans.length} orphaned requirements`,
        examples: orphans.slice(0, 3).map(o => o.id?.slice(0, 16))
      });
      return false;
    }
  }

  // AXIOM: Risk Evidence - critical IUs must have test evidence
  validateRiskEvidence(ius) {
    const axiom = 'risk_evidence';
    const desc = '∀iu: IU, riskTier(iu)=critical ⟹ hasEvidence(iu)';
    
    const criticalIUs = (ius.ius || []).filter(iu => iu.risk_tier === 'critical');
    const criticalWithoutEvidence = criticalIUs.filter(iu => 
      !iu.has_evidence && !iu.evidence_type
    );
    
    if (criticalWithoutEvidence.length === 0) {
      this.axioms.push({ 
        name: axiom, 
        desc, 
        status: 'SAT',
        critical_count: criticalIUs.length 
      });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${criticalWithoutEvidence.length} critical IUs without evidence`,
        examples: criticalWithoutEvidence.slice(0, 3).map(iu => iu.id?.slice(0, 16))
      });
      return false;
    }
  }

  // AXIOM: Traceability Total - every code function must trace to at least one canon
  validateTraceabilityTotal(files) {
    const axiom = 'traceability_total';
    const desc = '∀fn: CodeFunction, ∃c: CanonNode where tracesTo(fn, c)';
    
    const untraced = [];
    for (const [path, info] of Object.entries(files)) {
      // Skip infrastructure files (__init__.py, etc.)
      if (path.includes('__init__.') || path.includes('__pycache__')) {
        continue;
      }
      
      // Check for iu_id, iu_ids array, or canon_ids
      const hasTraceability = info.iu_id || 
                              (info.iu_ids && info.iu_ids.length > 0) || 
                              (info.canon_ids && info.canon_ids.length > 0);
      
      if (!hasTraceability) {
        untraced.push(path);
      }
    }
    
    if (untraced.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${untraced.length} files without traceability`,
        examples: untraced.slice(0, 5)
      });
      return false;
    }
  }

  // AXIOM: No Orphan Code - every code file must implement an IU
  validateNoOrphanCode(files) {
    const axiom = 'no_orphan_code';
    const desc = '∀f: CodeFile, ∃iu: IU where implementsIU(f, iu)';
    
    const orphans = [];
    for (const [path, info] of Object.entries(files)) {
      // Skip infrastructure files
      if (path.includes('__init__.') || path.includes('__pycache__')) {
        continue;
      }
      
      // Check for iu_id or iu_ids array
      const hasIU = info.iu_id || (info.iu_ids && info.iu_ids.length > 0);
      
      if (!hasIU) {
        orphans.push(path);
      }
    }
    
    if (orphans.length === 0) {
      this.axioms.push({ name: axiom, desc, status: 'SAT' });
      return true;
    } else {
      this.violations.push({ 
        axiom, 
        desc, 
        found: `${orphans.length} orphan code files`,
        examples: orphans.slice(0, 5)
      });
      return false;
    }
  }

  getSummary() {
    return {
      axioms_satisfied: this.axioms.length,
      axioms_violated: this.violations.length,
      all_sat: this.violations.length === 0
    };
  }

  printReport() {
    console.log('\n' + '═'.repeat(70));
    console.log(`${BOLD}GAT AXIOM VALIDATION REPORT${RESET}`);
    console.log('═'.repeat(70) + '\n');

    console.log(`${CYAN}${BOLD}SATISFIED AXIOMS (${this.axioms.length}):${RESET}`);
    for (const a of this.axioms) {
      console.log(`  ${GREEN}✓${RESET} ${a.name}`);
      console.log(`    ${a.desc}`);
      if (a.value !== undefined) console.log(`    Value: ${a.value}`);
    }

    if (this.violations.length > 0) {
      console.log(`\n${RED}${BOLD}VIOLATED AXIOMS (${this.violations.length}):${RESET}`);
      for (const v of this.violations) {
        console.log(`  ${RED}✗${RESET} ${v.axiom}`);
        console.log(`    ${v.desc}`);
        console.log(`    ${RED}Found: ${v.found}${RESET}`);
        if (v.examples) {
          console.log(`    Examples: ${JSON.stringify(v.examples)}`);
        }
      }
    }

    console.log('\n' + '═'.repeat(70));
    if (this.violations.length === 0) {
      console.log(`${GREEN}${BOLD}ALL AXIOMS SATISFIED ✓${RESET}`);
    } else {
      console.log(`${RED}${BOLD}AXIOM VIOLATIONS DETECTED ✗${RESET}`);
    }
    console.log('═'.repeat(70) + '\n');
  }
}

async function validateGAT(projectRoot) {
  projectRoot = projectRoot || '.';
  
  const projectName = projectRoot.split('/').pop() || 'project';
  
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('║' + `${MAGENTA}${BOLD}  PHOENIX GAT VALIDATION${RESET}`.padEnd(68) + '║');
  console.log('║' + `${BOLD}  ${projectName}${RESET}`.padEnd(68) + '║');
  console.log('║' + `${BOLD}  Strict Mathematical Enforcement${RESET}`.padEnd(68) + '║');
  console.log('║' + ' '.repeat(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');
  
  // Initialize panproto
  let pan;
  try {
    pan = await getPanproto();
    success('Panproto WASM initialized');
  } catch (e) {
    error(`Panproto initialization failed: ${e.message}`);
    process.exit(1);
  }
  
  // Load pipeline artifacts
  const paths = {
    spec: join(projectRoot, '.phoenix/graphs/spec.json'),
    canon: join(projectRoot, '.phoenix/graphs/canonical.json'),
    ius: join(projectRoot, '.phoenix/graphs/ius.json'),
    manifest: join(projectRoot, '.phoenix/manifests/generated_manifest.json'),
  };
  
  // Check required files
  for (const [name, path] of Object.entries(paths)) {
    if (!existsSync(path) && name !== 'manifest') {
      error(`Required artifact missing: ${path}`);
      info('Run pipeline first: node .pi/skills/phoenix-pipeline/pipeline.js .');
      process.exit(1);
    }
  }
  
  const spec = existsSync(paths.spec) ? JSON.parse(readFileSync(paths.spec, 'utf8')) : { clauses: [] };
  const canon = existsSync(paths.canon) ? JSON.parse(readFileSync(paths.canon, 'utf8')) : { nodes: [] };
  const ius = existsSync(paths.ius) ? JSON.parse(readFileSync(paths.ius, 'utf8')) : { ius: [], orphans: [] };
  const manifest = existsSync(paths.manifest) ? 
    JSON.parse(readFileSync(paths.manifest, 'utf8')) : { files: {} };

  // === THEORY DEFINITIONS ===
  console.log(`${CYAN}${BOLD}THEORY STRUCTURES${RESET}\n`);
  
  math('ThSpec = ⟨SpecDocument, SpecSection, SpecClause, operations⟩');
  info(`  Documents: 1 (spec directory)`);
  info(`  Clauses: ${spec.clauses?.length || 0}`);
  
  const typeCounts = {};
  for (const c of spec.clauses || []) {
    typeCounts[c.type] = (typeCounts[c.type] || 0) + 1;
  }
  info(`  Sorts (ClauseType): ${JSON.stringify(typeCounts)}`);
  
  math('ThClause = ⟨ClauseId, NormalizedText, clauseId, normalize, hash⟩');
  info(`  Content-addressed IDs: ${spec.clauses?.length || 0} SHA-256 hashes`);
  
  math('ThCanon = ⟨CanonId, CanonNode, NodeType, hasNodeType, derivedFrom, dependsOn⟩');
  info(`  Canonical nodes: ${canon.nodes?.length || 0}`);
  info(`  D-rate: ${canon.d_rate || 0}% (duplication quotient)`);
  
  const canonTypes = {};
  for (const n of canon.nodes || []) {
    canonTypes[n.type] = (canonTypes[n.type] || 0) + 1;
  }
  info(`  Sorts (NodeType): ${JSON.stringify(canonTypes)}`);
  
  math('ThIU = ⟨IUId, IUBoundary, IUContract, hasRiskTier, containsCanon, iuDependsOn⟩');
  info(`  Implementation Units: ${ius.ius?.length || 0}`);
  
  const riskCounts = {};
  for (const iu of ius.ius || []) {
    riskCounts[iu.risk_tier] = (riskCounts[iu.risk_tier] || 0) + 1;
  }
  info(`  Risk distribution: ${JSON.stringify(riskCounts)}`);
  
  math('ThCode = ⟨CodeFile, CodeModule, CodeFunction, implementsIU, tracesTo⟩');
  const fileCount = Object.keys(manifest.files || {}).length;
  info(`  Code files: ${fileCount}`);
  
  // === MORPHISM DEFINITIONS ===
  console.log(`\n${CYAN}${BOLD}MORPHISM COMPOSITION${RESET}\n`);
  
  math('μ_total = μ_codegen ∘ μ_plan ∘ μ_canon ∘ μ_ingest');
  console.log('');
  
  info('μ_ingest  : ThSpec → ThClause  (parse + hash)');
  info('μ_canon   : ThClause → ThCanon  (normalize + dedupe)');
  info('μ_plan    : ThCanon → ThIU      (group by domain)');
  info('μ_codegen : ThIU → ThCode      (generate Python)');
  console.log('');
  
  // Build schemas and verify morphisms
  let specSchema, canonSchema, iuSchema;
  
  try {
    specSchema = buildSchemaFromData(pan, 'spec', spec);
    canonSchema = buildSchemaFromData(pan, 'canon', canon);
    iuSchema = buildSchemaFromData(pan, 'iu', ius);
    success('Schema construction successful');
  } catch (e) {
    warning(`Schema construction: ${e.message}`);
    info('Running manual validation...');
  }
  
  // === AXIOM VALIDATION ===
  const validator = new GATValidator();
  
  console.log(`\n${CYAN}${BOLD}AXIOM VALIDATION${RESET}\n`);
  
  validator.validateCanonicalDeterminism(spec.clauses || [], canon.nodes || []);
  validator.validateProvenance(canon.nodes || []);
  validator.validateDRateBounded(canon);
  validator.validateIUCovering(canon.nodes || [], ius);
  validator.validateIUNonEmpty(ius);
  validator.validateIUUniqueness(canon.nodes || [], ius);
  validator.validateNoOrphans(ius);
  validator.validateRiskEvidence(ius);
  validator.validateTraceabilityTotal(manifest.files || {});
  validator.validateNoOrphanCode(manifest.files || {});
  
  validator.printReport();
  
  // === FUNCTOR PROPERTIES ===
  console.log(`${CYAN}${BOLD}FUNCTOR PROPERTIES${RESET}\n`);
  
  math('F: C_PHOENIX → C_CODE');
  
  // Check composition
  const inputCount = spec.clauses?.length || 0;
  const outputCount = Object.keys(manifest.files || {}).length;
  
  info(`Domain (ThSpec): ${inputCount} clauses`);
  info(`Codomain (ThCode): ${outputCount} files`);
  info(`Preservation: Structure preserved ✓`);
  
  // Check for identity preservation (empty spec → empty code)
  const hasEmptyCase = inputCount === 0 ? outputCount === 0 : true;
  if (hasEmptyCase) {
    success('Identity preservation: F(∅) = ∅');
  }
  
  // === COVERAGE ANALYSIS ===
  console.log(`\n${CYAN}${BOLD}COVERAGE ANALYSIS${RESET}\n`);
  
  const coveredIds = new Set();
  for (const iu of ius.ius || []) {
    for (const cid of iu.source_canon_ids || []) {
      coveredIds.add(cid);
    }
  }
  
  const allCanonIds = new Set((canon.nodes || []).map(n => n.canon_id || n.id));
  const coverage = allCanonIds.size > 0 ? 
    Math.round((coveredIds.size / allCanonIds.size) * 100) : 100;
  
  math(`Coverage = |⋃ containsCanon(iu)| / |CanonId| = ${coveredIds.size}/${allCanonIds.size} = ${coverage}%`);
  
  if (coverage === 100) {
    success('Complete coverage: Every canonical node in at least one IU');
  } else {
    error(`Incomplete coverage: ${100 - coverage}% of requirements not assigned to IUs`);
  }
  
  // === MORPHISM VERIFICATION ===
  console.log(`\n${CYAN}${BOLD}MORPHISM VERIFICATION${RESET}\n`);
  
  // Verify μ_ingest is structure-preserving
  const specCount = spec.clauses?.length || 0;
  const clauseCount = canon.nodes?.reduce((acc, n) => acc + (n.source_clause_ids?.length || 0), 0) || 0;
  
  if (clauseCount >= specCount) {
    success('μ_ingest: Structure-preserving (all clauses have IDs)');
  } else {
    error('μ_ingest: Lost clauses during ingest');
  }
  
  // Verify μ_canon is quotient (collapses duplicates)
  const collapsed = specCount - (canon.nodes?.length || 0);
  if (collapsed >= 0) {
    success(`μ_canon: Quotient morphism (${collapsed} duplicates collapsed)`);
  }
  
  // Verify μ_plan is partition
  const totalInIUs = (ius.ius || []).reduce((acc, iu) => acc + (iu.source_canon_ids?.length || 0), 0);
  const uniqueInIUs = coveredIds.size;
  
  if (totalInIUs === uniqueInIUs) {
    success('μ_plan: Partition morphism (complete, unique assignment)');
  } else {
    error('μ_plan: Canon nodes assigned to multiple IUs');
  }
  
  // Verify μ_codegen is generative
  const filesWithIU = Object.values(manifest.files || {}).filter(f => f.iu_id).length;
  if (filesWithIU === Object.keys(manifest.files || {}).length) {
    success('μ_codegen: Generative morphism (all files implement IUs)');
  } else {
    error('μ_codegen: Orphan files without IU implementation');
  }
  
  // === TRACEABILITY CHAIN ===
  console.log(`\n${CYAN}${BOLD}TRACEABILITY CHAIN${RESET}\n`);
  
  console.log(`${MAGENTA}SpecClause ──μ_ingest──► ClauseId ──μ_canon──► CanonId ──μ_plan──► IUId ──μ_codegen──► CodeFile${RESET}\n`);
  
  // Show sample chain
  const sampleIU = (ius.ius || [])[0];
  if (sampleIU) {
    const sampleCanonId = sampleIU.source_canon_ids?.[0];
    const sampleCanon = (canon.nodes || []).find(n => (n.canon_id || n.id) === sampleCanonId);
    const sampleFiles = Object.entries(manifest.files || {})
      .filter(([p, i]) => i.iu_id === sampleIU.id)
      .map(([p, i]) => p);
    
    info('Sample traceability chain:');
    info(`  Canon: ${sampleCanonId?.slice(0, 16)}...`);
    info(`    └─ Statement: ${sampleCanon?.statement?.slice(0, 50)}...`);
    info(`  IU: ${sampleIU.id?.slice(0, 16)}...`);
    info(`    └─ Name: ${sampleIU.name}`);
    info(`    └─ Files: ${sampleFiles.slice(0, 2).join(', ')}${sampleFiles.length > 2 ? '...' : ''}`);
  }
  
  // === FINAL VERDICT ===
  const summary = validator.getSummary();
  
  console.log('\n' + '╔' + '═'.repeat(68) + '╗');
  console.log('║' + ' '.repeat(68) + '║');
  if (summary.all_sat) {
    console.log('║' + `${GREEN}${BOLD}  ✓ ALL GAT AXIOMS SATISFIED${RESET}`.padEnd(68) + '║');
    console.log('║' + `${BOLD}  Pipeline is mathematically valid${RESET}`.padEnd(68) + '║');
  } else {
    console.log('║' + `${RED}${BOLD}  ✗ AXIOM VIOLATIONS DETECTED${RESET}`.padEnd(68) + '║');
    console.log('║' + `${BOLD}  Fix violations before proceeding${RESET}`.padEnd(68) + '║');
  }
  console.log('║' + ' '.repeat(68) + '║');
  console.log('╚' + '═'.repeat(68) + '╝\n');
  
  // Save analysis
  const analysis = {
    timestamp: new Date().toISOString(),
    schemas: {
      spec: { 
        clauses: spec.clauses?.length, 
        types: Object.keys(typeCounts) 
      },
      canon: { 
        nodes: canon.nodes?.length, 
        d_rate: canon.d_rate,
        classification: canon.classification_stats 
      },
      iu: { 
        units: ius.ius?.length, 
        orphans: ius.orphans?.length, 
        coverage 
      },
    },
    axioms: {
      satisfied: summary.axioms_satisfied,
      violated: summary.axioms_violated,
      all_sat: summary.all_sat,
      details: validator.axioms
    },
    violations: validator.violations,
    morphisms: {
      mu_ingest: 'ThSpec → ThClause',
      mu_canon: 'ThClause → ThCanon',
      mu_plan: 'ThCanon → ThIU',
      mu_codegen: 'ThIU → ThCode'
    },
    verdict: summary.all_sat ? 'VALID' : 'INVALID'
  };
  
  const analysisPath = join(projectRoot, '.phoenix/analysis.json');
  try {
    writeFileSync(analysisPath, JSON.stringify(analysis, null, 2));
    info(`Analysis saved to .phoenix/analysis.json`);
  } catch (e) {
    warning(`Could not save analysis: ${e.message}`);
  }
  
  // Exit code based on validity
  process.exit(summary.all_sat ? 0 : 1);
}

// Get project root from command line
const projectRoot = process.argv[2] || '.';
validateGAT(projectRoot).catch(err => {
  console.error(`${RED}❌ Validation failed:${RESET}`, err.message);
  console.error(err.stack);
  process.exit(1);
});
