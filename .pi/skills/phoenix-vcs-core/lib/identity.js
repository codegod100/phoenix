/**
 * Identity utilities - SHA-256 hashing for content-addressed IDs
 */

import { createHash } from 'crypto';

/**
 * Compute SHA-256 hash of normalized text
 */
export function canonId(text) {
  return createHash('sha256').update(text).digest('hex');
}

/**
 * Normalize text for stable hashing
 */
export function normalizeText(text) {
  return text
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .replace(/[^a-z0-9 ]/g, '')
    .trim();
}

/**
 * Hash with clause-specific context
 */
export function clauseSemhash(text) {
  return canonId(`clause:${normalizeText(text)}`);
}

/**
 * Hash with surrounding context
 */
export function contextSemhash(text, sectionContext = [], prevHash = '', nextHash = '') {
  const normalized = normalizeText(text);
  const context = [
    `section:${sectionContext.join('|')}`,
    `prev:${prevHash}`,
    `next:${nextHash}`,
    `text:${normalized}`
  ].join(';');
  return canonId(context);
}

/**
 * Compute IU ID from contract and canon IDs
 */
export function iuId(name, contract, canonIds) {
  const data = JSON.stringify({
    name: normalizeText(name),
    contract: contract,
    source_canon_ids: canonIds.sort()
  });
  return canonId(data);
}

/**
 * Compute file content hash
 */
export function fileHash(content) {
  return canonId(content);
}

/**
 * Change classification types
 */
export const ChangeClass = {
  A_EXACT_MATCH: 'A',
  B_MINOR_REFINEMENT: 'B',
  C_SCOPE_CHANGE: 'C',
  D_MAJOR_CHANGE: 'D'
};

/**
 * Classify change based on semantic similarity
 */
export function classifyChange(oldText, newText) {
  const normalizedOld = normalizeText(oldText);
  const normalizedNew = normalizeText(newText);
  
  if (normalizedOld === normalizedNew) {
    return ChangeClass.A_EXACT_MATCH;
  }
  
  const oldWords = new Set(normalizedOld.split(' '));
  const newWords = new Set(normalizedNew.split(' '));
  
  const intersection = [...oldWords].filter(x => newWords.has(x));
  const union = new Set([...oldWords, ...newWords]);
  const similarity = intersection.length / union.size;
  
  if (similarity > 0.9) return ChangeClass.B_MINOR_REFINEMENT;
  if (similarity > 0.5) return ChangeClass.C_SCOPE_CHANGE;
  return ChangeClass.D_MAJOR_CHANGE;
}

/**
 * D-Rate Tracker for classification quality
 */
export class DRateTracker {
  constructor() {
    this.counts = { A: 0, B: 0, C: 0, D: 0 };
    this.total = 0;
  }
  
  record(classification) {
    if (this.counts[classification] !== undefined) {
      this.counts[classification]++;
      this.total++;
    }
  }
  
  getDRate() {
    return this.total > 0 ? this.counts.D / this.total : 0;
  }
  
  getStatus() {
    const dRate = this.getDRate();
    if (dRate < 0.05) return { level: 'TARGET', dRate };
    if (dRate < 0.10) return { level: 'ACCEPTABLE', dRate };
    if (dRate < 0.15) return { level: 'WARNING', dRate };
    return { level: 'ALARM', dRate };
  }
}

/**
 * Bootstrap state machine
 */
export class BootstrapStateMachine {
  constructor() {
    this.state = 'BOOTSTRAP_COLD';
    this.steadyThreshold = 5;
    this.iterations = 0;
  }
  
  transition(dRateStatus) {
    this.iterations++;
    
    if (this.state === 'BOOTSTRAP_COLD') {
      if (dRateStatus.level === 'TARGET') {
        this.state = 'BOOTSTRAP_WARMING';
      }
    } else if (this.state === 'BOOTSTRAP_WARMING') {
      if (this.iterations >= this.steadyThreshold && dRateStatus.level === 'TARGET') {
        this.state = 'STEADY_STATE';
      }
    }
    
    return this.state;
  }
  
  isDriftDetectionEnabled() {
    return this.state === 'STEADY_STATE';
  }
  
  areDRateAlarmsActive() {
    return this.state === 'STEADY_STATE';
  }
}
