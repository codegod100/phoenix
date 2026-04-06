import { describe, it, expect, beforeEach } from 'vitest';
import { GameStateManager, GRID_SIZE, ROUND_DURATION, TEAM_COLORS } from '../game-state.js';

describe('GameStateManager', () => {
  let game: GameStateManager;
  let stateChanges: number;

  beforeEach(() => {
    stateChanges = 0;
    game = new GameStateManager(() => {
      stateChanges++;
    });
  });

  it('should create initial grid with correct dimensions', () => {
    const state = game.getState();
    expect(state.grid.length).toBe(GRID_SIZE);
    expect(state.grid[0].length).toBe(GRID_SIZE);
  });

  it('should have all cells initially empty', () => {
    const state = game.getState();
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        expect(state.grid[y][x]).toBeNull();
      }
    }
  });

  it('should initialize with 4 teams', () => {
    const state = game.getState();
    expect(state.teams.size).toBe(4);
    for (const color of TEAM_COLORS) {
      if (color) {
        expect(state.teams.has(color)).toBe(true);
      }
    }
  });

  it('should start in playing phase', () => {
    const state = game.getState();
    expect(state.phase).toBe('playing');
  });

  it('should start with full timer', () => {
    const state = game.getState();
    expect(state.timeRemaining).toBe(ROUND_DURATION);
  });

  it('should paint cell and update score', () => {
    const result = game.paintCell(5, 5, 'red');
    expect(result).toBe(true);

    const state = game.getState();
    expect(state.grid[5][5]).toBe('red');
    expect(state.teams.get('red')?.score).toBe(1);
  });

  it('should reject out-of-bounds paint', () => {
    expect(game.paintCell(-1, 5, 'red')).toBe(false);
    expect(game.paintCell(5, -1, 'red')).toBe(false);
    expect(game.paintCell(GRID_SIZE, 5, 'red')).toBe(false);
    expect(game.paintCell(5, GRID_SIZE, 'red')).toBe(false);
  });

  it('should reject invalid team color', () => {
    expect(game.paintCell(5, 5, 'purple' as any)).toBe(false);
    expect(game.paintCell(5, 5, null)).toBe(false);
  });

  it('should allow stealing territory', () => {
    game.paintCell(5, 5, 'red');
    game.paintCell(5, 5, 'blue');

    const state = game.getState();
    expect(state.grid[5][5]).toBe('blue');
    expect(state.teams.get('red')?.score).toBe(0);
    expect(state.teams.get('blue')?.score).toBe(1);
  });

  it('should update team player count', () => {
    game.updateTeamPlayerCount('red', 3);
    const state = game.getState();
    expect(state.teams.get('red')?.playerCount).toBe(3);
  });

  it('should track total painted cells equals sum of scores', () => {
    game.paintCell(0, 0, 'red');
    game.paintCell(1, 1, 'blue');
    game.paintCell(2, 2, 'green');

    const state = game.getState();
    const totalScore = 
      (state.teams.get('red')?.score || 0) +
      (state.teams.get('blue')?.score || 0) +
      (state.teams.get('green')?.score || 0) +
      (state.teams.get('yellow')?.score || 0);
    
    expect(totalScore).toBe(3);
  });

  it('should identify winner correctly', () => {
    game.paintCell(0, 0, 'red');
    game.paintCell(1, 0, 'red');
    game.paintCell(0, 1, 'blue');

    expect(game.getWinner()).toBe('red');
  });

  it('should handle tie (no winner)', () => {
    game.paintCell(0, 0, 'red');
    game.paintCell(0, 1, 'blue');

    expect(game.getWinner()).toBeNull();
  });
});
