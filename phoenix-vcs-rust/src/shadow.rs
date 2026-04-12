//! Phoenix VCS — Shadow Pipeline
//!
//! Implements PRD Section 5.1: Shadow Canonicalization (Upgrade Mode)
//! Run old and new pipelines in parallel, classify diff as SAFE/COMPACTION_EVENT/REJECT.

use serde::{Serialize, Deserialize};
use crate::identity::{sha256, CanonNode};

/// Metrics from comparing two canonical graphs
#[derive(Debug, Clone, Copy, Serialize, Deserialize)]
pub struct ShadowDiffMetrics {
    pub node_change_pct: f64,
    pub edge_change_pct: f64,
    pub risk_escalations: u32,
    pub orphan_nodes: u32,
    pub out_of_scope_growth: f64,
    pub semantic_stmt_drift: f64,
}

/// Classification of shadow diff
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
pub enum UpgradeClassification {
    #[serde(rename = "SAFE")]
    Safe,
    #[serde(rename = "COMPACTION_EVENT")]
    CompactionEvent,
    #[serde(rename = "REJECT")]
    Reject,
}

/// Result of shadow pipeline comparison
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ShadowResult {
    pub old_pipeline_id: String,
    pub new_pipeline_id: String,
    pub old_nodes: Vec<CanonNode>,
    pub new_nodes: Vec<CanonNode>,
    pub metrics: ShadowDiffMetrics,
    pub classification: UpgradeClassification,
    pub diff_report: String,
}

/// Compute shadow diff metrics between old and new canonical graphs.
/// Per PRD 5.1: Classify as SAFE, COMPACTION_EVENT, or REJECT.
pub fn compute_shadow_diff(old_nodes: &[CanonNode], new_nodes: &[CanonNode]) -> ShadowDiffMetrics {
    let old_ids: std::collections::HashSet<_> = old_nodes.iter().map(|n| &n.id).collect();
    let new_ids: std::collections::HashSet<_> = new_nodes.iter().map(|n| &n.id).collect();
    
    // Nodes that exist in both
    let shared_ids: std::collections::HashSet<_> = old_ids.intersection(&new_ids).collect();
    
    // Orphan nodes: exist in old but not in new
    let orphan_nodes: Vec<_> = old_ids.difference(&new_ids).collect();
    
    // Out of scope growth: new nodes not in old
    let new_scope_nodes: Vec<_> = new_ids.difference(&old_ids).collect();
    
    // Node change percentage
    let node_change_pct = if !old_ids.is_empty() {
        let changed_count = orphan_nodes.len() + new_scope_nodes.iter()
            .filter(|&&id| {
                let new_node = new_nodes.iter().find(|n| &n.id == *id).unwrap();
                // Check if similar content exists in old
                !old_nodes.iter().any(|old| &old.id != *id && old.text == new_node.text)
            })
            .count();
        (changed_count as f64 / old_ids.len() as f64) * 100.0
    } else {
        0.0
    };
    
    // Edge changes
    let old_edges = count_edges(old_nodes);
    let new_edges = count_edges(new_nodes);
    let edge_change_pct = if old_edges > 0 {
        ((new_edges as f64 - old_edges as f64).abs() / old_edges as f64) * 100.0
    } else {
        0.0
    };
    
    // Risk escalations: low confidence → high confidence (good) or vice versa (bad)
    let risk_escalations = shared_ids.iter()
        .filter(|&&id| {
            let old_node = old_nodes.iter().find(|n| &n.id == *id).unwrap();
            let new_node = new_nodes.iter().find(|n| &n.id == *id).unwrap();
            // Escalation: confidence dropped significantly
            old_node.confidence - new_node.confidence > 0.2
        })
        .count() as u32;
    
    // Semantic statement drift
    let semantic_drift: f64 = shared_ids.iter()
        .map(|&&id| {
            let old_node = old_nodes.iter().find(|n| &n.id == id).unwrap();
            let new_node = new_nodes.iter().find(|n| &n.id == id).unwrap();
            
            if old_node.text != new_node.text {
                1.0 - text_similarity(&old_node.text, &new_node.text)
            } else {
                0.0
            }
        })
        .sum();
    
    let semantic_drift_pct = if !shared_ids.is_empty() {
        (semantic_drift / shared_ids.len() as f64) * 100.0
    } else {
        0.0
    };
    
    // Out of scope growth percentage
    let out_of_scope_growth = if !old_ids.is_empty() {
        (new_scope_nodes.len() as f64 / old_ids.len() as f64) * 100.0
    } else {
        0.0
    };
    
    ShadowDiffMetrics {
        node_change_pct: node_change_pct,
        edge_change_pct: edge_change_pct,
        risk_escalations,
        orphan_nodes: orphan_nodes.len() as u32,
        out_of_scope_growth,
        semantic_stmt_drift: semantic_drift_pct,
    }
}

/// Classify shadow diff per PRD thresholds:
/// - SAFE: node_change_pct ≤3%, no orphan nodes, no risk escalations
/// - COMPACTION_EVENT: node_change_pct ≤25%, no orphan nodes, limited risk escalations
/// - REJECT: orphan nodes exist, excessive churn, semantic drift large
pub fn classify_shadow_diff(metrics: ShadowDiffMetrics) -> UpgradeClassification {
    // REJECT conditions (hard failures)
    if metrics.orphan_nodes > 0 {
        return UpgradeClassification::Reject;
    }
    
    if metrics.node_change_pct > 50.0 {
        return UpgradeClassification::Reject;
    }
    
    if metrics.semantic_stmt_drift > 30.0 {
        return UpgradeClassification::Reject;
    }
    
    // COMPACTION_EVENT conditions
    if metrics.node_change_pct > 3.0 {
        return UpgradeClassification::CompactionEvent;
    }
    
    if metrics.risk_escalations > 2 {
        return UpgradeClassification::CompactionEvent;
    }
    
    if metrics.out_of_scope_growth > 10.0 {
        return UpgradeClassification::CompactionEvent;
    }
    
    // SAFE
    UpgradeClassification::Safe
}

/// Run shadow pipeline: compare old vs new canonicalization.
pub fn run_shadow_pipeline(
    old_nodes: Vec<CanonNode>,
    new_nodes: Vec<CanonNode>,
    old_pipeline_version: &str,
    new_pipeline_version: &str,
) -> ShadowResult {
    let metrics = compute_shadow_diff(&old_nodes, &new_nodes);
    let classification = classify_shadow_diff(metrics);
    
    // Generate diff report
    let diff_report = format_shadow_diff(&old_nodes, &new_nodes, metrics, classification);
    
    ShadowResult {
        old_pipeline_id: sha256(old_pipeline_version),
        new_pipeline_id: sha256(new_pipeline_version),
        old_nodes,
        new_nodes,
        metrics,
        classification,
        diff_report,
    }
}

/// Helper: count total edges in graph
fn count_edges(nodes: &[CanonNode]) -> usize {
    nodes.iter().map(|n| n.edges.len()).sum()
}

/// Simple text similarity (0-1) using word overlap
fn text_similarity(a: &str, b: &str) -> f64 {
    let a_lower = a.to_lowercase();
    let b_lower = b.to_lowercase();
    
    let words_a: std::collections::HashSet<_> = a_lower
        .split_whitespace()
        .collect();
    let words_b: std::collections::HashSet<_> = b_lower
        .split_whitespace()
        .collect();
    
    let intersection: std::collections::HashSet<_> = words_a.intersection(&words_b).collect();
    let union: std::collections::HashSet<_> = words_a.union(&words_b).collect();
    
    if union.is_empty() {
        0.0
    } else {
        intersection.len() as f64 / union.len() as f64
    }
}

/// Format shadow diff for human review
pub fn format_shadow_diff(
    old_nodes: &[CanonNode],
    new_nodes: &[CanonNode],
    metrics: ShadowDiffMetrics,
    classification: UpgradeClassification,
) -> String {
    let mut lines = Vec::new();
    
    let icon = match classification {
        UpgradeClassification::Safe => "✅",
        UpgradeClassification::CompactionEvent => "⚠️",
        UpgradeClassification::Reject => "❌",
    };
    
    lines.push(format!("{} Shadow Pipeline Classification: {:?}", icon, classification));
    lines.push(String::new());
    lines.push("Metrics:".to_string());
    lines.push(format!(
        "  Node change: {:.1}% (threshold: 3% SAFE, 25% COMPACTION)",
        metrics.node_change_pct
    ));
    lines.push(format!("  Edge change: {:.1}%", metrics.edge_change_pct));
    lines.push(format!("  Risk escalations: {}", metrics.risk_escalations));
    lines.push(format!("  Orphan nodes: {} (REJECT if >0)", metrics.orphan_nodes));
    lines.push(format!("  Scope growth: {:.1}%", metrics.out_of_scope_growth));
    lines.push(format!("  Semantic drift: {:.1}%", metrics.semantic_stmt_drift));
    lines.push(String::new());
    
    // Node-by-node comparison
    let old_ids: std::collections::HashSet<_> = old_nodes.iter().map(|n| &n.id).collect();
    let new_ids: std::collections::HashSet<_> = new_nodes.iter().map(|n| &n.id).collect();
    
    let removed: Vec<_> = old_nodes.iter().filter(|n| !new_ids.contains(&n.id)).collect();
    let added: Vec<_> = new_nodes.iter().filter(|n| !old_ids.contains(&n.id)).collect();
    let changed: Vec<_> = old_nodes.iter()
        .filter_map(|old| {
            new_nodes.iter().find(|n| n.id == old.id && n.text != old.text)
                .map(|new| (old, new))
        })
        .collect();
    
    if !removed.is_empty() {
        lines.push(format!("Removed nodes ({}):", removed.len()));
        for n in removed.iter().take(5) {
            lines.push(format!("  - {}...: {}...", &n.id[..8.min(n.id.len())], &n.text[..50.min(n.text.len())]));
        }
        if removed.len() > 5 {
            lines.push(format!("  ... and {} more", removed.len() - 5));
        }
        lines.push(String::new());
    }
    
    if !added.is_empty() {
        lines.push(format!("Added nodes ({}):", added.len()));
        for n in added.iter().take(5) {
            lines.push(format!("  + {}...: {}...", &n.id[..8.min(n.id.len())], &n.text[..50.min(n.text.len())]));
        }
        if added.len() > 5 {
            lines.push(format!("  ... and {} more", added.len() - 5));
        }
        lines.push(String::new());
    }
    
    if !changed.is_empty() {
        lines.push(format!("Changed nodes ({}):", changed.len()));
        for (old, new) in changed.iter().take(5) {
            lines.push(format!("  ~ {}...:", &old.id[..8.min(old.id.len())]));
            lines.push(format!("      OLD: {}...", &old.text[..40.min(old.text.len())]));
            lines.push(format!("      NEW: {}...", &new.text[..40.min(new.text.len())]));
        }
        if changed.len() > 5 {
            lines.push(format!("  ... and {} more", changed.len() - 5));
        }
        lines.push(String::new());
    }
    
    // Recommendation
    lines.push("Recommendation:".to_string());
    match classification {
        UpgradeClassification::Safe => {
            lines.push("  ✅ SAFE to upgrade. Changes are minimal and non-breaking.".to_string());
            lines.push("  Action: Accept new pipeline version.".to_string());
        }
        UpgradeClassification::CompactionEvent => {
            lines.push("  ⚠️ COMPACTION EVENT. Significant but manageable changes.".to_string());
            lines.push("  Action: Review changes, run full validation, then accept.".to_string());
        }
        UpgradeClassification::Reject => {
            lines.push("  ❌ REJECT. Breaking changes or orphan nodes detected.".to_string());
            lines.push("  Action: Tune new pipeline or accept data loss (not recommended).".to_string());
        }
    }
    
    lines.join("\n")
}

/// Pipeline upgrade event for storage
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PipelineUpgradeEvent {
    pub event_type: String,
    pub old_pipeline_id: String,
    pub new_pipeline_id: String,
    pub classification: UpgradeClassification,
    pub metrics: ShadowDiffMetrics,
    pub accepted: bool,
    pub timestamp: String,
}

/// Create PipelineUpgrade meta-node as specified in PRD 5.1
pub fn create_pipeline_upgrade_event(
    shadow_result: &ShadowResult,
    accepted: bool,
) -> PipelineUpgradeEvent {
    PipelineUpgradeEvent {
        event_type: "PipelineUpgrade".to_string(),
        old_pipeline_id: shadow_result.old_pipeline_id.clone(),
        new_pipeline_id: shadow_result.new_pipeline_id.clone(),
        classification: shadow_result.classification,
        metrics: shadow_result.metrics,
        accepted,
        timestamp: chrono::Utc::now().to_rfc3339(),
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::identity::{CanonNodeType, CanonEdge};

    fn create_test_node(id: &str, text: &str, confidence: f64) -> CanonNode {
        CanonNode {
            id: id.to_string(),
            node_type: CanonNodeType::Requirement,
            text: text.to_string(),
            confidence,
            edges: Vec::new(),
        }
    }

    #[test]
    fn test_safe_classification() {
        let old_nodes = vec![
            create_test_node("a", "test content", 0.9),
        ];
        let new_nodes = vec![
            create_test_node("a", "test content", 0.9), // Same
        ];
        
        let metrics = compute_shadow_diff(&old_nodes, &new_nodes);
        let classification = classify_shadow_diff(metrics);
        
        assert_eq!(classification, UpgradeClassification::Safe);
    }

    #[test]
    fn test_reject_orphan_nodes() {
        let old_nodes = vec![
            create_test_node("a", "test content", 0.9),
            create_test_node("b", "orphan content", 0.9),
        ];
        let new_nodes = vec![
            create_test_node("a", "test content", 0.9), // b is missing
        ];
        
        let metrics = compute_shadow_diff(&old_nodes, &new_nodes);
        assert_eq!(metrics.orphan_nodes, 1);
        
        let classification = classify_shadow_diff(metrics);
        assert_eq!(classification, UpgradeClassification::Reject);
    }

    #[test]
    fn test_compaction_event_threshold() {
        // Create many nodes with some changes (exceeds 3% threshold)
        let mut old_nodes = Vec::new();
        let mut new_nodes = Vec::new();
        
        for i in 0..100 {
            old_nodes.push(create_test_node(&format!("node{}", i), "content", 0.9));
            if i < 97 {
                // 97 nodes unchanged
                new_nodes.push(create_test_node(&format!("node{}", i), "content", 0.9));
            } else {
                // 3 nodes changed (but with same ID, different content)
                new_nodes.push(create_test_node(&format!("node{}", i), "changed content", 0.7));
            }
        }
        // Add 5 new nodes (5% growth)
        for i in 100..105 {
            new_nodes.push(create_test_node(&format!("node{}", i), "new content", 0.9));
        }
        
        let metrics = compute_shadow_diff(&old_nodes, &new_nodes);
        let classification = classify_shadow_diff(metrics);
        
        // Should be COMPACTION_EVENT due to out_of_scope_growth > 10% or node changes > 3%
        assert_eq!(classification, UpgradeClassification::CompactionEvent);
    }
}
