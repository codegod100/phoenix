{
  # Bundle metadata
  id = "python-flask",
  name = "Python Flask",
  description = "Flask web API server with REST endpoints",
  version = "0.1.0",
  keywords = ["python", "flask", "web", "api", "rest"],
  author = "Phoenix VCS",
  
  # Files this bundle generates
  files = [
    { path = "src/app.py", required = true },
  ],
  
  # Generation configuration
  generator = {
    type = "rust-native",
    rust_generator = "generate.rs",
    target_template = "python-flask",
  },
  
  # Dependencies
  base_deps = [
    "flask",
    "gunicorn",
  ],
}
