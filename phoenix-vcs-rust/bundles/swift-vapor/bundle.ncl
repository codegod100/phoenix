{
  id = "swift-vapor",
  name = "Swift Vapor",
  description = "Swift Vapor web API server framework",
  version = "0.1.0",
  keywords = ["swift", "vapor", "server", "web", "api"],
  author = "Phoenix VCS",
  
  files = [
    { path = "bundle.ncl", required = true },
    { path = "template_contract.ncl", required = true },
    { path = "theory_contract_panproto.ncl", required = true },
    { path = "prompt_theory.md", required = true },
    { path = "prompt_contract.md", required = true },
  ],
  
  generator = {
    type = "bundle",
    target_template = "swift-vapor",
  },
}