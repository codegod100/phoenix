# TheoryMorphism: JSX V1 → JSX V2
# Migration from simple component language to enhanced version

{
  id = "jsx.migration.v1_to_v2",
  description = "Morphism from JSX V1 (simple) to JSX V2 (enhanced with fragments, conditionals, lists)",
  
  source = "jsx.v1",
  target = "jsx.v2",
  
  morphism = {
    name = "JSXV1ToV2",
    
    # Sort mappings: source → target
    sort_mappings = [
      # Core sorts map directly
      { source = "Component", target = "Component", kind = "direct" },
      { source = "Element", target = "Element", kind = "direct" },
      { source = "TextNode", target = "TextNode", kind = "direct" },
      { source = "Props", target = "Props", kind = "direct" },
      { source = "Prop", target = "Prop", kind = "direct" },
      { source = "PropKey", target = "PropKey", kind = "direct" },
      { source = "PropValue", target = "PropValue", kind = "direct" },
      { source = "Children", target = "Children", kind = "direct" },
      { source = "Child", target = "Child", kind = "direct" },
      { source = "ComponentDef", target = "ComponentDef", kind = "direct" },
      { source = "Param", target = "Param", kind = "direct" },
      { source = "Params", target = "Params", kind = "direct" },
      
      # NEW in v2: No source equivalent
      { source = null, target = "Fragment", kind = "introduced" },
      { source = null, target = "Expression", kind = "introduced" },
      { source = null, target = "Condition", kind = "introduced" },
      { source = null, target = "Iterable", kind = "introduced" },
      { source = null, target = "IteratorVar", kind = "introduced" },
      { source = null, target = "RenderNode", kind = "introduced" },
      { source = null, target = "RenderNil", kind = "introduced" },
      { source = null, target = "Slot", kind = "introduced" },
      { source = null, target = "SlotName", kind = "introduced" },
      { source = null, target = "Slots", kind = "introduced" },
      { source = null, target = "StateDef", kind = "introduced" },
      { source = null, target = "StateRef", kind = "introduced" },
      { source = null, target = "StateInitial", kind = "introduced" },
      { source = null, target = "States", kind = "introduced" },
    ],
    
    # Operation mappings
    op_mappings = [
      # === Props (identity) ===
      { source = "prop_key", target = "prop_key", transformation = "identity" },
      { source = "prop_val_string", target = "prop_val_string", transformation = "identity" },
      { source = "prop_val_number", target = "prop_val_number", transformation = "identity" },
      { source = "prop_val_bool", target = "prop_val_bool", transformation = "identity" },
      { source = "prop", target = "prop", transformation = "identity" },
      { source = "props_nil", target = "props_nil", transformation = "identity" },
      { source = "props_cons", target = "props_cons", transformation = "identity" },
      
      # === Children (identity) ===
      { source = "child_text", target = "child_text", transformation = "identity" },
      { source = "child_element", target = "child_element", transformation = "identity" },
      { source = "children_nil", target = "children_nil", transformation = "identity" },
      { source = "children_cons", target = "children_cons", transformation = "identity" },
      { source = "text", target = "text", transformation = "identity" },
      
      # === HTML Elements (identity) ===
      { source = "el_div", target = "el_div", transformation = "identity" },
      { source = "el_span", target = "el_span", transformation = "identity" },
      { source = "el_p", target = "el_p", transformation = "identity" },
      { source = "el_h1", target = "el_h1", transformation = "identity" },
      { source = "el_button", target = "el_button", transformation = "identity" },
      { source = "el_input", target = "el_input", transformation = "identity" },
      { source = "el_img", target = "el_img", transformation = "identity" },
      
      # === Component definition (MAJOR CHANGE) ===
      # v1: component_def(name, params, Element) → ComponentDef
      # v2: component_def(name, params, RenderNode) → ComponentDef
      # Migration wraps Element in render_element
      {
        source = "component_def",
        target = "component_def",
        transformation = {
          type = "wrap_result",
          wrapper = "render_element",
          arg_index = 2  # The Element becomes wrapped
        }
      },
      
      # === Component instantiation (identity) ===
      { source = "component", target = "component", transformation = "identity" },
      
      # === Root (MAJOR CHANGE) ===
      # v1: root(Element) → Component
      # v2: root(RenderNode) → Component
      {
        source = "root",
        target = "root",
        transformation = {
          type = "wrap_arg",
          wrapper = "render_element",
          arg_index = 0
        }
      },
      
      # === Params (identity) ===
      { source = "param", target = "param", transformation = "identity" },
      { source = "params_nil", target = "params_nil", transformation = "identity" },
      { source = "params_cons", target = "params_cons", transformation = "identity" },
      
      # === NEW v2 operations: No source equivalent ===
      # These are introduced fresh in v2:
      # - fragment, child_fragment
      # - render_fragment, render_conditional, render_list, render_nil
      # - render_expression
      # - cond_prop_truthy, cond_prop_eq, cond_state_truthy, etc.
      # - expr_prop, expr_state, etc.
      # - iterable_prop, iterable_state, iterator
      # - slot_name, slot_default, slot_empty, slots_nil, slots_cons
      # - component_def_slotted, slot_ref
      # - state_def, state_ref, state_initial_*, states_nil, states_cons
      # - component_def_stateful
    ],
    
    # Equation mappings
    equation_mappings = [
      {
        source = "props_cons_nil",
        target = null,
        kind = "dropped",
        note = "Equation preserved implicitly through op structure"
      }
    ],
    
    # Data migration specification
    data_migration = {
      instance_transform = {
        # v1 component definitions are wrapped
        component_def_rules = [
          {
            # Simple component: wrap body in render_element
            pattern = { op = "component_def", args = ["name", "params", "body"] },
            replacement = {
              op = "component_def",
              args = [
                "name",
                "params",
                { op = "render_element", args = ["body"] }
              ]
            }
          }
        ],
        
        # v1 root calls are wrapped
        root_rules = [
          {
            pattern = { op = "root", args = ["element"] },
            replacement = {
              op = "root",
              args = [{ op = "render_element", args = ["element"] }]
            }
          }
        ],
        
        # All other structures preserved as-is
        element_rules = [
          { pattern = { op = "el_div", args = ["props", "children"] }, replacement = { op = "el_div", args = ["props", "children"] } },
          { pattern = { op = "el_span", args = ["props", "children"] }, replacement = { op = "el_span", args = ["props", "children"] } },
          { pattern = { op = "el_p", args = ["props", "children"] }, replacement = { op = "el_p", args = ["props", "children"] } },
          { pattern = { op = "el_h1", args = ["props", "children"] }, replacement = { op = "el_h1", args = ["props", "children"] } },
          { pattern = { op = "el_button", args = ["props", "children"] }, replacement = { op = "el_button", args = ["props", "children"] } },
          { pattern = { op = "el_input", args = ["props"] }, replacement = { op = "el_input", args = ["props"] } },
          { pattern = { op = "el_img", args = ["props"] }, replacement = { op = "el_img", args = ["props"] } },
        ],
        
        # Component instantiation preserved
        component_rules = [
          {
            pattern = { op = "component", args = ["name", "props", "children"] },
            replacement = { op = "component", args = ["name", "props", "children"] }
          }
        ]
      },
      
      # No defaults needed for this migration (structural wrapping only)
      defaults = {},
      
      # No computed fields
      computed = {}
    },
    
    # Reverse migration (v2 → v1)
    reverse = {
      possible = true,
      partial = true,
      
      sort_mappings = [
        { target = "Component", source = "Component", kind = "direct" },
        { target = "Element", source = "Element", kind = "direct" },
        { target = "TextNode", source = "TextNode", kind = "direct" },
        { target = "Props", source = "Props", kind = "direct" },
        { target = "Prop", source = "Prop", kind = "direct" },
        { target = "PropKey", source = "PropKey", kind = "direct" },
        { target = "PropValue", source = "PropValue", kind = "direct" },
        { target = "Children", source = "Children", kind = "direct" },
        { target = "Child", source = "Child", kind = "direct" },
        { target = "ComponentDef", source = "ComponentDef", kind = "direct" },
        { target = "Param", source = "Param", kind = "direct" },
        { target = "Params", source = "Params", kind = "direct" },
        
        # v2-only sorts dropped
        { target = "Fragment", source = null, kind = "dropped" },
        { target = "Expression", source = null, kind = "dropped" },
        { target = "Condition", source = null, kind = "dropped" },
        { target = "Iterable", source = null, kind = "dropped" },
        { target = "IteratorVar", source = null, kind = "dropped" },
        { target = "RenderNode", source = null, kind = "dropped" },
        { target = "RenderNil", source = null, kind = "dropped" },
        { target = "Slot", source = null, kind = "dropped" },
        { target = "SlotName", source = null, kind = "dropped" },
        { target = "Slots", source = null, kind = "dropped" },
        { target = "StateDef", source = null, kind = "dropped" },
        { target = "StateRef", source = null, kind = "dropped" },
        { target = "StateInitial", source = null, kind = "dropped" },
        { target = "States", source = null, kind = "dropped" },
      ],
      
      # Reverse operation transformations
      op_reverse = {
        # v2 component_def → v1: unwrap render_element if present
        component_def = {
          type = "unwrap_if_present",
          wrapper = "render_element",
          fallback = "error_if_not_element"  # Can't reverse fragments/conditionals
        },
        
        # v2 root → v1: unwrap
        root = {
          type = "unwrap_if_present",
          wrapper = "render_element",
          fallback = "error_if_not_element"
        },
        
        # NEW v2 elements: map to closest v1 equivalent or error
        el_section = { target = "el_div", note = "semantic downgrade" },
        el_article = { target = "el_div", note = "semantic downgrade" },
        el_header = { target = "el_div", note = "semantic downgrade" },
        el_footer = { target = "el_div", note = "semantic downgrade" },
        el_ul = { target = "el_div", note = "semantic downgrade" },
        el_li = { target = "el_span", note = "semantic downgrade" },
      },
      
      # Node transformation for reverse
      render_node_reverse = [
        # render_element(Element) → Element (unwrap)
        {
          pattern = { op = "render_element", args = ["el"] },
          replacement = "el",
          condition = { is_sort = ["el", "Element"] }
        },
        
        # render_fragment → error (can't represent in v1)
        {
          pattern = { op = "render_fragment", args = ["_"] },
          replacement = null,
          error = "Fragments cannot be expressed in JSX V1"
        },
        
        # render_conditional → error (can't represent in v1)
        {
          pattern = { op = "render_conditional", args = ["_", "_", "_"] },
          replacement = null,
          error = "Conditional rendering cannot be expressed in JSX V1"
        },
        
        # render_list → error (can't represent in v1)
        {
          pattern = { op = "render_list", args = ["_", "_", "_"] },
          replacement = null,
          error = "List rendering cannot be expressed in JSX V1"
        },
        
        # render_nil → empty div (best approximation)
        {
          pattern = { op = "render_nil", args = [] },
          replacement = { op = "el_div", args = [{ op = "props_nil", args = [] }, { op = "children_nil", args = [] }] },
          warning = "render_nil mapped to empty div"
        },
        
        # render_expression → error (can't evaluate in v1)
        {
          pattern = { op = "render_expression", args = ["_"] },
          replacement = null,
          error = "Dynamic expressions cannot be expressed in JSX V1"
        },
        
        # Stateful component → error (can't represent in v1)
        {
          pattern = { op = "component_def_stateful", args = ["_", "_", "_", "_"] },
          replacement = null,
          error = "Stateful components cannot be expressed in JSX V1"
        },
        
        # Slotted component → error (can't represent in v1)
        {
          pattern = { op = "component_def_slotted", args = ["_", "_", "_", "_"] },
          replacement = null,
          error = "Slotted components cannot be expressed in JSX V1"
        }
      ],
      
      # Loss warnings
      loss_warnings = [
        { 
          feature = "Fragment", 
          severity = "error", 
          message = "Fragments require wrapper element in v1"
        },
        { 
          feature = "Conditional", 
          severity = "error", 
          message = "Conditional rendering must be resolved at migration time"
        },
        { 
          feature = "List", 
          severity = "error", 
          message = "List rendering must be expanded at migration time"
        },
        { 
          feature = "State", 
          severity = "error", 
          message = "Stateful components not supported in v1"
        },
        { 
          feature = "Slots", 
          severity = "error", 
          message = "Named slots not supported in v1"
        },
        { 
          feature = "Expressions", 
          severity = "error", 
          message = "Dynamic expressions not supported in v1"
        },
        { 
          feature = "SemanticElements", 
          condition = { used = ["el_section", "el_article", "el_header", "el_footer", "el_ul", "el_li"] },
          severity = "warning", 
          message = "Semantic HTML elements downgraded to div/span"
        }
      ]
    }
  },
  
  # Validation rules
  validations = [
    {
      name = "component_defs_preserved",
      check = {
        forall = "def1",
        in = "source.component_defs",
        exists = "def2",
        in = "target.component_defs",
        where = { 
          eq = [
            { op = "get_name", args = ["def1"] },
            { op = "get_name", args = ["def2"] }
          ] 
        }
      },
      severity = "error"
    },
    {
      name = "elements_preserved",
      check = {
        count = {
          where = "source.elements",
          filter = { not_in = ["el_section", "el_article", "el_header", "el_footer", "el_ul", "el_li"] }
        },
        eq = { count = "target.elements" }
      },
      severity = "error"
    }
  ],
  
  # Migration metadata
  metadata = {
    breaking_changes = false,
    new_features = [
      "Fragments (multi-root components)",
      "Conditional rendering",
      "List/map rendering",
      "Named slots",
      "Component state (simplified hooks)",
      "Dynamic expressions",
      "Additional semantic HTML elements"
    ],
    automatic = true,  # Can be applied automatically
    requires_review = false,  # No manual decisions needed
  }
}
