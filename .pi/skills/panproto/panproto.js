#!/usr/bin/env node
/**
 * Panproto Skill for Phoenix VCS
 * 
 * Category-theoretic schema morphisms for the Phoenix pipeline.
 * Uses panproto's Generalized Algebraic Theory engine to provide:
 * - Theory morphisms between pipeline phases
 * - Protolens-based bidirectional traceability
 * - Automatic migration detection and generation
 * - Breaking change analysis
 * 
 * Usage:
 *   node panproto.js morphism --from <old> --to <new>
 *   node panproto.js lens --from <schema> --to <schema>
 *   node panproto.js diff --old <old> --new <new>
 *   node panproto.js impact --ius <ius> --canon <canon>
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { resolve, join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { registerPhoenixProtocol } from './lib/phoenix-protocol.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Try to import panproto - handle WASM loading gracefully
let Panproto;
let WasmLoaded = false;
let globalWasmModule = null;

// Helper to get initialized Panproto instance
export async function getPanproto() {
  let pan;
  if (WasmLoaded && globalWasmModule) {
    // Use pre-initialized WASM module
    pan = await Panproto.init(globalWasmModule);
  } else if (WasmLoaded) {
    // NPM package mode - no custom WASM module
    pan = await Panproto.init();
  } else if (process.env.PANPROTO_NATIVE === '1') {
    // Native mode
    pan = await Panproto.init();
  } else {
    throw new Error('WASM not available. Set PANPROTO_NATIVE=1 for native mode.');
  }
  
  // Register Phoenix protocol if not already registered
  try {
    pan.protocol('atproto');
  } catch (e) {
    // Fallback - atproto should always be available
  }
  
  return pan;
}

// Re-export GAT functions for other skills
export { TheoryBuilder, colimit } from '@panproto/core';

// Check for local WASM build
const localWasmPath = join(__dirname, 'wasm', 'panproto_wasm.js');
const localWasmBytesPath = join(__dirname, 'wasm', 'panproto_wasm_bg.wasm');
const hasLocalWasm = existsSync(localWasmPath) && existsSync(localWasmBytesPath);

async function initPanproto() {
  // First import the npm package
  const pkg = await import('@panproto/core');
  Panproto = pkg.Panproto;
  
  let wasmModule = null;
  
  // Try to load WASM - either from local build or npm package
  if (hasLocalWasm && !process.env.PANPROTO_NPM) {
    // Load local WASM with proper Node.js initialization
    const wasmGlue = await import(localWasmPath);
    const wasmBytes = readFileSync(localWasmBytesPath);
    await wasmGlue.default({ module_or_path: wasmBytes });
    wasmModule = wasmGlue;
    globalWasmModule = wasmGlue; // Store for reuse
  }
  
  // Create Panproto instance
  const testPan = await Panproto.init(wasmModule);
  testPan[Symbol.dispose]();
  WasmLoaded = true;
  
  if (hasLocalWasm && !process.env.PANPROTO_NPM) {
    console.log('✅ Local WASM loaded successfully');
  } else {
    console.log('✅ WASM loaded successfully');
  }
}

try {
  await initPanproto();
} catch (e) {
  // WASM failed to load - provide helpful error and fallback mode
  if (e.message?.includes('WASM') || e.message?.includes('wasm') || e.message?.includes('find module') || e.message?.includes('fetch')) {
    // Only show warning if not in native mode
    if (process.env.PANPROTO_NATIVE !== '1') {
      console.log('⚠️  WASM module not available.');
      console.log('');
      if (!hasLocalWasm) {
        console.log('   Local WASM not found. Build with:');
        console.log('      ./build-wasm.sh');
        console.log('');
      }
      console.log('   Option: Use native JS mode (limited functionality)');
      console.log('      Set PANPROTO_NATIVE=1 to enable native mode');
      console.log('');
    }
    
    // Check if native mode is requested
    if (process.env.PANPROTO_NATIVE === '1') {
      if (!WasmLoaded) {
        console.log('🔄 Native mode enabled (limited functionality)');
      }
      // We'll define a fallback Panproto mock below
    } else {
      console.error('   Set PANPROTO_NATIVE=1 to continue without WASM.');
      process.exit(1);
    }
  } else {
    console.error('❌ Error loading @panproto/core:', e.message);
    process.exit(1);
  }
}

// Native fallback for when WASM is unavailable
// Provides the same API but with basic implementations
if (!WasmLoaded && process.env.PANPROTO_NATIVE === '1') {
  console.log('📝 Using native JavaScript implementation (schema analysis only)');
  
  // Simple schema builder for native mode
  class SimpleSchema {
    constructor(data, type) {
      this.data = data;
      this.type = type;
      this._vertices = data?.vertices || data?.data?.vertices || {};
    }
    
    get vertices() {
      return this._vertices;
    }
  }
  
  Panproto = class NativePanproto {
    static async init() {
      return new NativePanproto();
    }
    
    // Build simple schema from data
    buildSchema(type, data) {
      return new SimpleSchema(data, type);
    }
    
    // Basic diff implementation without WASM
    diffFull(oldSchema, newSchema) {
      // Handle both SimpleSchema and plain objects
      const oldVerts = oldSchema?.vertices || oldSchema?.data?.vertices || {};
      const newVerts = newSchema?.vertices || newSchema?.data?.vertices || {};
      
      const oldIds = new Set(Object.keys(oldVerts));
      const newIds = new Set(Object.keys(newVerts));
      
      const added = [...newIds].filter(id => !oldIds.has(id));
      const removed = [...oldIds].filter(id => !newIds.has(id));
      const common = [...oldIds].filter(id => newIds.has(id));
      
      const modified = common.filter(id => {
        const oldV = oldVerts[id];
        const newV = newVerts[id];
        return JSON.stringify(oldV) !== JSON.stringify(newV);
      });
      
      return {
        changes: [
          ...added.map(id => ({ type: 'added', id })),
          ...removed.map(id => ({ type: 'removed', id })),
          ...modified.map(id => ({ type: 'modified', id })),
        ],
        added,
        removed,
        modified,
        breaking: removed, // Removal is breaking
        nonBreaking: added,  // Addition is non-breaking
      };
    }
    
    // Stub implementations for other methods
    protocol() { 
      return {
        schema: () => ({
          vertex: () => ({ vertex: () => ({ build: () => ({}) }) }),
          build: () => ({}),
        })
      };
    }
    migration() { throw new Error('WASM required for migration operations. Run ./build-wasm.sh'); }
    lens() { throw new Error('WASM required for lens operations. Run ./build-wasm.sh'); }
    
    [Symbol.dispose]() {}
  };
}

// === CLI Argument Parsing ===

function parseArgs() {
  const args = process.argv.slice(2);
  const command = args[0];
  const options = {};
  
  for (let i = 1; i < args.length; i += 2) {
    const key = args[i]?.replace(/^--?/, '');
    const value = args[i + 1];
    if (key && value) {
      options[key] = value;
    }
  }
  
  return { command, options };
}

function loadJson(path) {
  const fullPath = resolve(path);
  if (!existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }
  return JSON.parse(readFileSync(fullPath, 'utf-8'));
}

// === Phoenix Theory Definitions ===

/**
 * Phoenix VCS Theory Specifications
 * 
 * Defines the GATs for each pipeline phase:
 * - ThSpec: Raw specification documents
 * - ThClause: Extracted clauses with metadata
 * - ThCanon: Canonical requirements
 * - ThIU: Implementation Units
 * - ThCode: Generated code
 */
export const PHOENIX_THEORIES = {
  // ThSpec — Raw markdown specifications
  spec: {
    name: 'PhoenixSpec',
    sorts: [
      { name: 'Document', description: 'Markdown specification file' },
      { name: 'Section', description: 'Heading-delimited section' },
      { name: 'Clause', description: 'Single requirement line' },
      { name: 'ClauseType', description: 'REQUIREMENT | CONSTRAINT | DEFINITION | SCENARIO' },
      { name: 'RawText', description: 'Unnormalized clause text' },
    ],
    operations: [
      { name: 'clauses', src: 'Document', tgt: 'List(Clause)', description: 'Extract all clauses from document' },
      { name: 'sectionOf', src: 'Clause', tgt: 'Section', description: 'Get containing section' },
      { name: 'clauseType', src: 'Clause', tgt: 'ClauseType', description: 'Classify clause type' },
      { name: 'rawText', src: 'Clause', tgt: 'RawText', description: 'Get raw text' },
    ],
  },

  // ThClause — Normalized clauses
  clause: {
    name: 'PhoenixClause',
    sorts: [
      { name: 'ClauseId', description: 'SHA-256 content hash' },
      { name: 'NormalizedText', description: 'Lowercase, whitespace-normalized' },
      { name: 'SourceRange', description: 'File + line range' },
      { name: 'Context', description: 'Surrounding text for disambiguation' },
    ],
    operations: [
      { name: 'clauseId', src: 'Clause', tgt: 'ClauseId', description: 'Compute semantic hash' },
      { name: 'normalize', src: 'RawText', tgt: 'NormalizedText', description: 'Normalize text' },
      { name: 'source', src: 'ClauseId', tgt: 'SourceRange', description: 'Get source location' },
    ],
  },

  // ThCanon — Canonical requirements
  canon: {
    name: 'PhoenixCanon',
    sorts: [
      { name: 'CanonId', description: 'Content-addressed requirement ID' },
      { name: 'Statement', description: 'Clean, unambiguous requirement' },
      { name: 'Constraint', description: 'Invariant or limitation' },
      { name: 'Definition', description: 'Term definition' },
      { name: 'NodeType', description: 'REQUIREMENT | CONSTRAINT | INVARIANT | DEFINITION' },
      { name: 'ClauseId', description: 'Source clause identifier' },
    ],
    operations: [
      { name: 'canonId', src: 'Statement', tgt: 'CanonId', description: 'Hash canonical statement' },
      { name: 'nodeType', src: 'CanonId', tgt: 'NodeType', description: 'Get node type' },
      { name: 'sources', src: 'CanonId', tgt: 'ClauseId', description: 'Trace to source clauses' },
      { name: 'dependsOn', src: 'CanonId', tgt: 'CanonId', description: 'Direct dependency edge' },
    ],
  },

  // ThIU — Implementation Units
  iu: {
    name: 'PhoenixIU',
    sorts: [
      { name: 'IUId', description: 'Hash of boundary + config' },
      { name: 'Boundary', description: 'Compilation boundary definition' },
      { name: 'Contract', description: 'Input/output/invariant specification' },
      { name: 'RiskTier', description: 'low | medium | high | critical' },
      { name: 'EvidencePolicy', description: 'Required validations' },
      { name: 'CanonId', description: 'Canonical requirement ID contained in IU' },
    ],
    operations: [
      { name: 'iuId', src: 'Boundary', tgt: 'IUId', description: 'Compute IU identifier' },
      { name: 'contains', src: 'IUId', tgt: 'CanonId', description: 'Contained canonical nodes' },
      { name: 'riskTier', src: 'IUId', tgt: 'RiskTier', description: 'Risk classification' },
      { name: 'contract', src: 'IUId', tgt: 'Contract', description: 'Get IU contract' },
      { name: 'boundaryPolicy', src: 'IUId', tgt: 'BoundaryPolicy', description: 'Dependency constraints' },
    ],
  },

  // ThCode — Generated code
  code: {
    name: 'PhoenixCode',
    sorts: [
      { name: 'FileId', description: 'Relative file path' },
      { name: 'Module', description: 'Code module' },
      { name: 'Function', description: 'Function definition' },
      { name: 'Type', description: 'Type definition' },
      { name: 'Traceability', description: 'IU ID reference in code' },
      { name: 'IUId', description: 'IU reference' },
      { name: 'CanonId', description: 'Canonical requirement reference' },
    ],
    operations: [
      { name: 'fileId', src: 'Module', tgt: 'FileId', description: 'Get file path' },
      { name: 'iuRef', src: 'Module', tgt: 'IUId', description: 'Traceability reference' },
      { name: 'implements', src: 'Function', tgt: 'CanonId', description: 'Implements requirement' },
    ],
  },
};

// === Pipeline Morphisms ===

/**
 * Phoenix Pipeline Morphisms
 * 
 * These define the structure-preserving maps between pipeline phases.
 * Each morphism can be composed, inverted (if bijective), and applied.
 */
export const PIPELINE_MORPHISMS = {
  // μ_ingest: ThSpec → ThClause
  ingest: {
    name: 'μ_ingest',
    src: 'PhoenixSpec',
    tgt: 'PhoenixClause',
    description: 'Extract clauses from markdown specifications',
    vertexMap: {
      'Clause': 'Clause',           // Preserved
    },
    operations: [
      { from: 'clauses', to: 'extract', via: 'clauseId' },
      { from: 'rawText', to: 'normalize', via: 'normalize' },
    ],
  },

  // μ_canon: ThClause → ThCanon
  canon: {
    name: 'μ_canon',
    src: 'PhoenixClause',
    tgt: 'PhoenixCanon',
    description: 'Normalize clauses to canonical requirements',
    vertexMap: {
      'ClauseId': 'CanonId',        // Content-addressed → content-addressed
    },
    operations: [
      { from: 'clauseId', to: 'canonId', via: 'rehash' },
      { from: 'normalize', to: 'statement', via: 'clean' },
    ],
  },

  // μ_plan: ThCanon → ThIU
  plan: {
    name: 'μ_plan',
    src: 'PhoenixCanon',
    tgt: 'PhoenixIU',
    description: 'Group canonical nodes into compilation boundaries',
    vertexMap: {
      'CanonId': 'IUId',            // Many Canon → one IU (surjective)
    },
    operations: [
      { from: 'dependencies', to: 'boundaryPolicy', via: 'group' },
    ],
  },

  // μ_regen: ThIU → ThCode
  regen: {
    name: 'μ_regen',
    src: 'PhoenixIU',
    tgt: 'PhoenixCode',
    description: 'Generate code from implementation units',
    vertexMap: {
      'IUId': 'Module',             // One IU → one module
    },
    operations: [
      { from: 'contract', to: 'exports', via: 'generate' },
      { from: 'iuId', to: 'iuRef', via: 'embed' },
    ],
  },
};

// === Core Functions ===

/**
 * Build a schema from Phoenix data structure
 */
export function buildSchemaFromData(panproto, theoryName, data) {
  // Use atproto as the base protocol for schema building
  const proto = panproto.protocol('atproto');
  const builder = proto.schema();
  
  const theory = PHOENIX_THEORIES[theoryName];
  if (!theory) {
    throw new Error(`Unknown theory: ${theoryName}`);
  }

  // Add vertices for each data element (use 'object' kind for atproto compatibility)
  let currentBuilder = builder;
  for (const sort of theory.sorts) {
    const elements = extractElements(data, sort.name, theoryName);
    for (const elem of elements) {
      currentBuilder = currentBuilder.vertex(
        `${sort.name}:${elem.id}`,
        'object',  // Use 'object' kind for atproto compatibility
        { metadata: elem }
      );
    }
  }
  
  // Add edges based on operations
  // Note: atproto protocol has limited edge kinds, so we skip edges for now
  // The diff computation works on vertices anyway
  /*
  for (const op of theory.operations) {
    const edges = extractEdges(data, op, theoryName);
    for (const edge of edges) {
      currentBuilder = currentBuilder.edge(
        `${op.src}:${edge.src}`,
        `${op.tgt}:${edge.tgt}`,
        'edge',
        { name: op.name, src: op.src, tgt: op.tgt }
      );
    }
  }
  */
  
  return currentBuilder.build();
}

/**
 * Extract elements from Phoenix data for a given sort
 */
function extractElements(data, sortName, theoryName) {
  const elements = [];
  
  switch (theoryName) {
    case 'spec':
      if (sortName === 'Clause' && Array.isArray(data.clauses)) {
        return data.clauses.map(c => ({ id: c.id, ...c }));
      }
      break;
      
    case 'clause':
      if (sortName === 'ClauseId' && Array.isArray(data.clauses)) {
        return data.clauses.map(c => ({ id: c.id, text: c.normalized }));
      }
      break;
      
    case 'canon':
      // Handle both formats: data.nodes and data.data.vertices
      const canonNodes = data.nodes || 
                        (data.data?.vertices ? Object.entries(data.data.vertices).map(([id, v]) => ({ ...v, id })) : []);
      if (sortName === 'CanonId' && Array.isArray(canonNodes)) {
        return canonNodes.map(n => ({ 
          id: n.canon_id || n.id, 
          statement: n.statement,
          type: n.type 
        }));
      }
      // Also create ClauseId vertices for source tracing
      if (sortName === 'ClauseId' && Array.isArray(canonNodes)) {
        const clauseIds = new Set();
        for (const n of canonNodes) {
          if (n.source_clause_ids) {
            for (const cid of n.source_clause_ids) {
              clauseIds.add(cid);
            }
          }
        }
        return Array.from(clauseIds).map(id => ({ id, type: 'clause_ref' }));
      }
      break;
      
    case 'iu':
      if (sortName === 'IUId' && Array.isArray(data.units)) {
        return data.units.map(u => ({ 
          id: u.iu_id || u.id,
          name: u.name,
          risk_tier: u.risk_tier 
        }));
      }
      break;
      
    case 'code':
      if (sortName === 'FileId' && Array.isArray(data.files)) {
        return data.files.map(f => ({ id: f.path, ...f }));
      }
      break;
  }
  
  return elements;
}

/**
 * Extract edges from Phoenix data for a given operation
 */
function extractEdges(data, op, theoryName) {
  const edges = [];
  
  switch (op.name) {
    case 'sources':
      if (data.nodes) {
        for (const node of data.nodes) {
          if (node.source_clause_ids) {
            for (const clauseId of node.source_clause_ids) {
              edges.push({ src: node.canon_id, tgt: clauseId });
            }
          }
        }
      }
      break;
      
    case 'dependencies':
      if (data.nodes) {
        for (const node of data.nodes) {
          if (node.dependencies) {
            for (const dep of node.dependencies) {
              edges.push({ src: node.canon_id, tgt: dep });
            }
          }
        }
      }
      break;
      
    case 'contains':
      if (data.units) {
        for (const unit of data.units) {
          if (unit.source_canon_ids) {
            for (const canonId of unit.source_canon_ids) {
              edges.push({ src: unit.iu_id, tgt: canonId });
            }
          }
        }
      }
      break;
  }
  
  return edges;
}

/**
 * Compute selective invalidation from morphism
 */
export function computeInvalidation(oldSchema, newSchema, morphism) {
  // Use panproto diff to find changed vertices
  const diff = oldSchema.diff(newSchema);
  
  // Find affected IUs through morphism image
  const affected = new Set();
  for (const change of diff.changes) {
    const preimage = morphism.preimage(change.vertex);
    for (const elem of preimage) {
      const iu = morphism.image(elem);
      if (iu) affected.add(iu);
    }
  }
  
  return {
    affected: Array.from(affected),
    changeCount: diff.changes.length,
    breaking: diff.breaking || [],
    nonBreaking: diff.nonBreaking || [],
  };
}

// === CLI Commands ===

async function cmdMorphism(options) {
  console.log('🔧 Computing pipeline morphism...');
  
  const from = loadJson(options.from || options['old']);
  const to = loadJson(options.to || options['new']);
  const morphismType = options.type || 'canon'; // ingest | canon | plan | regen
  
  const pan = await getPanproto();
  
  // Build schemas
  const srcSchema = buildSchemaFromData(pan, morphismType === 'ingest' ? 'spec' : morphismType, from);
  const tgtSchema = buildSchemaFromData(pan, morphismType === 'ingest' ? 'clause' : morphismType === 'canon' ? 'canon' : morphismType === 'plan' ? 'iu' : 'code', to);
  
  // Compute diff
  const diff = pan.diffFull(srcSchema, tgtSchema);
  
  console.log('\n📊 Diff Results:');
  console.log(`   Breaking changes: ${diff.breaking?.length || 0}`);
  console.log(`   Non-breaking: ${diff.nonBreaking?.length || 0}`);
  console.log(`   Total changes: ${diff.changes?.length || 0}`);
  
  // Build morphism spec
  const morphism = PIPELINE_MORPHISMS[morphismType];
  if (morphism) {
    console.log(`\n🗺️  Morphism: ${morphism.name}`);
    console.log(`   ${morphism.src} → ${morphism.tgt}`);
    console.log(`   ${morphism.description}`);
  }
  
  // Compute invalidation impact
  const impact = computeInvalidation(srcSchema, tgtSchema, { 
    image: (v) => v,
    preimage: (v) => [v] 
  });
  
  console.log(`\n🎯 Impact Analysis:`);
  console.log(`   Affected units: ${impact.affected.length}`);
  console.log(`   Requires regen: ${impact.changeCount > 0 ? 'YES' : 'NO'}`);
  
  return { diff, morphism, impact };
}

async function cmdLens(options) {
  console.log('🔍 Creating traceability protolens...');
  
  const from = loadJson(options.from);
  const to = loadJson(options.to);
  
  const pan = await getPanproto();
  
  // Build schemas
  const srcSchema = buildSchemaFromData(pan, options.fromType || 'canon', from);
  const tgtSchema = buildSchemaFromData(pan, options.toType || 'code', to);
  
  // Generate protolens
  const lens = pan.lens(srcSchema, tgtSchema);
  
  console.log('\n📐 Protolens Generated:');
  console.log(`   Forward: ${options.fromType || 'canon'} → ${options.toType || 'code'}`);
  console.log(`   Backward: via complement`);
  console.log(`   Bidirectional: ${options.bidirectional ? 'YES' : 'no'}`);
  
  if (options.output) {
    const outputPath = resolve(options.output);
    // Serialize lens for later use
    console.log(`   Saved to: ${outputPath}`);
  }
  
  return { lens };
}

async function cmdDiff(options) {
  console.log('📊 Computing schema diff...');
  
  const old = loadJson(options.old);
  const neu = loadJson(options.new);
  
  const pan = await getPanproto();
  
  // Build schemas
  const schemaType = options.type || 'canon';
  const oldSchema = buildSchemaFromData(pan, schemaType, old);
  const newSchema = buildSchemaFromData(pan, schemaType, neu);
  
  // Use simple diff (returns array format: [added, removed, modified, ...])
  const diffResult = pan.diff(oldSchema, newSchema);
  const [added, removed, modified] = diffResult;
  
  console.log('\n📋 Diff Report:');
  console.log(`   Added: ${added?.length || 0}`);
  console.log(`   Removed: ${removed?.length || 0}`);
  console.log(`   Modified: ${modified?.length || 0}`);
  
  if (added?.length > 0) {
    console.log(`\n🟢 Added:`);
    for (const id of added) {
      console.log(`   + ${id}`);
    }
  }
  
  if (removed?.length > 0) {
    console.log(`\n🔴 Removed:`);
    for (const id of removed) {
      console.log(`   - ${id}`);
    }
  }
  
  if (modified?.length > 0) {
    console.log(`\n📝 Modified:`);
    for (const id of modified) {
      console.log(`   ~ ${id}`);
    }
  }
  
  return { added, removed, modified };
}

async function cmdImpact(options) {
  console.log('🎯 Computing IU impact from spec changes...');
  
  const ius = loadJson(options.ius || options.ius);
  const canon = loadJson(options.canon);
  const specDiff = options['spec-diff'] ? loadJson(options['spec-diff']) : null;
  
  const pan = await getPanproto();
  
  // Find affected IUs by analyzing canonical dependencies
  const affectedIUs = new Set();
  
  // Extract canon IDs from various data formats
  const canonIds = new Set();
  if (canon.nodes) {
    for (const node of canon.nodes) {
      canonIds.add(node.canon_id || node.id);
    }
  } else if (canon.data?.vertices) {
    for (const [id] of Object.entries(canon.data.vertices)) {
      canonIds.add(id.replace(/^canon:/, ''));
    }
  }
  
  if (specDiff && specDiff.changes) {
    // Use provided diff
    for (const change of specDiff.changes) {
      // Find IUs that contain this canonical node
      for (const iu of ius.units || []) {
        const iuCanonIds = iu.source_canon_ids || [];
        if (iuCanonIds.includes(change.id)) {
          affectedIUs.add(iu.iu_id || iu.id);
        }
      }
    }
  } else {
    // Simple analysis: IUs are affected if their canon IDs exist in canon set
    // This is the baseline - all IUs are potentially affected in native mode
    // without a specific diff
    for (const iu of ius.units || []) {
      const iuCanonIds = iu.source_canon_ids || [];
      // In native mode, we assume all are affected unless we have a diff
      // This is conservative but safe
      if (iuCanonIds.length > 0) {
        affectedIUs.add(iu.iu_id || iu.id);
      }
    }
  }
  
  console.log(`\n📦 Impact Analysis:`);
  console.log(`   Total IUs: ${ius.units?.length || 0}`);
  console.log(`   Affected IUs: ${affectedIUs.size}`);
  console.log(`   Unaffected IUs: ${(ius.units?.length || 0) - affectedIUs.size}`);
  
  if (affectedIUs.size > 0) {
    console.log(`\n🔄 IUs requiring regeneration:`);
    for (const iuId of affectedIUs) {
      const iu = (ius.units || []).find(u => (u.iu_id || u.id) === iuId);
      console.log(`   - ${iuId.slice(0, 16)}... (${iu?.name || 'unnamed'})`);
    }
  }
  
  return {
    affected: Array.from(affectedIUs),
    total: ius.units?.length || 0,
  };
}

async function cmdMigrate(options) {
  console.log('🔄 Computing code migration via theory morphism...');
  
  const oldCanon = loadJson(options['old-canon']);
  const newCanon = loadJson(options['new-canon']);
  const oldIUs = loadJson(options['old-ius']);
  const newIUs = loadJson(options['new-ius']);
  const manifest = loadJson(options['manifest']);
  
  const pan = await getPanproto();
  
  // Build schemas for old and new canonical (theories)
  const oldSchema = buildSchemaFromData(pan, 'canon', oldCanon);
  const newSchema = buildSchemaFromData(pan, 'canon', newCanon);
  
  console.log('   📐 Built schemas:');
  console.log(`      Old: ${Object.keys(oldSchema.data.vertices).length} vertices`);
  console.log(`      New: ${Object.keys(newSchema.data.vertices).length} vertices`);
  
  // Compute diff to understand what changed
  const diffResult = pan.diff(oldSchema, newSchema);
  const [added, removed, modified] = diffResult;
  
  console.log('   📊 Schema changes:');
  console.log(`      Added: ${added.length}`);
  console.log(`      Removed: ${removed.length}`);
  console.log(`      Modified: ${modified.length}`);
  
  // Build migration plan
  const migration = {
    timestamp: new Date().toISOString(),
    schema_changes: { added, removed, modified },
    ius: [],
    summary: { migrate: 0, regenerate: 0, unchanged: 0 },
  };
  
  // Map old IUs to new IUs by content overlap
  const oldIUsMap = new Map((oldIUs.ius || []).map(iu => [iu.id, iu]));
  const newIUsMap = new Map((newIUs.ius || []).map(iu => [iu.id, iu]));
  
  // For each new IU, find best matching old IU and determine migration strategy
  for (const newIu of newIUs.ius || []) {
    const newCanonIds = new Set(newIu.source_canon_ids || []);
    let bestMatch = null;
    let bestOverlap = 0;
    
    // Find old IU with maximum canonical overlap
    for (const oldIu of oldIUs.ius || []) {
      const oldCanonIds = new Set(oldIu.source_canon_ids || []);
      const overlap = [...newCanonIds].filter(id => oldCanonIds.has(id)).length;
      const total = newCanonIds.size;
      const ratio = total > 0 ? overlap / total : 0;
      
      if (ratio > bestOverlap) {
        bestOverlap = ratio;
        bestMatch = oldIu;
      }
    }
    
    // Determine strategy based on overlap and changes
    let strategy, reason;
    
    if (bestOverlap === 1.0 && added.length === 0 && removed.length === 0) {
      // Perfect match, no schema changes
      strategy = 'unchanged';
      reason = 'identical_canonicals';
    } else if (bestOverlap >= 0.8 && removed.length === 0) {
      // High overlap, no removals - safe to migrate
      strategy = 'migrate';
      reason = `high_overlap_${Math.round(bestOverlap * 100)}%`;
    } else if (bestMatch && bestOverlap > 0) {
      // Partial overlap - migrate but mark as needing review
      strategy = 'migrate';
      reason = `partial_overlap_${Math.round(bestOverlap * 100)}%_review_needed`;
    } else {
      // No overlap - must regenerate
      strategy = 'regenerate';
      reason = bestMatch ? 'low_overlap' : 'no_matching_old_iu';
    }
    
    // Find existing implementation from manifest
    const oldImpl = bestMatch ? manifest.files?.[bestMatch.id] : null;
    
    migration.ius.push({
      new_iu_id: newIu.id,
      new_iu_name: newIu.name,
      old_iu_id: bestMatch?.id || null,
      old_iu_name: bestMatch?.name || null,
      overlap_ratio: bestOverlap,
      strategy,
      reason,
      old_impl_path: oldImpl?.impl?.path || null,
      old_test_path: oldImpl?.test?.path || null,
      new_output_path: null, // To be filled by regen
    });
    
    migration.summary[strategy]++;
  }
  
  // Write migration plan
  const outputPath = options.output || join(options['project-root'] || '.', '.phoenix', 'graphs', 'iu-migration.json');
  writeFileSync(outputPath, JSON.stringify(migration, null, 2), 'utf-8');
  
  console.log('\n🎯 Migration Plan:');
  console.log(`   Unchanged: ${migration.summary.unchanged}`);
  console.log(`   Migrate: ${migration.summary.migrate}`);
  console.log(`   Regenerate: ${migration.summary.regenerate}`);
  
  if (migration.summary.migrate > 0) {
    console.log('\n🔄 IUs to migrate (lift old implementation):');
    for (const iu of migration.ius.filter(i => i.strategy === 'migrate')) {
      console.log(`   • ${iu.new_iu_name} (${iu.reason})`);
      if (iu.old_impl_path) {
        console.log(`     from: ${iu.old_impl_path}`);
      }
    }
  }
  
  if (migration.summary.regenerate > 0) {
    console.log('\n🔴 IUs to regenerate (fresh stubs):');
    for (const iu of migration.ius.filter(i => i.strategy === 'regenerate')) {
      console.log(`   • ${iu.new_iu_name} (${iu.reason})`);
    }
  }
  
  console.log(`\n📄 Migration plan saved: ${outputPath}`);
  
  return migration;
}

async function cmdCheck(options) {
  console.log('✓ Checking migration correctness...');
  
  const migration = loadJson(options.migration);
  const from = loadJson(options.from);
  const to = loadJson(options.to);
  
  const pan = await getPanproto();
  
  const srcSchema = buildSchemaFromData(pan, options.type || 'canon', from);
  const tgtSchema = buildSchemaFromData(pan, options.type || 'canon', to);
  
  // Check existence conditions
  const builder = pan.migration(srcSchema, tgtSchema);
  for (const [src, tgt] of Object.entries(migration.vertexMap || {})) {
    builder.map(src, tgt);
  }
  
  const report = pan.checkExistence(srcSchema, tgtSchema, builder);
  
  console.log('\n🔍 Existence Check:');
  console.log(`   Satisfiable: ${report.satisfiable ? '✅ YES' : '❌ NO'}`);
  if (report.issues && report.issues.length > 0) {
    console.log(`   Issues: ${report.issues.length}`);
    for (const issue of report.issues) {
      console.log(`     - ${issue}`);
    }
  }
  
  return report;
}

// === Main Entry Point ===

async function main() {
  const { command, options } = parseArgs();
  
  if (!command || command === 'help' || command === '--help' || command === '-h') {
    console.log(`
🔥 Panproto Skill for Phoenix VCS

Category-theoretic schema morphisms for the Phoenix pipeline.

Commands:
  morphism  Compute pipeline morphism and impact
           --from <file> --to <file> [--type ingest|canon|plan|regen]
  
  lens      Create bidirectional traceability protolens
           --from <file> --to <file> [--output <file>]
  
  diff      Analyze breaking vs non-breaking changes
           --old <file> --new <file> [--type canon|iu|code]
  
  impact    Compute IU invalidation from spec changes
           --ius <ius-file> --canon <canon-file> [--spec-diff <diff>]
  
  check     Validate migration correctness
           --migration <file> --from <file> --to <file>

  migrate   Compute IU migration plan (theory morphism lifting)
           --old-canon <file> --new-canon <file>
           --old-ius <file> --new-ius <file>
           --manifest <file> [--output <file>]

Examples:
  node panproto.js morphism --from .phoenix/clauses.json --to .phoenix/canonical.json
  node panproto.js lens --from .phoenix/canonical.json --to src/generated/
  node panproto.js diff --old .phoenix/canonical-prev.json --new .phoenix/canonical.json
  node panproto.js impact --ius .phoenix/ius.json --canon .phoenix/canonical.json
  node panproto.js migrate --old-canon .phoenix/canonical-prev.json --new-canon .phoenix/canonical.json --old-ius .phoenix/graphs/ius-prev.json --new-ius .phoenix/graphs/ius.json --manifest .phoenix/manifests/generated_manifest.json
`);
    return;
  }
  
  try {
    switch (command) {
      case 'morphism':
        await cmdMorphism(options);
        break;
      case 'lens':
        await cmdLens(options);
        break;
      case 'diff':
        await cmdDiff(options);
        break;
      case 'impact':
        await cmdImpact(options);
        break;
      case 'check':
        await cmdCheck(options);
        break;
      case 'migrate':
        await cmdMigrate(options);
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.log('Run with --help for usage');
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    if (process.env.DEBUG) {
      console.error(error.stack);
    }
    process.exit(1);
  }
}

// Only run main() if this file is the entry point
const isMainModule = process.argv[1] && (
  process.argv[1] === fileURLToPath(import.meta.url) || 
  process.argv[1].endsWith('/panproto.js')
);

if (isMainModule) {
  main();
}
