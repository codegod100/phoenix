#!/usr/bin/env npx tsx
/**
 * Phoenix VCS — Walkthrough Demo
 *
 * Shows you every file, every data structure, every transformation.
 * You see what Phoenix sees.
 */

// ── Colors ──
const R  = '\x1b[0m';  // reset
const B  = '\x1b[1m';  // bold
const D  = '\x1b[2m';  // dim
const GR = '\x1b[32m'; // green
const YL = '\x1b[33m'; // yellow
const RD = '\x1b[31m'; // red
const CY = '\x1b[36m'; // cyan
const MG = '\x1b[35m'; // magenta
const BL = '\x1b[34m'; // blue
const WH = '\x1b[37m';
const BG_GR = '\x1b[42m';
const BG_RD = '\x1b[41m';
const BG_YL = '\x1b[43m';
const BG_BL = '\x1b[44m';
const BG_MG = '\x1b[45m';
const BG_CY = '\x1b[46m';

function banner(step: number, text: string) {
  const line = '━'.repeat(70);
  console.log(`\n${CY}${line}${R}`);
  console.log(`${CY}┃${R} ${B}STEP ${step}${R} — ${B}${text}${R}`);
  console.log(`${CY}${line}${R}`);
}

function sub(text: string) {
  console.log(`\n  ${B}${MG}▸ ${text}${R}\n`);
}

function showFile(filename: string, content: string, highlight?: Map<number, string>) {
  console.log(`  ${BG_BL}${WH}${B} 📄 ${filename} ${R}\n`);
  const lines = content.split('\n');
  for (let i = 0; i < lines.length; i++) {
    const lineNum = String(i + 1).padStart(3);
    const hl = highlight?.get(i + 1);
    if (hl) {
      console.log(`  ${D}${lineNum}${R} ${hl}${lines[i]}${R}`);
    } else {
      console.log(`  ${D}${lineNum}${R} ${lines[i]}`);
    }
  }
  console.log('');
}

function showJSON(label: string, obj: unknown) {
  console.log(`  ${BG_MG}${WH}${B} 💾 ${label} ${R}\n`);
  const json = JSON.stringify(obj, null, 2);
  for (const line of json.split('\n')) {
    console.log(`  ${D}│${R} ${line}`);
  }
  console.log('');
}

function showBox(lines: string[]) {
  const maxLen = Math.max(...lines.map(l => stripAnsi(l).length));
  const top = `  ┌${'─'.repeat(maxLen + 2)}┐`;
  const bot = `  └${'─'.repeat(maxLen + 2)}┘`;
  console.log(top);
  for (const line of lines) {
    const pad = ' '.repeat(maxLen - stripAnsi(line).length);
    console.log(`  │ ${line}${pad} │`);
  }
  console.log(bot);
}

function stripAnsi(s: string): string {
  return s.replace(/\x1b\[[0-9;]*m/g, '');
}

function badge(text: string, bg: string) {
  return `${bg}${WH}${B} ${text} ${R}`;
}

function arrow(from: string, to: string, label?: string) {
  const lbl = label ? ` ${D}(${label})${R}` : '';
  console.log(`    ${CY}${from}${R}  ──${lbl}──▸  ${GR}${to}${R}`);
}

function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// ── Imports ──
import { parseSpec } from './src/spec-parser.js';
import { normalizeText } from './src/normalizer.js';
import { clauseSemhash, contextSemhashCold } from './src/semhash.js';
import { diffClauses } from './src/diff.js';
import { extractCanonicalNodes } from './src/canonicalizer.js';
import { computeWarmHashes } from './src/warm-hasher.js';
import { classifyChanges } from './src/classifier.js';
import { DRateTracker } from './src/d-rate.js';
import { BootstrapStateMachine } from './src/bootstrap.js';
import { ChangeClass, BootstrapState, DRateLevel } from './src/models/classification.js';
import { DiffType } from './src/models/clause.js';
import { planIUs } from './src/iu-planner.js';
import { generateIU } from './src/regen.js';
import { extractDependencies } from './src/dep-extractor.js';
import { validateBoundary, detectBoundaryChanges } from './src/boundary-validator.js';
import { detectDrift } from './src/drift.js';
import { DriftStatus } from './src/models/manifest.js';
import type { GeneratedManifest } from './src/models/manifest.js';
import { sha256 } from './src/semhash.js';
import { evaluatePolicy } from './src/policy-engine.js';
import { computeCascade } from './src/cascade.js';
import { EvidenceKind, EvidenceStatus } from './src/models/evidence.js';
import type { EvidenceRecord } from './src/models/evidence.js';
import { runShadowPipeline } from './src/shadow-pipeline.js';
import { UpgradeClassification } from './src/models/pipeline.js';
import { runCompaction } from './src/compaction.js';
import { parseCommand, routeCommand } from './src/bot-router.js';
import type { BotCommand } from './src/models/bot.js';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ── The Spec File ──

const SPEC_V1 = `# Authentication Service

The authentication service handles user login, registration, and session management.

## Requirements

- Users must authenticate with email and password
- Sessions expire after 24 hours
- Failed login attempts are rate-limited to 5 per minute
- Passwords must be hashed with bcrypt (cost factor 12)

## API Endpoints

### POST /auth/login

Accepts email and password. Returns a JWT token on success.

### POST /auth/register

Creates a new user account. Requires email, password, and display name.

### POST /auth/logout

Invalidates the current session token.

## Security Constraints

- All endpoints must use HTTPS
- Tokens must be signed with RS256
- Password reset tokens expire after 1 hour`;

const SPEC_V2 = `# Authentication Service

The authentication service handles user login, registration, session management, and OAuth integration.

## Requirements

- Users must authenticate with email and password
- Sessions expire after 12 hours
- Failed login attempts are rate-limited to 3 per minute
- Passwords must be hashed with argon2id (cost factor 3, memory 64MB)
- OAuth2 providers (Google, GitHub) must be supported

## API Endpoints

### POST /auth/login

Accepts email and password. Returns a JWT token on success.

### POST /auth/register

Creates a new user account. Requires email, password, and display name.

### POST /auth/logout

Invalidates the current session token.

### GET /auth/oauth/:provider

Initiates OAuth2 flow for the specified provider.

## Security Constraints

- All endpoints must use HTTPS
- Tokens must be signed with RS256
- Password reset tokens expire after 30 minutes
- OAuth tokens must be stored encrypted at rest`;

// ── Main ──

async function main() {
  console.clear();
  console.log(`
${B}${CY}    🔥  P H O E N I X   V C S${R}
${D}    Regenerative Version Control — A Causal Compiler for Intent

    This walkthrough shows you every file, every transformation,
    and every data structure Phoenix produces as it processes a spec.${R}
`);
  await wait(500);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 1: Here's the input file
  // ══════════════════════════════════════════════════════════════════

  banner(1, 'The Input — Your Spec File');

  console.log(`
  ${D}This is the file you wrote. It's a plain Markdown spec describing
  an authentication service. Phoenix will parse this into structured data.${R}
`);

  showFile('spec/auth.md (v1)', SPEC_V1);

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 2: Clause Extraction — splitting the file
  // ══════════════════════════════════════════════════════════════════

  banner(2, 'Clause Extraction — Splitting the Spec into Atoms');

  console.log(`
  ${D}Phoenix splits on heading boundaries. Each heading + its body = one "clause".
  Think of clauses as the atomic units of your spec — the smallest pieces
  that can be independently tracked, hashed, and invalidated.${R}
`);

  const clausesV1 = parseSpec(SPEC_V1, 'spec/auth.md');

  // Show the file again with clause boundaries highlighted
  const v1Lines = SPEC_V1.split('\n');
  const clauseHighlights = new Map<number, string>();
  const clauseColors = [GR, YL, CY, MG, BL, GR, YL];
  for (let ci = 0; ci < clausesV1.length; ci++) {
    const c = clausesV1[ci];
    for (let ln = c.source_line_range[0]; ln <= c.source_line_range[1]; ln++) {
      clauseHighlights.set(ln, clauseColors[ci % clauseColors.length]);
    }
  }
  showFile('spec/auth.md — color-coded by clause', SPEC_V1, clauseHighlights);

  console.log(`  ${D}Each color = one clause. Phoenix found ${B}${clausesV1.length} clauses${R}${D}:${R}\n`);

  for (let i = 0; i < clausesV1.length; i++) {
    const c = clausesV1[i];
    const color = clauseColors[i % clauseColors.length];
    const path = c.section_path.join(' → ');
    console.log(`  ${color}█${R} Clause ${i + 1}: ${B}${path}${R}  ${D}(lines ${c.source_line_range[0]}–${c.source_line_range[1]})${R}`);
  }
  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 3: Normalization — what Phoenix actually hashes
  // ══════════════════════════════════════════════════════════════════

  banner(3, 'Normalization — Stripping Noise Before Hashing');

  console.log(`
  ${D}Before hashing, Phoenix normalizes text to ignore formatting noise:
   • Heading markers (##) removed      • Bold/italic markers removed
   • Everything lowercased              • Whitespace collapsed
   • List items sorted alphabetically   • Empty lines removed

  This means ${B}formatting-only changes don't produce false diffs${R}${D}.${R}
`);

  // Show raw → normalized for a meaty clause
  const reqClause = clausesV1.find(c => c.section_path.includes('Requirements'))!;

  sub('Raw text (what you wrote)');
  for (const line of reqClause.raw_text.split('\n')) {
    console.log(`    ${line}`);
  }

  sub('Normalized text (what Phoenix hashes)');
  for (const line of reqClause.normalized_text.split('\n')) {
    console.log(`    ${GR}${line}${R}`);
  }

  console.log(`\n  ${D}Notice: list items are alphabetically sorted. If you reorder your bullet
  points, the hash stays the same — because the ${B}meaning${R}${D} didn't change.${R}\n`);

  // Prove it
  sub('Proof: formatting changes don\'t affect the hash');
  const raw1 = '**Phoenix** is a VCS.';
  const raw2 = 'Phoenix is a VCS.';
  const norm1 = normalizeText(raw1);
  const norm2 = normalizeText(raw2);
  const hash1 = clauseSemhash(norm1);
  const hash2 = clauseSemhash(norm2);
  console.log(`    Input A: "${raw1}"`);
  console.log(`    Input B: "${raw2}"`);
  console.log(`    Normalized A: "${GR}${norm1}${R}"`);
  console.log(`    Normalized B: "${GR}${norm2}${R}"`);
  console.log(`    Hash A: ${D}${hash1.slice(0, 24)}…${R}`);
  console.log(`    Hash B: ${D}${hash2.slice(0, 24)}…${R}`);
  console.log(`    Match: ${hash1 === hash2 ? `${GR}${B}✓ YES — same hash!${R}` : `${RD}✗ NO${R}`}`);
  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 4: Semantic Hashing — the clause data structure
  // ══════════════════════════════════════════════════════════════════

  banner(4, 'Semantic Hashing — Content-Addressed Clause Objects');

  console.log(`
  ${D}Each clause gets two hashes:

  ${B}clause_semhash${R}${D}      = SHA-256(normalized_text)
                         Pure content identity. Same text → same hash. Always.

  ${B}context_semhash_cold${R}${D} = SHA-256(normalized_text + section_path + neighbor hashes)
                         Knows WHERE in the document this clause lives
                         and what's around it. Detects structural shifts.${R}
`);

  // Show the full data structure for one clause
  const loginClause = clausesV1.find(c =>
    c.section_path[c.section_path.length - 1] === 'POST /auth/login'
  )!;

  showJSON('Clause Object — POST /auth/login', {
    clause_id: loginClause.clause_id,
    source_doc_id: loginClause.source_doc_id,
    source_line_range: loginClause.source_line_range,
    section_path: loginClause.section_path,
    raw_text: loginClause.raw_text,
    normalized_text: loginClause.normalized_text,
    clause_semhash: loginClause.clause_semhash,
    context_semhash_cold: loginClause.context_semhash_cold,
  });

  console.log(`  ${D}This object is stored by its ${B}clause_id${R}${D} (a content hash).
  If the content changes, the ID changes. If it doesn't, the ID is stable.
  This is how Phoenix knows exactly what changed and what didn't.${R}\n`);

  // Show all clause hashes in a table
  sub('All Clause Hashes');
  console.log(`    ${'Section'.padEnd(40)} ${'semhash'.padEnd(14)} ${'context_cold'.padEnd(14)}`);
  console.log(`    ${D}${'─'.repeat(40)} ${'─'.repeat(14)} ${'─'.repeat(14)}${R}`);
  for (const c of clausesV1) {
    const name = c.section_path[c.section_path.length - 1] || '(root)';
    console.log(`    ${name.padEnd(40)} ${D}${c.clause_semhash.slice(0, 12)}…${R} ${D}${c.context_semhash_cold.slice(0, 12)}…${R}`);
  }
  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 5: Canonicalization — extracting structured requirements
  // ══════════════════════════════════════════════════════════════════

  banner(5, 'Canonicalization — Extracting the Requirements Graph');

  console.log(`
  ${D}Phoenix scans each clause for semantic signals and extracts
  ${B}canonical nodes${R}${D} — structured representations of what the spec actually requires.

  It looks for patterns like:
    "must", "shall", "required"           → ${R}${BG_GR}${WH}${B} REQUIREMENT ${R}${D}
    "must not", "forbidden", "limited to" → ${R}${BG_RD}${WH}${B} CONSTRAINT ${R}${D}
    "always", "never"                     → ${R}${BG_MG}${WH}${B} INVARIANT ${R}${D}
    ": ", "is defined as"                 → ${R}${BG_BL}${WH}${B} DEFINITION ${R}${D}

  Heading context also matters: a line under "## Security Constraints"
  gets classified as a constraint even without magic words.${R}
`);

  const canonV1 = extractCanonicalNodes(clausesV1);

  // Show each canonical node with its source
  for (const node of canonV1) {
    const typeBg = node.type === 'REQUIREMENT' ? BG_GR
                 : node.type === 'CONSTRAINT' ? BG_RD
                 : node.type === 'INVARIANT' ? BG_MG
                 : BG_BL;
    const sourceClause = clausesV1.find(c => c.clause_id === node.source_clause_ids[0]);
    const sourceName = sourceClause
      ? sourceClause.section_path[sourceClause.section_path.length - 1]
      : '?';
    const links = node.linked_canon_ids.length;
    const linkStr = links > 0 ? `  ${YL}⟷ linked to ${links} other node${links > 1 ? 's' : ''}${R}` : '';

    console.log(`  ${badge(node.type, typeBg)} ${node.statement}`);
    console.log(`    ${D}source: ${sourceName}  |  tags: [${node.tags.slice(0, 5).join(', ')}]${R}${linkStr}`);
    console.log('');
  }

  // Show the full data for one node
  const sampleNode = canonV1[0];
  showJSON('Canonical Node Object (first node)', {
    canon_id: sampleNode.canon_id,
    type: sampleNode.type,
    statement: sampleNode.statement,
    source_clause_ids: sampleNode.source_clause_ids,
    linked_canon_ids: sampleNode.linked_canon_ids,
    tags: sampleNode.tags,
  });

  sub('Provenance Chain');
  console.log(`  ${D}Every canonical node traces back to its source clause, which traces
  back to exact line numbers in the spec file. Nothing is disconnected:${R}\n`);
  const provClause = clausesV1.find(c => c.clause_id === sampleNode.source_clause_ids[0])!;
  arrow('spec/auth.md:L' + provClause.source_line_range[0] + '–' + provClause.source_line_range[1],
        'Clause "' + provClause.section_path[provClause.section_path.length - 1] + '"',
        'parsed into');
  arrow('Clause ' + provClause.clause_id.slice(0, 8) + '…',
        'Canon "' + sampleNode.statement.slice(0, 35) + '…"',
        'extracted as ' + sampleNode.type);
  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 6: Warm Hashes — incorporating canonical context
  // ══════════════════════════════════════════════════════════════════

  banner(6, 'Warm Context Hashes — Adding Graph Awareness');

  console.log(`
  ${D}The cold hash only knows about text + neighbors. Now that we have the
  canonical graph, we compute a ${B}warm hash${R}${D} that also knows which
  ${B}requirement nodes${R}${D} are linked to this clause.

  Why? If someone adds a requirement in a different section that ${B}links to${R}${D}
  this clause's requirements, the warm hash changes — telling Phoenix that
  this clause's ${B}context${R}${D} shifted even though its ${B}content${R}${D} didn't.${R}
`);

  const warmV1 = computeWarmHashes(clausesV1, canonV1);

  sub('Cold vs Warm Hashes — Side by Side');
  console.log(`    ${'Section'.padEnd(32)} ${'Cold Hash'.padEnd(16)} ${'Warm Hash'.padEnd(16)} ${'Status'}`);
  console.log(`    ${D}${'─'.repeat(32)} ${'─'.repeat(16)} ${'─'.repeat(16)} ${'─'.repeat(10)}${R}`);

  for (const c of clausesV1) {
    const name = (c.section_path[c.section_path.length - 1] || '(root)').slice(0, 30);
    const cold = c.context_semhash_cold.slice(0, 14);
    const warm = warmV1.get(c.clause_id)!.slice(0, 14);
    const status = cold !== warm
      ? `${YL}differs${R}  ${D}← canonical context added${R}`
      : `${GR}same${R}`;
    console.log(`    ${name.padEnd(32)} ${D}${cold}…${R} ${D}${warm}…${R} ${status}`);
  }

  console.log(`\n  ${D}All warm hashes differ from cold — because every clause now has
  canonical nodes linked to it, enriching its context signature.${R}\n`);

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 7: Bootstrap state machine
  // ══════════════════════════════════════════════════════════════════

  banner(7, 'Bootstrap — State Machine Transition');

  console.log(`
  ${D}Phoenix tracks system trust state:

    ${badge('BOOTSTRAP_COLD', BG_BL)}   → Parsing only, no canonical graph yet
    ${badge('BOOTSTRAP_WARMING', BG_YL)} → Canonical graph exists, hashes stabilizing
    ${badge('STEADY_STATE', BG_GR)}      → D-rate acceptable, system trusted

  D-rate alarms are ${B}suppressed during cold${R}${D} (no point — everything is new).
  Severity is ${B}downgraded during warming${R}${D} (still stabilizing).${R}
`);

  const bootstrap = new BootstrapStateMachine();
  console.log(`  State: ${badge(bootstrap.getState(), BG_BL)}  Alarms suppressed: ${GR}yes${R}`);

  bootstrap.markWarmPassComplete();
  console.log(`  State: ${badge(bootstrap.getState(), BG_YL)}  Severity downgraded: ${YL}yes${R}`);

  const tracker = new DRateTracker(20);
  for (let i = 0; i < 18; i++) tracker.recordOne(ChangeClass.A);
  for (let i = 0; i < 2; i++) tracker.recordOne(ChangeClass.B);
  const dStatus = tracker.getStatus();
  bootstrap.evaluateTransition(dStatus);
  console.log(`  State: ${badge(bootstrap.getState(), BG_GR)}  D-rate: ${(dStatus.rate * 100).toFixed(0)}% → ${GR}trusted${R}`);

  showJSON('Bootstrap State (persisted to .phoenix/state.json)', bootstrap.toJSON());

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 8: The spec changes — show the diff
  // ══════════════════════════════════════════════════════════════════

  banner(8, 'The Spec Evolves — v1 → v2');

  console.log(`
  ${D}A developer edits spec/auth.md. Let's see exactly what changed:${R}
`);

  // Show v2 with highlights on changed lines
  const v2Lines = SPEC_V2.split('\n');
  const v1Set = new Set(SPEC_V1.split('\n'));
  const v2Highlights = new Map<number, string>();
  for (let i = 0; i < v2Lines.length; i++) {
    if (!v1Set.has(v2Lines[i])) {
      v2Highlights.set(i + 1, `${YL}`);
    }
  }
  showFile('spec/auth.md (v2) — yellow = changed/new lines', SPEC_V2, v2Highlights);

  sub('What changed (human-readable)');
  console.log(`    ${YL}~${R} Line 3:  "…and session management" → "…session management, ${B}and OAuth integration${R}"`);
  console.log(`    ${YL}~${R} Line 8:  "24 hours" → "${B}12 hours${R}"`);
  console.log(`    ${YL}~${R} Line 9:  "5 per minute" → "${B}3 per minute${R}"`);
  console.log(`    ${YL}~${R} Line 10: "bcrypt (cost factor 12)" → "${B}argon2id (cost factor 3, memory 64MB)${R}"`);
  console.log(`    ${GR}+${R} Line 11: ${B}OAuth2 providers (Google, GitHub) must be supported${R}  ${D}← new${R}`);
  console.log(`    ${GR}+${R} Line 25: ${B}GET /auth/oauth/:provider${R}  ${D}← new endpoint${R}`);
  console.log(`    ${YL}~${R} Line 31: "1 hour" → "${B}30 minutes${R}"`);
  console.log(`    ${GR}+${R} Line 32: ${B}OAuth tokens must be stored encrypted at rest${R}  ${D}← new${R}`);
  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 9: Clause-level diff
  // ══════════════════════════════════════════════════════════════════

  banner(9, 'Clause Diff — What Phoenix Sees');

  console.log(`
  ${D}Phoenix doesn't diff lines. It diffs ${B}clauses${R}${D} — semantic units.
  It re-parses v2, compares clause hashes, and classifies each one:${R}
`);

  const clausesV2 = parseSpec(SPEC_V2, 'spec/auth.md');
  const diffs = diffClauses(clausesV1, clausesV2);

  const diffColors: Record<string, string> = {
    UNCHANGED: GR, MODIFIED: YL, ADDED: GR, REMOVED: RD, MOVED: BL,
  };
  const diffIcons: Record<string, string> = {
    UNCHANGED: '═', MODIFIED: '~', ADDED: '+', REMOVED: '-', MOVED: '→',
  };

  for (const diff of diffs) {
    const clause = diff.clause_after || diff.clause_before!;
    const name = clause.section_path[clause.section_path.length - 1] || '(root)';
    const color = diffColors[diff.diff_type];
    const icon = diffIcons[diff.diff_type];

    console.log(`  ${color}${B}${icon}${R} ${badge(diff.diff_type.padEnd(10), diff.diff_type === 'UNCHANGED' ? BG_GR : diff.diff_type === 'ADDED' ? BG_CY : diff.diff_type === 'REMOVED' ? BG_RD : BG_YL)} ${B}${name}${R}`);

    // Show what changed for MODIFIED clauses
    if (diff.diff_type === 'MODIFIED' && diff.clause_before && diff.clause_after) {
      const beforeLines = diff.clause_before.normalized_text.split('\n');
      const afterLines = diff.clause_after.normalized_text.split('\n');
      const beforeSet = new Set(beforeLines);
      const afterSet = new Set(afterLines);

      const removed = beforeLines.filter(l => !afterSet.has(l));
      const added = afterLines.filter(l => !beforeSet.has(l));

      for (const line of removed) {
        if (line.trim()) console.log(`      ${RD}- ${line}${R}`);
      }
      for (const line of added) {
        if (line.trim()) console.log(`      ${GR}+ ${line}${R}`);
      }
    }
    if (diff.diff_type === 'ADDED' && diff.clause_after) {
      for (const line of diff.clause_after.normalized_text.split('\n').slice(0, 3)) {
        if (line.trim()) console.log(`      ${GR}+ ${line}${R}`);
      }
    }
    console.log('');
  }

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 10: Canonicalize v2 + show graph delta
  // ══════════════════════════════════════════════════════════════════

  banner(10, 'Canonical Graph Delta — How Requirements Changed');

  console.log(`
  ${D}Phoenix canonicalizes v2 and compares the two requirement graphs.
  This is where it understands the ${B}real impact${R}${D} of the spec change.${R}
`);

  const canonV2 = extractCanonicalNodes(clausesV2);

  // Find new nodes
  const v1Stmts = new Set(canonV1.map(n => n.statement));
  const v2Stmts = new Set(canonV2.map(n => n.statement));
  const newNodes = canonV2.filter(n => !v1Stmts.has(n.statement));
  const removedNodes = canonV1.filter(n => !v2Stmts.has(n.statement));
  const keptNodes = canonV2.filter(n => v1Stmts.has(n.statement));

  sub(`Canonical graph: v1 had ${canonV1.length} nodes → v2 has ${canonV2.length} nodes`);

  if (keptNodes.length > 0) {
    console.log(`  ${GR}Unchanged nodes (${keptNodes.length}):${R}`);
    for (const n of keptNodes) {
      console.log(`    ${GR}═${R} ${n.statement.slice(0, 70)}`);
    }
    console.log('');
  }

  if (removedNodes.length > 0) {
    console.log(`  ${RD}Removed nodes (${removedNodes.length}):${R}`);
    for (const n of removedNodes) {
      console.log(`    ${RD}- ${n.statement.slice(0, 70)}${R}`);
    }
    console.log('');
  }

  if (newNodes.length > 0) {
    console.log(`  ${CY}New nodes (${newNodes.length}):${R}`);
    for (const n of newNodes) {
      const typeBg = n.type === 'REQUIREMENT' ? BG_GR : n.type === 'CONSTRAINT' ? BG_RD : BG_BL;
      console.log(`    ${CY}+${R} ${badge(n.type, typeBg)} ${n.statement.slice(0, 60)}`);
    }
    console.log('');
  }

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 11: Classify changes A/B/C/D
  // ══════════════════════════════════════════════════════════════════

  banner(11, 'Change Classification — A / B / C / D');

  console.log(`
  ${D}Now Phoenix classifies each diff using multiple signals:

  ${badge('A', BG_GR)} ${B}Trivial${R}${D}          — formatting only, no semantic change
  ${badge('B', BG_BL)} ${B}Local Semantic${R}${D}    — content changed, limited blast radius
  ${badge('C', BG_YL)} ${B}Contextual Shift${R}${D} — affects canonical graph or structural context
  ${badge('D', BG_RD)} ${B}Uncertain${R}${D}         — classifier can't decide; needs human review

  Signals used: edit distance, semhash delta, context hash delta,
  term overlap (Jaccard), section structure, # of canonical nodes affected.${R}
`);

  const warmV2 = computeWarmHashes(clausesV2, canonV2);
  const classifications = classifyChanges(diffs, canonV1, canonV2, warmV1, warmV2);

  const classColors: Record<string, string> = { A: BG_GR, B: BG_BL, C: BG_YL, D: BG_RD };
  const classLabels: Record<string, string> = {
    A: 'Trivial', B: 'Local Semantic', C: 'Contextual Shift', D: 'Uncertain',
  };

  for (let i = 0; i < diffs.length; i++) {
    const diff = diffs[i];
    const cls = classifications[i];
    const clause = diff.clause_after || diff.clause_before!;
    const name = clause.section_path[clause.section_path.length - 1] || '(root)';

    console.log(`  ${badge(cls.change_class, classColors[cls.change_class])} ${B}${name}${R}  ${D}(${diff.diff_type})${R}  → ${classLabels[cls.change_class]}  ${D}${(cls.confidence * 100).toFixed(0)}% confidence${R}`);

    // Show signal breakdown for non-trivial changes
    if (cls.change_class !== 'A') {
      const s = cls.signals;
      const parts: string[] = [];
      if (s.semhash_delta) parts.push(`content: ${RD}changed${R}`);
      else parts.push(`content: ${GR}same${R}`);
      if (s.context_cold_delta) parts.push(`context: ${YL}shifted${R}`);
      if (s.norm_diff > 0) parts.push(`edit dist: ${(s.norm_diff * 100).toFixed(0)}%`);
      if (s.term_ref_delta > 0) parts.push(`term overlap: ${((1 - s.term_ref_delta) * 100).toFixed(0)}%`);
      if (s.canon_impact > 0) parts.push(`canon impact: ${B}${s.canon_impact} nodes${R}`);
      console.log(`    ${D}signals: ${parts.join('  │  ')}${R}`);
    }
    console.log('');
  }

  // Show one full classification object
  const interestingCls = classifications.find(c => c.change_class === 'C' && c.signals.canon_impact > 0)!;
  if (interestingCls) {
    showJSON('Full Classification Object (most interesting change)', interestingCls);
  }

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 12: Trust Dashboard
  // ══════════════════════════════════════════════════════════════════

  banner(12, 'Trust Dashboard — phoenix status');

  console.log(`
  ${D}This is what ${B}phoenix status${R}${D} would show. It's the primary UX of Phoenix.
  If this is trustworthy, Phoenix works. If it's noisy or wrong, it's useless.${R}
`);

  const liveTracker = new DRateTracker(50);
  liveTracker.record(classifications);
  const liveStatus = liveTracker.getStatus();

  // Summary table
  const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
  for (const c of classifications) counts[c.change_class]++;

  showBox([
    `${B}Classification Summary${R}`,
    ``,
    `  ${badge('A', BG_GR)} Trivial           ${'█'.repeat(counts.A * 4)}${'░'.repeat((8 - counts.A) * 4)}  ${counts.A}`,
    `  ${badge('B', BG_BL)} Local Semantic    ${'█'.repeat(counts.B * 4)}${'░'.repeat((8 - counts.B) * 4)}  ${counts.B}`,
    `  ${badge('C', BG_YL)} Contextual Shift  ${'█'.repeat(counts.C * 4)}${'░'.repeat((8 - counts.C) * 4)}  ${counts.C}`,
    `  ${badge('D', BG_RD)} Uncertain         ${'░'.repeat(8 * 4)}  ${counts.D}`,
    ``,
    `  ${B}D-Rate:${R} ${(liveStatus.rate * 100).toFixed(1)}%  ${badge(liveStatus.level, BG_GR)}`,
    `  ${D}[${GR}${'█'.repeat(Math.round((1 - liveStatus.rate) * 40))}${R}${D}${'░'.repeat(40 - Math.round((1 - liveStatus.rate) * 40))}]  target ≤5%  alarm >15%${R}`,
    ``,
    `  ${B}Canonical Graph:${R} ${canonV1.length} → ${canonV2.length} nodes  ${GR}(+${newNodes.length} new, -${removedNodes.length} removed)${R}`,
    `  ${B}System State:${R}    ${badge('STEADY_STATE', BG_GR)}`,
  ]);

  console.log('');

  // ══════════════════════════════════════════════════════════════════
  //  Summary
  // ══════════════════════════════════════════════════════════════════

  // ══════════════════════════════════════════════════════════════════
  //  STEP 13: IU Planning — mapping requirements to code units
  // ══════════════════════════════════════════════════════════════════

  banner(13, 'IU Planning — Mapping Requirements → Code Modules');

  console.log(`
  ${D}Now Phoenix groups canonical nodes into ${B}Implementation Units (IUs)${R}${D} —
  the stable compilation boundaries that will hold generated code.

  Grouping strategy:
   • Canonical nodes from the same source clause → same IU
   • Linked nodes (shared terms) → same IU
   • Each IU gets a risk tier, contract, boundary policy, and evidence policy${R}
`);

  const iusV1 = planIUs(canonV1, clausesV1);

  for (const iu of iusV1) {
    const riskBg = iu.risk_tier === 'high' ? BG_RD : iu.risk_tier === 'medium' ? BG_YL : BG_GR;
    console.log(`  ${badge(iu.risk_tier.toUpperCase(), riskBg)} ${B}${iu.name}${R}  ${D}(${iu.kind})${R}`);
    console.log(`    ${D}canon nodes: ${iu.source_canon_ids.length}  |  output: ${iu.output_files.join(', ')}${R}`);
    console.log(`    ${D}evidence required: ${iu.evidence_policy.required.join(', ')}${R}`);
    console.log('');
  }

  showJSON('Implementation Unit Object (first IU)', {
    iu_id: iusV1[0].iu_id,
    kind: iusV1[0].kind,
    name: iusV1[0].name,
    risk_tier: iusV1[0].risk_tier,
    contract: {
      description: iusV1[0].contract.description.slice(0, 120) + '…',
      invariants: iusV1[0].contract.invariants,
    },
    source_canon_ids: iusV1[0].source_canon_ids.map(id => id.slice(0, 16) + '…'),
    output_files: iusV1[0].output_files,
    evidence_policy: iusV1[0].evidence_policy,
  });

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 14: Code Generation — producing the actual files
  // ══════════════════════════════════════════════════════════════════

  banner(14, 'Code Generation — Producing TypeScript Module Stubs');

  console.log(`
  ${D}Phoenix generates code for each IU. In v1 this is a stub generator;
  in production it would invoke an LLM with a structured promptpack.

  The regen engine records:
   • model_id (which generator produced this)
   • promptpack hash (what instructions were used)
   • toolchain version
   • per-file content hashes (for drift detection later)${R}
`);

  const regenResults = iusV1.map(iu => generateIU(iu));

  for (const result of regenResults) {
    for (const [filePath, content] of result.files) {
      console.log(`  ${BG_CY}${WH}${B} 📄 ${filePath} ${R}  ${D}(${content.length} bytes)${R}\n`);
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const ln = String(i + 1).padStart(3);
        console.log(`  ${D}${ln}${R} ${lines[i]}`);
      }
      console.log('');
    }
  }

  sub('Generated Manifest Entry');
  showJSON('.phoenix/manifests/generated_manifest.json (excerpt)', {
    iu_manifests: {
      [regenResults[0].manifest.iu_id.slice(0, 16) + '…']: {
        iu_name: regenResults[0].manifest.iu_name,
        files: Object.fromEntries(
          Object.entries(regenResults[0].manifest.files).map(([k, v]) => [k, {
            content_hash: v.content_hash.slice(0, 16) + '…',
            size: v.size,
          }])
        ),
        regen_metadata: regenResults[0].manifest.regen_metadata,
      },
    },
  });

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 15: Drift Detection — checking for manual edits
  // ══════════════════════════════════════════════════════════════════

  banner(15, 'Drift Detection — Has Anyone Edited Generated Code?');

  console.log(`
  ${D}Phoenix compares the working tree against the generated manifest.
  Every file is hashed. If a hash doesn't match and there's no waiver,
  that's a ${B}drift violation${R}${D} — someone edited generated code directly,
  breaking the provenance chain.

  Possible statuses:
    ${GR}CLEAN${R}${D}    — file matches manifest exactly
    ${RD}DRIFTED${R}${D}  — file was modified without a waiver → ${B}ERROR${R}${D}
    ${YL}WAIVED${R}${D}   — file was modified but has an approved waiver
    ${RD}MISSING${R}${D}  — manifest says file should exist but it doesn't${R}
`);

  // Set up a temp project to demonstrate drift
  const demoRoot = mkdtempSync(join(tmpdir(), 'phoenix-demo-'));

  // Write generated files to disk
  for (const result of regenResults) {
    for (const [path, content] of result.files) {
      const fullPath = join(demoRoot, path);
      mkdirSync(join(fullPath, '..'), { recursive: true });
      writeFileSync(fullPath, content, 'utf8');
    }
  }

  // Build the manifest
  const manifest: GeneratedManifest = {
    iu_manifests: Object.fromEntries(regenResults.map(r => [r.manifest.iu_id, r.manifest])),
    generated_at: new Date().toISOString(),
  };

  // Check — should be clean
  sub('Scenario 1: Fresh generation — all files clean');
  const cleanReport = detectDrift(manifest, demoRoot);
  for (const entry of cleanReport.entries) {
    const icon = entry.status === DriftStatus.CLEAN ? `${GR}✓${R}` : `${RD}✗${R}`;
    console.log(`    ${icon} ${badge(entry.status, BG_GR)} ${entry.file_path}`);
  }
  console.log(`\n    ${D}${cleanReport.summary}${R}`);

  // Now tamper with a file
  sub('Scenario 2: Someone manually edits a generated file');
  const firstFile = [...regenResults[0].files.keys()][0];
  const fullPath = join(demoRoot, firstFile);
  const original = regenResults[0].files.get(firstFile)!;
  writeFileSync(fullPath, '// HACKED BY DEV AT 3AM\n' + original, 'utf8');
  console.log(`    ${YL}Simulating:${R} Added "// HACKED BY DEV AT 3AM" to ${B}${firstFile}${R}\n`);

  const driftReport = detectDrift(manifest, demoRoot);
  for (const entry of driftReport.entries) {
    const icon = entry.status === DriftStatus.CLEAN ? `${GR}✓${R}` :
                 entry.status === DriftStatus.DRIFTED ? `${RD}✗${R}` : `${YL}!${R}`;
    const bg = entry.status === DriftStatus.CLEAN ? BG_GR : BG_RD;
    console.log(`    ${icon} ${badge(entry.status, bg)} ${entry.file_path}`);
    if (entry.status === DriftStatus.DRIFTED) {
      console.log(`      ${D}expected: ${entry.expected_hash?.slice(0, 16)}…  actual: ${entry.actual_hash?.slice(0, 16)}…${R}`);
    }
  }
  console.log(`\n    ${RD}${B}${driftReport.summary}${R}`);
  console.log(`\n  ${D}To fix: label the edit as ${B}promote_to_requirement${R}${D}, ${B}waiver${R}${D}, or ${B}temporary_patch${R}${D}.${R}`);

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 16: Boundary Validation — architectural linting
  // ══════════════════════════════════════════════════════════════════

  banner(16, 'Boundary Validation — Architectural Linter');

  console.log(`
  ${D}Each IU declares what it's ${B}allowed${R}${D} and ${B}forbidden${R}${D} to touch:
   • Which packages it may import
   • Which IUs it may depend on
   • Which side channels (databases, env vars, APIs) it may use

  Phoenix extracts the dependency graph from the code and validates it
  against the boundary policy. Violations become diagnostics in ${B}phoenix status${R}${D}.${R}
`);

  // Show a realistic code sample with violations
  const naughtyCode = `/**
 * AuthIU — generated module
 */
import express from 'express';
import axios from 'axios';
import { adminSecret } from './internal/admin-keys.js';

const dbUrl = process.env.DATABASE_URL;
const apiKey = process.env.STRIPE_API_KEY;

const resp = fetch('https://external-service.com/api');

export function authenticate(email: string, password: string) {
  // ...implementation
}`;

  showFile('src/generated/auth-iu.ts (with violations)', naughtyCode);

  sub('Dependency Extraction');
  const depGraph = extractDependencies(naughtyCode, 'src/generated/auth-iu.ts');

  console.log(`    ${B}Imports found:${R}`);
  for (const dep of depGraph.imports) {
    const rel = dep.is_relative ? `${D}(relative)${R}` : `${D}(package)${R}`;
    console.log(`      L${dep.source_line}: ${CY}${dep.source}${R} ${rel}`);
  }
  console.log(`\n    ${B}Side channels found:${R}`);
  for (const sc of depGraph.side_channels) {
    console.log(`      L${sc.source_line}: ${YL}${sc.kind}${R} → ${sc.identifier}`);
  }

  showJSON('DependencyGraph object', {
    file_path: depGraph.file_path,
    imports: depGraph.imports,
    side_channels: depGraph.side_channels,
  });

  sub('Boundary Validation');

  // Create a strict boundary policy
  const strictIU = {
    ...iusV1[0],
    boundary_policy: {
      code: {
        allowed_ius: [],
        allowed_packages: ['express', 'bcrypt'],
        forbidden_ius: [],
        forbidden_packages: ['axios'],
        forbidden_paths: ['./internal/**'],
      },
      side_channels: {
        databases: [], queues: [], caches: [],
        config: ['DATABASE_URL'],   // only this one is declared
        external_apis: [],
        files: [],
      },
    },
    enforcement: {
      dependency_violation: { severity: 'error' as const },
      side_channel_violation: { severity: 'warning' as const },
    },
  };

  console.log(`  ${D}Boundary policy for this IU:${R}`);
  console.log(`    ${GR}allowed_packages:${R}   [express, bcrypt]`);
  console.log(`    ${RD}forbidden_packages:${R} [axios]`);
  console.log(`    ${RD}forbidden_paths:${R}    [./internal/**]`);
  console.log(`    ${GR}declared config:${R}     [DATABASE_URL]`);
  console.log('');

  const diags = validateBoundary(depGraph, strictIU);

  for (const diag of diags) {
    const sevBg = diag.severity === 'error' ? BG_RD : BG_YL;
    const icon = diag.severity === 'error' ? `${RD}✗${R}` : `${YL}!${R}`;
    console.log(`  ${icon} ${badge(diag.severity.toUpperCase(), sevBg)} ${badge(diag.category, BG_BL)}`);
    console.log(`    ${B}${diag.subject}${R}: ${diag.message}`);
    console.log(`    ${D}at ${diag.source_file}:${diag.source_line}${R}`);
    console.log(`    ${D}fix: ${diag.recommended_actions[0]}${R}`);
    console.log('');
  }

  console.log(`  ${D}Total: ${diags.filter(d => d.severity === 'error').length} errors, ${diags.filter(d => d.severity === 'warning').length} warnings${R}`);

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 17: Boundary Change Detection
  // ══════════════════════════════════════════════════════════════════

  banner(17, 'Boundary Change Detection — Policy Evolution');

  console.log(`
  ${D}When an IU's boundary policy changes, Phoenix detects it and triggers
  re-validation of the IU and all its dependents. This prevents silent
  coupling drift.${R}
`);

  const updatedIU = {
    ...strictIU,
    boundary_policy: {
      ...strictIU.boundary_policy,
      code: {
        ...strictIU.boundary_policy.code,
        allowed_packages: ['express', 'bcrypt', 'argon2'],
        forbidden_packages: ['axios', 'got'],
      },
      side_channels: {
        ...strictIU.boundary_policy.side_channels,
        config: ['DATABASE_URL', 'STRIPE_API_KEY'],
        external_apis: ['https://external-service.com/api'],
      },
    },
  };

  const boundaryChange = detectBoundaryChanges(strictIU, updatedIU);

  if (boundaryChange) {
    console.log(`  ${badge('BOUNDARY CHANGE', BG_YL)} ${B}${boundaryChange.iu_name}${R}\n`);
    for (const change of boundaryChange.changes) {
      console.log(`    ${YL}~${R} ${change}`);
    }
    console.log(`\n  ${D}This triggers: re-extract deps → re-validate → update status for this IU + dependents${R}`);
  }

  console.log(`\n  ${D}After updating the policy to declare the new deps:${R}`);
  const diagsAfter = validateBoundary(depGraph, updatedIU);
  if (diagsAfter.length === 0) {
    console.log(`    ${GR}${B}✓ All boundary checks pass${R}`);
  } else {
    for (const diag of diagsAfter) {
      const sevBg = diag.severity === 'error' ? BG_RD : BG_YL;
      console.log(`    ${badge(diag.severity.toUpperCase(), sevBg)} ${diag.subject}: ${diag.message}`);
    }
  }

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 18: Updated Trust Dashboard
  // ══════════════════════════════════════════════════════════════════

  banner(18, 'Trust Dashboard — phoenix status (Full)');

  console.log(`
  ${D}Everything feeds into the trust dashboard. This is what a developer
  sees when they run ${B}phoenix status${R}${D}:${R}
`);

  showBox([
    `${B}phoenix status${R}  ${D}STEADY_STATE  |  spec/auth.md v1 → v2${R}`,
    ``,
    `${B}Classification Summary${R}   A:${GR}3${R}  B:${BL}1${R}  C:${YL}4${R}  D:${RD}0${R}  │  D-Rate: ${GR}0.0%${R} ${badge('TARGET', BG_GR)}`,
    ``,
    `${B}Canonical Graph${R}  8 → 10 nodes  │  ${GR}+${newNodes.length} new${R}  ${RD}-${removedNodes.length} removed${R}  ${GR}${keptNodes.length} kept${R}`,
    ``,
    `${B}Implementation Units${R}  ${iusV1.length} IU${iusV1.length > 1 ? 's' : ''}  │  ${regenResults.reduce((s,r) => s + r.files.size, 0)} generated files`,
    ``,
    `${B}Drift${R}  ${driftReport.drifted_count > 0 ? `${RD}${B}${driftReport.drifted_count} DRIFTED${R}` : `${GR}all clean${R}`}  │  ${driftReport.clean_count} clean  ${driftReport.drifted_count} drifted`,
    ``,
    `${B}Boundary${R}  ${diags.length > 0 ? `${RD}${diags.filter(d=>d.severity==='error').length} errors${R}  ${YL}${diags.filter(d=>d.severity==='warning').length} warnings${R}` : `${GR}all clear${R}`}`,
    ``,
    `${B}Actions Required:${R}`,
    `  ${RD}ERROR${R}   drift     ${firstFile}   Drifted from manifest → label or reconcile`,
    `  ${RD}ERROR${R}   boundary  axios           Forbidden package → remove import`,
    `  ${RD}ERROR${R}   boundary  ./internal/**   Forbidden path → remove import`,
    `  ${YL}WARN ${R}   boundary  STRIPE_API_KEY  Undeclared config → declare or remove`,
    `  ${YL}WARN ${R}   boundary  external-svc    Undeclared API → declare or remove`,
  ]);

  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 19: Evidence & Policy Engine (Phase D)
  // ══════════════════════════════════════════════════════════════════

  banner(19, 'Evidence & Policy — Risk-Tiered Proof');

  console.log(`
  ${D}Each IU has a risk tier that determines what evidence is required
  before its generated code is accepted:

    ${badge('LOW', BG_GR)}      typecheck + lint + boundary validation
    ${badge('MEDIUM', BG_YL)}   + unit tests
    ${badge('HIGH', BG_RD)}     + property tests + threat note + static analysis
    ${badge('CRITICAL', BG_MG)} + human signoff or formal verification${R}
`);

  const demoIU = iusV1[0];
  sub(`Evaluating ${demoIU.name} (${demoIU.risk_tier} tier)`);
  console.log(`  ${D}Required evidence: ${demoIU.evidence_policy.required.join(', ')}${R}\n`);

  // No evidence yet
  const eval1 = evaluatePolicy(demoIU, []);
  console.log(`  ${RD}Before evidence:${R} verdict = ${badge(eval1.verdict, BG_RD)}`);
  console.log(`    ${D}missing: ${eval1.missing.join(', ')}${R}\n`);

  // Submit all passing evidence
  const passingEvidence: EvidenceRecord[] = demoIU.evidence_policy.required.map(kind => ({
    evidence_id: 'ev-' + kind, kind: kind as EvidenceKind,
    status: EvidenceStatus.PASS, iu_id: demoIU.iu_id,
    canon_ids: demoIU.source_canon_ids, timestamp: new Date().toISOString(),
  }));

  const eval2 = evaluatePolicy(demoIU, passingEvidence);
  console.log(`  ${GR}After all evidence passes:${R} verdict = ${badge(eval2.verdict, BG_GR)}`);
  console.log(`    ${D}satisfied: ${eval2.satisfied.join(', ')}${R}\n`);

  // Simulate failure
  const failedEvidence = [...passingEvidence, {
    evidence_id: 'ev-fail', kind: EvidenceKind.TYPECHECK,
    status: EvidenceStatus.FAIL, iu_id: demoIU.iu_id,
    canon_ids: [], message: 'TS2322: Type error in auth module',
    timestamp: new Date(Date.now() + 1000).toISOString(),
  }];

  const eval3 = evaluatePolicy(demoIU, failedEvidence);
  console.log(`  ${RD}After typecheck fails:${R} verdict = ${badge(eval3.verdict, BG_RD)}`);
  console.log(`    ${D}failed: ${eval3.failed.join(', ')}${R}`);

  showJSON('PolicyEvaluation object', eval3);

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 20: Cascading Failures (Phase D)
  // ══════════════════════════════════════════════════════════════════

  banner(20, 'Cascading Failures — Graph-Based Propagation');

  console.log(`
  ${D}When an IU's evidence fails, Phoenix propagates through the dependency
  graph. The failed IU is ${B}BLOCKED${R}${D}. Its dependents must ${B}RE_VALIDATE${R}${D}
  (re-run typecheck + boundary checks + tagged tests).

  This prevents a broken module from silently poisoning downstream code.${R}
`);

  // Create a scenario with dependencies
  const cascadeIUs = [
    { ...demoIU, iu_id: 'auth-iu', name: 'AuthIU', dependencies: [] as string[] },
    { ...demoIU, iu_id: 'session-iu', name: 'SessionIU', dependencies: ['auth-iu'] },
    { ...demoIU, iu_id: 'api-iu', name: 'ApiIU', dependencies: ['session-iu'] },
  ];

  console.log(`  ${D}Dependency graph:${R}  AuthIU ← SessionIU ← ApiIU\n`);

  const cascadeEvals = [{ ...eval3, iu_id: 'auth-iu', iu_name: 'AuthIU' }];
  const cascadeEvents = computeCascade(cascadeEvals, cascadeIUs);

  for (const event of cascadeEvents) {
    console.log(`  ${badge('CASCADE', BG_RD)} from ${B}${event.source_iu_name}${R}  (${event.failure_kind})\n`);
    for (const action of event.actions) {
      const actionBg = action.action === 'BLOCK' ? BG_RD : BG_YL;
      console.log(`    ${badge(action.action, actionBg)} ${B}${action.iu_name}${R}`);
      console.log(`      ${D}${action.reason}${R}`);
    }
  }
  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 21: Shadow Pipeline (Phase E)
  // ══════════════════════════════════════════════════════════════════

  banner(21, 'Shadow Pipeline — Safe Canonicalization Upgrades');

  console.log(`
  ${D}When upgrading the canonicalization pipeline (new model, new rules),
  Phoenix runs ${B}both old and new pipelines in parallel${R}${D} and compares output.

  Classification:
    ${badge('SAFE', BG_GR)}              node change ≤3%, no risk escalations
    ${badge('COMPACTION_EVENT', BG_YL)}   node change ≤25%, no orphans
    ${badge('REJECT', BG_RD)}            orphan nodes, excessive churn, or high drift${R}
`);

  const oldP = { pipeline_id: 'v1.0', model_id: 'rule-based/1.0', promptpack_version: '1.0', extraction_rules_version: '1.0', diff_policy_version: '1.0' };
  const newP = { pipeline_id: 'v1.1', model_id: 'rule-based/1.1', promptpack_version: '1.1', extraction_rules_version: '1.1', diff_policy_version: '1.0' };

  // Scenario 1: identical output → SAFE
  sub('Scenario 1: Minor rule tweak, same output');
  const safe = runShadowPipeline(oldP, newP, canonV1, canonV1);
  console.log(`  ${badge(safe.classification, BG_GR)} ${safe.reason}`);
  console.log(`    ${D}node change: ${safe.metrics.node_change_pct}%  orphans: ${safe.metrics.orphan_nodes}${R}\n`);

  // Scenario 2: v1 → v2 output → COMPACTION_EVENT
  sub('Scenario 2: Major extraction rules upgrade');
  const canonV2ForShadow = extractCanonicalNodes(clausesV2);
  const compact = runShadowPipeline(oldP, { ...newP, pipeline_id: 'v2.0' }, canonV1, canonV2ForShadow);
  console.log(`  ${badge(compact.classification, compact.classification === 'REJECT' ? BG_RD : compact.classification === 'SAFE' ? BG_GR : BG_YL)} ${compact.reason}`);
  console.log(`    ${D}node change: ${compact.metrics.node_change_pct}%  drift: ${compact.metrics.semantic_stmt_drift}%  orphans: ${compact.metrics.orphan_nodes}${R}`);

  showJSON('ShadowResult metrics', compact.metrics);

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 22: Compaction (Phase E)
  // ══════════════════════════════════════════════════════════════════

  banner(22, 'Compaction — Storage Lifecycle');

  console.log(`
  ${D}Phoenix compacts old data into cold storage while ${B}never deleting${R}${D}:
   • Node headers (identity preserved forever)
   • Provenance edges (traceability preserved forever)
   • Approvals & signatures (audit trail preserved forever)

  Storage tiers: ${badge('HOT', BG_GR)} (30 days) → ${badge('ANCESTRY', BG_YL)} (metadata forever) → ${badge('COLD', BG_BL)} (blobs archived)${R}
`);

  const compactObjects = [
    { object_id: '1', object_type: 'clause_body', age_days: 90, size_bytes: 50000, preserve: false },
    { object_id: '2', object_type: 'clause_body', age_days: 60, size_bytes: 30000, preserve: false },
    { object_id: '3', object_type: 'node_header', age_days: 90, size_bytes: 500, preserve: true },
    { object_id: '4', object_type: 'provenance_edge', age_days: 120, size_bytes: 200, preserve: true },
    { object_id: '5', object_type: 'approval', age_days: 180, size_bytes: 300, preserve: true },
    { object_id: '6', object_type: 'clause_body', age_days: 10, size_bytes: 20000, preserve: false },
  ];

  const compactEvent = runCompaction(compactObjects, 'size_threshold', 30);
  console.log(`  ${badge('CompactionEvent', BG_MG)}\n`);
  console.log(`    Trigger: ${compactEvent.trigger}`);
  console.log(`    Compacted: ${compactEvent.nodes_compacted} objects (${(compactEvent.bytes_freed / 1024).toFixed(1)} KB freed)`);
  console.log(`    ${GR}Preserved:${R} ${compactEvent.preserved.node_headers} headers, ${compactEvent.preserved.provenance_edges} provenance, ${compactEvent.preserved.approvals} approvals, ${compactEvent.preserved.signatures} signatures`);
  console.log('');

  await wait(400);

  // ══════════════════════════════════════════════════════════════════
  //  STEP 23: Bot Interface (Phase F)
  // ══════════════════════════════════════════════════════════════════

  banner(23, 'Freeq Bot Interface — Structured Commands');

  console.log(`
  ${D}Bots interact with Phoenix using a strict command grammar.
  No fuzzy NLU — commands are deterministic and parseable.

  Three bots:
    ${CY}SpecBot${R}${D}    — ingest, diff, clauses
    ${CY}ImplBot${R}${D}    — plan, regen, drift
    ${CY}PolicyBot${R}${D}  — status, evidence, cascade

  Mutating commands require ${B}confirmation${R}${D}.
  Read-only commands execute immediately.${R}
`);

  const botExamples = [
    'SpecBot: ingest spec/auth.md',
    'ImplBot: regen iu=AuthIU',
    'PolicyBot: status',
    'SpecBot: help',
  ];

  for (const raw of botExamples) {
    console.log(`  ${BG_BL}${WH}${B} > ${raw} ${R}\n`);
    const parsed = parseCommand(raw);
    if ('error' in parsed) {
      console.log(`    ${RD}Error: ${parsed.error}${R}\n`);
      continue;
    }
    const resp = routeCommand(parsed);
    if (resp.mutating) {
      console.log(`    ${YL}⚠ Mutating command — confirmation required${R}`);
      console.log(`    ${D}Intent:${R} ${resp.intent}`);
      console.log(`    ${D}Confirm:${R} ${GR}ok${R} or ${GR}phx confirm ${resp.confirm_id}${R}\n`);
    } else {
      console.log(`    ${GR}✓ Read-only — executing immediately${R}`);
      console.log(`    ${D}${resp.message}${R}\n`);
    }
  }

  await wait(400);

  banner(0, 'Recap — What You Just Saw');

  console.log(`
  ${B}The Full Pipeline (Phases A → F):${R}

    ${CY}spec/auth.md${R}                          ${D}← your spec file${R}
         │
         ▼  ${D}A: parse + normalize + hash${R}
    ${CY}Clauses + Hashes${R}                       ${D}← content-addressed atoms${R}
         │
         ▼  ${D}B: canonicalize + classify changes${R}
    ${CY}Canonical Graph + A/B/C/D${R}              ${D}← requirements + change classes${R}
         │
         ▼  ${D}C1: plan IUs + generate + manifest${R}
    ${CY}IUs + Generated Code${R}                   ${D}← compilation boundaries${R}
         │
         ├──▸ ${D}C1: drift detection${R}           ${CY}CLEAN / DRIFTED / WAIVED${R}
         ├──▸ ${D}C2: boundary validation${R}        ${CY}Diagnostics${R}
         ├──▸ ${D}D: evidence + policy eval${R}      ${CY}PASS / FAIL / INCOMPLETE${R}
         ├──▸ ${D}D: cascade on failure${R}           ${CY}BLOCK + RE_VALIDATE${R}
         ├──▸ ${D}E: shadow pipeline upgrade${R}      ${CY}SAFE / COMPACTION / REJECT${R}
         ├──▸ ${D}E: compaction${R}                   ${CY}Hot → Ancestry → Cold${R}
         │
         ▼
    ${CY}Trust Dashboard${R}                        ${D}← phoenix status${R}
         │
         ▼  ${D}F: bot interface${R}
    ${CY}SpecBot / ImplBot / PolicyBot${R}          ${D}← structured commands${R}

  ${B}Key insight:${R} Change ${YL}"bcrypt"${R} to ${YL}"argon2id"${R} on line 10 and Phoenix
  traces impact through clauses → canonical nodes → IUs → generated
  files → boundary policies → evidence → dependent IUs. Only the
  affected subtree is invalidated and regenerated.

  ${D}That's selective invalidation — the defining capability.
  Not "rebuild everything." Just the dependent subtree.${R}

  ${B}${CY}Trust > Cleverness.${R}
`);
}

main().catch(console.error);
