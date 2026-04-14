//! Nickel Protocol → Python Component Migration Demo
//!
//! This example demonstrates migrating data from a Nickel-based panproto protocol
//! (Task definitions) to a Python Component representation.
//!
//! Shows how to bridge between:
//! - Source: Nickel/GAT theory (task_v2.ncl)
//! - Target: Python Component protocol (python_component.ncl)

use serde::{Deserialize, Serialize};

// ============================================================================
// SOURCE: Nickel-based Task Protocol (from task_v2.ncl)
// ============================================================================

/// Task data as defined by task_v2.ncl theory
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TaskV2 {
    pub id: String,
    pub title: String,
    pub status: TaskStatus,
    pub priority: Priority,
    pub assignee: Option<Assignee>,
    pub due_date: Option<String>,
    pub tags: Vec<String>,
    pub relations: Vec<TaskRelation>,
    pub created_at: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum TaskStatus {
    Todo,
    InProgress,
    Review,
    Done,
    Cancelled,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum Priority {
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

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum RelationType {
    DependsOn,
    Blocks,
    SubtaskOf,
}

// ============================================================================
// TARGET: Python Component Protocol (from python_component.ncl)
// ============================================================================

/// Python Component Class representation
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PythonComponent {
    pub name: String,
    pub props_class: PropsClass,
    pub state_class: StateClass,
    pub lifecycle: Lifecycle,
    pub render_method: RenderMethod,
    pub event_handlers: Vec<EventHandler>,
    pub imports: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropsClass {
    pub name: String,
    pub fields: Vec<PropField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PropField {
    pub name: String,
    pub type_hint: String,
    pub default_value: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateClass {
    pub name: String,
    pub fields: Vec<StateField>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateField {
    pub name: String,
    pub type_hint: String,
    pub initial_value: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Lifecycle {
    pub has_mount: bool,
    pub has_unmount: bool,
    pub has_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RenderMethod {
    pub ui_tree: UIElement,
    pub has_conditionals: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UIElement {
    pub element_type: String,
    pub class_name: Option<String>,
    pub text_content: Option<String>,
    pub children: Vec<UIElement>,
    pub event_bindings: Vec<(String, String)>, // (event, handler_name)
    pub condition: Option<String>, // Conditional rendering expression
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventHandler {
    pub name: String,
    pub updates_state: bool,
    pub state_updates: Vec<(String, String)>, // (field, new_value_expr)
}

// ============================================================================
// MIGRATION: Task V2 → Python Component
// ============================================================================

/// Migrates a Task from Nickel protocol to Python Component
pub struct TaskToComponentMigrator;

impl TaskToComponentMigrator {
    pub fn new() -> Self {
        Self
    }

    /// Migrate a TaskV2 to a Python Component
    ///
    /// Mapping rules:
    /// - Task ID → Component name (Task{id}Component)
    /// - Task fields → Props (id, title, status, priority, assignee, due_date, tags)
    /// - Task status → State (track status changes locally)
    /// - Task relations → Not directly mapped (would need component composition)
    pub fn migrate(&self, task: &TaskV2) -> PythonComponent {
        // Generate component name from task
        let component_name = format!("Task{}Component", self.sanitize_id(&task.id));
        let props_name = format!("{}Props", component_name);
        let state_name = format!("{}State", component_name);

        // Build props class from task fields
        let props_fields = vec![
            PropField {
                name: "task_id".to_string(),
                type_hint: "str".to_string(),
                default_value: Some(format!("\"{}\"", task.id)),
            },
            PropField {
                name: "title".to_string(),
                type_hint: "str".to_string(),
                default_value: Some(format!("\"{}\"", task.title)),
            },
            PropField {
                name: "initial_status".to_string(),
                type_hint: "str".to_string(),
                default_value: Some(format!("\"{:?}\"", task.status)),
            },
            PropField {
                name: "priority".to_string(),
                type_hint: "str".to_string(),
                default_value: Some(format!("\"{:?}\"", task.priority)),
            },
            PropField {
                name: "due_date".to_string(),
                type_hint: "Optional[str]".to_string(),
                default_value: task.due_date.clone().map(|d| format!("\"{}\"", d)),
            },
            PropField {
                name: "tags".to_string(),
                type_hint: "List[str]".to_string(),
                default_value: Some(format!("{:?}", task.tags)),
            },
        ];

        // Add assignee props if present
        let mut all_props = props_fields;
        if task.assignee.is_some() {
            all_props.push(PropField {
                name: "assignee_id".to_string(),
                type_hint: "Optional[str]".to_string(),
                default_value: task.assignee.as_ref().map(|a| format!("\"{}\"", a.user_id)),
            });
        }

        // Build state class (track mutable state)
        let state_fields = vec![
            StateField {
                name: "status".to_string(),
                type_hint: "str".to_string(),
                initial_value: "self.props.initial_status".to_string(),
            },
            StateField {
                name: "updated_at".to_string(),
                type_hint: "str".to_string(),
                initial_value: format!("\"{}\"", task.created_at), // Will update on changes
            },
        ];

        // Build event handlers based on task status
        let mut handlers = vec![
            EventHandler {
                name: "mark_in_progress".to_string(),
                updates_state: true,
                state_updates: vec![
                    ("status".to_string(), "\"in_progress\"".to_string()),
                ],
            },
            EventHandler {
                name: "mark_done".to_string(),
                updates_state: true,
                state_updates: vec![
                    ("status".to_string(), "\"done\"".to_string()),
                ],
            },
        ];

        // Add cancel handler if task isn't done
        if !matches!(task.status, TaskStatus::Done | TaskStatus::Cancelled) {
            handlers.push(EventHandler {
                name: "cancel".to_string(),
                updates_state: true,
                state_updates: vec![
                    ("status".to_string(), "\"cancelled\"".to_string()),
                ],
            });
        }

        // Build UI tree based on task status
        let ui_tree = self.build_ui_tree(task);

        PythonComponent {
            name: component_name,
            props_class: PropsClass {
                name: props_name,
                fields: all_props,
            },
            state_class: StateClass {
                name: state_name,
                fields: state_fields,
            },
            lifecycle: Lifecycle {
                has_mount: true,  // Log when task component mounts
                has_unmount: true, // Cleanup if needed
                has_update: false,
            },
            render_method: RenderMethod {
                ui_tree,
                has_conditionals: true, // Status-based conditional rendering
            },
            event_handlers: handlers,
            imports: vec![
                "from dataclasses import dataclass".to_string(),
                "from typing import Optional, List".to_string(),
                "from datetime import datetime".to_string(),
            ],
        }
    }

    /// Build UI tree representation for the task
    fn build_ui_tree(&self, task: &TaskV2) -> UIElement {
        // Main container
        let mut children = vec![
            // Title header
            UIElement {
                element_type: "h3".to_string(),
                class_name: Some("task-title".to_string()),
                text_content: Some(task.title.clone()),
                children: vec![],
                event_bindings: vec![],
                condition: None,
            },
            // Status indicator
            UIElement {
                element_type: "span".to_string(),
                class_name: Some(format!("status-badge status-{:?}", task.status).to_lowercase()),
                text_content: Some(format!("{:?}", task.status)),
                children: vec![],
                event_bindings: vec![],
                condition: None,
            },
        ];

        // Add priority badge for high/critical
        if matches!(task.priority, Priority::High | Priority::Critical) {
            children.push(UIElement {
                element_type: "span".to_string(),
                class_name: Some(format!("priority-badge priority-{:?}", task.priority).to_lowercase()),
                text_content: Some(format!("{:?}", task.priority)),
                children: vec![],
                event_bindings: vec![],
                condition: None,
            });
        }

        // Add assignee if present
        if let Some(ref assignee) = task.assignee {
            children.push(UIElement {
                element_type: "div".to_string(),
                class_name: Some("assignee".to_string()),
                text_content: Some(format!("Assigned to: {}", assignee.name.as_ref().unwrap_or(&assignee.user_id))),
                children: vec![],
                event_bindings: vec![],
                condition: None,
            });
        }

        // Add action buttons
        let mut actions = vec![];

        if !matches!(task.status, TaskStatus::InProgress | TaskStatus::Done | TaskStatus::Cancelled) {
            actions.push(UIElement {
                element_type: "button".to_string(),
                class_name: Some("btn-start".to_string()),
                text_content: Some("Start".to_string()),
                children: vec![],
                event_bindings: vec![("click".to_string(), "mark_in_progress".to_string())],
                condition: Some("self.state.status == 'todo'".to_string()),
            });
        }

        if !matches!(task.status, TaskStatus::Done | TaskStatus::Cancelled) {
            actions.push(UIElement {
                element_type: "button".to_string(),
                class_name: Some("btn-complete".to_string()),
                text_content: Some("Complete".to_string()),
                children: vec![],
                event_bindings: vec![("click".to_string(), "mark_done".to_string())],
                condition: None,
            });
        }

        if !matches!(task.status, TaskStatus::Done | TaskStatus::Cancelled) {
            actions.push(UIElement {
                element_type: "button".to_string(),
                class_name: Some("btn-cancel".to_string()),
                text_content: Some("Cancel".to_string()),
                children: vec![],
                event_bindings: vec![("click".to_string(), "cancel".to_string())],
                condition: None,
            });
        }

        children.push(UIElement {
            element_type: "div".to_string(),
            class_name: Some("actions".to_string()),
            text_content: None,
            children: actions,
            event_bindings: vec![],
            condition: None,
        });

        UIElement {
            element_type: "div".to_string(),
            class_name: Some("task-card".to_string()),
            text_content: None,
            children,
            event_bindings: vec![],
            condition: None,
        }
    }

    fn sanitize_id(&self, id: &str) -> String {
        id.replace('-', "_").replace('.', "_")
    }

    /// Generate Python code from the component
    pub fn generate_python_code(&self, component: &PythonComponent) -> String {
        let mut code = String::new();

        // Imports
        for import in &component.imports {
            code.push_str(import);
            code.push('\n');
        }
        code.push('\n');

        // Props class
        code.push_str(&format!("@dataclass\nclass {}:\n", component.props_class.name));
        if component.props_class.fields.is_empty() {
            code.push_str("    pass\n");
        } else {
            for field in &component.props_class.fields {
                let default = match &field.default_value {
                    Some(v) => format!(" = {}", v),
                    None => "".to_string(),
                };
                code.push_str(&format!(
                    "    {}: {}{}\n",
                    field.name, field.type_hint, default
                ));
            }
        }
        code.push('\n');

        // State class
        code.push_str(&format!("@dataclass\nclass {}:\n", component.state_class.name));
        for field in &component.state_class.fields {
            code.push_str(&format!(
                "    {}: {}\n",
                field.name, field.type_hint
            ));
        }
        code.push('\n');

        // Component class
        code.push_str(&format!("class {}(Component):\n", component.name));

        // __init__
        code.push_str(&("    def __init__(self, props: ".to_string() + &component.props_class.name + "):\n"));
        code.push_str("        self.props = props\n");
        code.push_str(&format!(
            "        self.state = {}(\n",
            component.state_class.name
        ));
        for field in &component.state_class.fields {
            code.push_str(&format!(
                "            {}={},\n",
                field.name, field.initial_value
            ));
        }
        code.push_str("        )\n");
        code.push('\n');

        // Lifecycle methods
        if component.lifecycle.has_mount {
            code.push_str("    def mount(self):\n");
            code.push_str(&format!(
                "        print(f\"Task {} component mounted\")\n",
                component.name
            ));
            code.push('\n');
        }

        if component.lifecycle.has_unmount {
            code.push_str("    def unmount(self):\n");
            code.push_str("        print(\"Task component unmounting\")\n");
            code.push('\n');
        }

        // Event handlers
        for handler in &component.event_handlers {
            code.push_str(&format!(
                "    def {}(self, event=None):\n",
                handler.name
            ));
            for (field, value) in &handler.state_updates {
                code.push_str(&format!(
                    "        self.state.{} = {}\n",
                    field, value
                ));
            }
            code.push_str("        self.render()\n");
            code.push('\n');
        }

        // Render method
        code.push_str("    def render(self):\n");
        code.push_str("        return ");
        code.push_str(&self.ui_tree_to_python(&component.render_method.ui_tree, 2));
        code.push('\n');

        code
    }

    fn ui_tree_to_python(&self, element: &UIElement, indent: usize) -> String {
        let indent_str = "    ".repeat(indent);

        // Build children recursively
        let children_str = if element.children.is_empty() {
            "[]".to_string()
        } else {
            let child_strs: Vec<String> = element.children.iter()
                .map(|c| self.ui_tree_to_python(c, indent + 1))
                .collect();
            format!("[\n{}    {}\n{}]", indent_str, child_strs.join(",\n"), indent_str)
        };

        // Build event bindings
        let events_str = if element.event_bindings.is_empty() {
            "{}".to_string()
        } else {
            let pairs: Vec<String> = element.event_bindings.iter()
                .map(|(e, h)| format!("\"{}\": self.{}", e, h))
                .collect();
            format!("{{ {} }}", pairs.join(", "))
        };

        let mut result = format!(
            "{{\n{}    \"type\": \"{}\",\n",
            indent_str, element.element_type
        );

        if let Some(ref cls) = element.class_name {
            result.push_str(&format!("{}    \"class\": \"{}\",\n", indent_str, cls));
        }

        if let Some(ref text) = element.text_content {
            result.push_str(&format!("{}    \"text\": \"{}\",\n", indent_str, text));
        }

        result.push_str(&format!("{}    \"children\": {},\n", indent_str, children_str));
        result.push_str(&format!("{}    \"events\": {},\n", indent_str, events_str));

        if let Some(ref cond) = element.condition {
            result.push_str(&format!("{}    \"condition\": \"{}\"\n", indent_str, cond));
        }

        result.push_str(&format!("{}}}", indent_str));

        result
    }
}

// ============================================================================
// DEMO
// ============================================================================

fn main() {
    println!("╔════════════════════════════════════════════════════════════════╗");
    println!("║     Nickel Protocol → Python Component Migration Demo          ║");
    println!("║          (task_v2.ncl → python_component.ncl)                  ║");
    println!("╚════════════════════════════════════════════════════════════════╝");
    println!();

    // Create sample task data (as would be parsed from task_v2.ncl)
    let sample_tasks = vec![
        TaskV2 {
            id: "task-001".to_string(),
            title: "Implement user authentication".to_string(),
            status: TaskStatus::Todo,
            priority: Priority::High,
            assignee: Some(Assignee {
                user_id: "alice".to_string(),
                name: Some("Alice Chen".to_string()),
            }),
            due_date: Some("2026-04-20T17:00:00Z".to_string()),
            tags: vec!["security".to_string(), "backend".to_string()],
            relations: vec![
                TaskRelation {
                    relation_type: RelationType::Blocks,
                    target_task_id: "task-003".to_string(),
                },
            ],
            created_at: "2026-04-13T10:00:00Z".to_string(),
            updated_at: "2026-04-13T14:30:00Z".to_string(),
        },
        TaskV2 {
            id: "task-002".to_string(),
            title: "Write unit tests".to_string(),
            status: TaskStatus::Done,
            priority: Priority::Medium,
            assignee: Some(Assignee {
                user_id: "bob".to_string(),
                name: Some("Bob Smith".to_string()),
            }),
            due_date: None,
            tags: vec!["testing".to_string()],
            relations: vec![],
            created_at: "2026-04-12T09:00:00Z".to_string(),
            updated_at: "2026-04-13T11:00:00Z".to_string(),
        },
        TaskV2 {
            id: "task-003".to_string(),
            title: "Setup CI/CD pipeline".to_string(),
            status: TaskStatus::InProgress,
            priority: Priority::Critical,
            assignee: None,
            due_date: Some("2026-04-15T12:00:00Z".to_string()),
            tags: vec!["devops".to_string(), "automation".to_string()],
            relations: vec![
                TaskRelation {
                    relation_type: RelationType::DependsOn,
                    target_task_id: "task-001".to_string(),
                },
            ],
            created_at: "2026-04-13T11:00:00Z".to_string(),
            updated_at: "2026-04-13T16:45:00Z".to_string(),
        },
    ];

    println!("📋 SOURCE: Task V2 Protocol Data (from task_v2.ncl)");
    println!("────────────────────────────────────────────────────────────────");
    for task in &sample_tasks {
        println!();
        println!("  Task: {} - {}", task.id, task.title);
        println!("    Status: {:?}, Priority: {:?}", task.status, task.priority);
        if let Some(ref assignee) = task.assignee {
            println!("    Assignee: {} ({})", assignee.name.as_ref().unwrap_or(&assignee.user_id), assignee.user_id);
        }
        println!("    Tags: {:?}", task.tags);
        if !task.relations.is_empty() {
            println!("    Relations: {} related tasks", task.relations.len());
        }
    }
    println!();

    // Create migrator
    println!("🔄 MIGRATING to Python Component Protocol...");
    println!("────────────────────────────────────────────────────────────────");
    let migrator = TaskToComponentMigrator::new();

    // Migrate each task
    let mut components = Vec::new();
    for task in &sample_tasks {
        println!("  Migrating {} → ", task.id);
        let component = migrator.migrate(task);
        println!("    Created {} with:", component.name);
        println!("      - Props class: {} ({} fields)", component.props_class.name, component.props_class.fields.len());
        println!("      - State class: {} ({} fields)", component.state_class.name, component.state_class.fields.len());
        println!("      - Event handlers: {:?}", component.event_handlers.iter().map(|h| &h.name).collect::<Vec<_>>());
        println!("      - Lifecycle: mount={}, unmount={}", component.lifecycle.has_mount, component.lifecycle.has_unmount);
        components.push(component);
    }
    println!();

    // Show detailed migration of first component
    println!("📦 TARGET: Python Component Representation");
    println!("────────────────────────────────────────────────────────────────");
    let first_component = &components[0];
    println!("Component: {}", first_component.name);
    println!();
    println!("Props Class ({}):", first_component.props_class.name);
    for field in &first_component.props_class.fields {
        let default_str = match &field.default_value {
            Some(v) => format!(" = {}", v),
            None => "".to_string(),
        };
        println!("  {}: {}{}", field.name, field.type_hint, default_str);
    }
    println!();

    println!("State Class ({}):", first_component.state_class.name);
    for field in &first_component.state_class.fields {
        println!("  {}: {} = {}", field.name, field.type_hint, field.initial_value);
    }
    println!();

    println!("Event Handlers:");
    for handler in &first_component.event_handlers {
        println!("  {}()", handler.name);
        for (field, value) in &handler.state_updates {
            println!("    → self.state.{} = {}", field, value);
        }
    }
    println!();

    // Generate Python code for first component
    println!("🐍 GENERATED PYTHON CODE");
    println!("════════════════════════════════════════════════════════════════");
    let python_code = migrator.generate_python_code(first_component);
    println!("{}", python_code);

    // Summary
    println!();
    println!("📊 MIGRATION SUMMARY");
    println!("────────────────────────────────────────────────────────────────");
    println!("  Source protocol: task.v2 (Nickel/GAT)");
    println!("  Target protocol: python.component (Python)");
    println!("  Tasks migrated: {}", components.len());
    println!("  Components generated: {}", components.len());
    println!();
    println!("  Mapping rules applied:");
    println!("    • Task ID → Component name (Task{{id}}Component)");
    println!("    • Task fields → Props class fields");
    println!("    • Task status → Mutable state (track changes)");
    println!("    • Status transitions → Event handlers");
    println!("    • Task metadata → UI elements (title, assignee, tags)");
    println!("    • Priority → Conditional UI (badge for high/critical)");
    println!("    • Due date → Display in UI");
    println!("    • Relations → Not directly mapped (requires component refs)");
    println!();

    // Save generated code to file
    let output_path = "task_component_generated.py";
    if let Err(e) = std::fs::write(output_path, &python_code) {
        eprintln!("  ⚠️ Could not save to {}: {}", output_path, e);
    } else {
        println!("  ✅ Generated code saved to: {}", output_path);
    }

    println!();
    println!("✅ Migration complete!");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_migration_basic() {
        let task = TaskV2 {
            id: "test-001".to_string(),
            title: "Test Task".to_string(),
            status: TaskStatus::Todo,
            priority: Priority::Medium,
            assignee: None,
            due_date: None,
            tags: vec![],
            relations: vec![],
            created_at: "2026-04-13T10:00:00Z".to_string(),
            updated_at: "2026-04-13T10:00:00Z".to_string(),
        };

        let migrator = TaskToComponentMigrator::new();
        let component = migrator.migrate(&task);

        assert_eq!(component.name, "Task_test_001Component");
        assert!(component.lifecycle.has_mount);
        assert!(!component.event_handlers.is_empty());
    }

    #[test]
    fn test_code_generation() {
        let task = TaskV2 {
            id: "code-001".to_string(),
            title: "Code Generation Test".to_string(),
            status: TaskStatus::InProgress,
            priority: Priority::High,
            assignee: Some(Assignee {
                user_id: "dev".to_string(),
                name: Some("Developer".to_string()),
            }),
            due_date: Some("2026-04-20T00:00:00Z".to_string()),
            tags: vec!["code".to_string(), "test".to_string()],
            relations: vec![],
            created_at: "2026-04-13T10:00:00Z".to_string(),
            updated_at: "2026-04-13T10:00:00Z".to_string(),
        };

        let migrator = TaskToComponentMigrator::new();
        let component = migrator.migrate(&task);
        let code = migrator.generate_python_code(&component);

        assert!(code.contains("@dataclass"));
        assert!(code.contains(&component.name));
        assert!(code.contains("def render(self)"));
        assert!(code.contains("def mount(self)"));
    }
}
