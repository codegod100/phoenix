# Python Application Template
# Used when build_type = "python"

{
  flake = {
    build_type = "python",
    build_inputs = ["python312" "openssl" "pkg-config"],
    native_build_inputs = [],
    propagated_build_inputs = ["textual" "httpx" "websockets"],
  },
  
  pyproject = {
    build_system = ["hatchling"],
    requires_python = ">=3.12",
  },
}
