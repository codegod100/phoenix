/**
 * Phoenix VCS Core — Content-Addressed Identity System
 * 
 * Implements the foundational hashing primitives from the original PRD:
 * - clause_semhash: content identity
 * - context_semhash: structural context
 * - iu_id: SHA-256 of contract + source_canon_ids
 * - canon_id: SHA-256 of normalized requirement text
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
 * Based on normalized text only (no structural context).
 */
export function clauseSemhash(normalizedText: string): string {
  return sha256(normalizedText);
}

/**
 * Compute context_semhash — content + structural context.
 * Includes section path and neighboring clause hashes for stability analysis.
 */
export function contextSemhash(
  normalizedText: string,
  sectionPath: string[],
  prevClauseSemhash: string = '',
  nextClauseSemhash: string = ''
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
 * Compute canonical node ID from normalized requirement text.
 * This is the content-addressed identity for requirements.
 */
export function canonId(normalizedText: string): string {
  return sha256(normalizedText);
}

/**
 * Compute Implementation Unit ID from contract and source requirements.
 * This ensures IUs with identical contracts+requirements get identical IDs.
 */
export function iuId(
  name: string,
  contract: string,
  sourceCanonIds: string[]
): string {
  const parts = [
    name.toLowerCase().trim(),
    contract.toLowerCase().trim(),
    ...sourceCanonIds.sort(), // Sort for stability
  ];
  return sha256(parts.join('\x00'));
}

/**
 * Compute file content hash for drift detection.
 */
export function fileHash(content: string): string {
  return sha256(content);
}

/**
 * Compute a short 8-char prefix for human-readable display.
 */
export function shortHash(fullHash: string): string {
  return fullHash.slice(0, 8);
}

/**
 * Normalize text for semantic hashing.
 * - Lowercase
 * - Collapse whitespace
 * - Remove punctuation fluff
 */
export function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[.,!?;:'"\-_]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Two-pass hashing result as defined in PRD Section 3.2
 */
export interface TwoPassResult {
  clauseSemhash: string;
  contextSemhashCold: string; // Before canonical graph context
  contextSemhashWarm?: string; // After canonical graph context
  state: 'BOOTSTRAP_COLD' | 'BOOTSTRAP_WARMING' | 'STEADY_STATE';
}

/**
 * Classification result as defined in PRD Section 4
 */
export interface ClassificationResult {
  class: 'A' | 'B' | 'C' | 'D';
  confidence: number;
  signals: {
    normalizedDiffScore: number;
    clauseDistance: number;
    contextDistance: number;
    termReferenceDelta: number;
    sectionStructureDelta: number;
  };
}

/**
 * Change classification thresholds from PRD Section 4
 */
export function classifyChange(
  oldClauseSemhash: string,
  newClauseSemhash: string,
  oldContextSemhash: string,
  newContextSemhash: string,
  signals: {
    normalizedDiffScore: number;
    termReferenceDelta: number;
    sectionStructureDelta: number;
  }
): ClassificationResult {
  const clauseDistance = oldClauseSemhash === newClauseSemhash ? 0 : 1;
  const contextDistance = oldContextSemhash === newContextSemhash ? 0 : 1;
  
  // Classification logic per PRD
  let cls: 'A' | 'B' | 'C' | 'D';
  let confidence: number;
  
  if (clauseDistance === 0 && signals.normalizedDiffScore < 0.1) {
    cls = 'A'; // Trivial (formatting)
    confidence = 0.95;
  } else if (clauseDistance === 1 && contextDistance === 0 && signals.termReferenceDelta === 0) {
    cls = 'B'; // Local semantic change
    confidence = 0.85;
  } else if (contextDistance === 1 && signals.sectionStructureDelta < 0.5) {
    cls = 'C'; // Contextual semantic shift
    confidence = 0.70;
  } else {
    cls = 'D'; // Uncertain
    confidence = 0.50;
  }
  
  return {
    class: cls,
    confidence,
    signals: {
      normalizedDiffScore: signals.normalizedDiffScore,
      clauseDistance,
      contextDistance,
      termReferenceDelta: signals.termReferenceDelta,
      sectionStructureDelta: signals.sectionStructureDelta,
    },
  };
}

/**
 * D-Rate tracker as defined in PRD Section 4.1
 */
export class DRateTracker {
  private classifications: Array<{ class: 'A' | 'B' | 'C' | 'D'; timestamp: number }> = [];
  private readonly windowSize: number;
  private readonly targetRate = 0.05; // 5%
  private readonly acceptableRate = 0.10; // 10%
  private readonly alarmRate = 0.15; // 15%
  
  constructor(windowSize: number = 100) {
    this.windowSize = windowSize;
  }
  
  record(cls: 'A' | 'B' | 'C' | 'D') {
    this.classifications.push({ class: cls, timestamp: Date.now() });
    if (this.classifications.length > this.windowSize) {
      this.classifications.shift();
    }
  }
  
  getDRate(): number {
    if (this.classifications.length === 0) return 0;
    const dCount = this.classifications.filter(c => c.class === 'D').length;
    return dCount / this.classifications.length;
  }
  
  getStatus(): { 
    dRate: number; 
    level: 'TARGET' | 'ACCEPTABLE' | 'ALARM';
    message: string;
  } {
    const dRate = this.getDRate();
    let level: 'TARGET' | 'ACCEPTABLE' | 'ALARM';
    let message: string;
    
    if (dRate <= this.targetRate) {
      level = 'TARGET';
      message = `D-rate ${(dRate * 100).toFixed(1)}% within target (≤5%)`;
    } else if (dRate <= this.acceptableRate) {
      level = 'ACCEPTABLE';
      message = `D-rate ${(dRate * 100).toFixed(1)}% acceptable but above target (≤10%)`;
    } else {
      level = 'ALARM';
      message = `D-rate ${(dRate * 100).toFixed(1)}% exceeds acceptable threshold (>10%) — classifier tuning required`;
    }
    
    return { dRate, level, message };
  }
  
  /**
   * Check if D-rate alarm should trigger (per PRD: alarm at >15%)
   */
  isAlarm(): boolean {
    return this.getDRate() > this.alarmRate;
  }
}

/**
 * Bootstrap state machine from PRD Section 3.2
 */
export class BootstrapStateMachine {
  state: 'BOOTSTRAP_COLD' | 'BOOTSTRAP_WARMING' | 'STEADY_STATE' = 'BOOTSTRAP_COLD';
  stabilizationCount = 0;
  private readonly stabilizationThreshold = 3;
  
  transitionColdToWarming() {
    if (this.state === 'BOOTSTRAP_COLD') {
      this.state = 'BOOTSTRAP_WARMING';
    }
  }
  
  recordStabilizationAttempt(isStable: boolean) {
    if (this.state !== 'BOOTSTRAP_WARMING') return;
    
    if (isStable) {
      this.stabilizationCount++;
      if (this.stabilizationCount >= this.stabilizationThreshold) {
        this.state = 'STEADY_STATE';
      }
    } else {
      this.stabilizationCount = 0; // Reset on instability
    }
  }
  
  /**
   * During cold/warming, D-rate alarms are suppressed (PRD 4.1)
   */
  shouldSuppressDRateAlarms(): boolean {
    return this.state !== 'STEADY_STATE';
  }
}
