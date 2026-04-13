# Base prompt template for Phoenix VCS code generation
# Demonstrates Nickel modular configurations with defaults and merging

{
  # Template metadata with documentation
  prompt_version | String = "1.0",
  template_name | String = "base",
  
  # Documentation for this template
  | doc "Base template providing universal code generation rules"
  
  # Merge priority: default = can be overridden
  # Use 'force' for rules that MUST NOT be changed
  base_rules | String 
    | doc "Universal rules that apply to ALL generated code"
    = m%"
You are a CODE GENERATOR ONLY. Your entire response must be valid code.

ABSOLUTE RULES - VIOLATION = INVALID OUTPUT:
1. NO explanations, NO reasoning, NO markdown ```, NO numbered lists, NO emojis
2. START with: {{comment_prefix}} phoenix: iu_id = "{{iu_id}}"
3. FORBIDDEN: Multiple files or modules - ONLY ONE self-contained file
4. FORBIDDEN: Extra boilerplate (config, error, models, services modules)
5. Generate EXACTLY what the spec requires - no creative additions
6. All code must be inline in a single file - no external references
"%m,

  # Variable substitutions available in all templates
  substitutions | {
    iu_id | String,
    name | String,
    language | String,
    requirements | String,
    comment_prefix | String,
  } = {
    iu_id = "{{iu_id}}",
    name = "{{name}}",
    language = "{{language}}",
    requirements = "{{requirements}}",
    comment_prefix = "{{comment_prefix}}",
  },

  # Comment syntax by language - can be extended
  comment_prefixes | {} = {
    python = "#",
    rust = "//",
    typescript = "//",
    javascript = "//",
    go = "//",
    haskell = "--",
    lua = "--",
    nix = "#",
    elixir = "#",
    julia = "#",
  },

  # Utility functions for prompt construction
  utils = {
    # Format array of strings as bullet list
    format_list = fun items prefix =>
      std.array.fold_left 
        (fun acc item => acc ++ "\n" ++ prefix ++ " " ++ item) 
        ""
        items,
    
    # Join array with separator
    join = fun arr sep =>
      std.array.fold_left 
        (fun acc item => 
          if acc == "" then item else acc ++ sep ++ item)
        ""
        arr,
    
    # Indent text with given prefix
    indent = fun text prefix =>
      text
      |> std.string.split "\n"
      |> std.array.map (fun line => prefix ++ line)
      |> std.string.join "\n",
  },

  # Output configuration - tune LLM parameters
  generation_config | {
    max_tokens | Number,
    temperature | Number,
    top_p | Number,
  } = {
    max_tokens = 4000,
    temperature = 0.1,
    top_p = 0.95,
  },
}
