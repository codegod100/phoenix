export interface FeedbackSystem {
  flashCell(row: number, col: number): void;
  showCooldownToast(): void;
  showWinOverlay(color: string): void;
  updateCooldownProgress(progress: number): void;
  destroy(): void;
}

export interface FeedbackOptions {
  gridContainer: string;
  rootContainer: string;
}

export class Feedback implements FeedbackSystem {
  private gridContainer: string;
  private rootContainer: string;
  private cooldownBarId: string | null = null;
  private activeToastId: string | null = null;
  private activeOverlayId: string | null = null;
  private styleId: string | null = null;

  constructor(options: FeedbackOptions) {
    this.gridContainer = options.gridContainer;
    this.rootContainer = options.rootContainer;
    this.initializeCooldownBar();
  }

  private generateId(): string {
    return `feedback-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
  }

  private initializeCooldownBar(): void {
    this.cooldownBarId = this.generateId();
    const progressFillId = this.generateId();

    const cooldownBarHtml = `
      <div id="${this.cooldownBarId}" style="
        position: absolute;
        bottom: -8px;
        left: 0;
        right: 0;
        height: 4px;
        background-color: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        overflow: hidden;
      ">
        <div id="${progressFillId}" data-progress-fill="true" style="
          height: 100%;
          width: 0%;
          background-color: #ff6b6b;
          transition: width 0.1s ease-out;
          border-radius: 2px;
        "></div>
      </div>
    `;

    // In a real implementation, this would append to the actual DOM element
    // For this module, we store the HTML template
  }

  flashCell(row: number, col: number): void {
    // Generate HTML template for cell flash effect
    const flashHtml = `
      <style>
        [data-row="${row}"][data-col="${col}"] {
          background-color: white !important;
          transition: background-color 0.15s ease-out;
        }
      </style>
    `;

    // In a real implementation, this would manipulate the actual DOM
    setTimeout(() => {
      // Reset styles after flash
    }, 150);
  }

  showCooldownToast(): void {
    if (this.activeToastId) {
      // Remove existing toast
      this.activeToastId = null;
    }

    this.activeToastId = this.generateId();
    const styleId = this.generateId();

    const toastHtml = `
      <style id="${styleId}">
        @keyframes fadeInOut {
          0%, 100% { opacity: 0; transform: translate(-50%, -50%) scale(0.9); }
          20%, 80% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      </style>
      <div id="${this.activeToastId}" style="
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        font-size: 16px;
        font-family: system-ui, -apple-system, sans-serif;
        display: flex;
        align-items: center;
        gap: 8px;
        z-index: 1000;
        animation: fadeInOut 1s ease-in-out;
      ">
        ⏳ Please wait...
      </div>
    `;

    setTimeout(() => {
      this.activeToastId = null;
    }, 1000);
  }

  showWinOverlay(color: string): void {
    if (this.activeOverlayId) {
      // Remove existing overlay
      this.activeOverlayId = null;
    }

    this.activeOverlayId = this.generateId();
    this.styleId = this.generateId();

    const overlayHtml = `
      <style id="${this.styleId}">
        @keyframes overlayFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes messageScale {
          0% { transform: scale(0.5); opacity: 0; }
          50% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); opacity: 1; }
        }
      </style>
      <div id="${this.activeOverlayId}" style="
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background-color: rgba(0, 0, 0, 0.9);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 2000;
        animation: overlayFadeIn 0.3s ease-out;
      ">
        <div style="
          font-size: 48px;
          font-family: system-ui, -apple-system, sans-serif;
          font-weight: bold;
          color: white;
          text-align: center;
          animation: messageScale 0.5s ease-out;
        ">
          🏆 ${color} wins!
        </div>
      </div>
    `;

    setTimeout(() => {
      this.activeOverlayId = null;
      this.styleId = null;
    }, 5000);
  }

  updateCooldownProgress(progress: number): void {
    if (!this.cooldownBarId) return;

    const clampedProgress = Math.max(0, Math.min(100, progress));
    
    // Generate CSS to update progress bar width
    const progressUpdateHtml = `
      <style>
        [data-progress-fill="true"] {
          width: ${clampedProgress}% !important;
        }
      </style>
    `;
  }

  destroy(): void {
    this.cooldownBarId = null;
    this.activeToastId = null;
    this.activeOverlayId = null;
    this.styleId = null;
  }
}

export function createFeedback(options: FeedbackOptions): FeedbackSystem {
  return new Feedback(options);
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '8c0b86ec528f506c5efc010e2cc6f79ae09fc81f25916d923f4cff73dee3a50f',
  name: 'Feedback',
  risk_tier: 'medium',
  canon_ids: [4 as const],
} as const;