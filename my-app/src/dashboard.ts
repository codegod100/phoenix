import { Hono } from 'hono';
import { db, registerMigration } from './db.js';
import { z } from 'zod';

const router = new Hono();

// Migrations
// No database table needed for dashboard itself - it uses the Items API

// Schemas
const QueryParamsSchema = z.object({
  search: z.string().optional(),
  category_id: z.string().optional(),
  sort_by: z.enum(['name', 'quantity']).optional().default('name'),
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
router.get('/', async (c) => {
  const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all() as Array<{ id: number; name: string }>;
  
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: system-ui, -apple-system, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; }
    .toolbar { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .toolbar input, .toolbar select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .toolbar input[type="text"] { flex: 1; min-width: 200px; }
    .toolbar button { padding: 8px 16px; background: #2563eb; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .toolbar button:hover { background: #1d4ed8; }
    .toolbar button.secondary { background: #6b7280; }
    .toolbar button.secondary:hover { background: #4b5563; }
    table { width: 100%; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #e5e7eb; }
    th { background: #f9fafb; font-weight: 600; color: #374151; cursor: pointer; user-select: none; }
    th:hover { background: #f3f4f6; }
    th .sort-indicator { margin-left: 6px; color: #9ca3af; }
    th.sort-asc .sort-indicator::after { content: ' ▲'; color: #2563eb; }
    th.sort-desc .sort-indicator::after { content: ' ▼'; color: #2563eb; }
    tr:hover { background: #f9fafb; }
    td { color: #4b5563; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 6px 12px; font-size: 12px; border: none; border-radius: 4px; cursor: pointer; }
    .actions .edit-btn { background: #f59e0b; color: white; }
    .actions .edit-btn:hover { background: #d97706; }
    .actions .delete-btn { background: #ef4444; color: white; }
    .actions .delete-btn:hover { background: #dc2626; }
    .category-badge { display: inline-block; padding: 2px 8px; background: #e0e7ff; color: #3730a3; border-radius: 12px; font-size: 12px; }
    .empty-state { text-align: center; padding: 60px 20px; color: #6b7280; }
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 1000; align-items: center; justify-content: center; }
    .modal-overlay.active { display: flex; }
    .modal { background: white; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow-y: auto; }
    .modal-header { padding: 20px; border-bottom: 1px solid #e5e7eb; }
    .modal-header h2 { margin: 0; font-size: 20px; }
    .modal-body { padding: 20px; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #374151; }
    .form-group input, .form-group select { width: 100%; padding: 10px 12px; border: 1px solid #d1d5db; border-radius: 4px; font-size: 14px; }
    .modal-footer { padding: 16px 20px; border-top: 1px solid #e5e7eb; display: flex; justify-content: flex-end; gap: 12px; }
    .modal-footer button { padding: 8px 16px; border-radius: 4px; font-size: 14px; cursor: pointer; }
    .btn-primary { background: #2563eb; color: white; border: none; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: white; color: #374151; border: 1px solid #d1d5db; }
    .btn-secondary:hover { background: #f9fafb; }
    .error-message { color: #dc2626; font-size: 12px; margin-top: 4px; display: none; }
    .loading { text-align: center; padding: 40px; color: #6b7280; }
  </style>
</head>
<body>
  <h1>📦 Items Dashboard</h1>
  
  <div class="toolbar">
    <input type="text" id="searchInput" placeholder="Search items by name...">
    <select id="categoryFilter">
      <option value="">All Categories</option>
      ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
    </select>
    <button onclick="openCreateModal()">+ Create Item</button>
    <button class="secondary" onclick="loadItems()">🔄 Refresh</button>
  </div>
  
  <table id="itemsTable">
    <thead>
      <tr>
        <th onclick="setSort('name')" id="th-name">Name<span class="sort-indicator"></span></th>
        <th onclick="setSort('quantity')" id="th-quantity">Quantity<span class="sort-indicator"></span></th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="itemsTableBody">
      <tr><td colspan="4" class="loading">Loading...</td></tr>
    </tbody>
  </table>
  
  <div id="createEditModal" class="modal-overlay">
    <div class="modal">
      <div class="modal-header">
        <h2 id="modalTitle">Create Item</h2>
      </div>
      <form id="itemForm" onsubmit="saveItem(event)">
        <div class="modal-body">
          <input type="hidden" id="itemId">
          <div class="form-group">
            <label for="itemName">Name *</label>
            <input type="text" id="itemName" required minlength="1" maxlength="200">
            <span class="error-message" id="nameError"></span>
          </div>
          <div class="form-group">
            <label for="itemQuantity">Quantity *</label>
            <input type="number" id="itemQuantity" required min="0">
            <span class="error-message" id="quantityError"></span>
          </div>
          <div class="form-group">
            <label for="itemCategory">Category</label>
            <select id="itemCategory">
              <option value="">-- None --</option>
              ${categories.map(c => `<option value="${c.id}">${escapeHtml(c.name)}</option>`).join('')}
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let currentSortBy = 'name';
    let currentSortOrder = 'asc';
    let allItems = [];
    
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }
    
    async function loadItems() {
      try {
        document.getElementById('itemsTableBody').innerHTML = '<tr><td colspan="4" class="loading">Loading...</td></tr>';
        
        const response = await fetch('/items');
        if (!response.ok) throw new Error('Failed to fetch items');
        allItems = await response.json();
        renderItems();
      } catch (error) {
        document.getElementById('itemsTableBody').innerHTML = '<tr><td colspan="4" class="empty-state">Error loading items: ' + escapeHtml(error.message) + '</td></tr>';
      }
    }
    
    function getFilteredAndSortedItems() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
      const categoryId = document.getElementById('categoryFilter').value;
      
      let filtered = allItems.filter(item => {
        const matchesSearch = !searchTerm || (item.name && item.name.toLowerCase().includes(searchTerm));
        const matchesCategory = !categoryId || item.category_id == categoryId;
        return matchesSearch && matchesCategory;
      });
      
      filtered.sort((a, b) => {
        let aVal = a[currentSortBy] || '';
        let bVal = b[currentSortBy] || '';
        
        if (typeof aVal === 'string') {
          aVal = aVal.toLowerCase();
          bVal = bVal.toLowerCase();
        }
        
        if (currentSortOrder === 'asc') {
          return aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
        } else {
          return aVal > bVal ? -1 : aVal < bVal ? 1 : 0;
        }
      });
      
      return filtered;
    }
    
    function renderItems() {
      const items = getFilteredAndSortedItems();
      const tbody = document.getElementById('itemsTableBody');
      
      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found. Create your first item!</td></tr>';
        return;
      }
      
      tbody.innerHTML = items.map(item => \`
        <tr>
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity ?? 0}</td>
          <td>\${item.category_name ? '<span class="category-badge">' + escapeHtml(item.category_name) + '</span>' : '-'}</td>
          <td>
            <div class="actions">
              <button class="edit-btn" onclick="openEditModal(\${item.id})">Edit</button>
              <button class="delete-btn" onclick="deleteItem(\${item.id})">Delete</button>
            </div>
          </td>
        </tr>
      \`).join('');
      
      // Update sort indicators
      document.querySelectorAll('th').forEach(th => th.classList.remove('sort-asc', 'sort-desc'));
      document.getElementById('th-' + currentSortBy).classList.add('sort-' + currentSortOrder);
    }
    
    function setSort(field) {
      if (currentSortBy === field) {
        currentSortOrder = currentSortOrder === 'asc' ? 'desc' : 'asc';
      } else {
        currentSortBy = field;
        currentSortOrder = 'asc';
      }
      renderItems();
    }
    
    function openCreateModal() {
      document.getElementById('modalTitle').textContent = 'Create Item';
      document.getElementById('itemForm').reset();
      document.getElementById('itemId').value = '';
      document.getElementById('itemCategory').value = '';
      hideErrors();
      document.getElementById('createEditModal').classList.add('active');
    }
    
    async function openEditModal(id) {
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      
      document.getElementById('modalTitle').textContent = 'Edit Item';
      document.getElementById('itemId').value = item.id;
      document.getElementById('itemName').value = item.name || '';
      document.getElementById('itemQuantity').value = item.quantity ?? 0;
      document.getElementById('itemCategory').value = item.category_id || '';
      hideErrors();
      document.getElementById('createEditModal').classList.add('active');
    }
    
    function closeModal() {
      document.getElementById('createEditModal').classList.remove('active');
    }
    
    function hideErrors() {
      document.querySelectorAll('.error-message').forEach(el => el.style.display = 'none');
    }
    
    function showError(field, message) {
      const errorEl = document.getElementById(field + 'Error');
      if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
      }
    }
    
    async function saveItem(event) {
      event.preventDefault();
      hideErrors();
      
      const id = document.getElementById('itemId').value;
      const name = document.getElementById('itemName').value.trim();
      const quantity = parseInt(document.getElementById('itemQuantity').value);
      const category_id = document.getElementById('itemCategory').value || null;
      
      if (!name) {
        showError('name', 'Name is required');
        return;
      }
      if (isNaN(quantity) || quantity < 0) {
        showError('quantity', 'Quantity must be a non-negative number');
        return;
      }
      
      const payload = { name, quantity, category_id };
      
      try {
        let response;
        if (id) {
          response = await fetch('/items/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        } else {
          response = await fetch('/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
          });
        }
        
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Request failed' }));
          alert('Error: ' + (error.error || 'Failed to save item'));
          return;
        }
        
        closeModal();
        await loadItems();
      } catch (error) {
        alert('Error saving item: ' + error.message);
      }
    }
    
    async function deleteItem(id) {
      const item = allItems.find(i => i.id === id);
      if (!confirm('Are you sure you want to delete "' + (item?.name || 'this item') + '"?')) return;
      
      try {
        const response = await fetch('/items/' + id, { method: 'DELETE' });
        if (!response.ok) throw new Error('Failed to delete item');
        await loadItems();
      } catch (error) {
        alert('Error deleting item: ' + error.message);
      }
    }
    
    // Event listeners for search and filter
    document.getElementById('searchInput').addEventListener('input', renderItems);
    document.getElementById('categoryFilter').addEventListener('change', renderItems);
    
    // Close modal on overlay click
    document.getElementById('createEditModal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });
    
    // Load items on page load
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
