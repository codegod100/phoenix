{
  description = "Phoenix VCS — Regenerative version control system";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils, ... }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};

        # Phoenix CLI wrapper script that runs the TypeScript source directly
        phoenix-dev = pkgs.writeShellScriptBin "phoenix" ''
          set -e
          
          # Helper to find project root by looking for flake.nix + src/cli.ts
          find_project_root() {
            local dir="$(pwd)"
            while [ "$dir" != "/" ]; do
              if [ -f "$dir/flake.nix" ] && [ -f "$dir/src/cli.ts" ]; then
                echo "$dir"
                return 0
              fi
              dir="$(dirname "$dir")"
            done
            return 1
          }
          
          # First: check if PHOENIX_DEV_ROOT is set (from shellHook)
          # Second: try to find project root dynamically from CWD
          # Third: fall back to the flake self path (nix store, read-only)
          PHOENIX_CLI_ROOT="''${PHOENIX_DEV_ROOT:-}"
          
          if [ -z "$PHOENIX_CLI_ROOT" ]; then
            PHOENIX_CLI_ROOT="$(find_project_root)"
          fi
          
          if [ -z "$PHOENIX_CLI_ROOT" ]; then
            PHOENIX_CLI_ROOT="${self}"
            echo "Warning: Could not find local Phoenix checkout. Using nix store (read-only): $PHOENIX_CLI_ROOT" >&2
          fi
          
          # Check if we have node_modules in the CLI root
          if [ ! -d "$PHOENIX_CLI_ROOT/node_modules" ]; then
            echo "Error: node_modules not found in $PHOENIX_CLI_ROOT" >&2
            echo "Run: (cd $PHOENIX_CLI_ROOT && bun install)" >&2
            exit 1
          fi
          
          # Run the CLI from the current working directory (the project being worked on)
          exec ${pkgs.bun}/bin/bun run "$PHOENIX_CLI_ROOT/src/cli.ts" "$@"
        '';
      in
      {
        packages = {
          default = phoenix-dev;
          phoenix = phoenix-dev;
        };

        devShells.default = pkgs.mkShell {
          name = "phoenix-dev";
          
          buildInputs = with pkgs; [
            # Runtime and build tools
            bun
            nodejs_22
            typescript
            
            # Development tools
            git
            
            # The phoenix CLI command (linked to src/cli.ts)
            phoenix-dev
          ];

          shellHook = ''
            echo "🐦 Phoenix VCS development shell"
            echo ""
            
            # Export this so the phoenix wrapper knows to use local checkout
            export PHOENIX_DEV_ROOT="/home/nandi/code/phoenix"
            
            # Ensure this dev shell's phoenix is first in PATH
            export PATH="${phoenix-dev}/bin:$PATH"
            
            echo "Available commands:"
            echo "  phoenix <command>    - Run Phoenix CLI from local checkout"
            echo "  bun run build        - Build the project"
            echo "  bun run test         - Run tests"
            echo "  bun run dev          - Run CLI in dev mode"
            echo ""
            echo "Project root: $PHOENIX_DEV_ROOT"
            echo "Phoenix CLI runs from: $PHOENIX_DEV_ROOT/src/cli.ts"
            echo ""
            
            # Ensure bun dependencies are installed
            if [ ! -d "$PHOENIX_DEV_ROOT/node_modules" ]; then
              echo "⚠️  node_modules not found. Run: (cd $PHOENIX_DEV_ROOT && bun install)"
            fi
          '';
        };
      }
    );
}
