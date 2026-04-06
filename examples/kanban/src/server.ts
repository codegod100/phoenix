import { Database } from 'bun:sqlite';
import { initDatabase, seedDefaultColumns, getBoard, createCard, updateCard, moveCard, deleteCard, createColumn, renameColumn, moveColumn, deleteColumn } from './generated/app/index.js';
import { renderPage } from './generated/app/page.ui.js';

const db = new Database('data/app.db');
initDatabase(db);
seedDefaultColumns(db);

const server = Bun.serve({
  port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;

    // CORS headers for development
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    if (method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Health check
    if (path === '/health') {
      return Response.json({ status: 'ok' }, { headers: corsHeaders });
    }

    // Get board state
    if (path === '/api/board' && method === 'GET') {
      try {
        const board = getBoard(db);
        return Response.json(board, { headers: corsHeaders });
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 500, headers: corsHeaders });
      }
    }

    // Create card
    if (path === '/api/cards' && method === 'POST') {
      return req.json().then(body => {
        const card = createCard(db, body.title, body.description || null, body.column_id);
        return Response.json(card, { status: 201, headers: corsHeaders });
      }).catch(err => Response.json({ error: String(err) }, { status: 400, headers: corsHeaders }));
    }

    // Update card
    if (path.startsWith('/api/cards/') && method === 'PATCH' && !path.endsWith('/move')) {
      const id = path.split('/')[3];
      return req.json().then(body => {
        const card = updateCard(db, id, body.title, body.description);
        return Response.json(card, { headers: corsHeaders });
      }).catch(err => Response.json({ error: String(err) }, { status: 400, headers: corsHeaders }));
    }

    // Move card
    if (path.endsWith('/move') && method === 'PATCH') {
      const id = path.split('/')[3];
      return req.json().then(body => {
        const card = moveCard(db, id, body.column_id, body.order_index);
        return Response.json(card, { headers: corsHeaders });
      }).catch(err => Response.json({ error: String(err) }, { status: 400, headers: corsHeaders }));
    }

    // Delete card
    if (path.startsWith('/api/cards/') && method === 'DELETE') {
      const id = path.split('/')[3];
      deleteCard(db, id);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Create column
    if (path === '/api/columns' && method === 'POST') {
      return req.json().then(body => {
        const col = createColumn(db, body.name);
        return Response.json(col, { status: 201, headers: corsHeaders });
      }).catch(err => Response.json({ error: String(err) }, { status: 400, headers: corsHeaders }));
    }

    // Rename column (PATCH /api/columns/:id without /move)
    if (path.startsWith('/api/columns/') && method === 'PATCH' && !path.endsWith('/move')) {
      const id = path.split('/')[3];
      return req.json().then(body => {
        const col = renameColumn(db, id, body.name);
        return Response.json(col, { headers: corsHeaders });
      }).catch(err => Response.json({ error: String(err) }, { status: 400, headers: corsHeaders }));
    }

    // Move column
    if (path.endsWith('/move') && method === 'PATCH' && path.includes('/columns/')) {
      const id = path.split('/')[3];
      return req.json().then(body => {
        const col = moveColumn(db, id, body.order_index);
        return Response.json(col, { headers: corsHeaders });
      }).catch(err => Response.json({ error: String(err) }, { status: 400, headers: corsHeaders }));
    }

    // Delete column
    if (path.startsWith('/api/columns/') && method === 'DELETE') {
      const id = path.split('/')[3];
      const columnCount = getBoard(db).columns.length;
      if (columnCount <= 1) {
        return Response.json({ error: 'Cannot delete the last column' }, { status: 400, headers: corsHeaders });
      }
      deleteColumn(db, id);
      return new Response(null, { status: 204, headers: corsHeaders });
    }

    // Main UI page
    if (path === '/') {
      const board = getBoard(db);
      const html = renderPage(board);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });
  }
});

console.log(`Server running at http://localhost:${server.port}`);
