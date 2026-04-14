{{
  # Contract for validating specs against this bundle
  # Merged with LLM output to validate generated specs
  
  # Main spec contract
  spec | {{
    id | String,
    description | String,
    build_type | String,
  }},
  
  # Validation predicates
  _check_build_type | Bool =
    spec.build_type == "python" || spec.build_type == "rust" || spec.build_type == "typescript" || spec.build_type == "bun",
}}