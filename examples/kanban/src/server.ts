import { Database } from 'bun:sqlite';
import { initDatabase, seedDefaultColumns, getBoard, createCard, updateCard, moveCard, deleteCard, createColumn, renameColumn, deleteColumn } from './generated/app/index.js';
import { renderPage } from './generated/app/ui.ui.js';

const db = new Database('data/app.db');
initDatabase(db);
seedDefaultColumns(db);

const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    const path = url.pathname;
    const method = req.method;
    
    // Health check
    if (path === '/health') {
      return Response.json({ status: 'ok' });
    }
    
    // Get board state
    if (path === '/api/board' && method === 'GET') {
      try {
        const board = getBoard(db);
        return Response.json(board);
      } catch (err) {
        return Response.json({ error: String(err) }, { status: 500 });
      }
    }
    
    // Create card
    if (path === '/api/cards' && method === 'POST') {
      return req.json().then(body => {
        const card = createCard(db, body.title, body.description || null, body.column_id);
        return Response.json(card, { status: 201 });
      }).catch(err => Response.json({ error: String(err) }, { status: 400 }));
    }
    
    // Update card
    if (path.startsWith('/api/cards/') && method === 'PATCH' && !path.endsWith('/move')) {
      const id = path.split('/')[3];
      return req.json().then(body => {
        const card = updateCard(db, id, body.title, body.description);
        return Response.json(card);
      }).catch(err => Response.json({ error: String(err) }, { status: 400 }));
    }
    
    // Move card
    if (path.endsWith('/move') && method === 'PATCH') {
      const id = path.split('/')[3];
      return req.json().then(body => {
        const card = moveCard(db, id, body.column_id, body.order_index);
        return Response.json(card);
      }).catch(err => Response.json({ error: String(err) }, { status: 400 }));
    }
    
    // Delete card
    if (path.startsWith('/api/cards/') && method === 'DELETE') {
      const id = path.split('/')[3];
      deleteCard(db, id);
      return new Response(null, { status: 204 });
    }
    
    // Create column
    if (path === '/api/columns' && method === 'POST') {
      return req.json().then(body => {
        const col = createColumn(db, body.name);
        return Response.json(col, { status: 201 });
      }).catch(err => Response.json({ error: String(err) }, { status: 400 }));
    }
    
    // Rename column
    if (path.startsWith('/api/columns/') && method === 'PATCH') {
      const id = path.split('/')[3];
      return req.json().then(body => {
        const col = renameColumn(db, id, body.name);
        return Response.json(col);
      }).catch(err => Response.json({ error: String(err) }, { status: 400 }));
    }
    
    // Delete column
    if (path.startsWith('/api/columns/') && method === 'DELETE') {
      const id = path.split('/')[3];
      const columnCount = getBoard(db).columns.length;
      if (columnCount <= 1) {
        return Response.json({ error: 'Cannot delete the last column' }, { status: 400 });
      }
      deleteColumn(db, id);
      return new Response(null, { status: 204 });
    }
    
    // Main UI page
    if (path === '/') {
      const board = getBoard(db);
      const html = renderPage(board);
      return new Response(html, {
        headers: { 'Content-Type': 'text/html' }
      });
    }
    
    return new Response('Not Found', { status: 404 });
  }
});

console.log(`Server running at http://localhost:${server.port}`);
