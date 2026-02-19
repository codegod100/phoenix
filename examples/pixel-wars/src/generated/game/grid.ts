export interface GridCell {
  isEmpty: boolean;
  value?: any;
}

export interface GridPosition {
  row: number;
  col: number;
}

export interface GridDimensions {
  rows: number;
  cols: number;
}

export class Grid {
  private cells: GridCell[][];
  private dimensions: GridDimensions;

  constructor(rows: number = 10, cols: number = 10) {
    this.dimensions = { rows, cols };
    this.cells = this.initializeEmptyCells();
  }

  private initializeEmptyCells(): GridCell[][] {
    const cells: GridCell[][] = [];
    for (let row = 0; row < this.dimensions.rows; row++) {
      cells[row] = [];
      for (let col = 0; col < this.dimensions.cols; col++) {
        cells[row][col] = { isEmpty: true };
      }
    }
    return cells;
  }

  public getCell(position: GridPosition): GridCell | null {
    if (!this.isValidPosition(position)) {
      return null;
    }
    return this.cells[position.row][position.col];
  }

  public setCell(position: GridPosition, value: any): boolean {
    if (!this.isValidPosition(position)) {
      return false;
    }
    this.cells[position.row][position.col] = {
      isEmpty: false,
      value: value
    };
    return true;
  }

  public clearCell(position: GridPosition): boolean {
    if (!this.isValidPosition(position)) {
      return false;
    }
    this.cells[position.row][position.col] = { isEmpty: true };
    return true;
  }

  public isCellEmpty(position: GridPosition): boolean {
    const cell = this.getCell(position);
    return cell ? cell.isEmpty : false;
  }

  public getDimensions(): GridDimensions {
    return { ...this.dimensions };
  }

  public getAllCells(): GridCell[][] {
    return this.cells.map(row => row.map(cell => ({ ...cell })));
  }

  public clearAll(): void {
    this.cells = this.initializeEmptyCells();
  }

  public getEmptyCells(): GridPosition[] {
    const emptyCells: GridPosition[] = [];
    for (let row = 0; row < this.dimensions.rows; row++) {
      for (let col = 0; col < this.dimensions.cols; col++) {
        if (this.cells[row][col].isEmpty) {
          emptyCells.push({ row, col });
        }
      }
    }
    return emptyCells;
  }

  public getOccupiedCells(): GridPosition[] {
    const occupiedCells: GridPosition[] = [];
    for (let row = 0; row < this.dimensions.rows; row++) {
      for (let col = 0; col < this.dimensions.cols; col++) {
        if (!this.cells[row][col].isEmpty) {
          occupiedCells.push({ row, col });
        }
      }
    }
    return occupiedCells;
  }

  private isValidPosition(position: GridPosition): boolean {
    return position.row >= 0 && 
           position.row < this.dimensions.rows && 
           position.col >= 0 && 
           position.col < this.dimensions.cols;
  }
}

export function createGrid(rows?: number, cols?: number): Grid {
  return new Grid(rows, cols);
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '076f6719d071712bc9eabad5d3df9adf59f4ed9cb24991a72f6ad87f06168ca0',
  name: 'Grid',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;