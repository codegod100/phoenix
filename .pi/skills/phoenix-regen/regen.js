#!/usr/bin/env node
/**
 * Phoenix Regen - Language-Agnostic RED (failing) Code Generator
 *
 * TDD Philosophy:
 * 1. Generate code with WRONG implementations (RED — tests fail)
 * 2. Human or LLM fixes implementations (GREEN — tests pass)
 * 3. Evidence validates the GREEN state
 *
 * Language Agnostic:
 * - Pluggable generators for any language (TypeScript, Python, Nix, Rust, etc.)
 * - Auto-detects target language from IU config, project config, or file extension
 * - Falls back to TypeScript by default
 *
 * Usage: node .pi/skills/phoenix-regen/regen.js [project-root] [iu-id] [--lang=python]
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { createHash } from 'crypto';
import { resolve, join, dirname, relative, extname } from 'path';
import { loadGenerator, detectTargetLanguage, getTestFilePattern } from './generator-loader.js';

// === VCS IDENTITY FUNCTIONS ===

function sha256(input) {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function fileHash(content) {
  return sha256(content);
}

// === PATH RESOLUTION ===

/**
 * Resolve output paths for an IU, considering language and project structure
 */
function resolveOutputPaths(iu, projectRoot, generator, options = {}) {
  const { forceLang = null } = options;
  const targetLang = forceLang || iu.target_language || 'typescript';

  // If IU has explicit paths AND no language override, use them
  if (!forceLang && iu.output_path && iu.test_path) {
    return {
      impl: join(projectRoot, iu.output_path),
      test: join(projectRoot, iu.test_path),
    };
  }

  // Special case: nix-flake generator outputs flake.nix directly
  if (targetLang === 'nix-flake') {
    return {
      impl: join(projectRoot, 'flake.nix'),
      test: join(projectRoot, 'test-flake.nix'),
    };
  }

  // Generate paths based on language conventions
  const baseName = toKebabCase(iu.name);

  // Get extensions from generator
  const implExt = generator.getFileExtension ? generator.getFileExtension() : getDefaultExtension(targetLang);
  const testPattern = generator.getTestFilePattern ? generator.getTestFilePattern() : getTestFilePattern(targetLang);

  // Determine output directory
  const outputDir = resolveOutputDir(projectRoot, targetLang, iu);

  // Build paths
  const implPath = join(outputDir, `${baseName}${implExt}`);

  let testPath;
  if (typeof testPattern === 'object' && testPattern.subdir) {
    // Language with test subdirectory (like TypeScript's __tests__)
    const testDir = join(dirname(implPath), testPattern.subdir);
    const testExt = testPattern.suffix || implExt;
    testPath = join(testDir, `${baseName}${testExt}`);
  } else if (typeof testPattern === 'object' && testPattern.prefix) {
    // Language with test prefix (like Python's test_*.py)
    const testExt = testPattern.suffix || implExt;
    testPath = join(dirname(implPath), `${testPattern.prefix}${baseName}${testExt}`);
  } else if (typeof testPattern === 'object' && testPattern.suffix) {
    // Object pattern with just suffix (like Nix's .test.nix)
    testPath = join(dirname(implPath), `${baseName}${testPattern.suffix}`);
  } else {
    // Simple suffix pattern (string)
    const testExt = typeof testPattern === 'string' ? testPattern : `${implExt}`;
    testPath = join(dirname(implPath), `${baseName}${testExt}`);
  }

  return { impl: implPath, test: testPath };
}

function resolveOutputDir(projectRoot, lang, iu) {
  // Check for project-specific overrides
  const config = loadProjectConfig(projectRoot);
  if (config?.outputDir) {
    return join(projectRoot, config.outputDir);
  }

  // Language-specific defaults
  const defaults = {
    typescript: 'src/generated',
    javascript: 'src/generated',
    python: 'src',
    nix: '.',
    rust: 'src',
    go: '.',
    java: 'src/main/java/generated',
    ruby: 'lib',
    elixir: 'lib',
    haskell: 'src',
  };

  const defaultDir = defaults[lang] || 'generated';

  // For domain-based grouping (if name contains domain hint)
  if (iu.name.includes('Domain')) {
    const domain = toKebabCase(iu.name.replace(/Domain/, ''));
    return join(projectRoot, defaultDir, domain);
  }

  return join(projectRoot, defaultDir);
}

function getDefaultExtension(lang) {
  const extensions = {
    typescript: '.ts',
    javascript: '.js',
    python: '.py',
    nix: '.nix',
    rust: '.rs',
    go: '.go',
    java: '.java',
    kotlin: '.kt',
    swift: '.swift',
    ruby: '.rb',
    elixir: '.ex',
    haskell: '.hs',
  };
  return extensions[lang] || '.txt';
}

function loadProjectConfig(projectRoot) {
  const configPaths = [
    join(projectRoot, '.phoenix', 'config.json'),
    join(projectRoot, 'phoenix.json'),
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        return JSON.parse(readFileSync(path, 'utf-8'));
      } catch (e) {
        // Continue
      }
    }
  }
  return null;
}

// === STRING UTILS ===

function toKebabCase(str) {
  return str
    .replace(/[^a-zA-Z0-9]/g, ' ')
    .split(' ')
    .map(w => w.toLowerCase())
    .join('-')
    .replace(/-+$/, '');
}

// === REGENERATION ===

async function regenerate(projectRoot, options = {}) {
  const { iuFilter = null, forceLang = null } = options;

  const iuGraph = loadIUGraph(projectRoot);
  if (!iuGraph) {
    throw new Error('No IU graph found. Run phoenix-plan first.');
  }

  // Check for selective regeneration (from panproto protolens)
  let affectedIUs = null;
  const envAffected = process.env.PHOENIX_AFFECTED_IUS;
  if (envAffected) {
    try {
      affectedIUs = JSON.parse(envAffected);
      console.log(`   🎯 Selective mode: ${affectedIUs.length} IUs from protolens`);
    } catch (e) {
      console.log(`   ⚠️  Could not parse affected IUs: ${e.message}`);
    }
  }

  const manifest = loadManifest(projectRoot);
  const generated = [];
  const errors = [];

  // Track loaded generators and template generation status
  const generators = new Map();
  const templateGenerated = new Set();

  for (const iu of iuGraph.ius) {
    // Skip if filter specified and doesn't match
    if (iuFilter && !iu.id.includes(iuFilter) && iu.short_id !== iuFilter) {
      continue;
    }
    
    // Skip if selective regeneration and IU not affected
    if (affectedIUs && !affectedIUs.includes(iu.id)) {
      continue;
    }

    try {
      // Detect or force target language
      const targetLang = forceLang || detectTargetLanguage(iu, projectRoot);
      iu.target_language = targetLang;

      // Load generator (cached per language)
      let generator;
      if (generators.has(targetLang)) {
        generator = generators.get(targetLang);
      } else {
        generator = await loadGenerator(targetLang);
        generators.set(targetLang, generator);
      }

      // For template-style generators (like nix-flake), only generate once
      if (generator.isTemplateGenerator || targetLang === 'nix-flake') {
        if (templateGenerated.has(targetLang)) {
          // Skip this IU - already generated the combined template
          continue;
        }
        templateGenerated.add(targetLang);
      }

      // Resolve output paths
      const { impl: implPath, test: testPath } = resolveOutputPaths(iu, projectRoot, generator, { forceLang });

      // Generate implementation
      const implCode = generator.generateImpl(iu, { projectRoot, implPath, testPath, allIUs: iuGraph.ius });
      mkdirSync(dirname(implPath), { recursive: true });
      writeFileSync(implPath, implCode, 'utf-8');

      // Generate test file with failing tests
      const testCode = generator.generateTests(iu, implPath);
      mkdirSync(dirname(testPath), { recursive: true });
      writeFileSync(testPath, testCode, 'utf-8');

      // Update manifest
      manifest.files[iu.id] = {
        impl: {
          path: implPath,
          hash: fileHash(implCode),
          generated_at: new Date().toISOString(),
          language: targetLang,
        },
        test: {
          path: testPath,
          hash: fileHash(testCode),
          generated_at: new Date().toISOString(),
          language: targetLang,
        },
      };

      generated.push({
        iu: iu.name,
        short_id: iu.short_id,
        language: targetLang,
        impl: implPath,
        test: testPath,
      });
    } catch (err) {
      errors.push({
        iu: iu.name,
        short_id: iu.short_id,
        error: err.message,
      });
    }
  }

  const manifestPath = saveManifest(projectRoot, manifest);

  return { generated, errors, manifestPath, languages: [...generators.keys()] };
}

// === MANIFEST & STATE ===

function loadIUGraph(projectRoot) {
  const iusPath = join(projectRoot, '.phoenix', 'graphs', 'ius.json');
  if (!existsSync(iusPath)) {
    return null;
  }
  return JSON.parse(readFileSync(iusPath, 'utf-8'));
}

function loadManifest(projectRoot) {
  const manifestPath = join(projectRoot, '.phoenix', 'manifests', 'generated_manifest.json');
  if (!existsSync(manifestPath)) {
    return { version: '1.0.0', generated_at: new Date().toISOString(), files: {} };
  }
  return JSON.parse(readFileSync(manifestPath, 'utf-8'));
}

function saveManifest(projectRoot, manifest) {
  const manifestDir = join(projectRoot, '.phoenix', 'manifests');
  if (!existsSync(manifestDir)) {
    mkdirSync(manifestDir, { recursive: true });
  }
  const manifestPath = join(manifestDir, 'generated_manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');
  return manifestPath;
}

// === CLI ===

function parseArgs(args) {
  const options = {
    projectRoot: '.',
    iuFilter: null,
    forceLang: null,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    if (arg.startsWith('--lang=')) {
      options.forceLang = arg.split('=')[1];
    } else if (arg.startsWith('--language=')) {
      options.forceLang = arg.split('=')[1];
    } else if (arg === '-l' || arg === '--lang' || arg === '--language') {
      options.forceLang = args[++i];
    } else if (arg === '--help' || arg === '-h') {
      showHelp();
      process.exit(0);
    } else if (arg === '--list-languages') {
      options.listLanguages = true;
    } else if (!options.projectRoot || options.projectRoot === '.') {
      // First positional arg is project root
      options.projectRoot = arg;
    } else if (!options.iuFilter) {
      // Second positional arg is IU filter
      options.iuFilter = arg;
    }
  }

  return options;
}

function showHelp() {
  console.log(`
🚀 Phoenix Regen — Language-Agnostic TDD Code Generator

Usage:
  node .pi/skills/phoenix-regen/regen.js [project-root] [iu-id] [options]

Arguments:
  project-root    Path to Phoenix project (default: .)
  iu-id           Filter: regenerate only matching IU (optional)

Options:
  --lang=LANG     Force output language (typescript, python, nix, ...)
  --list-languages  Show all available generators
  --help, -h      Show this help

Examples:
  # Regenerate all IUs with auto-detected language
  node .pi/skills/phoenix-regen/regen.js ./my-project

  # Regenerate specific IU
  node .pi/skills/phoenix-regen/regen.js ./my-project IU-a1b2c3d4

  # Force Python output for all IUs
  node .pi/skills/phoenix-regen/regen.js ./my-project --lang=python

Language Detection:
  1. IU's target_language field
  2. Project's .phoenix/config.json targetLanguage
  3. Existing file extensions
  4. Default: typescript
`);
}

async function listLanguages() {
  const { listAvailableGenerators } = await import('./generator-loader.js');
  const { builtIn, custom } = listAvailableGenerators();

  console.log('\n📦 Available Generators\n');

  console.log('Built-in:');
  for (const lang of builtIn) {
    console.log(`  • ${lang}`);
  }

  if (custom.length > 0) {
    console.log('\nCustom:');
    for (const lang of custom) {
      console.log(`  • ${lang}`);
    }
  }

  console.log('\nCreate custom generators at:');
  console.log('  ./.phoenix/generators/<name>.js  (project-local)');
  console.log('  ~/.phoenix/generators/<name>.js  (user-global)');
  console.log('');
}

// === MAIN ===

async function main() {
  const args = process.argv.slice(2);
  const options = parseArgs(args);

  // Handle list-languages early (before requiring project)
  if (options.listLanguages) {
    await listLanguages();
    process.exit(0);
  }

  const projectRoot = resolve(options.projectRoot);

  console.log('🚀 Phoenix Regen — Language-Agnostic TDD');
  console.log(`   Project: ${projectRoot}`);

  if (options.iuFilter) {
    console.log(`   Filter: ${options.iuFilter}`);
  }
  if (options.forceLang) {
    console.log(`   Language: ${options.forceLang} (forced)`);
  } else {
    console.log(`   Language: auto-detect`);
  }
  console.log('');

  try {
    const result = await regenerate(projectRoot, options);

    // Group by language for display
    const byLang = {};
    for (const gen of result.generated) {
      if (!byLang[gen.language]) byLang[gen.language] = [];
      byLang[gen.language].push(gen);
    }

    console.log('🔴 Generated RED code (tests will fail):');
    console.log('');

    for (const [lang, items] of Object.entries(byLang)) {
      console.log(`   [${lang.toUpperCase()}]`);
      for (const gen of items) {
        console.log(`   🔴 ${gen.short_id}: ${gen.iu}`);
        console.log(`      Impl: ${gen.impl}`);
        console.log(`      Test: ${gen.test}`);
        console.log('');
      }
    }

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      for (const err of result.errors) {
        console.log(`   ${err.short_id}: ${err.error}`);
      }
      console.log('');
    }

    console.log('📋 TDD Next Steps:');
    console.log('   1. Run tests — See 🔴 RED (tests fail)');
    console.log('   2. Fix implementations in generated files');
    console.log('   3. Re-run tests — See 🟢 GREEN (tests pass)');
    console.log('   4. Run: node .pi/skills/phoenix-evidence/evidence.js .');
    console.log('');
    console.log(`✅ Manifest: ${result.manifestPath}`);
    console.log(`   Generated: ${result.generated.length}`);
    console.log(`   Languages: ${result.languages.join(', ')}`);
    console.log(`   Errors: ${result.errors.length}`);

  } catch (error) {
    console.error(`\n❌ Regeneration failed: ${error.message}`);
    process.exit(1);
  }
}

main();
