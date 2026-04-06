#!/usr/bin/env node
/**
 * Phoenix Spec Validator
 * Checks spec files for IU references and other issues
 */

import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const SPEC_DIR = process.argv[2] || './spec';

const issues = [];
const files = readdirSync(SPEC_DIR).filter(f => f.endsWith('.md'));

for (const file of files) {
  const content = readFileSync(join(SPEC_DIR, file), 'utf-8');
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Check for IU references (not in code blocks or comments explaining the rule)
    if (/IU-\d+/i.test(line) && !line.includes('<!--') && !line.includes('-->')) {
      issues.push(`${file}:${lineNum}: IU reference found: "${line.trim()}"`);
    }

    // Check for "Implementation Unit" mentions
    if (/Implementation Unit/i.test(line)) {
      issues.push(`${file}:${lineNum}: "Implementation Unit" found: "${line.trim()}"`);
    }

    // Check for forward references to planned artifacts
    if (/\b(the\s+)?\w+\s+IU\b/i.test(line)) {
      issues.push(`${file}:${lineNum}: Feature + "IU" pattern found: "${line.trim()}"`);
    }
  }
}

if (issues.length === 0) {
  console.log('✅ All specs clean - no IU references found');
  process.exit(0);
} else {
  console.log('❌ Spec validation failed:');
  issues.forEach(issue => console.log(`  ${issue}`));
  console.log(`\nFix: Remove IU references. Use feature names instead.`);
  process.exit(1);
}
