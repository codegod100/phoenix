#!/usr/bin/env node
/**
 * Phoenix Regen - Theory-Driven Code Generator
 *
 * Theory Morphism Philosophy:
 * 1. Read codegen-instruction.md (ThIU → ThLang theory mapping)
 * 2. Apply theory morphism to generate clean implementations
 * 3. Auto-inject logging from ThLog morphism
 * 4. Generated code is ready to use (with TODOs for unimplemented logic)
 *
 * Language Agnostic:
 * - Pluggable generators for any language (Python, TypeScript, Nix, Rust, etc.)
 * - Auto-detects target language from IU config, project config, or file extension
 * - Falls back to Python by default (for Textual TUI projects)
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
    python: 'src/generated',
    typescript: 'src/generated',
    javascript: 'src/generated',
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

  // Check for migration plan (from panproto protolens phase)
  let migrationPlan = null;
  const migrationPath = process.env.PHOENIX_MIGRATION_PLAN;
  if (migrationPath && existsSync(migrationPath)) {
    try {
      migrationPlan = JSON.parse(readFileSync(migrationPath, 'utf-8'));
      console.log(`   🔄 Migration mode: ${migrationPlan.summary.migrate} migrate, ${migrationPlan.summary.regenerate} regenerate, ${migrationPlan.summary.unchanged} unchanged`);
    } catch (e) {
      console.log(`   ⚠️  Could not read migration plan: ${e.message}`);
    }
  }
  
  // Legacy: Check for selective regeneration (from old panproto impact)
  let affectedIUs = null;
  const envAffected = process.env.PHOENIX_AFFECTED_IUS;
  if (envAffected && !migrationPlan) {
    try {
      affectedIUs = JSON.parse(envAffected);
      console.log(`   🎯 Selective mode: ${affectedIUs.length} IUs from protolens`);
    } catch (e) {
      console.log(`   ⚠️  Could not parse affected IUs: ${e.message}`);
    }
  }

  const manifest = loadManifest(projectRoot);
  const generated = [];
  const migrated = [];
  const errors = [];
  
  // Build lookup map from migration plan
  const migrationMap = new Map();
  if (migrationPlan?.ius) {
    for (const entry of migrationPlan.ius) {
      migrationMap.set(entry.new_iu_id, entry);
    }
  }

  // Track loaded generators and template generation status
  const generators = new Map();
  const templateGenerated = new Set();

  for (const iu of iuGraph.ius) {
    // Skip if filter specified and doesn't match
    if (iuFilter && !iu.id.includes(iuFilter) && iu.short_id !== iuFilter) {
      continue;
    }
    
    // Check migration strategy for this IU
    const migrationEntry = migrationMap.get(iu.id);
    const strategy = migrationEntry?.strategy || 'regenerate';
    
    // Skip if selective regeneration and IU not affected (legacy mode)
    if (affectedIUs && !affectedIUs.includes(iu.id)) {
      continue;
    }
    
    // Skip if unchanged (when using migration plan)
    if (strategy === 'unchanged') {
      console.log(`   ⏭️  ${iu.short_id}: ${iu.name} (unchanged)`);
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

      // MIGRATE: Copy and transform old implementation
      if (strategy === 'migrate' && migrationEntry?.old_impl_path && existsSync(migrationEntry.old_impl_path)) {
        console.log(`   🔄 ${iu.short_id}: ${iu.name} (migrating from ${migrationEntry.old_iu_name || 'old IU'})`);
        
        // Read old implementation
        const oldImplCode = readFileSync(migrationEntry.old_impl_path, 'utf-8');
        
        // Transform: Update traceability header, keep implementation body
        // For now, simple approach: wrap old code with new traceability
        const migratedImplCode = generator.migrateImpl(iu, oldImplCode, { 
          projectRoot, 
          implPath, 
          testPath,
          oldIuId: migrationEntry.old_iu_id,
          overlapRatio: migrationEntry.overlap_ratio,
        });
        
        mkdirSync(dirname(implPath), { recursive: true });
        writeFileSync(implPath, migratedImplCode, 'utf-8');
        
        // For tests, generate fresh (tests validate the migrated implementation)
        const testCode = generator.generateTests(iu, implPath);
        mkdirSync(dirname(testPath), { recursive: true });
        writeFileSync(testPath, testCode, 'utf-8');
        
        // Update manifest
        manifest.files[iu.id] = {
          impl: {
            path: implPath,
            hash: fileHash(migratedImplCode),
            generated_at: new Date().toISOString(),
            language: targetLang,
            migrated_from: migrationEntry.old_iu_id,
            migration_reason: migrationEntry.reason,
          },
          test: {
            path: testPath,
            hash: fileHash(testCode),
            generated_at: new Date().toISOString(),
            language: targetLang,
          },
        };
        
        migrated.push({
          iu: iu.name,
          short_id: iu.short_id,
          language: targetLang,
          impl: implPath,
          test: testPath,
          from: migrationEntry.old_iu_id,
          overlap: migrationEntry.overlap_ratio,
        });
      } 
      // REGENERATE: Generate fresh stubs
      else {
        if (strategy === 'migrate') {
          console.log(`   📝 ${iu.short_id}: ${iu.name} (regenerate - no old implementation to migrate)`);
        } else {
          console.log(`   📝 ${iu.short_id}: ${iu.name} (regenerate${migrationEntry ? ` - ${migrationEntry.reason}` : ''})`);
        }
        
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
      }
    } catch (err) {
      errors.push({
        iu: iu.name,
        short_id: iu.short_id,
        error: err.message,
      });
    }
  }

  const manifestPath = saveManifest(projectRoot, manifest);

  return { generated, migrated, errors, manifestPath, languages: [...generators.keys()] };
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
🚀 Phoenix Regen — Theory-Driven Code Generator

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
  4. Default: python
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

  console.log('🚀 Phoenix Regen — Theory-Driven Code Generator');
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
    
    // Display migrated IUs (lifted from old implementations)
    if (result.migrated && result.migrated.length > 0) {
      console.log('🔄 Migrated IUs (lifted from old schema):');
      console.log('');
      
      const byLangMigrated = {};
      for (const mig of result.migrated) {
        if (!byLangMigrated[mig.language]) byLangMigrated[mig.language] = [];
        byLangMigrated[mig.language].push(mig);
      }
      
      for (const [lang, items] of Object.entries(byLangMigrated)) {
        console.log(`   [${lang.toUpperCase()}]`);
        for (const mig of items) {
          console.log(`   🔄 ${mig.short_id}: ${mig.iu}`);
          console.log(`      Impl: ${mig.impl}`);
          console.log(`      Test: ${mig.test}`);
          if (mig.from) {
            console.log(`      Migrated from: ${mig.from.slice(0, 16)}... (${Math.round((mig.overlap || 0) * 100)}% overlap)`);
          }
          console.log('');
        }
      }
    }

    // Group by language for display
    const byLang = {};
    for (const gen of result.generated) {
      if (!byLang[gen.language]) byLang[gen.language] = [];
      byLang[gen.language].push(gen);
    }
    
    if (result.generated.length > 0) {
      console.log('📝 Generated clean implementations (ready to use):');
      console.log('');

      for (const [lang, items] of Object.entries(byLang)) {
        console.log(`   [${lang.toUpperCase()}]`);
        for (const gen of items) {
          console.log(`   📝 ${gen.short_id}: ${gen.iu}`);
          console.log(`      Impl: ${gen.impl}`);
          console.log('');
        }
      }
    }

    if (result.errors.length > 0) {
      console.log('❌ Errors:');
      for (const err of result.errors) {
        console.log(`   ${err.short_id}: ${err.error}`);
      }
      console.log('');
    }

    console.log('📋 Next Steps:');
    console.log('   1. Review generated code in src/generated/');
    console.log('   2. Fill in TODO sections for unimplemented logic');
    console.log('   3. Check auto-injected logging with your log viewer');
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
