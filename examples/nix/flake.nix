{
  description = "Nix flake for Phoenix project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
      in {

        # Development shell
        devShells.default = pkgs.mkShell {
          name = "phoenix-dev";
          buildInputs = with pkgs; [
            nodejs_20  # Node.js 20+ for Phoenix tooling
            git        # Version control
            nixpkgs-fmt # Nix formatter
          ];
          shellHook = ''
            echo "╔════════════════════════════════════════════════════════╗"
            echo "║  🐦 Phoenix Nix Flake — Development Environment        ║"
            echo "╚════════════════════════════════════════════════════════╝"
            echo ""
            export PHOENIX_EXAMPLE="nix"
          '';
        };

        # Package outputs
        packages = {
          default = pkgs.writeShellScriptBin "phoenix-example" ''
            echo "Hello from Phoenix Nix flake!"
          '';
        };

        # Formatter
        formatter = pkgs.nixpkgs-fmt;

        # Checks
        checks = {
          build-test = pkgs.runCommand "build-test" {} ''
            echo "Running checks..."
            test -f ${pkgs.hello}/bin/hello && echo "✅ Packages available"
            touch $out
          '';
        };

      });
  # Overlay for extending nixpkgs
  overlay = final: prev: {
    # Add your packages here
  };

}
