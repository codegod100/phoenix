//! Phoenix VCS — Cascade Engine
//!
//! Implements PRD Section 11: Cascading Failure Semantics
//! Graph-based failure propagation with explicit cascade actions.

use serde::{Serialize, Deserialize};
use std::collections::{HashMap, HashSet};
use petgraph::{Graph, Directed};

/// Implementation Unit node in the dependency graph
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IUNode {
    pub iu_id: String,
    pub dependencies: Vec<String>, // IU IDs this IU depends on
    pub dependents: Vec<String>,     // IU IDs that depend on this IU
    pub risk_tier: RiskTier,
    pub output_files: Vec<String>,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
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

/// Dependency graph of IUs
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IUGraph {
    pub nodes: HashMap<String, IUNode>,
    pub edges: Vec<IUEdge>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IUEdge {
    pub from: String,
    pub to: String,
}

/// Actions triggered by cascade events
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum CascadeAction {
    #[serde(rename = "RETYPECHECK")]
    Retypecheck { target_iu: String, reason: String },
    #[serde(rename = "REBOUNDARY_CHECK")]
    ReboundaryCheck { target_iu: String, reason: String },
    #[serde(rename = "RETEST")]
    Retest { target_iu: String, test_tags: Vec<String>, reason: String },
    #[serde(rename = "REGENERATE")]
    Regenerate { target_iu: String, reason: String },
    #[serde(rename = "BLOCK")]
    Block { target_iu: String, reason: String },
}

/// A cascade event triggered by evidence failure
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CascadeEvent {
    pub source_iu: String,
    pub source_failure: String,
    pub timestamp: String,
    pub actions: Vec<CascadeAction>,
    pub affected_ius: Vec<String>,
}

/// Build IU dependency graph from IU definitions.
/// Per PRD: Side-channel dependencies create graph edges for invalidation.
pub fn build_dependency_graph(ius: &[IUDef]) -> IUGraph {
    let mut nodes = HashMap::new();
    let mut edges = Vec::new();
    
    // First pass: create nodes
    for iu in ius {
        nodes.insert(iu.iu_id.clone(), IUNode {
            iu_id: iu.iu_id.clone(),
            dependencies: iu.dependencies.clone().unwrap_or_default(),
            dependents: Vec::new(), // Will fill in second pass
            risk_tier: iu.risk_tier,
            output_files: iu.output_files.clone(),
        });
    }
    
    // Second pass: establish edges and dependents
    for iu in ius {
        let deps_to_process: Vec<String> = if let Some(node) = nodes.get(&iu.iu_id) {
            node.dependencies.clone()
        } else {
            continue;
        };
        
        for dep_id in deps_to_process {
            edges.push(IUEdge {
                from: iu.iu_id.clone(),
                to: dep_id.clone(),
            });
            
            // Add to dependent's list
            if let Some(dep_node) = nodes.get_mut(&dep_id) {
                if !dep_node.dependents.contains(&iu.iu_id) {
                    dep_node.dependents.push(iu.iu_id.clone());
                }
            }
        }
    }
    
    IUGraph { nodes, edges }
}

/// IU definition for graph construction
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct IUDef {
    pub iu_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<Vec<String>>,
    pub risk_tier: RiskTier,
    pub output_files: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_canon_ids: Option<Vec<String>>,
}

/// Get all transitive dependents of an IU (downstream dependencies).
/// Used when an IU fails - all dependents need re-validation.
pub fn get_transitive_dependents(
    graph: &IUGraph,
    iu_id: &str,
    visited: &mut HashSet<String>,
) -> Vec<String> {
    let mut result = Vec::new();
    
    if let Some(node) = graph.nodes.get(iu_id) {
        for dependent in &node.dependents {
            if visited.contains(dependent) {
                continue;
            }
            visited.insert(dependent.clone());
            
            result.push(dependent.clone());
            // Recursively get their dependents
            result.extend(get_transitive_dependents(graph, dependent, visited));
        }
    }
    
    result
}

/// Get all transitive dependencies of an IU (upstream dependencies).
/// Used when regenerating - all dependencies must be valid first.
pub fn get_transitive_dependencies(
    graph: &IUGraph,
    iu_id: &str,
    visited: &mut HashSet<String>,
) -> Vec<String> {
    let mut result = Vec::new();
    
    if let Some(node) = graph.nodes.get(iu_id) {
        for dep in &node.dependencies {
            if visited.contains(dep) {
                continue;
            }
            visited.insert(dep.clone());
            
            result.push(dep.clone());
            // Recursively get their dependencies
            result.extend(get_transitive_dependencies(graph, dep, visited));
        }
    }
    
    result
}

/// Compute cascade actions when an IU's evidence fails.
/// Per PRD Section 11: "Failure propagation is explicit and graph-based"
pub fn compute_cascade(
    graph: &IUGraph,
    failed_iu_id: &str,
    failure_kind: &str,
    failure_details: &str,
) -> CascadeEvent {
    let timestamp = chrono::Utc::now().to_rfc3339();
    let mut actions = Vec::new();
    let mut visited = HashSet::new();
    let affected_ius = get_transitive_dependents(graph, failed_iu_id, &mut visited);
    
    // Source IU is blocked
    actions.push(CascadeAction::Block {
        target_iu: failed_iu_id.to_string(),
        reason: format!("Evidence failure: {} - {}", failure_kind, failure_details),
    });
    
    // For each dependent, determine required re-validation
    for dependent_id in &affected_ius {
        if let Some(node) = graph.nodes.get(dependent_id) {
            // Always re-run typecheck and boundary validation
            actions.push(CascadeAction::Retypecheck {
                target_iu: dependent_id.clone(),
                reason: format!(
                    "Type-safety check required: dependency {}... failed",
                    &failed_iu_id[..8.min(failed_iu_id.len())]
                ),
            });
            
            actions.push(CascadeAction::ReboundaryCheck {
                target_iu: dependent_id.clone(),
                reason: format!(
                    "Boundary validation required: dependency {}... failed",
                    &failed_iu_id[..8.min(failed_iu_id.len())]
                ),
            });
            
            // Re-run relevant tests
            actions.push(CascadeAction::Retest {
                target_iu: dependent_id.clone(),
                test_tags: vec![failed_iu_id[..8.min(failed_iu_id.len())].to_string()],
                reason: format!(
                    "Tests tagged with {} must be re-run",
                    &failed_iu_id[..8.min(failed_iu_id.len())]
                ),
            });
            
            // High/critical risk dependents may need regeneration
            if matches!(node.risk_tier, RiskTier::High | RiskTier::Critical) {
                actions.push(CascadeAction::Regenerate {
                    target_iu: dependent_id.clone(),
                    reason: format!(
                        "High-risk IU may be affected by {}... failure",
                        &failed_iu_id[..8.min(failed_iu_id.len())]
                    ),
                });
            }
        }
    }
    
    CascadeEvent {
        source_iu: failed_iu_id.to_string(),
        source_failure: failure_kind.to_string(),
        timestamp,
        actions,
        affected_ius,
    }
}

/// Compute selective invalidation when a spec changes.
/// Per PRD Section 0: "Changing one spec line invalidates only the dependent subtree"
pub fn compute_invalidation(
    graph: &IUGraph,
    changed_canon_ids: &[String],
    iu_to_canon_map: &HashMap<String, Vec<String>>,
) -> Vec<String> {
    let mut invalidated = HashSet::new();
    
    // Find all IUs that implement changed canonical requirements
    for (iu_id, canon_ids) in iu_to_canon_map {
        let has_overlap = canon_ids.iter().any(|c| changed_canon_ids.contains(c));
        if has_overlap {
            invalidated.insert(iu_id.clone());
            
            // Add all transitive dependents (cascade invalidation)
            let mut visited = HashSet::new();
            let dependents = get_transitive_dependents(graph, iu_id, &mut visited);
            for dep in dependents {
                invalidated.insert(dep);
            }
        }
    }
    
    invalidated.into_iter().collect()
}

/// Detect circular dependencies in the IU graph
pub fn detect_circular_dependencies(graph: &IUGraph) -> Vec<Vec<String>> {
    let mut cycles = Vec::new();
    let mut visited = HashSet::new();
    let mut recursion_stack = HashSet::new();
    
    fn dfs(
        graph: &IUGraph,
        node_id: &str,
        path: &mut Vec<String>,
        visited: &mut HashSet<String>,
        recursion_stack: &mut HashSet<String>,
        cycles: &mut Vec<Vec<String>>,
    ) {
        visited.insert(node_id.to_string());
        recursion_stack.insert(node_id.to_string());
        path.push(node_id.to_string());
        
        if let Some(node) = graph.nodes.get(node_id) {
            for dep in &node.dependencies {
                if !visited.contains(dep) {
                    dfs(graph, dep, path, visited, recursion_stack, cycles);
                } else if recursion_stack.contains(dep) {
                    // Found cycle
                    if let Some(cycle_start) = path.iter().position(|p| p == dep) {
                        cycles.push(path[cycle_start..].to_vec());
                    }
                }
            }
        }
        
        recursion_stack.remove(node_id);
        path.pop();
    }
    
    for node_id in graph.nodes.keys() {
        if !visited.contains(node_id) {
            let mut path = Vec::new();
            dfs(graph, node_id, &mut path, &mut visited, &mut recursion_stack, &mut cycles);
        }
    }
    
    cycles
}

/// Topological sort of IUs for regeneration order.
/// Dependencies must be regenerated before dependents.
pub fn topological_sort(graph: &IUGraph) -> Result<Vec<String>, String> {
    let mut visited = HashSet::new();
    let mut temp_mark = HashSet::new();
    let mut result = Vec::new();
    
    fn visit(
        graph: &IUGraph,
        node_id: &str,
        visited: &mut HashSet<String>,
        temp_mark: &mut HashSet<String>,
        result: &mut Vec<String>,
    ) -> Result<(), String> {
        if temp_mark.contains(node_id) {
            return Err(format!("Circular dependency detected at {}", node_id));
        }
        if visited.contains(node_id) {
            return Ok(());
        }
        
        temp_mark.insert(node_id.to_string());
        
        if let Some(node) = graph.nodes.get(node_id) {
            for dep in &node.dependencies {
                visit(graph, dep, visited, temp_mark, result)?;
            }
        }
        
        temp_mark.remove(node_id);
        visited.insert(node_id.to_string());
        result.push(node_id.to_string());
        
        Ok(())
    }
    
    for node_id in graph.nodes.keys() {
        if !visited.contains(node_id) {
            visit(graph, node_id, &mut visited, &mut temp_mark, &mut result)?;
        }
    }
    
    Ok(result)
}

/// Format cascade event for display
pub fn format_cascade_event(event: &CascadeEvent) -> String {
    let mut lines = Vec::new();
    lines.push("⚡ Phoenix VCS Cascade Event".to_string());
    lines.push(format!(
        "   Source: {}... ({})",
        &event.source_iu[..8.min(event.source_iu.len())],
        event.source_failure
    ));
    lines.push(format!("   Time: {}", event.timestamp));
    lines.push(format!("   Affected IUs: {}", event.affected_ius.len()));
    lines.push(String::new());
    
    // Group actions by type
    let mut by_type: HashMap<String, Vec<&CascadeAction>> = HashMap::new();
    for action in &event.actions {
        let type_name = match action {
            CascadeAction::Retypecheck { .. } => "RETYPECHECK",
            CascadeAction::ReboundaryCheck { .. } => "REBOUNDARY_CHECK",
            CascadeAction::Retest { .. } => "RETEST",
            CascadeAction::Regenerate { .. } => "REGENERATE",
            CascadeAction::Block { .. } => "BLOCK",
        };
        by_type.entry(type_name.to_string()).or_default().push(action);
    }
    
    for (type_name, actions) in by_type {
        lines.push(format!("   {}:", type_name));
        for action in actions {
            let (target, reason) = match action {
                CascadeAction::Retypecheck { target_iu, reason } => (target_iu, reason),
                CascadeAction::ReboundaryCheck { target_iu, reason } => (target_iu, reason),
                CascadeAction::Retest { target_iu, reason, .. } => (target_iu, reason),
                CascadeAction::Regenerate { target_iu, reason } => (target_iu, reason),
                CascadeAction::Block { target_iu, reason } => (target_iu, reason),
            };
            lines.push(format!("      → {}...", &target[..8.min(target.len())]));
            lines.push(format!("        {}", reason));
        }
        lines.push(String::new());
    }
    
    lines.join("\n")
}

/// Format invalidation report
pub fn format_invalidation_report(
    changed_canon_ids: &[String],
    invalidated_ius: &[String],
) -> String {
    let mut lines = Vec::new();
    lines.push("🎯 Phoenix VCS Selective Invalidation".to_string());
    lines.push(String::new());
    lines.push(format!("Changed requirements: {}", changed_canon_ids.len()));
    
    for canon_id in changed_canon_ids.iter().take(5) {
        lines.push(format!("   {}...", &canon_id[..8.min(canon_id.len())]));
    }
    if changed_canon_ids.len() > 5 {
        lines.push(format!("   ... and {} more", changed_canon_ids.len() - 5));
    }
    
    lines.push(String::new());
    lines.push(format!("Invalidated IUs: {}", invalidated_ius.len()));
    for iu_id in invalidated_ius {
        lines.push(format!("   {}...", &iu_id[..8.min(iu_id.len())]));
    }
    
    lines.push(String::new());
    let rate = if !invalidated_ius.is_empty() { "partial" } else { "none" };
    lines.push(format!("Selective rate: {}", rate));
    
    lines.join("\n")
}

/// Build petgraph graph for advanced graph operations
pub fn build_petgraph(graph: &IUGraph) -> Graph<String, (), Directed> {
    let mut pet_graph = Graph::<String, (), Directed>::new();
    let mut node_indices = HashMap::new();
    
    // Add nodes
    for iu_id in graph.nodes.keys() {
        let idx = pet_graph.add_node(iu_id.clone());
        node_indices.insert(iu_id.clone(), idx);
    }
    
    // Add edges
    for edge in &graph.edges {
        if let (Some(&from), Some(&to)) = (node_indices.get(&edge.from), node_indices.get(&edge.to)) {
            pet_graph.add_edge(from, to, ());
        }
    }
    
    pet_graph
}

#[cfg(test)]
mod tests {
    use super::*;

    fn create_test_graph() -> IUGraph {
        let ius = vec![
            IUDef {
                iu_id: "iu-a".to_string(),
                dependencies: Some(vec!["iu-b".to_string()]),
                risk_tier: RiskTier::Low,
                output_files: vec!["a.rs".to_string()],
                source_canon_ids: Some(vec!["canon-1".to_string()]),
            },
            IUDef {
                iu_id: "iu-b".to_string(),
                dependencies: Some(vec!["iu-c".to_string()]),
                risk_tier: RiskTier::Medium,
                output_files: vec!["b.rs".to_string()],
                source_canon_ids: Some(vec!["canon-2".to_string()]),
            },
            IUDef {
                iu_id: "iu-c".to_string(),
                dependencies: None,
                risk_tier: RiskTier::High,
                output_files: vec!["c.rs".to_string()],
                source_canon_ids: Some(vec!["canon-3".to_string()]),
            },
        ];
        
        build_dependency_graph(&ius)
    }

    #[test]
    fn test_transitive_dependents() {
        let graph = create_test_graph();
        let mut visited = HashSet::new();
        let deps = get_transitive_dependents(&graph, "iu-c", &mut visited);
        
        // c is depended on by b, which is depended on by a
        assert!(deps.contains(&"iu-b".to_string()));
        assert!(deps.contains(&"iu-a".to_string()));
    }

    #[test]
    fn test_compute_cascade() {
        let graph = create_test_graph();
        let event = compute_cascade(&graph, "iu-c", "unit_tests", "Test failure");
        
        assert_eq!(event.source_iu, "iu-c");
        assert!(!event.affected_ius.is_empty());
        assert!(!event.actions.is_empty());
    }

    #[test]
    fn test_detect_circular_dependencies() {
        // Create graph with cycle
        let ius = vec![
            IUDef {
                iu_id: "a".to_string(),
                dependencies: Some(vec!["b".to_string()]),
                risk_tier: RiskTier::Low,
                output_files: vec![],
                source_canon_ids: None,
            },
            IUDef {
                iu_id: "b".to_string(),
                dependencies: Some(vec!["c".to_string()]),
                risk_tier: RiskTier::Low,
                output_files: vec![],
                source_canon_ids: None,
            },
            IUDef {
                iu_id: "c".to_string(),
                dependencies: Some(vec!["a".to_string()]),
                risk_tier: RiskTier::Low,
                output_files: vec![],
                source_canon_ids: None,
            },
        ];
        
        let graph = build_dependency_graph(&ius);
        let cycles = detect_circular_dependencies(&graph);
        
        assert!(!cycles.is_empty(), "Should detect circular dependency");
    }

    #[test]
    fn test_topological_sort() {
        let graph = create_test_graph();
        let sorted = topological_sort(&graph).unwrap();
        
        // c must come before b, b must come before a
        let c_pos = sorted.iter().position(|x| x == "iu-c").unwrap();
        let b_pos = sorted.iter().position(|x| x == "iu-b").unwrap();
        let a_pos = sorted.iter().position(|x| x == "iu-a").unwrap();
        
        assert!(c_pos < b_pos);
        assert!(b_pos < a_pos);
    }
}
