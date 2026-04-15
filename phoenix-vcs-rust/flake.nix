{
  description = "Phoenix VCS - Regenerative version control";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";
    flake-utils.url = "github:numtide/flake-utils";
    devenv.url = "github:cachix/devenv";
    fenix = {
      url = "github:nix-community/fenix";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = { self, nixpkgs, flake-utils, devenv, fenix }:
    let
      inputs = { inherit nixpkgs flake-utils devenv fenix self; };
    in
    flake-utils.lib.eachDefaultSystem (system:
      let
        pkgs = nixpkgs.legacyPackages.${system};
        
        # Build the Phoenix VCS package
        phoenix-vcs = pkgs.rustPlatform.buildRustPackage {
          pname = "phoenix-vcs";
          version = "0.1.0";
          src = ./.;
          cargoLock = {
            lockFile = ./Cargo.lock;
            outputHashes = {
              "panproto-expr-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-expr-parser-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-gat-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-grammars-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-inst-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-lens-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-mig-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-parse-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-project-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-protocols-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-schema-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
              "panproto-theory-dsl-0.30.0" = "sha256-ib8bVnGofP0m9vBnt1U8vuqIOo88ASQoghxoquUPR2w=";
            };
          };
          
          nativeBuildInputs = with pkgs; [ 
            pkg-config 
            openssl 
          ];
          
          buildInputs = with pkgs; [ 
            openssl 
          ];
          
          # Enable all features for the build
          buildFeatures = [ "panproto" ];
          
          meta = {
            description = "Phoenix VCS - Regenerative version control";
            mainProgram = "phoenix-vcs";
            homepage = "https://github.com/example/phoenix-vcs-rust";
            license = pkgs.lib.licenses.mit;
          };
        };
      in
      {
        # Package output
        packages = {
          default = phoenix-vcs;
          phoenix-vcs = phoenix-vcs;
        };

        # App output for `nix run`
        apps.default = {
          type = "app";
          program = "${phoenix-vcs}/bin/phoenix-vcs";
        };

        # Development shell via devenv
        devShells.default = devenv.lib.mkShell {
          inherit inputs pkgs;
          modules = [
            (import ./devenv.nix)
          ];
        };
      });
}
