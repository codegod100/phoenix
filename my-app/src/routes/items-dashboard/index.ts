import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

const router = new Hono();

// Items table is managed by the Items module
// Categories table reference for dashboard filters

// Dashboard uses Items API for mutations - no direct mutation schemas needed
// Schema for dashboard query parameters
const DashboardQuerySchema = z.object({
  search: z.string().optional(),
  category_id: z.coerce.number().int().nullable().optional(),
  sort_by: z.enum(['name', 'quantity']).optional().default('name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

type DashboardQuery = z.infer<typeof DashboardQuerySchema>;

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

// Helper function to escape JavaScript strings
function escapeJs(str: string): string {
  if (!str) return '';
  return str
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

// Dashboard page - serves the HTML dashboard
router.get('/', (c) => {
  const queryResult = DashboardQuerySchema.safeParse(c.req.query());
  const query: DashboardQuery = queryResult.success ? queryResult.data : { sort_by: 'name', sort_order: 'asc' };

  // Build SQL for fetching items with category info for dashboard display
  let sql = `
    SELECT 
      items.id,
      items.name,
      items.quantity,
      items.category_id,
      categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
  `;
  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  // Search filter (partial match on name)
  if (query.search) {
    conditions.push('items.name LIKE ?');
    params.push(`%${query.search}%`);
  }

  // Category filter
  if (query.category_id != null) {
    conditions.push('items.category_id = ?');
    params.push(query.category_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  // Sorting
  const sortColumn = query.sort_by === 'quantity' ? 'items.quantity' : 'items.name';
  const sortOrder = query.sort_order === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

  const items = db.prepare(sql).all(...params) as Array<{
    id: number;
    name: string;
    quantity: number;
    category_id: number | null;
    category_name: string | null;
  }>;

  // Fetch categories for filter dropdown
  const categories = db.prepare('SELECT id, name, description FROM categories ORDER BY name').all() as Array<{
    id: number;
    name: string;
    description: string | null;
  }>;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; margin-bottom: 20px; }
    .toolbar {
      display: flex;
      gap: 15px;
      align-items: center;
      flex-wrap: wrap;
      margin-bottom: 20px;
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    .search-box {
      flex: 1;
      min-width: 200px;
      position: relative;
    }
    .search-box input {
      width: 100%;
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    .filter-select {
      padding: 10px 15px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
      background: white;
      min-width: 150px;
    }
    .btn {
      padding: 10px 20px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 14px;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .btn:hover { opacity: 0.9; }
    .btn-primary {
      background: #3b82f6;
      color: white;
    }
    .btn-danger {
      background: #ef4444;
      color: white;
    }
    .btn-secondary {
      background: #6b7280;
      color: white;
    }
    table {
      width: 100%;
      background: white;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
      border-collapse: collapse;
    }
    th, td {
      padding: 15px;
      text-align: left;
      border-bottom: 1px solid #eee;
    }
    th {
      background: #f8f9fa;
      font-weight: 600;
      color: #374151;
      cursor: pointer;
      user-select: none;
    }
    th:hover { background: #e9ecef; }
    th .sort-indicator {
      margin-left: 5px;
      color: #9ca3af;
    }
    th.sort-asc .sort-indicator::after { content: '▲'; color: #3b82f6; }
    th.sort-desc .sort-indicator::after { content: '▼'; color: #3b82f6; }
    tr:hover { background: #f8f9fa; }
    .actions {
      display: flex;
      gap: 8px;
    }
    .actions button {
      padding: 6px 12px;
      font-size: 12px;
    }
    .category-badge {
      display: inline-block;
      padding: 4px 10px;
      background: #e5e7eb;
      border-radius: 12px;
      font-size: 12px;
      color: #374151;
    }
    .quantity-cell {
      font-weight: 600;
      color: #059669;
    }
    .empty-state {
      text-align: center;
      padding: 60px;
      color: #6b7280;
    }
    .modal-overlay {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0,0,0,0.5);
      z-index: 1000;
      align-items: center;
      justify-content: center;
    }
    .modal-overlay.active { display: flex; }
    .modal {
      background: white;
      border-radius: 12px;
      padding: 24px;
      width: 90%;
      max-width: 400px;
      box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1);
    }
    .modal h2 {
      margin: 0 0 20px 0;
      color: #333;
    }
    .form-group {
      margin-bottom: 15px;
    }
    .form-group label {
      display: block;
      margin-bottom: 5px;
      font-size: 14px;
      font-weight: 500;
      color: #374151;
    }
    .form-group input,
    .form-group select {
      width: 100%;
      padding: 10px;
      border: 1px solid #ddd;
      border-radius: 6px;
      font-size: 14px;
    }
    .form-group input:focus,
    .form-group select:focus {
      outline: none;
      border-color: #3b82f6;
    }
    .modal-actions {
      display: flex;
      gap: 10px;
      justify-content: flex-end;
      margin-top: 20px;
    }
    .toast {
      position: fixed;
      bottom: 20px;
      right: 20px;
      padding: 12px 20px;
      background: #333;
      color: white;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      display: none;
      z-index: 1001;
    }
    .toast.success { background: #059669; }
    .toast.error { background: #dc2626; }
    .toast.show { display: block; }
    .no-category {
      color: #9ca3af;
      font-style: italic;
    }
  </style>
</head>
<body>
  <h1>📦 Items Dashboard</h1>

  <div class="toolbar">
    <div class="search-box">
      <input type="text" id="searchInput" placeholder="Search items by name..." value="${query.search || ''}">
    </div>
    <select id="categoryFilter" class="filter-select">
      <option value="">All Categories</option>
      ${categories.map(c => `<option value="${c.id}" ${query.category_id === c.id ? 'selected' : ''}>${escapeHtml(c.name)}</option>`).join('')}
    </select>
    <button class="btn btn-primary" onclick="openCreateModal()">+ Create Item</button>
  </div>

  <table>
    <thead>
      <tr>
        <th onclick="sort('name')" class="${query.sort_by === 'name' ? (query.sort_order === 'asc' ? 'sort-asc' : 'sort-desc') : ''}">
          Name<span class="sort-indicator"></span>
        </th>
        <th onclick="sort('quantity')" class="${query.sort_by === 'quantity' ? (query.sort_order === 'asc' ? 'sort-asc' : 'sort-desc') : ''}">
          Quantity<span class="sort-indicator"></span>
        </th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${items.length === 0 ? `
        <tr>
          <td colspan="4" class="empty-state">
            No items found. ${query.search || query.category_id != null ? 'Try adjusting your filters.' : 'Create your first item!'}
          </td>
        </tr>
      ` : items.map(item => `
        <tr data-id="${item.id}">
          <td>${escapeHtml(item.name)}</td>
          <td class="quantity-cell">${item.quantity}</td>
          <td>
            ${item.category_name
              ? `<span class="category-badge">${escapeHtml(item.category_name)}</span>`
              : '<span class="no-category">—</span>'
            }
          </td>
          <td class="actions">
            <button class="btn btn-secondary" onclick="openEditModal(${item.id}, '${escapeJs(item.name)}', ${item.quantity}, ${item.category_id ?? 'null'})">Edit</button>
            <button class="btn btn-danger" onclick="deleteItem(${item.id})">Delete</button>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Create/Edit Modal -->
  <div class="modal-overlay" id="itemModal">
    <div class="modal">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm" onsubmit="handleSubmit(event)">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="itemName">Name *</label>
          <input type="text" id="itemName" required maxlength="200">
        </div>
        <div class="form-group">
          <label for="itemQuantity">Quantity *</label>
          <input type="number" id="itemQuantity" required min="0">
        </div>
        <div class="form-group">
          <label for="itemCategory">Category</label>
          <select id="itemCategory">
            <option value="">— None —</option>
            ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>

  <div class="toast" id="toast"></div>

  <script>
    // Categories data for the modal
    const categories = ${JSON.stringify(categories)};

    // Current sort state
    let currentSortBy = '${query.sort_by}';
    let currentSortOrder = '${query.sort_order}';

    // Escape HTML to prevent XSS
    function escapeHtml(str) {
      if (!str) return '';
      const div = document.createElement('div');
      div.textContent = str;
      return div.innerHTML;
    }

    // Escape for JavaScript strings
    function escapeJs(str) {
      if (!str) return '';
      return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
    }

    // Show toast notification
    function showToast(message, type = 'success') {
      const toast = document.getElementById('toast');
      toast.textContent = message;
      toast.className = 'toast ' + type + ' show';
      setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // Filter and search functionality
    function applyFilters() {
      const search = document.getElementById('searchInput').value;
      const categoryId = document.getElementById('categoryFilter').value;
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (categoryId) params.set('category_id', categoryId);
      params.set('sort_by', currentSortBy);
      params.set('sort_order', currentSortOrder);
      window.location.href = '?' + params.toString();
    }

    // Sorting
    function sort(column) {
      if (currentSortBy === column) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortBy = column;
        currentSortOrder = 'asc';
      }
      applyFilters();
    }

    // Event listeners for filters
    document.getElementById('searchInput')?.addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('categoryFilter')?.addEventListener('change', applyFilters);

    function debounce(fn, ms) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
      };
    }

    // Modal functions
    function openCreateModal() {
      document.getElementById('modalTitle').textContent = 'Create Item';
      document.getElementById('itemId').value = '';
      document.getElementById('itemName').value = '';
      document.getElementById('itemQuantity').value = '0';
      document.getElementById('itemCategory').value = '';
      document.getElementById('itemModal').classList.add('active');
    }

    function openEditModal(id, name, quantity, categoryId) {
      document.getElementById('modalTitle').textContent = 'Edit Item';
      document.getElementById('itemId').value = id;
      document.getElementById('itemName').value = name;
      document.getElementById('itemQuantity').value = quantity;
      document.getElementById('itemCategory').value = categoryId || '';
      document.getElementById('itemModal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('itemModal').classList.remove('active');
    }

    // Close modal on overlay click
    document.getElementById('itemModal')?.addEventListener('click', (e) => {
      if (e.target.id === 'itemModal') closeModal();
    });

    // Handle form submission (uses Items API)
    async function handleSubmit(event) {
      event.preventDefault();
      const id = document.getElementById('itemId').value;
      const name = document.getElementById('itemName').value.trim();
      const quantity = parseInt(document.getElementById('itemQuantity').value, 10);
      const categoryId = document.getElementById('itemCategory').value || null;

      const data = { name, quantity, category_id: categoryId };

      try {
        let response;
        if (id) {
          // Update via Items API
          response = await fetch(\`/items/\${id}\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        } else {
          // Create via Items API
          response = await fetch('/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
        }

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || \`HTTP \${response.status}\`);
        }

        showToast(id ? 'Item updated successfully!' : 'Item created successfully!');
        closeModal();
        // Refresh the page to show updated data
        setTimeout(() => applyFilters(), 500);
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    }

    // Delete item (uses Items API)
    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;

      try {
        const response = await fetch(\`/items/\${id}\`, {
          method: 'DELETE'
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: 'Unknown error' }));
          throw new Error(err.error || \`HTTP \${response.status}\`);
        }

        showToast('Item deleted successfully!');
        // Remove row from table
        const row = document.querySelector(\`tr[data-id="\${id}"]\`);
        if (row) row.remove();
      } catch (err) {
        showToast('Error: ' + err.message, 'error');
      }
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
      if (e.key === 'n' && e.ctrlKey) {
        e.preventDefault();
        openCreateModal();
      }
    });
  </script>
</body>
</html>`;

  return c.html(html);
});

// API endpoint for dashboard data (JSON version for potential AJAX use)
router.get('/data', (c) => {
  const queryResult = DashboardQuerySchema.safeParse(c.req.query());
  const query: DashboardQuery = queryResult.success ? queryResult.data : { sort_by: 'name', sort_order: 'asc' };

  let sql = `
    SELECT 
      items.id,
      items.name,
      items.quantity,
      items.category_id,
      categories.name as category_name
    FROM items
    LEFT JOIN categories ON items.category_id = categories.id
  `;
  const conditions: string[] = [];
  const params: (string | number | null)[] = [];

  if (query.search) {
    conditions.push('items.name LIKE ?');
    params.push(`%${query.search}%`);
  }

  if (query.category_id != null) {
    conditions.push('items.category_id = ?');
    params.push(query.category_id);
  }

  if (conditions.length > 0) {
    sql += ' WHERE ' + conditions.join(' AND ');
  }

  const sortColumn = query.sort_by === 'quantity' ? 'items.quantity' : 'items.name';
  const sortOrder = query.sort_order === 'desc' ? 'DESC' : 'ASC';
  sql += ` ORDER BY ${sortColumn} ${sortOrder}`;

  const items = db.prepare(sql).all(...params);

  return c.json({
    items,
    filters: {
      search: query.search,
      category_id: query.category_id,
      sort_by: query.sort_by,
      sort_order: query.sort_order,
    },
  });
});

// Categories list endpoint for the dashboard filters
router.get('/categories', (c) => {
  const categories = db.prepare('SELECT id, name, description FROM categories ORDER BY name').all();
  return c.json(categories);
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;
