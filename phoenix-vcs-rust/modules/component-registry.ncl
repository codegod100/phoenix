# Generic Component Definition
# Framework-agnostic component spec that can be wrapped for any framework

{
  # Component registry - defines WHAT each component does, not HOW
  components = {
    todo-list = {
      tag = "todo-list",
      description = "Todo list with API persistence",
      
      # Props with default values
      props = {
        todos = [],
        newTodoText = "",
        loading = false,
      },
      
      # Logic module to import
      logic_module = "component-logic",
      
      # Functions from logic module that this component uses
      logic_imports = ["TodoLogic", "Api"],
      
      # Template fragments (framework-agnostic descriptions)
      template = {
        # Style colors that need theme values
        style_colors = ["primary", "success", "danger", "text", "base", "surface0", "surface1"],
        
        # Event handlers mapped to logic functions
        handlers = {
          addTodo = "TodoLogic.validateText -> fetch -> TodoLogic.add",
          toggleTodo = "TodoLogic.toggle (optimistic) -> fetch",
          deleteTodo = "TodoLogic.delete (optimistic) -> fetch",
        },
        
        # Lifecycle
        lifecycle = {
          connected = "loadTodos",
        },
        
        # Render structure (semantic, not syntax)
        render = {
          title = "📝 Todo List",
          input_placeholder = "Add a new todo...",
          empty_message = "No todos yet. Add one above! ✨",
          show_stats = true,
        }
      }
    },
    
    user-card = {
      tag = "user-card",
      description = "User profile display",
      
      props = {
        name = "User",
        email = "user@example.com",
      },
      
      logic_module = "component-logic",
      logic_imports = ["UserLogic"],
      
      template = {
        style_colors = ["mauve", "text", "base", "surface0", "danger"],
        
        computed = {
          initials = "UserLogic.getInitials(name)",
          isValidEmail = "UserLogic.isValidEmail(email)",
        },
        
        render = {
          show_avatar = true,
          show_email_validation = true,
        }
      }
    },
    
    welcome-card = {
      tag = "welcome-card", 
      description = "Welcome hero section",
      
      props = {
        title = "Welcome",
        message = "Get started",
      },
      
      # No logic module - purely presentational
      logic_module = null,
      logic_imports = [],
      
      template = {
        style_colors = ["mauve", "lavender", "text", "base", "surface0"],
        
        render = {
          gradient_background = true,
          show_theme_badge = true,
        }
      }
    },
  },
  
  # Framework wrappers - transform generic component to framework-specific
  wrappers = {
    # Lit wrapper: transforms generic -> Lit class component
    lit = fun component themeColors => {
      framework = "lit",
      imports = [
        "import { LitElement, html, css } from 'lit';",
        "import { customElement, property, state } from 'lit/decorators.js';",
        if component.logic_module != null then
          "import { " ++ std.string.join ", " component.logic_imports ++ " } from './" ++ component.logic_module ++ "';"
        else "",
      ],
      
      decorator = "@customElement('" ++ component.tag ++ "')",
      
      class_def = "export class " ++ (component.tag | capitalize) ++ " extends LitElement",
      
      # Props become @property or @state
      declarations = std.record.map component.props (fun k v => 
        if k == "todos" || k == "newTodoText" || k == "loading" then
          "@state() private declare " ++ k ++ ": " ++ (v | type_to_ts) ++ ";"
        else
          "@property({ type: " ++ (v | type_to_lit) ++ " }) declare " ++ k ++ ": " ++ (v | type_to_ts) ++ ";"
      ),
      
      constructor = "constructor() { super(); " ++ 
        std.record.to_array component.props 
        |> std.array.map (fun p => "this." ++ p.0 ++ " = " ++ (p.1 | value_to_ts) ++ ";")
        |> std.string.join " " ++ "}",
      
      # Styles with theme colors
      styles = "static styles = css`" ++ 
        (component.template.style_colors 
        |> std.array.map (fun c => "  --" ++ c ++ ": %" ++ c ++ "%;")) ++ "`",
      
      # Render uses Lit's html``
      render_method = "render() { return html`" ++ (component.template.render | render_to_lit) ++ "`; }",
    },
    
    # ElenaJS wrapper: transforms generic -> ElenaJS function component  
    elenajs = fun component themeColors => {
      framework = "elenajs",
      imports = [
        "import { Elena, html } from '@elenajs/core';",
        if component.logic_module != null then
          "import { " ++ std.string.join ", " component.logic_imports ++ " } from './" ++ component.logic_module ++ "';"
        else "",
      ],
      
      function_def = "export function " ++ (component.tag | capitalize) ++ "()",
      
      reactive_def = "return Elena.reactive({" ++
        (component.props | record_to_elenajs_props) ++ 
        "});",
      
      # ElenaJS uses inline styles, not static styles
      style_helpers = component.template.style_colors
        |> std.array.map (fun c => "const " ++ c ++ " = '" ++ themeColors.c ++ "';"),
      
      # Render is a method in the reactive object
      render_method = "render() { return html`" ++ (component.template.render | render_to_elenajs) ++ "`; }",
      
      definition = "Elena.define('" ++ component.tag ++ "', " ++ (component.tag | capitalize) ++ ");",
    },
  },
  
  # Helper to wrap any component for any framework
  wrap = fun component_name framework themeColors =>
    let component = components.component_name in
    let wrapper = wrappers.framework in
    wrapper component themeColors,
}
