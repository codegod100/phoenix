{ pkgs, lib, config, inputs, ... }:

{
  packages = [
    pkgs.bun
    pkgs.concurrently
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


  enterShell = ''
    # Auto-install dependencies if needed
    if [ ! -d node_modules ] || [ package.json -nt node_modules ]; then
      echo "📦 Installing dependencies..."
      bun install
    fi
    
    echo "🔥 Elena dev environment ready!"
    echo "  Run 'bun run dev' to start the dev server"
  '';
}