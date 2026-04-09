/**
 * Language Registry for Phoenix Codegen
 * 
 * Supported language variants with theory morphisms (lenses)
 * from ThIU to language-specific implementation theories.
 */

export const LanguageVariant = {
  TYPESCRIPT_WEB: 'typescript-web',
  TYPESCRIPT_API: 'typescript-api', 
  PYTHON_FASTAPI: 'python-fastapi',
  PYTHON_FLASK: 'python-flask',
  RUST_AXUM: 'rust-axum',
  GO_STD: 'go-std',
  NIX: 'nix',
};

export const SUPPORTED_LANGUAGES = Object.values(LanguageVariant);

/**
 * Language-specific theory morphism configuration
 * Maps IU theory constructs to language-specific patterns
 */
export const LanguageLenses = {
  [LanguageVariant.TYPESCRIPT_WEB]: {
    name: 'TypeScript (Web)',
    extension: '.ts',
    moduleSystem: 'esm',
    
    // ThIU → ThTypeScript mappings
    iuToLang: {
      // IU boundary export → TypeScript function pattern
      function: (exportName, iuName) => ({
        signature: `export function ${exportName}(input: any): any`,
        asyncSignature: `export async function ${exportName}(input: any): Promise<any>`,
        errorHandling: 'throw new Error(`${exportName} not implemented`)',
      }),
      
      // Data types
      interface: (name, fields) => ({
        declaration: `export interface ${name} {\n${fields.map(f => `  ${f.name}: ${f.type};`).join('\n')}\n}`,
      }),
      
      // UI components from IU exports
      component: (iuName, exports) => ({
        form: exports.includes('edit') || exports.includes('create'),
        buttons: exports.filter(e => ['archive', 'delete', 'restore'].includes(e)),
        list: exports.includes('list') || exports.includes('view'),
        search: exports.includes('search'),
      }),
      
      // Deliverable patterns
      deliverable: {
        serverFramework: 'Node.js native http',
        uiPattern: 'inline HTML/JS',
        stateManagement: 'in-memory Map',
      },
    },
    
    // File structure
    fileStructure: {
      iuDir: (domain) => `${domain}`,
      iuIndex: 'index.ts',
      iuTest: '__tests__/index.test.ts',
      deliverableDir: 'app',
      serverFile: 'server.ts',
      storeFile: 'store.ts',
    },
    
    // Constraint mappings
    constraints: {
      'autocompleteoff attribute': 'autocomplete="off" on input elements',
      'enter key submits form': 'keydown event listener with e.key === "Enter"',
      'autofocus': 'element.focus() call after modal open',
      'form validation': 'HTML5 validation attributes or JS validation',
    },
  },
  
  [LanguageVariant.TYPESCRIPT_API]: {
    name: 'TypeScript (API only)',
    extension: '.ts',
    moduleSystem: 'esm',
    
    iuToLang: {
      function: (exportName) => ({
        signature: `export function ${exportName}(req: Request): Response`,
        asyncSignature: `export async function ${exportName}(req: Request): Promise<Response>`,
      }),
      
      interface: (name, fields) => ({
        declaration: `export interface ${name} {\n${fields.map(f => `  ${f.name}: ${f.type};`).join('\n')}\n}`,
      }),
      
      // API only - no UI
      component: () => null,
      
      deliverable: {
        serverFramework: 'Node.js native http or Express',
        uiPattern: 'none (API only)',
        stateManagement: 'in-memory or database',
      },
    },
    
    fileStructure: {
      iuDir: (domain) => `${domain}`,
      iuIndex: 'index.ts',
      deliverableDir: 'api',
      serverFile: 'server.ts',
      routesFile: 'routes.ts',
    },
    
    constraints: {
      'input validation': 'Zod or class-validator',
      'error handling': 'try/catch with HTTP error responses',
    },
  },
  
  [LanguageVariant.PYTHON_FASTAPI]: {
    name: 'Python (FastAPI)',
    extension: '.py',
    moduleSystem: 'commonjs',
    
    iuToLang: {
      function: (exportName) => ({
        signature: `def ${exportName}(input: dict) -> dict`,
        asyncSignature: `async def ${exportName}(input: dict) -> dict`,
        decorator: '@app.get("/api/{path}")',
      }),
      
      interface: (name, fields) => ({
        declaration: `class ${name}(BaseModel):\n${fields.map(f => `    ${f.name}: ${f.type}`).join('\n')}`,
      }),
      
      component: () => null, // FastAPI typically uses separate frontend
      
      deliverable: {
        serverFramework: 'FastAPI',
        uiPattern: 'optional Jinja2 templates or separate SPA',
        stateManagement: 'SQLAlchemy or in-memory',
      },
    },
    
    fileStructure: {
      iuDir: (domain) => `${domain.replace(/-/g, '_')}`,
      iuIndex: '__init__.py',
      deliverableDir: 'app',
      serverFile: 'main.py',
      modelsFile: 'models.py',
    },
    
    constraints: {
      'input validation': 'Pydantic models',
      'type safety': 'Python 3.10+ with strict typing',
    },
  },
  
  [LanguageVariant.RUST_AXUM]: {
    name: 'Rust (Axum)',
    extension: '.rs',
    moduleSystem: 'cargo',
    
    iuToLang: {
      function: (exportName) => ({
        signature: `pub fn ${exportName}(input: Input) -> Output`,
        asyncSignature: `pub async fn ${exportName}(input: Input) -> Result<Output, Error>`,
        handler: `async fn ${exportName}_handler(State(state): State<AppState>) -> impl IntoResponse`,
      }),
      
      interface: (name, fields) => ({
        declaration: `pub struct ${name} {\n${fields.map(f => `    pub ${f.name}: ${f.type},`).join('\n')}\n}`,
      }),
      
      component: () => null, // Separate frontend typically
      
      deliverable: {
        serverFramework: 'Axum',
        uiPattern: 'static files or separate frontend',
        stateManagement: 'Arc<RwLock<HashMap>> or database',
      },
    },
    
    fileStructure: {
      iuDir: (domain) => `src/${domain.replace(/-/g, '_')}`,
      iuIndex: 'mod.rs',
      deliverableDir: 'src',
      serverFile: 'main.rs',
      libFile: 'lib.rs',
    },
    
    constraints: {
      'memory safety': 'Rust ownership system',
      'error handling': 'Result<T, E> with ? operator',
    },
  },
  
  [LanguageVariant.NIX]: {
    name: 'Nix',
    extension: '.nix',
    moduleSystem: 'nix',
    
    iuToLang: {
      function: (exportName) => ({
        signature: `${exportName} = { config, lib, pkgs, ... }:`,
        returnType: 'attribute set or derivation',
      }),
      
      interface: (name, fields) => ({
        declaration: `${name} = {\n${fields.map(f => `  ${f.name} = ...;`).join('\n')}\n};`,
      }),
      
      component: () => null,
      
      deliverable: {
        serverFramework: 'NixOS service',
        uiPattern: 'none (infrastructure)',
        stateManagement: 'Nix store',
      },
    },
    
    fileStructure: {
      iuDir: (domain) => `${domain}`,
      iuIndex: 'default.nix',
      deliverableDir: '.',
      serverFile: 'service.nix',
      flakeFile: 'flake.nix',
    },
    
    constraints: {
      'pure builds': 'no network access during build',
      'reproducibility': 'pinned dependencies',
    },
  },
};

/**
 * Detect language variant from project context
 * NOTE: This function must be called from a module with fs access
 */
export function detectLanguage(projectPath, canonical, ius, fs = null) {
  // fs is passed from caller to avoid ES module issues
  const { existsSync, readFileSync } = fs || { existsSync: () => false, readFileSync: () => '{}' };
  const join = (a, b) => `${a}/${b}`;
  
  // Check package.json for TypeScript/JavaScript
  if (existsSync(join(projectPath, 'package.json'))) {
    try {
      const pkg = JSON.parse(readFileSync(join(projectPath, 'package.json'), 'utf8'));
      
      // Check for web dependencies
      const hasWebDeps = ['react', 'vue', 'svelte', 'express', 'fastify'].some(
        dep => pkg.dependencies?.[dep] || pkg.devDependencies?.[dep]
      );
      
      // Check for web context in canonical
      const hasWebUI = canonical.nodes?.some(n => 
        n.statement?.toLowerCase().includes('dashboard') ||
        n.statement?.toLowerCase().includes('modal') ||
        n.statement?.toLowerCase().includes('button') ||
        n.statement?.toLowerCase().includes('html')
      );
      
      if (hasWebUI || hasWebDeps) {
        return LanguageVariant.TYPESCRIPT_WEB;
      }
      return LanguageVariant.TYPESCRIPT_API;
    } catch {
      // Fall through to defaults
    }
  }
  
  // Check for Cargo.toml (Rust)
  if (existsSync(join(projectPath, 'Cargo.toml'))) {
    return LanguageVariant.RUST_AXUM;
  }
  
  // Check for requirements.txt or pyproject.toml (Python)
  if (existsSync(join(projectPath, 'requirements.txt')) || 
      existsSync(join(projectPath, 'pyproject.toml'))) {
    return LanguageVariant.PYTHON_FASTAPI;
  }
  
  // Check for flake.nix (Nix)
  if (existsSync(join(projectPath, 'flake.nix'))) {
    return LanguageVariant.NIX;
  }
  
  // Default based on deliverable type
  const hasWebUI = canonical.nodes?.some(n => 
    n.statement?.toLowerCase().includes('dashboard') ||
    n.statement?.toLowerCase().includes('modal') ||
    n.statement?.toLowerCase().includes('button')
  );
  
  if (hasWebUI) {
    return LanguageVariant.TYPESCRIPT_WEB;
  }
  
  return LanguageVariant.TYPESCRIPT_API;
}

/**
 * Get language lens configuration
 */
export function getLanguageLens(variant) {
  return LanguageLenses[variant] || LanguageLenses[LanguageVariant.TYPESCRIPT_WEB];
}

export default {
  LanguageVariant,
  SUPPORTED_LANGUAGES,
  LanguageLenses,
  detectLanguage,
  getLanguageLens,
};
