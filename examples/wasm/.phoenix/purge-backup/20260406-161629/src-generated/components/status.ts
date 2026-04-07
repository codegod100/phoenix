/**
 * Status Indicator Component
 * IU-3f7a9e5c: Status Indicator (LOW)
 * 
 * node-c9e4b7a2: Status indicator for ready/saving/error states
 */

export type StatusState = 'initializing' | 'ready' | 'saving' | 'error';

export interface StatusIndicator {
  element: HTMLElement;
  setState(state: StatusState, message?: string): void;
}

/**
 * Create status indicator UI
 */
export function createStatusIndicator(container: HTMLElement): StatusIndicator {
  const element = document.createElement('div');
  element.className = 'status-indicator';
  element.style.cssText = `
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-radius: 4px;
    font-size: 12px;
    font-family: system-ui, -apple-system, sans-serif;
    transition: all 0.2s ease;
  `;

  container.appendChild(element);

  function setState(state: StatusState, message?: string): void {
    const styles: Record<StatusState, { bg: string; color: string; icon: string }> = {
      initializing: { bg: '#f0f0f0', color: '#666', icon: '⏳' },
      ready: { bg: '#e6f4ea', color: '#1e8e3e', icon: '✓' },
      saving: { bg: '#e8f0fe', color: '#1967d2', icon: '💾' },
      error: { bg: '#fce8e8', color: '#d93025', icon: '⚠' },
    };

    const style = styles[state];
    element.style.backgroundColor = style.bg;
    element.style.color = style.color;
    
    const text = message || state.charAt(0).toUpperCase() + state.slice(1);
    element.innerHTML = `${style.icon} ${text}`;

    if (state === 'error') {
      console.error('[notes-app] Status error:', message);
    } else if (state === 'saving') {
      console.log('[notes-app] Saving...');
    }
  }

  // Initial state
  setState('initializing');

  return { element, setState };
}

/**
 * Traceability export for Phoenix
 */
export const _phoenix = {
  iu_id: '3f7a9e5c8b4f3f7a9e5c8b4f3f7a9e5c8b4f3f7a9e5c8b4f3f7a9e5c8b4f3f7a9',
  name: 'Status Indicator',
  risk_tier: 'low',
  requirements: ['node-c9e4b7a2', 'node-b8e5c2a7'],
} as const;
