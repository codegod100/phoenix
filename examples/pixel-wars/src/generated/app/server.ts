/**
 * HTTPServer - Medium Tier IU
 * HTTP server that serves the game UI and upgrades to WebSocket
 * 
 * Generated from canonical nodes:
 * - websocket_server
 * - http_server
 * - ui_single_page
 */

import { createServer, type Server, type IncomingMessage, type ServerResponse } from 'http';
import type { WebSocketHandler } from './websocket.js';
import { generateUI } from './ui.html.js';

export interface ServerConfig {
  port: number;
  wsHandler: WebSocketHandler;
}

export class HTTPServer {
  private server: Server | null = null;
  private wsHandler: WebSocketHandler;
  private port: number;

  constructor(config: ServerConfig) {
    this.port = config.port;
    this.wsHandler = config.wsHandler;
  }

  start(): Promise<void> {
    return new Promise((resolve) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      // WebSocket upgrade handling would go here
      // In a real implementation, this would use the 'ws' library
      
      this.server.listen(this.port, () => {
        console.log(`🎮 Pixel Wars server running on port ${this.port}`);
        resolve();
      });
    });
  }

  private handleRequest(req: IncomingMessage, res: ServerResponse): void {
    const url = req.url || '/';
    
    if (url === '/' && req.method === 'GET') {
      // Serve the game UI
      const html = generateUI();
      
      res.writeHead(200, {
        'Content-Type': 'text/html',
        'Content-Length': Buffer.byteLength(html),
      });
      res.end(html);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  getPort(): number {
    return this.port;
  }
}
