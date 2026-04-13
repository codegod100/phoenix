# Python Textual TUI Template
# Used when spec describes terminal UI, widgets, keyboard input

{
  template_version = "1.0",
  language = "python",
  framework = "textual",
  
  # File to generate
  output_path = "src/app.py",
  
  # LLM prompt for generating Textual TUI code
  llm_prompt = m%"
You are a CODE GENERATOR ONLY. Output valid Python code using the TEXTUAL framework for Terminal UIs.

ABSOLUTE RULES:
1. NO explanations, NO markdown ```, NO reasoning
2. START with: # phoenix: iu_id = "{{iu_id}}"
3. MUST import: from textual.app import App, ComposeResult
4. MUST import: from textual.widgets import Static, Header, Footer
5. MUST define class {{name}}App(App)
6. MUST define compose() method yielding Header, widgets, Footer
7. MUST define def main() that creates app and calls app.run()
8. MUST end with: if __name__ == "__main__": main()

FRAMEWORK: TEXTUAL - Terminal UI with widgets, keyboard input, terminal interface.

Requirements:
{{requirements}}

OUTPUT ONLY RAW PYTHON CODE using TEXTUAL framework.
"%m,
  
  # Code template for TUI app (fallback if LLM unavailable)
  code_template = m%"
# phoenix: iu_id = "{{iu_id}}"

from textual.app import App, ComposeResult
from textual.widgets import Static, Header, Footer
from textual.containers import Vertical

class {{name}}App(App):
    """Terminal User Interface for {{name}}."""
    
    CSS = """
    Screen {
        align: center, middle;
    }
    """
    
    def compose(self) -> ComposeResult:
        """Compose the UI layout."""
        yield Header()
        yield Vertical(
            Static("Welcome to {{name}}", id="title"),
            id="main",
        )
        yield Footer()
    
    def on_mount(self) -> None:
        """Handle app mount."""
        self.title = "{{name}}"


def main():
    """Run the TUI application."""
    app = {{name}}App()
    app.run()

if __name__ == "__main__":
    main()
"%m,
  
  # PyProject configuration
  pyproject = {
    build_system = ["hatchling"],
    requires_python = ">=3.12",
    dependencies = ["textual"],
    entry_point = "src.app:main",
    packages = ["src"],
  },
  
  # Flake configuration
  flake = {
    build_type = "python",
    propagated_build_inputs = ["textual"],
  },
}
