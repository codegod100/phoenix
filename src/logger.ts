/**
 * Phoenix Logger - Structured logging with pino and timing metrics
 * 
 * Log levels: fatal > error > warn > info > debug > trace
 * 
 * Environment variables:
 *   PHOENIX_LOG_LEVEL=info    - Set log level (default: info)
 *   PHOENIX_LOG_JSON=1        - Output JSON (default: pretty for TTY)
 *   PHOENIX_LOG_TIMINGS=1     - Always show timing metrics at end
 */

import pino from 'pino';

// Smart duration formatting based on magnitude
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = ((ms % 60000) / 1000).toFixed(0);
  return `${minutes}m ${seconds.padStart(2, '0')}s`;
}

const isTTY = process.stdout.isTTY;
const forceJSON = process.env.PHOENIX_LOG_JSON === '1' || process.env.PHOENIX_LOG_JSON === 'true';
const showTimings = process.env.PHOENIX_LOG_TIMINGS === '1' || process.env.PHOENIX_LOG_TIMINGS === 'true';

const logLevel = process.env.PHOENIX_LOG_LEVEL || 'info';

const logger = pino({
  level: logLevel,
  transport: !forceJSON && isTTY ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'HH:MM:ss',
      ignore: 'pid,hostname',
      messageFormat: '{msg}',
    }
  } : undefined,
  base: {
    name: 'phoenix',
  },
  formatters: {
    level: (label) => ({ level: label.toUpperCase() }),
  },
});

export { logger };
export default logger;

// Helper to create child loggers with context
export function createLogger(context: Record<string, string | number>) {
  return logger.child(context);
}

// ─────────────────────────────────────────────────────────────────────────────
// Timing Metrics System
// ─────────────────────────────────────────────────────────────────────────────

interface TimingEntry {
  name: string;
  startTime: number;
  endTime?: number;
  duration_ms?: number;
  parent?: string;
  metadata?: Record<string, unknown>;
}

class TimingCollector {
  private timings: Map<string, TimingEntry> = new Map();
  private active: Map<string, TimingEntry> = new Map();
  private stack: string[] = [];

  start(name: string, metadata?: Record<string, unknown>): void {
    const parent = this.stack[this.stack.length - 1];
    const entry: TimingEntry = {
      name,
      startTime: Date.now(),
      parent,
      metadata,
    };
    this.active.set(name, entry);
    this.stack.push(name);
  }

  end(name: string, extraMetadata?: Record<string, unknown>): number {
    const entry = this.active.get(name);
    if (!entry) {
      logger.warn({ name }, `Timing: end() called for unknown timer: ${name}`);
      return 0;
    }

    entry.endTime = Date.now();
    entry.duration_ms = entry.endTime - entry.startTime;
    if (extraMetadata) {
      entry.metadata = { ...entry.metadata, ...extraMetadata };
    }

    this.timings.set(name, entry);
    this.active.delete(name);
    
    // Pop from stack (handle nested timing)
    const idx = this.stack.lastIndexOf(name);
    if (idx > -1) this.stack.splice(idx, 1);

    return entry.duration_ms;
  }

  // Wrap an async function with timing
  async wrap<T>(
    name: string,
    fn: () => Promise<T>,
    metadata?: Record<string, unknown>,
    logLevel: 'debug' | 'info' = 'info'
  ): Promise<T> {
    this.start(name, metadata);
    try {
      const result = await fn();
      const duration = this.end(name);
      const msg = `${name} took ${formatDuration(duration)} to complete`;
      if (logLevel === 'debug') {
        logger.debug({ operation: name, duration_ms: duration, ...metadata }, msg);
      } else {
        logger.info({ operation: name, duration_ms: duration, ...metadata }, msg);
      }
      return result;
    } catch (err) {
      const duration = this.end(name, { error: String(err) });
      logger.error({ operation: name, duration_ms: duration, error: String(err) },
        `${name} took ${formatDuration(duration)} (FAILED)`);
      throw err;
    }
  }

  // Wrap a sync function with timing
  wrapSync<T>(
    name: string,
    fn: () => T,
    metadata?: Record<string, unknown>,
    logLevel: 'debug' | 'info' = 'info'
  ): T {
    this.start(name, metadata);
    try {
      const result = fn();
      const duration = this.end(name);
      const msg = `${name} took ${formatDuration(duration)} to complete`;
      if (logLevel === 'debug') {
        logger.debug({ operation: name, duration_ms: duration, ...metadata }, msg);
      } else {
        logger.info({ operation: name, duration_ms: duration, ...metadata }, msg);
      }
      return result;
    } catch (err) {
      const duration = this.end(name, { error: String(err) });
      logger.error({ operation: name, duration_ms: duration, error: String(err) },
        `${name} took ${formatDuration(duration)} (FAILED)`);
      throw err;
    }
  }

  // Get a summary of all timings
  getSummary(): { total: number; critical: number; timings: TimingEntry[] } {
    const all = Array.from(this.timings.values());
    const total = all.reduce((sum, t) => sum + (t.duration_ms || 0), 0);
    
    // Find critical path (top-level operations, sorted by duration)
    const critical = all
      .filter(t => !t.parent)
      .sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0));

    return { total, critical: critical[0]?.duration_ms || 0, timings: all };
  }

  // Log a detailed timing report
  report(): void {
    const { total, critical, timings } = this.getSummary();
    
    // Sort by duration descending
    const sorted = timings.sort((a, b) => (b.duration_ms || 0) - (a.duration_ms || 0));
    
    logger.info({ total_duration_ms: total, critical_path_ms: critical },
      `=== Timing Report: ${formatDuration(total)} total ===`);

    // Log top 10 slowest operations
    for (const t of sorted.slice(0, 10)) {
      const indent = t.parent ? '  ' : '';
      const pct = total > 0 ? Math.round(((t.duration_ms || 0) / total) * 100) : 0;
      logger.info({ 
        operation: t.name, 
        duration_ms: t.duration_ms, 
        pct_total: pct,
        parent: t.parent,
        ...t.metadata 
      }, `${indent}${t.name} took ${formatDuration(t.duration_ms || 0)} (${pct}%)`);
    }

    // Log any active (unclosed) timings as warnings
    if (this.active.size > 0) {
      for (const [name, entry] of this.active) {
        const elapsed = Date.now() - entry.startTime;
        logger.warn({ operation: name, elapsed_ms: elapsed },
          `${name}: still running (${formatDuration(elapsed)} elapsed)`);
      }
    }
  }

  // Reset all timings
  reset(): void {
    this.timings.clear();
    this.active.clear();
    this.stack = [];
  }

  // Check if should show timings
  shouldShow(): boolean {
    return showTimings || logLevel === 'debug' || logLevel === 'trace';
  }
}

// Global timing collector
export const timing = new TimingCollector();

// Quick log functions for common patterns
export const log = {
  fatal: (msg: string, ...args: unknown[]) => logger.fatal(args[0] as object, msg, ...args.slice(1)),
  error: (msg: string, ...args: unknown[]) => logger.error(args[0] as object, msg, ...args.slice(1)),
  warn: (msg: string, ...args: unknown[]) => logger.warn(args[0] as object, msg, ...args.slice(1)),
  info: (msg: string, ...args: unknown[]) => logger.info(args[0] as object, msg, ...args.slice(1)),
  debug: (msg: string, ...args: unknown[]) => logger.debug(args[0] as object, msg, ...args.slice(1)),
  trace: (msg: string, ...args: unknown[]) => logger.trace(args[0] as object, msg, ...args.slice(1)),
  
  // Progress indicator for long-running operations
  progress: (operation: string, item: string) => {
    logger.info({ operation, item }, `${operation}: ${item}`);
  },
  
  // Result logging with consistent formatting
  success: (operation: string, item?: string) => {
    logger.info({ operation, item, status: 'success' }, 
      item ? `✓ ${operation}: ${item}` : `✓ ${operation}`);
  },
  
  failure: (operation: string, error: string | Error, item?: string) => {
    const errMsg = error instanceof Error ? error.message : error;
    logger.error({ operation, item, error: errMsg, status: 'failure' },
      item ? `✗ ${operation}: ${item} - ${errMsg}` : `✗ ${operation}: ${errMsg}`);
  },
  
  // Timing wrapper helpers
  timed: async <T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> => {
    return timing.wrap(operation, fn, metadata, 'info');
  },
  
  timedSync: <T>(operation: string, fn: () => T, metadata?: Record<string, unknown>): T => {
    return timing.wrapSync(operation, fn, metadata, 'info');
  },
  
  timedDebug: async <T>(operation: string, fn: () => Promise<T>, metadata?: Record<string, unknown>): Promise<T> => {
    return timing.wrap(operation, fn, metadata, 'debug');
  },

  // Report all timings
  reportTimings: () => {
    timing.report();
  },
};

// Log level helpers
export function setLogLevel(level: string) {
  logger.level = level;
}

export function getLogLevel() {
  return logger.level;
}
