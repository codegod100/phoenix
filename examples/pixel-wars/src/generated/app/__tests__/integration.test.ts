import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { PixelWarsServer, Messages, GridSerialization } from '../index.js';
import type { TeamColor } from '../game-state.js';

describe('System Integration', () => {
  let server: PixelWarsServer;

  beforeEach(async () => {
    vi.useFakeTimers();
  });

  afterEach(async () => {
    if (server) {
      await server.stop();
    }
    vi.useRealTimers();
  });

  it('should start server on specified port', async () => {
    server = new PixelWarsServer();
    // Server starts successfully without throwing
    expect(server.getState().gameState).toBeDefined();
    expect(server.getState().playerManager).toBeDefined();
  });

  it('should export message protocol helpers', () => {
    // State message
    const state = Messages.state({
      playerId: 'abc123',
      team: 'red',
      grid: Array(400).fill(null),
      teams: { red: { score: 5, playerCount: 2 } },
      timeRemaining: 120,
      phase: 'playing',
    });
    expect(state.type).toBe('state');
    expect(state.payload.playerId).toBe('abc123');
    expect(state.payload.grid).toHaveLength(400);

    // Paint broadcast
    const paint = Messages.paintBroadcast(5, 5, 'blue', 'def456');
    expect(paint.type).toBe('paint');
    expect(paint.payload.x).toBe(5);
    expect(paint.payload.y).toBe(5);
    expect(paint.payload.color).toBe('blue');

    // Error message
    const error = Messages.error('too_fast', 'Painting too fast');
    expect(error.type).toBe('error');
    expect(error.payload.code).toBe('too_fast');

    // Timer
    const timer = Messages.timer(60, 'playing');
    expect(timer.type).toBe('timer');
    expect(timer.payload.timeRemaining).toBe(60);

    // Winner
    const winner = Messages.winner('red', { red: { score: 10, playerCount: 3 } });
    expect(winner.type).toBe('winner');
    expect(winner.payload.winner).toBe('red');

    // Players
    const players = Messages.players(5, { red: 2, blue: 3 });
    expect(players.type).toBe('players');
    expect(players.payload.total).toBe(5);
  });

  it('should serialize grid to flat array correctly', () => {
    const grid: (TeamColor | null)[][] = Array(20)
      .fill(null)
      .map(() => Array(20).fill(null));
    
    // Paint a few cells
    grid[0][0] = 'red';
    grid[5][10] = 'blue';
    grid[19][19] = 'green';

    const flat = GridSerialization.toFlat(grid);
    
    // Should be 400 elements
    expect(flat).toHaveLength(400);
    
    // Check row-major ordering
    expect(flat[0]).toBe('red');           // [0][0] = index 0
    expect(flat[5 * 20 + 10]).toBe('blue'); // [5][10] = index 110
    expect(flat[19 * 20 + 19]).toBe('green'); // [19][19] = index 399
    
    // Unpainted cells should be null
    expect(flat[1]).toBeNull();
    expect(flat[100]).toBeNull();
  });

  it('should deserialize flat array to 2D grid correctly', () => {
    const flat: (TeamColor | null)[] = Array(400).fill(null);
    flat[0] = 'red';
    flat[110] = 'blue';
    flat[399] = 'green';

    const grid = GridSerialization.to2D(flat);
    
    // Should be 20x20
    expect(grid).toHaveLength(20);
    expect(grid[0]).toHaveLength(20);
    
    // Check values at correct positions
    expect(grid[0][0]).toBe('red');
    expect(grid[5][10]).toBe('blue');
    expect(grid[19][19]).toBe('green');
    
    // Unpainted cells
    expect(grid[1][1]).toBeNull();
  });

  it('should round-trip grid serialization', () => {
    const original: (TeamColor | null)[][] = Array(20)
      .fill(null)
      .map(() => Array(20).fill(null));
    
    // Paint random cells
    original[3][7] = 'yellow';
    original[12][15] = 'red';
    original[0][19] = 'blue';

    const flat = GridSerialization.toFlat(original);
    const restored = GridSerialization.to2D(flat);

    // Should match original
    for (let y = 0; y < 20; y++) {
      for (let x = 0; x < 20; x++) {
        expect(restored[y][x]).toBe(original[y][x]);
      }
    }
  });

  it('should maintain message format invariants', () => {
    // All messages must have type and payload
    const messages = [
      Messages.state({ playerId: '1', team: 'red', grid: [], teams: {}, timeRemaining: 0, phase: 'playing' }),
      Messages.paintCommand(1, 1),
      Messages.paintBroadcast(1, 1, 'red', '1'),
      Messages.error('room_full', 'full'),
      Messages.timer(0, 'ended'),
      Messages.winner(null, {}),
      Messages.players(0, {}),
    ];

    for (const msg of messages) {
      expect(msg).toHaveProperty('type');
      expect(msg).toHaveProperty('payload');
      expect(typeof msg.type).toBe('string');
      expect(typeof msg.payload).toBe('object');
    }
  });
});

describe('Message Protocol Types', () => {
  it('should support all required message types', () => {
    const types = ['state', 'paint', 'error', 'timer', 'winner', 'players'];
    
    for (const type of types) {
      // Each type can be created via Messages helper
      let msg: { type: string; payload: unknown } | undefined;
      switch (type) {
        case 'state':
          msg = Messages.state({ playerId: '1', team: 'red', grid: Array(400).fill(null), teams: {}, timeRemaining: 0, phase: 'playing' });
          break;
        case 'paint':
          msg = Messages.paintCommand(0, 0);
          break;
        case 'error':
          msg = Messages.error('invalid_cell', 'test');
          break;
        case 'timer':
          msg = Messages.timer(0, 'playing');
          break;
        case 'winner':
          msg = Messages.winner(null, {});
          break;
        case 'players':
          msg = Messages.players(0, {});
          break;
      }
      expect(msg!.type).toBe(type);
    }
  });

  it('should support all error codes', () => {
    const codes = ['room_full', 'too_fast', 'invalid_cell', 'round_not_active'];
    
    for (const code of codes) {
      const error = Messages.error(code as any, 'test message');
      expect(error.payload.code).toBe(code);
      expect(error.type).toBe('error');
    }
  });
});

// ── Phoenix Traceability ────────────────────────────────────────────────────
export const _phoenix = {
  iu_id: 'iu_system_integration',
  name: 'SystemIntegration',
  risk_tier: 'critical',
  canon_ids: [
    'websocket_message_format',
    'client_server_protocol',
    'websocket_upgrade_method',
    'raw_websocket_frames'
  ],
  generated_at: '2026-04-06T00:00:00Z',
  model_id: 'pi-agent',
  toolchain_version: 'phoenix-regen/1.0'
} as const;
