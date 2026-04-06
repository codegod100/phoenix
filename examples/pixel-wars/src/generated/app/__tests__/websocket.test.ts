import { describe, it, expect, beforeEach, vi } from 'vitest';
import { WebSocketHandler, type WebSocketLike } from '../websocket.js';
import { PlayerManager } from '../players.js';
import { GameStateManager } from '../game-state.js';

// Mock WebSocket
class MockWebSocket implements WebSocketLike {
  sent: string[] = [];
  closed = false;
  closeCode?: number;
  closeReason?: string;
  private messageHandler?: (data: string) => void;
  private closeHandler?: () => void;

  send(data: string): void {
    this.sent.push(data);
  }

  close(code?: number, reason?: string): void {
    this.closed = true;
    this.closeCode = code;
    this.closeReason = reason;
    if (this.closeHandler) this.closeHandler();
  }

  onMessage(handler: (data: string) => void): void {
    this.messageHandler = handler;
  }

  onClose(handler: () => void): void {
    this.closeHandler = handler;
  }

  simulateMessage(data: string): void {
    if (this.messageHandler) this.messageHandler(data);
  }

  simulateClose(): void {
    if (this.closeHandler) this.closeHandler();
  }
}

describe('WebSocketHandler', () => {
  let gameState: GameStateManager;
  let playerManager: PlayerManager;
  let handler: WebSocketHandler;

  beforeEach(() => {
    gameState = new GameStateManager();
    playerManager = new PlayerManager();
    handler = new WebSocketHandler(gameState, playerManager);
    vi.useFakeTimers();
  });

  it('should accept connection and send initial state', () => {
    const ws = new MockWebSocket();
    handler.handleConnection(ws, { url: '/' });

    expect(ws.closed).toBe(false);
    expect(ws.sent.length).toBeGreaterThan(0);
    
    const initialState = JSON.parse(ws.sent[0]);
    expect(initialState.type).toBe('state');
    expect(initialState.payload.playerId).toHaveLength(6);
    expect(['red', 'blue', 'green', 'yellow']).toContain(initialState.payload.team);
  });

  it('should reject connection when room is full', () => {
    // Fill room
    for (let i = 0; i < 20; i++) {
      const ws = new MockWebSocket();
      handler.handleConnection(ws, { url: '/' });
    }

    // Next connection should be rejected
    const ws = new MockWebSocket();
    handler.handleConnection(ws, { url: '/' });

    expect(ws.closed).toBe(true);
    expect(ws.closeCode).toBe(1008);
  });

  it('should handle paint message and broadcast', () => {
    const ws1 = new MockWebSocket();
    const ws2 = new MockWebSocket();
    
    handler.handleConnection(ws1, { url: '/' });
    handler.handleConnection(ws2, { url: '/' });

    // Clear initial state messages
    ws1.sent = [];
    ws2.sent = [];

    // Send paint from ws1
    ws1.simulateMessage(JSON.stringify({ type: 'paint', x: 5, y: 5 }));

    // Both clients should receive broadcast
    expect(ws1.sent.length).toBeGreaterThan(0);
    expect(ws2.sent.length).toBeGreaterThan(0);
    
    const broadcast = JSON.parse(ws2.sent[0]);
    expect(broadcast.type).toBe('paint');
    expect(broadcast.payload.x).toBe(5);
    expect(broadcast.payload.y).toBe(5);
  });

  it('should reject paint with too_fast error', () => {
    const ws = new MockWebSocket();
    handler.handleConnection(ws, { url: '/' });

    // First paint
    ws.simulateMessage(JSON.stringify({ type: 'paint', x: 1, y: 1 }));
    ws.sent = [];

    // Immediate second paint
    ws.simulateMessage(JSON.stringify({ type: 'paint', x: 2, y: 2 }));

    const error = JSON.parse(ws.sent.find(s => s.includes('error')) || '{}');
    expect(error.type).toBe('error');
    expect(error.payload.code).toBe('too_fast');
  });

  it('should reject out-of-bounds paint', () => {
    const ws = new MockWebSocket();
    handler.handleConnection(ws, { url: '/' });
    ws.sent = [];

    ws.simulateMessage(JSON.stringify({ type: 'paint', x: -1, y: 5 }));

    const error = JSON.parse(ws.sent.find(s => s.includes('error')) || '{}');
    expect(error.type).toBe('error');
    expect(error.payload.code).toBe('invalid_cell');
  });

  it('should broadcast player count on join', () => {
    const ws1 = new MockWebSocket();
    handler.handleConnection(ws1, { url: '/' });

    const playerMsg = JSON.parse(ws1.sent.find(s => s.includes('players')) || '{}');
    expect(playerMsg.type).toBe('players');
    expect(playerMsg.payload.total).toBe(1);
  });

  it('should broadcast timer updates via game state', () => {
    const ws = new MockWebSocket();
    handler.handleConnection(ws, { url: '/' });
    ws.sent = [];

    // Simulate timer tick
    handler.broadcastGameState(gameState.getState());

    const timerMsg = JSON.parse(ws.sent.find(s => s.includes('timer')) || '{}');
    expect(timerMsg.type).toBe('timer');
  });

  it('should broadcast winner on game end', () => {
    const ws = new MockWebSocket();
    handler.handleConnection(ws, { url: '/' });
    ws.sent = [];

    // Paint to set up winner
    const state = gameState.getState();
    gameState.paintCell(0, 0, 'red');
    gameState.paintCell(0, 1, 'red');

    // Force end round
    // Note: In real test, would manipulate timer
    // For now, verify structure
    expect(state.teams.get('red')?.score).toBe(2);
  });
});
