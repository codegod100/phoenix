import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createHash } from 'node:crypto';
import { EventEmitter } from 'node:events';

export interface Player {
  id: string;
  connected: boolean;
  lastSeen: number;
}

export interface GameState {
  grid: number[][];
  players: Map<string, Player>;
  gameEndTime: number;
}

export interface ConnectionMessage {
  type: 'init' | 'player_update';
  data: {
    playerId?: string;
    grid?: number[][];
    players?: Array<{ id: string; connected: boolean }>;
    remainingTime?: number;
    playerCount?: number;
  };
}

export interface WebSocketLike {
  send(data: string): void;
  close(): void;
  on(event: 'message' | 'close', handler: (data?: any) => void): void;
}

export class ConnectionHandler extends EventEmitter {
  private server: ReturnType<typeof createServer>;
  private connections = new Map<string, WebSocketLike>();
  private players = new Map<string, Player>();
  private gameState: GameState;
  private cleanupInterval: NodeJS.Timeout;
  private port: number;

  constructor(port = 3000) {
    super();
    this.port = port;
    this.gameState = {
      grid: Array(10).fill(null).map(() => Array(10).fill(0)),
      players: this.players,
      gameEndTime: Date.now() + 300000, // 5 minutes default
    };

    this.server = createServer(this.handleHttpRequest.bind(this));
    this.cleanupInterval = setInterval(this.cleanupDisconnectedPlayers.bind(this), 1000);
  }

  private handleHttpRequest(req: IncomingMessage, res: ServerResponse): void {
    if (req.method === 'GET' && req.url === '/') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(this.generateGameUI());
      return;
    }

    if (req.url === '/ws' && req.headers.upgrade === 'websocket') {
      this.handleWebSocketUpgrade(req, res);
      return;
    }

    res.writeHead(404);
    res.end('Not Found');
  }

  private handleWebSocketUpgrade(req: IncomingMessage, res: ServerResponse): void {
    const key = req.headers['sec-websocket-key'];
    if (!key) {
      res.writeHead(400);
      res.end('Bad Request');
      return;
    }

    const acceptKey = this.generateWebSocketAcceptKey(key);
    res.writeHead(101, {
      'Upgrade': 'websocket',
      'Connection': 'Upgrade',
      'Sec-WebSocket-Accept': acceptKey,
    });

    const socket = res.socket;
    if (!socket) return;

    const playerId = this.generatePlayerId();
    const wsConnection = this.createWebSocketConnection(socket, playerId);
    
    this.connections.set(playerId, wsConnection);
    this.addPlayer(playerId);
    this.sendInitialState(wsConnection, playerId);
    this.broadcastPlayerCount();
  }

  private generateWebSocketAcceptKey(key: string): string {
    const magic = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
    return createHash('sha1').update(key + magic).digest('base64');
  }

  private createWebSocketConnection(socket: any, playerId: string): WebSocketLike {
    const connection = {
      send: (data: string) => {
        const frame = this.createWebSocketFrame(data);
        socket.write(frame);
      },
      close: () => {
        socket.end();
      },
      on: (event: string, handler: (data?: any) => void) => {
        if (event === 'message') {
          socket.on('data', (buffer: Buffer) => {
            const message = this.parseWebSocketFrame(buffer);
            if (message) handler(message);
          });
        } else if (event === 'close') {
          socket.on('close', handler);
          socket.on('end', handler);
        }
      }
    };

    connection.on('close', () => {
      this.handlePlayerDisconnect(playerId);
    });

    return connection;
  }

  private createWebSocketFrame(data: string): Buffer {
    const payload = Buffer.from(data, 'utf8');
    const payloadLength = payload.length;
    
    let frame: Buffer;
    if (payloadLength < 126) {
      frame = Buffer.allocUnsafe(2 + payloadLength);
      frame[0] = 0x81; // FIN + text frame
      frame[1] = payloadLength;
      payload.copy(frame, 2);
    } else if (payloadLength < 65536) {
      frame = Buffer.allocUnsafe(4 + payloadLength);
      frame[0] = 0x81;
      frame[1] = 126;
      frame.writeUInt16BE(payloadLength, 2);
      payload.copy(frame, 4);
    } else {
      frame = Buffer.allocUnsafe(10 + payloadLength);
      frame[0] = 0x81;
      frame[1] = 127;
      frame.writeUInt32BE(0, 2);
      frame.writeUInt32BE(payloadLength, 6);
      payload.copy(frame, 10);
    }
    
    return frame;
  }

  private parseWebSocketFrame(buffer: Buffer): string | null {
    if (buffer.length < 2) return null;
    
    const firstByte = buffer[0];
    const secondByte = buffer[1];
    
    if ((firstByte & 0x80) === 0) return null; // Not final frame
    
    const opcode = firstByte & 0x0f;
    if (opcode !== 0x01) return null; // Not text frame
    
    const masked = (secondByte & 0x80) === 0x80;
    let payloadLength = secondByte & 0x7f;
    let offset = 2;
    
    if (payloadLength === 126) {
      if (buffer.length < 4) return null;
      payloadLength = buffer.readUInt16BE(2);
      offset = 4;
    } else if (payloadLength === 127) {
      if (buffer.length < 10) return null;
      payloadLength = buffer.readUInt32BE(6);
      offset = 10;
    }
    
    if (masked) {
      if (buffer.length < offset + 4 + payloadLength) return null;
      const maskKey = Buffer.from(buffer.subarray(offset, offset + 4));
      offset += 4;
      const payload = Buffer.from(buffer.subarray(offset, offset + payloadLength));
      
      for (let i = 0; i < payload.length; i++) {
        payload[i] ^= maskKey[i % 4];
      }
      
      return payload.toString('utf8');
    } else {
      if (buffer.length < offset + payloadLength) return null;
      return Buffer.from(buffer.subarray(offset, offset + payloadLength)).toString('utf8');
    }
  }

  private generatePlayerId(): string {
    let id: string;
    do {
      id = Math.random().toString(16).substring(2, 8).padStart(6, '0');
    } while (this.players.has(id));
    return id;
  }

  private addPlayer(playerId: string): void {
    const player: Player = {
      id: playerId,
      connected: true,
      lastSeen: Date.now(),
    };
    this.players.set(playerId, player);
    this.emit('playerJoined', playerId);
  }

  private handlePlayerDisconnect(playerId: string): void {
    const player = this.players.get(playerId);
    if (player) {
      player.connected = false;
      player.lastSeen = Date.now();
    }
    this.connections.delete(playerId);
  }

  private cleanupDisconnectedPlayers(): void {
    const now = Date.now();
    const toRemove: string[] = [];

    for (const [playerId, player] of this.players) {
      if (!player.connected && now - player.lastSeen > 5000) {
        toRemove.push(playerId);
      }
    }

    if (toRemove.length > 0) {
      for (const playerId of toRemove) {
        this.players.delete(playerId);
        this.emit('playerLeft', playerId);
      }
      this.broadcastPlayerCount();
    }
  }

  private sendInitialState(connection: WebSocketLike, playerId: string): void {
    const message: ConnectionMessage = {
      type: 'init',
      data: {
        playerId,
        grid: this.gameState.grid,
        players: Array.from(this.players.values()).map(p => ({
          id: p.id,
          connected: p.connected,
        })),
        remainingTime: Math.max(0, this.gameState.gameEndTime - Date.now()),
      },
    };
    connection.send(JSON.stringify(message));
  }

  private broadcastPlayerCount(): void {
    const connectedCount = Array.from(this.players.values()).filter(p => p.connected).length;
    const message: ConnectionMessage = {
      type: 'player_update',
      data: {
        playerCount: connectedCount,
      },
    };
    
    const messageStr = JSON.stringify(message);
    for (const connection of this.connections.values()) {
      connection.send(messageStr);
    }
  }

  private generateGameUI(): string {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Phoenix VCS Game</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f0f0f0; }
        .container { max-width: 800px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; }
        .grid { display: grid; grid-template-columns: repeat(10, 40px); gap: 2px; margin: 20px 0; }
        .cell { width: 40px; height: 40px; border: 1px solid #ccc; display: flex; align-items: center; justify-content: center; cursor: pointer; }
        .cell:hover { background: #e0e0e0; }
        .status { margin: 10px 0; padding: 10px; background: #f8f8f8; border-radius: 4px; }
        .players { margin: 20px 0; }
        .player { padding: 5px; margin: 2px 0; background: #e8f4f8; border-radius: 3px; }
    </style>
</head>
<body>
    <div class="container">
        <h1>Phoenix VCS Game</h1>
        <div class="status">
            <div>Player ID: <span id="playerId">Connecting...</span></div>
            <div>Players Online: <span id="playerCount">0</span></div>
            <div>Time Remaining: <span id="timeRemaining">--:--</span></div>
        </div>
        <div class="grid" id="gameGrid"></div>
        <div class="players">
            <h3>Players</h3>
            <div id="playerList"></div>
        </div>
    </div>
    <script>
        const ws = new WebSocket('ws://localhost:${this.port}/ws');
        let gameState = { grid: [], players: [], remainingTime: 0 };
        
        ws.onmessage = (event) => {
            const message = JSON.parse(event.data);
            if (message.type === 'init') {
                document.getElementById('playerId').textContent = message.data.playerId;
                gameState.grid = message.data.grid;
                gameState.players = message.data.players;
                gameState.remainingTime = message.data.remainingTime;
                updateUI();
            } else if (message.type === 'player_update') {
                document.getElementById('playerCount').textContent = message.data.playerCount;
            }
        };
        
        function updateUI() {
            updateGrid();
            updatePlayerList();
            updateTimer();
        }
        
        function updateGrid() {
            const grid = document.getElementById('gameGrid');
            grid.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                for (let j = 0; j < 10; j++) {
                    const cell = document.createElement('div');
                    cell.className = 'cell';
                    cell.textContent = gameState.grid[i][j] || '';
                    grid.appendChild(cell);
                }
            }
        }
        
        function updatePlayerList() {
            const list = document.getElementById('playerList');
            list.innerHTML = '';
            gameState.players.forEach(player => {
                const div = document.createElement('div');
                div.className = 'player';
                div.textContent = player.id + (player.connected ? ' (online)' : ' (offline)');
                list.appendChild(div);
            });
        }
        
        function updateTimer() {
            const minutes = Math.floor(gameState.remainingTime / 60000);
            const seconds = Math.floor((gameState.remainingTime % 60000) / 1000);
            document.getElementById('timeRemaining').textContent = 
                minutes.toString().padStart(2, '0') + ':' + seconds.toString().padStart(2, '0');
        }
        
        setInterval(() => {
            if (gameState.remainingTime > 0) {
                gameState.remainingTime -= 1000;
                updateTimer();
            }
        }, 1000);
    </script>
</body>
</html>`;
  }

  public listen(): Promise<void> {
    return new Promise((resolve) => {
      this.server.listen(this.port, () => {
        resolve();
      });
    });
  }

  public close(): Promise<void> {
    return new Promise((resolve) => {
      clearInterval(this.cleanupInterval);
      for (const connection of this.connections.values()) {
        connection.close();
      }
      this.server.close(() => {
        resolve();
      });
    });
  }

  public getPlayerCount(): number {
    return Array.from(this.players.values()).filter(p => p.connected).length;
  }

  public getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  public updateGameState(grid: number[][], gameEndTime: number): void {
    this.gameState.grid = grid;
    this.gameState.gameEndTime = gameEndTime;
  }
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '287d727e4c54fc45b5ea5e2484392a34a4b0750386cdb6f88404dcff44b70aa3',
  name: 'Connection Handling',
  risk_tier: 'medium',
  canon_ids: [6 as const],
} as const;