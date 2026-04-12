//! Phoenix VCS — Rust Implementation
//! 
//! Regenerative version control that compiles intent to working software.
//! 
//! This is a principled implementation of the Phoenix VCS specification:
//! - Content-addressed identities (SHA-256)
//! - Risk-tiered evidence policies  
//! - Graph-based cascade semantics
//! - Shadow pipeline upgrades
//! - Defensive drift detection
//!
//! ## Core Modules
//!
//! - `identity`: SHA-256 hashing, D-rate tracking, bootstrap states
//! - `drift`: Manifest comparison, waiver system
//! - `boundary`: Dependency extraction, architectural linting
//! - `evidence`: Risk-tiered evidence, policy enforcement
//! - `cascade`: Graph operations, selective invalidation
//! - `shadow`: Pipeline upgrade safety (shadow mode)
//! Phoenix VCS — Native Rust Implementation
//!
//! Implements the spec-driven code generation pipeline using native Rust,
//! avoiding the TypeScript/WASM layer.
//!
//! Modules:
//! - identity: SHA-256 hashing, D-rate tracking, bootstrap states
//! - drift: Manifest comparison, waiver system
//! - boundary: Dependency extraction, architectural linting
//! - evidence: Risk-tiered evidence, policy enforcement
//! - cascade: Graph operations, selective invalidation
//! - shadow: Pipeline upgrade safety
//! - status: Unified diagnostics
//! - pipeline: Spec-to-code generation (μ_ingest → μ_canon → μ_plan → μ_codegen)
// Core modules
pub mod identity;
pub mod drift;
pub mod boundary;
pub mod evidence;
pub mod cascade;
pub mod shadow;
pub mod status;
pub mod cli;
pub mod pipeline;
pub mod lens;
pub mod reverse;

// Re-export core types for convenience
pub use identity::{sha256, canon_id, iu_id, file_hash, short_hash, normalize_text, DRateTracker, BootstrapStateMachine};
pub use drift::{detect_drift, create_waiver, DriftReport, DriftEntry, FileEntry, GeneratedManifest};
pub use boundary::{validate_boundary, extract_dependencies, BoundaryPolicy, BoundaryValidationResult};
pub use evidence::{get_required_evidence, evaluate_policy, RiskTier, EvidenceKind, PolicyEvaluation};
pub use cascade::{build_dependency_graph, compute_cascade, compute_invalidation, CascadeEvent, IUNode, IUGraph};
pub use shadow::{run_shadow_pipeline, compute_shadow_diff, classify_shadow_diff, ShadowResult, UpgradeClassification};
pub use status::{get_vcs_status, VCSState, Severity};
