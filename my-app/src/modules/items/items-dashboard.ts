import { Hono } from 'hono';
import { db, registerMigration } from '../../db.js';
import { z } from 'zod';

const router = new Hono();

// Migrations
// Dashboard uses items and categories tables from the Items API
// No additional migrations needed - tables are created by Items module

// Schemas
const FilterSchema = z.object({
  category_id: z.string().optional(),
  search: z.string().optional(),
  sort_by: z.enum(['name', 'quantity']).optional().default('name'),
  sort_order: z.enum(['asc', 'desc']).optional().default('asc'),
});

const CreateItemSchema = z.object({
  name: z.string().min(1).max(200),
  quantity: z.number().int().min(0),
  category_id: z.number().int().nullable().optional(),
});

const UpdateItemSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  quantity: z.number().int().min(0).optional(),
  category_id: z.number().int().nullable().optional(),
});

// Routes
// Dashboard page - serves the HTML interface with filtering and CRUD buttons
router.get('/', async (c) => {
  const query = c.req.query();
  const filters = FilterSchema.safeParse(query);
  
  // Build query params for API call
  const params = new URLSearchParams();
  if (filters.success) {
    if (filters.data.category_id) params.append('category_id', filters.data.category_id);
    if (filters.data.search) params.append('search', filters.data.search);
    if (filters.data.sort_by) params.append('sort_by', filters.data.sort_by);
    if (filters.data.sort_order) params.append('sort_order', filters.data.sort_order);
  }
  
  // Fetch items from the Items API
  const itemsUrl = new URL(c.req.url);
  itemsUrl.pathname = '/items';
  itemsUrl.search = params.toString();
  const itemsResponse = await fetch(itemsUrl.toString());
  const items = itemsResponse.ok ? await itemsResponse.json() : [];
  
  // Fetch categories for filter dropdown
  const categoriesUrl = new URL(c.req.url);
  categoriesUrl.pathname = '/categories';
  const categoriesResponse = await fetch(categoriesUrl.toString());
  const categories = categoriesResponse.ok ? await categoriesResponse.json() : [];
  
  const currentCategoryId = filters.success ? filters.data.category_id : undefined;
  const currentSearch = filters.success ? filters.data.search : '';
  const currentSortBy = filters.success ? filters.data.sort_by : 'name';
  const currentSortOrder = filters.success ? filters.data.sort_order : 'asc';
  
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
    .controls { display: flex; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; background: white; padding: 16px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .controls input, .controls select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    .controls input[type="text"] { min-width: 200px; }
    .btn { padding: 8px 16px; border: none; border-radius: 4px; cursor: pointer; font-size: 14px; transition: background 0.2s; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #545b62; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); border-collapse: collapse; }
    th, td { padding: 12px 16px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #555; cursor: pointer; user-select: none; }
    th:hover { background: #e9ecef; }
    th .sort-indicator { margin-left: 4px; color: #999; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .actions button { padding: 6px 12px; font-size: 12px; }
    .empty-state { text-align: center; padding: 40px; color: #666; }
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); align-items: center; justify-content: center; z-index: 1000; }
    .modal-overlay.active { display: flex; }
    .modal { background: white; padding: 24px; border-radius: 8px; min-width: 400px; max-width: 90vw; box-shadow: 0 4px 20px rgba(0,0,0,0.15); }
    .modal h2 { margin-top: 0; }
    .form-group { margin-bottom: 16px; }
    .form-group label { display: block; margin-bottom: 4px; font-weight: 500; color: #555; }
    .form-group input, .form-group select { width: 100%; padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; }
    .form-actions { display: flex; gap: 8px; justify-content: flex-end; margin-top: 20px; }
    .category-badge { display: inline-block; padding: 2px 8px; background: #e9ecef; border-radius: 12px; font-size: 12px; color: #555; }
    .no-category { color: #999; font-style: italic; }
  </style>
</head>
<body>
  <h1>📦 Items Dashboard</h1>
  
  <div class="controls">
    <input type="text" id="searchInput" placeholder="Search items by name..." value="${currentSearch || ''}">
    <select id="categoryFilter">
      <option value="">All Categories</option>
      ${categories.map((cat: {id: number, name: string}) => `
        <option value="${cat.id}" ${String(currentCategoryId) === String(cat.id) ? 'selected' : ''}>${cat.name}</option>
      `).join('')}
    </select>
    <button class="btn btn-primary" onclick="openModal()">+ Create Item</button>
  </div>
  
  <table>
    <thead>
      <tr>
        <th onclick="sort('name')">Name ${getSortIndicator('name', currentSortBy, currentSortOrder)}</th>
        <th onclick="sort('quantity')">Quantity ${getSortIndicator('quantity', currentSortBy, currentSortOrder)}</th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      ${items.length === 0 ? `
        <tr>
          <td colspan="4" class="empty-state">No items found. Create your first item to get started.</td>
        </tr>
      ` : items.map((item: {id: number, name: string, quantity: number, category_name?: string, category_id?: number | null}) => `
        <tr data-id="${item.id}">
          <td>${escapeHtml(item.name)}</td>
          <td>${item.quantity}</td>
          <td>${item.category_name ? `<span class="category-badge">${escapeHtml(item.category_name)}</span>` : '<span class="no-category">—</span>'}</td>
          <td>
            <div class="actions">
              <button class="btn btn-secondary" onclick="editItem(${item.id}, '${escapeJs(item.name)}', ${item.quantity}, ${item.category_id || 'null'})">Edit</button>
              <button class="btn btn-danger" onclick="deleteItem(${item.id})">Delete</button>
            </div>
          </td>
        </tr>
      `).join('')}
    </tbody>
  </table>
  
  <!-- Modal for Create/Edit -->
  <div class="modal-overlay" id="modal">
    <div class="modal">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm" onsubmit="saveItem(event)">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="name">Name</label>
          <input type="text" id="name" required minlength="1" maxlength="200">
        </div>
        <div class="form-group">
          <label for="quantity">Quantity</label>
          <input type="number" id="quantity" required min="0" value="0">
        </div>
        <div class="form-group">
          <label for="category">Category</label>
          <select id="category">
            <option value="">— No Category —</option>
            ${categories.map((cat: {id: number, name: string}) => `
              <option value="${cat.id}">${escapeHtml(cat.name)}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="btn btn-secondary" onclick="closeModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  
  <script>
    // Filter handlers
    document.getElementById('searchInput').addEventListener('input', debounce(applyFilters, 300));
    document.getElementById('categoryFilter').addEventListener('change', applyFilters);
    
    function debounce(fn, ms) {
      let timeout;
      return function(...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, args), ms);
      };
    }
    
    function applyFilters() {
      const search = document.getElementById('searchInput').value;
      const categoryId = document.getElementById('categoryFilter').value;
      const params = new URLSearchParams(window.location.search);
      
      if (search) params.set('search', search);
      else params.delete('search');
      
      if (categoryId) params.set('category_id', categoryId);
      else params.delete('category_id');
      
      window.location.search = params.toString();
    }
    
    function sort(field) {
      const params = new URLSearchParams(window.location.search);
      const currentSort = params.get('sort_by');
      const currentOrder = params.get('sort_order') || 'asc';
      
      if (currentSort === field) {
        params.set('sort_order', currentOrder === 'asc' ? 'desc' : 'asc');
      } else {
        params.set('sort_by', field);
        params.set('sort_order', 'asc');
      }
      
      window.location.search = params.toString();
    }
    
    // Modal handlers
    function openModal() {
      document.getElementById('modalTitle').textContent = 'Create Item';
      document.getElementById('itemForm').reset();
      document.getElementById('itemId').value = '';
      document.getElementById('modal').classList.add('active');
    }
    
    function closeModal() {
      document.getElementById('modal').classList.remove('active');
    }
    
    function editItem(id, name, quantity, categoryId) {
      document.getElementById('modalTitle').textContent = 'Edit Item';
      document.getElementById('itemId').value = id;
      document.getElementById('name').value = name;
      document.getElementById('quantity').value = quantity;
      document.getElementById('category').value = categoryId || '';
      document.getElementById('modal').classList.add('active');
    }
    
    // CRUD operations via Items API
    async function saveItem(event) {
      event.preventDefault();
      
      const id = document.getElementById('itemId').value;
      const data = {
        name: document.getElementById('name').value,
        quantity: parseInt(document.getElementById('quantity').value, 10),
        category_id: document.getElementById('category').value || null
      };
      
      try {
        const url = id ? \`/items/\${id}\` : '/items';
        const method = id ? 'PATCH' : 'POST';
        
        const response = await fetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (!response.ok) {
          const error = await response.json();
          alert('Error: ' + (error.error || 'Failed to save item'));
          return;
        }
        
        closeModal();
        window.location.reload();
      } catch (err) {
        alert('Error saving item: ' + err.message);
      }
    }
    
    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      try {
        const response = await fetch(\`/items/\${id}\`, { method: 'DELETE' });
        
        if (!response.ok) {
          const error = await response.json();
          alert('Error: ' + (error.error || 'Failed to delete item'));
          return;
        }
        
        window.location.reload();
      } catch (err) {
        alert('Error deleting item: ' + err.message);
      }
    }
    
    // Close modal on overlay click
    document.getElementById('modal').addEventListener('click', (e) => {
      if (e.target.id === 'modal') closeModal();
    });
    
    // Close modal on Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeModal();
    });
  </script>
</body>
</html>`;

  function getSortIndicator(field: string, currentSortBy: string, currentSortOrder: string): string {
    if (currentSortBy !== field) return '↕️';
    return currentSortOrder === 'asc' ? '▲' : '▼';
  }
  
  function escapeHtml(str: string): string {
    if (!str) return '';
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
  
  function escapeJs(str: string): string {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"').replace(/\n/g, '\\n');
  }
  
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
