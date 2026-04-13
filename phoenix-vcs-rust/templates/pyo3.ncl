# PyO3/Maturin Template
# Used when build_type = "pyo3" or "maturin"

{
  flake = {
    build_type = "maturin",
    build_inputs = ["maturin" "cargo" "rustc" "python312" "openssl" "pkg-config"],
    native_build_inputs = ["maturin" "cargo" "rustc"],
    propagated_build_inputs = ["textual" "pillow"],
  },
  
  pyproject = {
    build_system = ["maturin"],
    requires_python = ">=3.12",
  },
}
