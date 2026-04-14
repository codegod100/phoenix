{
  # Bundle definition spec contract
  # This validates specs that define NEW bundles (not apps)
  
  # Bundle metadata
  bundle | {
    id | String,
    name | String,
    description | String,
    version | String,
    keywords | Array String,
  },
  
  # Target bundle configuration (what the new bundle will generate)
  target | {
    # The build type for apps using this bundle
    build_type | String,
    
    # Template identifier
    template | String,
    
    # Framework and language
    framework | String,
    language | String,
  },
  
  # Files the new bundle will generate (always 5)
  files | Array {
    path | String,
    description | String,
    theory | String,
  },
  
  # Dependencies for apps using this bundle
  dependencies | {
    extra | Array String,
  },
  
  # Formal theory definition
  theory | {
    morphism | String,
    description | String,
  },
  
  # Validation predicates
  _check_5_files | Bool = 
    std.array.length files == 5,
    
  _check_required_files | Bool =
    std.array.any (fun f => f.path == "bundle.ncl") files
    && std.array.any (fun f => f.path == "template_contract.ncl") files
    && std.array.any (fun f => f.path == "theory_contract_panproto.ncl") files
    && std.array.any (fun f => f.path == "prompt_theory.md") files
    && std.array.any (fun f => f.path == "prompt_contract.md") files,
    
  _check_build_type | Bool =
    target.build_type == "python"
    || target.build_type == "rust"
    || target.build_type == "typescript"
    || target.build_type == "bun"
    || target.build_type == "swift"
    || target.build_type == "go"
    || target.build_type == "bundle",
    
  _check_template | Bool =
    target.template == bundle.id,
}
