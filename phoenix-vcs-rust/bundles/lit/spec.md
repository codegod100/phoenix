# New Template Bundle: Lit Web Components

Create a Phoenix VCS bundle for generating TypeScript web applications using Lit framework for frontend development.

## Overview

**Bundle Name**: lit  
**Target**: TypeScript with Lit framework  
**Purpose**: Generate modern web applications using Web Components with Lit

## Files to Generate

The bundle must generate exactly 5 files:

1. **bundle.ncl** - Bundle metadata with id="lit", name="Lit", keywords=["typescript", "lit", "web-components", "frontend"]

2. **template_contract.ncl** - Nickel contract validating:
   - TypeScript version >= 5
   - Vite build tool configuration
   - Lit dependencies present
   - Web component definitions valid
   - TypeScript decorators configured

3. **theory_contract_panproto.ncl** - Formal GAT defining:
   - ThLit: ThSpec → ThLit → String
   - Sorts: Component, Property, Event, Template, Style, Decorator, CustomElement
   - Operations: mk_component, mk_property, mk_event, mk_template, mk_style, mk_decorator, mk_custom_element
   - Equations: component composition, property binding, event handling, template rendering
   - Examples: Counter component, Todo list, Data table

4. **prompt_theory.md** - Instructions for LLM to generate:
   - Lit component classes with @customElement decorators
   - Reactive properties with @property decorator
   - lit-html templates with event bindings
   - CSS styles with :host selectors
   - Event handling with @event decorators
   - TypeScript type definitions

5. **prompt_contract.md** - Instructions for LLM to validate:
   - Vite configuration for TypeScript/Lit
   - package.json dependencies (lit, typescript, vite)
   - tsconfig.json with decorator support
   - Component file structure
   - Web component naming conventions

## Dependencies

Extra dependencies to include:
- lit (core framework)
- typescript (language)
- vite (build tool)
- @lit/reactive-element (base class)
- lit-html (templating)

## Build Configuration

```toml
[extra_deps]
typescript = ["lit", "typescript", "vite", "@lit/reactive-element", "lit-html"]
```

## Formal Theory

The theory morphism μ_lit: ThSpec → ThLit maps:

- Spec UI components → Lit Custom Elements
- Spec reactive properties → Lit @property decorators
- Spec events → Lit event handlers
- Spec templates → lit-html render functions
- Spec styles → Lit CSS tagged templates

## Example Output

Given a spec with dashboard UI, generate:
- package.json with Lit dependencies
- vite.config.ts with TypeScript support
- tsconfig.json with decorators
- index.html entry point
- src/components/ with Lit web components
- src/styles/ with CSS custom properties
- src/main.ts application entry

## Build Type

build_type = "bundle"

## Template

template = "bundle-author"
