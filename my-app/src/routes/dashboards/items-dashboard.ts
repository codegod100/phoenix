import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

const router = new Hono();

// Migrations
// Dashboard modules don't require database tables - they use the /items API endpoints

// Schemas
// Dashboard uses the items API - no direct database schemas needed

// Routes
// Serve the dashboard HTML page with embedded JavaScript
router.get('/', async (c) => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { color: #333; margin-bottom: 20px; }
    .controls { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    input, select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    input[type="text"] { min-width: 200px; }
    button { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #545b62; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    .btn-success { background: #28a745; color: white; }
    .btn-success:hover { background: #218838; }
    table { width: 100%; background: white; border-collapse: collapse; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-radius: 4px; overflow: hidden; }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #555; cursor: pointer; user-select: none; }
    th:hover { background: #e9ecef; }
    th .sort-indicator { margin-left: 5px; color: #999; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 6px 12px; font-size: 12px; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; padding: 24px; border-radius: 8px; min-width: 400px; max-width: 90%; max-height: 90vh; overflow-y: auto; }
    .modal-header { margin-bottom: 20px; }
    .modal-header h2 { margin: 0; color: #333; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 6px; font-weight: 500; color: #555; }
    .form-group input, .form-group select { width: 100%; }
    .modal-footer { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .empty-state { text-align: center; padding: 40px; color: #666; }
    .category-badge { display: inline-block; padding: 2px 8px; background: #e9ecef; border-radius: 12px; font-size: 12px; color: #555; }
    .no-category { color: #999; font-style: italic; }
    .error { color: #dc3545; margin-top: 10px; }
  </style>
</head>
<body>
  <h1>📦 Items Dashboard</h1>
  
  <div class="controls">
    <input type="text" id="searchInput" placeholder="Search items by name...">
    <select id="categoryFilter">
      <option value="">All Categories</option>
    </select>
    <button class="btn-primary" onclick="openCreateModal()">+ Create Item</button>
  </div>
  
  <table id="itemsTable">
    <thead>
      <tr>
        <th onclick="sortItems('name')">Name <span class="sort-indicator" id="sort-name">↕</span></th>
        <th onclick="sortItems('quantity')">Quantity <span class="sort-indicator" id="sort-quantity">↕</span></th>
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
      <div class="modal-header">
        <h2 id="modalTitle">Create Item</h2>
      </div>
      <form id="itemForm" onsubmit="handleSubmit(event)">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="itemName">Name *</label>
          <input type="text" id="itemName" required minlength="1" maxlength="200">
        </div>
        <div class="form-group">
          <label for="itemQuantity">Quantity *</label>
          <input type="number" id="itemQuantity" required min="0">
        </div>
        <div class="form-group">
          <label for="itemCategory">Category</label>
          <select id="itemCategory">
            <option value="">-- No Category --</option>
          </select>
        </div>
        <div class="error" id="formError"></div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn-success">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let allItems = [];
    let allCategories = [];
    let currentSort = { field: null, direction: 'asc' };

    // Load items and categories on page load
    async function loadData() {
      try {
        const [itemsRes, categoriesRes] = await Promise.all([
          fetch('/items'),
          fetch('/items/categories')
        ]);
        
        if (!itemsRes.ok) throw new Error('Failed to load items');
        if (!categoriesRes.ok) throw new Error('Failed to load categories');
        
        allItems = await itemsRes.json();
        allCategories = await categoriesRes.json();
        
        populateCategoryFilter();
        populateCategorySelect();
        renderItems();
      } catch (err) {
        document.getElementById('itemsBody').innerHTML = 
          '<tr><td colspan="4" class="empty-state">Error loading data: ' + err.message + '</td></tr>';
      }
    }

    // Populate category filter dropdown
    function populateCategoryFilter() {
      const select = document.getElementById('categoryFilter');
      select.innerHTML = '<option value="">All Categories</option>';
      allCategories.forEach(cat => {
        select.innerHTML += '<option value="' + cat.id + '">' + escapeHtml(cat.name) + '</option>';
      });
      select.onchange = renderItems;
    }

    // Populate category select in modal
    function populateCategorySelect() {
      const select = document.getElementById('itemCategory');
      select.innerHTML = '<option value="">-- No Category --</option>';
      allCategories.forEach(cat => {
        select.innerHTML += '<option value="' + cat.id + '">' + escapeHtml(cat.name) + '</option>';
      });
    }

    // Get filtered and sorted items
    function getFilteredItems() {
      const searchTerm = document.getElementById('searchInput').value.toLowerCase();
      const categoryId = document.getElementById('categoryFilter').value;
      
      let filtered = allItems.filter(item => {
        const matchesSearch = !searchTerm || (item.name && item.name.toLowerCase().includes(searchTerm));
        const matchesCategory = !categoryId || item.category_id == categoryId;
        return matchesSearch && matchesCategory;
      });

      // Apply sorting
      if (currentSort.field) {
        filtered.sort((a, b) => {
          let aVal = a[currentSort.field];
          let bVal = b[currentSort.field];
          
          if (typeof aVal === 'string') {
            aVal = aVal.toLowerCase();
            bVal = bVal.toLowerCase();
          }
          
          if (aVal < bVal) return currentSort.direction === 'asc' ? -1 : 1;
          if (aVal > bVal) return currentSort.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
      
      return filtered;
    }

    // Render items table
    function renderItems() {
      const tbody = document.getElementById('itemsBody');
      const filtered = getFilteredItems();
      
      if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        return;
      }
      
      tbody.innerHTML = filtered.map(item => {
        const categoryName = item.category_name 
          ? '<span class="category-badge">' + escapeHtml(item.category_name) + '</span>'
          : '<span class="no-category">—</span>';
        
        return '<tr>' +
          '<td>' + escapeHtml(item.name) + '</td>' +
          '<td>' + item.quantity + '</td>' +
          '<td>' + categoryName + '</td>' +
          '<td class="actions">' +
            '<button class="btn-secondary" onclick="openEditModal(' + item.id + ')">Edit</button>' +
            '<button class="btn-danger" onclick="deleteItem(' + item.id + ')">Delete</button>' +
          '</td>' +
        '</tr>';
      }).join('');
    }

    // Sort items
    function sortItems(field) {
      // Reset indicators
      document.querySelectorAll('.sort-indicator').forEach(el => el.textContent = '↕');
      
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }
      
      document.getElementById('sort-' + field).textContent = currentSort.direction === 'asc' ? '↑' : '↓';
      renderItems();
    }

    // Search input handler
    document.getElementById('searchInput').addEventListener('input', renderItems);

    // Modal functions
    function openCreateModal() {
      document.getElementById('modalTitle').textContent = 'Create Item';
      document.getElementById('itemForm').reset();
      document.getElementById('itemId').value = '';
      document.getElementById('formError').textContent = '';
      document.getElementById('itemModal').classList.add('active');
    }

    async function openEditModal(id) {
      const item = allItems.find(i => i.id === id);
      if (!item) return;
      
      document.getElementById('modalTitle').textContent = 'Edit Item';
      document.getElementById('itemId').value = item.id;
      document.getElementById('itemName').value = item.name;
      document.getElementById('itemQuantity').value = item.quantity;
      document.getElementById('itemCategory').value = item.category_id || '';
      document.getElementById('formError').textContent = '';
      document.getElementById('itemModal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('itemModal').classList.remove('active');
    }

    // Handle form submission (create or update)
    async function handleSubmit(event) {
      event.preventDefault();
      document.getElementById('formError').textContent = '';
      
      const id = document.getElementById('itemId').value;
      const data = {
        name: document.getElementById('itemName').value.trim(),
        quantity: parseInt(document.getElementById('itemQuantity').value),
        category_id: document.getElementById('itemCategory').value || null
      };
      
      try {
        const url = id ? '/items/' + id : '/items';
        const method = id ? 'PATCH' : 'POST';
        
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to save item');
        }
        
        closeModal();
        await loadData(); // Refresh data
      } catch (err) {
        document.getElementById('formError').textContent = err.message;
      }
    }

    // Delete item
    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      try {
        const res = await fetch('/items/' + id, { method: 'DELETE' });
        if (!res.ok) throw new Error('Failed to delete item');
        await loadData(); // Refresh data
      } catch (err) {
        alert('Error deleting item: ' + err.message);
      }
    }

    // Escape HTML to prevent XSS
    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    // Close modal on background click
    document.getElementById('itemModal').addEventListener('click', function(e) {
      if (e.target === this) closeModal();
    });

    // Initialize
    loadData();
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
