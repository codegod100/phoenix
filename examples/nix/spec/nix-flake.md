# Nix Flake Generator

A declarative Nix flake specification for reproducible development environments and package builds.

## Flake Structure

- REQUIREMENT: The flake shall define a standard `flake.nix` with `inputs` and `outputs` sections
- REQUIREMENT: The flake inputs shall include `nixpkgs` as a dependency
- REQUIREMENT: The flake shall support both `x86_64-linux` and `aarch64-darwin` systems
- DEFINITION: A "devShell" is a Nix shell environment with tools for development

## Development Shell

- REQUIREMENT: The devShell shall provide Node.js version 20 or later
- REQUIREMENT: The devShell shall include git for version control
- REQUIREMENT: The devShell shall provide a welcome message showing available commands
- REQUIREMENT: The devShell shall set the `PHOENIX_EXAMPLE` environment variable to "nix"
- CONSTRAINT: The devShell must not install global npm packages

## Package Output

- REQUIREMENT: The flake shall expose a `packages` output with a default package
- REQUIREMENT: The default package shall be a shell script that outputs "Hello from Phoenix Nix flake!"
- REQUIREMENT: The package script shall include the current timestamp at build time
- REQUIREMENT: The package metadata shall include description, homepage, and license fields

## Formatter

- REQUIREMENT: The flake shall expose a `formatter` output using `nixpkgs-fmt`
- REQUIREMENT: The formatter shall be available for all supported systems

## Checks

- REQUIREMENT: The flake shall define `checks` that verify the package builds successfully
- REQUIREMENT: The checks shall run the package and verify output contains "Hello"
- CONSTRAINT: Checks must pass before the flake is considered valid

## Overlays

- REQUIREMENT: The flake shall provide an `overlay` output for extending nixpkgs
- REQUIREMENT: The overlay shall add the phoenix-nix-example package to nixpkgs
