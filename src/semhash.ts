/**
 * Semantic hashing for clauses.
 *
 * Two hash types:
 * - clause_semhash: content identity (normalized text only)
 * - context_semhash_cold: local structural context (content + section + neighbors)
 */

import { createHash } from 'node:crypto';

/**
 * Compute SHA-256 hex digest of input string.
 */
export function sha256(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

/**
 * Compute clause_semhash — pure content identity.
 */
export function clauseSemhash(normalizedText: string): string {
  return sha256(normalizedText);
}

/**
 * Compute context_semhash_cold — content + local structural context.
 *
 * Includes:
 * - normalized text
 * - section path (heading hierarchy)
 * - previous clause's semhash (or empty string)
 * - next clause's semhash (or empty string)
 */
export function contextSemhashCold(
  normalizedText: string,
  sectionPath: string[],
  prevClauseSemhash: string,
  nextClauseSemhash: string,
): string {
  const parts = [
    normalizedText,
    sectionPath.join('/'),
    prevClauseSemhash,
    nextClauseSemhash,
  ];
  return sha256(parts.join('\x00'));
}

/**
 * Compute content-addressed clause ID.
 */
export function clauseId(
  sourceDocId: string,
  sectionPath: string[],
  normalizedText: string,
): string {
  return sha256([sourceDocId, sectionPath.join('/'), normalizedText].join('\x00'));
}
