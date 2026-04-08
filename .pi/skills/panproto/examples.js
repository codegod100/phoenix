/**
 * Example: Using Panproto with Phoenix Pipeline
 * 
 * This example demonstrates how to use the panproto skill to:
 * 1. Analyze spec changes for IU impact
 * 2. Create bidirectional traceability
 * 3. Validate migrations
 */

import { PanprotoPipeline, quickImpact } from './lib/pipeline-integration.js';

// Example 1: Quick impact analysis from CLI
console.log('Example 1: Quick Impact Analysis');
console.log('================================');
console.log('Run: node panproto.js impact --ius .phoenix/graphs/ius.json --canon .phoenix/graphs/canonical.json');
console.log('');

// Example 2: Programmatic usage
async function exampleProgrammatic() {
  console.log('Example 2: Programmatic Usage');
  console.log('==============================');
  
  try {
    const pipeline = await new PanprotoPipeline('.').init();
    
    // Get invalidation list
    const invalidation = pipeline.getInvalidationList();
    console.log('Invalidation list:', invalidation);
    
    // Generate full report
    const report = pipeline.generateReport();
    console.log('\nReport:', JSON.stringify(report, null, 2));
    
    pipeline.dispose();
  } catch (err) {
    console.log('Note: This requires Phoenix graph files to exist');
    console.log('Error:', err.message);
  }
}

// Example 3: Morphism computation
async function exampleMorphism() {
  console.log('\nExample 3: Morphism Computation');
  console.log('================================');
  console.log(`
// Compute morphism: ThCanon → ThIU
const { migration } = pipeline.computeMorphism('canon', 'iu');

// Add custom mappings
migration.map('REQ-1a2b', 'IU-3c4d');
migration.map('REQ-5e6f', 'IU-7g8h');

// Compile to executable transformation
const compiled = migration.compile();

// Apply to data
const migratedIUs = compiled.lift(currentIUs);
`);
}

// Example 4: Protolens traceability
async function exampleLens() {
  console.log('\nExample 4: Protolens Traceability');
  console.log('==================================');
  console.log(`
// Create lens between canonical and code
const lens = pipeline.createTraceability();

// Forward: requirements → code locations
const { view: codeLocations, complement } = lens.get(requirements);

// Backward: code → requirements (with complement for round-trip)
const restoredReqs = lens.put(modifiedCode, complement);

// Full bidirectional sync
const symLens = panproto.symmetricLens(canonSchema, codeSchema);
const { newA, newB } = symLens.sync(
  { a: currentCode, b: currentCanon },
  { a: newCode, b: newCanon }
);
`);
}

// Run examples
async function main() {
  await exampleProgrammatic();
  await exampleMorphism();
  await exampleLens();
  
  console.log('\n📚 See README.md for full documentation');
  console.log('🔧 Run with --help for CLI usage');
}

main().catch(console.error);
