{
  # Bundle metadata
  id = "python",
  name = "Python Generic",
  description = "Generic Python project structure",
  version = "0.1.0",
  keywords = ["python", "generic", "project"],
  author = "Phoenix VCS",
  
  # Files this bundle generates
  files = [
    { path = "src/main.py", required = true },
  ],
  
  # Generation configuration
  generator = {
    type = "rust-native",
    rust_generator = "generate.rs",
    target_template = "python",
  },
  
  # Dependencies (none for generic)
  base_deps = [],
}
