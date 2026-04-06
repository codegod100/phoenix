/**
 * Message Protocol - Generated from Phoenix canonical nodes
 * 
 * Source: websocket_message_format, client_server_protocol, game_state_serialization
 * 
 * Defines all WebSocket message types between client and server.
 * All messages use format: { type: string, payload: object }
 */

import type { TeamColor } from './game-state.js';

// Message type discriminants
export type MessageType = 
  | 'state' 
  | 'paint' 
  | 'error' 
  | 'timer' 
  | 'winner' 
  | 'players';

// Base message wrapper - all messages use this format
export interface Message<T extends MessageType, P> {
  type: T;
  payload: P;
}

// State message: sent on initial connection
export interface StatePayload {
  playerId: string;
  team: TeamColor;
  grid: (TeamColor | null)[];  // Flat 400-element array (20x20 row-major)
  teams: Record<string, { score: number; playerCount: number }>;
  timeRemaining: number;
  phase: 'playing' | 'ended' | 'between_rounds';
}
export type StateMessage = Message<'state', StatePayload>;

// Paint command: client → server
export interface PaintCommandPayload {
  x: number;
  y: number;
}
export type PaintCommandMessage = Message<'paint', PaintCommandPayload>;

// Paint broadcast: server → all clients
export interface PaintBroadcastPayload {
  x: number;
  y: number;
  color: TeamColor;
  playerId: string;
}
export type PaintBroadcastMessage = Message<'paint', PaintBroadcastPayload>;

// Error message: server → client
export type ErrorCode = 'room_full' | 'too_fast' | 'invalid_cell' | 'round_not_active';

export interface ErrorPayload {
  code: ErrorCode;
  message: string;
}
export type ErrorMessage = Message<'error', ErrorPayload>;

// Timer update: server broadcasts every second
export interface TimerPayload {
  timeRemaining: number;
  phase: 'playing' | 'ended' | 'between_rounds';
}
export type TimerMessage = Message<'timer', TimerPayload>;

// Winner announcement: server broadcasts when round ends
export interface WinnerPayload {
  winner: TeamColor | null;
  teams: Record<string, { score: number; playerCount: number }>;
}
export type WinnerMessage = Message<'winner', WinnerPayload>;

// Player count update: server broadcasts on join/leave
export interface PlayersPayload {
  total: number;
  teams: Record<string, number>;  // color -> playerCount
}
export type PlayersMessage = Message<'players', PlayersPayload>;

// Union type for all server-to-client messages
export type ServerMessage = 
  | StateMessage
  | PaintBroadcastMessage
  | ErrorMessage
  | TimerMessage
  | WinnerMessage
  | PlayersMessage;

// Union type for all client-to-server messages
export type ClientMessage = PaintCommandMessage;

// Helper to create messages with correct format
export const Messages = {
  state(payload: StatePayload): StateMessage {
    return { type: 'state', payload };
  },
  
  paintCommand(x: number, y: number): PaintCommandMessage {
    return { type: 'paint', payload: { x, y } };
  },
  
  paintBroadcast(x: number, y: number, color: TeamColor, playerId: string): PaintBroadcastMessage {
    return { type: 'paint', payload: { x, y, color, playerId } };
  },
  
  error(code: ErrorCode, message: string): ErrorMessage {
    return { type: 'error', payload: { code, message } };
  },
  
  timer(timeRemaining: number, phase: TimerPayload['phase']): TimerMessage {
    return { type: 'timer', payload: { timeRemaining, phase } };
  },
  
  winner(winner: TeamColor | null, teams: WinnerPayload['teams']): WinnerMessage {
    return { type: 'winner', payload: { winner, teams } };
  },
  
  players(total: number, teams: PlayersPayload['teams']): PlayersMessage {
    return { type: 'players', payload: { total, teams } };
  },
};

// Grid serialization helpers
export const GridSerialization = {
  // Convert 2D grid to flat array
  toFlat(grid: (TeamColor | null)[][]): (TeamColor | null)[] {
    const GRID_SIZE = 20;
    const flat: (TeamColor | null)[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        flat.push(grid[y][x]);
      }
    }
    return flat;
  },
  
  // Convert flat array to 2D grid
  to2D(flat: (TeamColor | null)[]): (TeamColor | null)[][] {
    const GRID_SIZE = 20;
    const grid: (TeamColor | null)[][] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[y] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        grid[y][x] = flat[y * GRID_SIZE + x];
      }
    }
    return grid;
  },
};

// ── Phoenix Traceability ────────────────────────────────────────────────────
export const _phoenix = {
  iu_id: 'iu_system_integration',
  name: 'SystemIntegration',
  risk_tier: 'critical',
  canon_ids: [
    'websocket_message_format',
    'client_server_protocol',
    'game_state_serialization',
    'error_protocol'
  ],
  generated_at: '2026-04-06T00:00:00Z',
  model_id: 'pi-agent',
  toolchain_version: 'phoenix-regen/1.0'
} as const;
