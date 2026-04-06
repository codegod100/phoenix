// Generated: Dashboard Analytics Bar (IU-6789012345678abcdef9012345678901234567890)
// Description: Compact status bar with key metrics display

import type { Metrics } from './analytics.js';

export function renderStatusBar(metrics: Metrics): string {
  return `
    <div class="status-bar" style="display:flex;align-items:center;justify-content:center;gap:16px;padding:12px 24px;margin:0 auto 20px;max-height:48px;color:var(--ctp-subtext0);font-size:0.9rem;">
      <span>
        <span style="color:var(--ctp-text);font-weight:500;">${metrics.total}</span> tasks
      </span>
      <span style="color:var(--ctp-subtext0);">•</span>
      <span>
        <span style="color:var(--ctp-text);font-weight:500;">${metrics.completed}</span> done
      </span>
      <span style="color:var(--ctp-subtext0);">•</span>
      <span>
        <span style="color:${metrics.overdue > 0 ? 'var(--ctp-danger)' : 'var(--ctp-text)'};font-weight:500;">${metrics.overdue}</span> overdue
      </span>
      <span style="color:var(--ctp-subtext0);">•</span>
      <span>
        <span style="color:var(--ctp-text);font-weight:500;">${metrics.completionRate}%</span>
      </span>
    </div>
  `;
}

export function renderCompactMetrics(metrics: Metrics): string {
  // Even more compact inline format
  const parts: string[] = [];

  parts.push(`📊 ${metrics.total} tasks`);
  parts.push(`✅ ${metrics.completed} done`);

  if (metrics.overdue > 0) {
    parts.push(`⚠️ ${metrics.overdue} overdue`);
  }

  parts.push(`📈 ${metrics.completionRate}%`);

  return `
    <div class="status-bar-compact" style="text-align:center;padding:8px 0;margin-bottom:16px;color:var(--ctp-subtext0);font-size:0.9rem;letter-spacing:0.01em;">
      ${parts.join(' <span style="margin:0 6px;color:var(--ctp-overlay0);">•</span> ')}
    </div>
  `;
}

export function renderAnalyticsBar(metrics: Metrics, compact = false): string {
  if (compact) {
    return renderCompactMetrics(metrics);
  }
  return renderStatusBar(metrics);
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6789012345678abcdef9012345678901234567890',
  name: 'Dashboard Analytics Bar',
  risk_tier: 'medium',
} as const;
