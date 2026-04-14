{
  # ThThNodejsExpress: Theory definition
  
  theory_id = "nodejs-express",
  theory_name = "ThThNodejsExpress",
  description = "Phoenix VCS bundle for generating Node.js Express REST API servers with routing, controllers, models, and middleware",
  
  # Source theory
  source = {
    theory = "ThSpec",
    format = "spec_md",
  },
  
  # Target theory
  target = {
    theory = "ThThNodejsExpress",
    format = "generated_code",
  },
  
  # Sorts and operations defined in spec.ncl
  # (Populated by the LLM when generating this bundle)
}