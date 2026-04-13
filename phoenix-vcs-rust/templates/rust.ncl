# Rust Application Template
# Used when build_type = "rust"

{
  flake = {
    build_type = "rust",
    build_inputs = ["cargo" "rustc" "rustfmt" "clippy" "openssl" "pkg-config"],
    native_build_inputs = [],
    propagated_build_inputs = [],
  },
}
