/**
 * WebSocketHandler - High Tier IU
 * Handles WebSocket connections and message routing
 * 
 * Generated from canonical nodes:
 * - websocket_server
 * - websocket_messaging
 * - paint_broadcast
 * - ws_initial_state_send
 */

import { PlayerManager, MAX_PLAYERS, type Player } from './players.js';
import { GameStateManager, type GameState, type TeamColor } from './game-state.js';

export interface WebSocketMessage {
  type: 'paint' | 'state' | 'error' | 'broadcast' | 'timer' | 'scores' | 'winner' | 'players';
  payload?: unknown;
}

export interface PaintMessage {
  x: number;
  y: number;
}

export interface ErrorMessage {
  code: string;
  message: string;
}

export class WebSocketHandler {
  private clients = new Map<string, WebSocketClient>();
  
  constructor(
    private gameState: GameStateManager,
    private playerManager: PlayerManager,
  ) {}

  handleConnection(ws: WebSocketLike, request: { url?: string }): void {
    // Check room capacity
    if (!this.playerManager.canAcceptPlayer()) {
      this.sendError(ws, 'room_full', 'Room is full (max 20 players)');
      ws.close(1008, 'Room full');
      return;
    }

    // Add player
    const { player, error } = this.playerManager.addPlayer();
    if (error) {
      this.sendError(ws, error, 'Could not join game');
      ws.close(1008, error);
      return;
    }

    // Wrap and store client
    const client = new WebSocketClient(ws, player.id);
    this.clients.set(player.id, client);

    // Send initial state
    this.sendInitialState(client);

    // Broadcast player count change
    this.broadcastPlayerCount();

    // Setup message handler
    ws.onMessage((data: string) => {
      this.handleMessage(client, data);
    });

    // Setup disconnect handler
    ws.onClose(() => {
      this.handleDisconnect(client);
    });
  }

  private sendInitialState(client: WebSocketClient): void {
    const player = this.playerManager.getPlayer(client.playerId);
    if (!player) return;

    const gameState = this.gameState.getState();
    
    this.send(client.ws, {
      type: 'state',
      payload: {
        playerId: player.id,
        team: player.team,
        grid: gameState.grid,
        timeRemaining: gameState.timeRemaining,
        phase: gameState.phase,
        teams: Object.fromEntries(gameState.teams),
      },
    });
  }

  private handleMessage(client: WebSocketClient, data: string): void {
    try {
      const message = JSON.parse(data) as PaintMessage & { type: string };
      
      if (message.type === 'paint') {
        this.handlePaintMessage(client, message);
      }
    } catch (err) {
      this.sendError(client.ws, 'invalid_message', 'Invalid message format');
    }
  }

  private handlePaintMessage(client: WebSocketClient, msg: PaintMessage): void {
    const player = this.playerManager.getPlayer(client.playerId);
    if (!player) return;

    // Check cooldown
    const cooldown = this.playerManager.canPaint(player.id);
    if (!cooldown.allowed) {
      this.send(client.ws, {
        type: 'error',
        payload: { code: cooldown.error, remainingMs: cooldown.remainingMs },
      });
      return;
    }

    // Validate bounds
    if (msg.x < 0 || msg.x >= 20 || msg.y < 0 || msg.y >= 20) {
      this.send(client.ws, {
        type: 'error',
        payload: { code: 'invalid_cell', message: 'Cell coordinates out of bounds' },
      });
      return;
    }

    // Execute paint
    const success = this.gameState.paintCell(msg.x, msg.y, player.team);
    
    if (success) {
      this.playerManager.recordPaint(player.id);
      
      // Broadcast to all clients
      this.broadcast({
        type: 'paint',
        payload: {
          x: msg.x,
          y: msg.y,
          color: player.team,
          playerId: player.id,
        },
      });
    }
  }

  private handleDisconnect(client: WebSocketClient): void {
    this.playerManager.removePlayer(client.playerId);
    this.clients.delete(client.playerId);
    
    // Delay broadcast to allow for quick reconnects
    setTimeout(() => {
      this.broadcastPlayerCount();
    }, 5000);
  }

  private broadcast(message: WebSocketMessage): void {
    const data = JSON.stringify(message);
    for (const client of this.clients.values()) {
      client.ws.send(data);
    }
  }

  private broadcastPlayerCount(): void {
    const count = this.playerManager.getPlayerCount();
    const teamCounts = this.playerManager.getTeamCounts();
    
    this.broadcast({
      type: 'players',
      payload: {
        total: count,
        teams: Object.fromEntries(teamCounts),
      },
    });
  }

  broadcastGameState(state: GameState): void {
    if (state.phase === 'ended') {
      const winner = this.gameState.getWinner();
      this.broadcast({
        type: 'winner',
        payload: {
          winner,
          teams: Object.fromEntries(state.teams),
        },
      });
    } else {
      this.broadcast({
        type: 'timer',
        payload: {
          timeRemaining: state.timeRemaining,
          phase: state.phase,
        },
      });
    }
  }

  private send(ws: WebSocketLike, message: WebSocketMessage): void {
    ws.send(JSON.stringify(message));
  }

  private sendError(ws: WebSocketLike, code: string, message: string): void {
    this.send(ws, {
      type: 'error',
      payload: { code, message },
    });
  }
}

// WebSocket abstraction for testability
export interface WebSocketLike {
  send(data: string): void;
  close(code?: number, reason?: string): void;
  onMessage(handler: (data: string) => void): void;
  onClose(handler: () => void): void;
}

class WebSocketClient {
  constructor(
    public ws: WebSocketLike,
    public playerId: string,
  ) {}
}
