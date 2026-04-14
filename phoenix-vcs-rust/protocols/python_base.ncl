# TheoryDocument: Python Base Protocol
# Core Python language constructs as a Generalized Algebraic Theory
# This serves as a foundation for Python-specific protocol extensions

{
  id = "python.base",
  description = "Core Python language constructs - base theory for Python protocols",
  
  theory = {
    name = "PythonBase",
    
    sorts = [
      # Module system
      { name = "Module", params = [], kind = "type" },
      { name = "ModuleName", params = [], kind = "type" },
      { name = "Import", params = [], kind = "type" },
      { name = "Imports", params = [], kind = "type" },
      
      # Statements and expressions
      { name = "Statement", params = [], kind = "type" },
      { name = "Statements", params = [], kind = "type" },
      { name = "Expression", params = [], kind = "type" },
      
      # Definitions
      { name = "ClassDef", params = [], kind = "type" },
      { name = "FunctionDef", params = [], kind = "type" },
      { name = "VariableDef", params = [], kind = "type" },
      
      # Class components
      { name = "ClassName", params = [], kind = "type" },
      { name = "BaseClasses", params = [], kind = "type" },
      { name = "Method", params = [], kind = "type" },
      { name = "Methods", params = [], kind = "type" },
      { name = "Attribute", params = [], kind = "type" },
      { name = "Attributes", params = [], kind = "type" },
      
      # Function components
      { name = "FunctionName", params = [], kind = "type" },
      { name = "Parameter", params = [], kind = "type" },
      { name = "Parameters", params = [], kind = "type" },
      { name = "ReturnType", params = [], kind = "type" },
      { name = "Decorator", params = [], kind = "type" },
      { name = "Decorators", params = [], kind = "type" },
      
      # Types
      { name = "Type", params = [], kind = "type" },
      { name = "TypeHint", params = [], kind = "type" },
      
      # Literals and values
      { name = "String", params = [], kind = "type" },
      { name = "Number", params = [], kind = "type" },
      { name = "Boolean", params = [], kind = "type" },
      { name = "None", params = [], kind = "type" },
      { name = "List", params = [], kind = "type" },
      { name = "Dict", params = [], kind = "type" },
      { name = "Tuple", params = [], kind = "type" },
      
      # Operators
      { name = "BinaryOp", params = [], kind = "type" },
      { name = "UnaryOp", params = [], kind = "type" },
      { name = "Call", params = [], kind = "type" },
      { name = "AttributeAccess", params = [], kind = "type" },
      { name = "Subscript", params = [], kind = "type" },
      
      # Control flow
      { name = "IfStmt", params = [], kind = "type" },
      { name = "ForStmt", params = [], kind = "type" },
      { name = "WhileStmt", params = [], kind = "type" },
      { name = "ReturnStmt", params = [], kind = "type" },
      { name = "AssignStmt", params = [], kind = "type" },
    ],
    
    ops = [
      # === Module operations ===
      { name = "module_name", inputs = ["String"], output = "ModuleName" },
      { name = "import_simple", inputs = ["String"], output = "Import" },
      { name = "import_from", inputs = ["String", "String"], output = "Import" },
      { name = "import_as", inputs = ["String", "String"], output = "Import" },
      { name = "imports_nil", inputs = [], output = "Imports" },
      { name = "imports_cons", inputs = ["Import", "Imports"], output = "Imports" },
      { 
        name = "module", 
        inputs = ["ModuleName", "Imports", "Statements"], 
        output = "Module" 
      },
      
      # === Statement list ===
      { name = "stmts_nil", inputs = [], output = "Statements" },
      { name = "stmts_cons", inputs = ["Statement", "Statements"], output = "Statements" },
      
      # === Class definition ===
      { name = "class_name", inputs = ["String"], output = "ClassName" },
      { name = "bases_nil", inputs = [], output = "BaseClasses" },
      { name = "bases_cons", inputs = ["Type", "BaseClasses"], output = "BaseClasses" },
      { name = "methods_nil", inputs = [], output = "Methods" },
      { name = "methods_cons", inputs = ["Method", "Methods"], output = "Methods" },
      { name = "attrs_nil", inputs = [], output = "Attributes" },
      { name = "attrs_cons", inputs = ["Attribute", "Attributes"], output = "Attributes" },
      { 
        name = "class_def",
        inputs = ["ClassName", "BaseClasses", "Attributes", "Methods"],
        output = "ClassDef"
      },
      { name = "stmt_class", inputs = ["ClassDef"], output = "Statement" },
      
      # === Method ===
      { name = "method", inputs = ["FunctionDef"], output = "Method" },
      { name = "static_method", inputs = ["FunctionDef"], output = "Method" },
      { name = "class_method", inputs = ["FunctionDef"], output = "Method" },
      
      # === Attribute ===
      { 
        name = "attr", 
        inputs = ["String", "Expression", "TypeHint"], 
        output = "Attribute" 
      },
      
      # === Function definition ===
      { name = "func_name", inputs = ["String"], output = "FunctionName" },
      { name = "param", inputs = ["String", "TypeHint", "Expression"], output = "Parameter" },
      { name = "param_simple", inputs = ["String"], output = "Parameter" },
      { name = "params_nil", inputs = [], output = "Parameters" },
      { name = "params_cons", inputs = ["Parameter", "Parameters"], output = "Parameters" },
      { name = "return_type", inputs = ["Type"], output = "ReturnType" },
      { name = "return_type_none", inputs = [], output = "ReturnType" },
      { name = "decorator", inputs = ["String"], output = "Decorator" },
      { name = "decorators_nil", inputs = [], output = "Decorators" },
      { name = "decorators_cons", inputs = ["Decorator", "Decorators"], output = "Decorators" },
      { 
        name = "func_def",
        inputs = ["Decorators", "FunctionName", "Parameters", "ReturnType", "Statements"],
        output = "FunctionDef"
      },
      { name = "stmt_func", inputs = ["FunctionDef"], output = "Statement" },
      
      # === Variable definition ===
      { 
        name = "var_def", 
        inputs = ["String", "TypeHint", "Expression"], 
        output = "VariableDef" 
      },
      { name = "stmt_var", inputs = ["VariableDef"], output = "Statement" },
      
      # === Type hints ===
      { name = "type_hint", inputs = ["Type"], output = "TypeHint" },
      { name = "type_hint_none", inputs = [], output = "TypeHint" },
      
      # === Types ===
      { name = "type_str", inputs = [], output = "Type" },
      { name = "type_int", inputs = [], output = "Type" },
      { name = "type_float", inputs = [], output = "Type" },
      { name = "type_bool", inputs = [], output = "Type" },
      { name = "type_none", inputs = [], output = "Type" },
      { name = "type_list", inputs = ["Type"], output = "Type" },
      { name = "type_dict", inputs = ["Type", "Type"], output = "Type" },
      { name = "type_tuple", inputs = ["Types"], output = "Type" },
      { name = "type_custom", inputs = ["String"], output = "Type" },
      { name = "types_nil", inputs = [], output = "Types" },
      { name = "types_cons", inputs = ["Type", "Types"], output = "Types" },
      
      # === Literals ===
      { name = "lit_str", inputs = ["String"], output = "Expression" },
      { name = "lit_int", inputs = ["Number"], output = "Expression" },
      { name = "lit_float", inputs = ["Number"], output = "Expression" },
      { name = "lit_bool", inputs = ["Boolean"], output = "Expression" },
      { name = "lit_none", inputs = [], output = "Expression" },
      { name = "lit_list", inputs = ["Expressions"], output = "Expression" },
      { name = "lit_dict", inputs = ["DictItems"], output = "Expression" },
      
      # === Expressions list ===
      { name = "exprs_nil", inputs = [], output = "Expressions" },
      { name = "exprs_cons", inputs = ["Expression", "Expressions"], output = "Expressions" },
      
      # === Dict items ===
      { name = "dict_item", inputs = ["Expression", "Expression"], output = "DictItem" },
      { name = "dict_items_nil", inputs = [], output = "DictItems" },
      { name = "dict_items_cons", inputs = ["DictItem", "DictItems"], output = "DictItems" },
      
      # === Variables and names ===
      { name = "name", inputs = ["String"], output = "Expression" },
      { name = "self", inputs = [], output = "Expression" },
      { name = "cls", inputs = [], output = "Expression" },
      
      # === Binary operations ===
      { name = "bin_add", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_sub", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_mul", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_div", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_mod", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_eq", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_ne", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_lt", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_gt", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_and", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "bin_or", inputs = ["Expression", "Expression"], output = "Expression" },
      
      # === Unary operations ===
      { name = "un_not", inputs = ["Expression"], output = "Expression" },
      { name = "un_neg", inputs = ["Expression"], output = "Expression" },
      
      # === Calls and access ===
      { name = "call", inputs = ["Expression", "Expressions"], output = "Expression" },
      { name = "attr", inputs = ["Expression", "String"], output = "Expression" },
      { name = "subscript", inputs = ["Expression", "Expression"], output = "Expression" },
      
      # === Control flow ===
      { 
        name = "if_stmt",
        inputs = ["Expression", "Statements", "Statements"],  # cond, then, else
        output = "Statement"
      },
      { 
        name = "for_stmt",
        inputs = ["String", "Expression", "Statements"],  # var, iterable, body
        output = "Statement"
      },
      { 
        name = "while_stmt",
        inputs = ["Expression", "Statements"],  # cond, body
        output = "Statement"
      },
      { name = "return_stmt", inputs = ["Expression"], output = "Statement" },
      { name = "return_stmt_none", inputs = [], output = "Statement" },
      { 
        name = "assign_stmt", 
        inputs = ["String", "Expression"], 
        output = "Statement" 
      },
      { 
        name = "expr_stmt", 
        inputs = ["Expression"], 
        output = "Statement" 
      },
      
      # === Pass ===
      { name = "pass_stmt", inputs = [], output = "Statement" },
    ],
    
    equations = [
      # Empty statements list is identity
      {
        name = "stmts_nil_append",
        lhs = { op = "stmts_cons", args = ["s", { op = "stmts_nil", args = [] }] },
        rhs = { op = "stmts_cons", args = ["s", { op = "stmts_nil", args = [] }] }
      },
      
      # Parameter without default value
      {
        name = "param_no_default",
        lhs = { op = "param", args = ["name", "hint", { op = "lit_none", args = [] }] },
        rhs = { op = "param_simple", args = ["name"] },
        condition = { no_default = true }
      },
      
      # Type hint none is no hint
      {
        name = "type_hint_none_eq",
        lhs = { op = "type_hint_none", args = [] },
        rhs = { op = "type_hint", args = [{ op = "type_none", args = [] }] }
      },
    ]
  },
  
  examples = {
    simple_module = {
      op = "module",
      args = [
        { op = "module_name", args = ["example"] },
        { 
          op = "imports_cons",
          args = [
            { op = "import_simple", args = ["typing"] },
            { op = "imports_nil", args = [] }
          ]
        },
        {
          op = "stmts_cons",
          args = [
            { 
              op = "stmt_func",
              args = [{
                op = "func_def",
                args = [
                  { op = "decorators_nil", args = [] },
                  { op = "func_name", args = ["hello"] },
                  { 
                    op = "params_cons",
                    args = [
                      { op = "param_simple", args = ["name"] },
                      { op = "params_nil", args = [] }
                    ]
                  },
                  { op = "return_type_none", args = [] },
                  {
                    op = "stmts_cons",
                    args = [
                      { 
                        op = "expr_stmt",
                        args = [{
                          op = "call",
                          args = [
                            { op = "name", args = ["print"] },
                            { 
                              op = "exprs_cons",
                              args = [
                                { op = "bin_add", args = [{ op = "lit_str", args = ["Hello, "] }, { op = "name", args = ["name"] }] },
                                { op = "exprs_nil", args = [] }
                              ]
                            }
                          ]
                        }]
                      },
                      { op = "stmts_nil", args = [] }
                    ]
                  }
                ]
              }]
            },
            { op = "stmts_nil", args = [] }
          ]
        }
      ]
    }
  }
}
