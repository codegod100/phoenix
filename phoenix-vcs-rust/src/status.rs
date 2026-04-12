//! Phoenix VCS — Unified Status
//!
//! Implements PRD Section 13: Diagnostics & Severity Model
//! Unified status with grouped diagnostics.

use serde::{Serialize, Deserialize};
use std::path::Path;
use anyhow::Result;
use crate::drift::{GeneratedManifest, detect_drift, load_waivers};

/// Overall VCS state
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VCSState {
    pub status: VCSStatus,
    pub severity: Severity,
    pub timestamp: String,
    pub diagnostics: Vec<Diagnostic>,
    pub drift: Option<DriftSummary>,
    pub evidence: Option<EvidenceSummary>,
    pub dependencies: Option<DependencySummary>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum VCSStatus {
    #[serde(rename = "HEALTHY")]
    Healthy,
    #[serde(rename = "WARNING")]
    Warning,
    #[serde(rename = "CRITICAL")]
    Critical,
}

/// Diagnostic severity levels
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Deserialize)]
pub enum Severity {
    #[serde(rename = "info")]
    Info = 0,
    #[serde(rename = "low")]
    Low = 1,
    #[serde(rename = "medium")]
    Medium = 2,
    #[serde(rename = "high")]
    High = 3,
    #[serde(rename = "critical")]
    Critical = 4,
}

/// Individual diagnostic
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Diagnostic {
    pub severity: Severity,
    pub category: DiagnosticCategory,
    pub message: String,
    pub recommendation: String,
    pub file: Option<String>,
    pub iu_id: Option<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DiagnosticCategory {
    #[serde(rename = "drift")]
    Drift,
    #[serde(rename = "boundary")]
    Boundary,
    #[serde(rename = "evidence")]
    Evidence,
    #[serde(rename = "policy")]
    Policy,
    #[serde(rename = "dependency")]
    Dependency,
    #[serde(rename = "configuration")]
    Configuration,
}

/// Drift summary for status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriftSummary {
    pub has_blocking_drift: bool,
    pub modified_count: usize,
    pub missing_count: usize,
    pub waived_count: usize,
    pub clean_count: usize,
}

/// Evidence summary for status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EvidenceSummary {
    pub accepted_count: usize,
    pub rejected_count: usize,
    pub pending_count: usize,
    pub average_score: u8,
    pub min_tier: String,
}

/// Dependency summary for status
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DependencySummary {
    pub total_ius: usize,
    pub total_edges: usize,
    pub circular_dependencies: Vec<Vec<String>>,
    pub has_circular_deps: bool,
}

/// Get complete VCS status for a project
pub async fn get_vcs_status(project_root: impl AsRef<Path>) -> Result<VCSState> {
    let project_root = project_root.as_ref();
    let mut diagnostics = Vec::new();
    
    // Load manifest
    let manifest = GeneratedManifest::load(project_root)?;
    
    // Check drift
    let drift_summary = if let Some(ref manifest) = manifest {
        let waivers = load_waivers(project_root)?;
        let drift_report = detect_drift(project_root, manifest, &waivers)?;
        
        if drift_report.has_blocking_drift {
            diagnostics.push(Diagnostic {
                severity: Severity::High,
                category: DiagnosticCategory::Drift,
                message: format!(
                    "Blocking drift detected: {} modified, {} missing",
                    drift_report.summary.modified,
                    drift_report.summary.missing
                ),
                recommendation: "Label manual edits with waivers or revert to generated version".to_string(),
                file: None,
                iu_id: None,
            });
        }
        
        Some(DriftSummary {
            has_blocking_drift: drift_report.has_blocking_drift,
            modified_count: drift_report.summary.modified,
            missing_count: drift_report.summary.missing,
            waived_count: drift_report.summary.waived,
            clean_count: drift_report.summary.clean,
        })
    } else {
        diagnostics.push(Diagnostic {
            severity: Severity::Medium,
            category: DiagnosticCategory::Configuration,
            message: "No generated manifest found".to_string(),
            recommendation: "Run phoenix pipeline to generate initial manifest".to_string(),
            file: None,
            iu_id: None,
        });
        None
    };
    
    // Check for .phoenix directory
    let phoenix_dir = project_root.join(".phoenix");
    if !phoenix_dir.exists() {
        diagnostics.push(Diagnostic {
            severity: Severity::Critical,
            category: DiagnosticCategory::Configuration,
            message: "No .phoenix directory found - not a Phoenix project".to_string(),
            recommendation: "Initialize Phoenix VCS with `phoenix init`".to_string(),
            file: None,
            iu_id: None,
        });
    }
    
    // Determine overall status
    let max_severity = diagnostics.iter().map(|d| d.severity).max().unwrap_or(Severity::Info);
    
    let status = match max_severity {
        Severity::Critical => VCSStatus::Critical,
        Severity::High => VCSStatus::Warning,
        Severity::Medium => VCSStatus::Warning,
        _ => VCSStatus::Healthy,
    };
    
    Ok(VCSState {
        status,
        severity: max_severity,
        timestamp: chrono::Utc::now().to_rfc3339(),
        diagnostics,
        drift: drift_summary,
        evidence: None, // Would integrate with evidence collection
        dependencies: None, // Would load from IU graph
    })
}

/// Format VCS status for display
pub fn format_vcs_status(state: &VCSState) -> String {
    let mut lines = Vec::new();
    
    let status_icon = match state.status {
        VCSStatus::Healthy => "🟢",
        VCSStatus::Warning => "🟡",
        VCSStatus::Critical => "🔴",
    };
    
    lines.push(format!("{} Phoenix VCS Status", status_icon));
    lines.push(format!("   {}", state.timestamp));
    lines.push(String::new());
    
    // Group diagnostics by severity
    let critical: Vec<_> = state.diagnostics.iter().filter(|d| d.severity == Severity::Critical).collect();
    let high: Vec<_> = state.diagnostics.iter().filter(|d| d.severity == Severity::High).collect();
    let medium: Vec<_> = state.diagnostics.iter().filter(|d| d.severity == Severity::Medium).collect();
    let low: Vec<_> = state.diagnostics.iter().filter(|d| d.severity == Severity::Low).collect();
    
    if !critical.is_empty() {
        lines.push("🔴 CRITICAL".to_string());
        for diag in &critical {
            lines.push(format_diagnostic(diag));
        }
        lines.push(String::new());
    }
    
    if !high.is_empty() {
        lines.push("🟠 HIGH".to_string());
        for diag in &high {
            lines.push(format_diagnostic(diag));
        }
        lines.push(String::new());
    }
    
    if !medium.is_empty() {
        lines.push("🟡 MEDIUM".to_string());
        for diag in &medium {
            lines.push(format_diagnostic(diag));
        }
        lines.push(String::new());
    }
    
    if !low.is_empty() {
        lines.push("🔵 LOW".to_string());
        for diag in &low {
            lines.push(format_diagnostic(diag));
        }
        lines.push(String::new());
    }
    
    // Drift summary
    if let Some(ref drift) = state.drift {
        lines.push("📊 Drift Summary".to_string());
        lines.push(format!("   Clean: {} files", drift.clean_count));
        lines.push(format!("   Modified: {} files", drift.modified_count));
        lines.push(format!("   Missing: {} files", drift.missing_count));
        lines.push(format!("   Waived: {} files", drift.waived_count));
        if drift.has_blocking_drift {
            lines.push("   ⚠️  BLOCKING: Unlabeled manual edits detected".to_string());
        }
        lines.push(String::new());
    }
    
    // Evidence summary
    if let Some(ref evidence) = state.evidence {
        lines.push("📋 Evidence Summary".to_string());
        lines.push(format!("   Accepted: {} IUs", evidence.accepted_count));
        lines.push(format!("   Rejected: {} IUs", evidence.rejected_count));
        lines.push(format!("   Pending: {} IUs", evidence.pending_count));
        lines.push(format!("   Average Score: {}/100", evidence.average_score));
        lines.push(String::new());
    }
    
    // Dependency summary
    if let Some(ref deps) = state.dependencies {
        lines.push("🔗 Dependency Summary".to_string());
        lines.push(format!("   Total IUs: {}", deps.total_ius));
        lines.push(format!("   Total Edges: {}", deps.total_edges));
        if deps.has_circular_deps {
            lines.push(format!("   ⚠️  Circular Dependencies: {} cycles", deps.circular_dependencies.len()));
        }
        lines.push(String::new());
    }
    
    // Summary
    lines.push("─".repeat(50));
    match state.status {
        VCSStatus::Healthy => {
            lines.push("Status: ✅ HEALTHY - All systems operational".to_string());
        }
        VCSStatus::Warning => {
            lines.push("Status: ⚠️  WARNING - Non-blocking issues detected".to_string());
        }
        VCSStatus::Critical => {
            lines.push("Status: 🔴 CRITICAL - Blocking issues must be resolved".to_string());
        }
    }
    
    if state.diagnostics.is_empty() {
        lines.push("No diagnostics to report".to_string());
    } else {
        lines.push(format!("Total Diagnostics: {}", state.diagnostics.len()));
    }
    
    lines.join("\n")
}

fn format_diagnostic(diag: &Diagnostic) -> String {
    let mut lines = Vec::new();
    lines.push(format!("   [{}] {}", format!("{:?}", diag.category), diag.message));
    if let Some(ref file) = diag.file {
        lines.push(format!("      File: {}", file));
    }
    if let Some(ref iu_id) = diag.iu_id {
        lines.push(format!("      IU: {}...", &iu_id[..8.min(iu_id.len())]));
    }
    lines.push(format!("      → {}", diag.recommendation));
    lines.join("\n")
}

/// Check if project is healthy enough for operations
pub fn is_healthy_enough(state: &VCSState) -> bool {
    state.status != VCSStatus::Critical
}

/// Check if project has blocking drift
pub fn has_blocking_drift(state: &VCSState) -> bool {
    state.drift.as_ref().map(|d| d.has_blocking_drift).unwrap_or(false)
}
