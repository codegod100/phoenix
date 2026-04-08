# Web Dashboard Deliverable Templates

Template files for generating spec-compliant web dashboards from Phoenix IUs.

## Template System

Templates use placeholders that get replaced by the generator:

- `{{DELIVERABLE_ID}}` - Unique hash of input IUs
- `{{GENERATED_AT}}` - ISO timestamp
- `{{IU_IMPORTS}}` - Import statements for domain IUs
- `{{CANON_COMMENTS}}` - Embedded canonical requirements
- `{{DOMAIN_FUNCTIONS}}` - Calls to domain functions

## Files

- `server.ts.hbs` - HTTP server with API routes
- `store.ts.hbs` - Data store orchestrating domains
- `client.html.hbs` - Client-side HTML/JS (optional, can inline)

## Traceability

All generated files include:
```typescript
// @phoenix-deliverable: web-dashboard
// @phoenix-template: {{TEMPLATE_PATH}}
// @phoenix-generated: {{GENERATED_AT}}
// @phoenix-iu-hash: {{DELIVERABLE_ID}}
```

## Validation

Generated code is validated against canonical requirements:
- No `alert()`/`confirm()` (violates modal requirements)
- Inline edit forms only (no modal dialogs per spec)
- Proper analytics bar format
- Archive tab behavior
