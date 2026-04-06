// Phoenix Helper Functions
// Use these patterns when implementing Phoenix skills

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve, relative, dirname } from 'node:path';
import { createHash } from 'node:crypto';

// ============ PROJECT DETECTION ============

/**
 * Find Phoenix project root from current directory
 * Walks up until .phoenix/ directory found
 */
export function findProjectRoot(from: string = process.cwd()): string | null {
  let dir = resolve(from);
  while (true) {
    if (existsSync(join(dir, '.phoenix'))) return dir;
    const parent = resolve(dir, '..');
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * Require Phoenix root or exit with error
 */
export function requireProjectRoot(): { root: string; phoenixDir: string } {
  const root = findProjectRoot();
  if (!root) {
    throw new Error('Not a Phoenix project. Run /skill:phoenix-init first.');
  }
  return { root, phoenixDir: join(root, '.phoenix') };
}

// ============ GRAPH I/O ============

/**
 * Read a JSON graph file from .phoenix/graphs/
 */
export function readGraph<T>(phoenixDir: string, name: string): T | null {
  const path = join(phoenixDir, 'graphs', `${name}.json`);
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8')) as T;
  } catch (e) {
    throw new Error(`Failed to parse ${name}.json: ${e}`);
  }
}

/**
 * Write a JSON graph file to .phoenix/graphs/
 */
export function writeGraph(phoenixDir: string, name: string, data: unknown): void {
  const graphsDir = join(phoenixDir, 'graphs');
  mkdirSync(graphsDir, { recursive: true });
  const path = join(graphsDir, `${name}.json`);
  writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
}

/**
 * Check if a graph exists and is non-empty
 */
export function hasGraph(phoenixDir: string, name: string): boolean {
  const path = join(phoenixDir, 'graphs', `${name}.json`);
  if (!existsSync(path)) return false;
  try {
    const data = JSON.parse(readFileSync(path, 'utf8'));
    return Object.keys(data).length > 0;
  } catch {
    return false;
  }
}

// ============ HASHING ============

/**
 * Compute SHA-256 hash of content
 */
export function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Compute file hash
 */
export function computeFileHash(path: string): string | null {
  try {
    const content = readFileSync(path, 'utf8');
    return computeHash(content);
  } catch {
    return null;
  }
}

// ============ SPEC FILE DISCOVERY ============

/**
 * Find all .md files in spec/ directory
 */
export function findSpecFiles(projectRoot: string): string[] {
  const specDir = join(projectRoot, 'spec');
  if (!existsSync(specDir)) return [];
  
  const files: string[] = [];
  for (const entry of readdirSync(specDir, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      files.push(join(specDir, entry.name));
    }
  }
  return files.sort();
}

/**
 * Get relative path from project root
 */
export function relativePath(projectRoot: string, fullPath: string): string {
  return relative(projectRoot, fullPath);
}

// ============ MANIFEST OPERATIONS ============

export interface ManifestEntry {
  iu_id: string;
  hash: string;
  size: number;
  generated_at: string;
}

export interface Manifest {
  version: string;
  generated_at: string;
  files: Record<string, ManifestEntry>;
}

/**
 * Load generated manifest
 */
export function loadManifest(phoenixDir: string): Manifest | null {
  const path = join(phoenixDir, 'manifests', 'generated_manifest.json');
  if (!existsSync(path)) return null;
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return null;
  }
}

/**
 * Save manifest entry for a file
 */
export function recordManifestEntry(
  phoenixDir: string, 
  filePath: string, 
  iuId: string,
  projectRoot: string
): void {
  const manifestsDir = join(phoenixDir, 'manifests');
  mkdirSync(manifestsDir, { recursive: true });
  
  const manifestPath = join(manifestsDir, 'generated_manifest.json');
  let manifest: Manifest = { version: '1.0.0', generated_at: new Date().toISOString(), files: {} };
  
  if (existsSync(manifestPath)) {
    try {
      manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    } catch { /* ignore */ }
  }
  
  const fullPath = join(projectRoot, filePath);
  const content = readFileSync(fullPath, 'utf8');
  
  manifest.files[filePath] = {
    iu_id: iuId,
    hash: computeHash(content),
    size: content.length,
    generated_at: new Date().toISOString()
  };
  
  manifest.generated_at = new Date().toISOString();
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
}

// ============ STATE MANAGEMENT ============

export interface State {
  version: string;
  last_ingest: string | null;
  last_canonicalize: string | null;
  last_plan: string | null;
  last_regen: string | null;
}

/**
 * Load bootstrap state
 */
export function loadState(phoenixDir: string): State {
  const path = join(phoenixDir, 'state.json');
  if (!existsSync(path)) {
    return {
      version: '1.0.0',
      last_ingest: null,
      last_canonicalize: null,
      last_plan: null,
      last_regen: null
    };
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return {
      version: '1.0.0',
      last_ingest: null,
      last_canonicalize: null,
      last_plan: null,
      last_regen: null
    };
  }
}

/**
 * Save bootstrap state
 */
export function saveState(phoenixDir: string, state: State): void {
  const path = join(phoenixDir, 'state.json');
  writeFileSync(path, JSON.stringify(state, null, 2), 'utf8');
}

// ============ UTILITY FUNCTIONS ============

/**
 * Normalize text for hashing (lowercase, standardize punctuation)
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[\s]+/g, ' ')
    .replace(/[\.\,\;\:\!\?]+/g, '')
    .trim();
}

/**
 * Extract section heading from markdown line
 */
export function extractHeading(line: string): { level: number; text: string } | null {
  const match = line.match(/^(#{1,6})\s+(.+)$/);
  if (!match) return null;
  return {
    level: match[1].length,
    text: match[2].trim()
  };
}

/**
 * Check if text is a clause marker
 */
export function isClauseMarker(text: string): { type: string; content: string } | null {
  const patterns = [
    { regex: /^-\s*REQUIREMENT:\s*(.+)$/i, type: 'REQUIREMENT' },
    { regex: /^-\s*CONSTRAINT:\s*(.+)$/i, type: 'CONSTRAINT' },
    { regex: /^-\s*DEFINITION:\s*(.+)$/i, type: 'DEFINITION' },
    { regex: /^-\s*ASSUMPTION:\s*(.+)$/i, type: 'ASSUMPTION' },
    { regex: /^-\s*SCENARIO:\s*(.+)$/i, type: 'SCENARIO' },
    { regex: /^-\s*(.+)$/i, type: 'CONTEXT' }  // Fallback for any bullet
  ];
  
  for (const pattern of patterns) {
    const match = text.match(pattern.regex);
    if (match) {
      return { type: pattern.type, content: match[1].trim() };
    }
  }
  return null;
}

// ============ LLM HELPERS ============

/**
 * Simple LLM call wrapper - uses pi's built-in capabilities
 * In skills, use web_search or call external LLM APIs
 */
export async function callLLM(
  prompt: string,
  options: { temperature?: number; maxTokens?: number } = {}
): Promise<string> {
  // This is a placeholder - in actual skill implementation,
  // the agent will use appropriate tools (web_search, etc.)
  // or the skill will provide a script that calls an LLM API
  throw new Error('LLM calls should be implemented via skill-specific scripts');
}

/**
 * Parse LLM JSON response safely
 */
export function parseLLMJSON<T>(text: string): T | null {
  try {
    // Extract JSON from markdown code blocks if present
    const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
    const jsonText = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonText.trim()) as T;
  } catch {
    return null;
  }
}
