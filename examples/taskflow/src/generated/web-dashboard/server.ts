/**
 * Web Dashboard — HTTP Server
 *
 * Uses IU-9 Dashboard Integration from taskflow module
 */

import { createServer, IncomingMessage, ServerResponse } from 'node:http';
import { createIntegratedDashboard } from '../taskflow/index.js';

// ─── Metrics ─────────────────────────────────────────────────────────────────

const _svcMetrics = {
  requests_total: 0,
  requests_by_path: {} as Record<string, number>,
  errors_total: 0,
  uptime_start: Date.now(),
};

// ─── Module Registry ─────────────────────────────────────────────────────────

// IU-9: All IUs are now integrated through dashboard-integration.ts
const _svcModules = {
  integration: { _phoenix: { iu_id: 'iu-9-dashboard-integration-32-reqs', name: 'Dashboard Integration' } },
};

// ─── Router ──────────────────────────────────────────────────────────────────

type Handler = (req: IncomingMessage, res: ServerResponse) => void | Promise<void>;

const routes: Record<string, Handler> = {
  '/': (_req, res) => {
    try {
      // IU-9: Use IntegratedDashboard that wires all components together
      const dashboard = createIntegratedDashboard({ title: 'TaskFlow' });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(dashboard.renderHTML());
    } catch (err) {
      _svcMetrics.errors_total++;
      res.writeHead(500, { 'Content-Type': 'text/html' });
      res.end(`<h1>Error</h1><pre>${(err as Error).message}</pre>`);
    }
  },

  '/health': (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'TaskFlow Web Dashboard (IU-9 Integration)',
      uptime: Math.floor((Date.now() - _svcMetrics.uptime_start) / 1000),
      modules: Object.keys(_svcModules),
      ius: [
        'IU-1: Task Domain Model',
        'IU-2: Analytics Engine',
        'IU-3: Dashboard Page & Theme',
        'IU-4: Dashboard Task List',
        'IU-5: Dashboard Edit UI',
        'IU-6: Dashboard Archive UI',
        'IU-7: Dashboard Bulk Operations',
        'IU-8: Dashboard Analytics Bar',
        'IU-9: Dashboard Integration',
      ],
    }));
  },

  '/metrics': (_req, res) => {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ..._svcMetrics,
      uptime_seconds: Math.floor((Date.now() - _svcMetrics.uptime_start) / 1000),
    }, null, 2));
  },

  '/modules': (_req, res) => {
    const info = Object.entries(_svcModules).map(([name, mod]) => {
      const phoenix = (mod as Record<string, unknown>)._phoenix as Record<string, unknown> | undefined;
      return {
        name,
        iu_id: phoenix?.iu_id ?? 'unknown',
        exports: Object.keys(mod).filter(k => !k.startsWith('_')),
      };
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(info, null, 2));
  },
};

// ─── Server ──────────────────────────────────────────────────────────────────

function handleRequest(req: IncomingMessage, res: ServerResponse): void {
  const url = req.url ?? '/';
  const path = url.split('?')[0];

  _svcMetrics.requests_total++;
  _svcMetrics.requests_by_path[path] = (_svcMetrics.requests_by_path[path] ?? 0) + 1;

  const handler = routes[path];
  if (handler) {
    try {
      handler(req, res);
    } catch (err) {
      _svcMetrics.errors_total++;
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: String(err) }));
    }
  } else {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      error: 'Not Found',
      path,
      available: Object.keys(routes),
    }));
  }
}

export function startServer(port?: number): { server: ReturnType<typeof createServer>; port: number; ready: Promise<void> } {
  const requestedPort = port ?? parseInt(process.env.WEB_DASHBOARD_PORT ?? process.env.PORT ?? '3002', 10);
  const server = createServer(handleRequest);
  let actualPort = requestedPort;

  const ready = new Promise<void>(resolve => {
    server.listen(requestedPort, () => {
      const addr = server.address();
      if (addr && typeof addr === 'object') actualPort = addr.port;
      result.port = actualPort;
      console.log(`TaskFlow Web Dashboard (IU-9 Integration) listening on http://localhost:${actualPort}`);
      console.log(`  /         — Full working dashboard (IU-9: all components wired)`);
      console.log(`  /health   — Health check`);
      console.log(`  /metrics  — Request metrics`);
      console.log(`  /modules  — Registered modules (9 IUs)`);
      resolve();
    });
  });

  const result = { server, port: actualPort, ready };
  return result;
}

// Start when run directly
const isMain = process.argv[1]?.endsWith('/web-dashboard/server.js') ||
               process.argv[1]?.endsWith('/web-dashboard/server.ts');
if (isMain) {
  startServer();
}

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: 'web-dashboard-server-v2',
  name: 'Web Dashboard Server (IU-9)',
  risk_tier: 'high',
} as const;
