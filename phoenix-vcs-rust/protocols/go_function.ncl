# TheoryDocument: Go Function Language (Target)
# This defines the sorts and operations of Go functions

{
  id = "dev.phoenix.go-function",
  description = "Go function language theory - target for NCL migration",
  theory = "GoFunction",
  extends = [],
  
  # Sorts: types in the Go function language
  sorts = [
    # Function types
    { name = "GoFun", kind = { type = "structural" } },
    { name = "GoParam", kind = { type = "structural" } },
    { name = "GoStmt", kind = { type = "structural" } },
    { name = "GoExpr", kind = { type = "structural" } },
    { name = "GoType", kind = { type = "val", value_kind = "string" } },
    
    # Primitive types
    { name = "GoInt", kind = { type = "val", value_kind = "integer" } },
    { name = "GoFloat", kind = { type = "val", value_kind = "float" } },
    { name = "GoString", kind = { type = "val", value_kind = "string" } },
    { name = "GoBool", kind = { type = "val", value_kind = "bool" } },
    { name = "GoInterface", kind = { type = "structural" } },
    
    # Parameter list
    { name = "GoParamList", kind = { type = "structural" } },
    
    # Statement list (Go has statements, not just expressions)
    { name = "GoStmtList", kind = { type = "structural" } },
    
    # Function type (for closures)
    { name = "GoFuncType", kind = { type = "structural" } },
  ],
  
  # Operations: constructors for Go functions
  ops = [
    # Function construction: func name(params) return_type { body }
    {
      name = "go_fun",
      inputs = [
        { name = "name", sort = "GoString" },
        { name = "params", sort = "GoParamList" },
        { name = "return_type", sort = "GoType" },
        { name = "body", sort = "GoStmtList" },
      ],
      output = "GoFun"
    },
    
    # Parameter construction
    {
      name = "go_param",
      inputs = [
        { name = "name", sort = "GoString" },
        { name = "ty", sort = "GoType" },
      ],
      output = "GoParam"
    },
    
    # Parameter list constructors
    {
      name = "go_params_nil",
      inputs = [],
      output = "GoParamList"
    },
    {
      name = "go_params_cons",
      inputs = [
        { name = "head", sort = "GoParam" },
        { name = "tail", sort = "GoParamList" },
      ],
      output = "GoParamList"
    },
    
    # Statement list constructors
    {
      name = "go_stmts_nil",
      inputs = [],
      output = "GoStmtList"
    },
    {
      name = "go_stmts_cons",
      inputs = [
        { name = "head", sort = "GoStmt" },
        { name = "tail", sort = "GoStmtList" },
      ],
      output = "GoStmtList"
    },
    
    # Statement constructors
    {
      name = "go_return",
      inputs = [{ name = "expr", sort = "GoExpr" }],
      output = "GoStmt"
    },
    {
      name = "go_if_return",
      inputs = [
        { name = "cond", sort = "GoExpr" },
        { name = "then_val", sort = "GoExpr" },
        { name = "else_return", sort = "GoStmt" },
      ],
      output = "GoStmt"
    },
    {
      name = "go_comment",
      inputs = [{ name = "text", sort = "GoString" }],
      output = "GoStmt"
    },
    
    # Expression constructors
    {
      name = "go_var",
      inputs = [{ name = "name", sort = "GoString" }],
      output = "GoExpr"
    },
    {
      name = "go_int",
      inputs = [{ name = "value", sort = "GoInt" }],
      output = "GoExpr"
    },
    {
      name = "go_string",
      inputs = [{ name = "value", sort = "GoString" }],
      output = "GoExpr"
    },
    {
      name = "go_bool",
      inputs = [{ name = "value", sort = "GoBool" }],
      output = "GoExpr"
    },
    
    # Binary operations
    {
      name = "go_add",
      inputs = [
        { name = "left", sort = "GoExpr" },
        { name = "right", sort = "GoExpr" },
      ],
      output = "GoExpr"
    },
    {
      name = "go_concat",
      inputs = [
        { name = "left", sort = "GoExpr" },
        { name = "right", sort = "GoExpr" },
      ],
      output = "GoExpr"
    },
    {
      name = "go_eq",
      inputs = [
        { name = "left", sort = "GoExpr" },
        { name = "right", sort = "GoExpr" },
      ],
      output = "GoExpr"
    },
    {
      name = "go_gt",
      inputs = [
        { name = "left", sort = "GoExpr" },
        { name = "right", sort = "GoExpr" },
      ],
      output = "GoExpr"
    },
    {
      name = "go_mod",
      inputs = [
        { name = "left", sort = "GoExpr" },
        { name = "right", sort = "GoExpr" },
      ],
      output = "GoExpr"
    },
    {
      name = "go_mul",
      inputs = [
        { name = "left", sort = "GoExpr" },
        { name = "right", sort = "GoExpr" },
      ],
      output = "GoExpr"
    },
    
    # Function call (for recursion)
    {
      name = "go_call",
      inputs = [
        { name = "func", sort = "GoString" },
        { name = "args", sort = "GoParamList" },
      ],
      output = "GoExpr"
    },
  ],
}
