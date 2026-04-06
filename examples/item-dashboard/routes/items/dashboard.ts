import { Hono } from 'hono';
import { db } from '../../db.js';
import { z } from 'zod';

// ============================================================================
// DATABASE TYPES
// ============================================================================

interface Category {
  id: number;
  name: string;
  description: string | null;
}

interface Item {
  id: number;
  name: string;
  quantity: number;
  min_quantity: number;
  category_id: number | null;
  category_name: string | null;
}

interface ItemWithCategory extends Item {
  is_low_stock: boolean;
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const ItemSchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(255),
  quantity: z.number().int().min(0),
  min_quantity: z.number().int().min(0),
  category_id: z.number().int().nullable().optional()
});

const CategorySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1).max(255),
  description: z.string().max(1000).nullable().optional()
});

// ============================================================================
// HTML TEMPLATES
// ============================================================================

const LAYOUT_HTML = (title: string, content: string, lowStockCount: number) => `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}${lowStockCount > 0 ? ` (${lowStockCount} Low Stock)` : ''}</title>
  <script src="https://unpkg.com/htmx.org@1.9.12"></script>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 15px; }
    h1 { color: #333; }
    .header-actions { display: flex; gap: 10px; align-items: center; }
    .badge { background: #dc3545; color: white; padding: 4px 10px; border-radius: 12px; font-size: 14px; font-weight: bold; }
    .badge-success { background: #28a745; }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; text-decoration: none; display: inline-block; }
    .btn-primary { background: #007bff; color: white; }
    .btn-primary:hover { background: #0056b3; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #545b62; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    .btn-warning { background: #ffc107; color: #212529; }
    .btn-warning:hover { background: #e0a800; }
    .btn-sm { padding: 5px 12px; font-size: 12px; }
    .alert { padding: 15px; border-radius: 6px; margin-bottom: 20px; }
    .alert-danger { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
    .alert-success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
    .filters { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; background: white; padding: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .filter-group { display: flex; flex-direction: column; gap: 5px; }
    .filter-group label { font-size: 12px; color: #666; font-weight: 500; }
    input, select { padding: 8px 12px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
    input:focus, select:focus { outline: none; border-color: #007bff; }
    .table-container { background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); overflow: hidden; }
    table { width: 100%; border-collapse: collapse; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #333; cursor: pointer; user-select: none; }
    th:hover { background: #e9ecef; }
    th .sort-indicator { margin-left: 5px; color: #999; }
    th.sort-asc .sort-indicator::after { content: ' ▲'; color: #007bff; }
    th.sort-desc .sort-indicator::after { content: ' ▼'; color: #007bff; }
    tr:hover { background: #f8f9fa; }
    tr.low-stock { background: #fff3cd; }
    tr.low-stock td:first-child { border-left: 4px solid #dc3545; }
    .low-badge { background: #dc3545; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px; font-weight: bold; }
    .actions { display: flex; gap: 8px; }
    .empty-state { text-align: center; padding: 60px 20px; color: #666; }
    .empty-state svg { width: 64px; height: 64px; margin-bottom: 20px; color: #ccc; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); z-index: 1000; justify-content: center; align-items: center; }
    .modal.active { display: flex; }
    .modal-content { background: white; border-radius: 8px; width: 90%; max-width: 500px; max-height: 90vh; overflow: auto; }
    .modal-header { padding: 20px; border-bottom: 1px solid #eee; }
    .modal-header h2 { margin: 0; font-size: 20px; }
    .modal-body { padding: 20px; }
    .modal-footer { padding: 20px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; gap: 10px; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; color: #333; }
    .form-group input, .form-group select, .form-group textarea { width: 100%; }
    .form-group textarea { resize: vertical; min-height: 80px; }
    .category-list { max-height: 300px; overflow-y: auto; }
    .category-item { display: flex; justify-content: space-between; align-items: center; padding: 10px; border-bottom: 1px solid #eee; }
    .category-item:last-child { border-bottom: none; }
    .category-info { flex: 1; }
    .category-name { font-weight: 500; }
    .category-desc { font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="container">
    ${content}
  </div>
  
  <!-- Item Modal -->
  <div id="itemModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2 id="itemModalTitle">Add Item</h2>
      </div>
      <form id="itemForm" hx-post="/items" hx-target="#itemsTable" hx-swap="outerHTML">
        <input type="hidden" id="itemId" name="id" />
        <div class="modal-body">
          <div class="form-group">
            <label for="itemName">Name *</label>
            <input type="text" id="itemName" name="name" required maxlength="255" />
          </div>
          <div class="form-group">
            <label for="itemQuantity">Quantity *</label>
            <input type="number" id="itemQuantity" name="quantity" required min="0" />
          </div>
          <div class="form-group">
            <label for="itemMinQuantity">Minimum Quantity *</label>
            <input type="number" id="itemMinQuantity" name="min_quantity" required min="0" />
          </div>
          <div class="form-group">
            <label for="itemCategory">Category</label>
            <select id="itemCategory" name="category_id">
              <option value="">-- No Category --</option>
            </select>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="closeItemModal()">Cancel</button>
          <button type="submit" class="btn btn-primary">Save</button>
        </div>
      </form>
    </div>
  </div>
  
  <!-- Category Modal -->
  <div id="categoryModal" class="modal">
    <div class="modal-content">
      <div class="modal-header">
        <h2>Manage Categories</h2>
      </div>
      <div class="modal-body">
        <form id="categoryForm" class="form-group" hx-post="/categories" hx-target="#categoryList" hx-swap="innerHTML">
          <input type="hidden" id="categoryId" name="id" />
          <div class="form-group">
            <label for="categoryName">Name *</label>
            <input type="text" id="categoryName" name="name" required maxlength="255" />
          </div>
          <div class="form-group">
            <label for="categoryDesc">Description</label>
            <textarea id="categoryDesc" name="description" maxlength="1000"></textarea>
          </div>
          <button type="submit" class="btn btn-primary">Save Category</button>
          <button type="button" class="btn btn-secondary" onclick="resetCategoryForm()" id="categoryResetBtn" style="display:none;">Cancel Edit</button>
        </form>
        <div id="categoryList" class="category-list" style="margin-top: 20px;">
          <!-- Categories loaded here -->
        </div>
      </div>
      <div class="modal-footer">
        <button class="btn btn-secondary" onclick="closeCategoryModal()">Close</button>
      </div>
    </div>
  </div>

  <script>
    // Initialize on page load
    document.addEventListener('DOMContentLoaded', function() {
      loadCategories();
      updateSortIndicators();
    });

    // Category management
    function openCategoryModal() {
      document.getElementById('categoryModal').classList.add('active');
      loadCategories();
    }

    function closeCategoryModal() {
      document.getElementById('categoryModal').classList.remove('active');
      resetCategoryForm();
    }

    function loadCategories() {
      fetch('/categories')
        .then(r => r.text())
        .then(html => {
          document.getElementById('categoryList').innerHTML = html;
          updateCategorySelect();
        });
    }

    function updateCategorySelect() {
      fetch('/categories?format=options')
        .then(r => r.text())
        .then(html => {
          const select = document.getElementById('itemCategory');
          const currentValue = select.value;
          select.innerHTML = '<option value="">-- No Category --</option>' + html;
          select.value = currentValue;
        });
    }

    function editCategory(id, name, description) {
      document.getElementById('categoryId').value = id;
      document.getElementById('categoryName').value = name;
      document.getElementById('categoryDesc').value = description || '';
      document.getElementById('categoryResetBtn').style.display = 'inline-block';
      document.getElementById('categoryForm').setAttribute('hx-put', '/categories/' + id);
      document.getElementById('categoryForm').removeAttribute('hx-post');
    }

    function resetCategoryForm() {
      document.getElementById('categoryId').value = '';
      document.getElementById('categoryName').value = '';
      document.getElementById('categoryDesc').value = '';
      document.getElementById('categoryResetBtn').style.display = 'none';
      document.getElementById('categoryForm').setAttribute('hx-post', '/categories');
      document.getElementById('categoryForm').removeAttribute('hx-put');
    }

    // Item management
    function openItemModal(item) {
      document.getElementById('itemModalTitle').textContent = item ? 'Edit Item' : 'Add Item';
      document.getElementById('itemId').value = item ? item.id : '';
      document.getElementById('itemName').value = item ? item.name : '';
      document.getElementById('itemQuantity').value = item ? item.quantity : '';
      document.getElementById('itemMinQuantity').value = item ? item.min_quantity : '';
      document.getElementById('itemCategory').value = item ? (item.category_id || '') : '';
      
      const form = document.getElementById('itemForm');
      if (item) {
        form.setAttribute('hx-put', '/items/' + item.id);
        form.removeAttribute('hx-post');
      } else {
        form.setAttribute('hx-post', '/items');
        form.removeAttribute('hx-put');
      }
      
      document.getElementById('itemModal').classList.add('active');
    }

    function closeItemModal() {
      document.getElementById('itemModal').classList.remove('active');
      document.getElementById('itemForm').reset();
    }

    function editItem(id) {
      fetch('/items/' + id)
        .then(r => r.json())
        .then(item => openItemModal(item));
    }

    function updateSortIndicators() {
      const url = new URL(window.location.href);
      const sort = url.searchParams.get('sort');
      const order = url.searchParams.get('order');
      if (sort) {
        const th = document.querySelector('th[data-sort="' + sort + '"]');
        if (th) {
          th.classList.add(order === 'desc' ? 'sort-desc' : 'sort-asc');
        }
      }
    }

    // Close modals on outside click
    window.onclick = function(e) {
      if (e.target.classList.contains('modal')) {
        e.target.classList.remove('active');
      }
    };

    // HTMX event handlers
    document.body.addEventListener('htmx:afterRequest', function(evt) {
      if (evt.detail.successful) {
        const triggeringElement = evt.detail.elt;
        
        // Close modals after successful submission
        if (triggeringElement.id === 'itemForm') {
          closeItemModal();
          // Reload items to show updates
          htmx.ajax('GET', window.location.pathname + window.location.search, { target: '#itemsTable', swap: 'outerHTML' });
        }
        
        if (triggeringElement.id === 'categoryForm') {
          resetCategoryForm();
          loadCategories();
        }

        // Handle delete confirmation
        if (triggeringElement.getAttribute('hx-delete')) {
          htmx.ajax('GET', window.location.pathname + window.location.search, { target: '#itemsTable', swap: 'outerHTML' });
        }
      }
    });
  </script>
</body>
</html>`;

// ============================================================================
// QUERY HELPERS
// ============================================================================

function getItemsWithFilters(
  search?: string,
  categoryId?: string,
  lowStockOnly?: boolean,
  sort: string = 'name',
  order: string = 'asc'
): ItemWithCategory[] {
  let sql = \`
    SELECT 
      i.id,
      i.name,
      i.quantity,
      i.min_quantity,
      i.category_id,
      c.name as category_name
    FROM items i
    LEFT JOIN categories c ON i.category_id = c.id
    WHERE 1=1
  \`;
  
  const params: (string | number)[] = [];
  
  if (search) {
    sql += ' AND i.name LIKE ?';
    params.push(\`%\${search}%\`);
  }
  
  if (categoryId && categoryId !== 'all') {
    sql += ' AND i.category_id = ?';
    params.push(parseInt(categoryId, 10));
  }
  
  if (lowStockOnly === true) {
    sql += ' AND i.quantity < i.min_quantity';
  }
  
  // Validate sort column
  const validSortColumns = ['name', 'quantity', 'min_quantity', 'category_name'];
  const sortColumn = validSortColumns.includes(sort) ? sort : 'name';
  const sortOrder = order === 'desc' ? 'DESC' : 'ASC';
  
  sql += \` ORDER BY \${sortColumn} \${sortOrder}, i.id ASC\`;
  
  const items = db.query(sql).all(...params) as Item[];
  
  return items.map(item => ({
    ...item,
    is_low_stock: item.quantity < item.min_quantity
  }));
}

function getLowStockCount(): number {
  const result = db.query(\`
    SELECT COUNT(*) as count FROM items WHERE quantity < min_quantity
  \`).get() as { count: number };
  return result.count;
}

function getCategories(): Category[] {
  return db.query('SELECT * FROM categories ORDER BY name ASC').all() as Category[];
}

// ============================================================================
// HTML COMPONENT RENDERERS
// ============================================================================

function renderItemsTable(
  items: ItemWithCategory[],
  search?: string,
  categoryId?: string,
  lowStockOnly?: boolean,
  sort: string = 'name',
  order: string = 'asc'
): string {
  if (items.length === 0) {
    return renderEmptyState();
  }

  const toggleOrder = (col: string) => col === sort && order === 'asc' ? 'desc' : 'asc';
  
  const buildSortUrl = (col: string) => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (categoryId && categoryId !== 'all') params.set('category', categoryId);
    if (lowStockOnly) params.set('low_stock', '1');
    params.set('sort', col);
    params.set('order', toggleOrder(col));
    return '?' + params.toString();
  };

  const rows = items.map(item => \`
    <tr class="\${item.is_low_stock ? 'low-stock' : ''}">
      <td>
        \${item.name}
        \${item.is_low_stock ? '<span class="low-badge">LOW STOCK</span>' : ''}
      </td>
      <td>\${item.quantity}</td>
      <td>\${item.min_quantity}</td>
      <td>\${item.category_name || '-'}</td>
      <td class="actions">
        <button class="btn btn-warning btn-sm" onclick="editItem(\${item.id})">Edit</button>
        <button class="btn btn-danger btn-sm" 
                hx-delete="/items/\${item.id}" 
                hx-confirm="Delete this item?"
                hx-target="#itemsTable"
                hx-swap="outerHTML">Delete</button>
      </td>
    </tr>
  \`).join('');

  return \`
    <div id="itemsTable" class="table-container">
      <table>
        <thead>
          <tr>
            <th data-sort="name" class="\${sort === 'name' ? (order === 'asc' ? 'sort-asc' : 'sort-desc') : ''}" 
                hx-get="\${buildSortUrl('name')}" hx-target="#itemsTable" hx-swap="outerHTML" style="cursor: pointer;">
              Name<span class="sort-indicator"></span>
            </th>
            <th data-sort="quantity" class="\${sort === 'quantity' ? (order === 'asc' ? 'sort-asc' : 'sort-desc') : ''}" 
                hx-get="\${buildSortUrl('quantity')}" hx-target="#itemsTable" hx-swap="outerHTML" style="cursor: pointer;">
              Quantity<span class="sort-indicator"></span>
            </th>
            <th data-sort="min_quantity" class="\${sort === 'min_quantity' ? (order === 'asc' ? 'sort-asc' : 'sort-desc') : ''}" 
                hx-get="\${buildSortUrl('min_quantity')}" hx-target="#itemsTable" hx-swap="outerHTML" style="cursor: pointer;">
              Min Qty<span class="sort-indicator"></span>
            </th>
            <th data-sort="category_name" class="\${sort === 'category_name' ? (order === 'asc' ? 'sort-asc' : 'sort-desc') : ''}" 
                hx-get="\${buildSortUrl('category_name')}" hx-target="#itemsTable" hx-swap="outerHTML" style="cursor: pointer;">
              Category<span class="sort-indicator"></span>
            </th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          \${rows}
        </tbody>
      </table>
    </div>
  \`;
}

function renderEmptyState(): string {
  return \`
    <div id="itemsTable" class="table-container empty-state">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
        <line x1="9" y1="9" x2="15" y2="15"/>
        <line x1="15" y1="9" x2="9" y2="15"/>
      </svg>
      <h3>No Items Found</h3>
      <p>Get started by adding your first item or adjusting your filters.</p>
      <button class="btn btn-primary" style="margin-top: 15px;" onclick="openItemModal()">Add Item</button>
    </div>
  \`;
}

function renderCategoryList(categories: Category[]): string {
  if (categories.length === 0) {
    return '<p style="text-align: center; color: #666; padding: 20px;">No categories yet. Add one above.</p>';
  }

  return categories.map(cat => \`
    <div class="category-item">
      <div class="category-info">
        <div class="category-name">\${cat.name}</div>
        <div class="category-desc">\${cat.description || 'No description'}</div>
      </div>
      <div class="actions">
        <button class="btn btn-warning btn-sm" 
                onclick="editCategory(\${cat.id}, '\${cat.name.replace(/'/g, "\\'")}', '\${(cat.description || '').replace(/'/g, "\\'")}')">
          Edit
        </button>
        <button class="btn btn-danger btn-sm" 
                hx-delete="/categories/\${cat.id}" 
                hx-confirm="Delete this category? Items will be unassigned."
                hx-target="#categoryList"
                hx-swap="innerHTML">
          Delete
        </button>
      </div>
    </div>
  \`).join('');
}

function renderCategoryOptions(categories: Category[]): string {
  return categories.map(cat => 
    \`<option value="\${cat.id}">\${cat.name}</option>\`
  ).join('');
}

function renderDashboard(
  items: ItemWithCategory[],
  categories: Category[],
  lowStockCount: number,
  search?: string,
  categoryId?: string,
  lowStockOnly?: boolean,
  sort: string = 'name',
  order: string = 'asc'
): string {
  const lowStockBanner = lowStockCount > 0 ? \`
    <div class="alert alert-danger">
      <strong>⚠️ Low Stock Alert:</strong> \${lowStockCount} item\${lowStockCount === 1 ? '' : 's'} below minimum quantity.
      <a href="?low_stock=1" style="margin-left: 10px; color: #721c24; text-decoration: underline;">View Low Stock Items</a>
    </div>
  \` : '';

  const categoryOptions = categories.map(c => 
    \`<option value="\${c.id}" \${categoryId === String(c.id) ? 'selected' : ''}>\${c.name}</option>\`
  ).join('');

  const buildFilterUrl = () => {
    const params = new URLSearchParams();
    params.set('sort', sort);
    params.set('order', order);
    return '?' + params.toString();
  };

  return LAYOUT_HTML(
    'Items Dashboard',
    \`
      <div class="header">
        <div>
          <h1>Items Dashboard</h1>
          <p style="color: #666; margin-top: 5px;">Manage your inventory and track stock levels</p>
        </div>
        <div class="header-actions">
          \${lowStockCount > 0 ? \`<span class="badge">\${lowStockCount} Low Stock</span>\` : \`<span class="badge badge-success">All Stock OK</span>\`}
          <button class="btn btn-secondary" onclick="openCategoryModal()">Manage Categories</button>
          <button class="btn btn-primary" onclick="openItemModal()">+ Add Item</button>
        </div>
      </div>
      
      \${lowStockBanner}
      
      <div class="filters">
        <div class="filter-group">
          <label>Search Items</label>
          <input type="text" 
                 name="search" 
                 placeholder="Search by name..." 
                 value="\${search || ''}"
                 hx-get="\${buildFilterUrl()}"
                 hx-target="#itemsTable"
                 hx-swap="outerHTML"
                 hx-trigger="keyup changed delay:300ms, search"
                 hx-include="[name='category'],[name='low_stock']">
        </div>
        <div class="filter-group">
          <label>Filter by Category</label>
          <select name="category" 
                  hx-get="\${buildFilterUrl()}"
                  hx-target="#itemsTable"
                  hx-swap="outerHTML"
                  hx-include="[name='search'],[name='low_stock']">
            <option value="all" \${(!categoryId || categoryId === 'all') ? 'selected' : ''}>All Categories</option>
            \${categoryOptions}
          </select>
        </div>
        <div class="filter-group">
          <label>Stock Filter</label>
          <select name="low_stock"
                  hx-get="\${buildFilterUrl()}"
                  hx-target="#itemsTable"
                  hx-swap="outerHTML"
                  hx-include="[name='search'],[name='category']">
            <option value="" \${!lowStockOnly ? 'selected' : ''}>All Items</option>
            <option value="1" \${lowStockOnly ? 'selected' : ''}>Low Stock Only</option>
          </select>
        </div>
      </div>
      
      \${renderItemsTable(items, search, categoryId, lowStockOnly, sort, order)}
    \`,
    lowStockCount
  );
}

// ============================================================================
// ROUTER SETUP
// ============================================================================

const router = new Hono();

// Dashboard page
router.get('/', (c) => {
  const search = c.req.query('search');
  const categoryId = c.req.query('category');
  const lowStockOnly = c.req.query('low_stock') === '1';
  const sort = c.req.query('sort') || 'name';
  const order = c.req.query('order') || 'asc';
  
  const items = getItemsWithFilters(search, categoryId, lowStockOnly, sort, order);
  const categories = getCategories();
  const lowStockCount = getLowStockCount();
  
  // Check if HTMX request (partial update)
  if (c.req.header('HX-Request') === 'true' && !c.req.header('HX-Boosted')) {
    return c.html(renderItemsTable(items, search, categoryId, lowStockOnly, sort, order));
  }
  
  return c.html(renderDashboard(items, categories, lowStockCount, search, categoryId, lowStockOnly, sort, order));
});

// API: Get single item
router.get('/items/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const item = db.query(\`
    SELECT i.*, c.name as category_name 
    FROM items i 
    LEFT JOIN categories c ON i.category_id = c.id 
    WHERE i.id = ?
  \`).get(id) as Item | undefined;
  
  if (!item) {
    return c.json({ error: 'Item not found' }, 404);
  }
  
  return c.json(item);
});

// API: Create item
router.post('/items', async (c) => {
  const body = await c.req.json();
  const result = ItemSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Invalid data', details: result.error.errors }, 400);
  }
  
  const { name, quantity, min_quantity, category_id } = result.data;
  
  const insertResult = db.query(\`
    INSERT INTO items (name, quantity, min_quantity, category_id) 
    VALUES (?, ?, ?, ?)
  \`).run(name, quantity, min_quantity, category_id || null);
  
  // Return updated table
  const search = c.req.query('search');
  const categoryId = c.req.query('category');
  const lowStockOnly = c.req.query('low_stock') === '1';
  const sort = c.req.query('sort') || 'name';
  const order = c.req.query('order') || 'asc';
  
  const items = getItemsWithFilters(search, categoryId, lowStockOnly, sort, order);
  return c.html(renderItemsTable(items, search, categoryId, lowStockOnly, sort, order), 201);
});

// API: Update item
router.put('/items/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const result = ItemSchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Invalid data', details: result.error.errors }, 400);
  }
  
  const { name, quantity, min_quantity, category_id } = result.data;
  
  db.query(\`
    UPDATE items 
    SET name = ?, quantity = ?, min_quantity = ?, category_id = ? 
    WHERE id = ?
  \`).run(name, quantity, min_quantity, category_id || null, id);
  
  // Return updated table
  const search = c.req.query('search');
  const categoryId = c.req.query('category');
  const lowStockOnly = c.req.query('low_stock') === '1';
  const sort = c.req.query('sort') || 'name';
  const order = c.req.query('order') || 'asc';
  
  const items = getItemsWithFilters(search, categoryId, lowStockOnly, sort, order);
  return c.html(renderItemsTable(items, search, categoryId, lowStockOnly, sort, order));
});

// API: Delete item
router.delete('/items/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  db.query('DELETE FROM items WHERE id = ?').run(id);
  
  // Return updated table
  const search = c.req.query('search');
  const categoryId = c.req.query('category');
  const lowStockOnly = c.req.query('low_stock') === '1';
  const sort = c.req.query('sort') || 'name';
  const order = c.req.query('order') || 'asc';
  
  const items = getItemsWithFilters(search, categoryId, lowStockOnly, sort, order);
  return c.html(renderItemsTable(items, search, categoryId, lowStockOnly, sort, order));
});

// API: List categories
router.get('/categories', (c) => {
  const format = c.req.query('format');
  const categories = getCategories();
  
  if (format === 'options') {
    return c.html(renderCategoryOptions(categories));
  }
  
  if (format === 'json') {
    return c.json(categories);
  }
  
  return c.html(renderCategoryList(categories));
});

// API: Create category
router.post('/categories', async (c) => {
  const body = await c.req.json();
  const result = CategorySchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Invalid data', details: result.error.errors }, 400);
  }
  
  const { name, description } = result.data;
  db.query('INSERT INTO categories (name, description) VALUES (?, ?)').run(name, description || null);
  
  const categories = getCategories();
  return c.html(renderCategoryList(categories), 201);
});

// API: Update category
router.put('/categories/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  const body = await c.req.json();
  const result = CategorySchema.safeParse(body);
  
  if (!result.success) {
    return c.json({ error: 'Invalid data', details: result.error.errors }, 400);
  }
  
  const { name, description } = result.data;
  db.query('UPDATE categories SET name = ?, description = ? WHERE id = ?').run(name, description || null, id);
  
  const categories = getCategories();
  return c.html(renderCategoryList(categories));
});

// API: Delete category (unassigns items)
router.delete('/categories/:id', async (c) => {
  const id = parseInt(c.req.param('id'), 10);
  
  // First unassign all items from this category
  db.query('UPDATE items SET category_id = NULL WHERE category_id = ?').run(id);
  
  // Then delete the category
  db.query('DELETE FROM categories WHERE id = ?').run(id);
  
  const categories = getCategories();
  return c.html(renderCategoryList(categories));
});

export default router;

export const _phoenix = {
  iu_id: '33a200ec4f1e7ab176c2fdce48b96448a76d2cfc4a86cbf4fbe6bff127f81ab7',
  name: 'Items Dashboard',
  risk_tier: 'high',
  canon_ids: [12]
} as const;
