import { Hono } from 'hono';
import { db, registerMigration } from '../db.js';
import { z } from 'zod';

const router = new Hono();

// Migrations
// No migrations needed - items table is managed by the Items API module
// Categories table may also exist from Categories module, but we ensure it exists for dashboard filtering
registerMigration('items_dashboard_categories', `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    description TEXT NOT NULL DEFAULT ''
  )
`);

// Schemas
const FilterItemsSchema = z.object({
  search: z.string().optional(),
  category_id: z.coerce.number().int().nullable().optional(),
  sort_by: z.enum(['name', 'quantity', 'category']).optional().default('name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
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
// Dashboard page - serves the HTML interface
router.get('/', (c) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all() as { id: number; name: string }[];
  
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { color: #333; margin-bottom: 20px; }
    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .search-box { flex: 1; min-width: 200px; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .filter-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: white; }
    .sort-select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; background: white; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
    .btn-primary { background: #2563eb; color: white; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-danger { background: #dc2626; color: white; }
    .btn-danger:hover { background: #b91c1c; }
    .btn-secondary { background: #6b7280; color: white; }
    .btn-secondary:hover { background: #4b5563; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; cursor: pointer; user-select: none; }
    th:hover { background: #f3f4f6; }
    th .sort-icon { margin-left: 4px; color: #9ca3af; }
    tr:hover { background: #f9fafb; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 6px 12px; font-size: 12px; }
    .category-badge { display: inline-block; padding: 2px 8px; background: #e0e7ff; color: #3730a3; border-radius: 12px; font-size: 12px; }
    .category-badge.uncategorized { background: #f3f4f6; color: #6b7280; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; padding: 24px; border-radius: 8px; width: 90%; max-width: 400px; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); }
    .modal-content h2 { margin-bottom: 16px; color: #333; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 4px; font-size: 14px; font-weight: 500; color: #374151; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .form-group input:focus, .form-group select:focus { outline: none; border-color: #2563eb; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .empty-state { text-align: center; padding: 40px; color: #6b7280; }
    .error-message { color: #dc2626; font-size: 14px; margin-top: 8px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📦 Items Dashboard</h1>
    
    <div class="toolbar">
      <input type="text" id="searchInput" class="search-box" placeholder="Search items by name...">
      <select id="categoryFilter" class="filter-select">
        <option value="">All Categories</option>
        ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
      </select>
      <select id="sortBy" class="sort-select">
        <option value="name">Sort by Name</option>
        <option value="quantity">Sort by Quantity</option>
        <option value="category">Sort by Category</option>
      </select>
      <button id="sortOrderBtn" class="btn btn-secondary">↑ Ascending</button>
      <button id="createBtn" class="btn btn-primary">+ Create Item</button>
    </div>

    <table id="itemsTable">
      <thead>
        <tr>
          <th data-sort="name">Name <span class="sort-icon">↕</span></th>
          <th data-sort="quantity">Quantity <span class="sort-icon">↕</span></th>
          <th data-sort="category">Category <span class="sort-icon">↕</span></th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="itemsTableBody">
        <tr><td colspan="4" class="empty-state">Loading...</td></tr>
      </tbody>
    </table>
  </div>

  <!-- Create/Edit Modal -->
  <div id="itemModal" class="modal">
    <div class="modal-content">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm">
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
        <div id="formError" class="error-message"></div>
        <div class="modal-actions">
          <button type="button" id="cancelBtn" class="btn btn-secondary">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    // State
    let items = [];
    let currentSortBy = 'name';
    let currentSortOrder = 'asc';
    let currentSearch = '';
    let currentCategoryFilter = '';

    // DOM elements
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const sortBy = document.getElementById('sortBy');
    const sortOrderBtn = document.getElementById('sortOrderBtn');
    const createBtn = document.getElementById('createBtn');
    const itemsTableBody = document.getElementById('itemsTableBody');
    const itemModal = document.getElementById('itemModal');
    const modalTitle = document.getElementById('modalTitle');
    const itemForm = document.getElementById('itemForm');
    const itemId = document.getElementById('itemId');
    const itemName = document.getElementById('itemName');
    const itemQuantity = document.getElementById('itemQuantity');
    const itemCategory = document.getElementById('itemCategory');
    const formError = document.getElementById('formError');
    const cancelBtn = document.getElementById('cancelBtn');

    // Load items from API
    async function loadItems() {
      try {
        const response = await fetch('/items');
        if (!response.ok) throw new Error('Failed to load items');
        items = await response.json();
        renderItems();
      } catch (error) {
        itemsTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">Error loading items. Please try again.</td></tr>';
      }
    }

    // Filter and sort items
    function getFilteredItems() {
      let result = [...items];
      
      // Search filter
      if (currentSearch) {
        const searchLower = currentSearch.toLowerCase();
        result = result.filter(item => item.name.toLowerCase().includes(searchLower));
      }
      
      // Category filter
      if (currentCategoryFilter) {
        result = result.filter(item => item.category_id === parseInt(currentCategoryFilter));
      }
      
      // Sort
      result.sort((a, b) => {
        let aVal, bVal;
        if (currentSortBy === 'name') {
          aVal = a.name.toLowerCase();
          bVal = b.name.toLowerCase();
        } else if (currentSortBy === 'quantity') {
          aVal = a.quantity;
          bVal = b.quantity;
        } else if (currentSortBy === 'category') {
          aVal = (a.category_name || '').toLowerCase();
          bVal = (b.category_name || '').toLowerCase();
        }
        
        if (aVal < bVal) return currentSortOrder === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSortOrder === 'asc' ? 1 : -1;
        return 0;
      });
      
      return result;
    }

    // Render items table
    function renderItems() {
      const filtered = getFilteredItems();
      
      if (filtered.length === 0) {
        itemsTableBody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        return;
      }
      
      itemsTableBody.innerHTML = filtered.map(item => \`
        <tr data-id="\${item.id}">
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity}</td>
          <td>
            \${item.category_name 
              ? \`<span class="category-badge">\${escapeHtml(item.category_name)}</span>\`
              : \`<span class="category-badge uncategorized">Uncategorized</span>\`
            }
          </td>
          <td class="actions">
            <button class="btn btn-primary" onclick="editItem(\${item.id})">Edit</button>
            <button class="btn btn-danger" onclick="deleteItem(\${item.id})">Delete</button>
          </td>
        </tr>
      \`).join('');
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Create item
    async function createItem(data) {
      const response = await fetch('/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create item');
      }
    }

    // Update item
    async function updateItem(id, data) {
      const response = await fetch(\`/items/\${id}\`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update item');
      }
    }

    // Delete item
    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      try {
        const response = await fetch(\`/items/\${id}\`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete item');
        await loadItems();
      } catch (error) {
        alert('Error deleting item: ' + error.message);
      }
    }

    // Edit item - opens modal
    async function editItem(id) {
      try {
        const response = await fetch(\`/items/\${id}\`);
        if (!response.ok) throw new Error('Item not found');
        const item = await response.json();
        
        itemId.value = item.id;
        itemName.value = item.name;
        itemQuantity.value = item.quantity;
        itemCategory.value = item.category_id || '';
        formError.textContent = '';
        modalTitle.textContent = 'Edit Item';
        itemModal.classList.add('active');
      } catch (error) {
        alert('Error loading item: ' + error.message);
      }
    }

    // Open create modal
    function openCreateModal() {
      itemId.value = '';
      itemName.value = '';
      itemQuantity.value = '0';
      itemCategory.value = '';
      formError.textContent = '';
      modalTitle.textContent = 'Create Item';
      itemModal.classList.add('active');
    }

    // Close modal
    function closeModal() {
      itemModal.classList.remove('active');
    }

    // Event listeners
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderItems();
    });

    categoryFilter.addEventListener('change', (e) => {
      currentCategoryFilter = e.target.value;
      renderItems();
    });

    sortBy.addEventListener('change', (e) => {
      currentSortBy = e.target.value;
      renderItems();
    });

    sortOrderBtn.addEventListener('click', () => {
      currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      sortOrderBtn.textContent = currentSortOrder === 'asc' ? '↑ Ascending' : '↓ Descending';
      renderItems();
    });

    createBtn.addEventListener('click', openCreateModal);
    cancelBtn.addEventListener('click', closeModal);

    itemModal.addEventListener('click', (e) => {
      if (e.target === itemModal) closeModal();
    });

    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      formError.textContent = '';
      
      const data = {
        name: itemName.value.trim(),
        quantity: parseInt(itemQuantity.value, 10),
        category_id: itemCategory.value ? parseInt(itemCategory.value, 10) : null
      };
      
      try {
        if (itemId.value) {
          await updateItem(itemId.value, data);
        } else {
          await createItem(data);
        }
        closeModal();
        await loadItems();
      } catch (error) {
        formError.textContent = error.message;
      }
    });

    // Table header sorting
    document.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const sortField = th.dataset.sort;
        if (currentSortBy === sortField) {
          currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
        } else {
          currentSortBy = sortField;
          currentSortOrder = 'asc';
        }
        sortBy.value = sortField;
        sortOrderBtn.textContent = currentSortOrder === 'asc' ? '↑ Ascending' : '↓ Descending';
        renderItems();
      });
    });

    // Initial load
    loadItems();
  </script>
</body>
</html>`);
});

// API endpoint for dashboard data (optional - can be used if client wants JSON)
router.get('/data', (c) => {
  const search = c.req.query('search') || '';
  const categoryId = c.req.query('category_id');
  const sortBy = c.req.query('sort_by') || 'name';
  const sortOrder = c.req.query('sort_order') || 'asc';

  let sql = 'SELECT items.*, categories.name as category_name FROM items LEFT JOIN categories ON items.category_id = categories.id';
  const conditions: string[] = [];
  const params: (string | number)[] = [];

  if (search) {
    conditions.push('items.name LIKE ?');
    params.push(`%${search}%`);
  }
  if (categoryId !== undefined && categoryId !== '') {
    conditions.push('items.category_id = ?');
    params.push(Number(categoryId));
  }
  if (conditions.length > 0) sql += ' WHERE ' + conditions.join(' AND ');

  const validSortFields = ['name', 'quantity', 'category'];
  const orderField = validSortFields.includes(sortBy) ? sortBy : 'name';
  const orderDir = sortOrder === 'desc' ? 'DESC' : 'ASC';
  
  if (orderField === 'category') {
    sql += ' ORDER BY categories.name ' + orderDir + ' NULLS LAST';
  } else {
    sql += ' ORDER BY items.' + orderField + ' ' + orderDir;
  }

  return c.json(db.prepare(sql).all(...params));
});

export default router;

/** @internal Phoenix VCS traceability — do not remove. */
export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2 as const],
} as const;
