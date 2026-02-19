export interface GridCell {
  x: number;
  y: number;
  ownerId: string | null;
  teamColor: string | null;
}

export interface GridState {
  cells: Map<string, GridCell>;
  gridSize: number;
  cellSize: number;
}

export interface GridRenderOptions {
  gridSize: number;
  onCellClick: (x: number, y: number) => void;
}

export interface CanvasLike {
  width: number;
  height: number;
  style: { cursor: string };
  addEventListener(type: string, listener: (event: any) => void): void;
  removeEventListener(type: string, listener: (event: any) => void): void;
  getBoundingClientRect(): { left: number; top: number };
  getContext(type: string): CanvasRenderingContext2DLike | null;
}

export interface CanvasRenderingContext2DLike {
  clearRect(x: number, y: number, width: number, height: number): void;
  fillRect(x: number, y: number, width: number, height: number): void;
  beginPath(): void;
  moveTo(x: number, y: number): void;
  lineTo(x: number, y: number): void;
  stroke(): void;
  save(): void;
  restore(): void;
  fillStyle: string;
  strokeStyle: string;
  lineWidth: number;
  shadowColor: string;
  shadowBlur: number;
}

export class GridRenderer {
  private canvas: CanvasLike | null = null;
  private ctx: CanvasRenderingContext2DLike | null = null;
  private gridSize: number;
  private cellSize: number;
  private state: GridState;
  private hoveredCell: { x: number; y: number } | null = null;
  private onCellClick: (x: number, y: number) => void;
  private mouseMoveHandler: (event: any) => void;
  private mouseLeaveHandler: () => void;
  private clickHandler: (event: any) => void;

  constructor(options: GridRenderOptions) {
    this.gridSize = options.gridSize;
    this.cellSize = 500 / this.gridSize;
    this.onCellClick = options.onCellClick;

    this.state = {
      cells: new Map(),
      gridSize: this.gridSize,
      cellSize: this.cellSize
    };

    this.mouseMoveHandler = (event: any) => {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / this.cellSize);
      const y = Math.floor((event.clientY - rect.top) / this.cellSize);

      if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
        if (!this.hoveredCell || this.hoveredCell.x !== x || this.hoveredCell.y !== y) {
          this.hoveredCell = { x, y };
          this.render();
        }
      } else {
        if (this.hoveredCell) {
          this.hoveredCell = null;
          this.render();
        }
      }
    };

    this.mouseLeaveHandler = () => {
      if (this.hoveredCell) {
        this.hoveredCell = null;
        this.render();
      }
    };

    this.clickHandler = (event: any) => {
      if (!this.canvas) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = Math.floor((event.clientX - rect.left) / this.cellSize);
      const y = Math.floor((event.clientY - rect.top) / this.cellSize);

      if (x >= 0 && x < this.gridSize && y >= 0 && y < this.gridSize) {
        this.onCellClick(x, y);
      }
    };
  }

  public setCanvas(canvas: CanvasLike): void {
    this.canvas = canvas;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D rendering context');
    }
    this.ctx = ctx;
    this.setupCanvas();
    this.attachEventListeners();
  }

  private setupCanvas(): void {
    if (!this.canvas) return;
    this.canvas.width = 500;
    this.canvas.height = 500;
    this.canvas.style.cursor = 'pointer';
  }

  private attachEventListeners(): void {
    if (!this.canvas) return;
    this.canvas.addEventListener('mousemove', this.mouseMoveHandler);
    this.canvas.addEventListener('mouseleave', this.mouseLeaveHandler);
    this.canvas.addEventListener('click', this.clickHandler);
  }

  public updateCell(x: number, y: number, ownerId: string | null, teamColor: string | null): void {
    const key = `${x},${y}`;
    this.state.cells.set(key, { x, y, ownerId, teamColor });
    this.render();
  }

  public updateGrid(cells: GridCell[]): void {
    this.state.cells.clear();
    for (const cell of cells) {
      const key = `${cell.x},${cell.y}`;
      this.state.cells.set(key, cell);
    }
    this.render();
  }

  private render(): void {
    if (!this.ctx) return;
    this.ctx.clearRect(0, 0, 500, 500);

    // Render all cells
    for (let x = 0; x < this.gridSize; x++) {
      for (let y = 0; y < this.gridSize; y++) {
        this.renderCell(x, y);
      }
    }

    // Render grid lines
    this.renderGridLines();
  }

  private renderCell(x: number, y: number): void {
    if (!this.ctx) return;
    const key = `${x},${y}`;
    const cell = this.state.cells.get(key);
    const pixelX = x * this.cellSize;
    const pixelY = y * this.cellSize;

    // Base cell color
    if (cell && cell.ownerId && cell.teamColor) {
      // Owned cell with team color and glow effect
      this.ctx.fillStyle = cell.teamColor;
      this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);

      // Add glow effect
      this.ctx.save();
      this.ctx.shadowColor = cell.teamColor;
      this.ctx.shadowBlur = 8;
      this.ctx.fillStyle = cell.teamColor;
      this.ctx.fillRect(pixelX + 2, pixelY + 2, this.cellSize - 4, this.cellSize - 4);
      this.ctx.restore();
    } else {
      // Empty cell - dark gray
      this.ctx.fillStyle = '#2a2a3e';
      this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
    }

    // Hover highlight
    if (this.hoveredCell && this.hoveredCell.x === x && this.hoveredCell.y === y) {
      this.ctx.save();
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.2)';
      this.ctx.fillRect(pixelX, pixelY, this.cellSize, this.cellSize);
      this.ctx.restore();
    }
  }

  private renderGridLines(): void {
    if (!this.ctx) return;
    this.ctx.strokeStyle = '#1a1a2e';
    this.ctx.lineWidth = 1;

    // Vertical lines
    for (let x = 0; x <= this.gridSize; x++) {
      const pixelX = x * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(pixelX, 0);
      this.ctx.lineTo(pixelX, 500);
      this.ctx.stroke();
    }

    // Horizontal lines
    for (let y = 0; y <= this.gridSize; y++) {
      const pixelY = y * this.cellSize;
      this.ctx.beginPath();
      this.ctx.moveTo(0, pixelY);
      this.ctx.lineTo(500, pixelY);
      this.ctx.stroke();
    }
  }

  public getCanvas(): CanvasLike | null {
    return this.canvas;
  }

  public destroy(): void {
    if (this.canvas) {
      this.canvas.removeEventListener('mousemove', this.mouseMoveHandler);
      this.canvas.removeEventListener('mouseleave', this.mouseLeaveHandler);
      this.canvas.removeEventListener('click', this.clickHandler);
    }
  }
}

export function createGridRenderer(gridSize: number, onCellClick: (x: number, y: number) => void): GridRenderer {
  return new GridRenderer({
    gridSize,
    onCellClick
  });
}

export function generateGridHTML(containerId: string): string {
  return `<div id="${containerId}" style="display: flex; justify-content: center; align-items: center; width: 100%; height: 100%;"><canvas width="500" height="500" style="cursor: pointer;"></canvas></div>`;
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'd219e8bbb48e26fb3e3dad39edc3d9dd63fcdac50788f17f8224cb924096e840',
  name: 'Grid Rendering',
  risk_tier: 'medium',
  canon_ids: [6 as const],
} as const;