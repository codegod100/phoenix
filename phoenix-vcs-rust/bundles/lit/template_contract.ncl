{
  # Contract for Lit app specs
  
  spec | {
    id | String,
    description | String,
    template | String,       # = "lit"
    build_type | String,     # = "typescript"
    phoenix_config | {
      project_name | String,
      template | String,
    },
  },
  
  _check_template = spec.template == "lit",
  _check_build_type = spec.build_type == "typescript",
}
