{
  # Contract for validating Swift Vapor specs
  
  spec | {
    id | String,
    description | String,
    
    # Build configuration
    build_type | String,
    
    # API Routes
    routes | Array {
      path | String,
      method | String,
      handler | String,
    },
    
    # Models
    models | Array {
      name | String,
      fields | Array {
        name | String,
        type | String,
        optional | Bool,
      },
    },
  },
  
  # Validation
  _check_build_type | Bool =
    spec.build_type == "swift" || spec.build_type == "vapor",
    
  _check_routes | Bool =
    std.array.length spec.routes > 0,
    
  _check_models | Bool =
    std.array.length spec.models >= 0,
}
