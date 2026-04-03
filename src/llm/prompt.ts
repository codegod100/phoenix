/**
 * Kimi-Optimized Prompt Builder — fast, structured prompts for code generation.
 *
 * Optimizations:
 * - XML-style tags for clear structure (Kimi parses these efficiently)
 * - Few-shot examples embedded in prompts
 * - Concise system prompt (removes redundant negations)
 * - Schema-first type definitions
 * - Direct output format specification
 */

import type { ImplementationUnit } from '../models/iu.js';
import type { CanonicalNode } from '../models/canonical.js';
import type { ResolvedTarget } from '../models/architecture.js';

// ═════════════════════════════════════════════════════════════════════════════
// KIMI-OPTIMIZED SYSTEM PROMPTS
// ═════════════════════════════════════════════════════════════════════════════

/** Minimal base system prompt - Kimi works best with direct positive instructions */
export const KIMI_SYSTEM_PROMPT = `Generate TypeScript modules from specifications.

<core_rules>
- Output valid TypeScript ES module code only
- Use strict TypeScript (strict: true, no implicit any)
- Export all public functions and types
- Implement complete logic, never stubs
- Include _phoenix metadata export exactly as specified
</core_rules>

<dependencies>
- ZERO external dependencies unless explicitly listed
- Use Node.js built-ins: node:crypto, node:events, node:http
- No 'ws', no DOM APIs (use string HTML templates instead)
</dependencies>`;

/** Architecture-aware system prompt */
export function getKimiSystemPrompt(target?: ResolvedTarget | null): string {
  if (!target) return KIMI_SYSTEM_PROMPT;

  const rt = target.runtime;
  const allowedPkgs = Object.keys(rt.packages).join(', ');

  return `Generate ${rt.language} modules from specifications.

<core_rules>
- Output valid ${rt.language} code only, no markdown fences
- Implement complete logic, never stubs
- Include _phoenix metadata export exactly as specified
</core_rules>

<dependencies>
- REQUIRED imports: ${allowedPkgs}
- Do NOT use any other packages
</dependencies>

${target.architecture.systemPrompt}
${rt.promptExtension}`;
}

// ═════════════════════════════════════════════════════════════════════════════
// FEW-SHOT EXAMPLES (Embedded in prompts for pattern matching)
// ═════════════════════════════════════════════════════════════════════════════

const API_EXAMPLE = `<example>
<input>
Module: "Item Service"
Requirements:
- GET /items returns all items
- POST /items creates new item
- Items have id, name, created_at
</input>

<output>
import { Hono } from 'hono';
import { db } from '../../db.js';
import { z } from 'zod';

const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  created_at: z.string()
});

type Item = z.infer<typeof ItemSchema>;

const router = new Hono();

router.get('/', (c) => {
  const items = db.query('SELECT * FROM items').all();
  return c.json(items);
});

router.post('/', async (c) => {
  const body = await c.req.json();
  const result = db.query('INSERT INTO items (name) VALUES (?)').run(body.name);
  return c.json({ id: result.lastInsertRowid }, 201);
});

export default router;

export const _phoenix = {
  iu_id: 'item-svc-001',
  name: 'Item Service',
  risk_tier: 'medium',
  canon_ids: [3]
} as const;
</output>
</example>`;

const UI_EXAMPLE = `<example>
<input>
Module: "Item Dashboard"
Requirements:
- Display items in a table
- Fetch from /items endpoint
- Show loading state
</input>

<output>
export interface Item {
  id: number;
  name: string;
  created_at: string;
}

export interface DashboardState {
  items: Item[];
  loading: boolean;
  error: string | null;
}

export class ItemDashboard {
  private state: DashboardState;

  constructor() {
    this.state = { items: [], loading: false, error: null };
  }

  async loadItems(): Promise<void> {
    this.state.loading = true;
    try {
      const res = await fetch('/items');
      this.state.items = await res.json();
    } catch (e) {
      this.state.error = String(e);
    } finally {
      this.state.loading = false;
    }
  }

  generateHTML(): string {
    const rows = this.state.items.map(i =>
      \`<tr><td>\${i.id}</td><td>\${i.name}</td></tr>\`
    ).join('');
    return \`<!DOCTYPE html>
<html><body>
  <table>\${rows}</table>
</body></html>\`;
  }
}

export const _phoenix = {
  iu_id: 'item-dash-001',
  name: 'Item Dashboard',
  risk_tier: 'medium',
  canon_ids: [2]
} as const;
</output>
</example>`;

// ═════════════════════════════════════════════════════════════════════════════
// MAIN PROMPT BUILDER
// ═════════════════════════════════════════════════════════════════════════════

/**
 * Build optimized prompt for IU generation.
 * Uses XML tags for structure - Kimi parses these efficiently.
 */
export function buildPrompt(
  iu: ImplementationUnit,
  canonNodes: CanonicalNode[],
  siblingModules?: string[],
  target?: ResolvedTarget | null,
): string {
  const parts: string[] = [];

  // Module identifier
  parts.push(`<module name="${iu.name}" risk="${iu.risk_tier}">`);

  // Architecture imports (if applicable)
  if (target) {
    parts.push(`<imports required>`);
    parts.push(`import { Hono } from 'hono';`);
    parts.push(`import { db } from '../../db.js';`);
    parts.push(`import { z } from 'zod';`);
    parts.push(`</imports>`);
  }

  // Contract
  parts.push(`<contract>`);
  parts.push(`<description>${iu.contract.description}</description>`);
  if (iu.contract.inputs.length) {
    parts.push(`<inputs>${iu.contract.inputs.join(', ')}</inputs>`);
  }
  if (iu.contract.outputs.length) {
    parts.push(`<outputs>${iu.contract.outputs.join(', ')}</outputs>`);
  }
  if (iu.contract.invariants.length) {
    parts.push(`<invariants>${iu.contract.invariants.join(', ')}</invariants>`);
  }
  parts.push(`</contract>`);

  // Canonical nodes (categorized)
  const iuNodes = canonNodes.filter(n => iu.source_canon_ids.includes(n.canon_id));

  const byType = {
    REQUIREMENT: iuNodes.filter(n => n.type === 'REQUIREMENT'),
    CONSTRAINT: iuNodes.filter(n => n.type === 'CONSTRAINT'),
    INVARIANT: iuNodes.filter(n => n.type === 'INVARIANT'),
    DEFINITION: iuNodes.filter(n => n.type === 'DEFINITION'),
  };

  if (byType.REQUIREMENT.length) {
    parts.push(`<requirements>`);
    byType.REQUIREMENT.forEach(r => parts.push(`- ${r.statement}`));
    parts.push(`</requirements>`);
  }

  if (byType.CONSTRAINT.length) {
    parts.push(`<constraints>`);
    byType.CONSTRAINT.forEach(c => parts.push(`- ${c.statement}`));
    parts.push(`</constraints>`);
  }

  if (byType.INVARIANT.length) {
    parts.push(`<invariants>`);
    byType.INVARIANT.forEach(i => parts.push(`- ${i.statement}`));
    parts.push(`</invariants>`);
  }

  if (byType.DEFINITION.length) {
    parts.push(`<definitions>`);
    byType.DEFINITION.forEach(d => parts.push(`- ${d.statement}`));
    parts.push(`</definitions>`);
  }

  // Context from other nodes (architecture mode)
  if (target) {
    const ctxNodes = canonNodes.filter(n =>
      !iu.source_canon_ids.includes(n.canon_id) &&
      (n.type === 'DEFINITION' || n.type === 'CONTEXT')
    );
    if (ctxNodes.length) {
      parts.push(`<context>`);
      ctxNodes.forEach(n => parts.push(`[${n.type}] ${n.statement}`));
      parts.push(`</context>`);
    }
  }

  // Sibling modules
  if (siblingModules?.length) {
    parts.push(`<siblings>`);
    if (target) {
      // Architecture mode: HTTP endpoints
      for (const m of siblingModules) {
        const path = '/' + m.toLowerCase().replace(/\s+/g, '-');
        if (!m.match(/\b(web|ui|frontend|interface|page|dashboard)\b/i)) {
          parts.push(`- ${m} at ${path} (use fetch('${path}'))`);
        }
      }
    } else {
      siblingModules.forEach(m => parts.push(`- ${m}`));
    }
    parts.push(`</siblings>`);
  }

  // Metadata export (required)
  parts.push(`<metadata iu_id="${iu.iu_id}" name="${iu.name}" tier="${iu.risk_tier}" canon_count="${iu.source_canon_ids.length}"/>`);

  // Example (few-shot)
  parts.push(target ? API_EXAMPLE : UI_EXAMPLE);

  // Output instruction
  parts.push(`</module>`);
  parts.push('');
  parts.push('Generate the complete TypeScript module inside <output> tags:');

  return parts.join('\n');
}

// ═════════════════════════════════════════════════════════════════════════════
// OUTPUT TYPE-SPECIFIC PROMPTS
// ═════════════════════════════════════════════════════════════════════════════

/** API Client prompt - concise, structured */
export function buildClientPrompt(iu: ImplementationUnit, canonNodes: CanonicalNode[]): string {
  const resource = iu.name.replace(/\s+/g, '');
  const base = './' + iu.name.toLowerCase().replace(/\s+/g, '-');

  const reqs = canonNodes
    .filter(n => iu.source_canon_ids.includes(n.canon_id) && n.type === 'REQUIREMENT')
    .map(n => `- ${n.statement}`)
    .join('\n') || '- Implement CRUD operations';

  return `<client name="${resource}" base="${base}">
<requirements>
${reqs}
</requirements>

<methods>
1. list(): Promise<${resource}[]>
2. get(id: number): Promise<${resource}>
3. create(data: Create${resource}Data): Promise<${resource}>
4. update(id: number, data: Update${resource}Data): Promise<${resource}>
5. delete(id: number): Promise<void>
</methods>

<output_format>
export class ${resource}Client {
  constructor(private baseUrl: string) {}
  // implement methods with fetch(), JSDoc, error handling
}

export const _phoenix = {
  iu_id: '${iu.iu_id}',
  name: '${iu.name}',
  risk_tier: '${iu.risk_tier}',
  canon_ids: [${iu.source_canon_ids.length}]
} as const;
</output_format>

Generate complete client code inside <output> tags.
</client>`;
}

/** UI Component prompt - HTML-generating class */
export function buildTsUiPrompt(iu: ImplementationUnit, canonNodes: CanonicalNode[]): string {
  const className = iu.name.replace(/\s+/g, '');
  const apiPath = './' + iu.name.toLowerCase().replace(/\s+/g, '-');

  const reqs = canonNodes
    .filter(n => iu.source_canon_ids.includes(n.canon_id) && n.type === 'REQUIREMENT')
    .map(n => `- ${n.statement}`)
    .join('\n');

  const cons = canonNodes
    .filter(n => iu.source_canon_ids.includes(n.canon_id) &&
      (n.type === 'CONSTRAINT' || n.type === 'INVARIANT'))
    .map(n => `- ${n.statement}`)
    .join('\n');

  return `<ui_component name="${className}">
<description>${iu.contract.description}</description>
<requirements>
${reqs || '- Display data from API'}
</requirements>
${cons ? `<constraints>\n${cons}\n</constraints>` : ''}
<api_calls>fetch('${apiPath}')</api_calls>
<state_fields>
- data: unknown[]
- loading: boolean
- error: string | null
</state_fields>
<methods>
1. constructor() - init state
2. async loadData() - fetch from API
3. generateHTML(): string - return complete HTML document
4. updateState(partial): void - merge state changes
</methods>
<metadata iu_id="${iu.iu_id}" name="${iu.name}" tier="${iu.risk_tier}"/>

Generate complete TypeScript class inside <output> tags.
</ui_component>`;
}

/** Typecheck fix prompt - focused on error correction */
export function buildFixPrompt(code: string, errors: string): string {
  return `<fix_task>
<current_code>
${code.slice(0, 2000)}${code.length > 2000 ? '\n... (truncated)' : ''}
</current_code>

<errors>
${errors.slice(0, 1000)}${errors.length > 1000 ? '\n... (truncated)' : ''}
</errors>

<rules>
- Fix all TypeScript errors
- Keep all existing exports
- Maintain _phoenix metadata
- No new dependencies
</rules>

Output fixed code inside <output> tags.
</fix_task>`;
}

// ═════════════════════════════════════════════════════════════════════════════
// LEGACY COMPATIBILITY (for gradual migration)
// ═════════════════════════════════════════════════════════════════════════════

/** Legacy system prompt for non-Kimi models */
export const SYSTEM_PROMPT = `You are a senior TypeScript engineer generating production-quality module implementations for Phoenix VCS.

Rules:
- Output ONLY the TypeScript module code. No markdown fences, no explanation.
- The module must be a valid ES module (.ts) that compiles under strict mode.
- Export all public functions and types.
- Use descriptive types (not \`any\` or \`unknown\` where a real type is appropriate).
- Implement the actual logic described in the requirements — not stubs or TODOs.
- Keep the code clean, readable, and minimal. No over-engineering.
- Include the _phoenix metadata constant exactly as specified.
- Do NOT import from external packages. ZERO runtime dependencies.
- Use only Node.js built-in modules (node:crypto, node:events, node:http, etc.) when needed.
- For WebSocket-like features, use raw node:http or define the interface — do NOT import 'ws'.
- For DOM/browser code, do NOT use DOM APIs. Generate string HTML templates instead.
- For EventEmitter, use node:events and cast as needed. Prefer simple callbacks or Maps.
- The code must compile under TypeScript strict mode (strict: true, no implicit any).
- If the requirements describe a data structure, define and export the types.
- If the requirements describe validation rules, implement them with clear error messages.
- If the requirements describe state management, use a class or closure — your choice.`;

/** Legacy architecture-aware system prompt */
export function getSystemPrompt(target?: ResolvedTarget | null): string {
  if (!target) return SYSTEM_PROMPT;
  const arch = target.architecture;
  const rt = target.runtime;

  const allowedPkgs = Object.keys(rt.packages).map(p => `'${p}'`).join(', ');

  return `You are a senior ${rt.language} engineer generating production-quality module implementations.

Rules:
- Implement the actual logic described in the requirements — not stubs or TODOs.
- Keep the code clean, readable, and minimal. No over-engineering.
- You MUST import from these packages: ${allowedPkgs}. Use them as shown in the examples below.
- Do NOT import any other packages. Do NOT re-implement functionality that the allowed packages provide.

${arch.systemPrompt}
${rt.promptExtension}`;
}

/** Estimate prompt token count (rough heuristic) */
export function estimateTokens(text: string): number {
  // ~4 chars per token for code, ~3.5 for English
  const codeRatio = text.includes('import') || text.includes('function') ? 4 : 3.5;
  return Math.ceil(text.length / codeRatio);
}

/** Get optimized prompt based on model type */
export function getOptimizedPrompt(
  iu: ImplementationUnit,
  canonNodes: CanonicalNode[],
  siblings: string[] | undefined,
  target: ResolvedTarget | null,
  modelHint?: 'kimi' | 'claude' | 'gpt' | string
): { system: string; user: string; estimatedTokens: number } {
  // Detect Kimi from model hint or provider
  const isKimi = modelHint?.toLowerCase().includes('kimi') ||
    process.env.PHOENIX_LLM_PROVIDER?.toLowerCase().includes('kimi');

  const system = isKimi ? getKimiSystemPrompt(target) : getSystemPrompt(target);
  const user = buildPrompt(iu, canonNodes, siblings, target);

  return {
    system,
    user,
    estimatedTokens: estimateTokens(system + user)
  };
}
