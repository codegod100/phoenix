#!/usr/bin/env node
/**
 * Phoenix Code Generator
 * 
 * Language-aware orchestrator with theory morphisms.
 * 
 * 1. Detects implementation language from project context
 * 2. Selects appropriate ThIU → ThLang lens
 * 3. Generates language-specific instruction for agent
 * 
 * Usage: node codegen.js <project-path>
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

async function main() {
  const projectPath = process.argv[2] || '.';
  
  console.log(`🚀 Phoenix Code Generator`);
  console.log(`   Project: ${projectPath}`);
  
  const ctx = await loadContext(projectPath);
  
  // STEP 1: Detect language from context
  const { detectLanguage, getLanguageLens, SUPPORTED_LANGUAGES } = await import('./language-registry.js');
  const { existsSync, readFileSync } = await import('fs');
  ctx.language = detectLanguage(projectPath, ctx.canonical, ctx.ius, { existsSync, readFileSync });
  ctx.langLens = getLanguageLens(ctx.language);
  
  console.log(`   Language: ${ctx.langLens.name} (${ctx.language})`);
  console.log(`   Type: ${ctx.type}`);
  console.log(`   IUs: ${ctx.ius.length} domains`);
  console.log(`   Canonical nodes: ${ctx.canonical.nodes?.length || 0}`);
  console.log();
  
  // Validate language support
  if (!SUPPORTED_LANGUAGES.includes(ctx.language)) {
    console.warn(`⚠️  Language "${ctx.language}" not in supported variants`);
    console.warn(`   Supported: ${SUPPORTED_LANGUAGES.join(', ')}`);
  }
  
  // STEP 2: Apply theory morphism (ThIU → ThLang)
  const langTheory = applyTheoryMorphism(ctx);
  
  // STEP 3: Generate language-specific instruction
  const instruction = generateLanguageInstruction(ctx, langTheory);
  
  // Write instruction
  const instructionPath = join(projectPath, '.phoenix', 'codegen-instruction.md');
  writeFileSync(instructionPath, instruction);
  
  // Also write language theory for reference
  const theoryPath = join(projectPath, '.phoenix', 'language-theory.json');
  writeFileSync(theoryPath, JSON.stringify(langTheory, null, 2));
  
  console.log(`📝 Codegen instruction written to:`);
  console.log(`   ${instructionPath}`);
  console.log(`📐 Language theory written to:`);
  console.log(`   ${theoryPath}`);
  console.log();
  console.log(`📋 INSTRUCTION SUMMARY:`);
  console.log(`   - Language: ${ctx.langLens.name}`);
  console.log(`   - File extension: ${ctx.langLens.extension}`);
  console.log(`   - Module system: ${ctx.langLens.moduleSystem}`);
  console.log(`   - IU count: ${langTheory.iuMappings.length}`);
  console.log(`   - Deliverable pattern: ${ctx.langLens.iuToLang.deliverable.uiPattern}`);
  console.log();
  console.log(`👉 Next: Run agent with this instruction to generate code.`);
}

async function loadContext(projectPath) {
  const graphsDir = join(projectPath, '.phoenix', 'graphs');
  const iusData = JSON.parse(readFileSync(join(graphsDir, 'ius.json'), 'utf8'));
  const canonicalData = JSON.parse(readFileSync(join(graphsDir, 'canonical.json'), 'utf8'));
  
  return {
    type: inferDeliverableType(canonicalData),
    projectPath,
    outputDir: join(projectPath, 'src', 'generated'),
    ius: iusData.ius || [],
    canonical: canonicalData,
    language: null,
    langLens: null,
  };
}

function inferDeliverableType(canonical) {
  const hasWeb = canonical.nodes?.some(n => 
    n.statement?.toLowerCase().includes('dashboard') ||
    n.statement?.toLowerCase().includes('modal') ||
    n.statement?.toLowerCase().includes('button')
  );
  if (hasWeb) return 'web-dashboard';
  return 'api';
}

/**
 * Apply theory morphism: ThIU → ThLang
 * Maps IU constructs to language-specific patterns
 */
function applyTheoryMorphism(ctx) {
  const { iuToLang, fileStructure, constraints, extractExports } = ctx.langLens;
  
  // Map each IU to language-specific constructs
  const iuMappings = ctx.ius.map(iu => {
    const domain = iu.name.toLowerCase().replace(/\s+domain$/, '').replace(/\s+/g, '-');
    
    // Try to extract exports from language-specific logic, fall back to boundary.exports
    let exports = [];
    if (extractExports) {
      exports = extractExports(iu, ctx.canonical.nodes);
    } else {
      // Legacy: use boundary.exports
      exports = (iu.boundary?.exports || []).map(name => ({ type: 'function', name }));
    }
    
    // Map exports to language functions
    const functions = exports.filter(e => e.type === 'function' || e.type === 'method').map(exp => {
      if (exp.signature) {
        return {
          name: exp.name,
          signature: exp.signature,
          asyncSignature: exp.signature.replace('def ', 'async def '),
          isAsync: exp.name.includes('async') || exp.name.includes('poll') || exp.name.includes('start'),
          description: exp.description || '',
        };
      }
      const pattern = iuToLang.function(exp.name);
      return {
        name: exp.name,
        signature: pattern.signature,
        asyncSignature: pattern.asyncSignature,
        isAsync: iu.risk_tier === 'high' || exp.name.includes('Task'),
        description: exp.description || '',
      };
    });
    
    // Map class exports (widgets, models, etc.)
    const classes = exports.filter(e => e.type === 'widget' || e.type === 'model' || e.type === 'class').map(exp => ({
      name: exp.name,
      type: exp.type,
      pattern: exp.classPattern || `class ${exp.name}`,
      description: exp.description || '',
    }));
    
    // Map reactive exports
    const reactiveExports = exports.filter(e => e.type === 'reactive' || e.type === 'binding').map(exp => ({
      name: exp.name,
      type: exp.type,
      pattern: exp.signature || exp.pattern,
      description: exp.description || '',
    }));
    
    // Detect UI components if applicable
    const components = iuToLang.component 
      ? iuToLang.component(iu.name, exports.map(e => e.name))
      : null;
    
    return {
      id: iu.id,
      name: iu.name,
      domain,
      riskTier: iu.risk_tier,
      files: {
        dir: fileStructure.iuDir(domain),
        index: fileStructure.iuIndex,
        test: fileStructure.iuTest,
      },
      functions,
      classes,
      reactiveExports,
      components,
      canonIds: iu.source_canon_ids || [],
    };
  });
  
  // Map canonical constraints to language patterns
  const constraintMappings = ctx.canonical.nodes
    ?.filter(n => n.type === 'CONSTRAINT')
    .map(n => {
      const text = n.statement.toLowerCase();
      const matches = Object.entries(constraints).find(([key, _]) => 
        text.includes(key.toLowerCase())
      );
      
      return {
        canonId: n.id,
        statement: n.statement,
        matchedPattern: matches ? matches[0] : null,
        implementation: matches ? matches[1] : 'manual review needed',
      };
    }) || [];
  
  return {
    language: ctx.language,
    languageName: ctx.langLens.name,
    extension: ctx.langLens.extension,
    moduleSystem: ctx.langLens.moduleSystem,
    iuMappings,
    constraintMappings,
    deliverable: {
      dir: ctx.langLens.fileStructure.deliverableDir,
      serverFile: ctx.langLens.fileStructure.serverFile,
      storeFile: ctx.langLens.fileStructure.storeFile,
      patterns: ctx.langLens.iuToLang.deliverable,
    },
  };
}

/**
 * Generate language-specific instruction for agent
 */
function generateLanguageInstruction(ctx, langTheory) {
  const iuSummary = langTheory.iuMappings.map(iu => {
    let lines = [];
    lines.push(`- ${iu.name} (${iu.riskTier}):`);
    
    // Classes (widgets, models)
    if (iu.classes && iu.classes.length > 0) {
      lines.push('  Classes:');
      for (const cls of iu.classes) {
        lines.push(`    - ${cls.type.toUpperCase()}: ${cls.name}`);
        if (cls.description) lines.push(`      (${cls.description})`);
      }
    }
    
    // Functions/methods
    if (iu.functions && iu.functions.length > 0) {
      lines.push('  Functions:');
      for (const f of iu.functions) {
        const sig = f.isAsync && f.asyncSignature ? f.asyncSignature : f.signature;
        lines.push(`    - ${sig}`);
        if (f.description) lines.push(`      # ${f.description}`);
      }
    }
    
    // Reactive exports
    if (iu.reactiveExports && iu.reactiveExports.length > 0) {
      lines.push('  Reactive:');
      for (const r of iu.reactiveExports) {
        lines.push(`    - ${r.type.toUpperCase()}: ${r.name}`);
      }
    }
    
    if (!iu.classes?.length && !iu.functions?.length && !iu.reactiveExports?.length) {
      lines.push('    (no exports derived from requirements)');
    }
    
    return lines.join('\n');
  }).join('\n\n');
  
  const constraintSummary = langTheory.constraintMappings.map(c => 
    `- ${c.matchedPattern || 'UNMATCHED'}: "${c.statement.slice(0, 50)}..." → ${c.implementation}`
  ).join('\n') || '(no constraints matched)';
  
  return `# Phoenix Code Generation Instruction

## Language Context

**Detected Language:** ${langTheory.languageName}  
**Module System:** ${langTheory.moduleSystem}  
**File Extension:** ${langTheory.extension}

## Theory Mapping (ThIU → Th${langTheory.languageName.replace(/[^a-zA-Z]/g, '')})

This instruction includes a theory morphism that maps Implementation Units to ${langTheory.languageName} constructs.

### IU → Language Function Mapping

${iuSummary}

### Constraint → Implementation Mapping

${constraintSummary}

## Deliverable Structure

**Server Framework:** ${langTheory.deliverable.patterns.serverFramework}  
**UI Pattern:** ${langTheory.deliverable.patterns.uiPattern}  
**State Management:** ${langTheory.deliverable.patterns.stateManagement}

**Output Structure:**
\`\`\`
src/generated/
├── __init__.py                    # Module exports
├── models.py                      # Data classes (@dataclass(slots=True))
├── app.py                         # Main Textual App with @Binding keyboard shortcuts
└── widgets/                       # Textual widget modules
    ├── __init__.py
    ├── sidebar.py                 # BufferSidebar widget
    ├── message_list.py            # MessageList widget
    ├── message_item.py            # MessageItem widget
    ├── thread_panel.py            # ThreadPanel widget
    ├── user_list.py               # UserList widget
    ├── input_bar.py               # InputBar widget
    ├── emoji_picker.py            # EmojiPicker widget
    ├── debug_panel.py             # DebugPanel widget
    ├── loading_overlay.py         # LoadingOverlay widget
    └── context_menu.py            # ContextMenu widget
\`\`\`

**File Responsibilities:**
- \`models.py\`: All @dataclass(slots=True) data models for 34 IUs
- \`app.py\`: Main FreeQApp class with compose(), keyboard @Binding, reactive state
- \`widgets/*.py\`: Individual Textual widgets with compose(), CSS, event handlers

## Your Task

Generate a complete Textual TUI application by implementing all 34 IUs from the theory mapping above.

### Step 1: Data Models (${langTheory.iuMappings.length} IUs)
Create \`src/generated/models.py\` with all data classes:
- For each IU, create a @dataclass(slots=True) model
- Include fields derived from the "Classes" section above
- Include traceability: \`# @phoenix-canon: <iu-id>\`

### Step 2: Widget Classes
Create widget files in \`src/generated/widgets/\`:
- Each widget is a Textual \`Widget\` subclass
- Implement \`compose()\` method yielding child widgets
- Add CSS styling with \`DEFAULT_CSS\`
- Implement methods from "Functions" section above
- Add reactive state with \`textual.reactive.reactive()\`
- Add keyboard bindings with \`@Binding\` decorator
- **CRITICAL:** Any \`watch_state()\` method must start with:
  \`\`\`python
  def watch_state(self, state):
      if not self.is_mounted:
          return
      # ... rest of method
  \`\`\`

### Step 3: Main App
Create \`src/generated/app.py\`:
- Main \`FreeQApp(App)\` class
- \`compose()\` method mounting all widgets
- Global keyboard shortcuts (Ctrl+C, Ctrl+L, etc.)
- Event handling with \`@on(EventType)\` decorators
- Connect to domain logic in models

### Traceability Requirements
- Every class must have: \`# @phoenix-canon: <iu-id>\`
- Every method must have: \`# @phoenix-canon: <canon-node-id>\`
- Include IU name in docstrings

### Logging & Tracing Requirements (AUTO-INJECTED)

**Every method must include automatic logging for traceability:**

1. **Method Entry Logging:**
   - First line of every method (after traceability comment) must log entry
   - Use structured prefix based on domain: \`[AUTH]\`, \`[UI]\`, \`[BROKER]\`, \`[MOUNT]\`, etc.
   - Include key parameter values (not sensitive data like full tokens)
   
   Example:
   \`\`\`python
   def on_auth_screen_auth_completed(self, event: AuthCompleted) -> None:
       # @phoenix-canon: node-2c760e46
       logger.info(f"[AUTH] AuthCompleted received for handle={event.handle}")
       # ... method implementation
   \`\`\`

2. **State Transition Logging:**
   - Log all critical state changes (authenticated=True/False, connected/disconnected)
   - Use format: \`logger.info(f"[DOMAIN] State changed: {old} -> {new}")\`
   
   Example:
   \`\`\`python
   self.app_state.session.authenticated = True
   logger.info(f"[AUTH] Session authenticated: handle={event.handle}")
   \`\`\`

3. **Lifecycle Event Logging:**
   - \`on_mount()\`: Log "[MOUNT] Starting {widget/app} initialization"
   - \`compose()\`: Log "[UI] Composing {widget} layout"
   - \`watch_*()\`: Log "[REACTIVE] {property} changed from {old} to {new}"
   - Event handlers: Log "[EVENT] {EventType} received"

4. **Auto-Login Specific Logging (CRITICAL):**
   - \`[AUTH-MOUNT] Starting on_mount, checking for saved credentials...\`
   - \`[AUTH-MOUNT] load_saved_credentials returned: {True|False}\`
   - \`[AUTH-MOUNT] Saved credentials found, attempting auto-login\`
   - \`[AUTH-MOUNT] Session set: handle={h}, auth={auth}\`
   - \`[AUTH-MOUNT] Auto-login complete, main UI should be visible\`
   - \`[AUTH-MOUNT] No saved credentials found OR load failed, showing AuthScreen\`

5. **Error & Warning Logging:**
   - All error paths must log with \`logger.error()\` or \`logger.warning()\`
   - Include exception details: \`logger.error(f"[DOMAIN] Operation failed: {e}")\`

6. **Success Logging:**
   - Key operations should log success: \`logger.info("[DOMAIN] Operation completed successfully")\`
   - Credential save: \`logger.info("[AUTH] Credentials saved for auto-login")\`
   - File operations: \`logger.info("[IO] File saved: {path}")\`

**Log Prefix Standards:**
- \`[AUTH]\` - Authentication flow (login, tokens, sessions)
- \`[AUTH-MOUNT]\` - Auth specifically in on_mount() auto-login
- \`[UI]\` - UI rendering, widget composition
- \`[MOUNT]\` - Widget/app lifecycle (on_mount, on_unmount)
- \`[REACTIVE]\` - Reactive state changes (watch_* methods)
- \`[EVENT]\` - Event handling
- \`[BROKER]\` - Broker communication
- \`[IO]\` - File/network operations
- \`[STATE]\` - App state changes
- \`[ERROR]\` - Error conditions (use logger.error)

### Language Patterns to Apply
${Object.entries(ctx.langLens.constraints).map(([k, v]) => `- **${k}**: ${v}`).join('\n')}

### Reference Files
- Canonical requirements: \`${join(ctx.projectPath, '.phoenix', 'graphs', 'canonical.json')}\`
- Language theory: \`${join(ctx.projectPath, '.phoenix', 'language-theory.json')}\`
- Output directory: \`${ctx.outputDir}\`

## Success Criteria

- [ ] All 34 IUs have corresponding code
- [ ] All functions from theory mapping are implemented
- [ ] Textual app can be imported without errors
- [ ] Traceability comments present on all major elements
- [ ] No circular imports
- [ ] Follows Textual best practices (reactive state, compose, CSS)

---
Generated: ${new Date().toISOString()}
Language Variant: ${ctx.language}
`;
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
