/**
 * Note Model - TypeScript Types and Utilities
 * IU: 6f8e4c7d - Note Model (LOW)
 *
 * Defines the Note entity with TypeScript interfaces and validation utilities.
 */

/**
 * Note entity representing a single note in the system.
 * Uses rowid as the stable unique identifier (INTEGER PRIMARY KEY without AUTOINCREMENT).
 */
export interface Note {
  /** Stable unique identifier (rowid from SQLite) */
  id: number;

  /** Note title - non-empty, max 200 characters */
  title: string;

  /** Note content body - stored as text, no practical limit */
  content: string;

  /** Creation timestamp in UTC (Unix epoch milliseconds) */
  created_at: number;

  /** Last modification timestamp in UTC (Unix epoch milliseconds) */
  updated_at: number;
}

/**
 * Data required to create a new note.
 * ID and timestamps are generated automatically.
 */
export interface CreateNoteInput {
  /** Note title - required, will be validated */
  title: string;

  /** Optional initial content */
  content?: string;
}

/**
 * Data for updating an existing note.
 * Timestamps are updated automatically on save.
 */
export interface UpdateNoteInput {
  /** Updated title - required, will be validated */
  title: string;

  /** Updated content */
  content: string;
}

/**
 * Note summary for list views (sidebar).
 * Contains truncated title and formatted timestamp.
 */
export interface NoteSummary {
  id: number;
  title: string;
  updated_at: number;
}

/**
 * Maximum length for note titles.
 * Titles exceeding this will be rejected during validation.
 */
export const MAX_TITLE_LENGTH = 200;

/**
 * Validates a note title according to constraints.
 *
 * @param title - The title to validate
 * @returns Validation result with isValid flag and optional error message
 */
export function validateTitle(title: string): { isValid: boolean; error?: string } {
  const trimmed = title.trim();

  if (trimmed.length === 0) {
    return { isValid: false, error: 'Title is required' };
  }

  if (trimmed.length > MAX_TITLE_LENGTH) {
    return { isValid: false, error: `Title must not exceed ${MAX_TITLE_LENGTH} characters` };
  }

  return { isValid: true };
}

/**
 * Formats a UTC timestamp for display in the user's local timezone.
 *
 * @param timestamp - Unix epoch milliseconds in UTC
 * @returns Formatted date string (e.g., "Jan 15, 2024, 3:45 PM")
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toLocaleString();
}

/**
 * Formats a timestamp as a relative time string.
 * Shows "Just now", "5m ago", "2h ago", "Yesterday", or date.
 *
 * @param timestamp - Unix epoch milliseconds in UTC
 * @returns Relative time string for display
 */
export function formatRelativeTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;

  return new Date(timestamp).toLocaleDateString();
}

/**
 * Creates a new Note object with generated timestamps.
 *
 * @param id - The database rowid
 * @param title - Note title
 * @param content - Note content
 * @returns Complete Note object
 */
export function createNote(id: number, title: string, content: string): Note {
  const now = Date.now();
  return {
    id,
    title,
    content,
    created_at: now,
    updated_at: now,
  };
}

/**
 * Truncates text to a maximum length with ellipsis.
 *
 * @param text - Text to truncate
 * @param maxLength - Maximum length before truncation
 * @returns Truncated text with ellipsis if needed
 */
export function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength - 1) + '…';
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6f8e4c7d5a9b6f8e4c7d5a9b6f8e4c7d5a9b6f8e4c7d5a9b6f8e4c7d5a9b6f8e4c7d5a9b6f8e4c7d5a9b',
  name: 'Note Model',
  risk_tier: 'low',
} as const;
