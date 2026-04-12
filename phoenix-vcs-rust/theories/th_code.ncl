# th_code.ncl - Theory of Generated Code
# The target theory: actual source files

let T = import "panproto/theory.ncl" in

{
  id = "phoenix.theories.code",
  description = "Theory of generated source code files",
  theory = "ThCode",
  
  sorts = [
    # Code module (collection of files)
    T.simple "CodeModule",
    # Individual code file
    { name = "CodeFile", params = [
      { name = "path", sort = "Path" },
      { name = "content", sort = "Content" },
      { name = "iu_id", sort = "Hash" },
      { name = "language", sort = "Language" }
    ]},
    # File content
    T.simple "Content",
    # File path
    T.simple "Path",
    # Language
    { name = "Language", params = [{ name = "lang", sort = "String" }] },
    # IU reference (provenance)
    T.simple "Hash",
    # Syntax validity
    T.simple "Valid",
    # Line count
    { name = "Lines", kind = { type = "val", value_kind = "integer" } },
    # File size
    { name = "Bytes", kind = { type = "val", value_kind = "integer" } },
  ],
  
  ops = [
    # Generate code from IU
    {
      name = "generate",
      inputs = [
        { name = "iu", sort = "IU" },
        { name = "mode", sort = "GenMode" }
      ],
      output = "CodeFile"
    },
    # Syntax validate code
    {
      name = "validate",
      inputs = [{ name = "file", sort = "CodeFile" }],
      output = "Valid"
    },
    # Count lines
    {
      name = "line_count",
      inputs = [{ name = "file", sort = "CodeFile" }],
      output = "Lines"
    },
    # Get file size
    {
      name = "size",
      inputs = [{ name = "file", sort = "CodeFile" }],
      output = "Bytes"
    },
    # Get IU provenance
    {
      name = "provenance",
      inputs = [{ name = "file", sort = "CodeFile" }],
      output = "Hash"
    },
    # Write file to disk
    {
      name = "write",
      inputs = [
        { name = "file", sort = "CodeFile" },
        { name = "base_path", sort = "Path" }
      ],
      output = "Path"
    },
    # Empty file
    {
      name = "empty",
      output = "CodeFile"
    },
  ],
  
  equations = [
    # Generate is deterministic: same IU → same code
    {
      name = "generate_deterministic",
      lhs = "generate(iu, mode)",
      rhs = "generate(iu, mode)"
    },
    
    # Provenance preserved: generated code knows its IU
    {
      name = "provenance_preserved",
      lhs = "provenance(generate(iu, mode))",
      rhs = "iu.iu_id"
    },
    
    # Write produces correct path
    {
      name = "write_path",
      lhs = "write(file, base)",
      rhs = "file.path"
    } | { condition = "base is prefix of file.path" },
  ],
  
  # Generation modes
  policies = [
    # Stub mode: generate skeleton only
    T.custom_policy "stub_mode" "GenMode" "mode = 'stub'"
    # LLM mode: use AI for generation
    T.custom_policy "llm_mode" "GenMode" "mode = 'llm'"
  ],
} | T.Theory
