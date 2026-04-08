/**
 * Language-Agnostic IU Traceability Utilities
 * 
 * Provides comment-based IU tracking that works in any programming language.
 * Format: @phoenix-<field>: <value>
 * 
 * Example:
 *   // @phoenix-iu: d46cdcd2f55a1f02...
 *   // @phoenix-name: Task Domain
 *   // @phoenix-risk: high
 *   // @phoenix-short: IU-d46cdcd2
 *   // @phoenix-migrated: e4caab5ead2d175c...
 * 
 * Canonical requirement tracking:
 *   // @phoenix-canon: 41e8bd3b97654fa7...
 *   // REQUIREMENT: Users must create tasks with...
 */

/**
 * Format IU info as language-agnostic comments
 */
export function formatPhoenixComments(info) {
  const lines = [];
  lines.push(`// @phoenix-iu: ${info.iu}`);
  lines.push(`// @phoenix-name: ${info.name}`);
  lines.push(`// @phoenix-risk: ${info.risk}`);
  if (info.shortId) {
    lines.push(`// @phoenix-short: ${info.shortId}`);
  }
  if (info.migrated) {
    lines.push(`// @phoenix-migrated: ${info.migrated}`);
  }
  return lines.join('\n');
}

/**
 * Format canonical requirement as traceability comment
 */
export function formatCanonComment(canonId, statement, type = 'REQUIREMENT') {
  const shortId = canonId.slice(0, 16);
  const truncated = statement.length > 80 
    ? statement.slice(0, 77) + '...' 
    : statement;
  return `// @phoenix-canon: ${shortId}...\n// ${type}: ${truncated}`;
}

/**
 * Parse @phoenix-* comments from code
 * Returns object with extracted fields or null if not found
 */
export function parsePhoenixComments(code) {
  const result = {};
  
  const iuMatch = code.match(/@phoenix-iu:\s*([a-f0-9]+)/);
  if (iuMatch) result.iu = iuMatch[1];
  
  const nameMatch = code.match(/@phoenix-name:\s*(.+)/);
  if (nameMatch) result.name = nameMatch[1].trim();
  
  const riskMatch = code.match(/@phoenix-risk:\s*(\w+)/);
  if (riskMatch) result.risk = riskMatch[1];
  
  const shortMatch = code.match(/@phoenix-short:\s*(\S+)/);
  if (shortMatch) result.shortId = shortMatch[1];
  
  const migratedMatch = code.match(/@phoenix-migrated:\s*([a-f0-9]+)/);
  if (migratedMatch) result.migrated = migratedMatch[1];
  
  // Find all canon references
  const canonMatches = [...code.matchAll(/@phoenix-canon:\s*([a-f0-9]+)/g)];
  if (canonMatches.length > 0) {
    result.canons = canonMatches.map(m => m[1]);
  }
  
  return Object.keys(result).length > 0 ? result : null;
}

/**
 * Extract implementation body from migrated code
 * Removes old phoenix comment blocks and headers
 */
export function extractImplementationBody(code) {
  // Find the TYPES or IMPLEMENTATIONS section
  const sectionMatch = code.match(/\/\/ === (TYPES|RED IMPLEMENTATIONS)/);
  if (!sectionMatch) return null;
  
  // Return everything from the first section to end
  // (new traceability will be added by generator)
  return code.substring(sectionMatch.index);
}

/**
 * Update phoenix comments in migrated code
 */
export function updatePhoenixComments(code, newInfo) {
  // Remove old @phoenix-* comment blocks
  let cleaned = code.replace(/\/\/ @phoenix-[^\n]+\n/g, '');
  
  // Remove old PHOENIX VCS TRACEABILITY section
  cleaned = cleaned.replace(/\/\/ === PHOENIX VCS TRACEABILITY ===[\s\S]*?export const _phoenix = \{[\s\S]*?\} as const;\n?/g, '');
  
  // Find where to insert new comments (after first block of header comments)
  const firstSection = cleaned.match(/\/\/ === (TYPES|RED IMPLEMENTATIONS)/);
  if (firstSection) {
    const insertPoint = firstSection.index;
    const before = cleaned.substring(0, insertPoint);
    const after = cleaned.substring(insertPoint);
    
    const newComments = formatPhoenixComments(newInfo);
    return before + newComments + '\n\n' + after;
  }
  
  // If no sections found, just prepend
  return formatPhoenixComments(newInfo) + '\n\n' + cleaned;
}
