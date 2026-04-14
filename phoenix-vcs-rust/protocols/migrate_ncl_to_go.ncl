# TheoryMorphism: NclFunction → GoFunction
# Pure panproto format - defines how to migrate NCL functions to Go

{
  id = "ncl.migration.to_go",
  description = "Morphism from NCL functions to Go functions",
  
  # Source and target theories
  source = "ncl.function",
  target = "go.function",
  
  # The morphism definition
  morphism = {
    name = "NclToGo",
    
    # Sort mappings: NCL sort → Go sort
    sort_mappings = [
      # Function types
      { source = "NclFun", target = "GoFun", kind = "direct" },
      { source = "NclParam", target = "GoParam", kind = "direct" },
      { source = "NclParamList", target = "GoParamList", kind = "direct" },
      
      # Type mappings
      { source = "NclNum", target = "GoInt", kind = "direct" },
      { source = "NclString", target = "GoString", kind = "direct" },
      { source = "NclBool", target = "GoBool", kind = "direct" },
      
      # Expression/Statement distinction
      { source = "NclExpr", target = "GoExpr", kind = "direct" },
      { source = "NclType", target = "GoType", kind = "direct" },
      
      # Closures become interfaces in Go
      { source = "NclClosure", target = "GoInterface", kind = "embedded" },
    ],
    
    # Operation mappings with transformations
    op_mappings = [
      # === Parameter constructors (direct) ===
      { source = "ncl_param", target = "go_param", transformation = "identity" },
      { source = "ncl_params_nil", target = "go_params_nil", transformation = "identity" },
      { source = "ncl_params_cons", target = "go_params_cons", transformation = "identity" },
      
      # === Primitive constructors (direct) ===
      { source = "ncl_var", target = "go_var", transformation = "identity" },
      { source = "ncl_num", target = "go_int", transformation = "identity" },
      { source = "ncl_string", target = "go_string", transformation = "identity" },
      { source = "ncl_bool", target = "go_bool", transformation = "identity" },
      
      # === Binary operations (operator rename) ===
      { source = "ncl_add", target = "go_add", transformation = "identity" },
      { source = "ncl_concat", target = "go_concat", transformation = "identity" },
      { source = "ncl_eq", target = "go_eq", transformation = "identity" },
      
      # === Function application ===
      { source = "ncl_apply", target = "go_call", transformation = "identity" },
      
      # === Function construction (major transformation) ===
      # NCL: ncl_fun(name, params, body, return_type)
      # Go:  go_fun(name, params, return_type, body_as_statements)
      {
        source = "ncl_fun",
        target = "go_fun",
        transformation = {
          type = "reorder_args",
          arg_mapping = [0, 1, 3, 2],  # name, params, return_type, body
          body_transform = "expr_to_stmts"  # Body needs expr → stmt conversion
        }
      },
      
      # === Conditional (expression → statement transform) ===
      # NCL: ncl_if(cond, then_expr, else_expr) - returns a value
      # Go:  go_if_return(cond, then_expr, go_return(else_expr)) - statement
      {
        source = "ncl_if",
        target = "go_if_return",
        transformation = {
          type = "if_expr_to_stmt",
          else_wrap = "go_return"
        }
      },
      
      # === Closure (needs manual handling) ===
      {
        source = "ncl_closure",
        target = "go_comment",
        transformation = {
          type = "not_implemented",
          message = "Go closures require manual conversion - use func type or interface{}",
          generate_stub = true
        }
      },
    ],
    
    # Equation mappings: how NCL function equations relate to Go
    equation_mappings = [
      {
        source = "ncl_param_assoc",
        target = "go_param_assoc",
        kind = "preserved"
      },
      {
        source = "ncl_fun_identity",
        target = "go_fun_identity", 
        kind = "preserved"
      }
    ],
    
    # Data migration specification
    data_migration = {
      # Type translation table
      type_translation = {
        "Num" = "int",
        "String" = "string", 
        "Bool" = "bool",
        "Array Num" = "[]int",
        "Array String" = "[]string",
      },
      
      # Operator translation
      operator_translation = {
        "++" = "+",      # String concat
        "==" = "==",    # Equality (same syntax)
        "!=" = "!=",    # Not equal
        "&&" = "&&",    # Logical and
        "||" = "||",    # Logical or
        "%" = "%",      # Modulo
        "|>" = "_pipe_", # Pipe (no direct equivalent)
      },
      
      # Syntax transformation rules
      syntax_rules = [
        {
          pattern = { op = "ncl_fun", args = ["name", "params", "body", "ret"] },
          template = "func {name}({params}) {ret} { {body} }",
          param_style = "typed",
          body_style = "return_stmt"
        }
      ],
    },
    
    # Reverse migration (Go → NCL) - partial
    reverse = {
      possible = true,
      partial = true,
      
      # Go statements don't map back to NCL expressions cleanly
      limitations = [
        "Go if statements cannot be NCL if expressions (side effects)",
        "Go multiple return statements don't map to single NCL expression",
        "Go closures are more expressive than NCL closures",
      ],
    },
  },
  
  # Validation checks
  validations = [
    {
      name = "all_functions_migrated",
      check = {
        forall = "f",
        in = "source.functions",
        exists = "f'",
        in = "target.functions",
        where = { eq = [{ get = "f.name" }, { get = "f'.name" }] }
      },
      severity = "warning"
    },
    {
      name = "no_closure_loss",
      check = {
        not = {
          exists = "f",
          in = "source.functions",
          where = { contains = [{ get = "f.body" }, "ncl_closure"] }
        }
      },
      severity = "info",
      message = "Closures require manual review after migration"
    }
  ]
}
