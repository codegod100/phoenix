# Lit App - Theory Generation Prompt

You are generating a Phoenix VCS app specification for a Lit Web Components application.

## Input

Read spec.md describing the Lit web application to build.

## Output

Generate spec.ncl for a Lit app with this structure:

```nickel
{
  id = "app-id",
  description = "App description",
  template = "lit",
  build_type = "typescript",
  
  phoenix_config = {
    project_name = "app-name",
    project_description = "...",
    template = "lit",
    build_type = "typescript",
  },
  
  sorts = [
    { name = "Component", kind = { type = "structural" } },
    { name = "Property", kind = { type = "structural" } },
    ...
  ],
  
  ops = [
    { name = "mk_component", ... },
    ...
  ],
  
  dependencies = {
    extra = ["lit", "typescript", "vite"],
  },
}
```

## Rules

1. Set template = "lit" (NOT "bundle-author")
2. Set build_type = "typescript"
3. NO theory_id field (this is an app spec!)
4. Include phoenix_config with app details
5. Define sorts for Lit components, properties, events
