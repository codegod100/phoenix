import { Hono } from 'hono';
import { db } from '../../db.js';
import { z } from 'zod';

// escapeHtml helper at module scope for SSR safety
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const ItemSchema = z.object({
  id: z.number(),
  name: z.string(),
  quantity: z.number(),
  min_quantity: z.number(),
  category_id: z.number().nullable(),
  category_name: z.string().optional(),
});

const CategorySchema = z.object({
  id: z.number(),
  name: z.string(),
  description: z.string().optional(),
});

type Item = z.infer<typeof ItemSchema>;
type Category = z.infer<typeof CategorySchema>;

const router = new Hono();

// Helper to fetch items with category info
function fetchItems(categoryFilter?: string, searchQuery?: string, sortBy?: string, showLowStockOnly?: boolean): Item[] {
  let sql = `
    SELECT i.id, i.name, i.quantity, i.min_quantity, i.category_id, c.name as category_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE 1=1
  `;
  const params: (string | number)[] = [];

  if (categoryFilter && categoryFilter !== 'all') {
    sql += ' AND i.category_id = ?';
    params.push(parseInt(categoryFilter));
  }

  if (searchQuery) {
    sql += ' AND i.name LIKE ?';
    params.push(`%${searchQuery}%`);
  }

  if (showLowStockOnly) {
    sql += ' AND i.quantity < i.min_quantity';
  }

  if (sortBy === 'name') {
    sql += ' ORDER BY i.name COLLATE NOCASE';
  } else if (sortBy === 'quantity') {
    sql += ' ORDER BY i.quantity';
  } else {
    sql += ' ORDER BY i.id DESC';
  }

  return db.query(sql).all(...params) as Item[];
}

function fetchCategories(): Category[] {
  return db.query('SELECT id, name, description FROM categories ORDER BY name COLLATE NOCASE').all() as Category[];
}

function getLowStockCount(): number {
  const result = db.query('SELECT COUNT(*) as count FROM items WHERE quantity < min_quantity').get() as { count: number };
  return result?.count || 0;
}

router.get('/', (c) => {
  const items = fetchItems();
  const categories = fetchCategories();
  const lowStockCount = getLowStockCount();

  const itemsHtml = items.map(item => {
    const isLowStock = item.quantity < item.min_quantity;
    const lowStockClass = isLowStock ? 'low-stock' : '';
    const lowStockBadge = isLowStock ? '<span class="low-stock-badge">Low Stock</span>' : '';
    
    return `
      <tr class="item-row ${lowStockClass}" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-quantity="${item.quantity}" data-min-quantity="${item.min_quantity}" data-category-id="${item.category_id || ''}">
        <td>${escapeHtml(item.name)} ${lowStockBadge}</td>
        <td>${item.quantity}</td>
        <td>${item.min_quantity}</td>
        <td>${item.category_name ? escapeHtml(item.category_name) : '-'}</td>
        <td class="actions">
          <button class="btn btn-primary btn-sm edit-btn" data-id="${item.id}">Edit</button>
          <button class="btn btn-danger btn-sm delete-btn" data-id="${item.id}">Delete</button>
        </td>
      </tr>
    `;
  }).join('');

  const emptyState = items.length === 0 ? `
    <div class="empty-state">
      <p>No items yet. Create your first item to get started!</p>
    </div>
  ` : '';

  const categoryOptions = categories.map(cat => 
    `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
  ).join('');

  const filterCategoryOptions = categories.map(cat => 
    `<option value="${cat.id}">${escapeHtml(cat.name)}</option>`
  ).join('');

  const lowStockBanner = lowStockCount > 0 ? `
    <div class="notification-banner">
      <span>⚠️ ${lowStockCount} item${lowStockCount > 1 ? 's' : ''} low on stock</span>
      <button id="show-low-stock" class="btn btn-sm">Show Only Low Stock</button>
    </div>
  ` : '';

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard${lowStockCount > 0 ? ` (${lowStockCount} low stock)` : ''}</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      background-color: #1e1e2e;
      color: #cdd6f4;
      padding: 20px;
    }
    .header {
      background-color: #181825;
      padding: 20px;
      margin: -20px -20px 20px -20px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    h1 {
      color: #cba6f7;
      font-size: 1.5rem;
    }
    .header-actions {
      display: flex;
      gap: 10px;
      align-items: center;
    }
    .low-stock-badge-header {
      background-color: #f9e2af;
      color: #1e1e2e;
      padding: 4px 12px;
      border-radius: 12px;
      font-size: 0.875rem;
      font-weight: 600;
    }
    .notification-banner {
      background-color: #313244;
      border-left: 4px solid #f9e2af;
      padding: 12px 16px;
      margin-bottom: 20px;
      border-radius: 4px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .toolbar {
      background-color: #313244;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 20px;
      display: flex;
      gap: 12px;
      flex-wrap: wrap;
      align-items: center;
    }
    .toolbar-group {
      display: flex;
      gap: 8px;
      align-items: center;
    }
    label {
      color: #a6adc8;
      font-size: 0.875rem;
    }
    input[type="text"], input[type="number"], select {
      background-color: #1e1e2e;
      border: 1px solid #45475a;
      color: #cdd6f4;
      padding: 8px 12px;
      border-radius: 6px;
      font-size: 0.875rem;
    }
    input[type="text"]:focus, input[type="number"]:focus, select:focus {
      outline: none;
      border-color: #cba6f7;
    }
    .btn {
      padding: 8px 16px;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      font-size: 0.875rem;
      font-weight: 500;
      transition: opacity 0.2s;
    }
    .btn:hover {
      opacity: 0.9;
    }
    .btn-primary {
      background-color: #cba6f7;
      color: #1e1e2e;
    }
    .btn-secondary {
      background-color: #45475a;
      color: #cdd6f4;
    }
    .btn-danger {
      background-color: #f38ba8;
      color: #1e1e2e;
    }
    .btn-sm {
      padding: 6px 12px;
      font-size: 0.75rem;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      background-color: #313244;
      border-radius: 8px;
      overflow: hidden;
    }
    th {
      background-color: #181825;
      color: #cba6f7;
      text-align: left;
      padding: 12px 16px;
      font-weight: 600;
      cursor: pointer;
      user-select: none;
    }
    th:hover {
      background-color: #1e1e2e;
    }
    td {
      padding: 12px 16px;
      border-bottom: 1px solid #45475a;
      color: #cdd6f4;
    }
    tr:hover {
      background-color: #45475a;
    }
    .item-row.low-stock {
      border-left: 4px solid #f9e2af;
    }
    .low-stock-badge {
      background-color: #f38ba8;
      color: #1e1e2e;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 0.75rem;
      margin-left: 8px;
      font-weight: 600;
    }
    .actions {
      display: flex;
      gap: 8px;
    }
    .empty-state {
      background-color: #313244;
      padding: 40px;
      text-align: center;
      border-radius: 8px;
      color: #a6adc8;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.7);
      z-index: 1000;
      justify-content: center;
      align-items: center;
    }
    .modal.active {
      display: flex;
    }
    .modal-content {
      background-color: #313244;
      padding: 24px;
      border-radius: 12px;
      width: 90%;
      max-width: 500px;
      max-height: 90vh;
      overflow-y: auto;
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 20px;
    }
    .modal-title {
      color: #cba6f7;
      font-size: 1.25rem;
    }
    .close-btn {
      background: none;
      border: none;
      color: #a6adc8;
      font-size: 1.5rem;
      cursor: pointer;
    }
    .form-group {
      margin-bottom: 16px;
    }
    .form-group label {
      display: block;
      margin-bottom: 6px;
      color: #cdd6f4;
    }
    .form-group input, .form-group select {
      width: 100%;
    }
    .modal-actions {
      display: flex;
      gap: 12px;
      justify-content: flex-end;
      margin-top: 24px;
    }
    .category-list {
      max-height: 300px;
      overflow-y: auto;
    }
    .category-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      padding: 12px;
      border-bottom: 1px solid #45475a;
    }
    .category-item:last-child {
      border-bottom: none;
    }
    .category-info {
      flex: 1;
    }
    .category-name {
      color: #cdd6f4;
      font-weight: 500;
    }
    .category-desc {
      color: #a6adc8;
      font-size: 0.875rem;
    }
    .category-actions {
      display: flex;
      gap: 8px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Items Dashboard</h1>
    <div class="header-actions">
      ${lowStockCount > 0 ? `<span class="low-stock-badge-header">${lowStockCount} Low Stock</span>` : ''}
      <button id="manage-categories-btn" class="btn btn-secondary">Manage Categories</button>
      <button id="create-item-btn" class="btn btn-primary">Create Item</button>
    </div>
  </div>

  ${lowStockBanner}

  <div class="toolbar">
    <div class="toolbar-group">
      <label for="search-input">Search:</label>
      <input type="text" id="search-input" placeholder="Search items by name...">
    </div>
    <div class="toolbar-group">
      <label for="category-filter">Category:</label>
      <select id="category-filter">
        <option value="all">All Categories</option>
        ${filterCategoryOptions}
      </select>
    </div>
    <div class="toolbar-group">
      <label for="sort-by">Sort by:</label>
      <select id="sort-by">
        <option value="id">Default</option>
        <option value="name">Name</option>
        <option value="quantity">Quantity</option>
      </select>
    </div>
    <div class="toolbar-group">
      <button id="refresh-btn" class="btn btn-secondary">Refresh</button>
    </div>
  </div>

  ${emptyState}

  <table id="items-table" ${items.length === 0 ? 'style="display:none;"' : ''}>
    <thead>
      <tr>
        <th data-sort="name">Name ↕</th>
        <th data-sort="quantity">Quantity ↕</th>
        <th>Min Quantity</th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="items-tbody">
      ${itemsHtml}
    </tbody>
  </table>

  <!-- Item Modal -->
  <div id="item-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="item-modal-title" class="modal-title">Create Item</h2>
        <button class="close-btn" onclick="closeItemModal()">&times;</button>
      </div>
      <form id="item-form">
        <input type="hidden" id="item-id">
        <div class="form-group">
          <label for="item-name">Name *</label>
          <input type="text" id="item-name" required>
        </div>
        <div class="form-group">
          <label for="item-quantity">Quantity *</label>
          <input type="number" id="item-quantity" min="0" required>
        </div>
        <div class="form-group">
          <label for="item-min-quantity">Minimum Quantity *</label>
          <input type="number" id="item-min-quantity" min="0" required>
        </div>
        <div class="form-group">
          <label for="item-category">Category</label>
          <select id="item-category">
            <option value="">-- No Category --</option>
            ${categoryOptions}
          </select>
        </div>
        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="closeItemModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>

  <!-- Category Management Modal -->
  <div id="category-modal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 class="modal-title">Manage Categories</h2>
        <button class="close-btn" onclick="closeCategoryModal()">&times;</button>
      </div>
      <form id="category-form" class="form-group">
        <div class="form-group">
          <label for="category-name">Category Name *</label>
          <input type="text" id="category-name" required>
        </div>
        <div class="form-group">
          <label for="category-description">Description</label>
          <input type="text" id="category-description" placeholder="Optional description">
        </div>
        <input type="hidden" id="category-edit-id">
        <button type="submit" class="btn btn-primary" id="category-submit-btn">Add Category</button>
      </form>
      <div class="category-list" id="category-list">
        ${categories.map(cat => `
          <div class="category-item" data-id="${cat.id}">
            <div class="category-info">
              <div class="category-name">${escapeHtml(cat.name)}</div>
              ${cat.description ? `<div class="category-desc">${escapeHtml(cat.description)}</div>` : ''}
            </div>
            <div class="category-actions">
              <button class="btn btn-primary btn-sm" onclick="editCategory(${cat.id}, '${escapeHtml(cat.name)}', '${cat.description ? escapeHtml(cat.description) : ''}')">Edit</button>
              <button class="btn btn-danger btn-sm" onclick="deleteCategory(${cat.id})">Delete</button>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  </div>

  <script>
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', () => {
      initItemsDashboard();
    });

    function initItemsDashboard() {
      // Event delegation for edit/delete buttons
      document.getElementById('items-tbody').addEventListener('click', (e) => {
        if (e.target.classList.contains('edit-btn')) {
          const id = e.target.dataset.id;
          openEditModal(id);
        } else if (e.target.classList.contains('delete-btn')) {
          const id = e.target.dataset.id;
          deleteItem(id);
        }
      });

      // Create button
      document.getElementById('create-item-btn').addEventListener('click', openCreateModal);

      // Manage categories button
      document.getElementById('manage-categories-btn').addEventListener('click', openCategoryModal);

      // Filters
      document.getElementById('search-input').addEventListener('input', debounce(loadItems, 300));
      document.getElementById('category-filter').addEventListener('change', loadItems);
      document.getElementById('sort-by').addEventListener('change', loadItems);

      // Sort headers
      document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', () => {
          const sortBy = th.dataset.sort;
          document.getElementById('sort-by').value = sortBy;
          loadItems();
        });
      });

      // Refresh button
      document.getElementById('refresh-btn').addEventListener('click', loadItems);

      // Show low stock button
      document.getElementById('show-low-stock')?.addEventListener('click', () => {
        document.getElementById('category-filter').value = 'all';
        document.getElementById('search-input').value = '';
        loadItems(true);
      });

      // Form submissions
      document.getElementById('item-form').addEventListener('submit', saveItem);
      document.getElementById('category-form').addEventListener('submit', saveCategory);
    }

    let currentLowStockOnly = false;

    async function loadItems(lowStockOnly = false) {
      currentLowStockOnly = lowStockOnly;
      const search = document.getElementById('search-input').value;
      const category = document.getElementById('category-filter').value;
      const sortBy = document.getElementById('sort-by').value;

      let url = '/items?';
      if (search) url += 'search=' + encodeURIComponent(search) + '&';
      if (category && category !== 'all') url += 'category=' + encodeURIComponent(category) + '&';
      if (sortBy) url += 'sort=' + encodeURIComponent(sortBy) + '&';
      if (lowStockOnly) url += 'low_stock=1&';

      try {
        const res = await fetch(url);
        const items = await res.json();
        renderItems(items);
        updateLowStockCount(items);
      } catch (err) {
        console.error('Failed to load items:', err);
      }
    }

    function renderItems(items) {
      const tbody = document.getElementById('items-tbody');
      const table = document.getElementById('items-table');

      if (items.length === 0) {
        tbody.innerHTML = '';
        table.style.display = 'none';
        document.querySelector('.empty-state')?.style.display = 'block';
        return;
      }

      table.style.display = 'table';
      document.querySelector('.empty-state')?.style.display = 'none';

      tbody.innerHTML = items.map(item => {
        const isLowStock = item.quantity < item.min_quantity;
        const lowStockClass = isLowStock ? 'low-stock' : '';
        const lowStockBadge = isLowStock ? '<span class="low-stock-badge">Low Stock</span>' : '';
        
        return `
          <tr class="item-row ${lowStockClass}" data-id="${item.id}" data-name="${escapeHtml(item.name)}" data-quantity="${item.quantity}" data-min-quantity="${item.min_quantity}" data-category-id="${item.category_id || ''}">
