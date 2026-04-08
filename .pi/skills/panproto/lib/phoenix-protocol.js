/**
 * Phoenix Protocol for Panproto
 * 
 * Defines the Generalized Algebraic Theory for Phoenix VCS pipeline phases.
 * This protocol can be registered with panproto to enable:
 * - Schema construction from Phoenix data
 * - Morphism computation between pipeline phases
 * - Protolens-based traceability
 */

import { PHOENIX_THEORIES } from '../panproto.js';

/**
 * Create a panproto-compatible protocol specification for Phoenix VCS
 */
export function createPhoenixProtocolSpec() {
  return {
    name: 'phoenix',
    description: 'Phoenix VCS pipeline theory - spec to code traceability',
    version: '1.0.0',
    
    // Schema theory sorts
    sorts: [
      // ThSpec sorts
      { name: 'SpecDocument', kind: 'document' },
      { name: 'SpecSection', kind: 'section' },
      { name: 'SpecClause', kind: 'clause' },
      { name: 'ClauseType', kind: 'enum', values: ['REQUIREMENT', 'CONSTRAINT', 'DEFINITION', 'SCENARIO', 'ASSUMPTION'] },
      
      // ThClause sorts
      { name: 'ClauseId', kind: 'identifier' },
      { name: 'NormalizedText', kind: 'string' },
      { name: 'SemanticHash', kind: 'hash' },
      
      // ThCanon sorts
      { name: 'CanonId', kind: 'identifier' },
      { name: 'CanonNode', kind: 'node' },
      { name: 'NodeType', kind: 'enum', values: ['REQUIREMENT', 'CONSTRAINT', 'INVARIANT', 'DEFINITION'] },
      { name: 'CleanStatement', kind: 'statement' },
      
      // ThIU sorts
      { name: 'IUId', kind: 'identifier' },
      { name: 'IUBoundary', kind: 'boundary' },
      { name: 'IUContract', kind: 'contract' },
      { name: 'RiskTier', kind: 'enum', values: ['low', 'medium', 'high', 'critical'] },
      
      // ThCode sorts
      { name: 'CodeFile', kind: 'file' },
      { name: 'CodeModule', kind: 'module' },
      { name: 'CodeFunction', kind: 'function' },
      { name: 'CodeType', kind: 'type' },
      { name: 'TraceabilityRef', kind: 'reference' },
    ],
    
    // Schema theory operations (edges)
    operations: [
      // ThSpec operations
      { name: 'hasClause', src: 'SpecDocument', tgt: 'SpecClause', kind: 'contains' },
      { name: 'hasSection', src: 'SpecDocument', tgt: 'SpecSection', kind: 'contains' },
      { name: 'inSection', src: 'SpecClause', tgt: 'SpecSection', kind: 'belongs' },
      { name: 'hasType', src: 'SpecClause', tgt: 'ClauseType', kind: 'typing' },
      
      // ThClause operations
      { name: 'hasId', src: 'SpecClause', tgt: 'ClauseId', kind: 'identifies' },
      { name: 'hasNormalized', src: 'SpecClause', tgt: 'NormalizedText', kind: 'normalizes' },
      { name: 'hasHash', src: 'NormalizedText', tgt: 'SemanticHash', kind: 'hashes' },
      
      // ThCanon operations
      { name: 'hasCanonId', src: 'ClauseId', tgt: 'CanonId', kind: 'canonizes' },
      { name: 'hasNodeType', src: 'CanonNode', tgt: 'NodeType', kind: 'typing' },
      { name: 'hasStatement', src: 'CanonNode', tgt: 'CleanStatement', kind: 'states' },
      { name: 'derivedFrom', src: 'CanonNode', tgt: 'ClauseId', kind: 'provenance' },
      { name: 'dependsOn', src: 'CanonNode', tgt: 'CanonNode', kind: 'dependency' },
      
      // ThIU operations
      { name: 'hasIUId', src: 'IUBoundary', tgt: 'IUId', kind: 'identifies' },
      { name: 'hasRiskTier', src: 'IUId', tgt: 'RiskTier', kind: 'classifies' },
      { name: 'hasContract', src: 'IUId', tgt: 'IUContract', kind: 'contracts' },
      { name: 'containsCanon', src: 'IUId', tgt: 'CanonId', kind: 'contains' },
      { name: 'iuDependsOn', src: 'IUId', tgt: 'IUId', kind: 'dependency' },
      
      // ThCode operations
      { name: 'implementsIU', src: 'CodeModule', tgt: 'IUId', kind: 'implements' },
      { name: 'exportsFunction', src: 'CodeModule', tgt: 'CodeFunction', kind: 'exports' },
      { name: 'exportsType', src: 'CodeModule', tgt: 'CodeType', kind: 'exports' },
      { name: 'inFile', src: 'CodeModule', tgt: 'CodeFile', kind: 'locates' },
      { name: 'tracesTo', src: 'CodeFunction', tgt: 'CanonId', kind: 'traces' },
    ],
    
    // Axioms / equations for theory validation
    axioms: [
      // Canonicalization is deterministic: same clause → same canon
      {
        name: 'canonical_deterministic',
        description: 'Same normalized text always produces same canon ID',
        lhs: 'hasCanonId(hasNormalized(c1))',
        rhs: 'hasCanonId(hasNormalized(c2))',
        when: 'hasNormalized(c1) = hasNormalized(c2)',
      },
      // IU containment is surjective: every canon in exactly one IU
      {
        name: 'iu_covering',
        description: 'Every canonical node belongs to at least one IU',
        forall: ['CanonId'],
        exists: ['IUId'],
        where: 'containsCanon(IUId, CanonId)',
      },
      // Traceability is total: every function traces to some canon
      {
        name: 'traceability_total',
        description: 'Every exported function must trace to a requirement',
        forall: ['CodeFunction'],
        exists: ['CanonId'],
        where: 'tracesTo(CodeFunction, CanonId)',
      },
    ],
    
    // Constraints for breaking change detection
    constraints: {
      breaking: [
        // Removing a canon node that has implementations
        { type: 'node_removal', condition: 'hasImplementation(node)' },
        // Changing a canon statement that changes semantics
        { type: 'statement_change', condition: 'semanticDiff(old, new) > threshold' },
        // Removing an IU boundary
        { type: 'iu_removal', condition: 'hasEvidence(iu)' },
        // Changing IU contract incompatibly
        { type: 'contract_break', condition: 'not(backwardCompatible(old, new))' },
      ],
      nonBreaking: [
        // Adding new canon nodes
        { type: 'node_addition', condition: 'true' },
        // Adding new IUs
        { type: 'iu_addition', condition: 'true' },
        // Reformatting without semantic change
        { type: 'formatting', condition: 'normalizedEqual(old, new)' },
      ],
    },
  };
}

/**
 * Build a schema from clause data using Phoenix protocol
 */
export function buildSpecSchema(panproto, clauses) {
  const proto = panproto.protocol('phoenix');
  const builder = proto.schema();
  
  // Add document vertex
  builder.vertex('doc:main', 'SpecDocument', { id: 'main' });
  
  // Add clauses as vertices
  for (const clause of clauses) {
    const clauseVertex = `clause:${clause.id}`;
    builder.vertex(clauseVertex, 'SpecClause', {
      id: clause.id,
      raw_text: clause.raw_text,
      line_range: clause.line_range,
    });
    
    // Edge: document → clause
    builder.edge('doc:main', clauseVertex, 'hasClause');
    
    // Add section if present
    if (clause.section) {
      const sectionVertex = `section:${clause.section}`;
      if (!builder.hasVertex(sectionVertex)) {
        builder.vertex(sectionVertex, 'SpecSection', { name: clause.section });
        builder.edge('doc:main', sectionVertex, 'hasSection');
      }
      builder.edge(clauseVertex, sectionVertex, 'inSection');
    }
    
    // Add clause type
    if (clause.type) {
      const typeVertex = `type:${clause.type}`;
      builder.vertex(typeVertex, 'ClauseType', { value: clause.type });
      builder.edge(clauseVertex, typeVertex, 'hasType');
    }
  }
  
  return builder.build();
}

/**
 * Build a schema from canonical nodes
 */
export function buildCanonSchema(panproto, canonicalNodes) {
  const proto = panproto.protocol('phoenix');
  const builder = proto.schema();
  
  for (const node of canonicalNodes) {
    const canonVertex = `canon:${node.canon_id || node.id}`;
    builder.vertex(canonVertex, 'CanonNode', {
      id: node.canon_id || node.id,
      statement: node.statement,
    });
    
    // Node type
    const typeVertex = `nodetype:${node.type}`;
    builder.vertex(typeVertex, 'NodeType', { value: node.type });
    builder.edge(canonVertex, typeVertex, 'hasNodeType');
    
    // Statement
    const stmtVertex = `stmt:${hashString(node.statement)}`;
    builder.vertex(stmtVertex, 'CleanStatement', { text: node.statement });
    builder.edge(canonVertex, stmtVertex, 'hasStatement');
    
    // Provenance: canon → clause
    for (const clauseId of node.source_clause_ids || []) {
      builder.edge(canonVertex, `clause:${clauseId}`, 'derivedFrom');
    }
    
    // Dependencies: canon → canon
    for (const depId of node.dependencies || []) {
      builder.edge(canonVertex, `canon:${depId}`, 'dependsOn');
    }
  }
  
  return builder.build();
}

/**
 * Build a schema from implementation units
 */
export function buildIUSchema(panproto, ius) {
  const proto = panproto.protocol('phoenix');
  const builder = proto.schema();
  
  for (const iu of ius) {
    const iuVertex = `iu:${iu.iu_id || iu.id}`;
    builder.vertex(iuVertex, 'IUBoundary', {
      id: iu.iu_id || iu.id,
      name: iu.name,
    });
    
    // Risk tier
    const riskVertex = `risk:${iu.risk_tier}`;
    builder.vertex(riskVertex, 'RiskTier', { value: iu.risk_tier });
    builder.edge(iuVertex, riskVertex, 'hasRiskTier');
    
    // Contract
    if (iu.contract) {
      const contractVertex = `contract:${iu.iu_id || iu.id}`;
      builder.vertex(contractVertex, 'IUContract', {
        description: iu.contract.description,
        inputs: iu.contract.inputs,
        outputs: iu.contract.outputs,
      });
      builder.edge(iuVertex, contractVertex, 'hasContract');
    }
    
    // Contains canonical nodes
    for (const canonId of iu.source_canon_ids || []) {
      builder.edge(iuVertex, `canon:${canonId}`, 'containsCanon');
    }
    
    // IU dependencies
    for (const depId of iu.dependencies || []) {
      builder.edge(iuVertex, `iu:${depId}`, 'iuDependsOn');
    }
  }
  
  return builder.build();
}

/**
 * Build a schema from generated code
 */
export function buildCodeSchema(panproto, codeFiles) {
  const proto = panproto.protocol('phoenix');
  const builder = proto.schema();
  
  for (const file of codeFiles) {
    const fileVertex = `file:${file.path}`;
    builder.vertex(fileVertex, 'CodeFile', {
      path: file.path,
      iu_id: file.iu_id,
    });
    
    // Module
    const moduleVertex = `module:${file.iu_id}`;
    builder.vertex(moduleVertex, 'CodeModule', {
      iu_id: file.iu_id,
      name: file.module_name,
    });
    builder.edge(moduleVertex, fileVertex, 'inFile');
    
    // IU implementation reference
    if (file.iu_id) {
      builder.edge(moduleVertex, `iu:${file.iu_id}`, 'implementsIU');
    }
    
    // Functions
    for (const fn of file.functions || []) {
      const fnVertex = `fn:${file.iu_id}.${fn.name}`;
      builder.vertex(fnVertex, 'CodeFunction', {
        name: fn.name,
        signature: fn.signature,
      });
      builder.edge(moduleVertex, fnVertex, 'exportsFunction');
      
      // Traceability
      for (const canonId of fn.implements || []) {
        builder.edge(fnVertex, `canon:${canonId}`, 'tracesTo');
      }
    }
    
    // Types
    for (const type of file.types || []) {
      const typeVertex = `type:${file.iu_id}.${type.name}`;
      builder.vertex(typeVertex, 'CodeType', {
        name: type.name,
        definition: type.definition,
      });
      builder.edge(moduleVertex, typeVertex, 'exportsType');
    }
  }
  
  return builder.build();
}

// Utility: hash string for vertex IDs
function hashString(str) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36).slice(0, 8);
}

/**
 * Register Phoenix protocol with panproto instance
 */
export function registerPhoenixProtocol(panproto) {
  const spec = createPhoenixProtocolSpec();
  return panproto.defineProtocol(spec);
}

/**
 * Compute the pipeline morphism between two phases
 */
export function computePipelineMorphism(panproto, fromType, toType, fromData, toData) {
  // Build source and target schemas
  let srcSchema, tgtSchema;
  
  switch (fromType) {
    case 'spec':
      srcSchema = buildSpecSchema(panproto, fromData.clauses);
      break;
    case 'clause':
      srcSchema = buildSpecSchema(panproto, fromData);
      break;
    case 'canon':
      srcSchema = buildCanonSchema(panproto, fromData.nodes || fromData);
      break;
    case 'iu':
      srcSchema = buildIUSchema(panproto, fromData.units || fromData);
      break;
    case 'code':
      srcSchema = buildCodeSchema(panproto, fromData.files || fromData);
      break;
    default:
      throw new Error(`Unknown schema type: ${fromType}`);
  }
  
  switch (toType) {
    case 'clause':
      tgtSchema = buildSpecSchema(panproto, toData);
      break;
    case 'canon':
      tgtSchema = buildCanonSchema(panproto, toData.nodes || toData);
      break;
    case 'iu':
      tgtSchema = buildIUSchema(panproto, toData.units || toData);
      break;
    case 'code':
      tgtSchema = buildCodeSchema(panproto, toData.files || toData);
      break;
    default:
      throw new Error(`Unknown schema type: ${toType}`);
  }
  
  // Build migration
  const migration = panproto.migration(srcSchema, tgtSchema);
  
  // Auto-map based on content addressing where possible
  // This is the core insight: content-addressed IDs enable automatic morphisms
  
  return { srcSchema, tgtSchema, migration };
}

/**
 * Create a protolens for bidirectional traceability
 */
export function createTraceabilityLens(panproto, fromType, toType, fromData, toData) {
  const { srcSchema, tgtSchema } = computePipelineMorphism(
    panproto, fromType, toType, fromData, toData
  );
  
  return panproto.lens(srcSchema, tgtSchema);
}

/**
 * Analyze spec changes for impact on IUs
 */
export function analyzeChangeImpact(panproto, oldSpec, newSpec, ius) {
  // Build schemas
  const oldSchema = buildCanonSchema(panproto, oldSpec.nodes || oldSpec);
  const newSchema = buildCanonSchema(panproto, newSpec.nodes || newSpec);
  
  // Compute diff
  const diff = panproto.diffFull(oldSchema, newSchema);
  
  // Find affected IUs
  const affectedIUs = new Set();
  const changedCanonIds = new Set();
  
  // Collect changed canonical IDs
  for (const change of diff.changes || []) {
    const id = change.id || change.vertex?.split(':')[1];
    if (id) changedCanonIds.add(id);
  }
  
  // Find IUs containing changed nodes
  for (const iu of ius.units || ius || []) {
    const canonIds = iu.source_canon_ids || [];
    for (const changedId of changedCanonIds) {
      if (canonIds.includes(changedId)) {
        affectedIUs.add(iu.iu_id || iu.id);
      }
    }
  }
  
  return {
    diff,
    affectedIUs: Array.from(affectedIUs),
    changedCanonIds: Array.from(changedCanonIds),
    breaking: diff.breaking?.length || 0,
    nonBreaking: diff.nonBreaking?.length || 0,
  };
}

export default {
  createPhoenixProtocolSpec,
  registerPhoenixProtocol,
  buildSpecSchema,
  buildCanonSchema,
  buildIUSchema,
  buildCodeSchema,
  computePipelineMorphism,
  createTraceabilityLens,
  analyzeChangeImpact,
};
