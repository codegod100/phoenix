/**
 * Phoenix VCS Core - Agent-First Shared Utilities
 * 
 * This skill provides shared utilities for all Phoenix VCS skills.
 * Other skills import from here using relative paths.
 * 
 * Usage from other skills:
 *   import { canonId, normalizeText } from '../phoenix-vcs-core/lib/identity.js';
 */

export * from './lib/identity.js';
export * from './lib/drift.js';
export * from './lib/boundary.js';
export * from './lib/evidence.js';
export * from './lib/cascade.js';
export * from './lib/shadow.js';
export * from './lib/status.js';
export * from './lib/types.js';
