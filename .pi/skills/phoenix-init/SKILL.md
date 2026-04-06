---
name: phoenix-init
description: Initialize a new Phoenix project. Creates spec directory and starter structure.
---

# Phoenix Init

Set up a new Phoenix project.

## When to Use

- Starting a new project
- Converting existing project to Phoenix

## Steps

1. **Create directory structure**
   ```
   project/
   ├── spec/              # Specification documents
   └── src/
       └── generated/     # Generated code (initially empty)
   ```

2. **Create starter spec**
   `spec/README.md`:
   ```markdown
   # Project Specification

   ## Overview
   Describe what this project does.

   ## Requirements
   - REQUIREMENT: The system shall...
   - CONSTRAINT: Must not exceed...

   ## Getting Started
   1. Add requirements to this file
   2. Run pipeline to generate code
   ```

3. **Verify setup**
   - `spec/` directory exists
   - At least one `.md` file

## Output

Ready for pipeline:
```
🔥 Phoenix Initialized

Created:
  - spec/README.md (starter template)

Next:
  1. Edit spec/README.md with requirements
  2. Run pipeline phases
```
