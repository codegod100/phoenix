/**
 * Clause Diff Engine
 *
 * Compares two sets of clauses (before/after) and classifies each change.
 */

import type { Clause, ClauseDiff } from './models/clause.js';
import { DiffType } from './models/clause.js';

/**
 * Diff two clause arrays from the same document.
 *
 * Strategy:
 * 1. Index clauses by normalized_text hash (clause_semhash)
 * 2. Match by content first, then by section_path for moves
 * 3. Remaining unmatched = ADDED or REMOVED
 */
export function diffClauses(before: Clause[], after: Clause[]): ClauseDiff[] {
  const diffs: ClauseDiff[] = [];

  // Build lookup maps
  const beforeBySemhash = new Map<string, Clause[]>();
  const afterBySemhash = new Map<string, Clause[]>();

  for (const c of before) {
    const arr = beforeBySemhash.get(c.clause_semhash) ?? [];
    arr.push(c);
    beforeBySemhash.set(c.clause_semhash, arr);
  }
  for (const c of after) {
    const arr = afterBySemhash.get(c.clause_semhash) ?? [];
    arr.push(c);
    afterBySemhash.set(c.clause_semhash, arr);
  }

  const matchedBefore = new Set<string>();
  const matchedAfter = new Set<string>();

  // Pass 1: Exact matches (same semhash)
  for (const [semhash, beforeClauses] of beforeBySemhash) {
    const afterClauses = afterBySemhash.get(semhash);
    if (!afterClauses) continue;

    const pairCount = Math.min(beforeClauses.length, afterClauses.length);
    for (let i = 0; i < pairCount; i++) {
      const bc = beforeClauses[i];
      const ac = afterClauses[i];
      matchedBefore.add(bc.clause_id);
      matchedAfter.add(ac.clause_id);

      const pathBefore = bc.section_path.join('/');
      const pathAfter = ac.section_path.join('/');

      if (pathBefore === pathAfter) {
        diffs.push({
          diff_type: DiffType.UNCHANGED,
          clause_id_before: bc.clause_id,
          clause_id_after: ac.clause_id,
          clause_before: bc,
          clause_after: ac,
          section_path_before: bc.section_path,
          section_path_after: ac.section_path,
        });
      } else {
        diffs.push({
          diff_type: DiffType.MOVED,
          clause_id_before: bc.clause_id,
          clause_id_after: ac.clause_id,
          clause_before: bc,
          clause_after: ac,
          section_path_before: bc.section_path,
          section_path_after: ac.section_path,
        });
      }
    }
  }

  // Pass 2: Try to match remaining by section_path (MODIFIED)
  const unmatchedBefore = before.filter(c => !matchedBefore.has(c.clause_id));
  const unmatchedAfter = after.filter(c => !matchedAfter.has(c.clause_id));

  const afterByPath = new Map<string, Clause[]>();
  for (const c of unmatchedAfter) {
    const key = c.section_path.join('/');
    const arr = afterByPath.get(key) ?? [];
    arr.push(c);
    afterByPath.set(key, arr);
  }

  const stillUnmatchedBefore: Clause[] = [];
  for (const bc of unmatchedBefore) {
    const key = bc.section_path.join('/');
    const candidates = afterByPath.get(key);
    if (candidates && candidates.length > 0) {
      const ac = candidates.shift()!;
      matchedAfter.add(ac.clause_id);
      diffs.push({
        diff_type: DiffType.MODIFIED,
        clause_id_before: bc.clause_id,
        clause_id_after: ac.clause_id,
        clause_before: bc,
        clause_after: ac,
        section_path_before: bc.section_path,
        section_path_after: ac.section_path,
      });
    } else {
      stillUnmatchedBefore.push(bc);
    }
  }

  // Pass 3: Remaining are REMOVED / ADDED
  for (const bc of stillUnmatchedBefore) {
    diffs.push({
      diff_type: DiffType.REMOVED,
      clause_id_before: bc.clause_id,
      clause_before: bc,
      section_path_before: bc.section_path,
    });
  }

  const stillUnmatchedAfter = unmatchedAfter.filter(c => !matchedAfter.has(c.clause_id));
  for (const ac of stillUnmatchedAfter) {
    diffs.push({
      diff_type: DiffType.ADDED,
      clause_id_after: ac.clause_id,
      clause_after: ac,
      section_path_after: ac.section_path,
    });
  }

  return diffs;
}
