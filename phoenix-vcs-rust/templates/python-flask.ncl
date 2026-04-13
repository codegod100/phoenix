# Python Flask App Template
# Template for generating Flask-based web applications
# Variables: iu_id, name, risk_tier, contract, requirements

{
  template_version = "1.0",
  language = "python",
  framework = "flask",
  
  # File to generate
  output_path = "src/app.py",
  
  # LLM prompt for generating Flask code
  llm_prompt = m%"
You are a CODE GENERATOR ONLY. Output valid Python code using the FLASK framework for web applications.

ABSOLUTE RULES:
1. NO explanations, NO markdown ```, NO reasoning
2. START with: # phoenix: iu_id = "{{iu_id}}"
3. MUST import: from flask import Flask, jsonify, request
4. MUST create: app = Flask(__name__)
5. MUST define routes with @app.route() decorators
6. MUST define def main() that calls app.run(debug=True, host="0.0.0.0", port=5000)
7. MUST end with: if __name__ == "__main__": main()

FRAMEWORK: FLASK - Web application with HTTP routes, JSON responses.

Requirements:
{{requirements}}

OUTPUT ONLY RAW PYTHON CODE using FLASK framework.
"%m,
  
  # Code template with NCL string interpolation (fallback)
  code_template = m%"
# phoenix: iu_id = "{{iu_id}}"

from flask import Flask, jsonify, request

app = Flask(__name__)

{{routes}}

def main():
    app.run(debug=True, host="0.0.0.0", port=5000)

if __name__ == "__main__":
    main()
"%m,
  
  # Route template for each endpoint
  route_template = m%"
@app.route("{{path}}")
def {{name}}():
    return jsonify({{response}})
"%m,
  
  # Default routes for basic app
  default_routes = [
    {
      path = "/",
      name = "index",
      response = '{"status": "ok"}',
    },
    {
      path = "/health",
      name = "health",
      response = '{"health": "healthy"}',
    },
  ],
  
  # PyProject configuration
  pyproject = {
    build_system = ["hatchling"],
    requires_python = ">=3.12",
    dependencies = ["flask"],
    entry_point = "src.app:main",
    packages = ["src"],
  },
  
  # Flake configuration
  flake = {
    build_type = "python",
    propagated_build_inputs = ["flask"],
  },
}
