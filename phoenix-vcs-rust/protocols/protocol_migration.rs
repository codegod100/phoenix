//! Protocol migration engine using panproto
//!
//! This module implements protocol migration for Phoenix VCS using
//! panproto's Generalized Algebraic Theory (GAT) system.
//!
//! Two test protocols are defined in `protocols/`:
//! - task_protocol_v1.ncl - Simple task tracking
//! - task_protocol_v2.ncl - Enhanced tracking with priorities, assignees, etc.
//! - migrate_v1_to_v2.ncl - Migration morphism between them

use std::collections::HashMap;
use std::path::Path;
use serde::{Deserialize, Serialize};

/// Task data as defined by protocol v1
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskV1 {
    pub id: String,
    pub title: String,
    pub status: TaskStatusV1,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatusV1 {
    Todo,
    Done,
}

/// Task data as defined by protocol v2 (enhanced)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskV2 {
    pub id: String,
    pub title: String,
    pub status: TaskStatusV2,
    pub priority: PriorityV2,
    pub assignee: Option<Assignee>,
    pub due_date: Option<String>,
    pub tags: Vec<String>,
    pub relations: Vec<TaskRelation>,
    pub created_at: String,
    pub updated_at: String,
    pub completed_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatusV2 {
    Todo,
    InProgress,
    Review,
    Done,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum PriorityV2 {
    Low,
    Medium,
    High,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Assignee {
    pub user_id: String,
    pub name: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskRelation {
    pub relation_type: RelationType,
    pub target_task_id: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum RelationType {
    DependsOn,
    Blocks,
    SubtaskOf,
}

/// Migration result with provenance
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MigrationResult {
    pub source_protocol: String,
    pub target_protocol: String,
    pub migrated_tasks: Vec<TaskV2>,
    pub warnings: Vec<String>,
    pub applied_defaults: HashMap<String, serde_json::Value>,
    pub rollback_possible: bool,
    pub migration_timestamp: String,
}

/// Protocol loader and migrator
pub struct ProtocolMigrator {
    protocols_dir: std::path::PathBuf,
}

impl ProtocolMigrator {
    /// Create a new migrator with the given protocols directory
    pub fn new<P: AsRef<Path>>(protocols_dir: P) -> Self {
        Self {
            protocols_dir: protocols_dir.as_ref().to_path_buf(),
        }
    }

    /// Load task data from protocol v1 format
    pub fn load_v1_tasks(&self, data: &str) -> Result<Vec<TaskV1>, serde_json::Error> {
        // v1 tasks are stored as a JSON array or in the examples format
        let parsed: serde_json::Value = serde_json::from_str(data)?;
        
        if let Some(examples) = parsed.get("examples") {
            serde_json::from_value(examples.clone())
        } else {
            serde_json::from_str(data)
        }
    }

    /// Migrate tasks from v1 to v2 protocol
    /// 
    /// This applies the migration morphism defined in migrate_v1_to_v2.ncl:
    /// - Preserves: id, title, created_at
    /// - Maps status: todo→todo, done→done (in_progress/review/cancelled added in v2)
    /// - Adds defaults: priority=medium, assignee=null, due_date=null, tags=[], relations=[]
    /// - Sets: updated_at=created_at, completed_at based on status
    pub fn migrate_v1_to_v2(&self, v1_tasks: Vec<TaskV1>) -> MigrationResult {
        let mut warnings = Vec::new();
        let mut applied_defaults = HashMap::new();
        let timestamp = chrono::Utc::now().to_rfc3339();

        let migrated: Vec<TaskV2> = v1_tasks
            .into_iter()
            .map(|v1| {
                // Track applied defaults
                applied_defaults.insert(format!("{}:priority", v1.id), serde_json::json!("medium"));
                applied_defaults.insert(format!("{}:assignee", v1.id), serde_json::Value::Null);
                applied_defaults.insert(format!("{}:due_date", v1.id), serde_json::Value::Null);
                applied_defaults.insert(format!("{}:tags", v1.id), serde_json::json!([]));
                applied_defaults.insert(format!("{}:relations", v1.id), serde_json::json!([]));

                // Status migration
                let (v2_status, completed_at) = match v1.status {
                    TaskStatusV1::Todo => (TaskStatusV2::Todo, None),
                    TaskStatusV1::Done => (
                        TaskStatusV2::Done,
                        Some(v1.created_at.clone()) // Approximate
                    ),
                };

                TaskV2 {
                    id: v1.id,
                    title: v1.title,
                    status: v2_status,
                    priority: PriorityV2::Medium, // Default per migration spec
                    assignee: None,
                    due_date: None,
                    tags: vec![],
                    relations: vec![],
                    created_at: v1.created_at.clone(),
                    updated_at: v1.created_at, // Initially same as created
                    completed_at,
                }
            })
            .collect();

        // Check rollback possibility
        let rollback_possible = migrated.iter().all(|t| {
            matches!(t.status, TaskStatusV2::Todo | TaskStatusV2::Done)
        });

        if !rollback_possible {
            warnings.push(
                "Some tasks have v2-only statuses (in_progress/review/cancelled)".to_string()
            );
        }

        MigrationResult {
            source_protocol: "phoenix.protocols.task.v1".to_string(),
            target_protocol: "phoenix.protocols.task.v2".to_string(),
            migrated_tasks: migrated,
            warnings,
            applied_defaults,
            rollback_possible,
            migration_timestamp: timestamp,
        }
    }

    /// Attempt to rollback v2 tasks to v1 (best-effort)
    /// 
    /// Limitations:
    /// - v2-only fields are lost
    /// - v2 statuses map to closest v1 equivalent
    pub fn rollback_v2_to_v1(&self, v2_tasks: Vec<TaskV2>) -> (Vec<TaskV1>, Vec<String>) {
        let mut lost_info_warnings = Vec::new();

        let rolled_back: Vec<TaskV1> = v2_tasks
            .into_iter()
            .map(|v2| {
                // Warn about lost information
                if v2.priority != PriorityV2::Medium {
                    lost_info_warnings.push(format!(
                        "Task {}: priority '{:?}' lost on rollback", 
                        v2.id, v2.priority
                    ));
                }
                if v2.assignee.is_some() {
                    lost_info_warnings.push(format!(
                        "Task {}: assignee lost on rollback",
                        v2.id
                    ));
                }
                if !v2.tags.is_empty() {
                    lost_info_warnings.push(format!(
                        "Task {}: tags {:?} lost on rollback",
                        v2.id, v2.tags
                    ));
                }

                // Status rollback mapping
                let v1_status = match v2.status {
                    TaskStatusV2::Todo => TaskStatusV1::Todo,
                    TaskStatusV2::Done => TaskStatusV1::Done,
                    // v2-only statuses map to best approximation
                    TaskStatusV2::InProgress | TaskStatusV2::Review => {
                        lost_info_warnings.push(format!(
                            "Task {}: status '{:?}' downgraded to 'todo' on rollback",
                            v2.id, v2.status
                        ));
                        TaskStatusV1::Todo
                    }
                    TaskStatusV2::Cancelled => {
                        lost_info_warnings.push(format!(
                            "Task {}: status 'cancelled' mapped to 'done' on rollback",
                            v2.id
                        ));
                        TaskStatusV1::Done
                    }
                };

                TaskV1 {
                    id: v2.id,
                    title: v2.title,
                    status: v1_status,
                    created_at: v2.created_at,
                }
            })
            .collect();

        (rolled_back, lost_info_warnings)
    }

    /// Load the protocol NCL file paths
    pub fn protocol_paths(&self) -> ProtocolPaths {
        ProtocolPaths {
            v1: self.protocols_dir.join("task_protocol_v1.ncl"),
            v2: self.protocols_dir.join("task_protocol_v2.ncl"),
            migration: self.protocols_dir.join("migrate_v1_to_v2.ncl"),
        }
    }
}

/// Paths to the protocol files
pub struct ProtocolPaths {
    pub v1: std::path::PathBuf,
    pub v2: std::path::PathBuf,
    pub migration: std::path::PathBuf,
}

/// Load and validate a protocol theory using panproto (if feature enabled)
#[cfg(feature = "panproto")]
pub mod panproto_integration {
    use super::*;
    use panproto_gat::Theory;
    use panproto_theory_dsl::load_and_compile;

    /// Load a protocol as a panproto Theory
    pub fn load_protocol_theory(path: &Path) -> Result<Theory, Box<dyn std::error::Error>> {
        let resolver = |_name: &str| -> Option<Theory> { None };
        let compiled = load_and_compile(path, &resolver)?;
        
        compiled.theories.into_iter()
            .map(|(_, theory)| theory)
            .next()
            .ok_or_else(|| "No theory found in protocol".into())
    }

    /// Validate that data conforms to a protocol theory
    /// 
    /// This performs basic structural validation - checking that the data
    /// has the required fields based on the theory's sorts.
    pub fn validate_against_theory(
        data: &serde_json::Value,
        theory: &Theory,
    ) -> Result<Vec<String>, String> {
        let mut errors = Vec::new();
        
        // Check that required sorts exist in the theory
        let has_task_sort = theory.sorts.iter().any(|s| s.name.as_ref() == "Task");
        if !has_task_sort {
            errors.push("Theory missing 'Task' sort".to_string());
        }
        
        // Validate task structure if it's an array of tasks
        if let Some(tasks) = data.as_array() {
            for (idx, task) in tasks.iter().enumerate() {
                if !task.is_object() {
                    errors.push(format!("Task {}: not an object", idx));
                    continue;
                }
                
                // Check required fields based on theory
                let required = ["id", "title", "status"];
                for field in &required {
                    if task.get(field).is_none() {
                        errors.push(format!("Task {}: missing required field '{}'", idx, field));
                    }
                }
            }
        } else if data.is_object() {
            // Single task or spec object - check for examples field
            if let Some(examples) = data.get("examples") {
                return validate_against_theory(examples, theory);
            }
        }
        
        if errors.is_empty() {
            Ok(vec!["Valid".to_string()])
        } else {
            Ok(errors)
        }
    }

    /// Get theory metadata for display
    pub fn get_theory_info(theory: &Theory) -> serde_json::Value {
        serde_json::json!({
            "name": theory.name.as_ref(),
            "sorts": theory.sorts.len(),
            "sort_names": theory.sorts.iter().map(|s| s.name.as_ref()).collect::<Vec<_>>(),
        })
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn sample_v1_tasks() -> Vec<TaskV1> {
        vec![
            TaskV1 {
                id: "task-001".to_string(),
                title: "Implement auth".to_string(),
                status: TaskStatusV1::Todo,
                created_at: "2026-04-13T10:00:00Z".to_string(),
            },
            TaskV1 {
                id: "task-002".to_string(),
                title: "Write tests".to_string(),
                status: TaskStatusV1::Done,
                created_at: "2026-04-12T09:00:00Z".to_string(),
            },
        ]
    }

    #[test]
    fn test_migrate_v1_to_v2() {
        let migrator = ProtocolMigrator::new("./protocols");
        let v1_tasks = sample_v1_tasks();
        
        let result = migrator.migrate_v1_to_v2(v1_tasks);
        
        assert_eq!(result.migrated_tasks.len(), 2);
        assert_eq!(result.source_protocol, "phoenix.protocols.task.v1");
        assert_eq!(result.target_protocol, "phoenix.protocols.task.v2");
        assert!(result.rollback_possible);
        
        // Check first task (todo)
        let task1 = &result.migrated_tasks[0];
        assert_eq!(task1.id, "task-001");
        assert_eq!(task1.title, "Implement auth");
        assert!(matches!(task1.status, TaskStatusV2::Todo));
        assert!(matches!(task1.priority, PriorityV2::Medium)); // Default applied
        assert!(task1.assignee.is_none()); // Default
        assert!(task1.completed_at.is_none()); // Not done
        
        // Check second task (done)
        let task2 = &result.migrated_tasks[1];
        assert_eq!(task2.id, "task-002");
        assert!(matches!(task2.status, TaskStatusV2::Done));
        assert!(task2.completed_at.is_some()); // Set for done tasks
    }

    #[test]
    fn test_rollback_v2_to_v1() {
        let migrator = ProtocolMigrator::new("./protocols");
        
        // Create v2 tasks
        let v2_tasks = vec![
            TaskV2 {
                id: "task-001".to_string(),
                title: "Implement auth".to_string(),
                status: TaskStatusV2::Todo,
                priority: PriorityV2::High,  // Will be lost
                assignee: Some(Assignee { 
                    user_id: "alice".to_string(), 
                    name: Some("Alice".to_string()) 
                }), // Will be lost
                due_date: None,
                tags: vec!["security".to_string()],  // Will be lost
                relations: vec![],
                created_at: "2026-04-13T10:00:00Z".to_string(),
                updated_at: "2026-04-13T14:00:00Z".to_string(),
                completed_at: None,
            },
            TaskV2 {
                id: "task-003".to_string(),
                title: "Review code".to_string(),
                status: TaskStatusV2::Review,  // Will be downgraded
                priority: PriorityV2::Medium,
                assignee: None,
                due_date: None,
                tags: vec![],
                relations: vec![],
                created_at: "2026-04-13T11:00:00Z".to_string(),
                updated_at: "2026-04-13T11:00:00Z".to_string(),
                completed_at: None,
            },
        ];
        
        let (rolled_back, warnings) = migrator.rollback_v2_to_v1(v2_tasks);
        
        assert_eq!(rolled_back.len(), 2);
        assert!(!warnings.is_empty()); // Should warn about lost info
        
        // First task: priority and assignee lost
        assert!(warnings.iter().any(|w| w.contains("priority")));
        assert!(warnings.iter().any(|w| w.contains("assignee")));
        assert!(warnings.iter().any(|w| w.contains("tags")));
        
        // Second task: status downgraded
        assert!(warnings.iter().any(|w| w.contains("Review") && w.contains("downgraded")), 
            "Expected warning about Review being downgraded, got: {:?}", warnings);
        assert!(matches!(rolled_back[1].status, TaskStatusV1::Todo));
    }

    #[test]
    fn test_protocol_paths() {
        let migrator = ProtocolMigrator::new("./protocols");
        let paths = migrator.protocol_paths();
        
        assert!(paths.v1.ends_with("task_protocol_v1.ncl"));
        assert!(paths.v2.ends_with("task_protocol_v2.ncl"));
        assert!(paths.migration.ends_with("migrate_v1_to_v2.ncl"));
    }

    #[test]
    fn test_load_v1_from_json() {
        let json_data = r#"[
            {"id": "t1", "title": "Test", "status": "todo", "created_at": "2026-04-13T10:00:00Z"}
        ]"#;
        
        let migrator = ProtocolMigrator::new("./protocols");
        let tasks = migrator.load_v1_tasks(json_data).unwrap();
        
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].id, "t1");
    }
}
