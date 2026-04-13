{
  description = "Phoenix VCS - Regenerative version control";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
  };

  outputs = { self, nixpkgs, flake-utils }:
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        rustToolchain = pkgs.rustPlatform;
      in
      {
        packages.default = pkgs.rustPlatform.buildRustPackage {
          pname = "phoenix-vcs";
          version = "0.1.0";
          src = ./.;
          cargoLock.lockFile = ./Cargo.lock;
          nativeBuildInputs = with pkgs; [ openssl pkg-config ];
          buildInputs = with pkgs; [ openssl ];
          meta = {
            description = "Phoenix VCS - Regenerative version control";
            mainProgram = "phoenix-vcs";
          };
        };
        devShells.default = pkgs.mkShell {
          buildInputs = with pkgs; [
            cargo rustc rustfmt clippy openssl pkg-config
          ];
          nativeBuildInputs = with pkgs; [
            pkg-config
          ];
          shellHook = ''
            export OPENSSL_DIR="${pkgs.openssl.dev}"
            export OPENSSL_LIB_DIR="${pkgs.openssl.out}/lib"
          '';
        };
      });
}
