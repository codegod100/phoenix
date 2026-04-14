# TheoryDocument: JSX-like Component Language v1
# A simple component composition language in the style of React/JSX

{
  id = "jsx.v1",
  description = "Simple JSX-like component language - version 1",
  
  theory = {
    name = "JSXV1",
    
    sorts = [
      # Core UI sorts
      { name = "Component", params = [], kind = "type" },
      { name = "Element", params = [], kind = "type" },
      { name = "TextNode", params = [], kind = "type" },
      { name = "Props", params = [], kind = "type" },
      { name = "Prop", params = [], kind = "type" },
      { name = "PropKey", params = [], kind = "type" },
      { name = "PropValue", params = [], kind = "type" },
      { name = "Children", params = [], kind = "type" },
      { name = "Child", params = [], kind = "type" },
      
      # Component definition
      { name = "ComponentDef", params = [], kind = "type" },
      { name = "Param", params = [], kind = "type" },
      { name = "Params", params = [], kind = "type" },
    ],
    
    ops = [
      # === Prop operations ===
      { name = "prop_key", inputs = ["String"], output = "PropKey" },
      { name = "prop_val_string", inputs = ["String"], output = "PropValue" },
      { name = "prop_val_number", inputs = ["Number"], output = "PropValue" },
      { name = "prop_val_bool", inputs = ["Bool"], output = "PropValue" },
      { name = "prop", inputs = ["PropKey", "PropValue"], output = "Prop" },
      { name = "props_nil", inputs = [], output = "Props" },
      { name = "props_cons", inputs = ["Prop", "Props"], output = "Props" },
      
      # === Children operations ===
      { name = "child_text", inputs = ["TextNode"], output = "Child" },
      { name = "child_element", inputs = ["Element"], output = "Child" },
      { name = "children_nil", inputs = [], output = "Children" },
      { name = "children_cons", inputs = ["Child", "Children"], output = "Children" },
      
      # === Text node ===
      { name = "text", inputs = ["String"], output = "TextNode" },
      
      # === Element constructors (HTML-like) ===
      { name = "el_div", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_span", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_p", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_h1", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_button", inputs = ["Props", "Children"], output = "Element" },
      { name = "el_input", inputs = ["Props"], output = "Element" },  # Self-closing
      { name = "el_img", inputs = ["Props"], output = "Element" },    # Self-closing
      
      # === Component definition ===
      { name = "param", inputs = ["String"], output = "Param" },
      { name = "params_nil", inputs = [], output = "Params" },
      { name = "params_cons", inputs = ["Param", "Params"], output = "Params" },
      { 
        name = "component_def", 
        inputs = ["String", "Params", "Element"],  # name, params, body
        output = "ComponentDef" 
      },
      
      # === Component instantiation ===
      { 
        name = "component", 
        inputs = ["String", "Props", "Children"],  # ref to component_def by name
        output = "Component" 
      },
      
      # === Root ===
      { name = "root", inputs = ["Element"], output = "Component" },
    ],
    
    equations = [
      # Empty props with cons is just the prop
      {
        name = "props_cons_nil",
        lhs = { op = "props_cons", args = ["p", { op = "props_nil", args = [] }] },
        rhs = { op = "props_cons", args = ["p", { op = "props_nil", args = [] }] }
        # Note: This is actually a no-op equation for demonstration
        # Real equation would be about lookup behavior
      },
      
      # Children associativity: cons(a, cons(b, c)) = cons(a, cons(b, c))
      # (Demonstrates list structure)
      
      # Component lookup: when instantiating, name must exist in defs
      # This would be a context-sensitive equation checked at validation time
      
      # Props projection (if we had lookup)
      # get_prop(props_cons(prop(k,v), _), k) = v
    ]
  },
  
  # Example: A simple Button component and its usage
  examples = {
    button_component = {
      op = "component_def",
      args = [
        "Button",                                    # name
        { 
          op = "params_cons", 
          args = [
            { op = "param", args = ["label"] },
            { 
              op = "params_cons", 
              args = [
                { op = "param", args = ["onClick"] },
                { op = "params_nil", args = [] }
              ]
            }
          ]
        },
        {                                            # body
          op = "el_button",
          args = [
            { op = "props_nil", args = [] },           # no extra props
            { 
              op = "children_cons",
              args = [
                { 
                  op = "child_text", 
                  args = [{ op = "text", args = [{ ref = "label" }] }]
                },
                { op = "children_nil", args = [] }
              ]
            }
          ]
        }
      ]
    },
    
    usage = {
      op = "component",
      args = [
        "Button",
        { 
          op = "props_cons",
          args = [
            { 
              op = "prop", 
              args = [
                { op = "prop_key", args = ["label"] },
                { op = "prop_val_string", args = ["Click me!"] }
              ]
            },
            { op = "props_nil", args = [] }
          ]
        },
        { op = "children_nil", args = [] }
      ]
    },
    
    simple_div = {
      op = "el_div",
      args = [
        { 
          op = "props_cons",
          args = [
            {
              op = "prop",
              args = [
                { op = "prop_key", args = ["className"] },
                { op = "prop_val_string", args = ["container"] }
              ]
            },
            { op = "props_nil", args = [] }
          ]
        },
        { 
          op = "children_cons",
          args = [
            { 
              op = "child_text", 
              args = [{ op = "text", args = ["Hello World"] }]
            },
            { op = "children_nil", args = [] }
          ]
        }
      ]
    }
  }
}
