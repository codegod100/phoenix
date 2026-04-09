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
  PYTHON_TEXTUAL: 'python-textual',
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
      storeFile: 'routes.ts',
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
      storeFile: 'models.py',
    },
    
    constraints: {
      'input validation': 'Pydantic models',
      'type safety': 'Python 3.10+ with strict typing',
    },
  },

  [LanguageVariant.PYTHON_TEXTUAL]: {
    name: 'Python (Textual TUI)',
    extension: '.py',
    moduleSystem: 'commonjs',
    
    // Extract exports from IU name and canonical requirements
    extractExports: (iu, canonicalNodes) => {
      const exports = [];
      const domain = iu.name.toLowerCase().replace(/\s+domain$/, '');
      
      // Add main widget class based on domain name
      const widgetClass = domain.charAt(0).toUpperCase() + domain.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase()) + 'Widget';
      exports.push({
        type: 'widget',
        name: widgetClass,
        classPattern: `class ${widgetClass}(Widget)`,
        description: `Main widget for ${iu.name}`,
      });
      
      // Add data model class
      const modelClass = domain.charAt(0).toUpperCase() + domain.slice(1).replace(/-(\w)/g, (_, c) => c.toUpperCase()) + 'State';
      exports.push({
        type: 'model',
        name: modelClass,
        classPattern: `@dataclass(slots=True)\\nclass ${modelClass}`,
        description: `Data model for ${iu.name}`,
      });
      
      // Derive methods from requirements
      if (iu.source_canon_ids && canonicalNodes) {
        for (const canonId of iu.source_canon_ids) {
          const node = canonicalNodes.find(n => n.id === canonId);
          if (node && node.statement) {
            const stmt = node.statement.toLowerCase();
            
            // Extract method name from "shall" statements
            let methodName = null;
            if (stmt.includes('shall support') || stmt.includes('shall provide')) {
              const match = stmt.match(/shall\s+(?:support|provide|implement)\s+([\w\s]+?)(?:\s+via|\s+using|\s+with|$)/);
              if (match) {
                methodName = match[1].trim()
                  .replace(/\s+/g, '_')
                  .replace(/[^a-z0-9_]/g, '')
                  .substring(0, 30);
              }
            }
            
            // Specific patterns for common requirements
            if (stmt.includes('oauth') || stmt.includes('authentication')) {
              exports.push({ type: 'method', name: 'start_oauth_flow', signature: 'def start_oauth_flow(self, handle: str) -> AuthResult' });
              exports.push({ type: 'method', name: 'poll_auth_result', signature: 'def poll_auth_result(self, session_id: str) -> Optional[AuthResult]' });
            }
            if (stmt.includes('session') && (stmt.includes('cache') || stmt.includes('restore'))) {
              exports.push({ type: 'method', name: 'save_session', signature: 'def save_session(self) -> None' });
              exports.push({ type: 'method', name: 'restore_session', signature: 'def restore_session(self, path: str) -> bool' });
            }
            if (stmt.includes('format') && stmt.includes('message')) {
              exports.push({ type: 'method', name: 'format_message', signature: 'def format_message(self, sender: str, text: str) -> Text' });
              exports.push({ type: 'method', name: 'format_nick', signature: 'def format_nick(self, nick: str) -> Text' });
            }
            if (stmt.includes('display') || stmt.includes('render') || stmt.includes('show')) {
              exports.push({ type: 'method', name: 'compose', signature: 'def compose(self) -> ComposeResult' });
              exports.push({ type: 'method', name: 'render', signature: 'def render(self) -> RenderableType' });
            }
            if (stmt.includes('keyboard') || stmt.includes('shortcut') || stmt.includes('binding')) {
              exports.push({ type: 'binding', name: 'BINDINGS', signature: '[Binding(key, action, description)]' });
            }
            if (stmt.includes('reactive') || stmt.includes('state') || stmt.includes('watch')) {
              exports.push({ type: 'reactive', name: 'state', signature: 'state: reactive[StateType] = reactive(StateType())' });
            }
            
            // Add generic method if we extracted one
            if (methodName && !exports.find(e => e.name === methodName)) {
              exports.push({
                type: 'method',
                name: methodName,
                signature: `def ${methodName}(self) -> None`,
                description: node.statement.substring(0, 60),
              });
            }
          }
        }
      }
      
      return exports;
    },
    
    iuToLang: {
      function: (exportName) => ({
        signature: `def ${exportName}(self) -> None`,
        asyncSignature: `async def ${exportName}(self) -> None`,
        methodPattern: 'Instance method on Widget/App class',
      }),
      
      interface: (name, fields) => ({
        declaration: `@dataclass(slots=True)\nclass ${name}:\n${fields.map(f => `    ${f.name}: ${f.type}`).join('\n')}`,
      }),
      
      // TUI components from IU exports
      component: (iuName, exports) => ({
        widget: exports.includes('display') || exports.includes('render') || exports.includes('compose'),
        screen: exports.includes('screen') || exports.includes('push_screen'),
        reactive: exports.includes('state') || exports.includes('watch'),
        bindings: exports.filter(e => ['key', 'shortcut', 'action'].some(k => e.includes(k))),
      }),
      
      deliverable: {
        serverFramework: 'None (TUI application)',
        uiPattern: 'Textual widgets with CSS styling',
        stateManagement: 'reactive attributes on Widget classes',
      },
    },
    
    fileStructure: {
      iuDir: (domain) => `${domain.replace(/-/g, '_')}`,
      iuIndex: '__init__.py',
      deliverableDir: 'widgets',
      serverFile: 'app.py',
      storeFile: 'models.py',
    },
    
    constraints: {
      'keyboard shortcut': '@Binding(key, action, description) decorator',
      'reactive state': 'textual.reactive.reactive() decorator',
      'async event': 'async def with @on(EventType) decorator',
      'css styling': 'Textual CSS with widget IDs and classes',
      'widget compose': 'compose() method yielding child widgets',
      'dataclass model': '@dataclass(slots=True) for data classes',
      'watch_state lifecycle': 'watch_state() MUST check is_mounted before accessing child widgets: if not self.is_mounted: return',
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
  
  // Check for requirements.txt or pyproject.toml (Python) - BEFORE Rust for hybrid projects
  if (existsSync(join(projectPath, 'requirements.txt')) || 
      existsSync(join(projectPath, 'pyproject.toml'))) {
    
    // Check if it's a Textual TUI app
    try {
      const pyprojectPath = join(projectPath, 'pyproject.toml');
      const requirementsPath = join(projectPath, 'requirements.txt');
      let deps = '';
      
      if (existsSync(pyprojectPath)) {
        const content = readFileSync(pyprojectPath, 'utf8');
        deps = content;
      } else if (existsSync(requirementsPath)) {
        deps = readFileSync(requirementsPath, 'utf8');
      }
      
      // Check for Textual dependency
      if (deps.includes('textual')) {
        return LanguageVariant.PYTHON_TEXTUAL;
      }
      
      // Check for FastAPI
      if (deps.includes('fastapi')) {
        return LanguageVariant.PYTHON_FASTAPI;
      }
      
      // Check for Flask
      if (deps.includes('flask')) {
        return LanguageVariant.PYTHON_FLASK;
      }
      
    } catch {
      // Fall through to default Python
    }
    
    return LanguageVariant.PYTHON_FASTAPI;
  }
  
  // Check for Cargo.toml (Rust)
  if (existsSync(join(projectPath, 'Cargo.toml'))) {
    return LanguageVariant.RUST_AXUM;
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
