# Rust App Template
# Used when build_type = "rust"

{
  template_version = "1.0",
  language = "rust",
  
  # Binary to generate
  output_path = "src/main.rs",
  
  # Cargo.toml template
  cargo_template = m%"
[package]
name = "{{name}}"
version = "0.1.0"
edition = "2021"

[dependencies]
{{dependencies}}
"%m,
  
  # Code template
  code_template = m%"
// phoenix: iu_id = "{{iu_id}}"
//! {{name}}
//! Risk Tier: {{risk_tier}}
//! Contract: {{contract}}

{{imports}}

fn main() {
    {{main_body}}
}
"%m,
  
  # Flake configuration
  flake = {
    build_type = "rust",
    build_inputs = ["cargo", "rustc", "rustfmt", "clippy"],
    propagated_build_inputs = [],
  },
}
