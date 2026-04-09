#!/usr/bin/env node
/**
 * Phoenix Init - Initialize a new Phoenix project
 * 
 * Creates the directory structure and starter files:
 * - spec/ directory with README.md
 * - src/generated/ directory
 * - .phoenix/ state file
 * 
 * Usage: node .pi/skills/phoenix-init/init.js [project-root]
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { resolve, join } from 'path';

const STARTER_SPEC = `# Project Specification

Describe what this project does in one paragraph.

## Overview

This project implements a [system/app/feature] that [main purpose].

## Requirements

- REQUIREMENT: The system shall [primary capability]
- REQUIREMENT: The system shall [secondary capability]
- CONSTRAINT: Must not exceed [limitation]
- CONSTRAINT: Must support [minimum requirement]

## Definitions

- DEFINITION: "[Term]" means [clear definition]

## Getting Started

1. Edit this file with specific requirements
2. Run the Phoenix pipeline:
   
   \`\`\`bash
   node .pi/skills/phoenix-ingest/ingest.js
   node .pi/skills/phoenix-canonicalize/canonicalize.js
   node .pi/skills/phoenix-plan/plan.js
   node .pi/skills/phoenix-regen/regen.js
   \`\`\`

3. Check status:
   
   \`\`\`bash
   node .pi/skills/phoenix-status/status.js
   \`\`\`

## Notes

Add any additional context, references, or design notes here.
`;

const GITIGNORE = `# Phoenix VCS
.phoenix/graphs/
.phoenix/manifests/
.phoenix/evidence/
.phoenix/purge-backup/
.phoenix/state.json

# Generated code (keep in version control or not - your choice)
# src/generated/

# Dependencies
node_modules/
*.log

# Build outputs
dist/
build/
*.tsbuildinfo

# IDE
.vscode/
.idea/
*.swp
*.swo
`;

const STATE_TEMPLATE = {
  version: '1.0.0',
  project: '',
  initialized_at: '',
  pipeline: {
    ingest: { status: 'pending', completed_at: null },
    canonicalize: { status: 'pending', completed_at: null },
    plan: { status: 'pending', completed_at: null },
    regen: { status: 'pending', completed_at: null },
    evidence: { status: 'pending', completed_at: null },
  },
  audit: { last_run: null, status: 'pending' },
  drift: { last_check: null, status: 'clean' },
};

function initProject(projectRoot) {
  const results = {
    created: [],
    existing: [],
    errors: [],
  };

  // Create spec directory
  const specDir = join(projectRoot, 'spec');
  if (!existsSync(specDir)) {
    mkdirSync(specDir, { recursive: true });
    results.created.push('spec/');
  } else {
    results.existing.push('spec/');
  }

  // Create spec/README.md
  const specReadme = join(specDir, 'README.md');
  if (!existsSync(specReadme)) {
    writeFileSync(specReadme, STARTER_SPEC, 'utf-8');
    results.created.push('spec/README.md');
  } else {
    results.existing.push('spec/README.md');
  }

  // Create src/generated directory
  const generatedDir = join(projectRoot, 'src', 'generated');
  if (!existsSync(generatedDir)) {
    mkdirSync(generatedDir, { recursive: true });
    results.created.push('src/generated/');
  } else {
    results.existing.push('src/generated/');
  }

  // Create .phoenix directory structure
  const phoenixDirs = [
    join(projectRoot, '.phoenix'),
    join(projectRoot, '.phoenix', 'graphs'),
    join(projectRoot, '.phoenix', 'manifests'),
    join(projectRoot, '.phoenix', 'evidence'),
  ];

  for (const dir of phoenixDirs) {
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
      results.created.push(relative(projectRoot, dir) + '/');
    } else {
      results.existing.push(relative(projectRoot, dir) + '/');
    }
  }

  // Create .gitignore
  const gitignorePath = join(projectRoot, '.gitignore');
  if (!existsSync(gitignorePath)) {
    writeFileSync(gitignorePath, GITIGNORE, 'utf-8');
    results.created.push('.gitignore');
  } else {
    // Append Phoenix entries if not present
    const existing = readFileSync(gitignorePath, 'utf-8');
    if (!existing.includes('.phoenix/')) {
      writeFileSync(gitignorePath, existing + '\n' + GITIGNORE, 'utf-8');
      results.created.push('.gitignore (updated with Phoenix entries)');
    } else {
      results.existing.push('.gitignore');
    }
  }

  // Create state.json
  const statePath = join(projectRoot, '.phoenix', 'state.json');
  const projectName = projectRoot.split('/').pop() || 'project';
  const state = {
    ...STATE_TEMPLATE,
    project: projectName,
    initialized_at: new Date().toISOString(),
  };
  writeFileSync(statePath, JSON.stringify(state, null, 2), 'utf-8');
  results.created.push('.phoenix/state.json');

  return results;
}

function relative(from, to) {
  return to.replace(from, '').replace(/^\//, '');
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');

console.log('🔥 Phoenix Init');
console.log(`   Project: ${projectRoot}`);
console.log('');

try {
  // Check if already initialized
  const phoenixDir = join(projectRoot, '.phoenix');
  if (existsSync(phoenixDir)) {
    console.log('⚠️  Phoenix project already initialized');
    console.log('   Run individual pipeline phases as needed.');
    console.log('');
  }

  // Initialize
  const results = initProject(projectRoot);

  // Print results
  console.log('✅ Project initialized');
  console.log('');

  if (results.created.length > 0) {
    console.log('Created:');
    for (const item of results.created) {
      console.log(`   ✓ ${item}`);
    }
    console.log('');
  }

  if (results.existing.length > 0) {
    console.log('Existing (skipped):');
    for (const item of results.existing) {
      console.log(`   • ${item}`);
    }
    console.log('');
  }

  if (results.errors.length > 0) {
    console.log('Errors:');
    for (const error of results.errors) {
      console.log(`   ✗ ${error}`);
    }
    console.log('');
  }

  console.log('📋 Directory Structure:');
  console.log(`   ${projectRoot}/`);
  console.log(`   ├── spec/`);
  console.log(`   │   └── README.md          # Starter spec template`);
  console.log(`   ├── src/`);
  console.log(`   │   └── generated/         # Generated code (empty)`);
  console.log(`   ├── .phoenix/`);
  console.log(`   │   ├── state.json         # Pipeline state`);
  console.log(`   │   ├── graphs/            # Canonical nodes, IUs`);
  console.log(`   │   ├── manifests/         # Generated file hashes`);
  console.log(`   │   └── evidence/          # Evidence records`);
  console.log(`   └── .gitignore             # Phoenix-aware ignore rules`);
  console.log('');

  console.log('🚀 Next steps:');
  console.log('   1. Edit spec/README.md with your requirements');
  console.log('   2. Run the full pipeline:');
  console.log('');
  console.log('      node .pi/skills/phoenix-ingest/ingest.js');
  console.log('      node .pi/skills/phoenix-canonicalize/canonicalize.js');
  console.log('      node .pi/skills/phoenix-plan/plan.js');
  console.log('      node .pi/skills/phoenix-regen/regen.js');
  console.log('');

} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
