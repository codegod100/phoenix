/**
 * System Integration - Entry Point
 * 
 * Generated from Phoenix IU: iu_system_integration
 * Source canonical nodes:
 *   - websocket_message_format
 *   - client_server_protocol  
 *   - game_state_serialization
 *   - error_protocol
 *   - websocket_upgrade_method
 *   - raw_websocket_frames
 *   - zero_dependency_architecture
 * 
 * This file wires together all generated components into a runnable server.
 * Uses raw TCP WebSocket upgrade handling to work around Bun HTTP upgrade bug.
 * 
 * Implementation constraints satisfied:
 *   - HTTP upgrade handled in request handler, not via 'upgrade' event
 *   - Raw WebSocket frame encoding without external libraries
 *   - Uses only Node.js built-in modules (http, crypto, net)
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createHash, randomBytes } from 'node:crypto';
import type { Socket } from 'node:net';

// Generated game modules
import { 
  GameStateManager, 
  GRID_SIZE, 
  ROUND_DURATION,
  type GameState,
  type TeamColor 
} from './game-state.js';

import { 
  PlayerManager, 
  MAX_PLAYERS, 
  PAINT_COOLDOWN_MS,
  type Player
} from './players.js';

import { generateUI } from './ui.html.js';

// Generated protocol
import {
  Messages,
  GridSerialization,
  type ErrorCode,
  type ServerMessage,
  type ClientMessage
} from './message-protocol.js';

// Re-export for consumers
export { GameStateManager, PlayerManager, Messages, GridSerialization };
export type { GameState, TeamColor, Player, ServerMessage, ClientMessage };

// ── Configuration ───────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT || '3000', 10);

// ── System State ─────────────────────────────────────────────────────────────
export interface SystemState {
  gameState: GameStateManager;
  playerManager: PlayerManager;
  connections: Map<string, WSConn>;
}

// ── WebSocket Connection Type ─────────────────────────────────────────────
export interface WSConn { 
  socket: Socket; 
  send: (obj: object) => void; 
  alive: boolean;
}

// ── Integration Class ────────────────────────────────────────────────────────
export class PixelWarsServer {
  private gameState: GameStateManager;
  private playerManager: PlayerManager;
  private connections = new Map<string, WSConn>();
  private httpServer: ReturnType<typeof createServer>;
  
  constructor() {
    this.gameState = new GameStateManager(this.onGameStateChange.bind(this));
    this.playerManager = new PlayerManager();
    this.httpServer = this.createHTTPServer();
  }
  
  // ── Game State Change Handler ─────────────────────────────────────────────
  private onGameStateChange(state: GameState): void {
    // Broadcast timer update
    this.broadcast(Messages.timer(state.timeRemaining, state.phase));
    
    // Broadcast winner on round end
    if (state.phase === 'ended') {
      const winner = this.gameState.getWinner();
      const teams: Record<string, { score: number; playerCount: number }> = {};
      for (const [color, team] of state.teams) {
        teams[color] = { score: team.score, playerCount: team.playerCount };
      }
      this.broadcast(Messages.winner(winner, teams));
    }
  }
  
  // ── Broadcast ──────────────────────────────────────────────────────────────
  private broadcast(msg: ServerMessage): void {
    for (const conn of this.connections.values()) {
      if (conn.alive) {
        conn.send(msg);
      }
    }
  }
  
  private broadcastPlayerCounts(): void {
    const counts = this.playerManager.getTeamCounts();
    const total = this.playerManager.getPlayerCount();
    const teams: Record<string, number> = {};
    for (const [color, count] of counts) {
      if (color) teams[color] = count;
    }
    this.broadcast(Messages.players(total, teams));
  }
  
  // ── HTTP Server ─────────────────────────────────────────────────────────────
  private createHTTPServer() {
    return createServer((req: IncomingMessage, res: ServerResponse) => {
      console.log('📥 Request:', req.method, req.url, 'Upgrade:', req.headers['upgrade']);
      
      // Check for WebSocket upgrade in the request handler
      // This works around a Bun bug where 'upgrade' event disconnects the socket
      const upgrade = req.headers['upgrade'];
      if (upgrade === 'websocket') {
        console.log('🔌 WebSocket upgrade detected');
        this.handleRawWebSocket(req, res);
        return;
      }
      
      if (req.method === 'GET' && (req.url === '/' || req.url === '/index.html')) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(generateUI());
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });
  }
  
  // ── WebSocket Handling (inside request handler to avoid Bun upgrade bug) ────
  private handleRawWebSocket(req: IncomingMessage, res: ServerResponse): void {
    console.log('🔌 WebSocket upgrade requested');
    
    // Get the underlying socket
    const socket = (req as any).socket as Socket | undefined;
    if (!socket) {
      console.log('❌ No socket available');
      res.writeHead(400);
      res.end('Bad request');
      return;
    }
    console.log('✅ Got socket, writable:', socket.writable, 'readable:', socket.readable);
    
    // Send upgrade response
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      console.log('❌ No Sec-WebSocket-Key header');
      socket.end();
      return;
    }
    
    const accept = createHash('sha1')
      .update(key + '258EAFA5-E914-47DA-95CA-C5AB0DC85B11')
      .digest('base64');
    
    const upgradeResponse = 
      'HTTP/1.1 101 Switching Protocols\r\n' +
      'Upgrade: websocket\r\n' +
      'Connection: Upgrade\r\n' +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`;
    
    console.log('📤 Sending upgrade response...');
    socket.write(upgradeResponse, (err) => {
      if (err) {
        console.log('❌ Upgrade write error:', err);
        return;
      }
      console.log('✅ Upgrade response sent');
      // Now handle as WebSocket
      this.setupWebSocketConnection(socket);
    });
  }
  
  // ── WebSocket Connection Setup ────────────────────────────────────────────
  private setupWebSocketConnection(socket: Socket): void {
    console.log('🔧 Setting up WebSocket connection, socket ready:', socket.readyState);
    
    // Create connection wrapper
    const conn: WSConn = {
      socket,
      alive: true,
      send: (obj: object) => {
        if (!conn.alive) {
          console.log('❌ Cannot send, connection not alive');
          return;
        }
        const data = Buffer.from(JSON.stringify(obj), 'utf8');
        const len = data.length;
        let header: Buffer;
        
        if (len < 126) {
          header = Buffer.alloc(2);
          header[0] = 0x81; header[1] = len;
        } else if (len < 65536) {
          header = Buffer.alloc(4);
          header[0] = 0x81; header[1] = 126;
          header.writeUInt16BE(len, 2);
        } else {
          header = Buffer.alloc(10);
          header[0] = 0x81; header[1] = 127;
          header.writeUInt32BE(0, 2);
          header.writeUInt32BE(len, 6);
        }
        const frame = Buffer.concat([header, data]);
        const result = socket.write(frame);
        console.log('📤 Frame sent:', result, 'bytes:', frame.length);
      },
    };

    console.log('👥 Checking room capacity...');
    // Check room capacity
    if (!this.playerManager.canAcceptPlayer()) {
      console.log('❌ Room full');
      conn.send(Messages.error('room_full', 'Room is full (max 20 players)'));
      socket.end();
      return;
    }

    console.log('➕ Adding player...');
    // Add player
    const { player, error } = this.playerManager.addPlayer();
    if (error) {
      console.log('❌ Failed to add player:', error);
      conn.send(Messages.error(error as ErrorCode, 'Could not join game'));
      socket.end();
      return;
    }
    console.log('✅ Player added:', player.id);

    // Store connection
    this.connections.set(player.id, conn);

    // Update game state with new player
    this.gameState.updateTeamPlayerCount(player.team, 1);

    // Send initial state
    console.log('📊 Preparing initial state...');
    const game = this.gameState.getState();
    const teams: Record<string, { score: number; playerCount: number }> = {};
    for (const [color, team] of game.teams) {
      teams[color] = { score: team.score, playerCount: team.playerCount };
    }
    
    console.log('📤 Sending state message...');
    conn.send(Messages.state({
      playerId: player.id,
      team: player.team,
      grid: GridSerialization.toFlat(game.grid),
      teams,
      timeRemaining: game.timeRemaining,
      phase: game.phase,
    }));
    console.log('✅ State message sent');

    // Broadcast player joined
    this.broadcastPlayerCounts();

    // Start round if first player
    if (this.playerManager.getPlayerCount() === 1 && game.timeRemaining === ROUND_DURATION) {
      this.gameState.startRound();
    }

    // Handle incoming messages
    console.log('👂 Setting up data listener...');
    let msgBuf = Buffer.alloc(0);
    socket.on('data', (chunk: Buffer) => {
      console.log('📥 Received data chunk:', chunk.length, 'bytes');
      msgBuf = Buffer.concat([msgBuf, chunk]);
      while (msgBuf.length >= 2) {
        let payloadLen = msgBuf[1] & 0x7f;
        let headerLen = 2;
        if (payloadLen === 126) headerLen = 4;
        else if (payloadLen === 127) headerLen = 10;
        const masked = (msgBuf[1] & 0x80) !== 0;
        const totalHeader = headerLen + (masked ? 4 : 0);
        
        if (payloadLen === 126 && msgBuf.length >= 4) payloadLen = msgBuf.readUInt16BE(2);
        else if (payloadLen === 127 && msgBuf.length >= 10) payloadLen = msgBuf.readUInt32BE(6);
        
        const frameLen = totalHeader + payloadLen;
        if (msgBuf.length < frameLen) {
          console.log('⏳ Incomplete frame, waiting for more data...');
          break;
        }
        
        const frame = msgBuf.subarray(0, frameLen);
        msgBuf = Buffer.from(msgBuf.subarray(frameLen));
        const txt = this.decodeWSFrame(frame);
        if (txt) {
          console.log('📦 Decoded frame:', txt.substring(0, 100));
          this.handleMessage(player.id, txt, conn);
        } else {
          console.log('⚠️ Failed to decode frame');
        }
      }
    });

    socket.on('close', () => {
      console.log('🔒 Socket closed for player:', player.id);
      this.removePlayer(player.id);
    });
    socket.on('error', (err) => {
      console.log('❌ Socket error for player:', player.id, err);
      this.removePlayer(player.id);
    });
    console.log('✅ Connection setup complete for player:', player.id);
  }
  
  // ── WebSocket Frame Decoder ────────────────────────────────────────────────
  private decodeWSFrame(buf: Buffer): string | null {
    if (buf.length < 2) return null;
    const opcode = buf[0] & 0x0f;
    if (opcode === 0x08) return null; // close
    if (opcode === 0x09) return null; // ping
    if (opcode !== 0x01) return null; // not text
    
    const masked = (buf[1] & 0x80) !== 0;
    let payloadLen = buf[1] & 0x7f;
    let off = 2;
    
    if (payloadLen === 126) { 
      payloadLen = buf.readUInt16BE(2); 
      off = 4; 
    } else if (payloadLen === 127) { 
      payloadLen = buf.readUInt32BE(6); 
      off = 10; 
    }
    
    if (masked) {
      const mask = buf.subarray(off, off + 4); 
      off += 4;
      const payload = Buffer.from(buf.subarray(off, off + payloadLen));
      for (let i = 0; i < payload.length; i++) payload[i] ^= mask[i % 4];
      return payload.toString('utf8');
    }
    return buf.subarray(off, off + payloadLen).toString('utf8');
  }
  
  // ── Message Handling ────────────────────────────────────────────────────────
  private handleMessage(playerId: string, raw: string, conn: WSConn): void {
    let msg: { type: string; payload?: { x?: number; y?: number } };
    try { msg = JSON.parse(raw); } catch { return; }

    const player = this.playerManager.getPlayer(playerId);
    if (!player) return;

    if (msg.type === 'paint') {
      const { x, y } = msg.payload || {};
      
      // Check cooldown
      const cooldown = this.playerManager.canPaint(playerId);
      if (!cooldown.allowed) {
        conn.send(Messages.error('too_fast', 'Painting too fast'));
        return;
      }

      // Validate bounds
      if (typeof x !== 'number' || typeof y !== 'number' ||
          x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE ||
          !Number.isInteger(x) || !Number.isInteger(y)) {
        conn.send(Messages.error('invalid_cell', 'Cell coordinates out of bounds'));
        return;
      }

      // Check game phase
      const state = this.gameState.getState();
      if (state.phase !== 'playing') {
        conn.send(Messages.error('round_not_active', 'Round is not active'));
        return;
      }

      // Execute paint
      const success = this.gameState.paintCell(x, y, player.team);
      
      if (success) {
        this.playerManager.recordPaint(playerId);
        this.broadcast(Messages.paintBroadcast(x, y, player.team, player.id));
      }
    }
  }
  
  // ── Player Removal ─────────────────────────────────────────────────────────
  private removePlayer(id: string): void {
    const player = this.playerManager.getPlayer(id);
    if (!player) return;

    this.gameState.updateTeamPlayerCount(player.team, -1);
    this.playerManager.removePlayer(id);

    const conn = this.connections.get(id);
    if (conn) {
      conn.alive = false;
      this.connections.delete(id);
    }

    setTimeout(() => {
      this.broadcastPlayerCounts();
    }, 5000);
  }
  
  // ── Public API ─────────────────────────────────────────────────────────────
  start(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.listen(PORT, () => {
        console.log(`\n  ⚔️  PIXEL WARS — http://localhost:${PORT}`);
        console.log(`  Using Phoenix-generated game logic`);
        console.log(`  Open in multiple browser tabs to play!\n`);
        resolve();
      });
    });
  }
  
  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        resolve();
      });
    });
  }
  
  getState(): SystemState {
    return {
      gameState: this.gameState,
      playerManager: this.playerManager,
      connections: new Map(this.connections),
    };
  }
}

// ── Standalone Entry Point ───────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const server = new PixelWarsServer();
  server.start();
}

// ── Phoenix Traceability ────────────────────────────────────────────────────
export const _phoenix = {
  iu_id: 'iu_system_integration',
  name: 'SystemIntegration',
  risk_tier: 'critical',
  canon_ids: [
    'websocket_message_format',
    'client_server_protocol',
    'game_state_serialization',
    'error_protocol',
    'websocket_upgrade_method',
    'raw_websocket_frames',
    'zero_dependency_architecture'
  ],
  generated_at: '2026-04-06T00:00:00Z',
  model_id: 'pi-agent',
  toolchain_version: 'phoenix-regen/1.0'
} as const;
