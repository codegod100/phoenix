export interface ScoreboardEntry {
  teamId: string;
  teamName: string;
  score: number;
  isPlayer: boolean;
}

export interface LayoutConfig {
  backgroundColor?: string;
  gridWidth?: number;
  gridHeight?: number;
  showScoreboard?: boolean;
}

export interface LayoutState {
  config: LayoutConfig;
  scoreboard: ScoreboardEntry[];
  gridContent: string;
}

export class Layout {
  private state: LayoutState;

  constructor(config: LayoutConfig = {}) {
    this.state = {
      config: {
        backgroundColor: '#1a1a2e',
        gridWidth: 800,
        gridHeight: 600,
        showScoreboard: true,
        ...config
      },
      scoreboard: [],
      gridContent: ''
    };
  }

  public setGridContent(content: string): void {
    this.state.gridContent = content;
  }

  public updateScoreboard(entries: ScoreboardEntry[]): void {
    this.state.scoreboard = [...entries];
  }

  public setPlayerTeam(teamId: string): void {
    this.state.scoreboard = this.state.scoreboard.map(entry => ({
      ...entry,
      isPlayer: entry.teamId === teamId
    }));
  }

  public render(): string {
    const { config } = this.state;
    
    return `
      <div class="layout-container" style="
        background-color: ${config.backgroundColor};
        min-height: 100vh;
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        padding: 20px;
        box-sizing: border-box;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      ">
        ${this.renderScoreboard()}
        <div class="grid-container" style="
          width: ${config.gridWidth}px;
          height: ${config.gridHeight}px;
          border: 2px solid #333;
          border-radius: 8px;
          background-color: rgba(255, 255, 255, 0.05);
          display: flex;
          align-items: center;
          justify-content: center;
          margin: 20px 0;
        ">
          ${this.state.gridContent}
        </div>
      </div>
    `;
  }

  private renderScoreboard(): string {
    if (!this.state.config.showScoreboard || this.state.scoreboard.length === 0) {
      return '';
    }

    const scoreboardEntries = this.state.scoreboard
      .sort((a, b) => b.score - a.score)
      .map(entry => this.renderScoreboardEntry(entry))
      .join('');

    return `
      <div class="scoreboard" style="
        background-color: rgba(255, 255, 255, 0.1);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 20px;
        min-width: 300px;
      ">
        <h3 style="
          color: #fff;
          margin: 0 0 12px 0;
          font-size: 18px;
          text-align: center;
        ">Scoreboard</h3>
        <div class="scoreboard-entries">
          ${scoreboardEntries}
        </div>
      </div>
    `;
  }

  private renderScoreboardEntry(entry: ScoreboardEntry): string {
    const isPlayerStyle = entry.isPlayer 
      ? 'background-color: rgba(74, 144, 226, 0.3); border-left: 4px solid #4a90e2;'
      : 'background-color: rgba(255, 255, 255, 0.05);';

    return `
      <div class="scoreboard-entry" style="
        ${isPlayerStyle}
        padding: 8px 12px;
        margin: 4px 0;
        border-radius: 4px;
        display: flex;
        justify-content: space-between;
        align-items: center;
      ">
        <span style="
          color: ${entry.isPlayer ? '#4a90e2' : '#fff'};
          font-weight: ${entry.isPlayer ? 'bold' : 'normal'};
        ">${this.escapeHtml(entry.teamName)}</span>
        <span style="
          color: ${entry.isPlayer ? '#4a90e2' : '#ccc'};
          font-weight: bold;
        ">${entry.score}</span>
      </div>
    `;
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  public getState(): Readonly<LayoutState> {
    return { ...this.state };
  }

  public updateConfig(updates: Partial<LayoutConfig>): void {
    this.state.config = { ...this.state.config, ...updates };
  }
}

export function createLayout(config?: LayoutConfig): Layout {
  return new Layout(config);
}

export function renderCenteredGrid(content: string, width = 800, height = 600): string {
  const layout = createLayout({ gridWidth: width, gridHeight: height });
  layout.setGridContent(content);
  return layout.render();
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '9a35a9f5ebc71f65e83ff408274437068be7102b862e2935ac1476754d238566',
  name: 'Layout',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;