# TheoryMorphism: TaskV1 → TaskV2
# Pure panproto format - defines how to migrate from v1 to v2

{
  id = "task.migration.v1_to_v2",
  description = "Morphism from TaskV1 to TaskV2",
  
  # Source and target theories
  source = "task.v1",
  target = "task.v2",
  
  # The morphism definition
  morphism = {
    name = "V1ToV2",
    
    # Sort mappings: source sort → target sort
    sort_mappings = [
      { source = "Task", target = "Task", kind = "direct" },
      { source = "TaskId", target = "TaskId", kind = "direct" },
      { source = "Title", target = "Title", kind = "direct" },
      { source = "Status", target = "Status", kind = "direct" },
      { source = "Timestamp", target = "Timestamp", kind = "direct" },
    ],
    
    # Operation mappings with transformations
    op_mappings = [
      # === Identity mappings (direct translation) ===
      { source = "id", target = "id", transformation = "identity" },
      { source = "title", target = "title", transformation = "identity" },
      { source = "timestamp", target = "timestamp", transformation = "identity" },
      
      # Status constructors map directly where they exist
      { source = "todo", target = "todo", transformation = "identity" },
      { source = "done", target = "done", transformation = "identity" },
      
      # === Transformations ===
      
      # v1: task(i, t, s, c) → v2: task(i, t, s, p, a, c, u, g, r)
      # Where new fields get defaults
      {
        source = "task",
        target = "task",
        transformation = {
          type = "expand_args",
          default_args = [
            { index = 3, value = { op = "medium", args = [] } },      # priority = medium
            { index = 4, value = { op = "unassigned", args = [] } }, # assignee = unassigned
            { index = 6, value = { op = "get_created", args = [{ ref = 0 }] } },  # updated = created
            { index = 7, value = { op = "tags_nil", args = [] } },   # tags = empty
            { index = 8, value = { op = "rels_nil", args = [] } },   # relations = empty
          ],
          preserve_args = [0, 1, 2, 5]  # id, title, status, created
        }
      },
      
      # Projections map directly (structure preserved)
      { source = "get_id", target = "get_id", transformation = "identity" },
      { source = "get_title", target = "get_title", transformation = "identity" },
      { source = "get_status", target = "get_status", transformation = "identity" },
      { source = "get_created", target = "get_created", transformation = "identity" },
      
      # v1's set_status → v2's set_status with timestamp update
      {
        source = "set_status",
        target = "set_status",
        transformation = {
          type = "preserve_with_side_effect",
          side_effect = "update_timestamp"
        }
      },
    ],
    
    # Equation mappings: how v1 equations relate to v2
    equation_mappings = [
      {
        source = "task_id_proj",
        target = "task_id_proj",
        kind = "preserved"  # Same equation holds in v2
      },
      {
        source = "task_title_proj",
        target = "task_title_proj",
        kind = "preserved"
      },
      {
        source = "task_status_proj",
        target = "task_status_proj",
        kind = "preserved"
      },
      {
        source = "status_update",
        target = "status_update_v2",
        kind = "generalized"  # v2 version is more general
      },
      {
        source = "status_idempotent",
        target = null,  # No direct mapping - behavioral change in v2
        note = "v2 updates timestamp on each status change, breaking idempotence"
      }
    ],
    
    # Data migration specification
    data_migration = {
      # How to transform v1 task instances to v2
      instance_transform = {
        input_sort = "Task",
        output_sort = "Task",
        
        # Pattern: v1 task(i, t, s, c) → v2 task(i, t, s', p', a', c, u', g', r')
        rules = [
          {
            pattern = { op = "task", args = ["i", "t", "s", "c"] },
            replacement = {
              op = "task",
              args = [
                "i",                                           # 0: TaskId (preserved)
                "t",                                           # 1: Title (preserved)
                { ref = "s" },                                 # 2: Status (preserved)
                { op = "medium", args = [] },                  # 3: Priority (default)
                { op = "unassigned", args = [] },              # 4: Assignee (default)
                "c",                                           # 5: Created (preserved)
                "c",                                           # 6: Updated = Created (migration timestamp)
                { op = "tags_nil", args = [] },                # 7: Tags (empty)
                { op = "rels_nil", args = [] }                 # 8: Relations (empty)
              ]
            },
            conditions = []
          }
        ]
      },
      
      # Default value providers for new fields
      defaults = {
        Priority = { op = "medium", args = [] },
        Assignee = { op = "unassigned", args = [] },
        Tags = { op = "tags_nil", args = [] },
        Relations = { op = "rels_nil", args = [] },
      },
      
      # Computed fields during migration
      computed = {
        # Updated timestamp is set to migration time
        Timestamp_updated = { op = "now", args = [] },
        
        # Completed timestamp derived from status
        Timestamp_completed = {
          condition = { eq = [{ ref = "status" }, { op = "done", args = [] }] },
          then = { op = "now", args = [] },
          else = null
        }
      }
    },
    
    # Reverse migration (v2 → v1) - partial, with information loss
    reverse = {
      possible = true,
      partial = true,
      
      sort_mappings = [
        { target = "Task", source = "Task", kind = "direct" },
        { target = "TaskId", source = "TaskId", kind = "direct" },
        { target = "Title", source = "Title", kind = "direct" },
        { target = "Status", source = "Status", kind = "partial" },
        { target = "Timestamp", source = "Timestamp", kind = "direct" },
        # v2-only sorts have no reverse mapping
        { target = "Priority", source = null, kind = "dropped" },
        { target = "Assignee", source = null, kind = "dropped" },
        { target = "Tag", source = null, kind = "dropped" },
        { target = "Relation", source = null, kind = "dropped" },
      ],
      
      # Status mapping for reverse migration
      status_reverse = {
        todo = "todo",
        in_progress = "todo",  # Information loss
        review = "todo",       # Information loss
        done = "done",
        cancelled = "done"     # Information loss
      },
      
      op_reverse = {
        # v2 task with 9 args → v1 task with 4 args
        task = {
          select_args = [0, 1, 2, 5],  # id, title, status(mapped), created
          status_mapping = "status_reverse"
        }
      },
      
      # Warnings for information loss
      loss_warnings = [
        { field = "Priority", severity = "info", message = "Priority discarded" },
        { field = "Assignee", severity = "info", message = "Assignee discarded" },
        { field = "Tags", severity = "info", message = "Tags discarded" },
        { field = "Relations", severity = "info", message = "Relations discarded" },
        { 
          field = "Status", 
          condition = { in = [{ ref = "status" }, ["in_progress", "review", "cancelled"]] },
          severity = "warning",
          message = "Status '{status}' mapped to '{mapped_status}'"
        },
        {
          field = "Timestamps",
          condition = { neq = [{ ref = "created" }, { ref = "updated" }] },
          severity = "info",
          message = "Updated timestamp discarded, keeping created"
        }
      ]
    }
  },
  
  # Validation checks for migrated data
  validations = [
    {
      name = "ids_preserved",
      check = {
        forall = "t1",
        in = "source.tasks",
        exists = "t2",
        in = "target.tasks",
        where = { eq = [{ op = "get_id", args = ["t1"] }, { op = "get_id", args = ["t2"] }] }
      },
      severity = "error"
    },
    {
      name = "titles_preserved",
      check = {
        forall = "t1",
        in = "source.tasks",
        exists = "t2",
        in = "target.tasks",
        where = { eq = [{ op = "get_title", args = ["t1"] }, { op = "get_title", args = ["t2"] }] }
      },
      severity = "error"
    },
    {
      name = "count_preserved",
      check = { eq = [{ count = "source.tasks" }, { count = "target.tasks" }] },
      severity = "error"
    }
  ]
}
