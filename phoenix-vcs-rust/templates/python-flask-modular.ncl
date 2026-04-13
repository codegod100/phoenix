# Python Flask Web Template - Modular Version
# Demonstrates reusing Python base while swapping framework layer

let
  # Base universal rules (same as in python-textual-modular.ncl)
  Base = {
    base_rules = m%"
You are a CODE GENERATOR ONLY. Output valid Python code using FLASK framework.

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
  # Python language rules (same as in python-textual-modular.ncl)
  Python = {
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
      typing_imports = "from typing import Optional, List, Dict, Any, Tuple",
    },
  }
in

let
  # Flask framework rules (swapped from Textual)
  Flask = {
    flask_rules | default = m%"

FLASK FRAMEWORK RULES:
11. MUST import: from flask import Flask, jsonify, request
12. MUST import: from werkzeug.exceptions import BadRequest, NotFound
13. MUST define app = Flask(__name__)
14. MUST use @app.route() decorators for endpoints
15. MUST return jsonify() for JSON responses
16. Use type hints for route handlers: def handler() -> Tuple[Dict, int]:
17. Handle errors with try/except returning ({"error": msg}, status)
18. Implement proper HTTP status codes (200, 400, 404, 500)
19. Use request.json for POST body parsing
20. Add CORS headers if cross-origin: from flask_cors import CORS
"%m,

    flask_substitutions = {
      framework = "flask",
      version = "3.0",
      default_port = 5000,
    },
    
    # Flask-specific templates
    templates = {
      app_factory_template = m%"
# Factory function pattern (best practice)
def create_app(config_name: str = "default") -> Flask:
    app = Flask(__name__)
    
    @app.route("/health", methods=["GET"])
    def health() -> Tuple[Dict, int]:
        return jsonify({"status": "healthy"}), 200
    
    @app.route("/", methods=["GET"])
    def index() -> Tuple[Dict, int]:
        return jsonify({"message": "{{name}} API"}), 200
    
    return app
"%m,

      main_template = m%"
def main() -> int:
    app = create_app()
    app.run(debug=True, host="0.0.0.0", port={{default_port}})
    return 0
"%m,
    },
  }
in

# Final merged configuration - notice we swap Textual -> Flask
Base & Python & Flask & {
  template_version = "2.0",
  template_name | force = "python-flask",
  framework = "flask",
  language = "python",
  
  # Assembled prompt from merged parts
  llm_prompt | String = 
    base_rules ++ python_rules ++ flask_rules ++ m%"

Requirements:
{{requirements}}

Generate a complete Python Flask web API with:
- Factory function pattern (create_app)
- Health check endpoint at /health
- Main endpoint at /
- Proper JSON responses with jsonify
- Type hints on all functions
- Error handling returning (dict, status) tuples
- Main entry point calling app.run()

OUTPUT ONLY RAW PYTHON CODE.
"%m,

  # Code template (fallback)
  code_template = m%"
# phoenix: iu_id = "{{iu_id}}"

from flask import Flask, jsonify, request
from werkzeug.exceptions import BadRequest, NotFound
from typing import Dict, Tuple, Any
import sys

{{templates.app_factory_template}}

{{templates.main_template}}

if __name__ == "__main__":
    sys.exit(main())
"%m,

  # PyProject configuration
  pyproject = {
    build_system = ["hatchling"],
    requires_python = ">=3.12",
    dependencies = [
      "flask>=3.0.0",
      "werkzeug>=3.0.0",
      "gunicorn>=21.0.0",
    ],
    entry_point = "src.app:main",
    packages = ["src"],
    scripts = {
      {{name}} = "src.app:main",
    },
  },

  # Flake configuration
  flake = {
    build_type = "python",
    propagated_build_inputs = [
      "flask",
      "gunicorn",
    ],
    # Optional: add service for production
    extra_nix = m%"
# Production service with gunicorn
systemd.services.{{name}} = {
  description = "{{name}} Flask API",
  serviceConfig = {
    ExecStart = "${pkgs.python312Packages.gunicorn}/bin/gunicorn -w 4 -b 0.0.0.0:5000 src.app:app";
    WorkingDirectory = "{{name}}";
  };
};
"%m,
  },
}
