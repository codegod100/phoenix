/**
 * GameStateManager - Critical Tier IU
 * Manages the game grid, scores, and round state
 * 
 * Generated from canonical nodes:
 * - grid_dimensions_constraint
 * - grid_memory_storage
 * - cell_addressing_system
 * - team_system_definition
 * - score_calculation
 * - round_timer_system
 * - win_condition
 * - round_reset_mechanism
 */

export type TeamColor = 'red' | 'blue' | 'green' | 'yellow' | null;

export interface Cell {
  x: number;
  y: number;
  owner: TeamColor;
}

export interface TeamState {
  color: TeamColor;
  score: number;
  playerCount: number;
}

export type GamePhase = 'playing' | 'ended' | 'between_rounds';

export interface GameState {
  grid: TeamColor[][]; // 20x20 grid
  teams: Map<string, TeamState>; // key: team color
  phase: GamePhase;
  timeRemaining: number; // seconds
  roundNumber: number;
}

export const GRID_SIZE = 20;
export const ROUND_DURATION = 120; // seconds
export const BETWEEN_ROUNDS_DURATION = 10; // seconds
export const TEAM_COLORS: TeamColor[] = ['red', 'blue', 'green', 'yellow'];

export const TEAM_COLORS_HEX: Record<string, string> = {
  red: '#ff4757',
  blue: '#3742fa',
  green: '#2ed573',
  yellow: '#ffa502',
};

export class GameStateManager {
  private state: GameState;
  private onStateChange?: (state: GameState) => void;
  private timerInterval?: ReturnType<typeof setInterval>;

  constructor(onStateChange?: (state: GameState) => void) {
    this.onStateChange = onStateChange;
    this.state = this.createInitialState();
  }

  private createInitialState(): GameState {
    const grid: TeamColor[][] = Array(GRID_SIZE)
      .fill(null)
      .map(() => Array(GRID_SIZE).fill(null));

    const teams = new Map<string, TeamState>();
    for (const color of TEAM_COLORS) {
      if (color) {
        teams.set(color, { color, score: 0, playerCount: 0 });
      }
    }

    return {
      grid,
      teams,
      phase: 'playing',
      timeRemaining: ROUND_DURATION,
      roundNumber: 1,
    };
  }

  getState(): GameState {
    return { ...this.state, grid: this.state.grid.map(row => [...row]) };
  }

  startRound(): void {
    this.clearTimer();
    this.state = this.createInitialState();
    this.startTimer();
    this.notifyStateChange();
  }

  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.state.phase === 'playing') {
        this.state.timeRemaining--;
        
        if (this.state.timeRemaining <= 0) {
          this.endRound();
        }
        
        this.notifyStateChange();
      }
    }, 1000);
  }

  private clearTimer(): void {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = undefined;
    }
  }

  private endRound(): void {
    this.state.phase = 'ended';
    this.clearTimer();
    
    // Calculate winner
    let winner: TeamColor = null;
    let maxScore = -1;
    
    for (const [color, team] of this.state.teams) {
      if (team.score > maxScore) {
        maxScore = team.score;
        winner = team.color;
      }
    }

    this.notifyStateChange();
    
    // Start between-rounds countdown
    setTimeout(() => {
      this.state.phase = 'between_rounds';
      this.state.timeRemaining = BETWEEN_ROUNDS_DURATION;
      this.notifyStateChange();
      
      setTimeout(() => {
        this.startRound();
      }, BETWEEN_ROUNDS_DURATION * 1000);
    }, 5000); // Show winner for 5 seconds
  }

  paintCell(x: number, y: number, color: TeamColor): boolean {
    // Validate bounds
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) {
      return false;
    }

    // Validate color
    if (!color || !TEAM_COLORS.includes(color)) {
      return false;
    }

    // Can only paint during playing phase
    if (this.state.phase !== 'playing') {
      return false;
    }

    const previousOwner = this.state.grid[y][x];
    
    // Update grid
    this.state.grid[y][x] = color;
    
    // Update scores
    if (previousOwner) {
      const prevTeam = this.state.teams.get(previousOwner);
      if (prevTeam) {
        prevTeam.score--;
      }
    }
    
    const newTeam = this.state.teams.get(color);
    if (newTeam) {
      newTeam.score++;
    }

    this.notifyStateChange();
    return true;
  }

  updateTeamPlayerCount(color: TeamColor, delta: number): void {
    if (!color) return;
    
    const team = this.state.teams.get(color);
    if (team) {
      team.playerCount = Math.max(0, team.playerCount + delta);
      this.notifyStateChange();
    }
  }

  getWinner(): TeamColor {
    let winner: TeamColor = null;
    let maxScore = -1;
    let tie = false;
    
    for (const [color, team] of this.state.teams) {
      if (team.score > maxScore) {
        maxScore = team.score;
        winner = team.color;
        tie = false;
      } else if (team.score === maxScore && team.score > 0) {
        tie = true;
      }
    }
    
    return tie ? null : winner;
  }

  private notifyStateChange(): void {
    if (this.onStateChange) {
      this.onStateChange(this.getState());
    }
  }

  dispose(): void {
    this.clearTimer();
  }
}
