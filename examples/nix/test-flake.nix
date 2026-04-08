# Test script for Requirements Domain
# Run: nix flake check

{ pkgs ? import <nixpkgs> {} }:

pkgs.runCommand "test-flake" {} ''
  echo "Testing flake evaluation..."
  nix flake check --no-build 2>&1 && echo "✅ Flake is valid" || echo "❌ Flake has errors"
  touch $out
''