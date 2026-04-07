/**
 * Status Indicator Component
 * IU: 3f7a9e5c - Status Indicator (LOW)
 *
 * Visual feedback component showing database and save state.
 */

/** Possible status states for the application */
export type AppStatus =
  | { type: 'initializing'; message: string }
  | { type: 'ready'; message: string; persistent: boolean }
  | { type: 'saving'; message: string }
  | { type: 'saved'; message: string }
  | { type: 'error'; message: string };

/** CSS class names for status styling */
const STATUS_CLASSES = {
  initializing: 'status-initializing',
  ready: 'status-ready',
  saving: 'status-saving',
  saved: 'status-saved',
  error: 'status-error',
};

/**
 * StatusIndicator component for displaying database and save state.
 */
export class StatusIndicator {
  private element: HTMLElement | null = null;
  private currentStatus: AppStatus = { type: 'initializing', message: 'Initializing...' };

  /**
   * Creates a new StatusIndicator.
   *
   * @param container - Container element to render into
   */
  constructor(private container: HTMLElement) {}

  /**
   * Renders the status indicator into the container.
   * Creates the DOM element if it doesn't exist.
   */
  render(): void {
    if (!this.element) {
      this.element = document.createElement('div');
      this.element.className = 'status-indicator';
      this.container.appendChild(this.element);
    }

    this.updateDisplay();
  }

  /**
   * Updates the status and refreshes the display.
   *
   * @param status - New status state
   */
  setStatus(status: AppStatus): void {
    this.currentStatus = status;
    this.updateDisplay();
  }

  /**
   * Updates the visual display based on current status.
   */
  private updateDisplay(): void {
    if (!this.element) return;

    const { type, message } = this.currentStatus;

    // Update class for styling
    this.element.className = `status-indicator ${STATUS_CLASSES[type]}`;

    // Update content with icon
    const icon = this.getStatusIcon(type);
    this.element.innerHTML = `${icon} ${message}`;

    // Add persistence indicator for ready state
    if (type === 'ready') {
      const persistent = (this.currentStatus as { persistent: boolean }).persistent;
      if (!persistent) {
        this.element.innerHTML += ' <span class="status-warning">(in-memory)</span>';
      }
    }
  }

  /**
   * Gets the appropriate icon for a status type.
   */
  private getStatusIcon(type: AppStatus['type']): string {
    switch (type) {
      case 'initializing':
        return '⏳';
      case 'ready':
        return '✓';
      case 'saving':
        return '💾';
      case 'saved':
        return '✓';
      case 'error':
        return '⚠️';
      default:
        return '';
    }
  }

  /**
   * Sets initializing status.
   */
  setInitializing(message = 'Initializing...'): void {
    this.setStatus({ type: 'initializing', message });
  }

  /**
   * Sets ready status.
   */
  setReady(persistent: boolean): void {
    const message = persistent
      ? 'Ready (persistent storage)'
      : 'Ready (in-memory only)';
    this.setStatus({ type: 'ready', message, persistent });
  }

  /**
   * Sets saving status.
   */
  setSaving(): void {
    this.setStatus({ type: 'saving', message: 'Saving...' });
  }

  /**
   * Sets saved status.
   */
  setSaved(): void {
    this.setStatus({ type: 'saved', message: 'Saved' });
    // Clear saved status after 2 seconds
    setTimeout(() => {
      if (this.currentStatus.type === 'saved') {
        const persistent = this.currentStatus.type === 'ready' ?
          (this.currentStatus as { persistent: boolean }).persistent : false;
        this.setReady(persistent);
      }
    }, 2000);
  }

  /**
   * Sets error status.
   */
  setError(message: string): void {
    this.setStatus({ type: 'error', message });
  }

  /**
   * Gets the current status.
   */
  getStatus(): AppStatus {
    return this.currentStatus;
  }

  /**
   * Destroys the component and removes from DOM.
   */
  destroy(): void {
    if (this.element && this.element.parentNode) {
      this.element.parentNode.removeChild(this.element);
    }
    this.element = null;
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '3f7a9e5c6b8a3f7a9e5c6b8a3f7a9e5c6b8a3f7a9e5c6b8a3f7a9e5c6b8a3f7a9e5c6b8a3f7a9e5c6b8a3f7',
  name: 'Status Indicator',
  risk_tier: 'low',
} as const;
