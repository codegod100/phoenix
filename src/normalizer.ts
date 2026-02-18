/**
 * Text normalization for stable semantic hashing.
 *
 * Goals:
 * - Formatting-only changes produce identical normalized output
 * - List order does not affect hash (items sorted)
 * - Deterministic and idempotent
 */

/**
 * Normalize a block of text for semantic hashing.
 */
export function normalizeText(raw: string): string {
  let text = raw;

  // Remove fenced code blocks entirely (preserve that code existed but not its content)
  text = text.replace(/```[\s\S]*?```/g, '(code block)');

  // Remove markdown heading markers
  text = text.replace(/^#{1,6}\s+/gm, '');

  // Remove bold/italic markers
  text = text.replace(/\*{1,3}([^*]+)\*{1,3}/g, '$1');
  text = text.replace(/_{1,3}([^_]+)_{1,3}/g, '$1');

  // Remove inline code backticks (but keep content)
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove link syntax, keep text: [text](url) → text
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Lowercase
  text = text.toLowerCase();

  // Process lines
  const lines = text.split('\n');
  const processed: string[] = [];
  let listBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.replace(/\s+/g, ' ').trim();
    if (trimmed === '') {
      // Flush list buffer on blank line
      if (listBuffer.length > 0) {
        listBuffer.sort();
        processed.push(...listBuffer);
        listBuffer = [];
      }
      continue;
    }

    // Detect list items (-, *, •, numbered)
    const listMatch = trimmed.match(/^(?:[-*•]|\d+[.)]\s*)\s*(.*)/);
    if (listMatch) {
      listBuffer.push(listMatch[1].trim());
    } else {
      // Flush any pending list
      if (listBuffer.length > 0) {
        listBuffer.sort();
        processed.push(...listBuffer);
        listBuffer = [];
      }
      processed.push(trimmed);
    }
  }

  // Flush remaining list
  if (listBuffer.length > 0) {
    listBuffer.sort();
    processed.push(...listBuffer);
  }

  return processed.join('\n');
}
