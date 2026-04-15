{ pkgs, lib, config, inputs, ... }:

{
  packages = [
    pkgs.bun
    pkgs.nix
  ];

  env = {
    API_URL = "hono-server";
    DEVSERVER_URL = "vite-dev-server";
  };

  languages.typescript = {
    enable = true;
  };

  scripts = {
    dev.exec = ''
      bun run --cwd hono-server dev
    '';
  };

}