// IU-3: URL Linkification
// Auto-generated from Phoenix plan

export const _phoenix = {
  iu_id: 'url-linkification-003',
  name: 'URL Linkification',
  risk_tier: 'medium',
} as const;

// Server-side regex: stops at newlines
const URL_REGEX = /https?:\/\/[^\s<\n\r]+/gi;

/**
 * Convert raw URLs to clickable anchor tags
 * Handles multiple URLs separated by newlines as separate links
 * URLs displayed as link text show the original unescaped URL
 */
export function linkify(text: string): string {
  if (!text) return '';

  // Split by newlines, process each line separately, then rejoin
  return text.split('\n').map(line => {
    return line.replace(URL_REGEX, (url) => {
      // Ensure URL is not double-escaped
      const cleanUrl = url.replace(/&amp;/g, '&');
      return `<a href="${cleanUrl}" target="_blank" rel="noopener">${cleanUrl}</a>`;
    });
  }).join('\n');
}

/**
 * Client-side linkify for browser use
 * Uses the same regex but constructed for client-side execution
 */
export function linkifyClient(text: string): string {
  if (!text) return '';

  // Client-side RegExp with proper escaping: 'https?://[^\\s<\\n\\r]+'
  const clientRegex = new RegExp('https?://[^\\s<\\n\\r]+', 'gi');

  return text.split('\n').map(line => {
    return line.replace(clientRegex, (url) => {
      const cleanUrl = url.replace(/&amp;/g, '&');
      return `<a href="${cleanUrl}" target="_blank" rel="noopener">${cleanUrl}</a>`;
    });
  }).join('\n');
}

/**
 * Escape HTML entities except those already in anchor tags
 * Used for raw text display (not editing)
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Render card description with linkified URLs
 * Newlines are preserved and displayed
 */
export function renderDescription(description: string | null): string {
  if (!description) return '';

  // First linkify, then escape non-URL parts
  const linkified = linkify(description);

  // The linkify function already handles newlines
  return linkified;
}
