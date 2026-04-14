//! Protocol Migration Demo
//!
//! This example demonstrates migrating task data between protocol versions
//! using the Phoenix VCS protocol migration system.

use std::io::Write;

fn main() {
    println!("╔══════════════════════════════════════════════════════════════╗");
    println!("║     Phoenix VCS - Protocol Migration Demo                  ║");
    println!("║     (Task Protocol v1 → v2)                                  ║");
    println!("╚══════════════════════════════════════════════════════════════╝");
    println!();

    // Create sample v1 task data
    let v1_json = r#"[
        {
            "id": "task-001",
            "title": "Implement user authentication",
            "status": "todo",
            "created_at": "2026-04-13T10:00:00Z"
        },
        {
            "id": "task-002",
            "title": "Write unit tests",
            "status": "done",
            "created_at": "2026-04-12T09:30:00Z"
        },
        {
            "id": "task-003",
            "title": "Setup CI/CD pipeline",
            "status": "todo",
            "created_at": "2026-04-13T11:00:00Z"
        }
    ]"#;

    println!("📋 ORIGINAL v1 TASK DATA:");
    println!("────────────────────────────────────────────────────────────────");
    println!("{}", serde_json::to_string_pretty(&serde_json::from_str::<serde_json::Value>(v1_json).unwrap()).unwrap());
    println!();

    // Load and migrate
    #[cfg(feature = "panproto")]
    run_migration_with_panproto(v1_json);
    
    #[cfg(not(feature = "panproto"))]
    run_migration_native(v1_json);

    println!("\n✅ Demo complete!");
}

fn run_migration_native(v1_json: &str) {
    use phoenix_vcs::protocol_migration::{ProtocolMigrator, TaskV1};

    println!("⚙️  Running native migration (panproto feature disabled)...");
    println!();

    let migrator = ProtocolMigrator::new("./protocols");
    
    // Parse v1 tasks
    let v1_tasks: Vec<TaskV1> = match migrator.load_v1_tasks(v1_json) {
        Ok(tasks) => tasks,
        Err(e) => {
            eprintln!("❌ Failed to parse v1 tasks: {}", e);
            return;
        }
    };

    println!("📊 Loaded {} tasks from v1 protocol", v1_tasks.len());
    
    // Perform migration
    let result = migrator.migrate_v1_to_v2(v1_tasks);

    println!();
    println!("📦 MIGRATION RESULT:");
    println!("────────────────────────────────────────────────────────────────");
    println!("Source Protocol: {}", result.source_protocol);
    println!("Target Protocol: {}", result.target_protocol);
    println!("Migration Time:  {}", result.migration_timestamp);
    println!("Rollback Possible: {}", if result.rollback_possible { "✅ Yes" } else { "❌ No" });
    
    if !result.warnings.is_empty() {
        println!();
        println!("⚠️  Warnings:");
        for warning in &result.warnings {
            println!("   • {}", warning);
        }
    }

    if !result.applied_defaults.is_empty() {
        println!();
        println!("🔧 Applied Defaults:");
        for (key, value) in &result.applied_defaults {
            // Show first few defaults as examples
            if key.contains("task-001") {
                println!("   • {} → {}", key, value);
            }
        }
        println!("   ... ({} total defaults applied)", result.applied_defaults.len() / 5); // 5 fields per task
    }

    println!();
    println!("📋 MIGRATED v2 TASK DATA:");
    println!("────────────────────────────────────────────────────────────────");
    
    for task in &result.migrated_tasks {
        println!();
        println!("Task: {}", task.id);
        println!("  Title:     {}", task.title);
        println!("  Status:    {:?}", task.status);
        println!("  Priority:  {:?}", task.priority);
        println!("  Assignee:  {:?}", task.assignee.as_ref().map(|a| &a.user_id).unwrap_or(&"None".to_string()));
        println!("  Tags:      {:?}", task.tags);
        println!("  Created:   {}", task.created_at);
        println!("  Updated:   {}", task.updated_at);
        if let Some(ref completed) = task.completed_at {
            println!("  Completed: {}", completed);
        }
    }

    // Demonstrate rollback
    println!();
    println!("↩️  ROLLBACK DEMONSTRATION:");
    println!("────────────────────────────────────────────────────────────────");
    println!("Attempting to roll back v2 tasks to v1...");
    
    let (rolled_back, warnings) = migrator.rollback_v2_to_v1(result.migrated_tasks);
    
    if warnings.is_empty() {
        println!("✅ Clean rollback - no information lost");
    } else {
        println!("⚠️  Rollback with information loss:");
        for warning in &warnings {
            println!("   • {}", warning);
        }
    }
    
    println!();
    println!("Rolled back {} tasks to v1 format", rolled_back.len());
}

#[cfg(feature = "panproto")]
fn run_migration_with_panproto(v1_json: &str) {
    use phoenix_vcs::protocol_migration::{ProtocolMigrator, TaskV1};
    use phoenix_vcs::protocol_migration::panproto_integration;

    println!("🔬 Running migration with panproto theory integration...");
    println!();

    let migrator = ProtocolMigrator::new("./protocols");
    let paths = migrator.protocol_paths();

    // Load theories
    println!("📚 Loading protocol theories...");
    let v1_theory = match panproto_integration::load_protocol_theory(&paths.v1) {
        Ok(t) => {
            println!("   ✅ Loaded v1 theory: {}", t.name);
            t
        }
        Err(e) => {
            println!("   ⚠️  Could not load v1 theory: {}", e);
            println!("      (This is expected - panproto may need valid Nickel format)");
            return run_migration_native(v1_json);
        }
    };

    let v2_theory = match panproto_integration::load_protocol_theory(&paths.v2) {
        Ok(t) => {
            println!("   ✅ Loaded v2 theory: {}", t.name);
            t
        }
        Err(e) => {
            println!("   ⚠️  Could not load v2 theory: {}", e);
            return run_migration_native(v1_json);
        }
    };

    println!();
    println!("📊 Theory Comparison:");
    let v1_info = panproto_integration::get_theory_info(&v1_theory);
    let v2_info = panproto_integration::get_theory_info(&v2_theory);
    println!("   v1 theory: {} ({} sorts)", v1_info["name"], v1_info["sorts"]);
    println!("   v2 theory: {} ({} sorts)", v2_info["name"], v2_info["sorts"]);
    println!("   v1 sorts: {:?}", v1_info["sort_names"]);
    println!("   v2 sorts: {:?}", v2_info["sort_names"]);

    // Continue with native migration for the data
    run_migration_native(v1_json);
}
