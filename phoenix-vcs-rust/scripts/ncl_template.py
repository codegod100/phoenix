#!/usr/bin/env python3
"""
Nickel Template Generator

Generates properly escaped .ncl files from templates.
"""

import json
import sys
from pathlib import Path
from typing import List, Dict, Any


def escape_nickel_string(s: str) -> str:
    """Escape a string for use in a Nickel double-quoted string."""
    # Replace backslashes first
    s = s.replace('\\', '\\\\')
    # Replace newlines
    s = s.replace('\n', '\\n')
    # Replace tabs  
    s = s.replace('\t', '\\t')
    # Replace quotes
    s = s.replace('"', '\\"')
    return s


def generate_module_ncl(
    module_id: str,
    name: str,
    description: str,
    code: str,
    provides: List[Dict[str, Any]] = None,
    needs: List[Dict[str, Any]] = None,
    version: str = "1.0.0",
    language: str = "typescript"
) -> str:
    """Generate a complete module.ncl file."""
    
    escaped_code = escape_nickel_string(code)
    
    provides = provides or [{"interface": "WebComponent", "properties": {"tag": module_id}}]
    needs = needs or []
    
    # Convert to Nickel syntax
    def dict_to_nickel(d: Dict) -> str:
        items = []
        for k, v in d.items():
            if isinstance(v, dict):
                items.append(f"{k} = {dict_to_nickel(v)}")
            elif isinstance(v, str):
                items.append(f'{k} = "{v}"')
            else:
                items.append(f"{k} = {v}")
        return "{ " + ", ".join(items) + " }"
    
    provides_list = [dict_to_nickel(p) for p in provides]
    needs_list = [dict_to_nickel(n) for n in needs]
    
    provides_str = "[" + ", ".join(provides_list) + "]"
    needs_str = "[" + ", ".join(needs_list) + "]"
    
    ncl = f'''{{
  id = "{module_id}",
  name = "{name}",
  description = "{description}",
  version = "{version}",
  language = "{language}",
  is_infrastructure = false,

  generation = {{
    protocol = "typescript",
    vertex_kinds = ["ClassDecl"],
    vertices = [
      {{ 
        id = "{module_id}_class", 
        kind = "ClassDecl", 
        text = "{escaped_code}"
      }}
    ],
    config_placeholders = {{}}
  }},

  provides = {provides_str},

  needs = {needs_str}
}}
'''
    return ncl


def main():
    if len(sys.argv) < 3:
        print("Usage: python ncl_template.py <input.ts> <output.ncl>")
        print("")
        print("Or use as a library:")
        print("  from ncl_template import generate_module_ncl")
        sys.exit(1)
    
    input_file = Path(sys.argv[1])
    output_file = Path(sys.argv[2])
    
    if not input_file.exists():
        print(f"Error: {input_file} not found")
        sys.exit(1)
    
    # Read the TypeScript code
    code = input_file.read_text()
    
    # Infer module id from filename
    module_id = input_file.stem
    
    # Generate NCL
    ncl_content = generate_module_ncl(
        module_id=module_id,
        name=module_id.replace("-", " ").title(),
        description=f"Generated {module_id} module",
        code=code
    )
    
    # Write output
    output_file.write_text(ncl_content)
    print(f"✅ Generated: {output_file}")


if __name__ == "__main__":
    main()
