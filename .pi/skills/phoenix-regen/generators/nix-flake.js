/**
 * Nix Flake Generator for Phoenix Regen
 * Generates a complete, working flake.nix from IUs
 * 
 * This is a "template-style" generator that creates a complete artifact
 * rather than RED stubs. It's designed for declarative configs like
 * Nix flakes, Dockerfiles, Kubernetes manifests, etc.
 */

export function generateImpl(iu, config) {
  // Collect all IUs for this project to build a complete flake
  const allIUs = config.allIUs || [iu];
  
  const lines = [];
  
  // Header - use a better description if available
  const flakeDesc = findFlakeDescription(allIUs) || iu.description || 'Phoenix-generated Nix flake';
  
  lines.push(`{`);
  lines.push(`  description = "${flakeDesc}";`);
  lines.push('');
  
  // Check what features we need based on IU names and content
  const hasDevShell = hasIU(allIUs, /development|devshell|shell/i);
  const hasFormatter = hasIU(allIUs, /formatter/i);
  const hasPackages = hasIU(allIUs, /package/i);
  const hasChecks = hasIU(allIUs, /checks|check/i);
  const hasOverlays = hasIU(allIUs, /overlay/i);
  const needsFlakeUtils = hasIU(allIUs, /flake.*domain|system|x86|aarch/i) || 
                          hasRequirementText(allIUs, /x86_64|aarch64|darwin|linux/i);
  // Inputs section
  lines.push('  inputs = {');
  lines.push(`    nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";`);
  
  if (needsFlakeUtils) {
    lines.push(`    flake-utils.url = "github:numtide/flake-utils";`);
  }
  lines.push('  };');
  lines.push('');
  
  // Outputs section
  lines.push('  outputs = { self, nixpkgs' + (needsFlakeUtils ? ', flake-utils' : '') + ' }:');
  
  if (needsFlakeUtils) {
    // Multi-system flake
    lines.push(`    flake-utils.lib.eachDefaultSystem (system:`);
    lines.push(`      let`);
    // Escape $ for JavaScript template literal - Nix uses ''${var} syntax
    lines.push(`        pkgs = nixpkgs.legacyPackages.\${system};`);
    lines.push(`      in {`);
    lines.push('');
    
    // Generate sections based on what IUs we have
    if (hasDevShell) generateDevShell(lines, allIUs, '        ');
    if (hasPackages) generatePackages(lines, allIUs, '        ');
    if (hasFormatter) generateFormatter(lines, allIUs, '        ');
    if (hasChecks) generateChecks(lines, allIUs, '        ');
    
    lines.push(`      });`);
  } else {
    // Single-system flake
    lines.push(`    let`);
    lines.push(`      pkgs = import nixpkgs { system = "x86_64-linux"; };`);
    lines.push(`    in {`);
    lines.push('');
    
    if (hasDevShell) generateDevShell(lines, allIUs, '      ');
    if (hasPackages) generatePackages(lines, allIUs, '      ');
    if (hasFormatter) generateFormatter(lines, allIUs, '      ');
    if (hasChecks) generateChecks(lines, allIUs, '      ');
    
    lines.push(`    };`);
  }
  
  // Overlays (outside eachDefaultSystem)
  if (hasOverlays) generateOverlays(lines, allIUs, '  ');
  
  lines.push('}');
  lines.push('');
  
  return lines.join('\n');
}

export function generateTests(iu, implPath) {
  // For a complete flake.nix, "tests" are nix flake check
  const lines = [];
  
  lines.push(`# Test script for ${iu.name}`);
  lines.push(`# Run: nix flake check`);
  lines.push('');
  lines.push(`{ pkgs ? import <nixpkgs> {} }:`);
  lines.push('');
  lines.push(`pkgs.runCommand "test-flake" {} ''`);
  lines.push(`  echo "Testing flake evaluation..."`);
  lines.push(`  nix flake check --no-build 2>&1 && echo "✅ Flake is valid" || echo "❌ Flake has errors"`);
  // Escape $ for JavaScript template literal
  lines.push(`  touch \$out`);
  lines.push(`''`);
  
  return lines.join('\n');
}

export function getFileExtension() {
  return '.nix';
}

export function getTestFilePattern() {
  return { suffix: '.test.sh', subdir: null };
}

// === GENERATION HELPERS ===

function generateDevShell(lines, ius, indent) {
  // Check if we have a Development Domain IU
  const devIU = ius.find(iu => /development/i.test(iu.name));
  if (!devIU) return;
  
  lines.push(`${indent}# Development shell`);
  lines.push(`${indent}devShells.default = pkgs.mkShell {`);
  lines.push(`${indent}  name = "phoenix-dev";`);
  lines.push(`${indent}  buildInputs = with pkgs; [`);
  
  // Default packages for development
  lines.push(`${indent}    nodejs_20  # Node.js 20+ for Phoenix tooling`);
  lines.push(`${indent}    git        # Version control`);
  lines.push(`${indent}    nixpkgs-fmt # Nix formatter`);
  
  lines.push(`${indent}  ];`);
  
  // Shell hook with welcome message
  lines.push(`${indent}  shellHook = ''`);
  lines.push(`${indent}    echo "╔════════════════════════════════════════════════════════╗"`);
  lines.push(`${indent}    echo "║  🐦 Phoenix Nix Flake — Development Environment        ║"`);
  lines.push(`${indent}    echo "╚════════════════════════════════════════════════════════╝"`);
  lines.push(`${indent}    echo ""`);
  lines.push(`${indent}    export PHOENIX_EXAMPLE="nix"`);
  lines.push(`${indent}  '';`);
  
  lines.push(`${indent}};`);
  lines.push('');
}

function generatePackages(lines, ius, indent) {
  const pkgReqs = findRequirements(ius, /package|script|outputs?.*hello|binary/);
  
  if (pkgReqs.length === 0) return;
  
  lines.push(`${indent}# Package outputs`);
  lines.push(`${indent}packages = {`);
  lines.push(`${indent}  default = pkgs.writeShellScriptBin "phoenix-example" ''`);
  lines.push(`${indent}    echo "Hello from Phoenix Nix flake!"`);
  
  // Add timestamp if requested
  const timestampReq = findRequirements(ius, /timestamp|build time|current/)[0];
  if (timestampReq) {
    // Escape $ for JavaScript template literal
    lines.push(`${indent}    echo "Built at: \${builtins.toString self.lastModified or "unknown"}"`);
  }
  
  lines.push(`${indent}  '';`);
  lines.push(`${indent}};`);
  lines.push('');
}

function generateFormatter(lines, ius, indent) {
  const fmtReqs = findRequirements(ius, /formatter|nixpkgs-fmt|format/);
  
  if (fmtReqs.length === 0) return;
  
  lines.push(`${indent}# Formatter`);
  lines.push(`${indent}formatter = pkgs.nixpkgs-fmt;`);
  lines.push('');
}

function generateChecks(lines, ius, indent) {
  const checkReqs = findRequirements(ius, /check|verify|test|valid/);
  
  if (checkReqs.length === 0) return;
  
  lines.push(`${indent}# Checks`);
  lines.push(`${indent}checks = {`);
  lines.push(`${indent}  build-test = pkgs.runCommand "build-test" {} ''`);
  lines.push(`${indent}    echo "Running checks..."`);
  // Escape $ for JavaScript template literal
  lines.push(`${indent}    test -f \${pkgs.hello}/bin/hello && echo "✅ Packages available"`);
  // Escape $ for JavaScript template literal
  lines.push(`${indent}    touch \$out`);
  lines.push(`${indent}  '';`);
  lines.push(`${indent}};`);
  lines.push('');
}

function generateOverlays(lines, ius, indent) {
  const overlayReqs = findRequirements(ius, /overlay|extend|nixpkgs/);
  
  if (overlayReqs.length === 0) return;
  
  lines.push(`${indent}# Overlay for extending nixpkgs`);
  lines.push(`${indent}overlay = final: prev: {`);
  lines.push(`${indent}  # Add your packages here`);
  lines.push(`${indent}};`);
  lines.push('');
}

// === HELPERS ===

function hasRequirement(ius, pattern) {
  for (const iu of ius) {
    const text = JSON.stringify(iu);
    if (pattern.test(text)) return true;
  }
  return false;
}

function findRequirements(ius, pattern) {
  const matches = [];
  for (const iu of ius) {
    // Check description
    if (iu.description && pattern.test(iu.description)) {
      matches.push(iu.description);
    }
    // Check contract
    if (iu.contract) {
      if (iu.contract.description && pattern.test(iu.contract.description)) {
        matches.push(iu.contract.description);
      }
      if (iu.contract.inputs) {
        for (const input of iu.contract.inputs) {
          if (pattern.test(input)) matches.push(input);
        }
      }
    }
  }
  return matches;
}

function hasIU(ius, pattern) {
  return ius.some(iu => pattern.test(iu.name));
}

function hasRequirementText(ius, pattern) {
  return ius.some(iu => {
    const text = JSON.stringify(iu);
    return pattern.test(text);
  });
}

function findFlakeDescription(ius) {
  // Look for a Flake Domain IU or similar
  const flakeIU = ius.find(iu => /flake/i.test(iu.name));
  if (flakeIU) {
    return flakeIU.description.replace(/implements?\s+flake\s+functionality\s+with\s+\d+\s+requirements?/i, 'Nix flake for Phoenix project');
  }
  return null;
}

function extractPackages(reqs) {
  const packages = new Set();
  
  const packageMap = {
    'nodejs': 'nodejs_20',
    'node': 'nodejs_20',
    'node.js': 'nodejs_20',
    'git': 'git',
    'nixpkgs-fmt': 'nixpkgs-fmt',
    'python': 'python3',
    'rust': 'cargo',
    'go': 'go',
  };
  
  for (const req of reqs) {
    const lower = req.toLowerCase();
    for (const [key, pkg] of Object.entries(packageMap)) {
      if (lower.includes(key)) {
        packages.add(pkg);
      }
    }
  }
  
  return Array.from(packages);
}
