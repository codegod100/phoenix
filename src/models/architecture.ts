/**
 * Architecture Target — defines how canonical requirements compile to code.
 *
 * An architecture target provides the stable patterns, frameworks, and conventions
 * that generated code is compiled *into*. The spec says WHAT, the architecture says HOW.
 */

export interface Architecture {
  /** Unique name, e.g., 'sqlite-web-api' */
  name: string;
  /** Human description */
  description: string;
  /** Runtime platform */
  runtime: string;
  /** Production dependencies: package name → version range */
  packages: Record<string, string>;
  /** Dev dependencies: package name → version range */
  devPackages: Record<string, string>;
  /** Appended to the LLM system prompt — architectural rules and constraints */
  systemPromptExtension: string;
  /** Few-shot code examples showing the exact patterns to follow */
  codeExamples: string;
  /** Shared boilerplate files: relative path → file content */
  sharedFiles: Record<string, string>;
  /** Extra package.json fields (scripts, etc.) */
  packageJsonExtras: Record<string, unknown>;
}
