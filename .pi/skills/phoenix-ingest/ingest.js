#!/usr/bin/env node
/**
 * Phoenix Ingest - Parse specs into content-addressed clauses
 * 
 * Usage: node .pi/skills/phoenix-ingest/ingest.js [project-root]
 */

import { canonId, normalizeText, clauseSemhash, contextSemhash } from '../phoenix-vcs-core/lib/identity.js';
import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { resolve, join } from 'path';

const projectRoot = resolve(process.argv[2] || '.');
const specDir = resolve(projectRoot, 'spec');
const outputDir = resolve(projectRoot, '.phoenix/graphs');

if (!existsSync(specDir)) {
  console.error(`❌ No spec directory found at ${specDir}`);
  process.exit(1);
}

console.log('📥 Phoenix Ingest');
console.log(`   Project: ${projectRoot}`);
console.log(`   Spec dir: ${specDir}\n`);

try {
  const specFiles = readdirSync(specDir).filter(f => f.endsWith('.md'));
  
  if (specFiles.length === 0) {
    console.error('❌ No .md files found in spec/');
    process.exit(1);
  }

  const clauses = [];
  let prevHash = '';

  for (const file of specFiles) {
    const content = readFileSync(join(specDir, file), 'utf-8');
    const lines = content.split('\n');
    let currentSection = '';

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      if (line.startsWith('## ')) {
        currentSection = line.replace('## ', '').trim();
      }
      
      const match = line.match(/^- (REQUIREMENT|CONSTRAINT|DEFINITION|ASSUMPTION|SCENARIO):\s*(.+)$/);
      if (match) {
        const type = match[1];
        const rawText = match[2];
        
        const normalized = normalizeText(rawText);
        const id = canonId(normalized);
        const clauseHash = clauseSemhash(normalized);
        const contextHash = contextSemhash(normalized, [currentSection], prevHash, '');
        
        clauses.push({
          id,
          type,
          text: normalized,
          raw_text: rawText,
          section: currentSection,
          source_file: `spec/${file}`,
          line: i + 1,
          clause_semhash: clauseHash,
          context_semhash: contextHash
        });
        
        prevHash = clauseHash;
      }
    }
  }

  if (!existsSync(outputDir)) {
    mkdirSync(outputDir, { recursive: true });
  }

  const output = {
    version: '1.0.0',
    generated_at: new Date().toISOString(),
    clause_count: clauses.length,
    file_count: specFiles.length,
    files: specFiles.map(f => `spec/${f}`),
    clauses
  };

  writeFileSync(
    join(outputDir, 'spec.json'),
    JSON.stringify(output, null, 2)
  );

  console.log(`✅ Ingested ${clauses.length} clauses from ${specFiles.length} files`);
  console.log(`   Output: .phoenix/graphs/spec.json\n`);
  
  const types = {};
  for (const c of clauses) {
    types[c.type] = (types[c.type] || 0) + 1;
  }
  for (const [type, count] of Object.entries(types)) {
    console.log(`   ${type}: ${count}`);
  }

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
