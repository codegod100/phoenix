import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

// Migrations are handled by the Items API module; this dashboard only reads

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

const app = new Hono();

app.get('/', async (c) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all() as Array<{ id: number; name: string }>;

  const categoryOptionsHtml = categories
    .map(cat => `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`)
    .join('');

  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; margin-bottom: 20px; }
    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .toolbar input, .toolbar select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .toolbar input[type="search"] { min-width: 200px; }
    .toolbar button { padding: 8px 16px; background: #0066cc; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .toolbar button:hover { background: #0052a3; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #555; cursor: pointer; user-select: none; }
    th:hover { background: #e9ecef; }
    th .sort-indicator { margin-left: 4px; color: #999; }
    th.sort-asc .sort-indicator::after { content: '▲'; color: #0066cc; }
    th.sort-desc .sort-indicator::after { content: '▼'; color: #0066cc; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 4px 12px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer; }
    .edit-btn { background: #ffc107; color: #333; }
    .edit-btn:hover { background: #e0a800; }
    .delete-btn { background: #dc3545; color: white; }
    .delete-btn:hover { background: #c82333; }
    .category-badge { display: inline-block; padding: 2px 8px; background: #e9ecef; border-radius: 12px; font-size: 12px; color: #555; }
    .category-badge.uncategorized { background: #f8f9fa; color: #999; font-style: italic; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; padding: 24px; border-radius: 8px; width: 100%; max-width: 400px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
    .modal-content h2 { margin-top: 0; color: #333; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 4px; font-weight: 500; color: #555; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .modal-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .modal-actions button { padding: 8px 16px; border-radius: 4px; border: none; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #0066cc; color: white; }
    .btn-primary:hover { background: #0052a3; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #5a6268; }
    .empty-state { text-align: center; padding: 40px; color: #666; }
  </style>
</head>
<body>
  <h1>Items Dashboard</h1>
  
  <div class="toolbar">
    <input type="search" id="searchInput" placeholder="Search items by name..." />
    <select id="categoryFilter">
      <option value="">All Categories</option>
      ${categoryOptionsHtml}
    </select>
    <button onclick="openCreateModal()">+ Create Item</button>
  </div>

  <table id="itemsTable">
    <thead>
      <tr>
        <th onclick="sortBy('name')">Name <span class="sort-indicator"></span></th>
        <th onclick="sortBy('quantity')">Quantity <span class="sort-indicator"></span></th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="itemsBody">
      <tr><td colspan="4" class="empty-state">Loading items...</td></tr>
    </tbody>
  </table>

  <!-- Create/Edit Modal -->
  <div id="itemModal" class="modal">
    <div class="modal-content">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm" onsubmit="saveItem(event)">
        <input type="hidden" id="itemId" />
        <div class="form-group">
          <label for="itemName">Name *</label>
          <input type="text" id="itemName" required minlength="1" maxlength="200" />
        </div>
        <div class="form-group">
          <label for="itemQuantity">Quantity *</label>
          <input type="number" id="itemQuantity" required min="0" />
        </div>
        <div class="form-group">
          <label for="itemCategory">Category</label>
          <select id="itemCategory">
            <option value="">-- None --</option>
            ${categoryOptionsHtml}
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
    let allItems = [];
    let currentSort = { field: null, direction: 'asc' };
    let categoriesMap = new Map();

    // Load categories into map
    const categoryOptions = document.querySelectorAll('#categoryFilter option');
    categoryOptions.forEach(opt => {
      if (opt.value) categoriesMap.set(opt.value, opt.textContent);
    });

    async function loadItems() {
      try {
        const response = await fetch('/items');
        if (!response.ok) throw new Error('Failed to load items');
        allItems = await response.json();
        renderItems();
      } catch (err) {
        document.getElementById('itemsBody').innerHTML = \`<tr><td colspan="4" class="empty-state">Error loading items: \${err.message}</td></tr>\`;
      }
    }

    function getFilteredItems() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const categoryId = document.getElementById('categoryFilter').value;
      
      return allItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(searchTerm);
        const matchesCategory = !categoryId || item.category_id === parseInt(categoryId);
        return matchesSearch && matchesCategory;
      });
    }

    function sortItems(items) {
      if (!currentSort.field) return items;
      
      return [...items].sort((a, b) => {
        let aVal = a[currentSort.field];
        let bVal = b[currentSort.field];
        
        if (typeof aVal === 'string') aVal = aVal.toLowerCase();
        if (typeof bVal === 'string') bVal = bVal.toLowerCase();
        
        if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    function renderItems() {
      const filtered = getFilteredItems();
      const sorted = sortItems(filtered);
      const tbody = document.getElementById('itemsBody');
      
      if (sorted.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        return;
      }
      
      tbody.innerHTML = sorted.map(item => {
        const categoryName = item.category_name || 'Uncategorized';
        const categoryClass = item.category_name ? 'category-badge' : 'category-badge uncategorized';
        return \`<tr>
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity}</td>
          <td><span class="\${categoryClass}">\${escapeHtml(categoryName)}</span></td>
          <td class="actions">
            <button class="edit-btn" onclick='openEditModal(\${JSON.stringify(item).replace(/'/g, "&#39;")})'>Edit</button>
            <button class="delete-btn" onclick="deleteItem(\${item.id})">Delete</button>
          </td>
        </tr>\`;
      }).join('');
      
      // Update sort indicators
      document.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
      if (currentSort.field) {
        const headerIndex = currentSort.field === 'name' ? 0 : 1;
        document.querySelectorAll('th')[headerIndex].classList.add(currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
      }
    }

    function sortBy(field) {
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }
      renderItems();
    }

    function openCreateModal() {
      document.getElementById('modalTitle').textContent = 'Create Item';
      document.getElementById('itemForm').reset();
      document.getElementById('itemId').value = '';
      document.getElementById('itemModal').classList.add('active');
    }

    function openEditModal(item) {
      document.getElementById('modalTitle').textContent = 'Edit Item';
      document.getElementById('itemId').value = item.id;
      document.getElementById('itemName').value = item.name;
      document.getElementById('itemQuantity').value = item.quantity;
      document.getElementById('itemCategory').value = item.category_id || '';
      document.getElementById('itemModal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('itemModal').classList.remove('active');
    }

    async function saveItem(event) {
      event.preventDefault();
      
      const id = document.getElementById('itemId').value;
      const name = document.getElementById('itemName').value;
      const quantity = parseInt(document.getElementById('itemQuantity').value);
      const category_id = document.getElementById('itemCategory').value || null;
      
      const payload = { name, quantity };
      if (category_id !== null) payload.category_id = parseInt(category_id);
      
      try {
        if (id) {
          // Update existing
          const response = await fetch(\`/items/\${id}\`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Update failed');
          }
        } else {
          // Create new
          const response = await fetch('/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
          if (!response.ok) {
            const err = await response.json();
            throw new Error(err.error || 'Create failed');
          }
        }
        
        closeModal();
        await loadItems();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      try {
        const response = await fetch(\`/items/\${id}\`, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        await loadItems();
      } catch (err) {
        alert('Error deleting item: ' + err.message);
      }
    }

    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', renderItems);
    document.getElementById('categoryFilter').addEventListener('change', renderItems);
    
    // Close modal on backdrop click
    document.getElementById('itemModal').addEventListener('click', (e) => {
      if (e.target.id === 'itemModal') closeModal();
    });

    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });

    // Initial load
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

export default app;
