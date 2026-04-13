{
  spec_version = "1.0",
  name = "phoenix-vcs",
  version = "0.1.0",
  description = "Regenerative version control that compiles intent to working software",

  flake = {
    pname = "phoenix-vcs",
    version = "0.1.0",
    description = "Phoenix VCS - Regenerative version control",
    build_type = "rust",
    build_inputs = ["cargo" "rustc" "rustfmt" "clippy" "openssl" "pkg-config"],
    native_build_inputs = [],
    propagated_build_inputs = [],
    main_program = "phoenix-vcs",
  },

  canon = {
    name = "Canon",
    description = "Immutable state representation",
  },

  iu = {
    name = "IntegrationUnit",
    description = "Integration unit for the canon",
  },
}
