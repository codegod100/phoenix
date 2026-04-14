# TheoryDocument for Task Protocol v1
# Pure panproto format - defines a Generalized Algebraic Theory (GAT)

{
  # Required TheoryDocument fields
  id = "task.v1",
  description = "Simple task management theory - version 1",
  
  # The theory definition
  theory = {
    name = "TaskV1",
    
    # Sorts (types) in the theory
    sorts = [
      { name = "Task", params = [], kind = "type" },
      { name = "TaskId", params = [], kind = "type" },
      { name = "Title", params = [], kind = "type" },
      { name = "Status", params = [], kind = "type" },
      { name = "Timestamp", params = [], kind = "type" },
    ],
    
    # Operations (constructors and functions)
    ops = [
      # Constructors for TaskId
      { name = "id", inputs = ["String"], output = "TaskId" },
      
      # Constructors for Title  
      { name = "title", inputs = ["String"], output = "Title" },
      
      # Constructors for Status (nullary = enum values)
      { name = "todo", inputs = [], output = "Status" },
      { name = "done", inputs = [], output = "Status" },
      
      # Constructors for Timestamp
      { name = "timestamp", inputs = ["String"], output = "Timestamp" },
      
      # Main task constructor
      { 
        name = "task", 
        inputs = ["TaskId", "Title", "Status", "Timestamp"], 
        output = "Task" 
      },
      
      # Projections (destructors)
      { name = "get_id", inputs = ["Task"], output = "TaskId" },
      { name = "get_title", inputs = ["Task"], output = "Title" },
      { name = "get_status", inputs = ["Task"], output = "Status" },
      { name = "get_created", inputs = ["Task"], output = "Timestamp" },
      
      # State transition
      { name = "set_status", inputs = ["Task", "Status"], output = "Task" },
    ],
    
    # Equations (axioms / invariants)
    equations = [
      # get_id(task(id, t, s, c)) = id
      {
        name = "task_id_proj",
        lhs = { op = "get_id", args = [{ op = "task", args = ["i", "t", "s", "c"] }] },
        rhs = "i"
      },
      
      # get_title(task(id, t, s, c)) = t
      {
        name = "task_title_proj",
        lhs = { op = "get_title", args = [{ op = "task", args = ["i", "t", "s", "c"] }] },
        rhs = "t"
      },
      
      # get_status(task(id, t, s, c)) = s
      {
        name = "task_status_proj",
        lhs = { op = "get_status", args = [{ op = "task", args = ["i", "t", "s", "c"] }] },
        rhs = "s"
      },
      
      # set_status(task(i,t,s,c), s') = task(i,t,s',c)
      {
        name = "status_update",
        lhs = { 
          op = "set_status", 
          args = [
            { op = "task", args = ["i", "t", "s", "c"] },
            "s2"
          ] 
        },
        rhs = { op = "task", args = ["i", "t", "s2", "c"] }
      },
      
      # Idempotence: set_status(set_status(t, s), s) = set_status(t, s)
      {
        name = "status_idempotent",
        lhs = { 
          op = "set_status", 
          args = [
            { op = "set_status", args = ["t", "s"] },
            "s"
          ] 
        },
        rhs = { op = "set_status", args = ["t", "s"] }
      },
    ]
  },
  
  # Example instances (optional but useful for testing)
  examples = {
    tasks = [
      { 
        op = "task",
        args = [
          { op = "id", args = ["task-001"] },
          { op = "title", args = ["Implement auth"] },
          { op = "todo", args = [] },
          { op = "timestamp", args = ["2026-04-13T10:00:00Z"] }
        ]
      },
      {
        op = "task",
        args = [
          { op = "id", args = ["task-002"] },
          { op = "title", args = ["Write tests"] },
          { op = "done", args = [] },
          { op = "timestamp", args = ["2026-04-12T09:00:00Z"] }
        ]
      }
    ]
  }
}
