//! Phoenix VCS Core — Content-Addressed Identity System
//!
//! Implements the foundational hashing primitives:
//! - clause_semhash: content identity
//! - context_semhash: structural context
//! - iu_id: SHA-256 of contract + source_canon_ids
//! - canon_id: SHA-256 of normalized requirement text

use sha2::{Sha256, Digest};
use serde::{Serialize, Deserialize};

/// Compute SHA-256 hex digest of input string.
pub fn sha256(input: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(input.as_bytes());
    hex::encode(hasher.finalize())
}

/// Compute clause_semhash — pure content identity.
/// Based on normalized text only (no structural context).
pub fn clause_semhash(normalized_text: &str) -> String {
    sha256(normalized_text)
}

/// Compute context_semhash — content + structural context.
/// Includes section path and neighboring clause hashes for stability analysis.
pub fn context_semhash(
    normalized_text: &str,
    section_path: &[String],
    prev_clause_semhash: Option<&str>,
    next_clause_semhash: Option<&str>,
) -> String {
    let parts = [
        normalized_text.to_string(),
        section_path.join("/"),
        prev_clause_semhash.unwrap_or("").to_string(),
        next_clause_semhash.unwrap_or("").to_string(),
    ];
    sha256(&parts.join("\x00"))
}

/// Compute canonical node ID from normalized requirement text.
/// This is the content-addressed identity for requirements.
pub fn canon_id(normalized_text: &str) -> String {
    sha256(normalized_text)
}

/// Compute Implementation Unit ID from contract and source requirements.
/// This ensures IUs with identical contracts+requirements get identical IDs.
pub fn iu_id(name: &str, contract: &str, source_canon_ids: &[String]) -> String {
    let mut sorted_ids = source_canon_ids.to_vec();
    sorted_ids.sort();
    let parts = [
        name.to_lowercase().trim().to_string(),
        contract.to_lowercase().trim().to_string(),
        sorted_ids.join("\x00"),
    ];
    sha256(&parts.join("\x00"))
}

/// Compute file content hash for drift detection.
pub fn file_hash(content: &str) -> String {
    sha256(content)
}

/// Compute a short 8-char prefix for human-readable display.
pub fn short_hash(full_hash: &str) -> String {
    full_hash.chars().take(8).collect()
}

/// Normalize text for semantic hashing.
/// - Lowercase
/// - Collapse whitespace
/// - Remove punctuation fluff
pub fn normalize_text(text: &str) -> String {
    text.to_lowercase()
        .replace(|c: char| c.is_ascii_punctuation() && c != '\'', " ")
        .split_whitespace()
        .collect::<Vec<_>>()
        .join(" ")
}

/// Change classification: A, B, C, or D
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum ChangeClass {
    /// Trivial (formatting only)
    A,
    /// Local semantic change
    B,
    /// Contextual semantic shift
    C,
    /// Uncertain - requires manual review
    D,
}

/// Signals used for change classification
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationSignals {
    pub normalized_diff_score: f64,
    pub term_reference_delta: f64,
    pub section_structure_delta: f64,
}

/// Classification result with confidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ClassificationResult {
    pub class: ChangeClass,
    pub confidence: f64,
    pub signals: ClassificationSignals,
    pub clause_distance: u8,  // 0 or 1
    pub context_distance: u8, // 0 or 1
}

/// Classify a change based on hash distances and signals
pub fn classify_change(
    old_clause_semhash: &str,
    new_clause_semhash: &str,
    old_context_semhash: &str,
    new_context_semhash: &str,
    signals: ClassificationSignals,
) -> ClassificationResult {
    let clause_distance = if old_clause_semhash == new_clause_semhash { 0 } else { 1 };
    let context_distance = if old_context_semhash == new_context_semhash { 0 } else { 1 };
    
    // Classification logic per PRD
    let (class, confidence) = if clause_distance == 0 && signals.normalized_diff_score < 0.1 {
        (ChangeClass::A, 0.95) // Trivial
    } else if clause_distance == 1 && context_distance == 0 && signals.term_reference_delta == 0.0 {
        (ChangeClass::B, 0.85) // Local semantic
    } else if context_distance == 1 && signals.section_structure_delta < 0.5 {
        (ChangeClass::C, 0.70) // Contextual
    } else {
        (ChangeClass::D, 0.50) // Uncertain
    };
    
    ClassificationResult {
        class,
        confidence,
        signals: ClassificationSignals {
            normalized_diff_score: signals.normalized_diff_score,
            term_reference_delta: signals.term_reference_delta,
            section_structure_delta: signals.section_structure_delta,
        },
        clause_distance,
        context_distance,
    }
}

/// D-Rate tracker as defined in PRD Section 4.1
#[derive(Debug, Clone)]
pub struct DRateTracker {
    classifications: Vec<(ChangeClass, chrono::DateTime<chrono::Utc>)>,
    window_size: usize,
    target_rate: f64,      // 5%
    acceptable_rate: f64,  // 10%
    alarm_rate: f64,       // 15%
}

impl Default for DRateTracker {
    fn default() -> Self {
        Self::new(100)
    }
}

impl DRateTracker {
    pub fn new(window_size: usize) -> Self {
        Self {
            classifications: Vec::with_capacity(window_size),
            window_size,
            target_rate: 0.05,
            acceptable_rate: 0.10,
            alarm_rate: 0.15,
        }
    }
    
    pub fn record(&mut self, class: ChangeClass) {
        self.classifications.push((class, chrono::Utc::now()));
        if self.classifications.len() > self.window_size {
            self.classifications.remove(0);
        }
    }
    
    pub fn get_d_rate(&self) -> f64 {
        if self.classifications.is_empty() {
            return 0.0;
        }
        let d_count = self.classifications
            .iter()
            .filter(|(c, _)| matches!(c, ChangeClass::D))
            .count();
        d_count as f64 / self.classifications.len() as f64
    }
    
    pub fn get_status(&self) -> DRateStatus {
        let d_rate = self.get_d_rate();
        let (level, message) = if d_rate <= self.target_rate {
            (
                DRateLevel::Target,
                format!("D-rate {:.1}% within target (≤5%)", d_rate * 100.0)
            )
        } else if d_rate <= self.acceptable_rate {
            (
                DRateLevel::Acceptable,
                format!("D-rate {:.1}% acceptable but above target (≤10%)", d_rate * 100.0)
            )
        } else {
            (
                DRateLevel::Alarm,
                format!(
                    "D-rate {:.1}% exceeds acceptable threshold (>10%) — classifier tuning required",
                    d_rate * 100.0
                )
            )
        };
        
        DRateStatus {
            d_rate,
            level,
            message,
        }
    }
    
    /// Check if D-rate alarm should trigger (per PRD: alarm at >15%)
    pub fn is_alarm(&self) -> bool {
        self.get_d_rate() > self.alarm_rate
    }
}

#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum DRateLevel {
    Target,
    Acceptable,
    Alarm,
}

#[derive(Debug, Clone)]
pub struct DRateStatus {
    pub d_rate: f64,
    pub level: DRateLevel,
    pub message: String,
}

/// Bootstrap state machine from PRD Section 3.2
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum BootstrapState {
    BootstrapCold,
    BootstrapWarming,
    SteadyState,
}

/// Bootstrap state machine tracks stabilization
#[derive(Debug, Clone)]
pub struct BootstrapStateMachine {
    pub state: BootstrapState,
    stabilization_count: u32,
    stabilization_threshold: u32,
}

impl Default for BootstrapStateMachine {
    fn default() -> Self {
        Self::new()
    }
}

impl BootstrapStateMachine {
    pub fn new() -> Self {
        Self {
            state: BootstrapState::BootstrapCold,
            stabilization_count: 0,
            stabilization_threshold: 3,
        }
    }
    
    pub fn transition_cold_to_warming(&mut self) {
        if self.state == BootstrapState::BootstrapCold {
            self.state = BootstrapState::BootstrapWarming;
        }
    }
    
    pub fn record_stabilization_attempt(&mut self, is_stable: bool) {
        if self.state != BootstrapState::BootstrapWarming {
            return;
        }
        
        if is_stable {
            self.stabilization_count += 1;
            if self.stabilization_count >= self.stabilization_threshold {
                self.state = BootstrapState::SteadyState;
            }
        } else {
            self.stabilization_count = 0; // Reset on instability
        }
    }
    
    /// During cold/warming, D-rate alarms are suppressed (PRD 4.1)
    pub fn should_suppress_d_rate_alarms(&self) -> bool {
        self.state != BootstrapState::SteadyState
    }
}

/// CanonNode represents a canonical requirement node
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonNode {
    pub id: String,
    pub node_type: CanonNodeType,
    pub text: String,
    pub confidence: f64,
    pub edges: Vec<CanonEdge>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum CanonNodeType {
    Requirement,
    Constraint,
    Invariant,
    Definition,
    Context,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CanonEdge {
    pub to: String,
    pub edge_type: String,
}
