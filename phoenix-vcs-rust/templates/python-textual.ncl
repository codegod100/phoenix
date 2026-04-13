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

CRITICAL COMMON MISTAKES - NEVER DO THESE:
- NEVER use widget.renderable (Static has no such attribute)
- NEVER use widget.text (Static has no such attribute)  
- NEVER loop through widgets checking if label == "something" to find widgets
- ALWAYS use widget.update("new text") to change Static content
- ALWAYS use specific widget IDs like id="uptime_value" to query later

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
17. MUST import from textual.widgets: Static, Header, Footer, Log, Button, Label, Input, ListItem
18. MUST import from textual.containers: Vertical, Horizontal, Container, Grid, Center, Middle
19. CRITICAL IMPORT RULE: Container is ONLY in textual.containers, NEVER in textual.widgets
20. Check your imports: If you use 'from textual.widgets import Container' your code WILL FAIL
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
27. WIDGET QUERY AND UPDATE RULES:
    - Static widgets ONLY have: update(), render(), query(), query_one() methods
    - Static widgets DO NOT HAVE: .renderable, .text, .label, .value attributes
    - To update: widget.update("new text") - this is the ONLY way
    - To query: self.query_one("#specific_id", Static) - use descriptive IDs
    - NEVER iterate widgets looking for text matches - use IDs instead
    - Example: id="uptime_value" not id="value1"
    - FORBIDDEN PATTERN (will crash): for w in self.query(".box"): if w.query_one(".label").renderable == "Uptime": ...
    - CORRECT PATTERN: uptime_val = self.query_one("#uptime_value", Static); uptime_val.update("...")
28. Widget IDs in CSS use #id syntax. Widget classes use .class syntax
29. compose() yields widgets in order. Query by ID after mounting in on_mount()

REQUIREMENTS TO IMPLEMENT:
{{requirements}}

Generate a complete Python Textual TUI application. USE ONLY THESE PATTERNS:
1. All required imports (textual.app, textual.widgets, textual.containers)
2. Class {Name}App(App) with proper CSS class variable  
3. compose() yields Header, content with ID-tagged widgets, Footer
4. CRITICAL: Every Static that gets updated MUST have unique id="something_specific"
5. CRITICAL: Updates use ONLY: self.query_one("#id", Static).update("text")
6. NO iteration over widgets. NO class-based queries for updates. NO text matching.
7. main() function and if __name__ == "__main__": main() block

EXAMPLE OF CORRECT UPDATE:
    # In compose:
    yield Static("Status: ", id="status_label")
    yield Static("Ready", id="status_value")  # Will be updated
    
    # Later to update:
    self.query_one("#status_value", Static).update("Running")

NEVER DO THIS:
    for widget in self.query(".box"):          # Forbidden: iteration
        if widget.renderable == "Status":      # Forbidden: .renderable
            widget.text = "..."                 # Forbidden: .text

The UI should reflect the requirements - if requirements mention sidebar, include a sidebar layout. If requirements mention logs, include a Log widget. Match the complexity described in requirements.

OUTPUT ONLY RAW PYTHON CODE. NO MARKDOWN. NO EXPLANATIONS.

CORRECT WIDGET UPDATE PATTERN (copy this structure):
    def compose(self) -> ComposeResult:
        yield Header()
        yield Horizontal(
            Vertical(
                Static("Uptime", id="uptime_label"),
                Static("00:00:00", id="uptime_value"),  # Descriptive ID!
                id="sidebar"
            ),
            id="main"
        )
        yield Footer()
    
    def on_mount(self) -> None:
        self.title = "Dashboard"
        # CORRECT: Query by specific ID, then update()
        uptime_display = self.query_one("#uptime_value", Static)
        uptime_display.update("System Ready")
    
    def update_uptime(self, new_value: str) -> None:
        # CORRECT: Direct query by ID, no iteration, no text comparison
        uptime_display = self.query_one("#uptime_value", Static)
        uptime_display.update(new_value)
    
    # INCORRECT - NEVER DO THIS:
    # def update_widgets(self):
    #     for widget in self.query(".box"):           # WRONG! Don't iterate looking for widgets
    #         label = widget.query_one(".label")       # WRONG! Use IDs not classes for queries
    #         if label.renderable == "Uptime":         # WRONG! No .renderable!
    #             label.text = "..."                   # WRONG! No .text!
"%m,

  code_template = m%"
# phoenix: iu_id = "{{iu_id}}"

from textual.app import App, ComposeResult
from textual.widgets import Static, Header, Footer, Log, Button
from textual.containers import Vertical, Horizontal, Container
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
