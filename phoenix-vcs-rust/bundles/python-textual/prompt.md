# Task: Fill Template from Spec

You are a specification translator. I have provided:
1. A human-readable spec in markdown format (below)
2. A Nickel template with {{slots}} to fill (below)

YOUR TASK: Replace every {{slot}} in the template with real values extracted from the spec.

## SPEC (read this to extract values)
```markdown
{{spec_content}}
```

## TEMPLATE (fill the {{slots}} in this)
```nickel
{{template_content}}
```

## FILLING RULES

Replace each slot with an appropriate Nickel value:
- {{app_name}} → "Actual App Name" (from # heading)
- {{app_description}} → "Description from ## Overview"
- {{version}} → "0.1.0" (find in spec or default)
- {{theme}} → "dark" or "light" (from ## Styling)
- {{layout_type}} → "vertical", "horizontal", or "grid" (from ## UI Layout)
- {{widgets}} → [ {type="Header", title="..."}, {type="ListView", ...} ] (array of widget records from UI Layout)
- {{key_bindings}} → [ {key="q", action="quit"}, ... ] (from ## Key Bindings)
- {{show_header}} → true/false (if header mentioned)
- {{show_footer}} → true/false (if footer mentioned)

## WIDGET TYPES (use these in the widgets array)
- Header: title, show_clock
- Footer: status bar
- Container/Vertical/Horizontal: children array
- List/ListView: items array, focusable
- LogView: max_lines, follow_tail, focusable  
- Static: content text
- Input: id, placeholder

## OUTPUT REQUIREMENTS

1. Output ONLY the filled Nickel record
2. NO markdown code fences (no ```nickel)
3. NO explanations or comments outside the record
4. ALL {{slots}} must be replaced with real values
5. Must be valid Nickel syntax

The template already has the structure - you just need to replace the {{placeholders}} with values from the spec.
