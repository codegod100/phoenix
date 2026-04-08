# Canonical Requirements

Generated from spec files. Each requirement has a unique hash-based ID.

## Requirements

- [node-1f540d2c] the system shall primary capability
- [node-8330b04e] the system shall secondary capability
- [node-03ef4d25] must not exceed limitation
- [node-09daab1c] must support minimum requirement

## Definitions

- [node-6ab64ae1] term means clear definition

## Flake Structure

- [node-c1123e72] the flake shall define a standard flakenix with inputs and outputs sections
- [node-2fc52ba4] the flake inputs shall include nixpkgs as a dependency
- [node-342049e6] the flake shall support both x8664linux and aarch64darwin systems
- [node-2a2b9057] a devshell is a nix shell environment with tools for development

## Development Shell

- [node-bb7163e6] the devshell shall provide nodejs version 20 or later
- [node-92b1e5e6] the devshell shall include git for version control
- [node-33b03234] the devshell shall provide a welcome message showing available commands
- [node-ce6ed488] the devshell shall set the phoenixexample environment variable to nix
- [node-33de83aa] the devshell must not install global npm packages

## Package Output

- [node-ed51bc96] the flake shall expose a packages output with a default package
- [node-39063fa4] the default package shall be a shell script that outputs hello from phoenix nix flake
- [node-124c208c] the package script shall include the current timestamp at build time
- [node-ddbd5e96] the package metadata shall include description homepage and license fields

## Formatter

- [node-2009136d] the flake shall expose a formatter output using nixpkgsfmt
- [node-683f970e] the formatter shall be available for all supported systems

## Checks

- [node-4c3b2fc2] the flake shall define checks that verify the package builds successfully
- [node-b3060bef] the checks shall run the package and verify output contains hello
- [node-277e1045] checks must pass before the flake is considered valid

## Overlays

- [node-a7765cb4] the flake shall provide an overlay output for extending nixpkgs
- [node-ac69ec29] the overlay shall add the phoenixnixexample package to nixpkgs
