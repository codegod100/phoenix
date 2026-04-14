{
  description = "Swift Vapor API Server";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in
      {
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            swift
            swiftPackages.swiftpm
            postgresql
          ];

          shellHook = ''
            echo "╔══════════════════════════════════════════════════════════════╗"
            echo "║         Swift Vapor API Server - Development Shell          ║"
            echo "╚══════════════════════════════════════════════════════════════╝"
            echo ""
            echo "Available commands:"
            echo "  swift build          - Build the project"
            echo "  swift run            - Run the server (http://localhost:8080)"
            echo "  swift test           - Run tests"
            echo ""
            echo "API Endpoints:"
            echo "  GET    /             - API info"
            echo "  GET    /health       - Health check"
            echo "  GET    /api/users    - List users"
            echo "  POST   /api/users    - Create user"
            echo "  GET    /api/users/:id - Get user"
            echo "  PUT    /api/users/:id - Update user"
            echo "  DELETE /api/users/:id - Delete user"
            echo "  GET    /api/items    - List items"
            echo "  POST   /api/items    - Create item"
            echo "  GET    /api/items/:id - Get item"
            echo "  PUT    /api/items/:id - Update item"
            echo "  DELETE /api/items/:id - Delete item"
            echo ""
            echo "Quick start:"
            echo "  1. swift build"
            echo "  2. swift run"
            echo ""
            echo "Note: Requires PostgreSQL database or set DATABASE_URL"
          '';
        };

        # nix develop - enters dev shell
        # nix run - copies to writable dir and runs
        apps.default = {
          type = "app";
          program = toString (pkgs.writeShellScriptBin "vapor-server" ''
            set -e
            
            # Create a writable working directory
            WORKDIR="$HOME/.cache/vapor-api-server"
            mkdir -p "$WORKDIR"
            
            # Copy source files if they don't exist or are outdated
            if [ ! -f "$WORKDIR/Package.swift" ] || [ "${self}/Package.swift" -nt "$WORKDIR/Package.swift" ]; then
              echo "Copying source files to writable directory..."
              rm -rf "$WORKDIR"/*
              cp -r ${self}/apps/vapor/* "$WORKDIR/"
            fi
            
            cd "$WORKDIR"
            
            echo ""
            echo "╔══════════════════════════════════════════════════════════════╗"
            echo "║              Swift Vapor API Server                          ║"
            echo "╚══════════════════════════════════════════════════════════════╝"
            echo ""
            echo "Working directory: $WORKDIR"
            echo ""
            
            # Build if needed
            if [ ! -d ".build/debug" ]; then
              echo "Building... (this may take a few minutes on first run)"
              ${pkgs.swift}/bin/swift build 2>&1 | tail -20
            fi
            
            echo "Starting server on http://localhost:8080"
            echo "Press Ctrl+C to stop"
            echo ""
            
            # Run the server
            exec ${pkgs.swift}/bin/swift run --skip-build 2>/dev/null || ${pkgs.swift}/bin/swift run
          '').outPath;
        };
      });
}
