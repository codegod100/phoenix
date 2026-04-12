//! Phoenix VCS — Evidence & Policy Engine
//!
//! Implements PRD Section 10: Evidence & Policy Engine
//! Risk-tiered enforcement with cascading failure semantics.

use serde::{Serialize, Deserialize};
use std::collections::HashMap;

/// Risk tier for Implementation Units
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum RiskTier {
    #[serde(rename = "low")]
    Low,
    #[serde(rename = "medium")]
    Medium,
    #[serde(rename = "high")]
    High,
    #[serde(rename = "critical")]
    Critical,
}

/// Types of evidence that can be collected
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Hash)]
pub enum EvidenceKind {
    #[serde(rename = "typecheck")]
    Typecheck,
    #[serde(rename = "lint")]
    Lint,
    #[serde(rename = "boundary_validation")]
    BoundaryValidation,
    #[serde(rename = "unit_tests")]
    UnitTests,
    #[serde(rename = "property_tests")]
    PropertyTests,
    #[serde(rename = "static_analysis")]
    StaticAnalysis,
    #[serde(rename = "threat_note")]
    ThreatNote,
    #[serde(rename = "human_signoff")]
    HumanSignoff,
    #[serde(rename = "formal_verification")]
    FormalVerification,
}

impl std::fmt::Display for EvidenceKind {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        let s = match self {
            EvidenceKind::Typecheck => "typecheck",
            EvidenceKind::Lint => "lint",
            EvidenceKind::BoundaryValidation => "boundary_validation",
            EvidenceKind::UnitTests => "unit_tests",
            EvidenceKind::PropertyTests => "property_tests",
            EvidenceKind::StaticAnalysis => "static_analysis",
            EvidenceKind::ThreatNote => "threat_note",
            EvidenceKind::HumanSignoff => "human_signoff",
            EvidenceKind::FormalVerification => "formal_verification",
        };
        write!(f, "{}", s)
    }
}

/// Status of evidence collection
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum EvidenceStatus {
    #[serde(rename = "pending")]
    Pending,
    #[serde(rename = "passed")]
    Passed,
    #[serde(rename = "failed")]
    Failed,
    #[serde(rename = "waived")]
    Waived,
}

/// A record of collected evidence
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceRecord {
    pub kind: EvidenceKind,
    pub status: EvidenceStatus,
    pub timestamp: String,
    pub iu_id: String,
    pub details: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub duration_ms: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signed_by: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub signature_hash: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub proof_system: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub test_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pass_count: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fail_count: Option<u32>,
}

/// Evidence policy for a risk tier
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidencePolicy {
    pub tier: RiskTier,
    pub required: Vec<EvidenceKind>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub optional: Option<Vec<EvidenceKind>>,
}

/// Result of policy evaluation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PolicyEvaluation {
    pub iu_id: String,
    pub tier: RiskTier,
    pub records: Vec<EvidenceRecord>,
    pub status: PolicyStatus,
    pub missing_evidence: Vec<EvidenceKind>,
    pub failed_evidence: Vec<EvidenceKind>,
    pub score: u8, // 0-100
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum PolicyStatus {
    #[serde(rename = "ACCEPTED")]
    Accepted,
    #[serde(rename = "REJECTED")]
    Rejected,
    #[serde(rename = "PENDING")]
    Pending,
    #[serde(rename = "WAIVED")]
    Waived,
}

/// Risk-tiered evidence requirements from PRD Section 10
pub fn get_required_evidence(tier: RiskTier) -> Vec<EvidenceKind> {
    match tier {
        RiskTier::Low => vec![
            EvidenceKind::Typecheck,
            EvidenceKind::Lint,
            EvidenceKind::BoundaryValidation,
        ],
        RiskTier::Medium => vec![
            EvidenceKind::Typecheck,
            EvidenceKind::Lint,
            EvidenceKind::BoundaryValidation,
            EvidenceKind::UnitTests,
        ],
        RiskTier::High => vec![
            EvidenceKind::Typecheck,
            EvidenceKind::Lint,
            EvidenceKind::BoundaryValidation,
            EvidenceKind::UnitTests,
            EvidenceKind::PropertyTests,
            EvidenceKind::ThreatNote,
        ],
        RiskTier::Critical => vec![
            EvidenceKind::Typecheck,
            EvidenceKind::Lint,
            EvidenceKind::BoundaryValidation,
            EvidenceKind::UnitTests,
            EvidenceKind::PropertyTests,
            EvidenceKind::ThreatNote,
            EvidenceKind::StaticAnalysis,
            EvidenceKind::HumanSignoff, // or formal_verification
        ],
    }
}

/// Evaluate evidence policy for an IU.
/// Per PRD: "Evidence binds to canonical nodes, IU IDs, generated artifact hashes"
pub fn evaluate_policy(
    iu_id: &str,
    tier: RiskTier,
    records: &[EvidenceRecord],
) -> PolicyEvaluation {
    let required = get_required_evidence(tier);
    let record_map: HashMap<EvidenceKind, &EvidenceRecord> = records
        .iter()
        .map(|r| (r.kind, r))
        .collect();
    
    let mut missing = Vec::new();
    let mut failed = Vec::new();
    let mut passed_count = 0;
    
    for kind in &required {
        match record_map.get(kind) {
            None => missing.push(*kind),
            Some(record) => match record.status {
                EvidenceStatus::Failed => failed.push(*kind),
                EvidenceStatus::Passed | EvidenceStatus::Waived => passed_count += 1,
                EvidenceStatus::Pending => {} // Still pending
            }
        }
    }
    
    // Calculate score
    let total = required.len();
    let score = if total > 0 {
        ((passed_count as f64 / total as f64) * 100.0) as u8
    } else {
        100
    };
    
    // Determine status
    let status = if !failed.is_empty() {
        PolicyStatus::Rejected
    } else if !missing.is_empty() {
        PolicyStatus::Pending
    } else if passed_count == total {
        PolicyStatus::Accepted
    } else {
        PolicyStatus::Pending
    };
    
    PolicyEvaluation {
        iu_id: iu_id.to_string(),
        tier,
        records: records.to_vec(),
        status,
        missing_evidence: missing,
        failed_evidence: failed,
        score,
    }
}

/// Create a human signoff record
pub fn create_human_signoff(
    iu_id: &str,
    signed_by: &str,
    signature_hash: &str,
) -> EvidenceRecord {
    EvidenceRecord {
        kind: EvidenceKind::HumanSignoff,
        status: EvidenceStatus::Passed,
        timestamp: chrono::Utc::now().to_rfc3339(),
        iu_id: iu_id.to_string(),
        details: None,
        duration_ms: None,
        signed_by: Some(signed_by.to_string()),
        signature_hash: Some(signature_hash.to_string()),
        proof_system: None,
        test_count: None,
        pass_count: None,
        fail_count: None,
    }
}

/// Create a threat note (required for high/critical tier)
pub fn create_threat_note(iu_id: &str, threats: &[String]) -> EvidenceRecord {
    EvidenceRecord {
        kind: EvidenceKind::ThreatNote,
        status: EvidenceStatus::Passed,
        timestamp: chrono::Utc::now().to_rfc3339(),
        iu_id: iu_id.to_string(),
        details: Some(threats.join("\n")),
        duration_ms: None,
        signed_by: None,
        signature_hash: None,
        proof_system: None,
        test_count: None,
        pass_count: None,
        fail_count: None,
    }
}

/// Format policy evaluation for display
pub fn format_policy_evaluation(evaluation: &PolicyEvaluation) -> String {
    let mut lines = Vec::new();
    
    let tier_icon = match evaluation.tier {
        RiskTier::Low => "🔵",
        RiskTier::Medium => "🟡",
        RiskTier::High => "🟠",
        RiskTier::Critical => "🔴",
    };
    
    lines.push(format!(
        "{} IU {}... ({} RISK)",
        tier_icon,
        &evaluation.iu_id[..8.min(evaluation.iu_id.len())],
        format!("{:?}", evaluation.tier).to_uppercase()
    ));
    lines.push(format!("   Score: {}/100", evaluation.score));
    lines.push(format!("   Status: {:?}", evaluation.status));
    lines.push(String::new());
    
    // Evidence breakdown
    lines.push("   Evidence:".to_string());
    for record in &evaluation.records {
        let icon = match record.status {
            EvidenceStatus::Passed => "✓",
            EvidenceStatus::Failed => "✗",
            EvidenceStatus::Waived => "−",
            EvidenceStatus::Pending => "○",
        };
        let duration_str = record.duration_ms
            .map(|d| format!(" ({}ms)", d))
            .unwrap_or_default();
        lines.push(format!("      {} {}{}", icon, record.kind, duration_str));
        
        if record.status == EvidenceStatus::Failed {
            if let Some(details) = &record.details {
                lines.push(format!("         {}", &details[..100.min(details.len())]));
            }
        }
    }
    
    if !evaluation.missing_evidence.is_empty() {
        lines.push(String::new());
        lines.push("   Missing (required):".to_string());
        for kind in &evaluation.missing_evidence {
            lines.push(format!("      ○ {}", kind));
        }
    }
    
    if !evaluation.failed_evidence.is_empty() {
        lines.push(String::new());
        lines.push("   Failed:".to_string());
        for kind in &evaluation.failed_evidence {
            lines.push(format!("      ✗ {}", kind));
        }
    }
    
    lines.join("\n")
}

/// Format multi-IU policy report
pub fn format_policy_report(evaluations: &[PolicyEvaluation]) -> String {
    let mut lines = Vec::new();
    lines.push("📋 Phoenix VCS Evidence & Policy Report".to_string());
    lines.push(String::new());
    
    let accepted: Vec<_> = evaluations.iter()
        .filter(|e| matches!(e.status, PolicyStatus::Accepted))
        .collect();
    let rejected: Vec<_> = evaluations.iter()
        .filter(|e| matches!(e.status, PolicyStatus::Rejected))
        .collect();
    let pending: Vec<_> = evaluations.iter()
        .filter(|e| matches!(e.status, PolicyStatus::Pending))
        .collect();
    
    for e in &rejected {
        lines.push(format_policy_evaluation(e));
        lines.push(String::new());
    }
    
    for e in &pending {
        lines.push(format_policy_evaluation(e));
        lines.push(String::new());
    }
    
    let avg_score = if !evaluations.is_empty() {
        evaluations.iter().map(|e| e.score as u32).sum::<u32>() / evaluations.len() as u32
    } else {
        100
    };
    
    lines.push("─".repeat(50));
    lines.push(format!(
        "Summary: {} accepted, {} rejected, {} pending",
        accepted.len(),
        rejected.len(),
        pending.len()
    ));
    lines.push(format!("Average Score: {}/100", avg_score));
    
    if !rejected.is_empty() {
        lines.push(String::new());
        lines.push("Status: 🔴 REJECTED - Some IUs failed policy evaluation".to_string());
    } else if !pending.is_empty() {
        lines.push(String::new());
        lines.push("Status: 🟡 PENDING - Evidence collection incomplete".to_string());
    } else {
        lines.push(String::new());
        lines.push("Status: 🟢 ACCEPTED - All policy requirements met".to_string());
    }
    
    lines.join("\n")
}

/// Mock evidence runners (would integrate with actual tools)
pub mod runners {
    use super::*;
    
    /// Run typecheck evidence
    pub async fn run_typecheck(_project_root: &str) -> EvidenceRecord {
        // In a real implementation, this would run `cargo check` or `tsc --noEmit`
        EvidenceRecord {
            kind: EvidenceKind::Typecheck,
            status: EvidenceStatus::Passed,
            timestamp: chrono::Utc::now().to_rfc3339(),
            iu_id: "global".to_string(),
            details: Some("Typecheck passed (mock)".to_string()),
            duration_ms: Some(100),
            signed_by: None,
            signature_hash: None,
            proof_system: None,
            test_count: None,
            pass_count: None,
            fail_count: None,
        }
    }
    
    /// Run lint evidence
    pub async fn run_lint(_project_root: &str) -> EvidenceRecord {
        EvidenceRecord {
            kind: EvidenceKind::Lint,
            status: EvidenceStatus::Passed,
            timestamp: chrono::Utc::now().to_rfc3339(),
            iu_id: "global".to_string(),
            details: Some("Lint passed (mock)".to_string()),
            duration_ms: Some(50),
            signed_by: None,
            signature_hash: None,
            proof_system: None,
            test_count: None,
            pass_count: None,
            fail_count: None,
        }
    }
    
    /// Run unit tests
    pub async fn run_unit_tests(iu_id: &str, _test_pattern: Option<&str>) -> EvidenceRecord {
        EvidenceRecord {
            kind: EvidenceKind::UnitTests,
            status: EvidenceStatus::Passed,
            timestamp: chrono::Utc::now().to_rfc3339(),
            iu_id: iu_id.to_string(),
            details: Some("All tests passed (mock)".to_string()),
            duration_ms: Some(200),
            signed_by: None,
            signature_hash: None,
            proof_system: None,
            test_count: Some(10),
            pass_count: Some(10),
            fail_count: Some(0),
        }
    }
}
