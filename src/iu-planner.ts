/**
 * IU Planner — maps canonical nodes to Implementation Unit proposals.
 *
 * Groups related requirements into module-level IUs based on:
 * - Source document (service boundary)
 * - Source section within a document (module boundary)
 * - Detected output types (api, web-ui, cli, test)
 *
 * Naming produces natural developer-facing identifiers:
 *   spec/api-gateway.md, section "Rate Limiting"
 *   → name: "Rate Limiting"
 *   → files: src/generated/api-gateway/rate-limiting.ts (API)
 *            src/generated/api-gateway/rate-limiting.html (UI)
 */

import type { CanonicalNode } from './models/canonical.js';
import { CanonicalType } from './models/canonical.js';
import type { Clause } from './models/clause.js';
import type { ImplementationUnit, IUOutput, IUKind } from './models/iu.js';
import { defaultBoundaryPolicy, defaultEnforcement } from './models/iu.js';
import { sha256 } from './semhash.js';

/**
 * Detect the output types for an IU based on its name and canonical nodes.
 */
function detectOutputTypes(
  name: string,
  nodes: CanonicalNode[],
): IUOutput['type'][] {
  const outputs: IUOutput['type'][] = [];
  const nameLower = name.toLowerCase();
  const allStatements = nodes.map(n => n.statement).join(' ').toLowerCase();

  // Detect API intent (strong signals)
  const hasCrudOperations = /\b(create|add|new)\b.*\b(item|resource|record|data|entry)\b/.test(allStatements) ||
    /\b(update|edit|modify|change)\b.*\b(item|resource|record|data|entry)\b/.test(allStatements) ||
    /\b(delete|remove|destroy)\b.*\b(item|resource|record|data|entry)\b/.test(allStatements) ||
    /\b(get|fetch|retrieve|read|view|list|find)\b.*\b(item|resource|record|data|entry)\b/.test(allStatements);
  
  const hasApiExplicit =
    /\b(api|endpoint|rest|json|server|backend|route)\b/.test(nameLower) ||
    /\b(create|read|update|delete|crud)\b.*\b(endpoint|api|route|http)\b/.test(allStatements) ||
    /\b(expose|provide|implement|serve)\b.*\b(http|endpoint|api|rest)\b/.test(allStatements);
  
  const hasApiIntent = hasApiExplicit || hasCrudOperations;

  // Detect UI intent
  const hasUiIntent =
    /\b(ui|interface|dashboard|page|html|web|frontend|view|display|show|table|form|click)\b/.test(nameLower) ||
    /\b(display|show|render|view|table|form|click|button|page|screen)\b/.test(allStatements);

  // Detect CLI intent
  const hasCliIntent =
    /\b(cli|command|terminal|shell|script|tool)\b/.test(nameLower) ||
    /\b(command|argument|flag|option|stdin|stdout)\b/.test(allStatements);

  // Prioritize: if CRUD operations detected, it's primarily an API
  // UI is additive (dashboard view) unless explicitly UI-only
  if (hasApiIntent) {
    outputs.push('api');
  }
  
  // Add UI only if explicitly requested by name or has display keywords without CRUD
  if (hasUiIntent && (!hasApiIntent || /\b(dashboard|page|screen|interface|html)\b/.test(nameLower))) {
    outputs.push('web-ui');
  }
  
  // Force API for core entity names with CRUD operations (handle plurals)
  const isCoreEntity = /\b(item|items|user|users|product|products|order|orders|task|tasks|project|projects|category|categories|post|posts|comment|comments)s?\b/i.test(nameLower);
  const hasCrudVerbs = /\b(create|add|new|update|edit|modify|delete|remove|get|fetch|list|view)\b/i.test(allStatements);
  
  if (isCoreEntity && hasCrudVerbs && !outputs.includes('api')) {
    outputs.unshift('api'); // Add API first
  }
  if (hasCliIntent) {
    outputs.push('cli');
  }

  // Always generate tests for medium+ risk
  const riskTier = deriveRiskTier(nodes);
  if (riskTier !== 'low') {
    outputs.push('test');
  }

  return outputs;
}

/**
 * Build output files for an IU based on detected types.
 */
function buildOutputs(
  name: string,
  serviceName: string,
  fileName: string,
  outputTypes: IUOutput['type'][],
): IUOutput[] {
  const outputs: IUOutput[] = [];
  let hasPrimary = false;

  for (const type of outputTypes) {
    switch (type) {
      case 'api':
        outputs.push({
          type: 'api',
          file: `src/generated/${serviceName}/${fileName}.ts`,
          primary: !hasPrimary && (hasPrimary = true),
        });
        break;
      case 'web-ui':
        // Generate TypeScript UI component class (Chad's runtime HTML approach)
        outputs.push({
          type: 'web-ui',
          file: `src/generated/${serviceName}/${fileName}.ui.ts`,
          primary: false,
        });
        // Also generate a client TS file for API access
        outputs.push({
          type: 'client',
          file: `src/generated/${serviceName}/${fileName}.client.ts`,
          primary: false,
        });
        break;
      case 'cli':
        outputs.push({
          type: 'cli',
          file: `src/generated/${serviceName}/${fileName}.cli.ts`,
          primary: !hasPrimary && (hasPrimary = true),
        });
        break;
      case 'test':
        outputs.push({
          type: 'test',
          file: `src/generated/${serviceName}/__tests__/${fileName}.test.ts`,
          primary: false,
        });
        break;
    }
  }

  return outputs;
}

/**
 * Determine IU kind from output types.
 */
function deriveKind(outputTypes: IUOutput['type'][]): IUKind {
  if (outputTypes.includes('api')) return 'api';
  if (outputTypes.includes('web-ui')) return 'web-ui';
  if (outputTypes.includes('cli')) return 'cli';
  return 'module';
}

/**
 * Plan IUs from canonical nodes, grouping by source document + section.
 *
 * Each top-level section of each spec document becomes one IU.
 * Canon nodes are assigned to the IU of their source clause's section.
 * CONTEXT nodes are excluded from IU generation (they don't produce code).
 */
export function planIUs(
  canonNodes: CanonicalNode[],
  clauses: Clause[],
): ImplementationUnit[] {
  // Filter out CONTEXT nodes — they don't generate code
  canonNodes = canonNodes.filter(n => n.type !== CanonicalType.CONTEXT);
  if (canonNodes.length === 0) return [];

  // Index clauses by ID
  const clauseMap = new Map(clauses.map(c => [c.clause_id, c]));

  // Group canonical nodes by (doc, top-level section)
  const buckets = new Map<string, { nodes: CanonicalNode[]; docId: string; sectionName: string }>();

  for (const node of canonNodes) {
    const clause = node.source_clause_ids
      .map(id => clauseMap.get(id))
      .find(c => c !== undefined);

    if (!clause) continue;

    const docId = clause.source_doc_id;
    // Use the second level of section_path as the grouping key.
    // section_path[0] is typically the doc title, section_path[1] is the first real section.
    // If there's only one level, use that.
    const sectionName = clause.section_path.length > 1
      ? clause.section_path[1]
      : clause.section_path[0] || 'main';

    const key = `${docId}::${sectionName}`;
    let bucket = buckets.get(key);
    if (!bucket) {
      bucket = { nodes: [], docId, sectionName };
      buckets.set(key, bucket);
    }
    bucket.nodes.push(node);
  }

  // Merge small buckets (≤1 node) into their document's largest bucket
  const docBuckets = new Map<string, string[]>(); // docId → keys
  for (const [key, bucket] of buckets) {
    const list = docBuckets.get(bucket.docId) ?? [];
    list.push(key);
    docBuckets.set(bucket.docId, list);
  }

  for (const [docId, keys] of docBuckets) {
    const small = keys.filter(k => buckets.get(k)!.nodes.length <= 1);
    const large = keys.filter(k => buckets.get(k)!.nodes.length > 1);

    if (small.length > 0 && large.length > 0) {
      // Find the largest bucket in this doc
      const targetKey = large.sort((a, b) =>
        buckets.get(b)!.nodes.length - buckets.get(a)!.nodes.length
      )[0];
      const target = buckets.get(targetKey)!;
      for (const smallKey of small) {
        target.nodes.push(...buckets.get(smallKey)!.nodes);
        buckets.delete(smallKey);
      }
    }
  }

  // Convert buckets to IUs
  const ius: ImplementationUnit[] = [];

  for (const [, bucket] of buckets) {
    const { nodes, docId, sectionName } = bucket;
    if (nodes.length === 0) continue;

    const name = cleanName(sectionName);
    const serviceName = deriveServiceName(docId);
    const fileName = slugify(name);
    const riskTier = deriveRiskTier(nodes);
    const canonIds = nodes.map(n => n.canon_id);

    // Detect output types
    const outputTypes = detectOutputTypes(name, nodes);
    const outputs = buildOutputs(name, serviceName, fileName, outputTypes);
    const kind = deriveKind(outputTypes);

    // Build a readable description from the requirements (not a wall of text)
    const requirements = nodes.filter(n => n.type === 'REQUIREMENT').slice(0, 5);
    const constraints = nodes.filter(n => n.type === 'CONSTRAINT' || n.type === 'INVARIANT');
    const description = requirements.map(n => n.statement).join('. ');

    const iuId = sha256(['iu', serviceName, name, ...canonIds.sort()].join('\x00'));

    // Derive typed inputs/outputs from node statements
    const { inputs, outputs: contractOutputs } = deriveContract(nodes, name);

    // Build legacy output_files for backward compatibility
    const outputFiles = outputs.map(o => o.file);

    ius.push({
      iu_id: iuId,
      kind,
      name,
      risk_tier: riskTier,
      contract: {
        description,
        inputs,
        outputs: contractOutputs,
        invariants: constraints.map(n => n.statement),
      },
      source_canon_ids: canonIds,
      dependencies: [],
      boundary_policy: defaultBoundaryPolicy(),
      enforcement: defaultEnforcement(),
      evidence_policy: {
        required: evidenceForTier(riskTier),
      },
      output_files: outputFiles,
      outputs,
    });
  }

  // Sort for deterministic output
  ius.sort((a, b) => (a.output_files[0] || '').localeCompare(b.output_files[0] || ''));

  return ius;
}

/**
 * Derive a service name from a document ID.
 * "spec/api-gateway.md" → "api-gateway"
 * "spec/deep/user-service.md" → "user-service"
 * "test.md" → "test"
 */
function deriveServiceName(docId: string): string {
  const base = docId.split('/').pop() || docId;
  return slugify(base.replace(/\.md$/i, ''));
}

/**
 * Clean up a section name to be a natural IU name.
 * "Security Constraints" → "Security Constraints"
 * "3.2 Authentication" → "Authentication"
 */
function cleanName(raw: string): string {
  return raw
    .replace(/^\d+(\.\d+)*\s*/, '')   // strip leading numbers
    .replace(/\s+/g, ' ')
    .trim() || 'Main';
}

/**
 * Derive typed contract inputs/outputs from canonical nodes.
 */
function deriveContract(
  nodes: CanonicalNode[],
  sectionName: string,
): { inputs: string[]; outputs: string[] } {
  const inputs: string[] = [];
  const outputs: string[] = [];

  // Look for common patterns in statements
  const allStatements = nodes.map(n => n.statement).join(' ');

  if (/\brequest\b/i.test(allStatements)) inputs.push('request');
  if (/\buser\b/i.test(allStatements) && /\b(?:create|account|authenticate)\b/i.test(allStatements)) inputs.push('user');
  if (/\btoken\b/i.test(allStatements)) inputs.push('token');
  if (/\btemplate\b/i.test(allStatements)) inputs.push('template');
  if (/\bnotification|message\b/i.test(allStatements)) inputs.push('notification');
  if (/\bconfig\b/i.test(allStatements)) inputs.push('config');

  if (/\bresponse\b/i.test(allStatements)) outputs.push('response');
  if (/\bresult\b/i.test(allStatements)) outputs.push('result');
  if (/\bevent\b/i.test(allStatements)) outputs.push('event');

  return { inputs, outputs };
}

function deriveRiskTier(nodes: CanonicalNode[]): 'low' | 'medium' | 'high' | 'critical' {
  const hasConstraint = nodes.some(n => n.type === 'CONSTRAINT');
  const hasInvariant = nodes.some(n => n.type === 'INVARIANT');
  const size = nodes.length;

  if (hasInvariant) return 'high';
  if (hasConstraint && size > 2) return 'high';
  if (hasConstraint) return 'medium';
  if (size > 3) return 'medium';
  return 'low';
}

function evidenceForTier(tier: string): string[] {
  switch (tier) {
    case 'low': return ['typecheck', 'lint', 'boundary_validation'];
    case 'medium': return ['typecheck', 'lint', 'boundary_validation', 'unit_tests'];
    case 'high': return ['typecheck', 'lint', 'boundary_validation', 'unit_tests', 'property_tests', 'static_analysis'];
    case 'critical': return ['typecheck', 'lint', 'boundary_validation', 'unit_tests', 'property_tests', 'static_analysis', 'human_signoff'];
    default: return ['typecheck'];
  }
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
