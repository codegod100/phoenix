import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

const router = new Hono();

__MIGRATIONS__
// Dashboard preferences for user session (lightweight local storage via db)
registerMigration('items_dashboard_prefs', `
  CREATE TABLE IF NOT EXISTS items_dashboard_prefs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_key TEXT UNIQUE NOT NULL,
    default_sort_by TEXT DEFAULT 'name',
    default_sort_order TEXT DEFAULT 'asc',
    last_category_filter INTEGER,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

__SCHEMAS__
const DashboardPrefsSchema = z.object({
  session_key: z.string(),
  default_sort_by: z.enum(['name', 'quantity']).optional(),
  default_sort_order: z.enum(['asc', 'desc']).optional(),
  last_category_filter: z.number().int().nullable().optional(),
});

__ROUTES__
// Serve the dashboard HTML page
router.get('/', async (c) => {
  // Fetch categories for the filter dropdown
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name ASC').all() as { id: number; name: string }[];
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; margin-bottom: 20px; }
    .toolbar {
      display: flex;
      gap: 12px;
      margin-bottom: 20px;
      flex-wrap: wrap;
      align-items: center;
      background: white;
      padding: 16px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .toolbar input, .toolbar select {
      padding: 8px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .toolbar input[type="text"] { flex: 1; min-width: 200px; }
    .toolbar button {
      padding: 8px 16px;
      border: none;
      border-radius: 4px;
      cursor: pointer;
      font-size: 14px;
      transition: opacity 0.2s;
    }
    .toolbar button:hover { opacity: 0.9; }
    .btn-primary { background: #007bff; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-warning { background: #ffc107; color: #212529; }
    table {
      width: 100%;
      background: white;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-collapse: collapse;
      overflow: hidden;
    }
    th, td {
      padding: 12px 16px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #495057;
      cursor: pointer;
      user-select: none;
      position: relative;
    }
    th:hover { background: #e9ecef; }
    th.sortable::after {
      content: ' ⇅';
      color: #adb5bd;
      font-size: 12px;
    }
    th.sort-asc::after { content: ' ▲'; color: #007bff; }
    th.sort-desc::after { content: ' ▼'; color: #007bff; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 6px 12px; font-size: 13px; }
    .category-badge {
      display: inline-block;
      padding: 4px 8px;
      background: #e9ecef;
      border-radius: 4px;
      font-size: 12px;
      color: #495057;
    }
    .category-badge.empty { background: #f8f9fa; color: #adb5bd; font-style: italic; }
    
    /* Modal */
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: white;
      border-radius: 8px;
      padding: 24px;
      width: 90%;
      max-width: 500px;
      box-shadow: 0 4px 20px rgba(0,0,0,0.15);
    }
    .modal h2 { margin-top: 0; color: #333; }
    .form-group { margin-bottom: 16px; }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      font-weight: 500;
      color: #495057;
    }
    .form-group input, .form-group select {
      width: 100%;
      padding: 10px 12px;
      border: 1px solid #ddd;
      border-radius: 4px;
      font-size: 14px;
    }
    .form-group input:focus, .form-group select:focus {
      outline: none;
      border-color: #007bff;
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .modal-actions button { padding: 10px 20px; }
    
    .empty-state {
      text-align: center;
      padding: 60px 20px;
      color: #6c757d;
    }
    .loading { opacity: 0.6; pointer-events: none; }
    .error-message {
      background: #f8d7da;
      color: #721c24;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
    .success-message {
      background: #d4edda;
      color: #155724;
      padding: 12px 16px;
      border-radius: 4px;
      margin-bottom: 16px;
    }
  </style>
</head>
<body>
  <h1>📦 Items Dashboard</h1>
  
  <div id="message"></div>
  
  <div class="toolbar">
    <input type="text" id="searchBox" placeholder="Search items by name...">
    <select id="categoryFilter">
      <option value="">All Categories</option>
      ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
    </select>
    <button class="btn-primary" onclick="openCreateModal()">+ Create Item</button>
    <button class="btn-secondary" onclick="refreshItems()">↻ Refresh</button>
  </div>
  
  <table id="itemsTable">
    <thead>
      <tr>
        <th class="sortable" data-sort="name" onclick="sortBy('name')">Name</th>
        <th class="sortable" data-sort="quantity" onclick="sortBy('quantity')">Quantity</th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="itemsBody">
      <tr><td colspan="4" class="empty-state">Loading items...</td></tr>
    </tbody>
  </table>
  
  <!-- Create/Edit Modal -->
  <div class="modal-overlay" id="itemModal">
    <div class="modal">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm" onsubmit="saveItem(event)">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="itemName">Name *</label>
          <input type="text" id="itemName" required minlength="1" maxlength="200">
        </div>
        <div class="form-group">
          <label for="itemQuantity">Quantity *</label>
          <input type="number" id="itemQuantity" required min="0" step="1">
        </div>
        <div class="form-group">
          <label for="itemCategory">Category</label>
          <select id="itemCategory">
            <option value="">-- No Category --</option>
            ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
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
    let items = [];
    let currentSort = { by: 'name', order: 'asc' };
    let searchQuery = '';
    let categoryFilter = '';
    
    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
      refreshItems();
      
      // Search with debounce
      const searchBox = document.getElementById('searchBox');
      let debounceTimer;
      searchBox.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          searchQuery = e.target.value.trim().toLowerCase();
          renderItems();
        }, 200);
      });
      
      // Category filter
      document.getElementById('categoryFilter').addEventListener('change', (e) => {
        categoryFilter = e.target.value;
        renderItems();
      });
    });
    
    async function refreshItems() {
      document.getElementById('itemsTable').classList.add('loading');
      try {
        const response = await fetch('/items');
        if (!response.ok) throw new Error('Failed to fetch items');
        items = await response.json();
        renderItems();
      } catch (err) {
        showMessage(err.message, 'error');
      } finally {
        document.getElementById('itemsTable').classList.remove('loading');
      }
    }
    
    function renderItems() {
      let filtered = items;
      
      // Apply search filter (partial match on name)
      if (searchQuery) {
        filtered = filtered.filter(item => 
          item.name.toLowerCase().includes(searchQuery)
        );
      }
      
      // Apply category filter
      if (categoryFilter) {
        filtered = filtered.filter(item => 
          item.category_id === Number(categoryFilter) ||
          item.category_id === categoryFilter
        );
      }
      
      // Apply sorting
      filtered.sort((a, b) => {
        let comparison = 0;
        if (currentSort.by === 'name') {
          comparison = a.name.localeCompare(b.name);
        } else if (currentSort.by === 'quantity') {
          comparison = (a.quantity || 0) - (b.quantity || 0);
        }
        return currentSort.order === 'asc' ? comparison : -comparison;
      });
      
      // Update sort indicators
      document.querySelectorAll('th.sortable').forEach(th => {
        th.classList.remove('sort-asc', 'sort-desc');
        if (th.dataset.sort === currentSort.by) {
          th.classList.add(currentSort.order === 'asc' ? 'sort-asc' : 'sort-desc');
        }
      });
      
      // Render rows
      const tbody = document.getElementById('itemsBody');
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        return;
      }
      
      tbody.innerHTML = filtered.map(item => \`
        <tr data-id="\${item.id}">
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity}</td>
          <td>
            \${item.category_name 
              ? \`<span class="category-badge">\${escapeHtml(item.category_name)}</span>\`
              : \`<span class="category-badge empty">Uncategorized</span>\`
            }
          </td>
          <td class="actions">
            <button class="btn-warning" onclick="openEditModal(\${item.id})">Edit</button>
            <button class="btn-danger" onclick="deleteItem(\${item.id})">Delete</button>
          </td>
        </tr>
      \`).join('');
    }
    
    function sortBy(field) {
      if (currentSort.by === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.by = field;
        currentSort.order = 'asc';
      }
      renderItems();
    }
    
    function openCreateModal() {
      document.getElementById('modalTitle').textContent = 'Create Item';
      document.getElementById('itemForm').reset();
      document.getElementById('itemId').value = '';
      document.getElementById('itemModal').classList.add('active');
    }
    
    function openEditModal(id) {
      const item = items.find(i => i.id === id);
      if (!item) return;
      
      document.getElementById('modalTitle').textContent = 'Edit Item';
      document.getElementById('itemId').value = item.id;
      document.getElementById('itemName').value = item.name;
      document.getElementById('itemQuantity').value = item.quantity;
      document.getElementById('itemCategory').value = item.category_id || '';
      document.getElementById('itemModal').classList.add('active');
    }
    
    function closeModal() {
      document.getElementById('itemModal').classList.remove('active');
      document.getElementById('itemForm').reset();
    }
    
    async function saveItem(event) {
      event.preventDefault();
      
      const id = document.getElementById('itemId').value;
      const data = {
        name: document.getElementById('itemName').value.trim(),
        quantity: parseInt(document.getElementById('itemQuantity').value, 10),
        category_id: document.getElementById('itemCategory').value 
          ? parseInt(document.getElementById('itemCategory').value, 10) 
          : null
      };
      
      try {
        let response;
        if (id) {
          // Update existing
          response = await fetch(\`/items/\${id}\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } else {
          // Create new
          response = await fetch('/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        }
        
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || 'Save failed');
        }
        
        closeModal();
        showMessage(id ? 'Item updated successfully' : 'Item created successfully', 'success');
        await refreshItems();
      } catch (err) {
        showMessage(err.message, 'error');
      }
    }
    
    async function deleteItem(id) {
      const item = items.find(i => i.id === id);
      if (!confirm(\`Are you sure you want to delete "\${item?.name || 'this item'}"?\`)) return;
      
      try {
        const response = await fetch(\`/items/\${id}\`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        showMessage('Item deleted successfully', 'success');
        await refreshItems();
      } catch (err) {
        showMessage(err.message, 'error');
      }
    }
    
    function showMessage(text, type) {
      const div = document.getElementById('message');
      div.className = type === 'error' ? 'error-message' : 'success-message';
      div.textContent = text;
      setTimeout(() => { div.textContent = ''; div.className = ''; }, 5000);
    }
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    // Close modal on overlay click
    document.getElementById('itemModal').addEventListener('click', (e) => {
      if (e.target.id === 'itemModal') closeModal();
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;
  
  return c.html(html);
});

// API endpoint to save dashboard preferences (optional enhancement)
router.post('/prefs', async (c) => {
  let body;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON' }, 400); }
  const result = DashboardPrefsSchema.safeParse(body);
  if (!result.success) return c.json({ error: result.error.issues[0].message }, 400);
  
  const { session_key, ...prefs } = result.data;
  const existing = db.prepare('SELECT id FROM items_dashboard_prefs WHERE session_key = ?').get(session_key);
  
  if (existing) {
    const updates: string[] = [];
    const params: unknown[] = [];
    if (prefs.default_sort_by !== undefined) { updates.push('default_sort_by = ?'); params.push(prefs.default_sort_by); }
    if (prefs.default_sort_order !== undefined) { updates.push('default_sort_order = ?'); params.push(prefs.default_sort_order); }
    if (prefs.last_category_filter !== undefined) { updates.push('last_category_filter = ?'); params.push(prefs.last_category_filter); }
    if (updates.length > 0) {
      params.push(session_key);
      db.prepare(`UPDATE items_dashboard_prefs SET ${updates.join(', ')}, updated_at = datetime('now') WHERE session_key = ?`).run(...params);
    }
  } else {
    db.prepare(`INSERT INTO items_dashboard_prefs (session_key, default_sort_by, default_sort_order, last_category_filter) VALUES (?, ?, ?, ?)`)
      .run(session_key, prefs.default_sort_by ?? 'name', prefs.default_sort_order ?? 'asc', prefs.last_category_filter ?? null);
  }
  
  return c.json({ success: true });
});

router.get('/prefs/:session_key', (c) => {
  const prefs = db.prepare('SELECT * FROM items_dashboard_prefs WHERE session_key = ?').get(c.req.param('session_key'));
  return c.json(prefs || { default_sort_by: 'name', default_sort_order: 'asc', last_category_filter: null });
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;
