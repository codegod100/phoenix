import { EventEmitter } from 'node:events';

export interface PaintRequest {
  playerId: string;
  teamColor: string;
  x: number;
  y: number;
  timestamp: number;
}

export interface PaintResult {
  success: boolean;
  error?: 'too_fast' | 'invalid_cell';
  paintRequest?: PaintRequest;
}

export interface GridCell {
  x: number;
  y: number;
  color: string | null;
  lastPaintedBy?: string;
  lastPaintedAt?: number;
}

export interface PaintBroadcast {
  type: 'paint';
  playerId: string;
  teamColor: string;
  x: number;
  y: number;
  timestamp: number;
}

export class PaintingSystem extends EventEmitter {
  private readonly grid: Map<string, GridCell>;
  private readonly playerCooldowns: Map<string, number>;
  private readonly gridWidth: number;
  private readonly gridHeight: number;
  private readonly cooldownMs: number = 500;

  constructor(gridWidth: number, gridHeight: number) {
    super();
    this.gridWidth = gridWidth;
    this.gridHeight = gridHeight;
    this.grid = new Map();
    this.playerCooldowns = new Map();
    
    // Initialize empty grid
    for (let x = 0; x < gridWidth; x++) {
      for (let y = 0; y < gridHeight; y++) {
        const key = this.getCellKey(x, y);
        this.grid.set(key, { x, y, color: null });
      }
    }
  }

  private getCellKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  private isValidCoordinate(x: number, y: number): boolean {
    return x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight;
  }

  private checkCooldown(playerId: string, currentTime: number): boolean {
    const lastPaintTime = this.playerCooldowns.get(playerId);
    if (lastPaintTime === undefined) {
      return true;
    }
    return (currentTime - lastPaintTime) >= this.cooldownMs;
  }

  public paint(request: PaintRequest): PaintResult {
    const { playerId, teamColor, x, y, timestamp } = request;

    // Validate coordinates
    if (!this.isValidCoordinate(x, y)) {
      return {
        success: false,
        error: 'invalid_cell'
      };
    }

    // Check cooldown
    if (!this.checkCooldown(playerId, timestamp)) {
      return {
        success: false,
        error: 'too_fast'
      };
    }

    // Paint the cell (overwrite existing color)
    const cellKey = this.getCellKey(x, y);
    const cell = this.grid.get(cellKey)!;
    
    cell.color = teamColor;
    cell.lastPaintedBy = playerId;
    cell.lastPaintedAt = timestamp;

    // Update player cooldown
    this.playerCooldowns.set(playerId, timestamp);

    // Broadcast to all connected players
    const broadcast: PaintBroadcast = {
      type: 'paint',
      playerId,
      teamColor,
      x,
      y,
      timestamp
    };

    this.emit('paint_broadcast', broadcast);

    return {
      success: true,
      paintRequest: request
    };
  }

  public getCell(x: number, y: number): GridCell | null {
    if (!this.isValidCoordinate(x, y)) {
      return null;
    }
    const cellKey = this.getCellKey(x, y);
    return this.grid.get(cellKey) || null;
  }

  public getGrid(): GridCell[][] {
    const result: GridCell[][] = [];
    for (let x = 0; x < this.gridWidth; x++) {
      result[x] = [];
      for (let y = 0; y < this.gridHeight; y++) {
        const cell = this.getCell(x, y);
        result[x][y] = cell!;
      }
    }
    return result;
  }

  public getPlayerLastPaintTime(playerId: string): number | undefined {
    return this.playerCooldowns.get(playerId);
  }

  public getRemainingCooldown(playerId: string, currentTime: number): number {
    const lastPaintTime = this.playerCooldowns.get(playerId);
    if (lastPaintTime === undefined) {
      return 0;
    }
    const elapsed = currentTime - lastPaintTime;
    return Math.max(0, this.cooldownMs - elapsed);
  }
}

export function createPaintingSystem(gridWidth: number, gridHeight: number): PaintingSystem {
  return new PaintingSystem(gridWidth, gridHeight);
}

export function validatePaintRequest(request: Partial<PaintRequest>): request is PaintRequest {
  return (
    typeof request.playerId === 'string' &&
    typeof request.teamColor === 'string' &&
    typeof request.x === 'number' &&
    typeof request.y === 'number' &&
    typeof request.timestamp === 'number' &&
    request.playerId.length > 0 &&
    request.teamColor.length > 0 &&
    Number.isInteger(request.x) &&
    Number.isInteger(request.y) &&
    request.x >= 0 &&
    request.y >= 0 &&
    request.timestamp > 0
  );
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '87e1bdd71ee393347bccfae9daf2ed4a50a148cb1a1ef50bf02d87f9cdaeea9e',
  name: 'Painting',
  risk_tier: 'high',
  canon_ids: [7 as const],
} as const;