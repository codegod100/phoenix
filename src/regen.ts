/**
 * Minimal Phoenix Regen - Direct LLM with smoke tests and auto-fixes.
 */

import { execSync } from 'node:child_process';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import type { ImplementationUnit } from './models/iu.js';
import type { CanonicalNode } from './models/canonical.js';
import type { IUManifest, RegenMetadata, FileManifestEntry } from './models/manifest.js';
import type { LLMProvider } from './llm/provider.js';
import { buildPrompt, buildClientPrompt, buildTsUiPrompt, getSystemPrompt, buildReflectPrompt } from './llm/prompt.js';
import type { ResolvedTarget } from './models/architecture.js';
import { sha256 } from './semhash.js';
import { log, createLogger, timing } from './logger.js';

const TOOLCHAIN_VERSION = 'phoenix-minimal/0.4.0';
const MAX_RETRIES = 2;

/**
 * Format a duration in milliseconds to human-readable string.
 * Uses appropriate units: ms (< 1s), seconds (< 1min), minutes:seconds (< 1hr), etc.
 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.floor((ms % 60000) / 1000);
    return `${mins}m ${secs}s`;
  }
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `${hrs}h ${mins}m`;
}

/**
 * Format ETA with smart rounding based on magnitude.
 */
function formatETA(ms: number): string {
  if (ms < 1000) return '< 1s';
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  if (ms < 3600000) {
    const mins = Math.floor(ms / 60000);
    const secs = Math.round((ms % 60000) / 1000);
    return secs > 0 ? `~${mins}m ${secs}s` : `~${mins}m`;
  }
  const hrs = Math.floor(ms / 3600000);
  const mins = Math.floor((ms % 3600000) / 60000);
  return `~${hrs}h ${mins}m`;
}

export interface RegenResult {
  iu_id: string;
  files: Map<string, string>;
  manifest: IUManifest;
}

export interface RegenContext {
  llm?: LLMProvider;
  canonNodes?: CanonicalNode[];
  allIUs?: ImplementationUnit[];
  projectRoot?: string;
  target?: ResolvedTarget | null;
  verbose?: boolean;
  noRetry?: boolean; // Skip all auto-fixes
  reflect?: boolean; // Use reflection prompting (default: true)
  codeOnlyFix?: boolean; // Legacy: only try code fixes, don't escalate to spec repair (default: false)
  log?: (msg: string) => void;
}

/**
 * Generate ONE IU. One output file. Direct LLM. Fast.
 */
export async function generateIU(iu: ImplementationUnit, ctx?: RegenContext): Promise<RegenResult> {
  return timing.wrap(`generateIU:${iu.name}`, async () => {
    const modelId = ctx?.llm ? `${ctx.llm.name}/${ctx.llm.model}` : 'stub';
    const iuLogger = createLogger({ iu: iu.name, iu_id: iu.iu_id.slice(0, 8) });

    iuLogger.info(`Starting generation of ${iu.name} (${iu.output_files.length} file(s))`);

    const files = new Map<string, string>();

    // Generate each output file sequentially
    for (const [index, outputPath] of iu.output_files.entries()) {
      const fileNum = index + 1;
      
      const content = await timing.wrap(
        `generate:${iu.name}:${outputPath}`,
        async () => {
          iuLogger.info(`[${fileNum}/${iu.output_files.length}] Generating ${outputPath}...`);
          
          let result: string;
          const fileStartTime = Date.now();

          if (ctx?.llm && ctx.canonNodes) {
            result = await generateWithLLM(iu, ctx.llm, ctx.canonNodes, ctx, outputPath, iuLogger);
          } else {
            iuLogger.debug('Using stub generation (no LLM)');
            result = generateStub(iu);
          }

          const fileElapsed = Date.now() - fileStartTime;
          iuLogger.info({ 
            outputPath, 
            chars: result.length, 
            duration_ms: fileElapsed 
          }, `✓ ${outputPath} (${result.length} chars, ${fileElapsed}ms)`);
          
          return result;
        },
        { iu: iu.name, outputPath },
        'debug'
      );

      files.set(outputPath, content);
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

    log.success('Generated', iu.name);

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
  }, { iu: iu.name, risk_tier: iu.risk_tier }, 'info');
}

/**
 * Direct LLM generation with typecheck-and-retry smoke testing.
 */
async function generateWithLLM(
  iu: ImplementationUnit,
  llm: LLMProvider,
  canonNodes: CanonicalNode[],
  ctx?: RegenContext,
  outputPath?: string,
  iuLogger = log
): Promise<string> {
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
  
  // Apply reflection wrapper by default (opt-out with --no-reflect)
  const useReflect = ctx?.reflect !== false;
  if (useReflect) {
    prompt = buildReflectPrompt(prompt);
    iuLogger.debug('Using reflection prompting (default)');
  }
  
  const systemPrompt = getSystemPrompt(ctx?.target);

  iuLogger.debug({ promptLength: prompt.length }, `Prompt: ${prompt.length} chars`);

  // SINGLE LLM CALL
  const raw = await llm.generate(
    prompt,
    { system: systemPrompt, temperature: 0.2, maxTokens: 8192 },
    (chunk: string) => {} // No streaming logging for speed
  );

  const llmTime = Date.now() - startTime;
  iuLogger.debug({ rawLength: raw.length, duration_ms: llmTime }, `LLM: ${raw.length} chars in ${llmTime}ms`);

  // Clean and repair the code
  let code = cleanAndRepairCode(raw);

  // Typecheck with spec-escalation on failure (default behavior)
  if (ctx?.projectRoot && outputPath) {
    const allErrors = typecheckFile(ctx.projectRoot, outputPath, code);
    
    if (!allErrors) {
      iuLogger.debug('Typecheck: clean');
    } else if (ctx?.noRetry) {
      // Skip retry, just log errors for manual fix
      iuLogger.error({ 
        errors: allErrors.slice(0, 500),
        outputPath,
        hint: 'Run without --no-retry to attempt auto-fix'
      }, `Typecheck failed (--no-retry set)`);
    } else {
      // STRICT FILTER: Only care about errors in the file being generated
      // Ignore test files and other modules - they have their own generation cycles
      const fileName = outputPath.split('/').pop() || outputPath;
      const generatedFilePath = outputPath.replace(/^\//, ''); // Remove leading slash if present
      
      const relevantErrorLines = allErrors.split('\n').filter(line => {
        // Must be an error line (contains error code)
        if (!line.includes('error TS')) return false;
        // Must be in the generated file (not test files or other modules)
        if (line.includes('__tests__/') || line.includes('.test.ts')) return false;
        // Must reference our file
        return line.includes(fileName) || line.includes(generatedFilePath);
      });
      
      const relevantErrors = relevantErrorLines.join('\n');
      
      // If no relevant errors (only test file errors), ignore them
      if (!relevantErrors.trim()) {
        iuLogger.debug('Typecheck: clean (ignoring test file errors from other IUs)');
        return code;
      }
      
      // Check if there are errors in OTHER non-test files (interface contract issues)
      const otherFileErrors = allErrors.split('\n').filter(line => 
        line.includes('error TS') && 
        !line.includes(fileName) && 
        !line.includes('__tests__/') && 
        !line.includes('.test.ts')
      );
      const errorsInOtherNonTestFiles = otherFileErrors.length > 0;
      
      if (errorsInOtherNonTestFiles) {
        iuLogger.debug({ 
          otherErrors: otherFileErrors.slice(0, 3),
          fileBeingGenerated: fileName 
        }, 'Detected errors in other non-test files');
      }
      
      // Categorize error types in OUR file
      const errorPatterns = categorizeErrors(relevantErrors);
      
      // DEBUG: Show what we're working with
      iuLogger.debug({
        fileName,
        relevantErrorCount: relevantErrorLines.length,
        otherFileErrorCount: otherFileErrors.length,
        errorTypes: [...errorPatterns].join(', '),
        hasSyntaxErrors: errorPatterns.has('syntax_error'),
        hasSpecErrors: ['undefined_type', 'missing_property', 'type_mismatch', 'implicit_any'].some(e => errorPatterns.has(e))
      }, 'Error analysis debug');
      
      if (ctx?.codeOnlyFix && ctx.llm) {
        // LEGACY MODE: Only attempt code-level fixes (no spec escalation)
        const fixed = await attemptCodeFix(code, relevantErrors, isUi, llm, systemPrompt, ctx.projectRoot, outputPath, iuLogger);
        if (fixed) {
          code = fixed;
        } else {
          // Code fix failed but don't escalate - just log and continue
          iuLogger.warn('Code-only fix failed, continuing with potentially broken code');
        }
      } else if (ctx?.llm && shouldEscalateToSpec(errorPatterns, errorsInOtherNonTestFiles)) {
        // DEFAULT: Try quick fix first, then escalate if appropriate
        const quickFixed = await tryQuickFix(code, relevantErrors, isUi, llm, systemPrompt, ctx.projectRoot, outputPath, iuLogger);
        
        if (!quickFixed) {
          // Determine escalation reason
          let escalationReason = 'Spec may be underspecified';
          if (errorPatterns.has('undefined_type')) escalationReason = 'Missing type definitions in spec';
          if (errorPatterns.has('missing_property')) escalationReason = 'Incomplete data model in spec';
          if (errorPatterns.has('import_error')) escalationReason = 'Import paths may need spec-level fixes';
          if (errorsInOtherNonTestFiles) escalationReason = 'Generated code breaks other modules - check interface contracts';
          
          iuLogger.warn({ 
            errors: relevantErrors.slice(0, 200),
            errorTypes: [...errorPatterns].join(', '),
            otherFileErrors: otherFileErrors.slice(0, 2),
            iu: iu.name 
          }, `Code fix failed, escalating: ${escalationReason}`);
          
          throw new SpecRepairRequiredError({
            iu,
            errors: relevantErrors,  // Only report OUR errors, not test files
            outputPath,
            originalCode: code,
            hint: escalationReason
          });
        }
        code = quickFixed;
      } else if (ctx?.llm) {
        // Syntax errors or non-spec issues - just try code fix without escalation
        const fixed = await attemptCodeFix(code, relevantErrors, isUi, llm, systemPrompt, ctx.projectRoot, outputPath, iuLogger);
        if (fixed) {
          code = fixed;
        } else {
          // Even for non-spec errors, if code fix fails, we should stop
          iuLogger.error({
            errors: relevantErrors.slice(0, 300),
            hint: 'Code generation produced invalid TypeScript'
          }, 'Code generation failed - syntax errors could not be fixed');
          throw new Error(`Code generation failed for ${iu.name}: Syntax errors in generated code`);
        }
      }
    }
  }

  return code;
}

/**
 * Categorize TypeScript errors by type.
 */
function categorizeErrors(errors: string): Set<string> {
  const patterns = new Set<string>();
  
  if (errors.includes('TS2304') || errors.includes("Cannot find name")) {
    patterns.add('undefined_type');  // Missing type/variable
  }
  if (errors.includes('TS2339') || errors.includes("Property") && errors.includes("does not exist")) {
    patterns.add('missing_property');  // Missing property
  }
  if (errors.includes('TS1005') || errors.includes('TS1003') || errors.includes('TS1002') || errors.includes('TS1434') || errors.includes("expected") || errors.includes("Unexpected")) {
    patterns.add('syntax_error');  // Basic syntax errors
  }
  if (errors.includes('TS2307') || errors.includes("Cannot find module")) {
    patterns.add('import_error');  // Import path issues
  }
  if (errors.includes('TS2345') || errors.includes("not assignable")) {
    patterns.add('type_mismatch');  // Type incompatibility
  }
  if (errors.includes('TS7006') || errors.includes("implicitly has an")) {
    patterns.add('implicit_any');  // Missing type annotations
  }
  
  return patterns;
}

/**
 * Determine if errors should escalate to spec-level repair.
 * Syntax errors are code-generation issues, NOT spec issues.
 */
function shouldEscalateToSpec(errorPatterns: Set<string>, errorsInOtherFiles: boolean): boolean {
  // NEVER escalate pure syntax errors - these are code generation bugs
  if (errorPatterns.has('syntax_error') && errorPatterns.size === 1) {
    return false;
  }
  
  // Escalate if errors suggest spec underspecification
  const specLevelErrors = ['undefined_type', 'missing_property', 'type_mismatch', 'implicit_any'];
  const hasSpecLevelErrors = specLevelErrors.some(e => errorPatterns.has(e));
  
  // Also escalate if generated code breaks other modules (interface contract issues)
  if (errorsInOtherFiles) return true;
  
  // Escalate if we have spec-level errors (but not pure syntax errors)
  return hasSpecLevelErrors;
}

/**
 * Attempt code-level fix (legacy behavior, no escalation).
 */
async function attemptCodeFix(
  code: string,
  errors: string,
  isUi: boolean,
  llm: LLMProvider,
  systemPrompt: string,
  projectRoot: string,
  outputPath: string,
  iuLogger: ReturnType<typeof createLogger>
): Promise<string | undefined> {
  iuLogger.warn({ errors: errors.slice(0, 200) }, `Typecheck: attempting code-only fix`);
  
  const correctionPrompt = buildFixPrompt(code, errors, isUi);
  const correctionRaw = await llm.generate(
    correctionPrompt,
    { system: systemPrompt, temperature: 0.1, maxTokens: 8192 },
    () => {}
  );
  const fixedCode = cleanAndRepairCode(correctionRaw);
  
  const remainingErrors = typecheckFile(projectRoot, outputPath, fixedCode);
  if (!remainingErrors) {
    iuLogger.info('Typecheck: code fix succeeded');
    return fixedCode;
  } else {
    iuLogger.error({ 
      remainingErrors: remainingErrors.slice(0, 300),
      hint: 'Code-only fix failed - errors remain'
    }, 'Typecheck: still has errors after code fix');
    return undefined;
  }
}

/**
 * Clean, repair, and fix common LLM generation issues.
 * 
 * Includes:
 * - Markdown/XML extraction
 * - Section marker cleanup
 * - SQL double-quote repair (datetime("now") → datetime('now'))
 * - Router declaration fix
 */
/**
 * Clean, repair, and fix common LLM generation issues.
 * 
 * Includes:
 * - Markdown/XML extraction (handles incomplete fences)
 * - Section marker cleanup
 * - SQL double-quote repair (datetime("now") → datetime('now'))
 * - Router declaration fix
 */
function cleanAndRepairCode(raw: string): string {
  let code = raw.trim();

  // If wrapped in ```typescript or ```ts, extract it (handles missing closing fence)
  if (code.startsWith('```typescript') || code.startsWith('```ts')) {
    code = code.replace(/^```(?:typescript|ts)?\s*\n?/, '');
    // Remove closing fence if present
    code = code.replace(/\n?```\s*$/, '');
    code = code.trim();
  } else {
    // Try full regex match for fenced code
    const mdMatch = code.match(/```(?:typescript|ts)?\s*\n?([\s\S]*?)\n?```/);
    if (mdMatch) code = mdMatch[1].trim();
  }

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
  code = code.replace(/\(\s*\d+\s*\) PRIMARY KEY[^\n]*\n/g, '');
  code = code.replace(/CREATE TABLE[^;]*;\n?/gi, '');
  code = code.replace(/FOREIGN KEY[^\n]*\n/gi, '');
  
  // Remove stray backticks at start/end that might be left over
  code = code.replace(/^`+/, '').replace(/`+$/, '');
  
  // SQL DOUBLE-QUOTE REPAIR: " → ' inside SQL template literals
  code = repairSQLQuotes(code);
  
  // Fix missing router declaration if router is used
  if (code.includes('router.') && !code.includes('const router') && !code.includes('new Hono')) {
    // Add router declaration after imports
    const importEnd = code.lastIndexOf('import');
    const importEndLine = code.indexOf('\n', importEnd);
    if (importEndLine > 0) {
      code = code.slice(0, importEndLine + 1) + '\nconst router = new Hono();\n' + code.slice(importEndLine + 1);
    }
  }
  
  // DETECT NESTED TEMPLATE LITERALS: Count backticks to detect unterminated literals
  // This is a smoke test - if odd number of backticks, there's likely a problem
  const backtickCount = (code.match(/`/g) || []).length;
  if (backtickCount % 2 !== 0) {
    // Odd number of backticks - likely an unterminated template literal
    // Try to fix by closing the last template literal if it looks unterminated
    const lastBacktick = code.lastIndexOf('`');
    const afterLastBacktick = code.slice(lastBacktick + 1);
    // If there's significant content after last backtick without a closing pattern, close it
    if (afterLastBacktick.length > 10 && !afterLastBacktick.includes('export')) {
      code = code + '\n`;\n';
    }
  }
  
  return code.trim();
}
function repairSQLQuotes(code: string): string {
  // Find SQL template literals (backtick strings that contain SQL)
  // and replace double-quoted string literals with single quotes
  
  // Pattern: inside backtick sections, replace "word" with 'word' for SQL contexts
  // This handles: datetime("now"), date("now"), strftime("%Y", ...), etc.
  
  const sqlPatterns = [
    // datetime("now") → datetime('now')
    { from: /datetime\s*\(\s*"([^"]*)"\s*\)/gi, to: "datetime('$1')" },
    // date("now") → date('now')
    { from: /date\s*\(\s*"([^"]*)"\s*\)/gi, to: "date('$1')" },
    // time("now") → time('now')
    { from: /time\s*\(\s*"([^"]*)"\s*\)/gi, to: "time('$1')" },
    // strftime("format", ...) → strftime('format', ...)
    { from: /strftime\s*\(\s*"([^"]*)"/gi, to: "strftime('$1'" },
    // WHEN "value" THEN → WHEN 'value' THEN (CASE expressions)
    { from: /WHEN\s+"([^"]*)"\s+THEN/gi, to: "WHEN '$1' THEN" },
    // Generic: "string" inside SQL contexts (after =, IN, etc.)
    // Careful: don't break JSON or other valid double-quoted strings
    { from: /(\s*=\s*)"([^"]*)"(\s*(?:THEN|ELSE|AND|OR|\)|,|;|$))/gi, to: "$1'$2'$3" },
  ];
  
  for (const pattern of sqlPatterns) {
    code = code.replace(pattern.from, pattern.to);
  }
  
  return code;
}

/**
 * Try a quick code-level fix. Returns fixed code or null if fix failed.
 */
async function tryQuickFix(
  code: string,
  errors: string,
  isUi: boolean,
  llm: LLMProvider,
  systemPrompt: string,
  projectRoot: string,
  outputPath: string,
  iuLogger: ReturnType<typeof createLogger>
): Promise<string | null> {
  const correctionPrompt = buildFixPrompt(code, errors, isUi);
  
  const correctionRaw = await llm.generate(
    correctionPrompt,
    { system: systemPrompt, temperature: 0.1, maxTokens: 8192 },
    () => {}
  );
  
  const fixedCode = cleanAndRepairCode(correctionRaw);
  const remainingErrors = typecheckFile(projectRoot, outputPath, fixedCode);
  
  if (!remainingErrors) {
    iuLogger.info('Quick code fix succeeded');
    return fixedCode;
  }
  
  return null; // Fix failed, escalate needed
}

/**
 * Error thrown when spec-level repair is required.
 * Contains context for the agent to fix the PRD.
 */
export class SpecRepairRequiredError extends Error {
  readonly iu: ImplementationUnit;
  readonly errors: string;
  readonly outputPath: string;
  readonly originalCode: string;
  readonly hint: string;

  constructor(context: {
    iu: ImplementationUnit;
    errors: string;
    outputPath: string;
    originalCode: string;
    hint: string;
  }) {
    super(`Spec repair required for ${context.iu.name}: ${context.hint}`);
    this.name = 'SpecRepairRequiredError';
    this.iu = context.iu;
    this.errors = context.errors;
    this.outputPath = context.outputPath;
    this.originalCode = context.originalCode;
    this.hint = context.hint;
  }
}

/**
 * Simple stub when no LLM available.
 */
function generateStub(iu: ImplementationUnit): string {
  return `// ${iu.name} - Generated by Phoenix
// ${iu.contract.description}

import { Hono } from 'hono';

const router = new Hono();

// TODO: Implement ${iu.name} routes

export default router;

export const _phoenix = {
  iu_id: '${iu.iu_id}',
  name: '${iu.name}',
  risk_tier: '${iu.risk_tier}',
  canon_ids: [${iu.source_canon_ids.map(id => `'${id}'`).join(', ')} as const],
} as const;`;
}

/**
 * Generate multiple IUs sequentially.
 */
export async function generateAll(ius: ImplementationUnit[], ctx?: RegenContext): Promise<RegenResult[]> {
  return timing.wrap('generateAll', async () => {
    const results: RegenResult[] = [];
    const startTime = Date.now();
    const iuTimes: number[] = []; // Track time per IU for ETA calculation
    
    for (let i = 0; i < ius.length; i++) {
      const iu = ius[i];
      const iuStartTime = Date.now();
      
      // Calculate progress stats
      const completed = i;
      const remaining = ius.length - i;
      const elapsed = iuStartTime - startTime;
      
      // ETA calculation: average time per completed IU * remaining
      let etaStr = 'calculating...';
      if (iuTimes.length > 0) {
        const avgTimePerIU = iuTimes.reduce((a, b) => a + b, 0) / iuTimes.length;
        const etaMs = avgTimePerIU * remaining;
        etaStr = formatETA(etaMs);
      }
      
      log.info(`[${i + 1}/${ius.length}] ${iu.name} (${iu.risk_tier} risk) | ${completed} done, ${remaining} left | ETA: ${etaStr}`);
      
      try {
        const result = await generateIU(iu, ctx);
        results.push(result);
      } catch (err) {
        if (err instanceof SpecRepairRequiredError) {
          // Re-throw with position info for caller to handle repair workflow
          (err as any).position = { current: i + 1, total: ius.length, completed: results.length };
          throw err;
        }
        throw err;
      }
      
      // Record time for this IU
      const iuElapsed = Date.now() - iuStartTime;
      iuTimes.push(iuElapsed);
    }
    
    // Show final summary
    const totalElapsed = Date.now() - startTime;
    log.info({
      totalIUs: ius.length,
      totalTime: formatDuration(totalElapsed),
      avgTimePerIU: formatDuration(Math.round(totalElapsed / ius.length))
    }, `Complete: ${ius.length} IUs in ${formatDuration(totalElapsed)}`);
    
    // Show timing report after all IUs
    if (timing.shouldShow()) {
      log.reportTimings();
    }
    
    return results;
  }, { iu_count: ius.length }, 'info');
}

// ─────────────────────────────────────────────────────────────────────────────
// Smoke Tests & Auto-Fixes (Restored from Chad's implementation)
// ─────────────────────────────────────────────────────────────────────────────

const MINIMAL_TSCONFIG = `{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noEmit": true,
    "skipLibCheck": true,
    "allowJs": true,
    "checkJs": false
  },
  "include": ["src/**/*"]
}`;

/**
 * Typecheck a file by writing it to disk and running tsc.
 * Returns null if clean, or error string if there are issues.
 */
function typecheckFile(projectRoot: string, filePath: string, content: string): string | null {
  const fullPath = join(projectRoot, filePath);
  mkdirSync(dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content, 'utf8');

  // Typecheck ONLY this specific file, not the whole project
  // This avoids stale errors from other generated files
  const tsconfigPath = join(projectRoot, 'tsconfig.json');
  const hadTsconfig = existsSync(tsconfigPath);
  if (!hadTsconfig) {
    writeFileSync(tsconfigPath, MINIMAL_TSCONFIG, 'utf8');
  }

  try {
    // Use --skipLibCheck to avoid type errors in node_modules
    // Only check the single file we just wrote
    execSync(`npx tsc --noEmit --skipLibCheck "${fullPath}" 2>&1`, {
      cwd: projectRoot,
      timeout: 30000,
      stdio: 'pipe',
    });
    return null; // clean
  } catch (err: unknown) {
    const execErr = err as { stdout?: Buffer; stderr?: Buffer };
    const output = execErr.stdout?.toString() || execErr.stderr?.toString() || '';
    
    // STRICT: Only return errors that are IN THIS FILE
    // Ignore all errors from other files (stale generated code, test files, etc.)
    const fileName = filePath.split('/').pop() || filePath;
    const fileErrors = output
      .split('\n')
      .filter(line => {
        // Must contain the filename AND an error code
        if (!line.includes(fileName)) return false;
        if (!line.includes('error TS')) return false;
        return true;
      })
      .join('\n');
    
    return fileErrors || null; // Return null if no errors in this file
  }
}

/**
 * Build a fix prompt that feeds type errors back to the LLM.
 * Uses structured prompting for better error correction.
 */
function buildFixPrompt(code: string, errors: string, isUi?: boolean): string {
  const typeContext = isUi 
    ? "This is a TypeScript UI module that renders HTML." 
    : "This is a TypeScript Hono API route module.";
  
  return `<fix_task>
Fix these TypeScript compilation errors.

<context>
${typeContext}
</context>

<current_code>
${code.slice(0, 2500)}${code.length > 2500 ? '\n... (truncated - fix ALL errors in the complete file)' : ''}
</current_code>

<errors>
${errors.slice(0, 1500)}${errors.length > 1500 ? '\n... (truncated)' : ''}
</errors>

<fix_rules>
1. Fix ALL errors shown above, not just the first
2. Keep all existing exports and the _phoenix metadata export
3. Do not change public function signatures
4. Do not add new dependencies
5. Ensure the code compiles under strict mode
</fix_rules>

<error_patterns>
- TS2304: Cannot find name 'X' → Add import for X or define the variable
- TS2345: Argument not assignable → Fix type annotation or add type guard  
- TS2322: Type not assignable → Check return type or variable assignment
- TS7006: Parameter implicitly has 'any' → Add explicit parameter type
- TS2532: Object is possibly 'undefined' → Add null check or non-null assertion
- Missing 'await' → Add await to async function call
</error_patterns>

Output the COMPLETE fixed file wrapped in triple backticks:
\`\`\`typescript
// Fixed code here - include ALL code, not just changed parts
\`\`\`
</fix_task>`;
}
