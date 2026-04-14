# TheoryDocument: Python Component Protocol
# Composes python.base to add UI component constructs
# For building component-based UIs in Python (similar to React, Vue, or native GUI frameworks)

{
  id = "python.component",
  description = "Python UI component protocol - composes python.base for component-based interfaces",
  
  # Compose from base Python protocol
  compose = "python.base",
  
  theory = {
    name = "PythonComponent",
    
    sorts = [
      # Inherited from python.base (re-declared for clarity)
      { name = "Module", params = [], kind = "type" },
      { name = "ClassDef", params = [], kind = "type" },
      { name = "FunctionDef", params = [], kind = "type" },
      { name = "Statement", params = [], kind = "type" },
      { name = "Statements", params = [], kind = "type" },
      { name = "Expression", params = [], kind = "type" },
      { name = "Parameter", params = [], kind = "type" },
      { name = "Parameters", params = [], kind = "type" },
      { name = "Type", params = [], kind = "type" },
      { name = "Decorators", params = [], kind = "type" },
      { name = "Decorator", params = [], kind = "type" },
      
      # NEW: Component system
      { name = "ComponentClass", params = [], kind = "type" },
      { name = "PropsClass", params = [], kind = "type" },
      { name = "StateClass", params = [], kind = "type" },
      { name = "RenderMethod", params = [], kind = "type" },
      { name = "LifecycleMethod", params = [], kind = "type" },
      { name = "EventHandler", params = [], kind = "type" },
      
      # NEW: UI tree
      { name = "UIElement", params = [], kind = "type" },
      { name = "UIChildren", params = [], kind = "type" },
      { name = "UIAttribute", params = [], kind = "type" },
      { name = "UIAttributes", params = [], kind = "type" },
      { name = "UIEvent", params = [], kind = "type" },
      { name = "UIEventBinding", params = [], kind = "type" },
      
      # NEW: Widget types (framework-agnostic)
      { name = "WidgetType", params = [], kind = "type" },
      { name = "ContainerType", params = [], kind = "type" },
      { name = "InputType", params = [], kind = "type" },
      
      # NEW: Component reference
      { name = "ComponentRef", params = [], kind = "type" },
      { name = "PropsInstance", params = [], kind = "type" },
    ],
    
    ops = [
      # === Inherited from python.base ===
      # Module
      { name = "module_name", inputs = ["String"], output = "Module" },
      { name = "import_simple", inputs = ["String"], output = "Statement" },
      { name = "import_from", inputs = ["String", "String"], output = "Statement" },
      
      # Function/Class basics
      { name = "func_def", inputs = ["Decorators", "String", "Parameters", "Type", "Statements"], output = "FunctionDef" },
      { name = "class_def", inputs = ["String", "Types", "Statements"], output = "ClassDef" },
      { name = "stmt_func", inputs = ["FunctionDef"], output = "Statement" },
      { name = "stmt_class", inputs = ["ClassDef"], output = "Statement" },
      { name = "stmt_expr", inputs = ["Expression"], output = "Statement" },
      
      # Expressions
      { name = "lit_str", inputs = ["String"], output = "Expression" },
      { name = "lit_int", inputs = ["Number"], output = "Expression" },
      { name = "lit_bool", inputs = ["Bool"], output = "Expression" },
      { name = "lit_none", inputs = [], output = "Expression" },
      { name = "lit_list", inputs = ["Expressions"], output = "Expression" },
      { name = "name", inputs = ["String"], output = "Expression" },
      { name = "self", inputs = [], output = "Expression" },
      { name = "bin_add", inputs = ["Expression", "Expression"], output = "Expression" },
      { name = "call", inputs = ["Expression", "Expressions"], output = "Expression" },
      { name = "attr", inputs = ["Expression", "String"], output = "Expression" },
      
      # Parameters and types
      { name = "param", inputs = ["String", "Type", "Expression"], output = "Parameter" },
      { name = "params_nil", inputs = [], output = "Parameters" },
      { name = "params_cons", inputs = ["Parameter", "Parameters"], output = "Parameters" },
      { name = "type_str", inputs = [], output = "Type" },
      { name = "type_int", inputs = [], output = "Type" },
      { name = "type_bool", inputs = [], output = "Type" },
      { name = "type_list", inputs = ["Type"], output = "Type" },
      { name = "type_custom", inputs = ["String"], output = "Type" },
      { name = "types_nil", inputs = [], output = "Types" },
      { name = "types_cons", inputs = ["Type", "Types"], output = "Types" },
      
      # Decorators
      { name = "decorator", inputs = ["String"], output = "Decorator" },
      { name = "decorators_nil", inputs = [], output = "Decorators" },
      { name = "decorators_cons", inputs = ["Decorator", "Decorators"], output = "Decorators" },
      
      # Control flow
      { name = "return_stmt", inputs = ["Expression"], output = "Statement" },
      { name = "assign_stmt", inputs = ["String", "Expression"], output = "Statement" },
      { name = "if_stmt", inputs = ["Expression", "Statements", "Statements"], output = "Statement" },
      { name = "for_stmt", inputs = ["String", "Expression", "Statements"], output = "Statement" },
      
      # Statement lists
      { name = "stmts_nil", inputs = [], output = "Statements" },
      { name = "stmts_cons", inputs = ["Statement", "Statements"], output = "Statements" },
      { name = "exprs_nil", inputs = [], output = "Expressions" },
      { name = "exprs_cons", inputs = ["Expression", "Expressions"], output = "Expressions" },
      
      # === NEW: Props class ===
      { 
        name = "props_class",
        inputs = ["String", "Attributes"],  # class name, prop definitions
        output = "PropsClass"
      },
      
      # === NEW: State class ===
      { 
        name = "state_class",
        inputs = ["String", "Attributes"],  # class name, state definitions
        output = "StateClass"
      },
      
      # === NEW: Component class ===
      { 
        name = "component_class",
        inputs = [
          "String",           # component name
          "PropsClass",       # props type
          "StateClass",       # state type (or empty)
          "Types",            # base classes (e.g., [Component])
          "LifecycleMethods", # lifecycle hooks
          "RenderMethod",     # render method
          "EventHandlers"     # event handler methods
        ],
        output = "ComponentClass"
      },
      
      # === NEW: Lifecycle methods ===
      { name = "lifecycle_init", inputs = ["Statements"], output = "LifecycleMethod" },
      { name = "lifecycle_mount", inputs = ["Statements"], output = "LifecycleMethod" },
      { name = "lifecycle_update", inputs = ["Statements"], output = "LifecycleMethod" },
      { name = "lifecycle_unmount", inputs = ["Statements"], output = "LifecycleMethod" },
      { name = "lifecycle_nil", inputs = [], output = "LifecycleMethod" },
      { name = "lifecycles_nil", inputs = [], output = "LifecycleMethods" },
      { name = "lifecycles_cons", inputs = ["LifecycleMethod", "LifecycleMethods"], output = "LifecycleMethods" },
      
      # === NEW: Render method ===
      { 
        name = "render_method",
        inputs = ["UIElement"],  # returns UI tree
        output = "RenderMethod"
      },
      
      # === NEW: Event handlers ===
      { 
        name = "event_handler",
        inputs = ["String", "String", "Statements"],  # event name, param name, body
        output = "EventHandler"
      },
      { name = "handlers_nil", inputs = [], output = "EventHandlers" },
      { name = "handlers_cons", inputs = ["EventHandler", "EventHandlers"], output = "EventHandlers" },
      
      # === NEW: UI Elements (framework-agnostic widgets) ===
      # Container widgets
      { name = "ui_div", inputs = ["UIAttributes", "UIChildren"], output = "UIElement" },
      { name = "ui_span", inputs = ["UIAttributes", "UIChildren"], output = "UIElement" },
      { name = "ui_box", inputs = ["UIAttributes", "UIChildren"], output = "UIElement" },
      { name = "ui_stack", inputs = ["UIAttributes", "UIChildren"], output = "UIElement" },
      { name = "ui_grid", inputs = ["UIAttributes", "UIChildren"], output = "UIElement" },
      
      # Text widgets
      { name = "ui_text", inputs = ["Expression"], output = "UIElement" },
      { name = "ui_heading", inputs = ["Number", "Expression"], output = "UIElement" },  # level 1-6
      { name = "ui_paragraph", inputs = ["Expression"], output = "UIElement" },
      
      # Input widgets
      { name = "ui_button", inputs = ["UIAttributes", "Expression", "UIEventBinding"], output = "UIElement" },
      { name = "ui_input", inputs = ["UIAttributes", "UIEventBinding"], output = "UIElement" },
      { name = "ui_checkbox", inputs = ["UIAttributes", "UIEventBinding"], output = "UIElement" },
      { name = "ui_select", inputs = ["UIAttributes", "Expression", "UIEventBinding"], output = "UIElement" },
      
      # Media widgets
      { name = "ui_image", inputs = ["UIAttributes"], output = "UIElement" },
      { name = "ui_icon", inputs = ["UIAttributes"], output = "UIElement" },
      
      # Component reference (nesting)
      { 
        name = "ui_component",
        inputs = ["ComponentRef", "PropsInstance"],
        output = "UIElement"
      },
      
      # Conditional rendering
      { 
        name = "ui_conditional",
        inputs = ["Expression", "UIElement", "UIElement"],  # condition, if_true, if_false
        output = "UIElement"
      },
      
      # List rendering
      { 
        name = "ui_for",
        inputs = ["String", "Expression", "UIElement"],  # var_name, iterable, template
        output = "UIElement"
      },
      
      # === NEW: UI Attributes ===
      { name = "ui_attr", inputs = ["String", "Expression"], output = "UIAttribute" },
      { name = "ui_attrs_nil", inputs = [], output = "UIAttributes" },
      { name = "ui_attrs_cons", inputs = ["UIAttribute", "UIAttributes"], output = "UIAttributes" },
      
      # Common attributes (convenience)
      { name = "ui_attr_id", inputs = ["String"], output = "UIAttribute" },
      { name = "ui_attr_class", inputs = ["String"], output = "UIAttribute" },
      { name = "ui_attr_style", inputs = ["Expression"], output = "UIAttribute" },
      { name = "ui_attr_disabled", inputs = ["Expression"], output = "UIAttribute" },
      
      # === NEW: UI Children ===
      { name = "ui_child", inputs = ["UIElement"], output = "UIChildren" },
      { name = "ui_children_nil", inputs = [], output = "UIChildren" },
      { name = "ui_children_cons", inputs = ["UIElement", "UIChildren"], output = "UIChildren" },
      
      # === NEW: UI Events ===
      { name = "ui_event_click", inputs = [], output = "UIEvent" },
      { name = "ui_event_change", inputs = [], output = "UIEvent" },
      { name = "ui_event_submit", inputs = [], output = "UIEvent" },
      { name = "ui_event_focus", inputs = [], output = "UIEvent" },
      { name = "ui_event_blur", inputs = [], output = "UIEvent" },
      { name = "ui_event_key", inputs = ["String"], output = "UIEvent" },
      { name = "ui_event_none", inputs = [], output = "UIEvent" },
      
      # Event binding
      { 
        name = "ui_bind_event",
        inputs = ["UIEvent", "Expression"],  # event, handler callable
        output = "UIEventBinding"
      },
      { name = "ui_bind_none", inputs = [], output = "UIEventBinding" },
      
      # === NEW: Component reference ===
      { name = "comp_ref", inputs = ["String"], output = "ComponentRef" },
      { name = "props_inst", inputs = ["String", "Expressions"], output = "PropsInstance" },
      { name = "props_inst_none", inputs = [], output = "PropsInstance" },
      
      # === NEW: Module builder ===
      { 
        name = "component_module",
        inputs = [
          "String",           # module name
          "Types",            # imports
          "PropsClasses",     # props definitions
          "StateClasses",     # state definitions
          "ComponentClasses", # component definitions
          "FunctionDefs"      # helper functions
        ],
        output = "Module"
      },
      
      # Lists for module builder
      { name = "props_classes_nil", inputs = [], output = "PropsClasses" },
      { name = "props_classes_cons", inputs = ["PropsClass", "PropsClasses"], output = "PropsClasses" },
      { name = "state_classes_nil", inputs = [], output = "StateClasses" },
      { name = "state_classes_cons", inputs = ["StateClass", "StateClasses"], output = "StateClasses" },
      { name = "component_classes_nil", inputs = [], output = "ComponentClasses" },
      { name = "component_classes_cons", inputs = ["ComponentClass", "ComponentClasses"], output = "ComponentClasses" },
      { name = "function_defs_nil", inputs = [], output = "FunctionDefs" },
      { name = "function_defs_cons", inputs = ["FunctionDef", "FunctionDefs"], output = "FunctionDefs" },
    ],
    
    equations = [
      # Empty children in container is valid (renders nothing)
      {
        name = "empty_container_renders",
        lhs = { op = "ui_div", args = ["attrs", { op = "ui_children_nil", args = [] }] },
        rhs = { op = "ui_div", args = ["attrs", { op = "ui_children_nil", args = [] }] }
        # Self-equation: empty container is valid
      },
      
      # Conditional with none as else is optional
      {
        name = "conditional_optional",
        lhs = { 
          op = "ui_conditional", 
          args = ["cond", "then_branch", { op = "ui_text", args = [{ op = "lit_str", args = [""] }] }] 
        },
        rhs = { op = "ui_conditional", args = ["cond", "then_branch", { op = "ui_text", args = [{ op = "lit_str", args = [""] }] }] }
      },
      
      # Component without state uses empty state class
      {
        name = "component_no_state",
        lhs = { 
          op = "component_class", 
          args = ["name", "props", { op = "state_class", args = ["EmptyState", { op = "attrs_nil", args = [] }] }, "bases", "lifecycles", "render", "handlers"] 
        },
        rhs = { op = "component_class", args = ["name", "props", { op = "state_class", args = ["EmptyState", { op = "attrs_nil", args = [] }] }, "bases", "lifecycles", "render", "handlers"] }
      },
      
      # Event binding none is default
      {
        name = "event_none_default",
        lhs = { op = "ui_bind_none", args = [] },
        rhs = { op = "ui_bind_event", args = [{ op = "ui_event_none", args = [] }, { op = "lit_none", args = [] }] }
      },
    ]
  },
  
  examples = {
    # Counter component with state
    counter_component = {
      op = "component_module",
      args = [
        { op = "module_name", args = ["counter_component"] },
        {
          op = "types_cons",
          args = [
            { op = "type_custom", args = ["Component"] },
            { op = "types_nil", args = [] }
          ]
        },
        {
          op = "props_classes_cons",
          args = [
            {
              op = "props_class",
              args = [
                "CounterProps",
                {
                  op = "attrs_cons",
                  args = [
                    { 
                      op = "attr",
                      args = [
                        "initial_value",
                        { op = "type_hint", args = [{ op = "type_int", args = [] }] },
                        { op = "lit_int", args = [0] }
                      ]
                    },
                    { op = "attrs_nil", args = [] }
                  ]
                }
              ]
            },
            { op = "props_classes_nil", args = [] }
          ]
        },
        {
          op = "state_classes_cons",
          args = [
            {
              op = "state_class",
              args = [
                "CounterState",
                {
                  op = "attrs_cons",
                  args = [
                    { 
                      op = "attr",
                      args = [
                        "count",
                        { op = "type_hint", args = [{ op = "type_int", args = [] }] },
                        { op = "name", args = ["props.initial_value"] }
                      ]
                    },
                    { op = "attrs_nil", args = [] }
                  ]
                }
              ]
            },
            { op = "state_classes_nil", args = [] }
          ]
        },
        {
          op = "component_classes_cons",
          args = [
            {
              op = "component_class",
              args = [
                "Counter",
                { op = "props_class", args = ["CounterProps", { op = "attrs_nil", args = [] }] },
                { op = "state_class", args = ["CounterState", { op = "attrs_nil", args = [] }] },
                {
                  op = "types_cons",
                  args = [
                    { op = "type_custom", args = ["Component"] },
                    { op = "types_nil", args = [] }
                  ]
                },
                { op = "lifecycles_nil", args = [] },
                {
                  op = "render_method",
                  args = [{
                    op = "ui_box",
                    args = [
                      { 
                        op = "ui_attrs_cons",
                        args = [
                          { op = "ui_attr_class", args = ["counter"] },
                          { op = "ui_attrs_nil", args = [] }
                        ]
                      },
                      {
                        op = "ui_children_cons",
                        args = [
                          { op = "ui_text", args = [{ op = "name", args = ["self.state.count"] }] },
                          {
                            op = "ui_children_cons",
                            args = [
                              {
                                op = "ui_button",
                                args = [
                                  { 
                                    op = "ui_attrs_cons",
                                    args = [
                                      { op = "ui_attr_class", args = ["increment"] },
                                      { op = "ui_attrs_nil", args = [] }
                                    ]
                                  },
                                  { op = "lit_str", args = ["+"] },
                                  {
                                    op = "ui_bind_event",
                                    args = [
                                      { op = "ui_event_click", args = [] },
                                      { op = "name", args = ["self.increment"] }
                                    ]
                                  }
                                ]
                              },
                              { op = "ui_children_nil", args = [] }
                            ]
                          }
                        ]
                      }
                    ]
                  }]
                },
                {
                  op = "handlers_cons",
                  args = [
                    {
                      op = "event_handler",
                      args = [
                        "increment",
                        "event",
                        {
                          op = "stmts_cons",
                          args = [
                            { 
                              op = "assign_stmt",
                              args = [
                                "self.state.count",
                                { op = "bin_add", args = [{ op = "name", args = ["self.state.count"] }, { op = "lit_int", args = [1] }] }
                              ]
                            },
                            { op = "stmts_nil", args = [] }
                          ]
                        }
                      ]
                    },
                    { op = "handlers_nil", args = [] }
                  ]
                }
              ]
            },
            { op = "component_classes_nil", args = [] }
          ]
        },
        { op = "function_defs_nil", args = [] }
      ]
    }
  }
}
