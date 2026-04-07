/**
 * Note Model - Type definitions and validation
 * IU-6f8e4c7d: Note Model (LOW)
 */

/**
 * Represents a note in the system.
 * node-4a7e8c21: Note has title, content, timestamps
 * node-b9d3f156: Stable unique integer identifier
 */
export interface Note {
  /** node-b9d3f156: Stable unique integer identifier */
  id: number;
  /** node-2c8a5e94: Title non-empty, max 200 chars */
  title: string;
  /** node-7f1e3d82: Content stored as text */
  content: string;
  /** node-3d6b8f45: Created timestamp */
  createdAt: number;
  /** node-3d6b8f45: Updated timestamp */
  updatedAt: number;
}

/**
 * node-e5a9c618: Timestamps recorded in UTC
 * Convert UTC timestamp to local display string
 */
export function formatTimestamp(utcTimestamp: number): string {
  return new Date(utcTimestamp).toLocaleString();
}

/**
 * node-2c8a5e94: Title validation - non-empty and max 200 chars
 */
export function validateTitle(title: string): { valid: boolean; error?: string } {
  if (!title || title.trim().length === 0) {
    return { valid: false, error: 'Title is required' };
  }
  if (title.length > 200) {
    return { valid: false, error: 'Title must not exceed 200 characters' };
  }
  return { valid: true };
}

/**
 * Create a new note with current timestamps
 */
export function createNote(title: string, content: string = ''): Omit<Note, 'id'> {
  const now = Date.now();
  return {
    title: title.trim(),
    content,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * node-e5a9c618: Display timestamps in local timezone
 */
export function getRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return formatTimestamp(timestamp);
}

/**
 * node-9b5d7c3a: Truncate title to 40 characters
 */
export function truncateTitle(title: string, maxLength: number = 40): string {
  if (title.length <= maxLength) return title;
  return title.slice(0, maxLength - 1) + '…';
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '6f8e4c7d2a9b5e8f4c7d3a9b5e8f4c7d2a9b5e8f4c7d3a9b5e8f4c7d2a9b5e8',
  name: 'Note Model',
  risk_tier: 'low',
  requirements: [
    'node-4a7e8c21',
    'node-b9d3f156',
    'node-2c8a5e94',
    'node-7f1e3d82',
    'node-e5a9c618',
    'node-3d6b8f45',
  ],
} as const;
