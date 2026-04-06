#!/usr/bin/env bun
/**
 * Manual Phoenix Pipeline - Ingest → Canonicalize → Plan
 * Generates IUs from spec/app.md
 */

import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { createHash } from 'crypto';

const PROJECT_ROOT = '/home/nandi/code/phoenix/examples/kanban';
const PHOENIX_DIR = join(PROJECT_ROOT, '.phoenix');
const GRAPHS_DIR = join(PHOENIX_DIR, 'graphs');
const SPEC_FILE = join(PROJECT_ROOT, 'spec/app.md');

// Ensure directories exist
mkdirSync(GRAPHS_DIR, { recursive: true });

// ========== PHASE 1: INGEST ==========

function computeHash(text: string): string {
  return createHash('sha256').update(text).digest('hex');
}

interface Clause {
  id: string;
  type: 'REQUIREMENT' | 'CONSTRAINT' | 'DEFINITION' | 'ASSUMPTION' | 'SCENARIO' | 'CONTEXT';
  text: string;
  raw_text: string;
  section: string;
  section_level: number;
  line_start: number;
  line_end: number;
  source_file: string;
}

function parseSpec(): Clause[] {
  const content = readFileSync(SPEC_FILE, 'utf8');
  const lines = content.split('\n');
  const clauses: Clause[] = [];

  let currentSection = 'General';
  let currentLevel = 1;
  let lineNum = 0;
  let currentClause: Partial<Clause> | null = null;
  let clauseStartLine = 0;

  function flushClause() {
    if (currentClause && currentClause.text) {
      const text = currentClause.text.trim();
      const normalized = text.toLowerCase();
      const id = computeHash(normalized + currentSection + currentClause.type);
      clauses.push({
        id,
        type: currentClause.type as Clause['type'],
        text: normalized,
        raw_text: text,
        section: currentSection,
        section_level: currentLevel,
        line_start: clauseStartLine,
        line_end: lineNum,
        source_file: 'spec/app.md'
      });
    }
    currentClause = null;
  }

  for (const rawLine of lines) {
    lineNum++;
    const line = rawLine.trim();

    // Track sections (headings)
    if (line.startsWith('## ')) {
      flushClause();
      currentSection = line.replace('## ', '').trim();
      currentLevel = 2;
      continue;
    }
    if (line.startsWith('### ')) {
      flushClause();
      currentSection = line.replace('### ', '').trim();
      currentLevel = 3;
      continue;
    }

    // Parse bullet points
    if (line.startsWith('- ') || line.startsWith('* ')) {
      flushClause();

      const content = line.slice(2).trim();
      let type: Clause['type'] = 'CONTEXT';
      let text = content;

      // Classify clause type
      if (content.match(/^requirement:/i)) {
        type = 'REQUIREMENT';
        text = content.replace(/^requirement:\s*/i, '');
      } else if (content.match(/^constraint:/i)) {
        type = 'CONSTRAINT';
        text = content.replace(/^constraint:\s*/i, '');
      } else if (content.match(/^definition:/i)) {
        type = 'DEFINITION';
        text = content.replace(/^definition:\s*/i, '');
      } else if (content.match(/^assumption:/i)) {
        type = 'ASSUMPTION';
        text = content.replace(/^assumption:\s*/i, '');
      } else if (content.match(/^scenario:/i)) {
        type = 'SCENARIO';
        text = content.replace(/^scenario:\s*/i, '');
      }

      currentClause = {
        type,
        text: text.trim(),
        section: currentSection
      };
      clauseStartLine = lineNum;
    }
    // Continue multi-line clause (indented)
    else if ((line.startsWith('  ') || line.startsWith('\t')) && currentClause) {
      currentClause.text += ' ' + line.trim();
    }
    // Blank line ends clause
    else if (line === '' && currentClause) {
      flushClause();
    }
  }

  flushClause();
  return clauses;
}

// ========== PHASE 2: CANONICALIZE ==========

interface CanonicalNode {
  canon_id: string;
  type: string;
  statement: string;
  confidence: number;
  source_clause_ids: string[];
  linked_canon_ids: string[];
  link_types: Record<string, string>;
  tags: string[];
  extraction_method: 'rule';
  canon_anchor: string;
}

function canonicalize(clauses: Clause[]): CanonicalNode[] {
  const nodes: CanonicalNode[] = [];

  for (const clause of clauses) {
    if (clause.type === 'CONTEXT') continue;

    // Normalize statement
    let statement = clause.text;
    if (!statement.includes('system shall') &&
        !statement.includes('system must') &&
        !statement.includes('system should') &&
        clause.type === 'REQUIREMENT') {
      statement = `system shall ${statement}`;
    }

    // Extract tags (key nouns)
    const tagWords = ['board', 'column', 'card', 'api', 'ui', 'modal', 'database',
                      'drag', 'drop', 'count', 'badge', 'button', 'input',
                      'theme', 'color', 'background'];
    const tags = tagWords.filter(tag => statement.includes(tag));

    // Add section-based tags
    tags.push(clause.section.toLowerCase().replace(/\s+/g, '-'));

    const canonId = computeHash(statement + clause.type);

    nodes.push({
      canon_id: canonId,
      type: clause.type,
      statement,
      confidence: clause.type === 'REQUIREMENT' ? 0.95 : 0.85,
      source_clause_ids: [clause.id],
      linked_canon_ids: [],
      link_types: {},
      tags: [...new Set(tags)],
      extraction_method: 'rule',
      canon_anchor: computeHash(statement.slice(0, 50))
    });
  }

  return nodes;
}

// ========== PHASE 3: PLAN ==========

interface IUContract {
  description: string;
  inputs: string[];
  outputs: string[];
  invariants: string[];
}

interface ImplementationUnit {
  iu_id: string;
  name: string;
  kind: string;
  risk_tier: 'low' | 'medium' | 'high';
  contract: IUContract;
  source_canon_ids: string[];
  dependencies: string[];
  output_files: string[];
  evidence_policy: {
    required: string[];
  };
}

function planIUs(nodes: CanonicalNode[]): ImplementationUnit[] {
  // Group nodes by domain (section)
  const groups = new Map<string, CanonicalNode[]>();

  for (const node of nodes) {
    // Extract domain from tags or statement
    let domain = node.tags.find(t => ['board', 'card', 'api', 'ui', 'database', 'design-system'].includes(t));

    // Extract from statement if not found
    if (!domain) {
      if (node.statement.includes('column')) domain = 'board';
      else if (node.statement.includes('card')) domain = 'cards';
      else if (node.statement.includes('modal') || node.statement.includes('drag') || node.statement.includes('display')) domain = 'ui';
      else if (node.statement.includes('get /') || node.statement.includes('post /') || node.statement.includes('patch /')) domain = 'api';
      else if (node.statement.includes('theme') || node.statement.includes('color') || node.statement.includes('button')) domain = 'design-system';
      else if (node.statement.includes('store') || node.statement.includes('foreign key')) domain = 'database';
    }

    if (!domain) domain = 'general';

    // Map domain to IU name
    const iuName = domain.charAt(0).toUpperCase() + domain.slice(1).replace(/-/g, '');

    if (!groups.has(iuName)) groups.set(iuName, []);
    groups.get(iuName)!.push(node);
  }

  // Create IUs
  const ius: ImplementationUnit[] = [];

  for (const [name, groupNodes] of groups) {
    const canonIds = groupNodes.map(n => n.canon_id);
    const iuId = computeHash(canonIds.join('') + name);

    // Determine kind and risk
    let kind = 'module';
    let risk: 'low' | 'medium' | 'high' = 'medium';

    if (name.toLowerCase().includes('design')) { kind = 'design-system'; risk = 'medium'; }
    else if (name.toLowerCase().includes('ui')) { kind = 'web-ui'; risk = 'high'; }
    else if (name.toLowerCase().includes('api')) { kind = 'api'; risk = 'medium'; }
    else if (name.toLowerCase().includes('card')) { kind = 'web-ui'; risk = 'high'; }

    // Build contract
    const invariants: string[] = [];
    const outputs: string[] = [];

    for (const node of groupNodes) {
      if (node.type === 'CONSTRAINT') {
        invariants.push(node.statement.charAt(0).toUpperCase() + node.statement.slice(1));
      }
      if (node.statement.includes('returns') || node.statement.includes('shall display')) {
        outputs.push(node.statement);
      }
    }

    // Determine dependencies
    const deps: string[] = [];
    if (name === 'Cards') deps.push('Board', 'Database');
    if (name === 'UI') deps.push('Cards', 'Design System');
    if (name === 'API') deps.push('Cards', 'Database');

    // Determine output files
    const files: string[] = [];
    const lowerName = name.toLowerCase().replace(/\s+/g, '-');

    if (kind === 'web-ui') {
      files.push(`src/generated/app/${lowerName}.ui.ts`);
      files.push(`src/generated/app/__tests__/${lowerName}.test.ts`);
      if (name === 'Cards') files.push('src/generated/app/cards.client.ts');
    } else if (kind === 'design-system') {
      files.push(`src/generated/app/${lowerName}.ui.ts`);
    } else if (kind === 'api') {
      files.push(`src/generated/app/api.ts`);
      files.push('src/generated/app/__tests__/api.test.ts');
    } else {
      files.push(`src/generated/app/${lowerName}.ts`);
      files.push(`src/generated/app/__tests__/${lowerName}.test.ts`);
    }

    ius.push({
      iu_id: iuId,
      name,
      kind,
      risk_tier: risk,
      contract: {
        description: `${name} implementation for Kanban board`,
        inputs: [],
        outputs: [...new Set(outputs)],
        invariants: [...new Set(invariants)].slice(0, 10)
      },
      source_canon_ids: canonIds,
      dependencies: [...new Set(deps)],
      output_files: [...new Set(files)],
      evidence_policy: {
        required: ['typecheck', 'lint', 'unit_tests']
      }
    });
  }

  return ius;
}

// ========== EXECUTE ==========

console.log('🔥 Phoenix Pipeline: Ingest → Canonicalize → Plan\n');

// Phase 1: Ingest
console.log('📥 Phase 1: Ingesting spec...');
const clauses = parseSpec();
console.log(`   Found ${clauses.length} clauses`);

const specGraph = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  documents: {
    'spec/app.md': {
      clauses,
      metadata: { total_lines: clauses.length > 0 ? clauses[clauses.length - 1].line_end : 0 }
    }
  }
};

writeFileSync(join(GRAPHS_DIR, 'spec.json'), JSON.stringify(specGraph, null, 2));
console.log('   ✓ Saved to .phoenix/graphs/spec.json\n');

// Phase 2: Canonicalize
console.log('📋 Phase 2: Canonicalizing...');
const nodes = canonicalize(clauses);
console.log(`   Extracted ${nodes.length} canonical nodes`);

const canonicalGraph = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  nodes: Object.fromEntries(nodes.map(n => [n.canon_id, n]))
};

writeFileSync(join(GRAPHS_DIR, 'canonical.json'), JSON.stringify(canonicalGraph, null, 2));
console.log('   ✓ Saved to .phoenix/graphs/canonical.json\n');

// Phase 3: Plan
console.log('📐 Phase 3: Planning Implementation Units...');
const ius = planIUs(nodes);
console.log(`   Planned ${ius.length} IUs:`);
for (const iu of ius) {
  console.log(`   • ${iu.name} (${iu.risk_tier}) - ${iu.contract.invariants.length} invariants`);
}

const iuGraph = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  ius
};

writeFileSync(join(GRAPHS_DIR, 'ius.json'), JSON.stringify(iuGraph, null, 2));
console.log('\n   ✓ Saved to .phoenix/graphs/ius.json\n');

console.log('✅ Pipeline complete!');
console.log('\nNext step: Regenerate code from IUs');
console.log('  Run: bun run .phoenix/scripts/regen.ts');
