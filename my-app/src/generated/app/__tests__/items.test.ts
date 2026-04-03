<output>
__MIGRATIONS__
registerMigration('categories', `
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  )
`);

registerMigration('items', `
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    category_id INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id)
  )
`);

__SCHEMAS__
const CreateCategorySchema = z.object({
  name: z.string().min(1, 'Name must not be empty'),
  description: z.string().optional()
});

const UpdateCategorySchema = z.object({
  name: z.string().min(1, 'Name must not be empty').optional(),
  description: z.string().optional()
});

const CreateItemSchema = z.object({
  name: z.string().min(1, 'Name must not be empty'),
  quantity: z.number().int().min(0, 'Quantity must be non-negative'),
  category_id: z.number().int().nullable().optional()
});

const UpdateItemSchema = z.object({
  name: z.string().min(1, 'Name must not be empty').optional(),
  quantity: z.number().int().min(0, 'Quantity must be non-negative').optional(),
  category_id: z.number().int().nullable().optional()
});

__ROUTES__
router.get('/', (c) => {
  return c.html(`<!DOCTYPE html>
<html>
<head>
  <title>Items Dashboard</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 1200px; margin: 0 auto; padding: 20px; background: #f8f9fa; }
    h1 { color: #333; margin-bottom: 20px; }
    .controls { display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    input, select, button { padding: 8px 12px; border: 1px solid #ccc; border-radius: 4px; font-size: 14px; }
    button { background: #0066cc; color: white; border: none; cursor: pointer; }
    button:hover { background: #0052a3; }
    table { width: 100%; border-collapse: collapse; background: white; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #f5f5f5; cursor: pointer; user-select: none; }
    th:hover { background: #e8e8e8; }
    tr:hover { background: #f8f9fa; }
    .modal { display: none; position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); justify-content: center; align-items: center; z-index: 1000; }
    .modal.active { display: flex; }
    .modal-content { background: white; padding: 24px; border-radius: 8px; min-width: 400px; max-width: 90%; max-height: 90vh; overflow-y: auto; }
    .form-group { margin-bottom: 16px; }
    label { display: block; margin-bottom: 6px; font-weight: 600; color: #333; }
    input[type="text"], input[type="number"], select { width: 100%; box-sizing: border-box; }
    .actions { display: flex; gap: 8px; }
    .btn-secondary { background: #6c757d; }
    .btn-secondary:hover { background: #545b62; }
    .btn-danger { background: #dc3545; }
    .btn-danger:hover { background: #c82333; }
    .empty-state { text-align: center; color: #666; padding: 40px; }
    .category-tag { background: #e9ecef; padding: 4px 8px; border-radius: 4px; font-size: 12px; }
  </style>
</head>
<body>
  <h1>Items Dashboard</h1>
  
  <div class="controls">
    <input type="text" id="searchInput" placeholder="Search items by name..." />
    <select id="categoryFilter">
      <option value="">All Categories</option>
    </select>
    <button onclick="openItemModal()">Add Item</button>
    <button class="btn-secondary" onclick="openCategoryModal()">Manage Categories</button>
  </div>

  <table>
    <thead>
      <tr>
        <th onclick="sort('name')">Name ↕</th>
        <th onclick="sort('quantity')">Quantity ↕</th>
        <th>Category</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody id="itemsTable">
      <tr><td colspan="4" class="empty-state">Loading...</td></tr>
    </tbody>
  </table>

  <div id="itemModal" class="modal">
    <div class="modal-content">
      <h2 id="itemModalTitle">Add Item</h2>
      <form id="itemForm">
        <input type="hidden" id="itemId" />
        <div class="form-group">
          <label>Name *</label>
          <input type="text" id="itemName" required />
        </div>
        <div class="form-group">
          <label>Quantity *</label>
          <input type="number" id="itemQuantity" min="0" required />
        </div>
        <div class="form-group">
          <label>Category</label>
          <select id="itemCategory"><option value="">-- None --</option></select>
        </div>
        <div style="display: flex; gap: 8px;">
          <button type="submit">Save</button>
          <button type="button" class="btn-secondary" onclick="closeItemModal()">Cancel</button>
        </div>
      </form>
    </div>
  </div>

  <div id="categoryModal" class="modal">
    <div class="modal-content">
      <h2>Manage Categories</h2>
      <div class="form-group">
        <label>Add New Category</label>
        <div style="display: flex; gap: 8px;">
          <input type="text" id="newCategoryName" placeholder="Category name" style="flex: 1;" />
          <input type="text" id="newCategoryDesc" placeholder="Description (optional)" style="flex: 1;" />
          <button onclick="addCategory()">Add</button>
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Name</th><th>Description</th><th>Actions</th></tr>
        </thead>
        <tbody id="categoriesTable"></tbody>
      </table>
      <button class="btn-secondary" onclick="closeCategoryModal()" style="margin-top: 16px;">Close</button>
    </div>
  </div>

  <script>
    let currentSort = 'created_at';
    let categories = [];

    async function loadItems() {
      const search = document.getElementById('searchInput').value;
      const category = document.getElementById('categoryFilter').value;
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (category) params.set('category', category);
      params.set('sort', currentSort);
      
      try {
        const res = await fetch('/items?' + params.toString());
        const items = await res.json();
        
        const tbody = document.getElementById('itemsTable');
        if (items.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
          return;
        }
        
        tbody.innerHTML = items.map(item => \`
          <tr>
            <td>\${escapeHtml(item.name)}</td>
            <td>\${item.quantity}</td>
            <td>\${item.category_name ? '<span class="category-tag">' + escapeHtml(item.category_name) + '</span>' : '-'}</td>
            <td class="actions">
              <button onclick="editItem(\${item.id})">Edit</button>
              <button class="btn-danger" onclick="deleteItem(\${item.id})">Delete</button>
            </td>
          </tr>
        \`).join('');
      } catch (err) {
        document.getElementById('itemsTable').innerHTML = '<tr><td colspan="4" class="empty-state">Error loading items</td></tr>';
      }
    }

    async function loadCategories() {
      try {
        const res = await fetch('/categories');
        categories = await res.json();
        
        const filter = document.getElementById('categoryFilter');
        const itemSelect = document.getElementById('itemCategory');
        
        const filterOptions = '<option value="">All Categories</option>' + 
          categories.map(c => \`<option value="\${c.id}">\${escapeHtml(c.name)}</option>\`).join('');
        filter.innerHTML = filterOptions;
        
        const selectOptions = '<option value="">-- None --</option>' + 
          categories.map(c => \`<option value="\${c.id}">\${escapeHtml(c.name)}</option>\`).join('');
        itemSelect.innerHTML = selectOptions;
        
        document.getElementById('categoriesTable').innerHTML = categories.map(c => \`
          <tr>
            <td>\${escapeHtml(c.name)}</td>
            <td>\${escapeHtml(c.description || '-')}</td>
            <td class="actions"><button class="btn-danger" onclick="deleteCategory(\${c.id})">Delete</button></td>
          </tr>
        \`).join('');
      } catch (err) {
        console.error('Failed to load categories', err);
      }
    }

    function escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function sort(field) {
      currentSort = currentSort === field ? field + '_desc' : field;
      loadItems();
    }

    function openItemModal() {
      document.getElementById('itemForm').reset();
      document.getElementById('itemId').value = '';
      document.getElementById('itemModalTitle').textContent = 'Add Item';
      document.getElementById('itemModal').classList.add('active');
    }

    function closeItemModal() {
      document.getElementById('itemModal').classList.remove('active');
    }

    function openCategoryModal() {
      document.getElementById('categoryModal').classList.add('active');
      loadCategories();
    }

    function closeCategoryModal() {
      document.getElementById('categoryModal').classList.remove('active');
    }

    async function editItem(id) {
      try {
        const res = await fetch('/items/' + id);
        if (!res.ok) throw new Error('Item not found');
        const item = await res.json();
        document.getElementById('itemId').value = item.id;
        document.getElementById('itemName').value = item.name;
        document.getElementById('itemQuantity').value = item.quantity;
        document.getElementById('itemCategory').value = item.category_id || '';
        document.getElementById('itemModalTitle').textContent = 'Edit Item';
        document.getElementById('itemModal').classList.add('active');
      } catch (err) {
        alert('Failed to load item: ' + err.message);
      }
    }

    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      try {
        const res = await fetch('/items/' + id, { method: 'DELETE' });
        if (!res.ok) throw new Error('Delete failed');
        loadItems();
      } catch (err) {
        alert('Failed to delete item: ' + err.message);
      }
    }

    document.getElementById('itemForm').onsubmit = async (e) => {
      e.preventDefault();
      const id = document.getElementById('itemId').value;
      const body = {
        name: document.getElementById('itemName').value.trim(),
        quantity: parseInt(document.getElementById('itemQuantity').value),
        category_id: document.getElementById('itemCategory').value || null
      };
      
      try {
        const url = id ? '/items/' + id : '/items';
        const method = id ? 'PATCH' : 'POST';
        const res = await fetch(url, { 
          method, 
          headers: { 'Content-Type': 'application/json' }, 
          body: JSON.stringify(body) 
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Request failed');
        }
        closeItemModal();
        loadItems();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    };

    async function addCategory() {
      const name = document.getElementById('newCategoryName').value.trim();
      const description = document.getElementById('newCategoryDesc').value.trim();
      if (!name) return alert('Category name is required');
      
      try {
        const res = await fetch('/categories', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, description: description || undefined })
        });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to create category');
        }
        document.getElementById('newCategoryName').value = '';
        document.getElementById('newCategoryDesc').value = '';
        loadCategories();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    async function deleteCategory(id) {
      if (!confirm('Delete this category? Items in this category will become uncategorized.')) return;
      
      try {
        const res = await fetch('/categories/' + id, { method: 'DELETE' });
        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Delete failed');
        }
        loadCategories();
        loadItems();
      } catch (err) {
        alert('Error: ' + err.message);
      }
    }

    document.getElementById('searchInput').addEventListener('input', debounce(loadItems, 300));
    document.getElementById('categoryFilter').addEventListener('change', loadItems);

    function debounce(fn, ms) {
      let timeout;
      return () => {
        clearTimeout(timeout);
        timeout = setTimeout(fn, ms);
      };
    }

    document.getElementById('itemModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('itemModal')) closeItemModal();
    });
    document.getElementById('categoryModal').addEventListener('click', (e) => {
      if (e.target === document.getElementById('categoryModal')) closeCategoryModal();
    });

    loadItems();
    loadCategories();
  </script>
</body>
</html>`);
});

router.get('/categories', (c) => {
  const categories = db.queryAll('SELECT * FROM categories ORDER BY name');
  return c.json(categories);
});

router.post('/categories', async (c) => {
  const body = await c.req.json();
  const parsed = CreateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, 400);
  }
  
  const result = db.prepare('INSERT INTO categories (name, description) VALUES (?, ?)').run(
    parsed.data.name,
    parsed.data.description || null
  );
  const category = db.queryRow('SELECT * FROM categories WHERE id = ?', result.lastInsertRowid);
  return c.json(category, 201);
});

router.get('/categories/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const category = db.queryRow('SELECT * FROM categories WHERE id = ?', id);
  if (!category) return c.json({ error: 'Category not found' }, 404);
  return c.json(category);
});

router.patch('/categories/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const parsed = UpdateCategorySchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, 400);
  }
  
  const category = db.queryRow('SELECT * FROM categories WHERE id = ?', id);
  if (!category) return c.json({ error: 'Category not found' }, 404);
  
  const updates = parsed.data;
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.description !== undefined) {
    fields.push('description = ?');
    values.push(updates.description);
  }
  
  if (fields.length === 0) {
    return c.json(category);
  }
  
  values.push(id);
  db.prepare(`UPDATE categories SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = db.queryRow('SELECT * FROM categories WHERE id = ?', id);
  return c.json(updated);
});

router.delete('/categories/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  
  const dependent = db.queryRow('SELECT COUNT(*) as count FROM items WHERE category_id = ?', id);
  if (dependent.count > 0) {
    return c.json({ error: 'Cannot delete category with existing items' }, 400);
  }
  
  const result = db.prepare('DELETE FROM categories WHERE id = ?').run(id);
  if (result.changes === 0) return c.json({ error: 'Category not found' }, 404);
  return c.body(null, 204);
});

router.get('/items', (c) => {
  const { search, category, sort } = c.req.query();
  
  let sql = 'SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE 1=1';
  const params = [];
  
  if (search) {
    sql += ' AND i.name LIKE ?';
    params.push(`%${search}%`);
  }
  
  if (category) {
    const categoryId = parseInt(category);
    if (!isNaN(categoryId)) {
      sql += ' AND i.category_id = ?';
      params.push(categoryId);
    }
  }
  
  const allowedSorts: Record<string, string> = {
    'name': 'i.name',
    'name_desc': 'i.name DESC',
    'quantity': 'i.quantity',
    'quantity_desc': 'i.quantity DESC',
    'created_at': 'i.created_at',
    'created_at_desc': 'i.created_at DESC'
  };
  
  const orderBy = allowedSorts[sort || ''] || 'i.created_at';
  sql += ` ORDER BY ${orderBy}`;
  
  const items = db.queryAll(sql, params);
  return c.json(items);
});

router.post('/items', async (c) => {
  const body = await c.req.json();
  const parsed = CreateItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, 400);
  }
  
  if (parsed.data.category_id != null) {
    const category = db.queryRow('SELECT id FROM categories WHERE id = ?', parsed.data.category_id);
    if (!category) return c.json({ error: 'Category not found' }, 400);
  }
  
  const result = db.prepare('INSERT INTO items (name, quantity, category_id) VALUES (?, ?, ?)').run(
    parsed.data.name,
    parsed.data.quantity,
    parsed.data.category_id || null
  );
  
  const item = db.queryRow('SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?', result.lastInsertRowid);
  return c.json(item, 201);
});

router.get('/items/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const item = db.queryRow('SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?', id);
  if (!item) return c.json({ error: 'Item not found' }, 404);
  return c.json(item);
});

router.patch('/items/:id', async (c) => {
  const id = parseInt(c.req.param('id'));
  const body = await c.req.json();
  const parsed = UpdateItemSchema.safeParse(body);
  if (!parsed.success) {
    return c.json({ error: parsed.error.errors.map(e => e.message).join(', ') }, 400);
  }
  
  const item = db.queryRow('SELECT * FROM items WHERE id = ?', id);
  if (!item) return c.json({ error: 'Item not found' }, 404);
  
  const updates = parsed.data;
  
  if (updates.category_id !== undefined && updates.category_id != null) {
    const category = db.queryRow('SELECT id FROM categories WHERE id = ?', updates.category_id);
    if (!category) return c.json({ error: 'Category not found' }, 400);
  }
  
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.quantity !== undefined) {
    fields.push('quantity = ?');
    values.push(updates.quantity);
  }
  if (updates.category_id !== undefined) {
    fields.push('category_id = ?');
    values.push(updates.category_id);
  }
  
  if (fields.length === 0) {
    const current = db.queryRow('SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?', id);
    return c.json(current);
  }
  
  values.push(id);
  db.prepare(`UPDATE items SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  
  const updated = db.queryRow('SELECT i.*, c.name as category_name FROM items i LEFT JOIN categories c ON i.category_id = c.id WHERE i.id = ?', id);
  return c.json(updated);
});

router.delete('/items/:id', (c) => {
  const id = parseInt(c.req.param('id'));
  const result = db.prepare('DELETE FROM items WHERE id = ?').run(id);
  if (result.changes === 0) return c.json({ error: 'Item not found' }, 404);
  return c.body(null, 204);
});
</output>