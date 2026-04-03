class ItemsDashboard {
  private state = {
    data: [] as unknown[],
    categories: [] as unknown[],
    loading: false,
    error: null as string | null,
    search: '',
    categoryId: '',
    sort: 'name',
    order: 'asc'
  };

  async loadData(): Promise<void> {
    this.updateState({ loading: true, error: null });
    
    try {
      const params = new URLSearchParams();
      if (this.state.search) params.set('search', this.state.search);
      if (this.state.categoryId) params.set('category_id', this.state.categoryId);
      if (this.state.sort) params.set('sort', this.state.sort);
      if (this.state.order) params.set('order', this.state.order);
      
      const queryString = params.toString();
      const [itemsRes, categoriesRes] = await Promise.all([
        fetch('/items' + (queryString ? '?' + queryString : '')),
        fetch('/categories')
      ]);
      
      if (!itemsRes.ok) throw new Error('Failed to load items');
      if (!categoriesRes.ok) throw new Error('Failed to load categories');
      
      const items = await itemsRes.json();
      const categories = await categoriesRes.json();
      
      this.updateState({ data: items, categories, loading: false });
    } catch (err) {
      this.updateState({ 
        error: err instanceof Error ? err.message : 'Unknown error', 
        loading: false 
      });
    }
  }

  updateState(partial: Partial<typeof this.state>): void {
    Object.assign(this.state, partial);
  }

  generateHTML(): string {
    const toggleSort = (field: string): string => {
      if (this.state.sort === field) {
        return this.state.order === 'asc' ? 'desc' : 'asc';
      }
      return 'asc';
    };

    const sortIcon = (field: string): string => {
      if (this.state.sort !== field) return '⇅';
      return this.state.order === 'asc' ? '↑' : '↓';
    };

    const items = this.state.data as Array<{
      id: number;
      name: string;
      quantity: number;
      category_id: number | null;
      category_name: string | null;
    }>;

    const categories = this.state.categories as Array<{
      id: number;
      name: string;
    }>;

    return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Items Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; padding: 20px; }
    .container { max-width: 1200px; margin: 0 auto; }
    h1 { margin-bottom: 20px; color: #333; }
    .controls { display: flex; gap: 15px; margin-bottom: 20px; flex-wrap: wrap; align-items: center; }
    .search-box { flex: 1; min-width: 200px; }
    .search-box input { width: 100%; padding: 10px 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .filter-select { padding: 10px 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; background: white; min-width: 150px; }
    .btn { padding: 10px 20px; border: none; border-radius: 6px; cursor: pointer; font-size: 14px; font-weight: 500; transition: background 0.2s; }
    .btn-primary { background: #0066cc; color: white; }
    .btn-primary:hover { background: #0052a3; }
    .btn-secondary { background: #6c757d; color: white; }
    .btn-secondary:hover { background: #5a6268; }
    .btn-danger { background: #dc3545; color: white; }
    .btn-danger:hover { background: #c82333; }
    .btn-sm { padding: 6px 12px; font-size: 13px; }
    table { width: 100%; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); overflow: hidden; }
    th, td { padding: 12px 15px; text-align: left; border-bottom: 1px solid #eee; }
    th { background: #f8f9fa; font-weight: 600; color: #555; }
    th.sortable { cursor: pointer; user-select: none; }
    th.sortable:hover { background: #e9ecef; }
    th a { text-decoration: none; color: inherit; display: block; }
    tr:hover { background: #f8f9fa; }
    .actions { display: flex; gap: 8px; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 12px; font-size: 12px; background: #e9ecef; color: #495057; }
    .badge.none { background: #f8f9fa; color: #999; }
    .modal-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
    .modal { background: white; padding: 30px; border-radius: 12px; width: 100%; max-width: 450px; box-shadow: 0 10px 40px rgba(0,0,0,0.2); }
    .modal h2 { margin-bottom: 20px; color: #333; }
    .form-group { margin-bottom: 15px; }
    .form-group label { display: block; margin-bottom: 5px; font-weight: 500; color: #555; }
    .form-group input, .form-group select { width: 100%; padding: 10px 15px; border: 1px solid #ddd; border-radius: 6px; font-size: 14px; }
    .modal-actions { display: flex; gap: 10px; justify-content: flex-end; margin-top: 25px; }
    .hidden { display: none; }
    .empty-state { text-align: center; padding: 60px 20px; color: #666; }
    .loading { text-align: center; padding: 40px; color: #666; }
    .error { background: #f8d7da; color: #721c24; padding: 15px; border-radius: 6px; margin-bottom: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <h1>Items Dashboard</h1>
    
    ${this.state.error ? `<div class="error">${this.state.error}</div>` : ''}
    
    <div class="controls">
      <div class="search-box">
        <input type="text" id="searchInput" placeholder="Search items by name..." value="${this.state.search}">
      </div>
      <select id="categoryFilter" class="filter-select">
        <option value="">All Categories</option>
        ${categories.map(cat => `<option value="${cat.id}" ${this.state.categoryId == String(cat.id) ? 'selected' : ''}>${cat.name}</option>`).join('')}
      </select>
      <button class="btn btn-primary" onclick="openCreateModal()">+ Create Item</button>
    </div>
    
    ${this.state.loading ? '<div class="loading">Loading...</div>' : `
    <table>
      <thead>
        <tr>
          <th class="sortable" onclick="handleSort('name')">Name ${sortIcon('name')}</th>
          <th class="sortable" onclick="handleSort('quantity')">Quantity ${sortIcon('quantity')}</th>
          <th>Category</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${items.length === 0 ? '<tr><td colspan="4" class="empty-state">No items found</td></tr>' : 
          items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.category_name ? `<span class="badge">${item.category_name}</span>` : '<span class="badge none">None</span>'}</td>
              <td class="actions">
                <button class="btn btn-secondary btn-sm" onclick="openEditModal(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.quantity}, ${item.category_id || 'null'})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">Delete</button>
              </td>
            </tr>
          `).join('')
        }
      </tbody>
    </table>
    `}
  </div>
  
  <div id="modalOverlay" class="modal-overlay hidden">
    <div class="modal">
      <h2 id="modalTitle">Create Item</h2>
      <form id="itemForm">
        <input type="hidden" id="itemId">
        <div class="form-group">
          <label for="itemName">Name</label>
          <input type="text" id="itemName" required>
        </div>
        <div class="form-group">
          <label for="itemQuantity">Quantity</label>
          <input type="number" id="itemQuantity" required min="0">
        </div>
        <div class="form-group">
          <label for="itemCategory">Category</label>
          <select id="itemCategory">
            <option value="">None</option>
            ${categories.map(cat => `<option value="${cat.id}">${cat.name}</option>`).join('')}
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
    const state = {
      search: '${this.state.search}',
      categoryId: '${this.state.categoryId}',
      sort: '${this.state.sort}',
      order: '${this.state.order}'
    };
    
    const searchInput = document.getElementById('searchInput');
    const categoryFilter = document.getElementById('categoryFilter');
    const modalOverlay = document.getElementById('modalOverlay');
    const modalTitle = document.getElementById('modalTitle');
    const itemForm = document.getElementById('itemForm');
    const itemId = document.getElementById('itemId');
    const itemName = document.getElementById('itemName');
    const itemQuantity = document.getElementById('itemQuantity');
    const itemCategory = document.getElementById('itemCategory');
    
    let searchTimeout;
    searchInput.addEventListener('input', () => {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        state.search = searchInput.value;
        refreshPage();
      }, 300);
    });
    
    categoryFilter.addEventListener('change', () => {
      state.categoryId = categoryFilter.value;
      refreshPage();
    });
    
    function handleSort(field) {
      if (state.sort === field) {
        state.order = state.order === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort = field;
        state.order = 'asc';
      }
      refreshPage();
    }
    
    function refreshPage() {
      const params = new URLSearchParams();
      if (state.search) params.set('search', state.search);
      if (state.categoryId) params.set('category_id', state.categoryId);
      if (state.sort) params.set('sort', state.sort);
      if (state.order) params.set('order', state.order);
      window.location.search = params.toString();
    }
    
    function openCreateModal() {
      modalTitle.textContent = 'Create Item';
      itemId.value = '';
      itemName.value = '';
      itemQuantity.value = '0';
      itemCategory.value = '';
      modalOverlay.classList.remove('hidden');
    }
    
    function openEditModal(id, name, quantity, categoryId) {
      modalTitle.textContent = 'Edit Item';
      itemId.value = id;
      itemName.value = name;
      itemQuantity.value = quantity;
      itemCategory.value = categoryId || '';
      modalOverlay.classList.remove('hidden');
    }
    
    function closeModal() {
      modalOverlay.classList.add('hidden');
    }
    
    modalOverlay.addEventListener('click', (e) => {
      if (e.target === modalOverlay) closeModal();
    });
    
    itemForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const data = {
        name: itemName.value,
        quantity: parseInt(itemQuantity.value),
        category_id: itemCategory.value ? parseInt(itemCategory.value) : null
      };
      
      const isEdit = itemId.value !== '';
      const url = isEdit ? '/items/' + itemId.value : '/items';
      const method = isEdit ? 'PATCH' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      
      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to save item');
      }
    });
    
    async function deleteItem(id) {
      if (!confirm('Are you sure you want to delete this item?')) return;
      
      const response = await fetch('/items/' + id, { method: 'DELETE' });
      
      if (response.ok) {
        window.location.reload();
      } else {
        const error = await response.json();
        alert(error.error || 'Failed to delete item');
      }
    }
    
    // Load items on page load
    async function initDashboard() {
      try {
        const res = await fetch('/items');
        if (!res.ok) throw new Error('Failed to load items');
        const items = await res.json();
        
        // Render items into table
        const tbody = document.querySelector('tbody');
        if (items.length === 0) {
          tbody.innerHTML = '<tr><td colspan="4" class="empty-state">No items found</td></tr>';
        } else {
          tbody.innerHTML = items.map(item => `
            <tr>
              <td>${item.name}</td>
              <td>${item.quantity}</td>
              <td>${item.category_name ? `<span class="badge">${item.category_name}</span>` : '<span class="badge none">None</span>'}</td>
              <td class="actions">
                <button class="btn btn-secondary btn-sm" onclick="openEditModal(${item.id}, '${item.name.replace(/'/g, "\\'")}', ${item.quantity}, ${item.category_id || 'null'})">Edit</button>
                <button class="btn btn-danger btn-sm" onclick="deleteItem(${item.id})">Delete</button>
              </td>
            </tr>
          `).join('');
        }
      } catch (err) {
        console.error('Failed to load items:', err);
      }
    }
    
    initDashboard();
  </script>
</body>
</html>`;
  }
}

export default ItemsDashboard;

export const _phoenix = {
  iu_id: '6ae19bb755dd17868062e158151bb1d8ffd1a29a7e48d8e4b3de43ce721efebb',
  name: 'Items Dashboard',
  risk_tier: 'low',
  canon_ids: [2]
} as const;