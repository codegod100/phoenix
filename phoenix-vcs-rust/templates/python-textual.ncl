# Python Textual TUI Template
# Complete prompt as single string (parser-compatible)

{
  template_version = "2.0",
  template_name = "python-textual",
  language = "python",
  framework = "textual",

  llm_prompt = m%"
You are a CODE GENERATOR ONLY. Output valid Python code using TEXTUAL framework.

ABSOLUTE RULES - VIOLATION = INVALID OUTPUT:
1. NO explanations, NO markdown ```, NO reasoning
2. START with: # phoenix: iu_id = "{{iu_id}}"
3. FORBIDDEN: Multiple files or modules - ONLY ONE self-contained file
4. FORBIDDEN: Extra boilerplate (config, utils, models directories)
5. Generate EXACTLY what requirements specify - no creative additions
6. All code must be inline in a single file - no external references

PYTHON-SPECIFIC REQUIREMENTS:
7. MUST define `def main() -> int:` function as entry point with return type
8. MUST end with exactly: `if __name__ == "__main__": main()`
9. Use type hints for ALL function signatures (def func() -> ReturnType:)
10. Follow PEP 8: snake_case for functions/variables, PascalCase for classes
11. Import order: stdlib > third-party > local (alphabetical within groups)
12. Prefer f-strings over .format() or % formatting
13. Use `raise ValueError()` not `assert` for argument validation
14. Docstrings for public functions (Google style: \"\"\"Summary.\\n\\nArgs:\"\"\")
15. Maximum line length: 100 characters

TEXTUAL FRAMEWORK RULES:
16. MUST import: from textual.app import App, ComposeResult
17. MUST import: from textual.widgets import Static, Header, Footer, Container
18. MUST import: from textual.containers import Vertical, Horizontal
19. MUST define class {Name}App(App) - class name ends with 'App', inherits from App
20. MUST define CSS class variable with valid Textual CSS
21. MUST define compose(self) -> ComposeResult method
22. CSS RULES - Use ONLY valid Textual CSS properties:
    - text-style: bold (NOT text: bold, NOT font-weight: bold)
    - text-align: center, left, right
    - align: center middle, left top, etc.
    - color: $accent, $foreground, $background, $error, $success
    - background: $surface, $panel, $boost
    - padding: 0, 1, 2
    - margin: 0, 1
    - height: auto, 100%, 1fr, or N (number)
    - width: auto, 100%, 1fr, or N (number)
    - border: none, solid, heavy, double, rounded
    - display: block, none
    - visibility: visible, hidden
    NEVER USE INVALID: text:, font:, font-weight:, font-size:, font-family:
23. compose() MUST yield Header(), then content widgets, then Footer()
24. Use widget ids for styling and queries: Static("...", id="title")
25. Implement on_mount(self) for initialization (set self.title)
26. Handle on_key(self, event) for custom key handling

REQUIREMENTS TO IMPLEMENT:
{{requirements}}

Generate a complete Python Textual TUI application including:
1. All required imports (textual.app, textual.widgets, textual.containers)
2. Class {Name}App(App) with proper CSS class variable
3. compose() method yielding Header, content area with styled widgets, Footer
4. on_mount() method setting self.title
5. main() function creating app and calling app.run()
6. Standard if __name__ == "__main__": main() block
7. Type hints throughout (def compose(self) -> ComposeResult:)
8. Valid Textual CSS only (use text-style: bold, NOT text: bold)

The UI should reflect the requirements - if requirements mention sidebar, include a sidebar layout. If requirements mention logs, include a Log widget. Match the complexity described in requirements.

OUTPUT ONLY RAW PYTHON CODE. NO MARKDOWN. NO EXPLANATIONS.
"%m,

  code_template = m%"
# phoenix: iu_id = "{{iu_id}}"

from textual.app import App, ComposeResult
from textual.widgets import Static, Header, Footer
from textual.containers import Vertical
from typing import NoReturn
import sys

class {{name}}App(App):
    \"\"\"Textual TUI application.\"\"\"
    
    CSS = \"\"\"
    Screen {
        align: center middle;
        background: $surface;
    }
    #title {
        text-style: bold;
        text-align: center;
        color: $accent;
    }
    #content {
        text-align: center;
        color: $foreground;
    }
    \"\"\"
    
    def compose(self) -> ComposeResult:
        yield Header(show_clock=True)
        yield Vertical(
            Static("{{name}}", id="title"),
            Static("Application running", id="content"),
        )
        yield Footer()
    
    def on_mount(self) -> None:
        self.title = "{{name}}"

def main() -> int:
    app = {{name}}App()
    app.run()
    return 0

if __name__ == "__main__":
    sys.exit(main())
"%m,

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

  flake = {
    build_type = "python",
    propagated_build_inputs = [
      "textual",
      "rich",
    ],
  },
}
