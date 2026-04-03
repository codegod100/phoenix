import { Hono } from 'hono';
import { db, registerMigration } from '../db.js';
import { z } from 'zod';

const router = new Hono();

// Migrations
registerMigration('categories', `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT ''
  )
`);

registerMigration('items', `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER REFERENCES categories(id)
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

// Helper function to escape HTML for server-side rendering
function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// Routes
router.get('/', (c) => {
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
  
  const sort = c.req.query('sort') || 'name';
  const order = c.req.query('order') === 'desc' ? 'DESC' : 'ASC';
  const allowedSort = ['name', 'quantity'].includes(sort) ? sort : 'name';
  sql += ` ORDER BY items.${allowedSort} ${order}`;
  
  return c.json(db.prepare(sql).all(...params));
});

router.get('/categories', (c) => {
  return c.json(db.prepare('SELECT * FROM categories ORDER BY name').all());
});

router.get('/:id', (c) => {
  const item = db.prepare('SELECT items.*, categories.name as category_name FROM items LEFT JOIN categories ON items.category_id = categories.id WHERE items.id = ?').get(c.req.param('id'));
  if (!item) return c.json({ error: 'Not found' }, 404);
  return c.json(item);
});

router.post('/', async (c) => {
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

router.patch('/:id', async (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) return c.json({ error: 'Not found' }, 404);
  let body; try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = UpdateItemSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  const u = result.data;
  if (u.name !== undefined) db.prepare('UPDATE items SET name = ? WHERE id = ?').run(u.name, id);
  if (u.quantity !== undefined) db.prepare('UPDATE items SET quantity = ? WHERE id = ?').run(u.quantity, id);
  if (u.category_id !== undefined) {
    if (u.category_id != null && !db.prepare('SELECT id FROM categories WHERE id = ?').get(u.category_id)) return c.json({ error: 'Category not found' }, 400);
    db.prepare('UPDATE items SET category_id = ? WHERE id = ?').run(u.category_id, id);
  }
  return c.json(db.prepare('SELECT items.*, categories.name as category_name FROM items LEFT JOIN categories ON items.category_id = categories.id WHERE items.id = ?').get(id));
});

router.delete('/:id', (c) => {
  const id = c.req.param('id');
  if (!db.prepare('SELECT id FROM items WHERE id = ?').get(id)) return c.json({ error: 'Not found' }, 404);
  db.prepare('DELETE FROM items WHERE id = ?').run(id);
  return c.body(null, 204);
});

router.get('/dashboard', (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 24px; }
    h1 { margin-bottom: 20px; color: #333; }
    .controls { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    input, select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    input[type="search"] { flex: 1; min-width: 200px; }
    button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #545b62; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    table { width: 100%; border-collapse: collapse; margin-top: 10px; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #495057; cursor: pointer; user-select: none; }
    th:hover { background: #e9ecef; }
    th .sort-arrow { margin-left: 6px; opacity: 0.5; }
    th.sort-asc .sort-arrow::after { content: '↑'; opacity: 1; }
    th.sort-desc .sort-arrow::after { content: '↓'; opacity: 1; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 4px 12px; font-size: 12px; }
    .category-tag { background: #e9ecef; padding: 2px 8px; border-radius: 12px; font-size: 12px; color: #495057; }
    .no-category { color: #adb5bd; font-style: italic; }
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.active { display: flex; }
    .modal { background: white; border-radius: 8px; padding: 24px; width: 90%; max-width: 400px; box-shadow: 0 4px 20px rgba(0,0,0,0.2); }
    .modal h2 { margin-bottom: 16px; color: #333; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 4px; font-weight: 500; color: #555; }
    .form-group input, .form-group select { width: 100%; }
    .modal-actions { display: flex; gap: 12px; justify-content: flex-end; margin-top: 20px; }
    .empty-state { text-align: center; padding: 40px; color: #adb5bd; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Items Dashboard</h1>
    <div class="controls">
      <input type="search" id="search" placeholder="Search items by name...">
      <select id="categoryFilter">
        <option value="">All Categories</option>
      </select>
      <button class="btn-primary" onclick="openModal()">+ Create Item</button>
    </div>
    <table>
      <thead>
        <tr>
          <th onclick="sort('name')">Name<span class="sort-arrow">↕</span></th>
          <th onclick="sort('quantity')">Quantity<span class="sort-arrow">↕</span></th>
          <th>Category</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="itemsTable"></tbody>
    </table>
    <div id="emptyState" class="empty-state" style="display: none;">No items found</div>
  </div>

  <div class="modal-overlay" id="modal">
    <div class="modal">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" required maxlength="200">
        </div>
        <div class="form-group">
          <label for="quantity">Quantity</label>
          <input type="number" id="quantity" required min="0" value="0">
        </div>
        <div class="form-group">
          <label for="category">Category (optional)</label>
          <select id="category">
            <option value="">-- No Category --</option>
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let currentSort = { field: 'name', order: 'asc' };
    let categories = [];
    let items = [];

    async function loadCategories() {
      const res = await fetch('/items/categories');
      categories = await res.json();
      const filterSelect = document.getElementById('categoryFilter');
      const modalSelect = document.getElementById('category');
      filterSelect.innerHTML = '<option value="">All Categories</option>';
      modalSelect.innerHTML = '<option value="">-- No Category --</option>';
      categories.forEach(cat => {
        filterSelect.add(new Option(cat.name, cat.id));
        modalSelect.add(new Option(cat.name, cat.id));
      });
    }

    async function loadItems() {
      const params = new URLSearchParams();
      const search = document.getElementById('search').value;
      const categoryId = document.getElementById('categoryFilter').value;
      if (search) params.set('search', search);
      if (categoryId) params.set('category_id', categoryId);
      params.set('sort', currentSort.field);
      params.set('order', currentSort.order);
      
      const res = await fetch('/items?' + params.toString());
      items = await res.json();
      renderTable();
    }

    function renderTable() {
      const tbody = document.getElementById('itemsTable');
      const emptyState = document.getElementById('emptyState');
      
      if (items.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
      }
      
      emptyState.style.display = 'none';
      tbody.innerHTML = items.map(item => \`
        <tr>
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity}</td>
          <td>\${item.category_name ? \`<span class="category-tag">\${escapeHtml(item.category_name)}</span>\` : '<span class="no-category">—</span>'}</td>
          <td class="actions">
            <button class="btn-secondary" onclick="editItem(\${item.id})">Edit</button>
            <button class="btn-danger" onclick="deleteItem(\${item.id})">Delete</button>
          </td>
        </tr>
      \`).join('');
      
      document.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
      const sortTh = document.querySelector(\`th[onclick="sort('\${currentSort.field}')"]\`);
      if (sortTh) sortTh.classList.add(\`sort-\${currentSort.order}\`);
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function sort(field) {
      if (currentSort.field === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.order = 'asc';
      }
      loadItems();
    }

    function openModal(item = null) {
      document.getElementById('modalTitle').textContent = item ? 'Edit Item' : 'Create Item';
      document.getElementById('itemId').value = item ? item.id : '';
      document.getElementById('name').value = item ? item.name : '';
      document.getElementById('quantity').value = item ? item.quantity : 0;
      document.getElementById('category').value = item ? (item.category_id || '') : '';
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
      document.getElementById('itemForm').reset();
    }

    async function editItem(id) {
      const res = await fetch(\`/items/\${id}\`);
      if (!res.ok) return alert('Item not found');
      openModal(await res.json());
    }

    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      const res = await fetch(\`/items/\${id}\`, { method: 'DELETE' });
      if (res.ok) loadItems();
    }

    document.getElementById('search').addEventListener('input', debounce(loadItems, 300));
    document.getElementById('categoryFilter').addEventListener('change', loadItems);
    
    document.getElementById('itemForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const id = document.getElementById('itemId').value;
      const data = {
        name: document.getElementById('name').value,
        quantity: parseInt(document.getElementById('quantity').value),
        category_id: document.getElementById('category').value || null
      };
      
      const url = id ? \`/items/\${id}\` : '/items';
      const method = id ? 'PATCH' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (res.ok) {
        closeModal();
        loadItems();
      } else {
        const err = await res.json();
        alert(err.error || 'Error saving item');
      }
    });

    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') closeModal();
    });

    function debounce(fn, ms) {
      let timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, ms);
      };
    }

    loadCategories();
    loadItems();
  </script>
</body>
</html>`);
});

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;

export default router;
