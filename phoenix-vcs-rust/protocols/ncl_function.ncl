# TheoryDocument: NCL Function Language (Source)
# This defines the sorts and operations of Nickel functions

{
  id = "dev.phoenix.ncl-function",
  description = "NCL (Nickel) function language theory - source for Go migration",
  theory = "NclFunction",
  extends = [],
  
  # Sorts: types in the NCL function language
  sorts = [
    # Function types
    { name = "NclFun", kind = { type = "structural" } },
    { name = "NclParam", kind = { type = "structural" } },
    { name = "NclExpr", kind = { type = "structural" } },
    { name = "NclType", kind = { type = "val", value_kind = "string" } },
    
    # Primitive types
    { name = "NclNum", kind = { type = "val", value_kind = "integer" } },
    { name = "NclString", kind = { type = "val", value_kind = "string" } },
    { name = "NclBool", kind = { type = "val", value_kind = "bool" } },
    
    # Parameter list
    { name = "NclParamList", kind = { type = "structural" } },
    
    # Closure (higher-order function)
    { name = "NclClosure", kind = { type = "structural" } },
  ],
  
  # Operations: constructors for NCL functions
  ops = [
    # Function construction: fun params => body
    {
      name = "ncl_fun",
      inputs = [
        { name = "name", sort = "NclString" },
        { name = "params", sort = "NclParamList" },
        { name = "body", sort = "NclExpr" },
        { name = "return_type", sort = "NclType" },
      ],
      output = "NclFun"
    },
    
    # Parameter construction
    {
      name = "ncl_param",
      inputs = [
        { name = "name", sort = "NclString" },
        { name = "ty", sort = "NclType" },
      ],
      output = "NclParam"
    },
    
    # Parameter list constructors
    {
      name = "ncl_params_nil",
      inputs = [],
      output = "NclParamList"
    },
    {
      name = "ncl_params_cons",
      inputs = [
        { name = "head", sort = "NclParam" },
        { name = "tail", sort = "NclParamList" },
      ],
      output = "NclParamList"
    },
    
    # Expression constructors
    {
      name = "ncl_var",
      inputs = [{ name = "name", sort = "NclString" }],
      output = "NclExpr"
    },
    {
      name = "ncl_num",
      inputs = [{ name = "value", sort = "NclNum" }],
      output = "NclExpr"
    },
    {
      name = "ncl_string",
      inputs = [{ name = "value", sort = "NclString" }],
      output = "NclExpr"
    },
    {
      name = "ncl_bool",
      inputs = [{ name = "value", sort = "NclBool" }],
      output = "NclExpr"
    },
    
    # Binary operations
    {
      name = "ncl_add",
      inputs = [
        { name = "left", sort = "NclExpr" },
        { name = "right", sort = "NclExpr" },
      ],
      output = "NclExpr"
    },
    {
      name = "ncl_concat",
      inputs = [
        { name = "left", sort = "NclExpr" },
        { name = "right", sort = "NclExpr" },
      ],
      output = "NclExpr"
    },
    {
      name = "ncl_eq",
      inputs = [
        { name = "left", sort = "NclExpr" },
        { name = "right", sort = "NclExpr" },
      ],
      output = "NclExpr"
    },
    
    # Conditional
    {
      name = "ncl_if",
      inputs = [
        { name = "cond", sort = "NclExpr" },
        { name = "then_branch", sort = "NclExpr" },
        { name = "else_branch", sort = "NclExpr" },
      ],
      output = "NclExpr"
    },
    
    # Function application (recursion)
    {
      name = "ncl_apply",
      inputs = [
        { name = "func", sort = "NclString" },
        { name = "args", sort = "NclParamList" },
      ],
      output = "NclExpr"
    },
    
    # Closure construction
    {
      name = "ncl_closure",
      inputs = [
        { name = "param", sort = "NclParam" },
        { name = "body", sort = "NclExpr" },
      ],
      output = "NclClosure"
    },
  ],
  
  # Example instances - actual NCL functions as terms
  examples = {
    func_add = {
      op = "ncl_fun",
      args = [
        { op = "ncl_string", args = ["add"] },
        {
          op = "ncl_params_cons",
          args = [
            { op = "ncl_param", args = [{ op = "ncl_string", args = ["a"] }, { op = "ncl_string", args = ["Num"] }] },
            {
              op = "ncl_params_cons",
              args = [
                { op = "ncl_param", args = [{ op = "ncl_string", args = ["b"] }, { op = "ncl_string", args = ["Num"] }] },
                { op = "ncl_params_nil", args = [] }
              ]
            }
          ]
        },
        {
          op = "ncl_add",
          args = [
            { op = "ncl_var", args = ["a"] },
            { op = "ncl_var", args = ["b"] }
          ]
        },
        { op = "ncl_string", args = ["Num"] }
      ]
    },
    
    func_greet = {
      op = "ncl_fun",
      args = [
        { op = "ncl_string", args = ["greet"] },
        {
          op = "ncl_params_cons",
          args = [
            { op = "ncl_param", args = [{ op = "ncl_string", args = ["name"] }, { op = "ncl_string", args = ["String"] }] },
            { op = "ncl_params_nil", args = [] }
          ]
        },
        {
          op = "ncl_concat",
          args = [
            { op = "ncl_concat", args = [
              { op = "ncl_string", args = ["Hello, "] },
              { op = "ncl_var", args = ["name"] }
            ]},
            { op = "ncl_string", args = ["!"] }
          ]
        },
        { op = "ncl_string", args = ["String"] }
      ]
    },
    
    func_max = {
      op = "ncl_fun",
      args = [
        { op = "ncl_string", args = ["max"] },
        {
          op = "ncl_params_cons",
          args = [
            { op = "ncl_param", args = [{ op = "ncl_string", args = ["x"] }, { op = "ncl_string", args = ["Num"] }] },
            {
              op = "ncl_params_cons",
              args = [
                { op = "ncl_param", args = [{ op = "ncl_string", args = ["y"] }, { op = "ncl_string", args = ["Num"] }] },
                { op = "ncl_params_nil", args = [] }
              ]
            }
          ]
        },
        {
          op = "ncl_if",
          args = [
            {
              op = "ncl_gt",
              args = [{ op = "ncl_var", args = ["x"] }, { op = "ncl_var", args = ["y"] }]
            },
            { op = "ncl_var", args = ["x"] },
            { op = "ncl_var", args = ["y"] }
          ]
        },
        { op = "ncl_string", args = ["Num"] }
      ]
    },
  },
}
