# TheoryDocument for Task Protocol v2
# Pure panproto format - extends TaskV1 with new features

{
  id = "task.v2",
  description = "Enhanced task management theory - version 2 with priorities, assignees, and relations",
  
  # Extends v1 - note this is a reference, not automatic inheritance
  # Migration must be explicitly defined
  extends = "task.v1",
  
  theory = {
    name = "TaskV2",
    
    sorts = [
      # Inherited from v1 (re-declared for clarity)
      { name = "Task", params = [], kind = "type" },
      { name = "TaskId", params = [], kind = "type" },
      { name = "Title", params = [], kind = "type" },
      { name = "Status", params = [], kind = "type" },
      { name = "Timestamp", params = [], kind = "type" },
      
      # New sorts in v2
      { name = "Priority", params = [], kind = "type" },
      { name = "Assignee", params = [], kind = "type" },
      { name = "Tag", params = [], kind = "type" },
      { name = "Relation", params = [], kind = "type" },
      { name = "RelationType", params = [], kind = "type" },
      { name = "Tags", params = [], kind = "type" },  # List of Tag
      { name = "Relations", params = [], kind = "type" },  # List of Relation
    ],
    
    ops = [
      # === From v1 (preserved) ===
      { name = "id", inputs = ["String"], output = "TaskId" },
      { name = "title", inputs = ["String"], output = "Title" },
      { name = "timestamp", inputs = ["String"], output = "Timestamp" },
      
      # === Status (expanded from v1) ===
      { name = "todo", inputs = [], output = "Status" },
      { name = "in_progress", inputs = [], output = "Status" },      # NEW
      { name = "review", inputs = [], output = "Status" },            # NEW
      { name = "done", inputs = [], output = "Status" },
      { name = "cancelled", inputs = [], output = "Status" },       # NEW
      
      # === NEW: Priority constructors ===
      { name = "low", inputs = [], output = "Priority" },
      { name = "medium", inputs = [], output = "Priority" },
      { name = "high", inputs = [], output = "Priority" },
      { name = "critical", inputs = [], output = "Priority" },
      
      # === NEW: Assignee constructors ===
      { name = "assignee", inputs = ["String", "String"], output = "Assignee" },  # id, name
      { name = "unassigned", inputs = [], output = "Assignee" },
      
      # === NEW: Tag constructors ===
      { name = "tag", inputs = ["String"], output = "Tag" },
      { name = "tags_nil", inputs = [], output = "Tags" },
      { name = "tags_cons", inputs = ["Tag", "Tags"], output = "Tags" },
      
      # === NEW: Relation constructors ===
      { name = "depends_on", inputs = ["TaskId"], output = "RelationType" },
      { name = "blocks", inputs = ["TaskId"], output = "RelationType" },
      { name = "subtask_of", inputs = ["TaskId"], output = "RelationType" },
      { name = "relation", inputs = ["RelationType", "TaskId"], output = "Relation" },
      { name = "rels_nil", inputs = [], output = "Relations" },
      { name = "rels_cons", inputs = ["Relation", "Relations"], output = "Relations" },
      
      # === Enhanced task constructor (replaces v1's task) ===
      # task2 is the new constructor, task is preserved for compatibility
      { 
        name = "task", 
        inputs = [
          "TaskId",      # 0: id
          "Title",       # 1: title  
          "Status",      # 2: status
          "Priority",    # 3: priority (NEW)
          "Assignee",    # 4: assignee (NEW)
          "Timestamp",   # 5: created
          "Timestamp",   # 6: updated (NEW)
          "Tags",        # 7: tags (NEW)
          "Relations"    # 8: relations (NEW)
        ], 
        output = "Task" 
      },
      
      # === Projections (all updated for new structure) ===
      { name = "get_id", inputs = ["Task"], output = "TaskId" },
      { name = "get_title", inputs = ["Task"], output = "Title" },
      { name = "get_status", inputs = ["Task"], output = "Status" },
      { name = "get_priority", inputs = ["Task"], output = "Priority" },       # NEW
      { name = "get_assignee", inputs = ["Task"], output = "Assignee" },      # NEW
      { name = "get_created", inputs = ["Task"], output = "Timestamp" },
      { name = "get_updated", inputs = ["Task"], output = "Timestamp" },      # NEW
      { name = "get_tags", inputs = ["Task"], output = "Tags" },              # NEW
      { name = "get_relations", inputs = ["Task"], output = "Relations" },    # NEW
      
      # === State transitions (updated) ===
      { name = "set_status", inputs = ["Task", "Status"], output = "Task" },
      { name = "set_priority", inputs = ["Task", "Priority"], output = "Task" },    # NEW
      { name = "set_assignee", inputs = ["Task", "Assignee"], output = "Task" },   # NEW
      { name = "add_tag", inputs = ["Task", "Tag"], output = "Task" },            # NEW
      { name = "add_relation", inputs = ["Task", "Relation"], output = "Task" },  # NEW
    ],
    
    equations = [
      # === v1 projection equations (preserved behavior) ===
      {
        name = "task_id_proj",
        lhs = { op = "get_id", args = [{ op = "task", args = ["i", "t", "s", "p", "a", "c", "u", "g", "r"] }] },
        rhs = "i"
      },
      {
        name = "task_title_proj",
        lhs = { op = "get_title", args = [{ op = "task", args = ["i", "t", "s", "p", "a", "c", "u", "g", "r"] }] },
        rhs = "t"
      },
      {
        name = "task_status_proj",
        lhs = { op = "get_status", args = [{ op = "task", args = ["i", "t", "s", "p", "a", "c", "u", "g", "r"] }] },
        rhs = "s"
      },
      {
        name = "task_priority_proj",
        lhs = { op = "get_priority", args = [{ op = "task", args = ["i", "t", "s", "p", "a", "c", "u", "g", "r"] }] },
        rhs = "p"
      },
      {
        name = "task_assignee_proj",
        lhs = { op = "get_assignee", args = [{ op = "task", args = ["i", "t", "s", "p", "a", "c", "u", "g", "r"] }] },
        rhs = "a"
      },
      
      # === v2-specific equations ===
      # set_status updates status and timestamp
      {
        name = "status_update_v2",
        lhs = { 
          op = "set_status", 
          args = [
            { op = "task", args = ["i", "t", "s", "p", "a", "c", "u", "g", "r"] },
            "s2"
          ] 
        },
        rhs = { op = "task", args = ["i", "t", "s2", "p", "a", "c", "u_new", "g", "r"] }
        # Note: u_new would be current timestamp in implementation
      },
      
      # add_tag conses tag onto list
      {
        name = "add_tag_cons",
        lhs = { 
          op = "add_tag", 
          args = [
            { op = "task", args = ["i", "t", "s", "p", "a", "c", "u", "g", "r"] },
            "tag"
          ] 
        },
        rhs = { op = "task", args = ["i", "t", "s", "p", "a", "c", "u_new", { op = "tags_cons", args = ["tag", "g"] }, "r"] }
      },
      
      # unassigned is identity for get_assignee on migrated tasks
      {
        name = "unassigned_default",
        lhs = { op = "get_assignee", args = ["t"] },
        rhs = { op = "unassigned", args = [] },
        condition = "is_migrated"  # Conditional equation
      },
    ]
  },
  
  examples = {
    tasks = [
      {
        op = "task",
        args = [
          { op = "id", args = ["task-001"] },
          { op = "title", args = ["Implement auth"] },
          { op = "in_progress", args = [] },
          { op = "high", args = [] },
          { op = "assignee", args = ["alice", "Alice Chen"] },
          { op = "timestamp", args = ["2026-04-13T10:00:00Z"] },
          { op = "timestamp", args = ["2026-04-13T14:30:00Z"] },
          { 
            op = "tags_cons", 
            args = [
              { op = "tag", args = ["security"] },
              { 
                op = "tags_cons", 
                args = [
                  { op = "tag", args = ["backend"] },
                  { op = "tags_nil", args = [] }
                ]
              }
            ]
          },
          {
            op = "rels_cons",
            args = [
              { 
                op = "relation", 
                args = [
                  { op = "blocks", args = [{ op = "id", args = ["task-003"] }] },
                  { op = "id", args = ["task-003"] }
                ]
              },
              { op = "rels_nil", args = [] }
            ]
          }
        ]
      }
    ]
  }
}
