/**
 * Generator Loader for Phoenix Regen
 * Loads and manages language-specific generators
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// Cache for loaded generators
const generatorCache = new Map();

/**
 * Detect the target language for an IU
 * Checks in order:
 * 1. IU's target_language field
 * 2. Project's phoenix.config.js
 * 3. Existing files in output directory
 * 4. Default to TypeScript
 */
export function detectTargetLanguage(iu, projectRoot) {
  // 1. IU-specific target
  if (iu.target_language) {
    return iu.target_language;
  }

  // 2. Project config
  const config = loadProjectConfig(projectRoot);
  if (config?.targetLanguage) {
    return config.targetLanguage;
  }

  // 3. Auto-detect from existing files
  if (iu.output_path) {
    const ext = detectLanguageFromExtension(iu.output_path);
    if (ext) return ext;
  }

  // 4. Default
  return 'typescript';
}

/**
 * Load a generator for the given language
 */
export async function loadGenerator(language) {
  const lang = language.toLowerCase();

  // Check cache
  if (generatorCache.has(lang)) {
    return generatorCache.get(lang);
  }

  // Built-in generators
  const builtInGenerators = ['typescript', 'python', 'nix', 'nix-flake'];

  let generator;

  if (builtInGenerators.includes(lang)) {
    // Load built-in generator
    const generatorPath = join(
      new URL('.', import.meta.url).pathname,
      'generators',
      `${lang}.js`
    );

    if (!existsSync(generatorPath)) {
      throw new Error(`Built-in generator not found: ${generatorPath}`);
    }

    generator = await import(generatorPath);
  } else {
    // Try to load custom generator from project or global path
    generator = await loadCustomGenerator(lang);
  }

  // Validate generator interface
  validateGenerator(generator, lang);

  // Cache and return
  generatorCache.set(lang, generator);
  return generator;
}

/**
 * List all available generators
 */
export function listAvailableGenerators() {
  const builtIn = ['typescript', 'python', 'nix'];

  // TODO: Scan for custom generators in ~/.phoenix/generators/

  return {
    builtIn,
    custom: [],
  };
}

/**
 * Get file extension for a language
 */
export function getFileExtension(language) {
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

  return extensions[language.toLowerCase()] || '.txt';
}

/**
 * Get test file extension/pattern for a language
 */
export function getTestFilePattern(language) {
  const patterns = {
    typescript: { suffix: '.test.ts', subdir: '__tests__' },
    javascript: { suffix: '.test.js', subdir: '__tests__' },
    python: { prefix: 'test_', suffix: '.py', subdir: null },
    nix: { suffix: '.test.nix', subdir: null },
    rust: { suffix: '_test.rs', subdir: 'tests' },
    go: { suffix: '_test.go', subdir: null },
    java: { suffix: 'Test.java', subdir: 'test' },
    ruby: { suffix: '_test.rb', subdir: 'test' },
    elixir: { suffix: '_test.exs', subdir: 'test' },
  };

  return patterns[language.toLowerCase()] || { suffix: '.test.txt', subdir: null };
}

// === INTERNAL HELPERS ===

function loadProjectConfig(projectRoot) {
  const configPaths = [
    join(projectRoot, 'phoenix.config.js'),
    join(projectRoot, '.phoenix', 'config.json'),
    join(projectRoot, 'package.json'),  // Check for phoenix field
  ];

  for (const path of configPaths) {
    if (existsSync(path)) {
      try {
        if (path.endsWith('.js')) {
          // For ES modules, we need dynamic import
          return null; // TODO: Support ES module config
        } else {
          const content = readFileSync(path, 'utf-8');
          const parsed = JSON.parse(content);

          // Check for phoenix field in package.json
          if (path.endsWith('package.json') && parsed.phoenix) {
            return parsed.phoenix;
          }

          return parsed;
        }
      } catch (e) {
        // Continue to next
      }
    }
  }

  return null;
}

function detectLanguageFromExtension(filePath) {
  const extToLang = {
    '.ts': 'typescript',
    '.js': 'javascript',
    '.py': 'python',
    '.nix': 'nix',
    '.rs': 'rust',
    '.go': 'go',
    '.java': 'java',
    '.kt': 'kotlin',
    '.swift': 'swift',
    '.rb': 'ruby',
    '.ex': 'elixir',
    '.exs': 'elixir',
    '.hs': 'haskell',
  };

  const ext = filePath.substring(filePath.lastIndexOf('.'));
  return extToLang[ext] || null;
}

async function loadCustomGenerator(lang) {
  // Try multiple locations for custom generators
  const searchPaths = [
    // Project-specific generators
    resolve(process.cwd(), '.phoenix', 'generators', `${lang}.js`),
    // User home
    resolve(process.env.HOME || process.env.USERPROFILE, '.phoenix', 'generators', `${lang}.js`),
    // Global install
    resolve('/usr/local/share/phoenix/generators', `${lang}.js`),
  ];

  for (const path of searchPaths) {
    if (existsSync(path)) {
      return await import(path);
    }
  }

  throw new Error(`
Unknown language: ${lang}

No generator found for '${lang}'. Options:
1. Use a built-in language: typescript, python, nix
2. Create a custom generator at:
   - ./.phoenix/generators/${lang}.js (project-specific)
   - ~/.phoenix/generators/${lang}.js (user-global)

A generator must export:
  - generateImpl(iu, config) -> string
  - generateTests(iu, implPath) -> string
  - getFileExtension() -> string
  - getTestFileExtension() or getTestFilePattern() -> string | object
`);
}

function validateGenerator(generator, lang) {
  const required = ['generateImpl', 'generateTests', 'getFileExtension'];

  const missing = required.filter(fn => typeof generator[fn] !== 'function');

  if (missing.length > 0) {
    throw new Error(`
Generator for '${lang}' is missing required functions:
  ${missing.join(', ')}

A valid generator must export:
  - generateImpl(iu, config): Returns implementation code string
  - generateTests(iu, implPath): Returns test code string
  - getFileExtension(): Returns file extension (e.g., '.ts')
  - getTestFileExtension() or getTestFilePattern(): Returns test file pattern
`);
  }
}
