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
  const { iuToLang, fileStructure, constraints } = ctx.langLens;
  
  // Map each IU to language-specific constructs
  const iuMappings = ctx.ius.map(iu => {
    const domain = iu.name.toLowerCase().replace(/\s+domain$/, '').replace(/\s+/g, '-');
    const exports = iu.boundary?.exports || [];
    
    // Map exports to language functions
    const functions = exports.map(exp => {
      const pattern = iuToLang.function(exp);
      return {
        name: exp,
        signature: pattern.signature,
        asyncSignature: pattern.asyncSignature,
        isAsync: iu.risk_tier === 'high' || exp.includes('Task'),
      };
    });
    
    // Detect UI components if applicable
    const components = iuToLang.component 
      ? iuToLang.component(iu.name, exports)
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
    const funcs = iu.functions.map(f => 
      `    - ${f.isAsync ? 'async ' : ''}${f.name}(): ${f.isAsync ? 'Promise<any>' : 'any'}`
    ).join('\n');
    return `- ${iu.name} (${iu.riskTier}):\n${funcs || '    (no exports)'}`;
  }).join('\n');
  
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

**Output Files:**
- \`${join(ctx.outputDir, langTheory.deliverable.dir, langTheory.deliverable.serverFile)}\`
- \`${join(ctx.outputDir, langTheory.deliverable.dir, langTheory.deliverable.storeFile)}\`

## Your Task

1. **Read the full canonical.json** at: \`${join(ctx.projectPath, '.phoenix', 'graphs', 'canonical.json')}\`
2. **Read the language theory** at: \`${join(ctx.projectPath, '.phoenix', 'language-theory.json')}\`
3. **Generate code in ${langTheory.languageName}** in: \`${ctx.outputDir}\`

### Requirements

- Implement ALL IU functions using the mapped signatures above
- Apply ALL canonical constraints using the mapped implementations
- Follow ${langTheory.languageName} idioms and best practices
- Include traceability comments: \`// @phoenix-canon: <canon-id>\`
- Use ${langTheory.moduleSystem} module system

### Language-Specific Patterns

${Object.entries(ctx.langLens.constraints).map(([k, v]) => `- ${k}: ${v}`).join('\n')}

## Output

Generate complete, working ${langTheory.languageName} code. No TODOs for core functionality.

---
Generated: ${new Date().toISOString()}
Language Variant: ${ctx.language}
`;
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
