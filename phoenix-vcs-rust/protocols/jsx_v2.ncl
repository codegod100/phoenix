# TheoryDocument: JSX-like Component Language v2
# Enhanced component language with fragments, conditionals, and lists

{
  id = "jsx.v2",
  description = "Enhanced JSX-like component language with fragments, conditionals, and list rendering",
  
  extends = "jsx.v1",
  
  theory = {
    name = "JSXV2",
    
    sorts = [
      # Inherited from v1
      { name = "Component", params = [], kind = "type" },
      { name = "Element", params = [], kind = "type" },
      { name = "TextNode", params = [], kind = "type" },
      { name = "Props", params = [], kind = "type" },
      { name = "Prop", params = [], kind = "type" },
      { name = "PropKey", params = [], kind = "type" },
      { name = "PropValue", params = [], kind = "type" },
      { name = "Children", params = [], kind = "type" },
      { name = "Child", params = [], kind = "type" },
      { name = "ComponentDef", params = [], kind = "type" },
      { name = "Param", params = [], kind = "type" },
      { name = "Params", params = [], kind = "type" },
      
      # NEW: Fragment for multi-root components
      { name = "Fragment", params = [], kind = "type" },
      
      # NEW: Expression system
      { name = "Expression", params = [], kind = "type" },
      { name = "Condition", params = [], kind = "type" },
      { name = "Iterable", params = [], kind = "type" },
      { name = "IteratorVar", params = [], kind = "type" },
      
      # NEW: Render alternatives (for conditionals)
      { name = "RenderNode", params = [], kind = "type" },
      { name = "RenderNil", params = [], kind = "type" },  # Renders nothing
      
      # NEW: Slot system for named children
      { name = "Slot", params = [], kind = "type" },
      { name = "SlotName", params = [], kind = "type" },
      { name = "Slots", params = [], kind = "type" },
      
      # NEW: Hook-like state (simplified)
      { name = "StateDef", params = [], kind = "type" },
      { name = "StateRef", params = [], kind = "type" },
      { name = "StateInitial", params = [], kind = "type" },
      { name = "States", params = [], kind = "type" },
    ],
    
    ops = [
      # === Inherited from v1 ===
      { name = "prop_key", inputs = ["String"], output = "PropKey" },
      { name = "prop_val_string", inputs = ["String"], output = "PropValue" },
      { name = "prop_val_number", inputs = ["Number"], output = "PropValue" },
      { name = "prop_val_bool", inputs = ["Bool"], output = "PropValue" },
      { name = "prop", inputs = ["PropKey", "PropValue"], output = "Prop" },
      { name = "props_nil", inputs = [], output = "Props" },
      { name = "props_cons", inputs = ["Prop", "Props"], output = "Props" },
      
      { name = "child_text", inputs = ["TextNode"], output = "Child" },
      { name = "child_element", inputs = ["Element"], output = "Child" },
      { name = "children_nil", inputs = [], output = "Children" },
      { name = "children_cons", inputs = ["Child", "Children"], output = "Children" },
      
      { name = "text", inputs = ["String"], output = "TextNode" },
      
      { name = "el_div", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_span", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_p", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_h1", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_button", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_input", inputs = ["Props"], output = "Element" },
      { name = "el_img", inputs = ["Props"], output = "Element" },
      
      # NEW: More HTML elements
      { name = "el_section", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_article", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_header", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_footer", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_ul", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_li", inputs = ["Props", "Children"], output = "Element" },
      
      { name = "param", inputs = ["String"], output = "Param" },
      { name = "params_nil", inputs = [], output = "Params" },
      { name = "params_cons", inputs = ["Param", "Params"], output = "Params" },
      
      # === NEW: Fragment (multi-root) ===
      { name = "fragment", inputs = ["Children"], output = "Fragment" },
      { name = "child_fragment", inputs = ["Fragment"], output = "Child" },
      
      # Component can now return Fragment or Element
      { 
        name = "component_def", 
        inputs = ["String", "Params", "RenderNode"],  # Changed: Element → RenderNode
        output = "ComponentDef" 
      },
      
      { name = "component", inputs = ["String", "Props", "Children"], output = "Component" },
      { name = "root", inputs = ["RenderNode"], output = "Component" },  # Changed: Element → RenderNode
      
      # === NEW: RenderNode constructors ===
      { name = "render_element", inputs = ["Element"], output = "RenderNode" },
      { name = "render_fragment", inputs = ["Fragment"], output = "RenderNode" },
      { name = "render_conditional", inputs = ["Condition", "RenderNode", "RenderNode"], output = "RenderNode" },
      { name = "render_list", inputs = ["Iterable", "IteratorVar", "RenderNode"], output = "RenderNode" },
      { name = "render_nil", inputs = [], output = "RenderNode" },
      { name = "render_expression", inputs = ["Expression"], output = "RenderNode" },
      
      # === NEW: Condition constructors ===
      { name = "cond_prop_truthy", inputs = ["PropKey"], output = "Condition" },
      { name = "cond_prop_eq", inputs = ["PropKey", "PropValue"], output = "Condition" },
      { name = "cond_state_truthy", inputs = ["StateRef"], output = "Condition" },
      { name = "cond_and", inputs = ["Condition", "Condition"], output = "Condition" },
      { name = "cond_or", inputs = ["Condition", "Condition"], output = "Condition" },
      { name = "cond_not", inputs = ["Condition"], output = "Condition" },
      
      # === NEW: Expression constructors ===
      { name = "expr_prop", inputs = ["PropKey"], output = "Expression" },
      { name = "expr_state", inputs = ["StateRef"], output = "Expression" },
      { name = "expr_string", inputs = ["String"], output = "Expression" },
      { name = "expr_concat", inputs = ["Expression", "Expression"], output = "Expression" },
      
      # === NEW: Iterable/List rendering ===
      { name = "iterable_prop", inputs = ["PropKey"], output = "Iterable" },
      { name = "iterable_state", inputs = ["StateRef"], output = "Iterable" },
      { name = "iterator", inputs = ["String"], output = "IteratorVar" },  # variable name
      
      # === NEW: Slot system ===
      { name = "slot_name", inputs = ["String"], output = "SlotName" },
      { name = "slot_default", inputs = ["SlotName", "Children"], output = "Slot" },
      { name = "slot_empty", inputs = ["SlotName"], output = "Slot" },
      { name = "slots_nil", inputs = [], output = "Slots" },
      { name = "slots_cons", inputs = ["Slot", "Slots"], output = "Slots" },
      
      # NEW: Use slots in component_def
      {
        name = "component_def_slotted",
        inputs = ["String", "Params", "Slots", "RenderNode"],
        output = "ComponentDef"
      },
      
      # NEW: Reference slot in body
      { name = "slot_ref", inputs = ["SlotName"], output = "Children" },
      
      # === NEW: State (simplified hooks) ===
      { name = "state_def", inputs = ["String", "StateInitial"], output = "StateDef" },
      { name = "state_ref", inputs = ["String"], output = "StateRef" },
      { name = "state_initial_string", inputs = ["String"], output = "StateInitial" },
      { name = "state_initial_number", inputs = ["Number"], output = "StateInitial" },
      { name = "state_initial_bool", inputs = ["Bool"], output = "StateInitial" },
      { name = "state_initial_array", inputs = [], output = "StateInitial" },
      { name = "states_nil", inputs = [], output = "States" },
      { name = "states_cons", inputs = ["StateDef", "States"], output = "States" },
      
      # NEW: Component with state
      {
        name = "component_def_stateful",
        inputs = ["String", "Params", "States", "RenderNode"],
        output = "ComponentDef"
      },
    ],
    
    equations = [
      # === Inherited equations (behavioral compatibility) ===
      
      # Fragment with single child = element (optimization)
      {
        name = "fragment_single",
        lhs = { 
          op = "fragment", 
          args = [{ op = "children_cons", args = ["c", { op = "children_nil", args = [] }] }] 
        },
        rhs = { op = "child_fragment", args = [{ op = "fragment", args = [{ op = "children_cons", args = ["c", { op = "children_nil", args = [] }] }] }] }
        # Note: This is a structural equivalence, not semantic equality
      },
      
      # Conditional with render_nil as else = optional rendering
      {
        name = "cond_optional",
        lhs = { 
          op = "render_conditional", 
          args = ["cond", "then_branch", { op = "render_nil", args = [] }] 
        },
        rhs = { op = "render_conditional", args = ["cond", "then_branch", { op = "render_nil", args = [] }] }
        # Self-equation demonstrating the pattern exists
      },
      
      # List rendering with empty iterable = render_nil
      {
        name = "list_empty",
        lhs = { 
          op = "render_list", 
          args = [{ op = "iterable_prop", args = [{ op = "prop_key", args = ["empty"] }] }, "var", "body"] 
        },
        rhs = { op = "render_nil", args = [] },
        condition = { eq = [{ length = "empty" }, 0] }
      },
      
      # Slot with default fills with default when not provided
      {
        name = "slot_default_fill",
        lhs = { op = "slot_ref", args = [{ op = "slot_name", args = ["s"] }] },
        rhs = { op = "slot_default", args = [{ op = "slot_name", args = ["s"] }, "default_children"] },
        condition = { not_provided = "s" }
      },
      
      # State ref resolves to initial value when not yet set
      {
        name = "state_default",
        lhs = { op = "expr_state", args = [{ op = "state_ref", args = ["s"] }] },
        rhs = { op = "state_initial_string", args = [""] },
        condition = { unset = "s" }
      },
    ]
  },
  
  examples = {
    # Fragment example: Multiple roots without wrapper div
    fragment_example = {
      op = "component_def",
      args = [
        "HeaderFragment",
        { op = "params_nil", args = [] },
        {
          op = "render_fragment",
          args = [{
            op = "fragment",
            args = [{
              op = "children_cons",
              args = [
                { op = "child_element", args = [{ op = "el_h1", args = [{ op = "props_nil", args = [] }, { op = "children_cons", args = [{ op = "child_text", args = [{ op = "text", args = ["Title"] }] }, { op = "children_nil", args = [] }] }] }] },
                { 
                  op = "children_cons",
                  args = [
                    { op = "child_element", args = [{ op = "el_p", args = [{ op = "props_nil", args = [] }, { op = "children_cons", args = [{ op = "child_text", args = [{ op = "text", args = ["Subtitle"] }] }, { op = "children_nil", args = [] }] }] }] },
                    { op = "children_nil", args = [] }
                  ]
                }
              ]
            }]
          }]
        }
      ]
    },
    
    # Conditional rendering
    conditional_example = {
      op = "component_def",
      args = [
        "Greeting",
        { 
          op = "params_cons",
          args = [
            { op = "param", args = ["name"] },
            { 
              op = "params_cons",
              args = [
                { op = "param", args = ["showWelcome"] },
                { op = "params_nil", args = [] }
              ]
            }
          ]
        },
        {
          op = "render_conditional",
          args = [
            { op = "cond_prop_truthy", args = [{ op = "prop_key", args = ["showWelcome"] }] },
            {
              op = "render_element",
              args = [{
                op = "el_div",
                args = [
                  { op = "props_nil", args = [] },
                  { 
                    op = "children_cons",
                    args = [
                      { 
                        op = "child_text", 
                        args = [{ op = "text", args = ["Welcome, "] }] 
                      },
                      { 
                        op = "children_cons",
                        args = [
                          { 
                            op = "child_text", 
                            args = [{ op = "text", args = [{ ref = "name" }] }] 
                          },
                          { op = "children_nil", args = [] }
                        ]
                      }
                    ]
                  }
                ]
              }]
            },
            { op = "render_nil", args = [] }
          ]
        }
      ]
    },
    
    # List rendering
    list_example = {
      op = "component_def",
      args = [
        "ItemList",
        { 
          op = "params_cons",
          args = [
            { op = "param", args = ["items"] },
            { op = "params_nil", args = [] }
          ]
        },
        {
          op = "render_list",
          args = [
            { op = "iterable_prop", args = [{ op = "prop_key", args = ["items"] }] },
            { op = "iterator", args = ["item"] },
            {
              op = "render_element",
              args = [{
                op = "el_li",
                args = [
                  { op = "props_nil", args = [] },
                  { 
                    op = "children_cons",
                    args = [
                      { 
                        op = "child_text", 
                        args = [{ op = "text", args = [{ ref = "item" }] }] 
                      },
                      { op = "children_nil", args = [] }
                    ]
                  }
                ]
              }]
            }
          ]
        }
      ]
    },
    
    # Stateful component
    stateful_example = {
      op = "component_def_stateful",
      args = [
        "Counter",
        { op = "params_nil", args = [] },
        {
          op = "states_cons",
          args = [
            { 
              op = "state_def", 
              args = [
                "count",
                { op = "state_initial_number", args = [0] }
              ] 
            },
            { op = "states_nil", args = [] }
          ]
        },
        {
          op = "render_element",
          args = [{
            op = "el_div",
            args = [
              { op = "props_nil", args = [] },
              { 
                op = "children_cons",
                args = [
                  { 
                    op = "child_text", 
                    args = [{ op = "text", args = ["Count: "] }] 
                  },
                  { 
                    op = "children_cons",
                    args = [
                      { 
                        op = "child_element",
                        args = [{
                          op = "el_span",
                          args = [
                            { op = "props_nil", args = [] },
                            { 
                              op = "children_cons",
                              args = [
                                { 
                                  op = "child_text", 
                                  args = [{ op = "text", args = [{ ref = "count" }] }] 
                                },
                                { op = "children_nil", args = [] }
                              ]
                            }
                          ]
                        }]
                      },
                      { op = "children_nil", args = [] }
                    ]
                  }
                ]
              }
            ]
          }]
        }
      ]
    }
  }
}
