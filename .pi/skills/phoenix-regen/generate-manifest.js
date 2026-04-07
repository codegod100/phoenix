#!/usr/bin/env node
/**
 * Generate manifest for existing files
 * Usage: node generate-manifest.js [project-root]
 */

import { readFileSync, readdirSync, existsSync, mkdirSync, writeFileSync, statSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join, relative, dirname } from 'path';

function canonId(text) {
  return createHash('sha256').update(text).digest('hex');
}

function fileHash(content) {
  return canonId(content);
}

function findFiles(dir, baseDir, files = []) {
  if (!existsSync(dir)) return files;
  
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    const relPath = relative(baseDir, fullPath);
    
    if (entry.isDirectory()) {
      findFiles(fullPath, baseDir, files);
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      files.push(relPath);
    }
  }
  
  return files;
}

const projectRoot = resolve(process.argv[2] || '.');
const generatedDir = join(projectRoot, 'src/generated');
const manifestDir = join(projectRoot, '.phoenix/manifests');
const manifestPath = join(manifestDir, 'generated_manifest.json');

console.log('📝 Generating Manifest');
console.log(`   Project: ${projectRoot}`);

if (!existsSync(generatedDir)) {
  console.error(`❌ No generated directory at ${generatedDir}`);
  process.exit(1);
}

const files = findFiles(generatedDir, projectRoot);

if (files.length === 0) {
  console.error('❌ No .ts/.js files found in src/generated/');
  process.exit(1);
}

const manifest = {
  version: '1.0.0',
  generated_at: new Date().toISOString(),
  files: {}
};

for (const filePath of files) {
  const fullPath = join(projectRoot, filePath);
  const content = readFileSync(fullPath, 'utf-8');
  const hash = fileHash(content);
  const stats = statSync(fullPath);
  
  // Try to extract IU ID from _phoenix export
  const iuMatch = content.match(/iu_id:\s*['"]([^'"]+)['"]/);
  
  manifest.files[filePath] = {
    iu_id: iuMatch ? iuMatch[1] : null,
    hash: hash,
    size: stats.size,
    generated_at: new Date().toISOString()
  };
}

if (!existsSync(manifestDir)) {
  mkdirSync(manifestDir, { recursive: true });
}

writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

console.log(`✅ Generated manifest with ${files.length} files`);
console.log(`   Output: ${manifestPath}`);
console.log('\nFiles:');
for (const filePath of Object.keys(manifest.files).slice(0, 10)) {
  console.log(`   ${filePath}`);
}
if (Object.keys(manifest.files).length > 10) {
  console.log(`   ... and ${Object.keys(manifest.files).length - 10} more`);
}
