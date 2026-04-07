/**
 * Type definitions and utilities
 */

/**
 * @typedef {Object} Clause
 * @property {string} id - Clause ID
 * @property {string} type - Clause type (REQUIREMENT, etc.)
 * @property {string} text - Normalized text
 * @property {string} source_file - Source file path
 * @property {number} line - Line number
 * @property {string} clause_semhash - Content hash
 * @property {string} context_semhash - Context hash
 */

/**
 * @typedef {Object} CanonicalNode
 * @property {string} id - Canonical ID
 * @property {string} type - Node type
 * @property {string} requirement - Requirement text
 * @property {string} node_id - Full node ID
 * @property {string} hash - Content hash
 * @property {string[]} sources - Source clause IDs
 * @property {number} confidence - Confidence score
 */

/**
 * @typedef {Object} ImplementationUnit
 * @property {string} iu_id - IU ID
 * @property {string} name - Human-readable name
 * @property {string} risk_tier - Risk tier (low/medium/high/critical)
 * @property {Object} contract - Implementation contract
 * @property {string[]} source_canon_ids - Source canonical IDs
 * @property {string[]} dependencies - Dependency IU IDs
 * @property {string[]} output_files - Generated file paths
 * @property {Object} boundary_policy - Boundary constraints
 * @property {Object} evidence_requirements - Required evidence
 */

/**
 * @typedef {Object} DriftReport
 * @property {DriftResult[]} results - Per-file results
 * @property {boolean} has_blocking_drift - Whether drift blocks acceptance
 * @property {Object} summary - Summary statistics
 */

/**
 * @typedef {Object} DriftResult
 * @property {string} file - File path
 * @property {string} expected_hash - Expected hash from manifest
 * @property {string} actual_hash - Actual hash
 * @property {string} status - CLEAN/MODIFIED/MISSING
 * @property {boolean} is_blocking - Whether this blocks acceptance
 */

/**
 * @typedef {Object} CascadeEvent
 * @property {string} timestamp - Event timestamp
 * @property {Object} source - Source IU and failure info
 * @property {Object} actions - Actions to take
 * @property {string[]} affected_ius - All affected IU IDs
 * @property {number} cascade_depth - Maximum cascade depth
 */

/**
 * @typedef {Object} VCSStatus
 * @property {string} status - Overall status (HEALTHY/WARNING/CRITICAL)
 * @property {string} bootstrap - Bootstrap state
 * @property {Object} classification - D-rate info
 * @property {Object} drift - Drift summary
 * @property {Object} graph - Graph statistics
 * @property {Diagnostic[]} diagnostics - All diagnostics
 */

/**
 * @typedef {Object} Diagnostic
 * @property {string} severity - error/warning/info
 * @property {string} category - drift/boundary/policy/dependency/classification
 * @property {string} subject - Affected component
 * @property {string} message - Human-readable message
 * @property {string[]} recommended_actions - Steps to resolve
 */

/**
 * Check if value is defined
 */
export function defined(value) {
  return value !== undefined && value !== null;
}

/**
 * Assert condition with message
 */
export function assert(condition, message) {
  if (!condition) {
    throw new Error(`Assertion failed: ${message}`);
  }
}

/**
 * Safe JSON parse with fallback
 */
export function safeJsonParse(text, fallback = null) {
  try {
    return JSON.parse(text);
  } catch {
    return fallback;
  }
}
