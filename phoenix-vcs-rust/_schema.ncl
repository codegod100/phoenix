# Phoenix VCS Spec Schema v3.0.0 - Simplified
# Requirements: WHAT to build
# Design: HOW to build it

{
  schema_version = "3.0.0",

  # Required sections
  required = ["requirements", "design"],

  # Type definitions
  types = {
    # What needs to be built - simple statements
    requirement = {
      required = ["description"],
      fields = {
        description = "String",  # What the system must do
        priority = "String",     # must/should/could (default: must)
      },
    },

    # How to implement it
    design = {
      required = ["outputs"],
      fields = {
        # Files to generate
        outputs = "Array output",

        # Implementation notes (optional)
        notes = "String",

        # Dependencies between outputs (optional)
        deps = "Array String",
      },
    },

    # Single output file
    output = {
      required = ["path", "language"],
      fields = {
        path = "String",        # Where to generate
        language = "String",    # rust/python/typescript
        framework = "String",   # textual, pyo3, etc.
      },
    },
  },

  # Validation rules
  rules = [
    {
      name = "has_requirements",
      check = "requirements is not empty",
      error = "Must have at least one requirement",
    },
    {
      name = "has_outputs",
      check = "design.outputs is not empty",
      error = "Design must specify at least one output file",
    },
    {
      name = "unique_output_paths",
      check = "design.outputs.*.path are unique",
      error = "Each output must have a unique path",
    },
    {
      name = "supported_language",
      check = "design.outputs.*.language in ['rust', 'python', 'typescript']",
      error = "Language must be: rust, python, typescript",
    },
  ],

  meta = {
    description = "Ultra-simplified spec: requirements define what, design defines how",
  },
}
