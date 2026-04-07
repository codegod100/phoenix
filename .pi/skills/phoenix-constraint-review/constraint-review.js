#!/usr/bin/env node
/**
 * Phoenix Constraint Review - Review specifications for missing constraints
 * 
 * Checks specs for:
 * - Missing error handling
 * - Vague terms ("appropriate", "reasonable")
 * - Missing input validation
 * - Unclear boundaries
 * - Anti-patterns like "should" instead of "shall"
 * 
 * Usage: node .pi/skills/phoenix-constraint-review/constraint-review.js [project-root]
 */

import { readFileSync, readdirSync } from 'fs';
import { resolve, join } from 'path';

// === CHECK RULES ===

const RULES = [
  {
    id: 'vague-should',
    name: 'Vague Requirement (should)',
    pattern: /\bshould\b/i,
    severity: 'warning',
    message: 'Use "shall" or "must" for requirements, not "should"',
    fix: 'Replace "should" with "shall" or "must"',
  },
  {
    id: 'vague-terms',
    name: 'Vague Term',
    pattern: /\b(appropriate|reasonable|sufficient|adequate|as needed|as required)\b/i,
    severity: 'warning',
    message: 'Vague term found - be specific with numbers or criteria',
    fix: 'Replace with specific value or measurable criteria',
  },
  {
    id: 'missing-validation',
    name: 'Missing Input Validation',
    pattern: /REQUIREMENT:.*(?:accept|receive|input|take).*\b(?:string|text|input|value)\b(?!.*(?:valid|validate|check|verify|reject|error))/i,
    severity: 'warning',
    message: 'Input requirement without validation - may need constraint',
    fix: 'Add CONSTRAINT for input validation rules',
  },
  {
    id: 'missing-error-handling',
    name: 'Missing Error Handling',
    pattern: /REQUIREMENT:.*(?:create|update|delete|modify|process|save)(?!.*(?:error|fail|invalid|reject|exception|handle))/i,
    severity: 'info',
    message: 'Operation without specified error handling',
    fix: 'Add CONSTRAINT for error cases',
  },
  {
    id: 'missing-limits',
    name: 'Missing Limits',
    pattern: /REQUIREMENT:.*(?:list|display|show|return|fetch).*(?:items?|records?|results?|tasks?|users?)(?!.*(?:max|maximum|limit|up to|at most))/i,
    severity: 'warning',
    message: 'Collection requirement without size limits',
    fix: 'Add CONSTRAINT: Maximum N items per request',
  },
  {
    id: 'unclear-boundary',
    name: 'Unclear Boundary',
    pattern: /REQUIREMENT:.*(?:access|call|use|depend).*\b(?:database|api|service|system|module|component)\b(?!.*(?:allowed|forbidden|permitted|restricted))/i,
    severity: 'info',
    message: 'External dependency without boundary constraint',
    fix: 'Add CONSTRAINT: Allowed/forbidden dependencies',
  },
];

// === SPEC LOADING ===

function loadSpecFiles(projectRoot) {
  const specDir = join(projectRoot, 'spec');
  if (!existsSync(specDir)) {
    return [];
  }
  
  const files = [];
  const entries = readdirSync(specDir, { withFileTypes: true });
  
  for (const entry of entries) {
    if (entry.isFile() && entry.name.endsWith('.md')) {
      const path = join(specDir, entry.name);
      const content = readFileSync(path, 'utf-8');
      files.push({ name: entry.name, path, content });
    }
  }
  
  return files;
}

function existsSync(path) {
  try {
    readFileSync(path);
    return true;
  } catch {
    return false;
  }
}

// === ANALYSIS ===

function analyzeSpec(file) {
  const findings = [];
  const lines = file.content.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    // Skip code blocks and comments
    if (line.trim().startsWith('```')) continue;
    if (line.trim().startsWith('<!--')) continue;
    
    // Check each rule
    for (const rule of RULES) {
      if (rule.pattern.test(line)) {
        findings.push({
          rule: rule.id,
          severity: rule.severity,
          line: lineNum,
          text: line.trim().slice(0, 80),
          message: rule.message,
          fix: rule.fix,
        });
      }
    }
  }
  
  // Additional checks
  
  // Check for IU references (anti-pattern)
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    if (/IU-\d+/i.test(line) && !line.includes('<!--')) {
      findings.push({
        rule: 'iu-reference',
        severity: 'error',
        line: lineNum,
        text: line.trim().slice(0, 80),
        message: 'Spec references Implementation Unit (IU) - creates circular dependency',
        fix: 'Use feature/behavior names instead of IU references',
      });
    }
  }
  
  // Check for forward references to planned artifacts
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;
    
    if (/\b(the\s+)?\w+\s+IU\b/i.test(line) && !line.includes('<!--')) {
      findings.push({
        rule: 'iu-pattern',
        severity: 'warning',
        line: lineNum,
        text: line.trim().slice(0, 80),
        message: 'Possible IU pattern detected',
        fix: 'Verify this does not reference a specific IU',
      });
    }
  }
  
  return findings;
}

function calculateStats(files, allFindings) {
  const totalLines = files.reduce((sum, f) => sum + f.content.split('\n').length, 0);
  const totalRequirements = files.reduce((sum, f) => {
    const matches = f.content.match(/REQUIREMENT:/g);
    return sum + (matches ? matches.length : 0);
  }, 0);
  const totalConstraints = files.reduce((sum, f) => {
    const matches = f.content.match(/CONSTRAINT:/g);
    return sum + (matches ? matches.length : 0);
  }, 0);
  
  const bySeverity = { error: 0, warning: 0, info: 0 };
  for (const finding of allFindings) {
    bySeverity[finding.severity]++;
  }
  
  return {
    totalLines,
    totalRequirements,
    totalConstraints,
    totalFindings: allFindings.length,
    bySeverity,
  };
}

// === FORMATTING ===

function formatReport(files, findings) {
  const lines = [];
  
  lines.push('╔══════════════════════════════════════════════════════════════╗');
  lines.push('║  Phoenix Constraint Review                                     ║');
  lines.push('╚══════════════════════════════════════════════════════════════╝');
  lines.push('');
  
  // Stats
  const stats = calculateStats(files, findings);
  
  lines.push('📊 Statistics:');
  lines.push(`   Files analyzed: ${files.length}`);
  lines.push(`   Total lines: ${stats.totalLines}`);
  lines.push(`   Requirements: ${stats.totalRequirements}`);
  lines.push(`   Constraints: ${stats.totalConstraints}`);
  lines.push(`   Findings: ${stats.totalFindings}`);
  lines.push(`      Errors: ${stats.bySeverity.error}`);
  lines.push(`      Warnings: ${stats.bySeverity.warning}`);
  lines.push(`      Info: ${stats.bySeverity.info}`);
  lines.push('');
  
  // Findings by file
  for (const file of files) {
    const fileFindings = findings.filter(f => 
      findings.find(ff => ff.file === file.name) || 
      findings.filter(ff => file.content.includes(ff.text))
    );
    
    // Actually, we need to track file per finding
    const thisFileFindings = findings.filter(f => {
      // Check if this finding belongs to this file
      // We need to pass file info during analysis
      return true; // Will be filtered properly below
    });
  }
  
  // Group findings by file (reconstruct from analysis)
  const findingsByFile = new Map();
  for (const file of files) {
    const fileFindings = analyzeSpec(file);
    if (fileFindings.length > 0) {
      findingsByFile.set(file.name, fileFindings);
    }
  }
  
  if (findingsByFile.size === 0) {
    lines.push('✅ All specs clean - no issues found');
  } else {
    lines.push('🔍 Findings:');
    lines.push('');
    
    for (const [fileName, fileFindings] of findingsByFile) {
      lines.push(`📄 ${fileName}`);
      
      for (const finding of fileFindings) {
        const icon = finding.severity === 'error' ? '❌' :
                     finding.severity === 'warning' ? '⚠️' : 'ℹ️';
        lines.push(`   ${icon} Line ${finding.line}: ${finding.message}`);
        lines.push(`      Text: "${finding.text}..."`);
        lines.push(`      Fix: ${finding.fix}`);
        lines.push('');
      }
    }
  }
  
  // Recommendations
  lines.push('─'.repeat(64));
  lines.push('📝 Recommendations:');
  lines.push('');
  
  if (stats.bySeverity.error > 0) {
    lines.push('   ❌ Fix errors before proceeding');
  }
  if (stats.bySeverity.warning > 0) {
    lines.push('   ⚠️  Review warnings and consider fixes');
  }
  if (stats.totalConstraints < stats.totalRequirements * 0.3) {
    lines.push('   ℹ️  Consider adding more constraints for error cases and limits');
  }
  if (stats.bySeverity.error === 0 && stats.bySeverity.warning === 0) {
    lines.push('   ✅ Specs are well-constrained');
  }
  
  return lines.join('\n');
}

// === MAIN EXECUTION ===

const projectRoot = resolve(process.argv[2] || '.');

console.log('🔍 Phoenix Constraint Review');
console.log(`   Project: ${projectRoot}`);
console.log('');

try {
  const files = loadSpecFiles(projectRoot);
  
  if (files.length === 0) {
    console.error('❌ No spec files found in spec/');
    console.error('   Create spec files or run phoenix-init');
    process.exit(1);
  }
  
  // Analyze each file
  const allFindings = [];
  
  for (const file of files) {
    const findings = analyzeSpec(file);
    for (const finding of findings) {
      allFindings.push({ ...finding, file: file.name });
    }
  }
  
  // Print report
  const findingsByFile = new Map();
  for (const file of files) {
    const fileFindings = analyzeSpec(file);
    if (fileFindings.length > 0) {
      findingsByFile.set(file.name, fileFindings);
    }
  }
  
  // Recalculate stats properly
  const stats = {
    totalLines: files.reduce((sum, f) => sum + f.content.split('\n').length, 0),
    totalRequirements: files.reduce((sum, f) => {
      const matches = f.content.match(/REQUIREMENT:/g);
      return sum + (matches ? matches.length : 0);
    }, 0),
    totalConstraints: files.reduce((sum, f) => {
      const matches = f.content.match(/CONSTRAINT:/g);
      return sum + (matches ? matches.length : 0);
    }, 0),
    totalFindings: allFindings.length,
    bySeverity: { error: 0, warning: 0, info: 0 },
  };
  
  for (const finding of allFindings) {
    stats.bySeverity[finding.severity]++;
  }
  
  // Print report manually
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║  Phoenix Constraint Review                                     ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log('');
  
  console.log('📊 Statistics:');
  console.log(`   Files analyzed: ${files.length}`);
  console.log(`   Total lines: ${stats.totalLines}`);
  console.log(`   Requirements: ${stats.totalRequirements}`);
  console.log(`   Constraints: ${stats.totalConstraints}`);
  console.log(`   Findings: ${stats.totalFindings}`);
  console.log(`      Errors: ${stats.bySeverity.error}`);
  console.log(`      Warnings: ${stats.bySeverity.warning}`);
  console.log(`      Info: ${stats.bySeverity.info}`);
  console.log('');
  
  if (allFindings.length === 0) {
    console.log('✅ All specs clean - no issues found');
    console.log('');
    console.log('The specifications follow best practices:');
    console.log('   • Use "shall" instead of "should"');
    console.log('   • Avoid vague terms');
    console.log('   • Include input validation');
    console.log('   • Specify error handling');
    console.log('   • Define limits and boundaries');
  } else {
    // Group by file
    const byFile = new Map();
    for (const finding of allFindings) {
      if (!byFile.has(finding.file)) {
        byFile.set(finding.file, []);
      }
      byFile.get(finding.file).push(finding);
    }
    
    console.log('🔍 Findings:');
    console.log('');
    
    for (const [fileName, fileFindings] of byFile) {
      console.log(`📄 ${fileName}`);
      
      for (const finding of fileFindings) {
        const icon = finding.severity === 'error' ? '❌' :
                     finding.severity === 'warning' ? '⚠️' : 'ℹ️';
        console.log(`   ${icon} Line ${finding.line}: ${finding.message}`);
        console.log(`      Text: "${finding.text}..."`);
        console.log(`      Fix: ${finding.fix}`);
      }
      console.log('');
    }
    
    console.log('─'.repeat(64));
    console.log('📝 Recommendations:');
    console.log('');
    
    if (stats.bySeverity.error > 0) {
      console.log('   ❌ Fix errors before proceeding');
    }
    if (stats.bySeverity.warning > 0) {
      console.log('   ⚠️  Review warnings and consider fixes');
    }
    if (stats.totalConstraints < stats.totalRequirements * 0.3) {
      console.log('   ℹ️  Consider adding more constraints for error cases and limits');
    }
  }
  
  console.log('');
  
  // Exit code
  if (stats.bySeverity.error > 0) {
    process.exit(1);
  }
  
} catch (error) {
  console.error(`❌ Error: ${error.message}`);
  process.exit(1);
}
