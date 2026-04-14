{
  id = "swift-vapor",
  name = "Swift Vapor",
  description = "Theory for Swift Vapor web API servers",
  version = "0.1.0",
  keywords = ["swift"],
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
    type = "bundle",
    target_template = "swift-vapor",
  },
}