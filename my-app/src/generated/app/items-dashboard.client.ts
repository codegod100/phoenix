// Web interface module - no database tables owned

// Web interface module - no data schemas required

router.get('/', async (c) => {
  return c.html(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 2rem; }
    .container { max-width: 1200px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); padding: 2rem; }
    h1 { margin-bottom: 1.5rem; color: #333; }
    .controls { display: flex; gap: 1rem; margin-bottom: 1.5rem; flex-wrap: wrap; align-items: center; }
    input, select, button { padding: 0.5rem 1rem; border: 1px solid #ddd; border-radius: 4px; font-size: 0.875rem; }
    input:focus, select:focus { outline: none; border-color: #4a90d9; }
    button { background: #4a90d9; color: white; border: none; cursor: pointer; font-weight: 500; }
    button:hover { background: #357abd; }
    button.secondary { background: #6c757d; }
    button.secondary:hover { background: #545b62; }
    button.danger { background: #dc3545; }
    button.danger:hover { background: #c82333; }
    .search-box { flex: 1; min-width: 200px; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 0.75rem; border-bottom: 1px solid #eee; }
    th { font-weight: 600; color: #666; cursor: pointer; user-select: none; }
    th:hover { color: #333; }
    th .sort-indicator { margin-left: 0.5rem; opacity: 0.5; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 0.5rem; }
    .actions button { padding: 0.25rem 0.75rem; font-size: 0.75rem; }
    .modal-overlay { display: none; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); z-index: 100; justify-content: center; align-items: center; }
    .modal-overlay.active { display: flex; }
    .modal { background: white; border-radius: 8px; padding: 2rem; width: 90%; max-width: 500px; }
    .modal h2 { margin-bottom: 1.5rem; }
    .form-group { margin-bottom: 1rem; }
    label { display: block; margin-bottom: 0.25rem; font-weight: 500; color: #555; }
    .form-actions { display: flex; gap: 1rem; justify-content: flex-end; margin-top: 1.5rem; }
    .empty-state { text-align: center; padding: 3rem; color: #666; }
    .badge { background: #e9ecef; padding: 0.25rem 0.5rem; border-radius: 4px; font-size: 0.75rem; color: #495057; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Items Dashboard</h1>
    
    <div class="controls">
      <input type="text" id="search" class="search-box" placeholder="Search items by name...">
      <select id="category-filter">
        <option value="">All Categories</option>
      </select>
      <select id="sort">
        <option value="name">Sort by Name</option>
        <option value="quantity">Sort by Quantity</option>
      </select>
      <button onclick="openModal()">Create Item</button>
    </div>

    <table id="items-table">
      <thead>
        <tr>
          <th onclick="toggleSort('name')">Name <span class="sort-indicator" id="sort-name">↕</span></th>
          <th onclick="toggleSort('quantity')">Quantity <span class="sort-indicator" id="sort-quantity">↕</span></th>
          <th>Category</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody id="items-body">
        <tr><td colspan="4" class="empty-state">Loading...</td></tr>
      </tbody>
    </table>
  </div>

  <div class="modal-overlay" id="modal">
    <div class="modal">
      <h2 id="modal-title">Create Item</h2>
      <form id="item-form" onsubmit="handleSubmit(event)">
        <input type="hidden" id="item-id">
        <div class="form-group">
          <label for="item-name">Name *</label>
          <input type="text" id="item-name" required>
        </div>
        <div class="form-group">
          <label for="item-quantity">Quantity *</label>
          <input type="number" id="item-quantity" required min="0">
        </div>
        <div class="form-group">
          <label for="item-category">Category</label>
          <select id="item-category">
            <option value="">-- No Category --</option>
          </select>
        </div>
        <div class="form-actions">
          <button type="button" class="secondary" onclick="closeModal()">Cancel</button>
          <button type="submit">Save</button>
        </div>
      </form>
    </div>
  </div>

  <script>
    let currentSort = { field: 'name', direction: 'asc' };
    let categories = [];

    async function loadCategories() {
      try {
        const res = await fetch('/categories');
        if (res.ok) {
          categories = await res.json();
          populateCategorySelects();
        }
      } catch (e) {
        console.error('Failed to load categories:', e);
      }
    }

    function populateCategorySelects() {
      const filterSelect = document.getElementById('category-filter');
      const modalSelect = document.getElementById('item-category');
      
      while (filterSelect.children.length > 1) filterSelect.removeChild(filterSelect.lastChild);
      while (modalSelect.children.length > 1) modalSelect.removeChild(modalSelect.lastChild);
      
      categories.forEach(cat => {
        filterSelect.add(new Option(cat.name, cat.id));
        modalSelect.add(new Option(cat.name, cat.id));
      });
    }

    async function loadItems() {
      const search = document.getElementById('search').value.trim();
      const categoryId = document.getElementById('category-filter').value;
      
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (categoryId) params.append('category_id', categoryId);
      params.append('sort', currentSort.field);
      params.append('direction', currentSort.direction);
      
      try {
        const res = await fetch('/items?' + params.toString());
        const items = await res.json();
        renderItems(items);
      } catch (e) {
        document.getElementById('items-body').innerHTML = 
          '<tr><td colspan="4" class="empty-state">Error loading items</td></tr>';
      }
    }

    function renderItems(items) {
      const tbody = document.getElementById('items-body');
      if (items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        return;
      }
      
      tbody.innerHTML = items.map(item => {
        const categoryName = item.category_name || '—';
        return '<tr>' +
          '<td>' + escapeHtml(item.name) + '</td>' +
          '<td>' + item.quantity + '</td>' +
          '<td><span class="badge">' + escapeHtml(categoryName) + '</span></td>' +
          '<td class="actions">' +
            '<button class="secondary" onclick="editItem(' + item.id + ')">Edit</button>' +
            '<button class="danger" onclick="deleteItem(' + item.id + ')">Delete</button>' +
          '</td>' +
        '</tr>';
      }).join('');
      
      updateSortIndicators();
    }

    function escapeHtml(text) {
      if (!text) return '';
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    function toggleSort(field) {
      if (currentSort.field === field) {
        currentSort.direction = currentSort.direction === 'asc' ? 'desc' : 'asc';
      } else {
        currentSort.field = field;
        currentSort.direction = 'asc';
      }
      loadItems();
    }

    function updateSortIndicators() {
      document.getElementById('sort-name').textContent = currentSort.field === 'name' 
        ? (currentSort.direction === 'asc' ? '↑' : '↓') : '↕';
      document.getElementById('sort-quantity').textContent = currentSort.field === 'quantity' 
        ? (currentSort.direction === 'asc' ? '↑' : '↓') : '↕';
    }

    function openModal(item = null) {
      document.getElementById('modal-title').textContent = item ? 'Edit Item' : 'Create Item';
      document.getElementById('item-id').value = item ? item.id : '';
      document.getElementById('item-name').value = item ? item.name : '';
      document.getElementById('item-quantity').value = item ? item.quantity : '';
      document.getElementById('item-category').value = item ? (item.category_id || '') : '';
      document.getElementById('modal').classList.add('active');
    }

    function closeModal() {
      document.getElementById('modal').classList.remove('active');
      document.getElementById('item-form').reset();
    }

    async function editItem(id) {
      try {
        const res = await fetch('/items/' + id);
        if (res.ok) {
          const item = await res.json();
          openModal(item);
        } else if (res.status === 404) {
          alert('Item not found');
        }
      } catch (e) {
        alert('Failed to load item');
      }
    }

    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      try {
        const res = await fetch('/items/' + id, { method: 'DELETE' });
        if (res.ok || res.status === 204) {
          loadItems();
        } else {
          alert('Failed to delete item');
        }
      } catch (e) {
        alert('Failed to delete item');
      }
    }

    async function handleSubmit(e) {
      e.preventDefault();
      
      const id = document.getElementById('item-id').value;
      const data = {
        name: document.getElementById('item-name').value.trim(),
        quantity: parseInt(document.getElementById('item-quantity').value),
        category_id: document.getElementById('item-category').value || null
      };
      
      const url = id ? '/items/' + id : '/items';
      const method = id ? 'PATCH' : 'POST';
      
      try {
        const res = await fetch(url, {
          method: method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
        
        if (res.ok || res.status === 201) {
          closeModal();
          loadItems();
        } else if (res.status === 400) {
          const err = await res.json();
          alert('Validation error: ' + (err.error || 'Invalid data'));
        } else {
          alert('Failed to save item');
        }
      } catch (e) {
        alert('Failed to save item');
      }
    }

    function debounce(fn, ms) {
      let timeout;
      return function() {
        clearTimeout(timeout);
        timeout = setTimeout(() => fn.apply(this, arguments), ms);
      };
    }

    document.getElementById('search').addEventListener('input', debounce(loadItems, 300));
    document.getElementById('category-filter').addEventListener('change', loadItems);
    document.getElementById('sort').addEventListener('change', function() {
      currentSort.field = document.getElementById('sort').value;
      currentSort.direction = 'asc';
      loadItems();
    });

    document.getElementById('modal').addEventListener('click', function(e) {
      if (e.target.id === 'modal') closeModal();
    });

    loadCategories();
    loadItems();
  </script>
</body>
</html>`);
});
