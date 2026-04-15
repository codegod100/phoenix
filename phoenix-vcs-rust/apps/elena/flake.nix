{
  description = "Elena Dashboard - ElenaJS + Hono fullstack app";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
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
            bun
            nodePackages.typescript
            nodePackages.vite
            nodePackages.concurrently
          ];

          shellHook = ''
            echo "🌸 Elena Dashboard dev shell"
            echo "Run 'bun install' to install dependencies"
            echo "Run 'bun run dev' to start dev servers"
          '';
        };

        packages.default = pkgs.stdenv.mkDerivation {
          pname = "elena-dashboard";
          version = "0.1.0";
          src = ./.;

          buildInputs = [ pkgs.bun ];

          buildPhase = ''
            bun install
            bun run build
          '';

          installPhase = ''
            mkdir -p $out
            cp -r dist $out/
            cp package.json $out/
          '';
        };
      });
}
