---
name: project-review
description: Review the project structure and provide feedback on organization, code quality, and best practices. Use when starting work on a new codebase or before major changes.
---

# Project Review Skill

## Overview

This skill helps you understand and review a project codebase before making changes.

## Steps

1. First, explore the project structure:
   ```bash
   find . -type f -name "*.ts" -o -name "*.js" -o -name "*.json" | head -30
   ls -la
   ```

2. Read key configuration files:
   - `package.json` - dependencies and scripts
   - `README.md` - project documentation
   - `tsconfig.json` - TypeScript configuration

3. Analyze the code structure:
   - Look at main entry points
   - Identify core modules/components
   - Note testing setup

4. Provide feedback on:
   - Project organization
   - Code quality indicators
   - Potential issues or improvements
   - Missing documentation

## Output Format

Provide a concise summary with:
- **Project Type**: What kind of project this is
- **Structure**: Key directories and their purposes  
- **Strengths**: What's well-organized
- **Concerns**: Potential issues to address
- **Recommendations**: Suggested improvements
