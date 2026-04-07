/**
 * Phoenix VCS — Core Library
 * 
 * Regenerative version control that compiles intent to working software.
 * 
 * This is the principled implementation of the Phoenix VCS specification:
 * - Content-addressed identities (SHA-256)
 * - Risk-tiered evidence policies
 * - Graph-based cascade semantics
 * - Shadow pipeline upgrades
 * - Defensive drift detection
 * 
 * @module phoenix-vcs
 */

// Identity & Hashing (PRD Section 3)
export {
  sha256,
  clauseSemhash,
  contextSemhash,
  canonId,
  iuId,
  fileHash,
  shortHash,
  normalizeText,
  classifyChange,
  DRateTracker,
  BootstrapStateMachine,
  type TwoPassResult,
  type ClassificationResult,
} from './identity.js';

// Drift Detection (PRD Section 9)
export {
  loadManifest,
  detectDrift,
  createWaiver,
  formatDriftReport,
  type FileEntry,
  type GeneratedManifest,
  type DriftEntry,
  type DriftReport,
} from './drift.js';

// Boundary Validation (PRD Section 7)
export {
  defaultBoundaryPolicy,
  extractDependencies,
  validateBoundary,
  detectBoundaryChanges,
  formatBoundaryReport,
  type BoundaryPolicy,
  type EnforcementConfig,
  type ExtractedDependency,
  type ValidationDiagnostic,
  type BoundaryValidationResult,
  type UnitBoundaryChange,
} from './boundary.js';

// Evidence & Policy (PRD Section 10)
export {
  getRequiredEvidence,
  evaluatePolicy,
  runTypecheck,
  runLint,
  runUnitTests,
  createHumanSignoff,
  createThreatNote,
  formatPolicyEvaluation,
  formatPolicyReport,
  type RiskTier,
  type EvidenceKind,
  type EvidenceStatus,
  type EvidenceRecord,
  type EvidencePolicy,
  type PolicyEvaluation,
} from './evidence.js';

// Cascade & Invalidation (PRD Section 11)
export {
  buildDependencyGraph,
  getTransitiveDependents,
  getTransitiveDependencies,
  computeCascade,
  computeInvalidation,
  detectCircularDependencies,
  topologicalSort,
  formatCascadeEvent,
  formatInvalidationReport,
  type IUNode,
  type IUGraph,
  type CascadeAction,
  type CascadeEvent,
} from './cascade.js';

// Shadow Pipeline (PRD Section 5.1)
export {
  computeShadowDiff,
  classifyShadowDiff,
  runShadowPipeline,
  createPipelineUpgradeEvent,
  type ShadowDiffMetrics,
  type UpgradeClassification,
  type ShadowResult,
  type CanonNode,
} from './shadow.js';

// Unified Status (PRD Section 13)
export {
  getVCSStatus,
  formatVCSStatus,
  type VCSState,
} from './status.js';
