export interface TaskStats {
  totalTasks: number;
  completedCount: number;
  overdueCount: number;
  completionRate: number;
}

export interface MetricCard {
  name: string;
  value: string;
  emoji: string;
}

export interface AnalyticsPanelOptions {
  stats: TaskStats;
  className?: string;
}

/** Validates that value is a non-negative finite number */
function validateNonNegativeNumber(value: unknown, fieldName: string): number {
  if (typeof value !== 'number') {
    throw new Error(`${fieldName} must be a number, got ${typeof value}`);
  }
  if (!Number.isFinite(value)) {
    throw new Error(`${fieldName} must be finite, got ${value}`);
  }
  if (value < 0) {
    throw new Error(`${fieldName} cannot be negative, got ${value}`);
  }
  return value;
}

/** Validates TaskStats object structure and values */
function validateTaskStats(stats: unknown): asserts stats is TaskStats {
  if (!stats || typeof stats !== 'object') {
    throw new Error('Invalid stats: expected TaskStats object');
  }

  const s = stats as Partial<TaskStats>;
  
  const totalTasks = validateNonNegativeNumber(s.totalTasks, 'totalTasks');
  const completedCount = validateNonNegativeNumber(s.completedCount, 'completedCount');
  const overdueCount = validateNonNegativeNumber(s.overdueCount, 'overdueCount');
  const completionRate = validateNonNegativeNumber(s.completionRate, 'completionRate');

  // Logical consistency checks
  if (completedCount > totalTasks) {
    throw new Error(`Invalid state: completedCount (${completedCount}) cannot exceed totalTasks (${totalTasks})`);
  }
  
  if (overdueCount > totalTasks) {
    throw new Error(`Invalid state: overdueCount (${overdueCount}) cannot exceed totalTasks (${totalTasks})`);
  }
  
  if (completionRate > 100) {
    throw new Error(`Invalid completionRate: ${completionRate} exceeds maximum of 100`);
  }
}

export function calculateCompletionRate(completed: number, total: number): number {
  const validCompleted = validateNonNegativeNumber(completed, 'completed');
  const validTotal = validateNonNegativeNumber(total, 'total');
  
  if (validTotal === 0) return 0;
  if (validCompleted > validTotal) {
    throw new Error(`Invalid state: completed (${validCompleted}) > total (${validTotal})`);
  }
  return Math.round((validCompleted / validTotal) * 100);
}

export function formatMetricValue(value: number, isPercentage: boolean = false): string {
  validateNonNegativeNumber(value, 'value');
  if (isPercentage) {
    return `${value}%`;
  }
  return value.toString();
}

export function createMetricCards(stats: TaskStats): MetricCard[] {
  validateTaskStats(stats);
  
  return [
    {
      name: 'Total Tasks',
      value: formatMetricValue(stats.totalTasks),
      emoji: '📋'
    },
    {
      name: 'Completed',
      value: formatMetricValue(stats.completedCount),
      emoji: '✅'
    },
    {
      name: 'Overdue',
      value: formatMetricValue(stats.overdueCount),
      emoji: '⚠️'
    },
    {
      name: 'Completion Rate',
      value: formatMetricValue(stats.completionRate, true),
      emoji: '📊'
    }
  ];
}

export function renderMetricCard(card: MetricCard): string {
  if (!card || typeof card !== 'object') {
    throw new Error('Invalid card: expected MetricCard object');
  }
  if (!card.name || typeof card.name !== 'string') {
    throw new Error('Invalid card: name is required and must be a string');
  }
  if (typeof card.value !== 'string') {
    throw new Error('Invalid card: value is required and must be a string');
  }
  
  return `
    <div class="metric-card">
      <div class="metric-icon">${card.emoji || '📊'}</div>
      <div class="metric-content">
        <div class="metric-name">${card.name}</div>
        <div class="metric-value">${card.value}</div>
      </div>
    </div>
  `.trim();
}

export function renderAnalyticsPanel(options: AnalyticsPanelOptions): string {
  if (!options || typeof options !== 'object') {
    throw new Error('Invalid options: expected AnalyticsPanelOptions object');
  }
  
  const { stats, className = 'analytics-panel' } = options;
  
  validateTaskStats(stats);
  
  if (className && typeof className !== 'string') {
    throw new Error('Invalid className: must be a string');
  }
  
  const metricCards = createMetricCards(stats);
  
  const cardsHtml = metricCards
    .map(card => renderMetricCard(card))
    .join('\n');

  return `
    <div class="${className}">
      <div class="metrics-row">
        ${cardsHtml}
      </div>
    </div>
  `.trim();
}

export class AnalyticsPanel {
  private stats: TaskStats;
  private className: string;

  constructor(stats: TaskStats, className: string = 'analytics-panel') {
    validateTaskStats(stats);
    this.stats = { ...stats };
    this.className = className;
  }

  updateStats(newStats: TaskStats): void {
    validateTaskStats(newStats);
    this.stats = { ...newStats };
  }

  getStats(): TaskStats {
    return { ...this.stats };
  }

  render(): string {
    return renderAnalyticsPanel({
      stats: this.stats,
      className: this.className
    });
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '59d32939d50083b6ecf70e500f215a179f42a5ea99a186cb8af2720e3aaa1d74',
  name: 'Analytics Panel',
  risk_tier: 'low',
} as const;