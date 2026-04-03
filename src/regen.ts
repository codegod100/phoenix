/**
 * Minimal Phoenix Regen - Direct LLM, no complexity.
 */

import type { ImplementationUnit } from './models/iu.js';
import type { CanonicalNode } from './models/canonical.js';
import type { IUManifest, RegenMetadata, FileManifestEntry } from './models/manifest.js';
import type { PiSDKProvider } from './llm/pi-sdk.js';
import { buildPrompt, buildClientPrompt, buildTsUiPrompt, getSystemPrompt } from './llm/prompt.js';
import type { ResolvedTarget } from './models/architecture.js';
import { sha256 } from './semhash.js';

const TOOLCHAIN_VERSION = 'phoenix-minimal/0.3.0';

export interface RegenResult {
  iu_id: string;
  files: Map<string, string>;
  manifest: IUManifest;
}

export interface RegenContext {
  llm?: PiSDKProvider;
  canonNodes?: CanonicalNode[];
  allIUs?: ImplementationUnit[];
  projectRoot?: string;
  target?: ResolvedTarget | null;
  verbose?: boolean;
  log?: (msg: string) => void;
}

/**
 * Generate ONE IU. One output file. Direct LLM. Fast.
 */
export async function generateIU(iu: ImplementationUnit, ctx?: RegenContext): Promise<RegenResult> {
  const log = ctx?.verbose && ctx?.log ? ctx.log : () => {};
  const modelId = ctx?.llm ? `${ctx.llm.name}/${ctx.llm.model}` : 'stub';

  log(`[${iu.name}] Generating...`);

  const files = new Map<string, string>();

  // Generate each output file sequentially
  for (const outputPath of iu.output_files) {
    let content: string;

    if (ctx?.llm && ctx.canonNodes) {
      content = await generateWithLLM(iu, ctx.llm, ctx.canonNodes, ctx, outputPath);
    } else {
      content = generateStub(iu);
    }

    files.set(outputPath, content);
    log(`[${iu.name}] ${outputPath}: ${content.length} chars`);
  }

  // Build manifest
  const fileEntries: Record<string, FileManifestEntry> = {};
  for (const [path, content] of files) {
    fileEntries[path] = { path, content_hash: sha256(content), size: content.length };
  }

  const metadata: RegenMetadata = {
    model_id: modelId,
    promptpack_hash: sha256(JSON.stringify(iu.contract)),
    toolchain_version: TOOLCHAIN_VERSION,
    generated_at: new Date().toISOString(),
  };

  return {
    iu_id: iu.iu_id,
    files,
    manifest: {
      iu_id: iu.iu_id,
      iu_name: iu.name,
      files: fileEntries,
      regen_metadata: metadata,
    },
  };
}

/**
 * Direct LLM generation - ONE call, no retries, no typecheck.
 */
async function generateWithLLM(
  iu: ImplementationUnit,
  llm: PiSDKProvider,
  canonNodes: CanonicalNode[],
  ctx?: RegenContext,
  outputPath?: string
): Promise<string> {
  const log = ctx?.verbose && ctx?.log ? ctx.log : () => {};
  const startTime = Date.now();

  // Find sibling modules
  const iuDir = iu.output_files[0]?.split('/').slice(0, -1).join('/');
  const siblings = ctx?.allIUs
    ?.filter(o => o.iu_id !== iu.iu_id && o.output_files[0]?.startsWith(iuDir || ''))
    .map(o => o.name) ?? [];

  // Choose the right prompt based on output file type
  let prompt: string;
  const isUi = outputPath?.endsWith('.ui.ts');
  const isClient = outputPath?.endsWith('.client.ts');
  
  if (isUi) {
    prompt = buildTsUiPrompt(iu, canonNodes);
  } else if (isClient) {
    prompt = buildClientPrompt(iu, canonNodes);
  } else {
    prompt = buildPrompt(iu, canonNodes, siblings, ctx?.target);
  }
  
  const systemPrompt = getSystemPrompt(ctx?.target);

  log(`  [${iu.name}] Prompt: ${prompt.length} chars`);

  // SINGLE LLM CALL
  const raw = await llm.generate(
    prompt,
    { system: systemPrompt, temperature: 0.2, maxTokens: 8192 },
    (chunk: string) => {} // No streaming logging for speed
  );

  log(`  [${iu.name}] LLM: ${raw.length} chars in ${Date.now() - startTime}ms`);

  // Simple clean - extract from markdown if present
  return cleanCode(raw);
}

/**
 * Simple code cleaner - extract from markdown blocks or XML tags, fix common issues.
 */
function cleanCode(raw: string): string {
  const trimmed = raw.trim();

  // If wrapped in ```typescript, extract it
  const mdMatch = trimmed.match(/```(?:typescript|ts)?\s*\n?([\s\S]*?)\n?```/);
  let code = mdMatch ? mdMatch[1].trim() : trimmed;

  // If wrapped in <output> tags, extract it
  const xmlMatch = code.match(/<output>\s*\n?([\s\S]*?)\n?\s*<\/output>/);
  if (xmlMatch) code = xmlMatch[1].trim();

  // Strip any stray <output> or </output> tags
  code = code.replace(/<output>/g, '').replace(/<\/output>/g, '');
  
  // Remove invalid section markers that some models output
  code = code.replace(/__MIGRATIONS__\n?/g, '');
  code = code.replace(/__SCHEMAS__\n?/g, '');
  code = code.replace(/__ROUTES__\n?/g, '');
  code = code.replace(/__TESTS__\n?/g, '');
  
  // Remove registerMigration calls with multiline backtick strings
  code = code.replace(/registerMigration\s*\([\s\S]*?\`[\s\S]*?\`\s*\);?\n?/g, '');
  
  // Remove any remaining SQL-like content that leaked through
  code = code.replace(/\(\s*\d+\s*\)\s*PRIMARY KEY[^\n]*\n/g, '');
  code = code.replace(/CREATE TABLE[^;]*;\n?/gi, '');
  code = code.replace(/FOREIGN KEY[^\n]*\n/gi, '');
  
  // Fix missing router declaration if router is used
  if (code.includes('router.') && !code.includes('const router') && !code.includes('new Hono')) {
    // Add router declaration after imports
    const importEnd = code.lastIndexOf('import');
    const importEndLine = code.indexOf('\n', importEnd);
    if (importEndLine > 0) {
      code = code.slice(0, importEndLine + 1) + '\nconst router = new Hono();\n' + code.slice(importEndLine + 1);
    }
  }
  
  return code.trim();
}

/**
 * Simple stub when no LLM available.
 */
function generateStub(iu: ImplementationUnit): string {
  return `// ${iu.name} - Generated by Phoenix
// ${iu.contract.description}

export default {};

export const _phoenix = {
  iu_id: '${iu.iu_id}',
  name: '${iu.name}',
  risk_tier: '${iu.risk_tier}',
  canon_ids: [${iu.source_canon_ids.join(', ')} as const],
} as const;`;
}

/**
 * Generate multiple IUs sequentially.
 */
export async function generateAll(ius: ImplementationUnit[], ctx?: RegenContext): Promise<RegenResult[]> {
  const results: RegenResult[] = [];
  for (const iu of ius) {
    results.push(await generateIU(iu, ctx));
  }
  return results;
}
