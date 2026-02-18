/**
 * Dependency Extractor — parses TypeScript source to find imports and side channels.
 */

export interface ExtractedDep {
  kind: 'import';
  source: string;       // the import specifier (package name or path)
  is_relative: boolean;
  source_line: number;
}

export interface ExtractedSideChannel {
  kind: 'database' | 'queue' | 'cache' | 'config' | 'external_api' | 'file';
  identifier: string;   // the detected identifier (env var name, URL, etc.)
  source_line: number;
}

export interface DependencyGraph {
  file_path: string;
  imports: ExtractedDep[];
  side_channels: ExtractedSideChannel[];
}

/**
 * Extract dependencies from TypeScript source code.
 * Uses regex-based parsing (no AST in v1).
 */
export function extractDependencies(source: string, filePath: string): DependencyGraph {
  const lines = source.split('\n');
  const imports: ExtractedDep[] = [];
  const sideChannels: ExtractedSideChannel[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Match: import ... from 'specifier'
    // Match: import 'specifier'
    // Match: require('specifier')
    const importMatch = line.match(/(?:import\s+.*?from\s+['"]([^'"]+)['"]|import\s+['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/);
    if (importMatch) {
      const source = importMatch[1] || importMatch[2] || importMatch[3];
      imports.push({
        kind: 'import',
        source,
        is_relative: source.startsWith('.') || source.startsWith('/'),
        source_line: lineNum,
      });
    }

    // Side channel detection patterns
    // process.env.XXX
    const envMatch = line.match(/process\.env\.(\w+)/);
    if (envMatch) {
      sideChannels.push({
        kind: 'config',
        identifier: envMatch[1],
        source_line: lineNum,
      });
    }

    // process.env['XXX']
    const envBracketMatch = line.match(/process\.env\[['"](\w+)['"]\]/);
    if (envBracketMatch) {
      sideChannels.push({
        kind: 'config',
        identifier: envBracketMatch[1],
        source_line: lineNum,
      });
    }

    // fetch('url') or new URL('...')
    const fetchMatch = line.match(/(?:fetch|new\s+URL)\s*\(\s*['"]([^'"]+)['"]/);
    if (fetchMatch) {
      sideChannels.push({
        kind: 'external_api',
        identifier: fetchMatch[1],
        source_line: lineNum,
      });
    }

    // Database patterns: createConnection, createPool, new Pool, PrismaClient, etc.
    const dbMatch = line.match(/(?:createConnection|createPool|new\s+Pool|new\s+PrismaClient|mongoose\.connect)\s*\(/);
    if (dbMatch) {
      sideChannels.push({
        kind: 'database',
        identifier: 'database_connection',
        source_line: lineNum,
      });
    }

    // fs.readFile, fs.writeFile, etc.
    const fsMatch = line.match(/fs\.(readFile|writeFile|readdir|mkdir|unlink|stat|access)/);
    if (fsMatch) {
      sideChannels.push({
        kind: 'file',
        identifier: `fs.${fsMatch[1]}`,
        source_line: lineNum,
      });
    }

    // Redis / cache patterns
    const cacheMatch = line.match(/(?:new\s+Redis|createClient|redis\.connect)/);
    if (cacheMatch) {
      sideChannels.push({
        kind: 'cache',
        identifier: 'redis_connection',
        source_line: lineNum,
      });
    }
  }

  return { file_path: filePath, imports, side_channels: sideChannels };
}
