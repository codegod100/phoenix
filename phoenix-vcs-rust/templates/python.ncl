# Python Generic App Template
# Used when build_type = "python" but no specific framework detected

{
  template_version = "1.0",
  language = "python",
  
  # File to generate
  output_path = "src/app.py",
  
  # Code template - simple skeleton that satisfies requirements
  code_template = m%"
# phoenix: iu_id = "{{iu_id}}"
# Generated from IU: {{name}}
# Risk Tier: {{risk_tier}}
# Contract: {{contract}}

"""Implementation Unit: {{name}}

Requirements:
{{requirements}}
"""

{{imports}}

def main():
    """Application entry point."""
    {{main_body}}
    pass

if __name__ == "__main__":
    main()
"%m,
  
  # Default imports
  default_imports = [
    "import sys",
    "import json",
  ],
  
  # PyProject configuration
  pyproject = {
    build_system = ["hatchling"],
    requires_python = ">=3.12",
    dependencies = [],  # Auto-detected from imports
    entry_point = "src.app:main",
    packages = ["src"],
  },
  
  # Flake configuration
  flake = {
    build_type = "python",
    propagated_build_inputs = [],  # Auto-detected
  },
}
