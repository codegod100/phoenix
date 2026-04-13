# Python-specific prompt module
# Merges with prompt-base.ncl using Nickel's merge operator '&'
# Demonstrates: defaults, extension, and override patterns

{
  # Override base metadata
  template_name | force = "python",
  
  | doc "Python language extension - adds Python-specific rules and templates"
  
  # Python-specific rules - merged with base_rules in final template
  # This extends base_rules rather than replacing
  python_rules | String
    | doc "Python-specific code generation rules"
    = m%"

PYTHON-SPECIFIC REQUIREMENTS:
7. MUST define `def main() -> int:` function as entry point
8. MUST end with exactly: `if __name__ == "__main__": main()`
9. Use type hints for all function signatures
10. Follow PEP 8 naming: snake_case for functions/variables, PascalCase for classes
11. Import order: stdlib > third-party > local (alphabetical within groups)
12. Prefer f-strings over .format() or % formatting
13. Use `raise ValueError()` not `assert` for argument validation
14. Docstrings required for public functions (Google style)
15. Maximum line length: 100 characters
"%m,

  # Python-specific variable substitutions (extends base.substitutions)
  python_substitutions | {} = {
    # Additional Python-specific variables
    python_version = "3.12",
    typing_imports = "from typing import Optional, List, Dict, Any",
    shebang = "#!/usr/bin/env python3",
  },

  # Python code templates - can be included in prompts
  templates | {} = {
    # Main entry point template
    main_function | String = m%"
def main() -> int:
    \"\"\"Main entry point for {{name}}.\"\"\"
    try:
        app = {{name}}App()
        return app.run()
    except KeyboardInterrupt:
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        return 1

if __name__ == "__main__":
    sys.exit(main())
"%m,

    # Class template with docstring
    class_template | String = m%"
class {{name}}App:
    \"\"\"{{name}} application implementation.
    
    Generated from IU: {{iu_id}}
    \"\"\"
    
    def __init__(self) -> None:
        \"\"\"Initialize application state.\"\"\"
        pass
"%m,

    # Import section template
    imports_template | String = m%"
import sys
from typing import Optional, List, Dict, Any

# Third-party imports will be added based on requirements
"%m,
  },

  # Python-specific code quality guidelines
  quality_config | {
    max_line_length | Number,
    use_type_hints | Bool,
    use_docstrings | Bool,
    min_function_length | Number,
    pep8_compliance | String,
  } = {
    max_line_length = 100,
    use_type_hints = true,
    use_docstrings = true,
    min_function_length = 3,
    pep8_compliance = "strict",
  },

  # Common Python patterns by framework (can be selected in spec)
  framework_patterns | {} = {
    # Textual TUI patterns
    textual = {
      required_imports = [
        "from textual.app import App, ComposeResult",
        "from textual.widgets import Static, Header, Footer",
        "from textual.containers import Container, Vertical, Horizontal",
      ],
      base_class = "App",
      compose_method = true,
      css_support = true,
    },
    
    # Flask web patterns
    flask = {
      required_imports = [
        "from flask import Flask, jsonify, request",
        "from werkzeug.exceptions import BadRequest",
      ],
      base_class = "Flask",
      factory_pattern = true,
      route_decorators = true,
    },
    
    # FastAPI patterns
    fastapi = {
      required_imports = [
        "from fastapi import FastAPI, HTTPException",
        "from pydantic import BaseModel",
      ],
      base_class = "FastAPI",
      async_support = true,
      type_validation = true,
    },
    
    # Plain Python (no framework)
    plain = {
      required_imports = [],
      base_class = null,
      functional_style = true,
    },
  },
}

# Example of how to merge with base in a spec:
# let base = import "prompt-base.ncl" in
# let python = import "prompt-python.ncl" in
# base & python & {
#   # Final overrides specific to this generation
#   framework = "textual",
# }
