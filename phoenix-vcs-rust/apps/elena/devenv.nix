{ pkgs, lib, config, inputs, ... }:

{
  packages = [
    pkgs.nix
    pkgs.bun
    pkgs.bun
    pkgs.bun
  ];

  env = {
    API_URL = "hono-server";
    DEVSERVER_URL = "vite-dev-server";
  };

  languages.typescript = {
    enable = true;
    package = pkgs.nodejs_20;
  };

  services.hono_server = {
    enable = true;
    command = "hono_server";
    port = 3000;
  };

  scripts = {
    dev.exec = ''
      bun run --cwd hono-server dev
    '';
  };

  pre-commit.hooks = {
    nixpkgs-fmt.enable = true;
    typos.enable = true;
  };

}