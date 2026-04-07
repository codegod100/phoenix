#!/usr/bin/env node
/**
 * Phoenix Ingest - Parse specs into content-addressed clauses
 * 
 * Self-contained skill - no external dependencies except Node.js stdlib
 * 
 * Usage: node .pi/skills/phoenix-ingest/ingest.js [project-root]
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join } from 'path';

// === VCS IDENTITY FUNCTIONS (inlined) ===

function canonId(text) {
  return createHash('sha256').update(text).digest('hex');
}

function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

function clauseSemhash(text) {
  return canonId(`clause:${normalizeText(text)}`);
}

function contextSemhash(text, sectionContext = [], prevHash = '', nextHash = '') {
  const normalized = normalizeText(text);
  const context = [
    `section:${sectionContext.join('|')}`,
    `prev:${prevHash}`,
    `next:${nextHash}`,
    `text:${normalized}`
  ].join(';');
  return canonId(context);
}

// === VCS INGEST FUNCTIONS (inlined) ===

function ingestSpecs(projectRoot) {
  const specDir = resolve(projectRoot, 'spec');
  const specFiles = readdirSync(specDir).filter(f => f.endsWith('.md'));
  
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
  
  return { clauses, specFiles };
}

// === MAIN EXECUTION ===

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
  const { clauses, specFiles } = ingestSpecs(projectRoot);
  
  if (clauses.length === 0) {
    console.error('❌ No clauses found in spec files');
    process.exit(1);
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
