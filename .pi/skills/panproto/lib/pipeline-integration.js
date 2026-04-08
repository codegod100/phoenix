/**
 * Panproto Pipeline Integration
 * 
 * Integrates panproto morphisms into the Phoenix VCS pipeline.
 * Provides automatic change detection and selective invalidation.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { 
  registerPhoenixProtocol, 
  computePipelineMorphism,
  createTraceabilityLens,
  analyzeChangeImpact 
} from './phoenix-protocol.js';

let Panproto;
try {
  const pkg = await import('@panproto/core');
  Panproto = pkg.Panproto;
} catch (e) {
  console.error('⚠️  @panproto/core not installed. Run: npm install @panproto/core');
  process.exit(1);
}

/**
 * PanprotoPipeline - Integration class for Phoenix VCS
 */
export class PanprotoPipeline {
  #panproto = null;
  #phoenixProto = null;
  #projectRoot = null;
  #cache = new Map();
  
  constructor(projectRoot) {
    this.#projectRoot = resolve(projectRoot || '.');
  }
  
  /**
   * Initialize panproto and register Phoenix protocol
   */
  async init() {
    this.#panproto = await Panproto.init();
    this.#phoenixProto = registerPhoenixProtocol(this.#panproto);
    return this;
  }
  
  /**
   * Load Phoenix graph data from .phoenix directory
   */
  loadGraph(filename) {
    const path = join(this.#projectRoot, '.phoenix', 'graphs', filename);
    if (!existsSync(path)) {
      return null;
    }
    return JSON.parse(readFileSync(path, 'utf-8'));
  }
  
  /**
   * Save graph data
   */
  saveGraph(filename, data) {
    const dir = join(this.#projectRoot, '.phoenix', 'graphs');
    const path = join(dir, filename);
    writeFileSync(path, JSON.stringify(data, null, 2), 'utf-8');
  }
  
  /**
   * Compute morphism between pipeline phases
   */
  computeMorphism(fromPhase, toPhase, fromData = null, toData = null) {
    const from = fromData || this.loadGraph(`${fromPhase}.json`);
    const to = toData || this.loadGraph(`${toPhase}.json`);
    
    if (!from || !to) {
      throw new Error(`Missing data for phases: ${fromPhase} → ${toPhase}`);
    }
    
    return computePipelineMorphism(this.#panproto, fromPhase, toPhase, from, to);
  }
  
  /**
   * Analyze impact of spec changes on IUs
   */
  analyzeImpact(newCanonData = null) {
    const oldCanon = this.loadGraph('canonical-prev.json') || this.loadGraph('canonical.json');
    const newCanon = newCanonData || this.loadGraph('canonical.json');
    const ius = this.loadGraph('ius.json');
    
    if (!oldCanon || !newCanon || !ius) {
      throw new Error('Missing required graph data for impact analysis');
    }
    
    return analyzeChangeImpact(this.#panproto, oldCanon, newCanon, ius);
  }
  
  /**
   * Create traceability lens between canonical and code
   */
  createTraceability() {
    const canon = this.loadGraph('canonical.json');
    const ius = this.loadGraph('ius.json');
    const manifest = this.loadGraph('generated-manifest.json');
    
    if (!canon || !ius) {
      throw new Error('Missing canonical or IU data');
    }
    
    // Build IU → Code lens
    return createTraceabilityLens(
      this.#panproto,
      'iu',
      'code',
      ius,
      manifest || { files: [] }
    );
  }
  
  /**
   * Diff two versions of a phase
   */
  diffPhase(phase, oldData = null, newData = null) {
    const old = oldData || this.loadGraph(`${phase}-prev.json`);
    const neu = newData || this.loadGraph(`${phase}.json`);
    
    if (!old || !neu) {
      throw new Error(`Missing data for phase: ${phase}`);
    }
    
    const morphism = this.computeMorphism(phase, phase, old, neu);
    return this.#panproto.diffFull(morphism.srcSchema, morphism.tgtSchema);
  }
  
  /**
   * Validate migration correctness
   */
  validateMigration(fromPhase, toPhase, migrationSpec) {
    const { srcSchema, tgtSchema, migration } = this.computeMorphism(fromPhase, toPhase);
    
    // Apply mappings from spec
    for (const [src, tgt] of Object.entries(migrationSpec.vertexMap || {})) {
      migration.map(src, tgt);
    }
    
    return this.#panproto.checkExistence(srcSchema, tgtSchema, migration);
  }
  
  /**
   * Get selective invalidation list
   * Returns IUs that need regeneration based on spec changes
   */
  getInvalidationList() {
    const impact = this.analyzeImpact();
    
    return {
      needsRegen: impact.affectedIUs,
      breakingChanges: impact.breaking,
      nonBreakingChanges: impact.nonBreaking,
      totalIUs: this.loadGraph('ius.json')?.units?.length || 0,
      affectedCount: impact.affectedIUs.length,
    };
  }
  
  /**
   * Generate migration report
   */
  generateReport() {
    const invalidation = this.getInvalidationList();
    const ius = this.loadGraph('ius.json');
    
    // Build detailed report
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalIUs: invalidation.totalIUs,
        affectedIUs: invalidation.affectedCount,
        unaffectedIUs: invalidation.totalIUs - invalidation.affectedCount,
        breakingChanges: invalidation.breakingChanges,
        nonBreakingChanges: invalidation.nonBreakingChanges,
      },
      affected: invalidation.needsRegen.map(iuId => {
        const iu = (ius?.units || []).find(u => (u.iu_id || u.id) === iuId);
        return {
          iu_id: iuId,
          name: iu?.name || 'unknown',
          risk_tier: iu?.risk_tier || 'unknown',
        };
      }),
      recommendations: [],
    };
    
    // Generate recommendations
    if (invalidation.breakingChanges > 0) {
      report.recommendations.push(
        `⚠️  ${invalidation.breakingChanges} breaking changes detected - manual review required`
      );
    }
    
    if (invalidation.affectedCount === 0) {
      report.recommendations.push('✅ No IUs affected - safe to commit');
    } else if (invalidation.affectedCount / invalidation.totalIUs < 0.1) {
      report.recommendations.push(`🎯 Selective regeneration: ${invalidation.affectedCount} of ${invalidation.totalIUs} IUs`);
    } else {
      report.recommendations.push(`🔄 Broad impact: ${invalidation.affectedCount} IUs affected - consider spec refinement`);
    }
    
    return report;
  }
  
  /**
   * Dispose and cleanup
   */
  dispose() {
    if (this.#panproto) {
      this.#panproto[Symbol.dispose]();
    }
    this.#cache.clear();
  }
}

/**
 * Standalone utility functions
 */

/**
 * Quick impact analysis from command line
 */
export async function quickImpact(projectRoot) {
  const pipeline = await new PanprotoPipeline(projectRoot).init();
  try {
    const report = pipeline.generateReport();
    
    console.log('\n🔥 Phoenix Panproto Analysis');
    console.log('═════════════════════════════');
    console.log(`\n📊 Summary`);
    console.log(`   Total IUs: ${report.summary.totalIUs}`);
    console.log(`   Affected:  ${report.summary.affectedIUs}`);
    console.log(`   Unaffected: ${report.summary.unaffectedIUs}`);
    console.log(`\n🔄 Breaking: ${report.summary.breakingChanges}`);
    console.log(`🟢 Non-Breaking: ${report.summary.nonBreakingChanges}`);
    
    if (report.affected.length > 0) {
      console.log(`\n📦 Affected IUs:`);
      for (const iu of report.affected) {
        console.log(`   • ${iu.iu_id.slice(0, 16)}... (${iu.name}) [${iu.risk_tier}]`);
      }
    }
    
    console.log(`\n📋 Recommendations:`);
    for (const rec of report.recommendations) {
      console.log(`   ${rec}`);
    }
    
    return report;
  } finally {
    pipeline.dispose();
  }
}

/**
 * Export/import for external tools
 */
export async function exportMorphism(fromPhase, toPhase, projectRoot, outputPath) {
  const pipeline = await new PanprotoPipeline(projectRoot).init();
  try {
    const { migration } = pipeline.computeMorphism(fromPhase, toPhase);
    const spec = migration.toSpec();
    
    writeFileSync(resolve(outputPath), JSON.stringify(spec, null, 2), 'utf-8');
    console.log(`✅ Morphism exported: ${outputPath}`);
    return spec;
  } finally {
    pipeline.dispose();
  }
}

export default {
  PanprotoPipeline,
  quickImpact,
  exportMorphism,
};
