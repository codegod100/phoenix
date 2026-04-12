//! Phoenix VCS — Drift Detection Engine
//!
//! Implements PRD Section 9: Drift Detection
//! Compares working tree against generated_manifest to detect:
//! - Unlabeled manual edits
//! - Out-of-sync generated code
//! - Missing requirements

use serde::{Serialize, Deserialize};
use std::collections::HashMap;
use std::path::Path;
use anyhow::{Result, Context};
use crate::identity::{file_hash, short_hash};

/// File entry in the generated manifest
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct FileEntry {
    pub iu_id: String,
    pub hash: String,
    pub size: u64,
    pub generated_at: String,
}

/// Generated manifest tracks what was generated
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct GeneratedManifest {
    pub version: String,
    pub generated_at: String,
    pub files: HashMap<String, FileEntry>,
}

impl GeneratedManifest {
    /// Load manifest from .phoenix/manifests/generated_manifest.json
    pub fn load(project_root: impl AsRef<Path>) -> Result<Option<Self>> {
        let path = project_root.as_ref()
            .join(".phoenix")
            .join("manifests")
            .join("generated_manifest.json");
        
        if !path.exists() {
            return Ok(None);
        }
        
        let content = std::fs::read_to_string(&path)
            .with_context(|| format!("Failed to read manifest at {:?}", path))?;
        
        let manifest = serde_json::from_str(&content)
            .with_context(|| "Failed to parse manifest JSON")?;
        
        Ok(Some(manifest))
    }
    
    /// Save manifest to .phoenix/manifests/generated_manifest.json
    pub fn save(&self, project_root: impl AsRef<Path>) -> Result<()> {
        let path = project_root.as_ref()
            .join(".phoenix")
            .join("manifests")
            .join("generated_manifest.json");
        
        std::fs::create_dir_all(path.parent().unwrap())?;
        
        let content = serde_json::to_string_pretty(self)?;
        std::fs::write(&path, content)
            .with_context(|| format!("Failed to write manifest at {:?}", path))?;
        
        Ok(())
    }
}

/// Waiver types for manual edits
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum WaiverType {
    #[serde(rename = "promote_to_requirement")]
    PromoteToRequirement,
    #[serde(rename = "temporary_patch")]
    TemporaryPatch,
    #[serde(rename = "manual_override")]
    ManualOverride,
}

/// Waiver for manual edits
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Waiver {
    pub waiver_type: WaiverType,
    pub expires: Option<String>,
    pub signed_by: Option<String>,
}

/// Drift status for a file
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum DriftStatus {
    Clean,
    Modified,
    Missing,
    Orphan,
    Waived,
}

/// Single drift entry for a file
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriftEntry {
    pub file: String,
    pub status: DriftStatus,
    pub expected_hash: Option<String>,
    pub actual_hash: Option<String>,
    pub iu_id: String,
    pub waiver: Option<Waiver>,
}

/// Complete drift report
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct DriftReport {
    pub timestamp: String,
    pub project_root: String,
    pub entries: Vec<DriftEntry>,
    pub summary: DriftSummary,
    pub has_blocking_drift: bool,
}

#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct DriftSummary {
    pub clean: usize,
    pub modified: usize,
    pub missing: usize,
    pub orphan: usize,
    pub waived: usize,
}

/// Detect drift between manifest and working tree.
/// Per PRD Section 9: Manual edits must be labeled or they block acceptance.
pub fn detect_drift(
    project_root: impl AsRef<Path>,
    manifest: &GeneratedManifest,
    waivers: &HashMap<String, Waiver>,
) -> Result<DriftReport> {
    let project_root = project_root.as_ref();
    let mut entries = Vec::new();
    let mut modified = 0usize;
    let mut missing = 0usize;
    let mut clean = 0usize;
    let mut waived = 0usize;
    
    // Check each file in manifest
    for (file_path, entry) in &manifest.files {
        let full_path = project_root.join(file_path);
        let waiver = waivers.get(file_path);
        
        if !full_path.exists() {
            // File is missing
            let status = if waiver.is_some() { DriftStatus::Waived } else { DriftStatus::Missing };
            if waiver.is_some() { waived += 1; } else { missing += 1; }
            
            entries.push(DriftEntry {
                file: file_path.clone(),
                status,
                expected_hash: Some(entry.hash.clone()),
                actual_hash: None,
                iu_id: entry.iu_id.clone(),
                waiver: waiver.cloned(),
            });
            continue;
        }
        
        // File exists - check hash
        let content = std::fs::read_to_string(&full_path)
            .with_context(|| format!("Failed to read {}", file_path))?;
        let actual_hash = file_hash(&content);
        
        if actual_hash == entry.hash {
            entries.push(DriftEntry {
                file: file_path.clone(),
                status: DriftStatus::Clean,
                expected_hash: Some(entry.hash.clone()),
                actual_hash: Some(actual_hash),
                iu_id: entry.iu_id.clone(),
                waiver: None,
            });
            clean += 1;
        } else {
            let status = if waiver.is_some() { DriftStatus::Waived } else { DriftStatus::Modified };
            if waiver.is_some() { waived += 1; } else { modified += 1; }
            
            entries.push(DriftEntry {
                file: file_path.clone(),
                status,
                expected_hash: Some(entry.hash.clone()),
                actual_hash: Some(actual_hash),
                iu_id: entry.iu_id.clone(),
                waiver: waiver.cloned(),
            });
        }
    }
    
    // Orphan detection would scan generated directories
    let orphan = 0usize;
    
    let has_blocking_drift = modified > 0 || missing > 0;
    
    Ok(DriftReport {
        timestamp: chrono::Utc::now().to_rfc3339(),
        project_root: project_root.to_string_lossy().to_string(),
        entries,
        summary: DriftSummary {
            clean,
            modified,
            missing,
            orphan,
            waived,
        },
        has_blocking_drift,
    })
}

/// Create a waiver for manual edits (PRD Section 9)
pub fn create_waiver(
    waiver_type: WaiverType,
    expires: Option<String>,
    signed_by: Option<String>,
) -> Waiver {
    Waiver {
        waiver_type,
        expires,
        signed_by,
    }
}

/// Format drift report for display
pub fn format_drift_report(report: &DriftReport) -> String {
    let mut lines = Vec::new();
    lines.push("🔍 Phoenix VCS Drift Detection".to_string());
    lines.push(format!("   {}", report.timestamp));
    lines.push(String::new());
    
    // Group by severity
    let blocking: Vec<_> = report.entries.iter()
        .filter(|e| matches!(e.status, DriftStatus::Modified | DriftStatus::Missing))
        .collect();
    let warnings: Vec<_> = report.entries.iter()
        .filter(|e| matches!(e.status, DriftStatus::Orphan))
        .collect();
    let _ok: Vec<_> = report.entries.iter()
        .filter(|e| matches!(e.status, DriftStatus::Clean))
        .collect();
    let waived: Vec<_> = report.entries.iter()
        .filter(|e| matches!(e.status, DriftStatus::Waived))
        .collect();
    
    if !blocking.is_empty() {
        lines.push("❌ BLOCKING DRIFT (acceptance blocked)".to_string());
        lines.push("   Manual edits detected without waiver. Per PRD Section 9:".to_string());
        lines.push("   \"Manual edits must be labeled: promote_to_requirement, waiver (signed),".to_string());
        lines.push("    or temporary_patch (expires).\"".to_string());
        lines.push(String::new());
        
        for entry in &blocking {
            let short_expected = entry.expected_hash.as_ref()
                .map(|h| short_hash(h))
                .unwrap_or_else(|| "N/A".to_string());
            let short_actual = entry.actual_hash.as_ref()
                .map(|h| short_hash(h))
                .unwrap_or_else(|| "N/A".to_string());
            
            lines.push(format!("   {}", entry.file));
            lines.push(format!("      IU: {}", short_hash(&entry.iu_id)));
            if matches!(entry.status, DriftStatus::Modified) {
                lines.push(format!("      Expected: {} → Actual: {}", short_expected, short_actual));
            } else {
                lines.push(format!("      File missing (expected: {})", short_expected));
            }
        }
        lines.push(String::new());
    }
    
    if !waived.is_empty() {
        lines.push("⚠️  WAIVED DRIFT (documented exceptions)".to_string());
        for entry in &waived {
            let expires = entry.waiver.as_ref()
                .and_then(|w| w.expires.as_ref())
                .map(|e| format!(" (expires: {})", e))
                .unwrap_or_default();
            lines.push(format!("   {}", entry.file));
            lines.push(format!("      Waiver: {:?}{}", entry.waiver.as_ref().unwrap().waiver_type, expires));
        }
        lines.push(String::new());
    }
    
    if !warnings.is_empty() {
        lines.push("⚠️  ORPHAN FILES (not tracked in manifest)".to_string());
        for entry in &warnings {
            lines.push(format!("   {}", entry.file));
        }
        lines.push(String::new());
    }
    
    // Summary
    lines.push("─".repeat(50));
    lines.push(format!(
        "Summary: {} clean, {} modified, {} missing, {} waived",
        report.summary.clean,
        report.summary.modified,
        report.summary.missing,
        report.summary.waived
    ));
    
    if report.has_blocking_drift {
        lines.push(String::new());
        lines.push("Status: 🔴 REJECTED - Drift detected without waivers".to_string());
        lines.push("Action: Label edits with waiver or revert to generated version".to_string());
    } else {
        lines.push("Status: 🟢 ACCEPTED - No blocking drift".to_string());
    }
    
    lines.join("\n")
}

/// Load waivers from .phoenix/waivers.json
pub fn load_waivers(project_root: impl AsRef<Path>) -> Result<HashMap<String, Waiver>> {
    let path = project_root.as_ref().join(".phoenix").join("waivers.json");
    
    if !path.exists() {
        return Ok(HashMap::new());
    }
    
    let content = std::fs::read_to_string(&path)?;
    let waivers: HashMap<String, Waiver> = serde_json::from_str(&content)?;
    Ok(waivers)
}
