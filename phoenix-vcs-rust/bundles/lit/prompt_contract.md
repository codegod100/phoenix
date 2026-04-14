# Lit App - Contract Specification Prompt

You are a Phoenix VCS contract engineer. Create an app specification for a Lit web application.

## Input

Read spec.md describing a Lit web application to build.

## Output

Generate a Nickel spec.ncl that satisfies this contract:

```nickel
{
  # Required fields
  id | String,
  description | String,
  template | String,       # Must be "lit"
  build_type | String,     # Must be "typescript"
  
  phoenix_config | {
    project_name | String,
    template | String,
  },
  
  # Optional
  sorts | Array { name | String, kind | { type | String } },
  ops | Array { name | String, inputs | Array { name | String, sort | String }, output | String },
  dependencies | { extra | Array String },
}
```

## CRITICAL RULES

1. template MUST equal "lit"
2. build_type MUST equal "typescript"
3. **NO theory_id field!** This is an app spec, not a bundle spec!
4. Include phoenix_config with app details
5. Use template = "lit" to select the Lit framework
