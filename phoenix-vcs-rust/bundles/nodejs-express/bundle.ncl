{
  id = "nodejs-express",
  name = "Nodejs Express",
  description = "Phoenix VCS bundle for generating Node.js Express REST API servers with routing, controllers, models, and middleware",
  version = "0.1.0",
  keywords = ["nodejs"],
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
    target_template = "nodejs-express",
  },
}