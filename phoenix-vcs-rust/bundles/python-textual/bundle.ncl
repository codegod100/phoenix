{
  # Bundle metadata for template discovery
  id = "python-textual",
  language = "python",
  framework = "textual",
  description = "Rich terminal user interfaces with Textual",
  
  # Keywords for matching specs to this template
  keywords = [
    "terminal", "tui", "console", "ncurses", "cli",
    "textual", "rich", "widgets", "grid", "layout"
  ],
  
  # Bundle files to generate (separate from template.ncl)
  files = {
    "flake.nix" = "./flake.nix",
    "pyproject.toml" = "./pyproject.toml", 
    "README.md" = "./README.md",
  },
}
