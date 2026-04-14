{
  # Bundle metadata
  id = "rust",
  name = "Rust",
  description = "Rust application with Cargo project structure",
  version = "0.1.0",
  keywords = ["rust", "cargo", "native"],
  author = "Phoenix VCS",
  
  # Files this bundle generates
  files = [
    { path = "Cargo.toml", required = true },
    { path = "src/main.rs", required = true },
  ],
  
  # Generation configuration
  generator = {
    type = "rust-native",
    rust_generator = "generate.rs",
    target_template = "rust",
  },
  
  # Dependencies (Cargo handles these)
  base_deps = [],
}
