{
  id = "bundle-author",
  name = "Bundle Author",
  description = "Generates Phoenix VCS bundle definitions from specifications",
  version = "0.1.0",
  keywords = ["bundle", "generator", "meta", "authoring"],
  author = "Phoenix VCS",
  
  # Bundle configuration
  files = [
    { path = "bundle.ncl", required = true },
    { path = "template_contract.ncl", required = true },
    { path = "theory_contract_panproto.ncl", required = true },
    { path = "prompt_theory.md", required = true },
    { path = "prompt_contract.md", required = true },
  ],
  
  # Generation configuration
  generator = {
    type = "rust-native",
    rust_generator = "generate.rs",
    target_template = "bundle",
  },
}