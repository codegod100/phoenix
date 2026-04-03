import { Hono } from 'hono';
import { db, registerMigration } from './db.js';
import { z } from 'zod';

const router = new Hono();

// Migrations
// Dashboard module - no table needed, uses Items API

// Schemas
const QuerySchema = z.object({
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
// Helper function to fetch categories for the filter dropdown
async function fetchCategories() {
  try {
    const categories = db.prepare('SELECT id, name FROM categories ORDER BY name').all();
    return categories as { id: number; name: string }[];
  } catch {
    return [];
  }
}

// Main dashboard page - serves the HTML UI
router.get('/', async (c) => {
  const categories = await fetchCategories();
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f5f5f5; }
    h1 { margin-bottom: 20px; color: #333; }
    .toolbar { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .toolbar input, .toolbar select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .toolbar input[type="text"] { min-width: 200px; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: opacity 0.2s; }
    .btn:hover { opacity: 0.9; }
    .btn-primary { background: #007bff; color: white; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-secondary { background: #6c757d; color: white; }
    table { width: 100%; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #555; cursor: pointer; user-select: none; }
    th:hover { background: #e9ecef; }
    th .sort-indicator { margin-left: 5px; color: #999; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: none; align-items: center; justify-content: center; z-index: 1000; }
    .modal-overlay.active { display: flex; }
    .modal { background: white; padding: 25px; border-radius: 8px; width: 100%; max-width: 450px; max-height: 90vh; overflow-y: auto; }
    .modal h2 { margin-top: 0; margin-bottom: 20px; color: #333; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; color: #555; }
    .form-group input, .form-group select { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .form-group input[type="number"] { width: 100px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 20px; }
    .empty-state { text-align: center; padding: 40px; color: #666; }
    .badge { display: inline-block; padding: 3px 8px; border-radius: 12px; font-size: 12px; background: #e9ecef; color: #555; }
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
    <button class="btn btn-primary" onclick="openModal()">+ Create Item</button>
  </div>
  
  <table id="itemsTable">
    <thead>
      <tr>
        <th onclick="setSort('name')">Name <span class="sort-indicator" id="sort-name">↕</span></th>
        <th onclick="setSort('quantity')">Quantity <span class="sort-indicator" id="sort-quantity">↕</span></th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="tableBody">
      <tr><td colspan="4" class="empty-state">Loading...</td></tr>
    </tbody>
  </table>

  <!-- Modal Form -->
  <div class="modal-overlay" id="modal">
    <div class="modal">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm" onsubmit="handleSubmit(event)">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="nameInput">Name *</label>
          <input type="text" id="nameInput" required maxlength="200">
        </div>
        <div class="form-group">
          <label for="quantityInput">Quantity *</label>
          <input type="number" id="quantityInput" required min="0">
        </div>
        <div class="form-group">
          <label for="categoryInput">Category</label>
          <select id="categoryInput">
            <option value="">None</option>
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

  <script>
    let currentSort = { by: 'name', order: 'asc' };
    let items = [];

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function updateSortIndicators() {
      document.querySelectorAll('.sort-indicator').forEach(el => el.textContent = '↕');
      const indicator = document.getElementById('sort-' + currentSort.by);
      if (indicator) indicator.textContent = currentSort.order === 'asc' ? '↑' : '↓';
    }

    function setSort(field) {
      if (currentSort.by === field) {
        currentSort.order = currentSort.order === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.by = field;
        currentSort.order = 'asc';
      }
      updateSortIndicators();
      loadItems();
    }

    async function loadItems() {
      const search = document.getElementById('searchInput').value;
      const categoryId = document.getElementById('categoryFilter').value;
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryId) params.append('category_id', categoryId);
      params.append('sort_by', currentSort.by);
      params.append('sort_order', currentSort.order);
      
      try {
        const response = await fetch('/items?' + params.toString());
        if (!response.ok) throw new Error('Failed to load items');
        items = await response.json();
        renderTable();
      } catch (err) {
        document.getElementById('tableBody').innerHTML = '<tr><td colspan="4" class="empty-state">Error loading items</td></tr>';
      }
    }

    function renderTable() {
      const tbody = document.getElementById('tableBody');
      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        return;
      }
      
      tbody.innerHTML = items.map(item => \`
        <tr>
          <td>\${escapeHtml(item.name)}</td>
          <td>\${item.quantity}</td>
          <td>\${item.category_name ? '<span class="badge">' + escapeHtml(item.category_name) + '</span>' : '—'}</td>
          <td class="actions">
            <button class="btn btn-secondary" onclick="editItem(\${item.id})">Edit</button>
            <button class="btn btn-danger" onclick="deleteItem(\${item.id})">Delete</button>
          </td>
        </tr>
      \`).join('');
    }

    function openModal(item = null) {
      document.getElementById('modalTitle').textContent = item ? 'Edit Item' : 'Create Item';
      document.getElementById('itemId').value = item ? item.id : '';
      document.getElementById('nameInput').value = item ? item.name : '';
      document.getElementById('quantityInput').value = item ? item.quantity : '';
      document.getElementById('categoryInput').value = item ? (item.category_id || '') : '';
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
      document.getElementById('itemForm').reset();
    }

    async function handleSubmit(e) {
      e.preventDefault();
      const id = document.getElementById('itemId').value;
      const data = {
        name: document.getElementById('nameInput').value,
        quantity: parseInt(document.getElementById('quantityInput').value, 10),
        category_id: document.getElementById('categoryInput').value || null
      };
      
      try {
        if (id) {
          const response = await fetch('/items/' + id, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Update failed');
        } else {
          const response = await fetch('/items', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
          });
          if (!response.ok) throw new Error('Create failed');
        }
        closeModal();
        loadItems();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    async function editItem(id) {
      try {
        const response = await fetch('/items/' + id);
        if (!response.ok) throw new Error('Failed to load item');
        const item = await response.json();
        openModal(item);
      } catch (err) {
        alert('Error loading item: ' + err.message);
      }
    }

    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      try {
        const response = await fetch('/items/' + id, { method: 'DELETE' });
        if (!response.ok) throw new Error('Delete failed');
        loadItems();
      } catch (err) {
        alert('Error deleting item: ' + err.message);
      }
    }

    // Event listeners
    document.getElementById('searchInput').addEventListener('input', debounce(loadItems, 300));
    document.getElementById('categoryFilter').addEventListener('change', loadItems);
    
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('modal')) closeModal();
    });

    function debounce(fn, delay) {
      let timeout;
      return (...args) => {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn(...args), delay);
      };
    }

    // Initial load
    updateSortIndicators();
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
