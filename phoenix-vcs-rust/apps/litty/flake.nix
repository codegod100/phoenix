{
  description = "Litty - Lit Web Components Todo App";

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
            nodejs_20
            corepack
          ];

          shellHook = ''
            echo "🔥 Litty dev shell"
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
            echo ""
            
            # Auto-install dependencies if missing
            if [ ! -d node_modules ]; then
              echo "📦 Installing npm dependencies..."
              npm install
              echo "✓ Dependencies installed"
            else
              echo "✓ Dependencies already installed"
            fi
            
            echo ""
            echo "Run 'npm run dev' to start the dev server"
          '';
        };
      }
    );
}
