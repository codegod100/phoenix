{
  id = "lit",
  name = "Lit",
  description = "Phoenix VCS bundle for generating TypeScript web applications using Lit framework for frontend development with Web Components",
  version = "0.1.0",
  keywords = ["typescript", "lit", "web-components", "frontend"],
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
    target_template = "lit",
  },
}