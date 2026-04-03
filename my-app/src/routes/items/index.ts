import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

// Migrations
registerMigration('items', `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id),
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

registerMigration('categories', `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

// Schemas
const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0).default(0),
  category_id: z.number().int().nullable().optional(),
});

const UpdateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(0).optional(),
  category_id: z.number().int().nullable().optional(),
});

// Routes
const router = new Hono();

// API Routes
router.get('/api/items', (c) => {
  let sql = 'SELECT items.*, categories.name as category_name FROM items LEFT JOIN categories ON items.category_id = categories.id';
  const conditions: string[] = [];
  const params: (string | number)[] = [];
  
  const categoryId = c.req.query('category_id');
  if (categoryId !== undefined && categoryId !== '') {
    conditions.push('items.category_id = ?');
    params.push(Number(categoryId));
  }
  
  const search = c.req.query('search');
  if (search !== undefined && search !== '') {
    conditions.push('items.name LIKE ?');
    params.push(`%${search}%`);
  }
  
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');
  
  const sort = c.req.query('sort');
  if (sort === 'name') {
    sql += ' ORDER BY items.name ASC';
  } else if (sort === 'quantity') {
    sql += ' ORDER BY items.quantity DESC';
  } else {
    sql += ' ORDER BY items.created_at DESC';
  }
  
  return c.json(db.prepare(sql).all(...params));
});

router.get('/api/items/:id', (c) => {
  const item = db.prepare('SELECT items.*, categories.name as category_name FROM items LEFT JOIN categories ON items.category_id = categories.id WHERE items.id = ?').get(c.req.param('id'));
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json(item);
});

router.post('/api/items', async (c) => {
  let body; try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = CreateItemSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const { name, quantity, category_id } = result.data;
  if (category_id != null) {
    if (!db.prepare('SELECT id FROM categories WHERE id = ?').get(category_id)) return c.json({ error: 'Category not found' }, 400);
  }
  const info = db.prepare('INSERT INTO items (name, quantity, category_id) VALUES (?, ?, ?)').run(name, quantity, category_id ?? null);
  const item = db.prepare('SELECT items.*, categories.name as category_name FROM items LEFT JOIN categories ON items.category_id = categories.id WHERE items.id = ?').get(info.lastInsertRowid);
  return c.json(item, 201);
});

router.patch('/api/items/:id', async (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) return c.json({ error: 'Not found' }, 404);
  let body; try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = UpdateItemSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const u = result.data;
  if (u.name !== undefined) db.prepare('UPDATE items SET name = ? WHERE id = ?').run(u.name, id);
  if (u.quantity !== undefined) db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(u.quantity, id);
  if (u.category_id !== undefined) db.prepare('UPDATE items SET category_id = ? WHERE id = ?').run(u.category_id, id);
  return c.json(db.prepare('SELECT items.*, categories.name as category_name FROM items LEFT JOIN categories ON items.category_id = categories.id WHERE items.id = ?').get(id));
});

router.delete('/api/items/:id', (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) return c.json({ error: 'Not found' }, 404);
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return c.body(null, 204);
});

router.get('/api/categories', (c) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all();
  return c.json(categories);
});

// Dashboard UI Route
router.get('/', (c) => {
  const categories = db.prepare('SELECT * FROM categories ORDER BY name ASC').all() as Array<{ id: number; name: string }>;
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 24px; }
    h1 { font-size: 24px; margin-bottom: 20px; color: #333; }
    .controls { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    .controls input, .controls select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .controls input { min-width: 200px; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-primary { background: #0066cc; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; cursor: pointer; user-select: none; }
    th:hover { background: #f8f9fa; }
    th .sort-icon { margin-left: 4px; opacity: 0.5; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 4px 12px; font-size: 12px; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; }
    .modal.active { display: flex; align-items: center; justify-content: center; }
    .modal-content { background: white; padding: 24px; border-radius: 8px; width: 100%; max-width: 400px; }
    .modal-content h2 { margin-bottom: 16px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 4px; font-weight: 500; color: #555; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .empty-state { text-align: center; padding: 40px; color: #666; }
    .category-badge { background: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Items Dashboard</h1>
    
    <div class="controls">
      <input type="text" id="searchInput" placeholder="Search items by name...">
      <select id="categoryFilter">
        <option value="">All Categories</option>
        ${categories.map((cat: { id: number; name: string }) => `<option value="${cat.id}">${cat.name}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="openCreateModal()">+ Create Item</button>
    </div>
    
    <table id="itemsTable">
      <thead>
        <tr>
          <th onclick="sortItems('name')">Name <span class="sort-icon">↕</span></th>
          <th onclick="sortItems('quantity')">Quantity <span class="sort-icon">↕</span></th>
          <th>Category</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="itemsTableBody">
        <tr><td colspan="4" class="empty-state">Loading...</td></tr>
      </tbody>
    </table>
  </div>
  
  <div id="itemModal" class="modal">
    <div class="modal-content">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="itemName">Name</label>
          <input type="text" id="itemName" required minlength="1" maxlength="200">
        </div>
        <div class="form-group">
          <label for="itemQuantity">Quantity</label>
          <input type="number" id="itemQuantity" required min="0" value="0">
        </div>
        <div class="form-group">
          <label for="itemCategory">Category</label>
          <select id="itemCategory">
            <option value="">None</option>
            ${categories.map((cat: { id: number; name: string }) => `<option value="${cat.id}">${cat.name}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    let currentSort = '';
    
    async function loadItems() {
      const search = document.getElementById('searchInput').value;
      const categoryId = document.getElementById('categoryFilter').value;
      
      let url = '/items/api/items?';
      if (search) url += 'search=' + encodeURIComponent(search) + '&';
      if (categoryId) url += 'category_id=' + encodeURIComponent(categoryId) + '&';
      if (currentSort) url += 'sort=' + encodeURIComponent(currentSort) + '&';
      
      try {
        const response = await fetch(url);
        const items = await response.json();
        renderItems(items);
      } catch (error) {
        console.error('Failed to load items:', error);
        document.getElementById('itemsTableBody').innerHTML = '<tr><td colspan="4" class="empty-state">Failed to load items</td></tr>';
      }
    }
    
    function renderItems(items) {
      const tbody = document.getElementById('itemsTableBody');
      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        return;
      }
      
      tbody.innerHTML = items.map(item => \`
        <tr>
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity}</td>
          <td>\${item.category_name ? '<span class="category-badge">' + escapeHtml(item.category_name) + '</span>' : '-'}</td>
          <td class="actions">
            <button class="btn btn-secondary" onclick="openEditModal(\${item.id})">Edit</button>
            <button class="btn btn-danger" onclick="deleteItem(\${item.id})">Delete</button>
          </td>
        </tr>
      \`).join('');
    }
    
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    function sortItems(field) {
      currentSort = currentSort === field ? '' : field;
      loadItems();
    }
    
    function openCreateModal() {
      document.getElementById('modalTitle').textContent = 'Create Item';
      document.getElementById('itemId').value = '';
      document.getElementById('itemName').value = '';
      document.getElementById('itemQuantity').value = '0';
      document.getElementById('itemCategory').value = '';
      document.getElementById('itemModal').classList.add('active');
    }
    
    async function openEditModal(id) {
      try {
        const response = await fetch('/items/api/items/' + id);
        if (!response.ok) throw new Error('Item not found');
        const item = await response.json();
        
        document.getElementById('modalTitle').textContent = 'Edit Item';
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemCategory').value = item.category_id || '';
        document.getElementById('itemModal').classList.add('active');
      } catch (error) {
        alert('Failed to load item: ' + error.message);
      }
    }
    
    function closeModal() {
      document.getElementById('itemModal').classList.remove('active');
    }
    
    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      try {
        const response = await fetch('/items/api/items/' + id, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete');
        loadItems();
      } catch (error) {
        alert('Failed to delete item: ' + error.message);
      }
    }
    
    document.getElementById('itemForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('itemId').value;
      const data = {
        name: document.getElementById('itemName').value,
        quantity: parseInt(document.getElementById('itemQuantity').value),
        category_id: document.getElementById('itemCategory').value || null
      };
      
      try {
        const url = id ? '/items/api/items/' + id : '/items/api/items';
        const method = id ? 'PATCH' : 'POST';
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Request failed');
        }
        
        closeModal();
        loadItems();
      } catch (error) {
        alert('Failed to save item: ' + error.message);
      }
    });
    
    document.getElementById('searchInput').addEventListener('input', debounce(loadItems, 300));
    document.getElementById('categoryFilter').addEventListener('change', loadItems);
    
    function debounce(fn, ms) {
      let timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, ms);
      };
    }
    
    document.getElementById('itemModal').addEventListener('click', (e) => {
      if (e.target.id === 'itemModal') closeModal();
    });
    
    loadItems();
  </script>
</body>
</html>`;
  
  return c.html(html);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;
