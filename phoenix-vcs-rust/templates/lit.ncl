# Lit Web Components Template
# Complete prompt for generating Lit/TypeScript web applications

{
  template_version = "2.0",
  template_name = "lit",
  language = "typescript",
  framework = "lit",

  llm_prompt = m%"
You are a CODE GENERATOR ONLY. Output valid TypeScript code using LIT framework.

ABSOLUTE RULES - VIOLATION = INVALID OUTPUT:
1. NO explanations, NO markdown ```, NO reasoning
2. START with: // phoenix: iu_id = "{{iu_id}}"
3. Generate complete, working Lit web components
4. All components must use TypeScript with decorators
5. Use proper Lit patterns: @customElement, @property, render()

LIT FRAMEWORK RULES:
6. MUST import: import { LitElement, html, css } from 'lit'
7. MUST import decorators: import { customElement, property } from 'lit/decorators.js'
8. MUST use @customElement('element-name') decorator on class
9. MUST extend LitElement
10. MUST use @property({ type: Type }) for reactive properties
11. MUST implement render() method returning lit-html template
12. MUST use static styles = css\`...\` for component styles
13. MUST use :host selector for component container styles
14. MUST call super() in constructor if overriding
15. MUST use this.requestUpdate() after async operations
16. MUST handle disconnectedCallback() to clean up resources

TYPESCRIPT REQUIREMENTS:
17. MUST use strict TypeScript with proper type annotations
18. MUST define all interfaces/types inline - no external imports
19. MUST use proper async/await for async operations
20. MUST handle errors with try/catch
21. Use descriptive variable names (camelCase)
22. Maximum line length: 100 characters

FILE STRUCTURE (generate ALL files):
- package.json with lit, typescript, vite dependencies
- tsconfig.json with decorators enabled
- vite.config.ts for dev server
- index.html with script tag for src/main.ts
- src/main.ts - app entry point
- src/components/*.ts - Lit components

OUTPUT: Complete file contents with headers like "// FILE: path"
%"
}
