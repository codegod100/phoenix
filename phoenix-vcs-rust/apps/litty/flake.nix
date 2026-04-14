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
            corepack  # Provides npm, yarn, pnpm
          ];

          shellHook = ''
            echo "🔥 Litty dev shell"
            echo "Node.js: $(node --version)"
            echo "npm: $(npm --version)"
            echo ""
            echo "Run 'npm install' to install dependencies"
            echo "Run 'npm run dev' to start the dev server"
          '';
        };
      }
    );
}
