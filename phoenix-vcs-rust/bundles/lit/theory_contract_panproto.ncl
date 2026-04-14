{
  # ThThBundleDef: Theory definition
  
  theory_id = "bundle-author",
  theory_name = "ThThBundleDef",
  description = "Theory for creating new Phoenix VCS template bundles. A bundle definition specifies the 5 files that constitute a complete code generation bundle for a target language/framework.",
  
  # Source theory
  source = {
    theory = "ThSpec",
    format = "spec_md",
  },
  
  # Target theory
  target = {
    theory = "ThThBundleDef",
    format = "generated_code",
  },
  
  # Sorts and operations defined in spec.ncl
  # (Populated by the LLM when generating this bundle)
}