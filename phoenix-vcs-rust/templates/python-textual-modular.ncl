# Python Textual TUI Template - Modular Version
# Demonstrates Nickel's merging system combining multiple modules

# First, we define component modules (simulating imports)
let
  # Base universal rules (from prompt-base.ncl)
  Base = {
    base_rules = m%"
You are a CODE GENERATOR ONLY. Output valid Python code using TEXTUAL framework.

ABSOLUTE RULES - VIOLATION = INVALID OUTPUT:
1. NO explanations, NO markdown ```, NO reasoning
2. START with: # phoenix: iu_id = "{{iu_id}}"
3. FORBIDDEN: Multiple files or modules - ONLY ONE self-contained file
4. FORBIDDEN: Extra boilerplate
5. Generate EXACTLY what requirements specify
"%m,
    
    substitutions = {
      iu_id = "{{iu_id}}",
      name = "{{name}}",
      comment_prefix = "#",
    },
  }
in

let
  # Python language rules (from prompt-python.ncl)
  Python = {
    # Merge priority: extends base (not force override)
    python_rules | default = m%"

PYTHON-SPECIFIC:
6. MUST define `def main() -> int:` as entry point
7. MUST end with `if __name__ == "__main__": main()`
8. Use type hints for all functions
9. Follow PEP 8 style
10. Prefer f-strings
"%m,

    python_substitutions = {
      python_version = "3.12",
      typing_imports = "from typing import Optional, List, Dict, Any, NoReturn",
    },
  }
in

let
  # Textual framework rules
  Textual = {
    textual_rules | default = m%"

TEXTUAL FRAMEWORK RULES:
11. MUST import: from textual.app import App, ComposeResult
12. MUST import: from textual.widgets import Static, Header, Footer
13. MUST define class {name}App(App) with CSS class variable
14. MUST define compose() method yielding Header, content, Footer
15. CSS RULES: Use ONLY valid Textual CSS:
    - text-style: bold (NOT text: bold)
    - color: $accent (theme variables)
    - background: $surface
    - align: center middle
    - text-align: center
    - padding: 0 or 1
    - height: auto, 100%, or N
    - width: auto, 100%, or N
    NEVER use: text:, font:, font-weight:, font-size:
16. Handle on_mount() for initialization
17. Use widget ids for styling: Static(..., id="title")
"%m,

    textual_substitutions = {
      framework = "textual",
      version = "0.47",
    },
    
    # Framework-specific templates
    templates = {
      css_template = m%"
    CSS = \"\"\"
    Screen {
        align: center middle;
    }
    #title {
        text-style: bold;
        text-align: center;
        color: $accent;
    }
    #subtitle {
        text-align: center;
        color: $foreground;
        dim: true;
    }
    \"\"\"
"%m,

      compose_template = m%"
    def compose(self) -> ComposeResult:
        yield Header()
        yield Static("{{name}}", id="title")
        yield Static("Application ready", id="subtitle")
        yield Footer()
"%m,
    },
  }
in

# Final merged configuration using Nickel's merge operator '&'
Base & Python & Textual & {
  # Override/add metadata at final level
  template_version = "2.0",
  template_name | force = "python-textual",
  framework = "textual",
  language = "python",
  
  # The complete LLM prompt is assembled from merged parts
  llm_prompt | String = 
    base_rules ++ python_rules ++ textual_rules ++ m%"

Requirements:
{{requirements}}

Generate a complete Python Textual TUI application with:
- Header showing app title and clock
- Main content area with styled text
- Footer showing key bindings
- Proper CSS styling using only valid Textual properties
- Type hints throughout
- Main entry point returning int

OUTPUT ONLY RAW PYTHON CODE.
"%m,

  # Code template (fallback if LLM unavailable)
  code_template = m%"
# phoenix: iu_id = "{{iu_id}}"

from textual.app import App, ComposeResult
from textual.widgets import Static, Header, Footer
from textual.containers import Vertical

class {{name}}App(App):
    \"\"\"Textual TUI for {{name}}.\"\"\"
    {{templates.css_template}}
    {{templates.compose_template}}
    
    def on_mount(self) -> None:
        self.title = "{{name}}"

def main() -> int:
    app = {{name}}App()
    app.run()
    return 0

if __name__ == "__main__":
    main()
"%m,

  # PyProject configuration
  pyproject = {
    build_system = ["hatchling"],
    requires_python = ">=3.12",
    dependencies = [
      "textual>=0.47.0",
      "rich>=13.0.0",
    ],
    entry_point = "src.app:main",
    packages = ["src"],
  },

  # Flake configuration
  flake = {
    build_type = "python",
    propagated_build_inputs = [
      "textual",
      "rich",
    ],
  },
}
