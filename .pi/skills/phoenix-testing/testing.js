#!/usr/bin/env node
/**
 * Phoenix Testing - Test verification by risk tier
 * 
 * Validates that generated code meets testing requirements per risk tier.
 * 
 * Usage: node .pi/skills/phoenix-testing/testing.js [project-root]
 */

import { readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { execSync } from 'child_process';

// === RISK TIER TEST REQUIREMENTS ===

const TEST_REQUIREMENTS = {
  low: {
    required: [],
    optional: ['unit_tests'],
  },
  medium: {
    required: ['unit_tests'],
    optional: ['integration_tests'],
  },
  high: {
    required: ['unit_tests', 'integration_tests'],
    optional: ['property_tests', 'e2e_tests'],
  },
  critical: {
    required: ['unit_tests', 'integration_tests', 'property_tests', 'manual_verification'],
    optional: ['formal_verification'],
  },
};

// === UTILITY FUNCTIONS ===

function loadIUs(projectRoot) {
  const iusPath = join(projectRoot, '.phoenix/graphs/ius.json');
  if (!existsSync(iusPath)) {
    return null;
  }
  return JSON.parse(readFileSync(iusPath, 'utf-8'));
}

function findTestFile(projectRoot, outputFiles) {
  for (const file of outputFiles || []) {
    const testPath = file.replace('.ts', '.test.ts').replace('.js', '.test.js');
    const testDir = join(projectRoot, file.replace(/\/[^/]+$/, '/__tests__'));
    const testFile = join(testDir, testPath.split('/').pop());
    
    if (existsSync(join(projectRoot, testPath))) {
      return testPath;
    }
    if (existsSync(testFile)) {
      return testFile.replace(projectRoot + '/', '');
    }
  }
  return null;
}

function checkTests(projectRoot, iu) {
  const tier = iu.risk_tier || 'low';
  const requirements = TEST_REQUIREMENTS[tier];
  
  if (!requirements) {
    return { status: 'unknown', missing: [], errors: ['Unknown risk tier'] };
  }
  
  // Check if test file exists for medium+
  const testFile = tier !== 'low' ? findTestFile(projectRoot, iu.output_files) : null;
  
  const results = {
    tier,
    testFile,
    hasTestFile: !!testFile,
    status: 'pending',
    missing: [],
    errors: [],
  };
  
  // Check required tests
  for (const req of requirements.required) {
    if (req === 'unit_tests' && tier !== 'low') {
      if (!testFile) {
        results.missing.push(req);
      }
    }
  }
  
  results.status = results.missing.length === 0 ? 'pass' : 'fail';
  return results;
}

// === MAIN ===

function main() {
  const projectRoot = resolve(process.argv[2] || '.');
  
  console.log('🧪 Phoenix Testing\n');
  console.log(`Project: ${projectRoot}\n`);
  
  // Load IUs
  const iusData = loadIUs(projectRoot);
  if (!iusData) {
    console.log('❌ No IUs found. Run phoenix-plan first.');
    process.exit(1);
  }
  
  const ius = iusData.ius || [];
  console.log(`Checking ${ius.length} IUs...\n`);
  
  let passed = 0;
  let failed = 0;
  let warnings = 0;
  
  for (const iu of ius) {
    const shortId = iu.short_id || iu.iu_id?.slice(0, 16);
    const name = iu.name || 'Unnamed';
    const tier = iu.risk_tier || 'low';
    
    const results = checkTests(projectRoot, iu);
    
    if (results.status === 'pass') {
      console.log(`✅ ${shortId} (${name}) - ${tier.toUpperCase()}`);
      if (results.testFile) {
        console.log(`   Test file: ${results.testFile}`);
      }
      passed++;
    } else if (results.missing.length > 0 && tier === 'medium') {
      console.log(`⚠️  ${shortId} (${name}) - ${tier.toUpperCase()}`);
      console.log(`   Missing: ${results.missing.join(', ')}`);
      warnings++;
    } else {
      console.log(`❌ ${shortId} (${name}) - ${tier.toUpperCase()}`);
      console.log(`   Missing: ${results.missing.join(', ')}`);
      failed++;
    }
    console.log();
  }
  
  // Summary
  console.log('─'.repeat(50));
  console.log(`Results: ${passed} passed, ${warnings} warnings, ${failed} failed`);
  
  if (failed > 0) {
    console.log('\n❌ Testing verification FAILED');
    process.exit(1);
  } else if (warnings > 0) {
    console.log('\n⚠️  Testing verification PASSED with warnings');
    process.exit(0);
  } else {
    console.log('\n✅ All testing requirements met');
    process.exit(0);
  }
}

main();
