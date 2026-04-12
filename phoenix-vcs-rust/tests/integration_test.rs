//! Integration tests for Phoenix VCS Rust client

use std::collections::HashMap;
use phoenix_vcs::*;
use tempfile::TempDir;

#[test]
fn test_identity_hashing() {
    // Test canonical ID generation
    let text = "System shall validate email format";
    let normalized = normalize_text(text);
    let id = canon_id(&normalized);
    
    assert_eq!(id.len(), 64); // SHA-256 hex is 64 chars
    
    // Same text should produce same ID
    let id2 = canon_id(&normalize_text(text));
    assert_eq!(id, id2);
    
    // Different text should produce different ID
    let id3 = canon_id(&normalize_text("Different requirement"));
    assert_ne!(id, id3);
}

#[test]
fn test_iu_id_generation() {
    let name = "AuthModule";
    let contract = "Handles login";
    let canon_ids = vec![
        "abc123".to_string(),
        "def456".to_string(),
    ];
    
    let id1 = iu_id(name, contract, &canon_ids);
    
    // Same inputs should produce same ID
    let id2 = iu_id(name, contract, &canon_ids);
    assert_eq!(id1, id2);
    
    // Different order should produce same ID (sorted)
    let canon_ids_rev = vec![
        "def456".to_string(),
        "abc123".to_string(),
    ];
    let id3 = iu_id(name, contract, &canon_ids_rev);
    assert_eq!(id1, id3);
    
    // Different contract should produce different ID
    let id4 = iu_id(name, "Different contract", &canon_ids);
    assert_ne!(id1, id4);
}

#[test]
fn test_d_rate_tracker() {
    let mut tracker = DRateTracker::new(100);
    
    // Initially should be 0
    assert_eq!(tracker.get_d_rate(), 0.0);
    assert!(matches!(tracker.get_status().level, identity::DRateLevel::Target));
    
    // Record some D-class changes
    for _ in 0..10 {
        tracker.record(identity::ChangeClass::D);
    }
    
    // Record many non-D changes
    for _ in 0..90 {
        tracker.record(identity::ChangeClass::A);
    }
    
    // D-rate should be 10%
    assert_eq!(tracker.get_d_rate(), 0.1);
    assert!(matches!(tracker.get_status().level, identity::DRateLevel::Acceptable));
    
    // Not in alarm yet
    assert!(!tracker.is_alarm());
    
    // Add more D-class
    for _ in 0..10 {
        tracker.record(identity::ChangeClass::D);
    }
    
    // Now should trigger alarm (>15%)
    assert!(tracker.get_d_rate() > 0.15);
    assert!(tracker.is_alarm());
}

#[test]
fn test_drift_detection() {
    let temp_dir = TempDir::new().unwrap();
    let project_root = temp_dir.path();
    
    // Create manifest
    let manifest = drift::GeneratedManifest {
        version: "1.0.0".to_string(),
        generated_at: chrono::Utc::now().to_rfc3339(),
        files: {
            let mut map = HashMap::new();
            map.insert("src/test.rs".to_string(), drift::FileEntry {
                iu_id: "abc123".to_string(),
                hash: file_hash("original content"),
                size: 16,
                generated_at: chrono::Utc::now().to_rfc3339(),
            });
            map
        },
    };
    
    // Create the file with matching content
    std::fs::create_dir_all(project_root.join("src")).unwrap();
    std::fs::write(project_root.join("src/test.rs"), "original content").unwrap();
    
    // Detect drift - should be clean
    let waivers = HashMap::new();
    let report = drift::detect_drift(project_root, &manifest, &waivers).unwrap();
    
    assert!(!report.has_blocking_drift);
    assert_eq!(report.summary.clean, 1);
    assert_eq!(report.summary.modified, 0);
    
    // Modify the file
    std::fs::write(project_root.join("src/test.rs"), "modified content").unwrap();
    
    // Detect drift - should show modification
    let report = drift::detect_drift(project_root, &manifest, &waivers).unwrap();
    
    assert!(report.has_blocking_drift);
    assert_eq!(report.summary.clean, 0);
    assert_eq!(report.summary.modified, 1);
}

#[test]
fn test_boundary_validation() {
    let source = r#"
import fs from 'fs';
import { helper } from './generated/helper';
import axios from 'axios';

function test() {
    const db = new Database();
    fetch('/api/test');
}
"#;
    
    let policy = boundary::default_boundary_policy();
    let enforcement = boundary::EnforcementConfig {
        dependency_violation: boundary::ViolationSeverity::Error,
        side_channel_violation: boundary::ViolationSeverity::Warning,
    };
    
    // With no side channels declared, should warn about database, fetch, fs
    let result = boundary::validate_boundary(
        "test-iu",
        "test.ts",
        source,
        &policy,
        &enforcement,
    );
    
    assert!(result.has_warnings || result.has_errors);
    assert!(!result.diagnostics.is_empty());
    
    // Add allowed side channels
    policy.dependencies.side_channels.databases.push("*".to_string());
    policy.dependencies.side_channels.external_apis.push("*".to_string());
    policy.dependencies.side_channels.files.push("*".to_string());
    
    let result = boundary::validate_boundary(
        "test-iu",
        "test.ts",
        source,
        &policy,
        &enforcement,
    );
    
    // Should have no warnings now
    assert!(!result.has_warnings);
}

#[test]
fn test_evidence_policy() {
    // Low tier
    let low_required = evidence::get_required_evidence(evidence::RiskTier::Low);
    assert!(low_required.contains(&evidence::EvidenceKind::Typecheck));
    assert!(low_required.contains(&evidence::EvidenceKind::Lint));
    assert!(!low_required.contains(&evidence::EvidenceKind::UnitTests));
    
    // Critical tier
    let critical_required = evidence::get_required_evidence(evidence::RiskTier::Critical);
    assert!(critical_required.contains(&evidence::EvidenceKind::HumanSignoff));
    assert!(critical_required.contains(&evidence::EvidenceKind::StaticAnalysis));
    assert!(critical_required.contains(&evidence::EvidenceKind::ThreatNote));
}

#[test]
fn test_policy_evaluation() {
    let records = vec![
        evidence::EvidenceRecord {
            kind: evidence::EvidenceKind::Typecheck,
            status: evidence::EvidenceStatus::Passed,
            timestamp: chrono::Utc::now().to_rfc3339(),
            iu_id: "test-iu".to_string(),
            details: None,
            duration_ms: Some(100),
            signed_by: None,
            signature_hash: None,
            proof_system: None,
            test_count: None,
            pass_count: None,
            fail_count: None,
        },
    ];
    
    // Low tier with only typecheck should be pending (missing lint and boundary)
    let eval = evidence::evaluate_policy("test-iu", evidence::RiskTier::Low, &records);
    assert!(matches!(eval.status, evidence::PolicyStatus::Pending));
    
    // Add missing evidence
    let mut complete_records = records.clone();
    complete_records.push(evidence::EvidenceRecord {
        kind: evidence::EvidenceKind::Lint,
        status: evidence::EvidenceStatus::Passed,
        timestamp: chrono::Utc::now().to_rfc3339(),
        iu_id: "test-iu".to_string(),
        details: None,
        duration_ms: Some(50),
        signed_by: None,
        signature_hash: None,
        proof_system: None,
        test_count: None,
        pass_count: None,
        fail_count: None,
    });
    complete_records.push(evidence::EvidenceRecord {
        kind: evidence::EvidenceKind::BoundaryValidation,
        status: evidence::EvidenceStatus::Passed,
        timestamp: chrono::Utc::now().to_rfc3339(),
        iu_id: "test-iu".to_string(),
        details: None,
        duration_ms: Some(75),
        signed_by: None,
        signature_hash: None,
        proof_system: None,
        test_count: None,
        pass_count: None,
        fail_count: None,
    });
    
    let eval = evidence::evaluate_policy("test-iu", evidence::RiskTier::Low, &complete_records);
    assert!(matches!(eval.status, evidence::PolicyStatus::Accepted));
    assert_eq!(eval.score, 100);
}

#[test]
fn test_dependency_graph() {
    let ius = vec![
        cascade::IUDef {
            iu_id: "iu-a".to_string(),
            dependencies: Some(vec!["iu-b".to_string()]),
            risk_tier: cascade::RiskTier::Low,
            output_files: vec!["a.rs".to_string()],
            source_canon_ids: Some(vec!["canon-1".to_string()]),
        },
        cascade::IUDef {
            iu_id: "iu-b".to_string(),
            dependencies: Some(vec!["iu-c".to_string()]),
            risk_tier: cascade::RiskTier::Medium,
            output_files: vec!["b.rs".to_string()],
            source_canon_ids: Some(vec!["canon-2".to_string()]),
        },
        cascade::IUDef {
            iu_id: "iu-c".to_string(),
            dependencies: None,
            risk_tier: cascade::RiskTier::High,
            output_files: vec!["c.rs".to_string()],
            source_canon_ids: Some(vec!["canon-3".to_string()]),
        },
    ];
    
    let graph = cascade::build_dependency_graph(&ius);
    
    assert_eq!(graph.nodes.len(), 3);
    assert!(!graph.edges.is_empty());
    
    // Test transitive dependents
    let mut visited = std::collections::HashSet::new();
    let deps = cascade::get_transitive_dependents(&graph, "iu-c", &mut visited);
    
    assert!(deps.contains(&"iu-b".to_string()));
    assert!(deps.contains(&"iu-a".to_string()));
    
    // Test topological sort
    let sorted = cascade::topological_sort(&graph).unwrap();
    let c_pos = sorted.iter().position(|x| x == "iu-c").unwrap();
    let b_pos = sorted.iter().position(|x| x == "iu-b").unwrap();
    let a_pos = sorted.iter().position(|x| x == "iu-a").unwrap();
    
    assert!(c_pos < b_pos);
    assert!(b_pos < a_pos);
}

#[test]
fn test_cascade_computation() {
    let ius = vec![
        cascade::IUDef {
            iu_id: "iu-a".to_string(),
            dependencies: Some(vec!["iu-b".to_string()]),
            risk_tier: cascade::RiskTier::Low,
            output_files: vec!["a.rs".to_string()],
            source_canon_ids: Some(vec!["canon-1".to_string()]),
        },
        cascade::IUDef {
            iu_id: "iu-b".to_string(),
            dependencies: None,
            risk_tier: cascade::RiskTier::Medium,
            output_files: vec!["b.rs".to_string()],
            source_canon_ids: Some(vec!["canon-2".to_string()]),
        },
    ];
    
    let graph = cascade::build_dependency_graph(&ius);
    let event = cascade::compute_cascade(&graph, "iu-b", "unit_tests", "Test failure");
    
    assert_eq!(event.source_iu, "iu-b");
    assert!(!event.affected_ius.is_empty());
    assert!(event.affected_ius.contains(&"iu-a".to_string()));
    
    // Should have BLOCK, RETYPECHECK, REBOUNDARY_CHECK, RETEST for iu-a
    let has_block = event.actions.iter().any(|a| matches!(a, cascade::CascadeAction::Block { .. }));
    assert!(has_block);
    
    let has_retypecheck = event.actions.iter().any(|a| matches!(a, cascade::CascadeAction::Retypecheck { .. }));
    assert!(has_retypecheck);
}

#[test]
fn test_selective_invalidation() {
    let ius = vec![
        cascade::IUDef {
            iu_id: "iu-a".to_string(),
            dependencies: None,
            risk_tier: cascade::RiskTier::Low,
            output_files: vec!["a.rs".to_string()],
            source_canon_ids: Some(vec!["canon-1".to_string(), "canon-2".to_string()]),
        },
        cascade::IUDef {
            iu_id: "iu-b".to_string(),
            dependencies: Some(vec!["iu-a".to_string()]),
            risk_tier: cascade::RiskTier::Medium,
            output_files: vec!["b.rs".to_string()],
            source_canon_ids: Some(vec!["canon-3".to_string()]),
        },
    ];
    
    let graph = cascade::build_dependency_graph(&ius);
    
    // Build IU to canon mapping
    let mut iu_to_canon_map = std::collections::HashMap::new();
    for iu in &ius {
        if let Some(ref canon_ids) = iu.source_canon_ids {
            iu_to_canon_map.insert(iu.iu_id.clone(), canon_ids.clone());
        }
    }
    
    // Change canon-1 - should invalidate iu-a and iu-b
    let changed = vec!["canon-1".to_string()];
    let invalidated = cascade::compute_invalidation(&graph, &changed, &iu_to_canon_map);
    
    assert!(invalidated.contains(&"iu-a".to_string()));
    assert!(invalidated.contains(&"iu-b".to_string())); // Because it depends on iu-a
}

#[test]
fn test_shadow_pipeline() {
    use identity::{CanonNode, CanonNodeType, CanonEdge};
    
    let old_nodes = vec![
        CanonNode {
            id: "node-1".to_string(),
            node_type: CanonNodeType::Requirement,
            text: "Test requirement".to_string(),
            confidence: 0.9,
            edges: vec![],
        },
    ];
    
    let new_nodes = vec![
        CanonNode {
            id: "node-1".to_string(),
            node_type: CanonNodeType::Requirement,
            text: "Test requirement".to_string(),
            confidence: 0.9,
            edges: vec![],
        },
    ];
    
    let result = shadow::run_shadow_pipeline(
        old_nodes,
        new_nodes,
        "v1.0.0",
        "v1.0.1",
    );
    
    assert!(matches!(result.classification, shadow::UpgradeClassification::Safe));
    assert_eq!(result.metrics.node_change_pct, 0.0);
}

#[test]
fn test_short_hash() {
    let hash = "abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890";
    let short = short_hash(hash);
    assert_eq!(short, "abcdef12");
    assert_eq!(short.len(), 8);
}

#[test]
fn test_normalize_text() {
    let text = "  The   System SHALL validate  email FORMAT!  ";
    let normalized = normalize_text(text);
    assert_eq!(normalized, "the system shall validate email format");
}

#[test]
fn test_bootstrap_state_machine() {
    let mut sm = identity::BootstrapStateMachine::new();
    
    assert!(matches!(sm.state, identity::BootstrapState::BootstrapCold));
    assert!(sm.should_suppress_d_rate_alarms());
    
    sm.transition_cold_to_warming();
    assert!(matches!(sm.state, identity::BootstrapState::BootstrapWarming));
    
    // Stabilize 3 times
    sm.record_stabilization_attempt(true);
    sm.record_stabilization_attempt(true);
    assert!(matches!(sm.state, identity::BootstrapState::BootstrapWarming));
    
    sm.record_stabilization_attempt(true);
    assert!(matches!(sm.state, identity::BootstrapState::SteadyState));
    assert!(!sm.should_suppress_d_rate_alarms());
}
