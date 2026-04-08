#!/usr/bin/env node
/**
 * Phoenix Auto-Implement — LLM-powered intelligent implementation
 * 
 * Uses AI to generate correct TypeScript implementations from:
 * - Canonical requirements (from code comments)
 * - TypeScript interfaces (parsed AST)
 * - Test expectations (from test files)
 * - Function signatures (params, return types)
 * 
 * Environment:
 *   ANTHROPIC_API_KEY or OPENAI_API_KEY - LLM API access
 *   PHOENIX_LLM_PROVIDER - 'anthropic' (default) or 'openai'
 *   PHOENIX_LLM_MODEL - Model name (default: claude-3-5-sonnet-20241022)
 * 
 * Usage:
 *   node auto-implement.js <project-root> [--iu <iu-id>] [--dry-run]
 */

import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { existsSync } from 'fs';

// ======== CONFIGURATION ========
const CONFIG = {
  provider: process.env.PHOENIX_LLM_PROVIDER || 'anthropic',
  model: process.env.PHOENIX_LLM_MODEL || 'claude-3-5-sonnet-20241022',
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.OPENAI_API_KEY,
  maxTokens: 4096,
  temperature: 0.2, // Low temp for deterministic code
};

// ======== TYPE PARSING ========

/**
 * Extract TypeScript interface definitions from code
 */
function extractInterfaces(code) {
  const interfaces = {};
  
  // Match interface definitions
  const interfaceRegex = /export interface (\w+) \{([^}]+)\}/g;
  let match;
  
  while ((match = interfaceRegex.exec(code)) !== null) {
    const [_, name, body] = match;
    const fields = {};
    
    // Parse fields
    const fieldRegex = /(\w+)(\??):\s*([^;]+)/g;
    let fieldMatch;
    while ((fieldMatch = fieldRegex.exec(body)) !== null) {
      fields[fieldMatch[1]] = {
        optional: !!fieldMatch[2],
        type: fieldMatch[3].trim()
      };
    }
    
    interfaces[name] = fields;
  }
  
  return interfaces;
}

/**
 * Extract canonical requirements from code comments
 */
function extractRequirements(code) {
  const requirements = [];
  const lines = code.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const canonMatch = lines[i].match(/@phoenix-canon:\s*([a-f0-9]+)\.\.\./);
    if (canonMatch) {
      const canonId = canonMatch[1];
      // Look for REQUIREMENT on next line(s)
      for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
        const reqMatch = lines[j].match(/REQUIREMENT:\s*(.+)/);
        if (reqMatch) {
          requirements.push({
            canonId,
            statement: reqMatch[1].trim()
          });
          break;
        }
      }
    }
  }
  
  return requirements;
}

/**
 * Extract function info with full context
 */
function extractFunctions(code) {
  const functions = [];
  const funcRegex = /export function (\w+)\s*\(([^)]*)\)\s*:\s*([^{]+)\{/g;
  
  let match;
  while ((match = funcRegex.exec(code)) !== null) {
    const name = match[1];
    const params = match[2].trim();
    const returnType = match[3].trim();
    
    // Find the complete function body (brace matching)
    let braceCount = 1;
    let endIdx = match.index + match[0].length;
    while (braceCount > 0 && endIdx < code.length) {
      if (code[endIdx] === '{') braceCount++;
      else if (code[endIdx] === '}') braceCount--;
      endIdx++;
    }
    
    const fullBody = code.substring(match.index, endIdx);
    const bodyOnly = code.substring(match.index + match[0].length, endIdx - 1);
    
    // Find associated requirements (look backwards)
    const beforeFunc = code.substring(0, match.index);
    const reqMatch = beforeFunc.match(/REQUIREMENT:\s*([^\n]+)(?!.*export function)/s);
    
    functions.push({
      name,
      params,
      returnType,
      body: bodyOnly.trim(),
      fullBody,
      startIdx: match.index,
      endIdx,
      associatedRequirement: reqMatch ? reqMatch[1] : null
    });
  }
  
  return functions;
}

/**
 * Parse test file to understand expected behavior
 */
function parseTests(testCode) {
  const tests = [];
  
  // Extract test descriptions and assertions
  const testRegex = /it\(['"`]([^'"`]+)['"`],\s*(?:async\s*)?\(\)\s*=>\s*\{([^}]+(?:\{[^}]*\}[^}]*)*)\}\s*\)/g;
  
  let match;
  while ((match = testRegex.exec(testCode)) !== null) {
    const description = match[1];
    const body = match[2];
    
    // Extract assertions
    const assertions = [];
    const expectRegex = /expect\(([^)]+)\)\.([^;]+)/g;
    let expectMatch;
    while ((expectMatch = expectRegex.exec(body)) !== null) {
      assertions.push({
        target: expectMatch[1].trim(),
        assertion: expectMatch[2].trim()
      });
    }
    
    tests.push({ description, body, assertions });
  }
  
  return tests;
}

// ======== LLM INTEGRATION ========

/**
 * Build comprehensive prompt for LLM
 */
function buildPrompt(iuInfo) {
  const { name, interfaces, requirements, functions, tests } = iuInfo;
  
  return `You are a TypeScript implementation expert. Generate correct implementations for the following Phoenix Implementation Unit.

## Implementation Unit: ${name}

### TYPE DEFINITIONS
${Object.entries(interfaces).map(([name, fields]) => {
  const fieldStr = Object.entries(fields).map(([f, info]) => 
    `  ${f}${info.optional ? '?' : ''}: ${info.type};`
  ).join('\n');
  return `interface ${name} {\n${fieldStr}\n}`;
}).join('\n\n')}

### REQUIREMENTS (MUST IMPLEMENT THESE)
${requirements.map((r, i) => `${i + 1}. [${r.canonId.slice(0, 8)}...] ${r.statement}`).join('\n')}

### FUNCTIONS TO IMPLEMENT
${functions.map(f => {
  return `Function: ${f.name}(${f.params}): ${f.returnType}
Current (broken) implementation:
\`\`\`typescript
${f.body}
\`\`\`
${f.associatedRequirement ? `Associated requirement: ${f.associatedRequirement}` : ''}`;
}).join('\n\n')}

### TEST EXPECTATIONS
${tests.map((t, i) => `Test ${i + 1}: ${t.description}
Assertions: ${t.assertions.map(a => `expect(${a.target}).${a.assertion}`).join(', ')}`).join('\n')}

### INSTRUCTIONS
1. Generate COMPLETE, CORRECT TypeScript implementations
2. Functions MUST satisfy the REQUIREMENTS above
3. Functions MUST pass the TEST EXPECTATIONS
4. Use ONLY the fields defined in the interfaces (don't add new ones)
5. Return types must match exactly (e.g., if return type is Task[], return an array)
6. Handle edge cases (null, undefined, empty inputs)
7. Use proper TypeScript syntax

### OUTPUT FORMAT
Return ONLY the function implementations, one per code block:

\`\`\`typescript:FUNCTION_NAME
export function FUNCTION_NAME(params): ReturnType {
  // implementation
}
\`\`\`

Replace FUNCTION_NAME with actual function names.`;
}

/**
 * Call LLM API to generate implementations
 */
async function callLLM(prompt) {
  if (!CONFIG.apiKey) {
    throw new Error('No API key set. Set ANTHROPIC_API_KEY or OPENAI_API_KEY');
  }
  
  if (CONFIG.provider === 'anthropic') {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Api-Key': CONFIG.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: CONFIG.model,
        max_tokens: CONFIG.maxTokens,
        temperature: CONFIG.temperature,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });
    
    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Anthropic API error: ${error}`);
    }
    
    const data = await response.json();
    return data.content[0].text;
  } else {
    throw new Error(`Provider ${CONFIG.provider} not yet implemented`);
  }
}

/**
 * Parse LLM response into function implementations
 */
function parseLLMResponse(response) {
  const implementations = {};
  
  // Extract code blocks labeled with function names
  const codeBlockRegex = /\`\`\`typescript:(\w+)\n([\s\S]*?)\`\`\`/g;
  
  let match;
  while ((match = codeBlockRegex.exec(response)) !== null) {
    const funcName = match[1];
    const code = match[2].trim();
    implementations[funcName] = code;
  }
  
  // Also try without labels
  if (Object.keys(implementations).length === 0) {
    const genericRegex = /\`\`\`typescript\n([\s\S]*?)\`\`\`/g;
    let genericMatch;
    let idx = 0;
    while ((genericMatch = genericRegex.exec(response)) !== null) {
      implementations[`func_${idx}`] = genericMatch[1].trim();
      idx++;
    }
  }
  
  return implementations;
}

// ======== MAIN LOGIC ========

/**
 * Auto-implement a single IU using LLM
 */
async function autoImplementIU(projectRoot, iuId, dryRun = false) {
  const manifestPath = join(projectRoot, '.phoenix', 'manifests', 'generated_manifest.json');
  
  if (!existsSync(manifestPath)) {
    console.error('❌ No manifest found. Run regen first.');
    return false;
  }
  
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  
  // Find implementation file
  let implPath = null;
  let testPath = null;
  let iuInfo = null;
  
  for (const [filePath, info] of Object.entries(manifest.files || {})) {
    if (info && info.iu_id &&
        (info.iu_id === iuId || info.iu_id.startsWith(iuId) || filePath.includes(iuId))) {
      if (filePath.includes('__tests__')) {
        testPath = join(projectRoot, filePath);
      } else {
        implPath = join(projectRoot, filePath);
        iuInfo = info;
      }
    }
  }
  
  if (!implPath) {
    console.error(`❌ IU ${iuId} not found`);
    return false;
  }
  
  console.log(`🤖 Auto-implementing: ${iuInfo.iu_id.slice(0, 16)}...`);
  console.log(`   File: ${implPath}`);
  
  // Read implementation
  const code = readFileSync(implPath, 'utf-8');
  
  // Check if already implemented
  if (!dryRun && (code.includes('🟢 GREEN:') || code.includes('🟢 AUTO-IMPLEMENTED'))) {
    console.log(`   ⏭️  Already implemented`);
    return true;
  }
  
  // Parse context
  const interfaces = extractInterfaces(code);
  const requirements = extractRequirements(code);
  const functions = extractFunctions(code);
  
  // Read and parse tests
  let tests = [];
  if (testPath && existsSync(testPath)) {
    const testCode = readFileSync(testPath, 'utf-8');
    tests = parseTests(testCode);
  }
  
  console.log(`   Interfaces: ${Object.keys(interfaces).join(', ') || 'none'}`);
  console.log(`   Requirements: ${requirements.length}`);
  console.log(`   Functions: ${functions.map(f => f.name).join(', ')}`);
  console.log(`   Tests: ${tests.length}`);
  
  if (functions.length === 0) {
    console.log(`   ⏭️  No functions to implement`);
    return true;
  }
  
  // Build prompt
  const prompt = buildPrompt({
    name: iuInfo.iu_id.slice(0, 16),
    interfaces,
    requirements,
    functions,
    tests
  });
  
  if (dryRun) {
    console.log('\n--- PROMPT (dry run) ---\n');
    console.log(prompt);
    console.log('\n--- END PROMPT ---\n');
    return true;
  }
  
  // Check for API key
  if (!CONFIG.apiKey) {
    console.error('❌ No LLM API key set');
    console.error('   Set ANTHROPIC_API_KEY or OPENAI_API_KEY environment variable');
    console.error('   Or use --dry-run to see the prompt');
    return false;
  }
  
  // Call LLM
  console.log(`   🧠 Calling ${CONFIG.provider}...`);
  try {
    const response = await callLLM(prompt);
    const implementations = parseLLMResponse(response);
    
    console.log(`   📥 Received ${Object.keys(implementations).length} implementations`);
    
    // Replace functions in code
    let newCode = code;
    
    for (const func of functions.reverse()) { // Reverse to maintain indices
      const impl = implementations[func.name] || implementations[`func_${functions.indexOf(func)}`];
      
      if (impl) {
        newCode = newCode.substring(0, func.startIdx) + 
                  impl + 
                  newCode.substring(func.endIdx);
        console.log(`   🟢 Replaced: ${func.name}`);
      } else {
        console.log(`   ⚠️  No implementation for: ${func.name}`);
      }
    }
    
    // Update header
    newCode = newCode.replace(/\/\/ 🔴 RED:/, '// 🟢 AUTO-IMPLEMENTED:');
    newCode = newCode.replace(/Tests are designed to FAIL/, 'LLM-generated — verify with tests');
    
    // Write
    writeFileSync(implPath, newCode, 'utf-8');
    console.log(`   ✅ Written: ${implPath}`);
    
    return true;
  } catch (err) {
    console.error(`   ❌ LLM error: ${err.message}`);
    return false;
  }
}

// ======== CLI ========

async function main() {
  const args = process.argv.slice(2);
  const projectRoot = args[0] || '.';
  
  const iuIndex = args.indexOf('--iu');
  const iuFilter = iuIndex !== -1 ? args[iuIndex + 1] : null;
  const dryRun = args.includes('--dry-run');
  
  console.log('🚀 Phoenix Auto-Implement (LLM-powered)');
  console.log(`   Project: ${projectRoot}`);
  console.log(`   Provider: ${CONFIG.provider}`);
  console.log(`   Model: ${CONFIG.model}`);
  console.log(`   API Key: ${CONFIG.apiKey ? '✓ set' : '✗ not set'}`);
  
  if (dryRun) {
    console.log('   Mode: DRY RUN (show prompts only)');
  }
  
  if (iuFilter) {
    const success = await autoImplementIU(projectRoot, iuFilter, dryRun);
    process.exit(success ? 0 : 1);
  } else {
    console.log('   Mode: All IUs');
    
    const manifestPath = join(projectRoot, '.phoenix', 'manifests', 'generated_manifest.json');
    if (!existsSync(manifestPath)) {
      console.error('❌ No manifest found');
      process.exit(1);
    }
    
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const iuIds = new Set();
    
    for (const [filePath, info] of Object.entries(manifest.files || {})) {
      if (!filePath.includes('__tests__') && info && info.iu_id) {
        iuIds.add(info.iu_id);
      }
    }
    
    let success = 0;
    let failed = 0;
    
    for (const iuId of iuIds) {
      const ok = await autoImplementIU(projectRoot, iuId, dryRun);
      if (ok) success++;
      else failed++;
      console.log(''); // Spacing
    }
    
    console.log(`📊 Summary: ${success} implemented, ${failed} failed`);
    process.exit(failed > 0 ? 1 : 0);
  }
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
