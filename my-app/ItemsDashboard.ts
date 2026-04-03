<output>
class ItemsDashboard {
  private state: {
    data: Array<{
      id: string | number;
      name: string;
      category: string;
      description?: string;
      createdAt?: string;
      updatedAt?: string;
      [key: string]: any;
    }>;
    loading: boolean;
    error: string | null;
    selectedCategory: string;
    searchQuery: string;
    selectedItems: Set<string | number>;
    sortField: string;
    sortDirection: 'asc' | 'desc';
  };

  private container: HTMLElement | null = null;

  constructor() {
    this.state = {
      data: [],
      loading: false,
      error: null,
      selectedCategory: 'all',
      searchQuery: '',
      selectedItems: new Set(),
      sortField: 'name',
      sortDirection: 'asc'
    };
  }

  updateState(partial: Partial<typeof this.state>): void {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  async loadData(): Promise<void> {
    this.updateState({ loading: true, error: null });
    
    try {
      const response = await fetch('./items-dashboard');
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      
      this.updateState({
        data: Array.isArray(data) ? data : data.items || data.data || [],
        loading: false,
        error: null
      });
    } catch (err) {
      this.updateState({
        loading: false,
        error: err instanceof Error ? err.message : 'Failed to load data'
      });
    }
  }

  private getCategories(): string[] {
    const categories = new Set(this.state.data.map(item => item.category));
    return ['all', ...Array.from(categories).filter(Boolean).sort()];
  }

  private getFilteredData(): typeof this.state.data {
    let filtered = this.state.data;

    // Filter by category
    if (this.state.selectedCategory !== 'all') {
      filtered = filtered.filter(item => item.category === this.state.selectedCategory);
    }

    // Filter by search query
    if (this.state.searchQuery.trim()) {
      const query = this.state.searchQuery.toLowerCase();
      filtered = filtered.filter(item =>
        item.name?.toLowerCase().includes(query) ||
        item.description?.toLowerCase().includes(query) ||
        item.category?.toLowerCase().includes(query)
      );
    }

    // Sort data
    filtered = [...filtered].sort((a, b) => {
      const aVal = a[this.state.sortField] ?? '';
      const bVal = b[this.state.sortField] ?? '';
      const comparison = String(aVal).localeCompare(String(bVal));
      return this.state.sortDirection === 'asc' ? comparison : -comparison;
    });

    return filtered;
  }

  private handleCategoryChange(category: string): void {
    this.updateState({ selectedCategory: category });
  }

  private handleSearch(query: string): void {
    this.updateState({ searchQuery: query });
  }

  private handleSort(field: string): void {
    const direction = this.state.sortField === field && this.state.sortDirection === 'asc' ? 'desc' : 'asc';
    this.updateState({ sortField: field, sortDirection: direction });
  }

  private handleCreate(): void {
    this.dispatchEvent('create', {});
  }

  private handleEdit(item: typeof this.state.data[0]): void {
    this.dispatchEvent('edit', { item });
  }

  private handleDelete(item: typeof this.state.data[0]): void {
    if (confirm(`Are you sure you want to delete "${item.name}"?`)) {
      this.dispatchEvent('delete', { item });
    }
  }

  private handleBulkDelete(): void {
    const count = this.state.selectedItems.size;
    if (count > 0 && confirm(`Are you sure you want to delete ${count} selected items?`)) {
      this.dispatchEvent('bulkDelete', { ids: Array.from(this.state.selectedItems) });
      this.updateState({ selectedItems: new Set() });
    }
  }

  private toggleSelection(id: string | number): void {
    const selected = new Set(this.state.selectedItems);
    if (selected.has(id)) {
      selected.delete(id);
    } else {
      selected.add(id);
    }
    this.updateState({ selectedItems: selected });
  }

  private selectAll(): void {
    const filtered = this.getFilteredData();
    const allIds = new Set(filtered.map(item => item.id));
    this.updateState({ selectedItems: allIds });
  }

  private deselectAll(): void {
    this.updateState({ selectedItems: new Set() });
  }

  private dispatchEvent(eventName: string, detail: any): void {
    if (this.container) {
      this.container.dispatchEvent(new CustomEvent(eventName, { detail, bubbles: true }));
    }
  }

  private escapeHtml(unsafe: string): string {
    return unsafe
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  generateHTML(): string {
    const categories = this.getCategories();
    const filteredData = this.getFilteredData();
    const selectedCount = this.state.selectedItems.size;

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Items Dashboard</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
      background: #f5f7fa;
      color: #333;
      line-height: 1.6;
    }
    
    .dashboard-container {
      max-width: 1200px;
      margin: 0 auto;
      padding: 24px;
    }
    
    .dashboard-header {
      background: white;
      border-radius: 12px;
      padding: 24px;
      margin-bottom: 24px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
    }
    
    .dashboard-title {
      font-size: 28px;
      font-weight: 700;
      color: #1a202c;
      margin-bottom: 16px;
    }
    
    .controls-bar {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      align-items: center;
      justify-content: space-between;
    }
    
    .filter-section {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      align-items: center;
      flex: 1;
    }
    
    .search-box {
      position: relative;
      min-width: 240px;
    }
    
    .search-box input {
      width: 100%;
      padding: 10px 14px 10px 38px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      font-size: 14px;
      transition: all 0.2s;
    }
    
    .search-box input:focus {
      outline: none;
      border-color: #4299e1;
      box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.1);
    }
    
    .search-icon {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: #a0aec0;
      font-size: 16px;
    }
    
    .category-filter {
      display: flex;
      gap: 8px;
      flex-wrap: wrap;
    }
    
    .filter-btn {
      padding: 8px 16px;
      border: 1px solid #e2e8f0;
      background: white;
      border-radius: 20px;
      font-size: 13px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      color: #4a5568;
    }
    
    .filter-btn:hover {
      background: #f7fafc;
      border-color: #cbd5e0;
    }
    
    .filter-btn.active {
      background: #4299e1;
      color: white;
      border-color: #4299e1;
    }
    
    .action-buttons {
      display: flex;
      gap: 10px;
    }
    
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 10px 18px;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      transition: all 0.2s;
      border: none;
    }
    
    .btn-primary {
      background: #48bb78;
      color: white;
    }
    
    .btn-primary:hover {
      background: #38a169;
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(72, 187, 120, 0.3);
    }
    
    .btn-danger {
      background: #f56565;
      color: white;
    }
    
    .btn-danger:hover {
      background: #e53e3e;
    }
    
    .btn-secondary {
      background: #edf2f7;
      color: #4a5568;
    }
    
    .btn-secondary:hover {
      background: #e2e8f0;
    }
    
    .btn-sm {
      padding: 6px 12px;
      font-size: 12px;
    }
    
    .bulk-actions {
      display: flex;
      gap: 10px;
      align-items: center;
      padding: 12px 16px;
      background: #ebf8ff;
      border-radius: 8px;
      margin-bottom: 16px;
    }
    
    .bulk-actions-text {
      font-size: 14px;
      color: #2b6cb0;
      font-weight: 500;
    }
    
    .stats-bar {
      display: flex;
      gap: 24px;
      margin-bottom: 16px;
      font-size: 14px;
      color: #718096;
    }
    
    .stat-item {
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .stat-value {
      font-weight: 600;
      color: #2d3748;
    }
    
    .data-table-container {
      background: white;
      border-radius: 12px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.08);
      overflow: hidden;
    }
    
    .data-table {
      width: 100%;
      border-collapse: collapse;
    }
    
    .data-table th,
    .data-table td {
      padding: 14px 16px;
      text-align: left;
      border-bottom: 1px solid #e2e8f0;
    }
    
    .data-table th {
      background: #f7fafc;
      font-size: 12px;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #4a5568;
      user-select: none;
      cursor: pointer;
    }
    
    .data-table th:hover {
      background: #edf2f7;
    }
    
    .data-table th .sort-indicator {
      margin-left: 6px;
      font-size: 10px;
    }
    
    .data-table tbody tr:hover {
      background: #f7fafc;
    }
    
    .data-table td {
      font-size: 14px;
      color: #2d3748;
    }
    
    .checkbox-cell {
      width: 40px;
      text-align: center;
    }
    
    .checkbox-cell input[type="checkbox"] {
      width: 18px;
      height: 18px;
      cursor: pointer;
      accent-color: #4299e1;
    }
    
    .item-name {
      font-weight: 600;
      color: #2d3748;
    }
    
    .item-category {
      display: inline-block;
      padding: 4px 12px;
      background: #ebf8ff;
      color: #2b6cb0;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 500;
    }
    
    .actions-cell {
      width: 120px;
    }
    
    .row-actions {
      display: flex;
      gap: 8px;
    }
    
    .icon-btn {
      width: 32px;
      height: 32px;
      border-radius: 6px;
      border: none;
      background: transparent;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s;
    }
    
    .icon-btn:hover {
      background: #edf2f7;
    }
    
    .icon-btn.edit:hover {
      background: #ebf8ff;
      color: #4299e1;
    }
    
    .icon-btn.delete:hover {
      background: #fed7d7;
      color: #e53e3e;
    }
    
    .empty-state {
      padding: 60px 24px;
      text-align: center;
    }
    
    .empty-icon {
      width: 80px;
      height: 80px;
      margin: 0 auto 20px;
      background: #f7fafc;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 32px;
      color: #a0aec0;
    }
    
    .empty-title {
      font-size: 18px;
      font-weight: 600;
      color: #2d3748;
      margin-bottom: 8px;
    }
    
    .empty-subtitle {
      font-size: 14px;
      color: #718096;
    }
    
    .loading-state {
      padding: 60px 24px;
      text-align: center;
    }
    
    .spinner {
      width: 40px;
      height: 40px;
      border: 3px solid #e2e8f0;
      border-top-color: #4299e1;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 16px;
    }
    
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
    
    .loading-text {
      color: #718096;
      font-size: 14px;
    }
    
    .error-state {
      padding: 40px 24px;
      text-align: center;
      background: #fff5f5;
      border-radius: 12px;
    }
    
    .error-icon {
      width: 48px;
      height: 48px;
      margin: 0 auto 16px;
      background: #fed7d7;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 24px;
      color: #e53e3e;
    }
    
    .error-title {
      font-size: 16px;
      font-weight: 600;
      color: #c53030;
      margin-bottom: 8px;
    }
    
    .error-message {
      font-size: 14px;
      color: #e53e3e;
      margin-bottom: 16px;
    }
    
    .retry-btn {
      padding: 10px 20px;
      background: #e53e3e;
      color: white;
      border: none;
      border-radius: 8px;
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
    }
    
    .retry-btn:hover {
      background: #c53030;
    }
  </style>
</head>
<body>
  <div class="dashboard-container">
    <div class="dashboard-header">
      <h1 class="dashboard-title">📦 Items Dashboard</h1>
      
      <div class="controls-bar">
        <div class="filter-section">
          <div class="search-box">
            <span class="search-icon">🔍</span>
            <input 
              type="text" 
              id="searchInput"
              placeholder="Search items..." 
              value="${this.escapeHtml(this.state.searchQuery)}"
            >
          </div>
          
          <div class="category-filter" id="categoryFilter">
            ${categories.map(cat => `
              <button 
                class="filter-btn ${cat === this.state.selectedCategory ? 'active' : ''}" 
                data-category="${this.escapeHtml(cat)}"
              >
                ${cat === 'all' ? 'All Categories' : this.escapeHtml(cat.charAt(0).toUpperCase() + cat.slice(1))}
              </button>
            `).join('')}
          </div>
        </div>
        
        <div class="action-buttons">
          <button class="btn btn-primary" id="createBtn">
            <span>+</span> Create Item
          </button>
          ${selectedCount > 0 ? `
            <button class="btn btn-danger" id="bulkDeleteBtn">
              <span>🗑️</span> Delete (${selectedCount})
            </button>
          ` : ''}
        </div>
      </div>
    </div>

    ${this.state.loading ? `
      <div class="loading-state">
        <div class="spinner"></div>
        <p class="loading-text">Loading items...</p>
      </div>
    ` : this.state.error ? `
      <div class="error-state">
        <div class="error-icon">⚠️</div>
        <h3 class="error-title">Failed to load items</h3>
        <p class="error-message">${this.escapeHtml(this.state.error)}</p>
        <button class="retry-btn" id="retryBtn">Try Again</button>
      </div>
    ` : filteredData.length === 0 ? `
      <div class="empty-state">
        <div class="empty-icon">📭</div>
        <h3 class="empty-title">No items found</h3>
        <p class="empty-subtitle">
          ${this.state.data.length === 0 
            ? 'Get started by creating your first item.' 
            : 'Try adjusting your filters or search query.'}
        </p>
      </div>
    ` : `
      ${selectedCount > 0 ? `
        <div class="bulk-actions">
          <span class="bulk-actions-text">${selectedCount} item${selectedCount > 1 ? 's' : ''} selected</span>
          <button class="btn btn-secondary btn-sm" id="selectAllBtn">Select All</button>
          <button class="btn btn-secondary btn-sm" id="deselectAllBtn">Deselect</button>
        </div>
      ` : ''}
      
      <div class="stats-bar">
        <div class="stat-item">
          <span>Total:</span>
          <span class="stat-value">${this.state.data.length}</span>
        </div>
        <div class="stat-item">
          <span>Showing:</span>
          <span class="stat-value">${filteredData.length}</span>
        </div>
        ${this.state.selectedCategory !== 'all' ? `
          <div class="stat-item">
            <span>Category:</span>
            <span class="stat-value">${this.escapeHtml(this.state.selectedCategory)}</span>
          </div>
        ` : ''}
      </div>
      
      <div class="data-table-container">
        <table class="data-table">
          <thead>
            <tr>
              <th class="checkbox-cell">
                <input type="checkbox" id="selectAllCheckbox" ${selectedCount === filteredData.length && filteredData.length > 0 ? 'checked' : ''}>
              </th>
              <th data-sort="name">
                Name
                <span class="sort-indicator">${this.state.sortField === 'name' ? (this.state.sortDirection === 'asc' ? '▲' : '▼') : '⇅'}</span>
              </th>
              <th data-sort="category">
                Category
                <span class="sort-indicator">${this.state.sortField === 'category' ? (this.state.sortDirection === 'asc' ? '▲' : '▼') : '⇅'}</span>
              </th>
              <th data-sort="description">
                Description
                <span class="sort-indicator">${this.state.sortField === 'description' ? (this.state.sortDirection === 'asc' ? '▲' : '▼') : '⇅'}</span>
              </th>
              <th class="actions-cell">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(item => `
              <tr data-id="${item.id}">
                <td class="checkbox-cell">
                  <input type="checkbox" class="row-checkbox" data-id="${item.id}" ${this.state.selectedItems.has(item.id) ? 'checked' : ''}>
                </td>
                <td>
                  <div class="item-name">${this.escapeHtml(item.name || 'Unnamed')}</div>
                </td>
                <td>
                  <span class="item-category">${this.escapeHtml(item.category || 'Uncategorized')}</span>
                </td>
                <td>${this.escapeHtml(item.description?.substring(0, 60) || '')}${item.description?.length > 60 ? '...' : ''}</td>
                <td class="actions-cell">
                  <div class="row-actions">
                    <button class="icon-btn edit" data-action="edit" data-id="${item.id}" title="Edit">
                      ✏️
                    </button>
                    <button class="icon-btn delete" data-action="delete" data-id="${item.id}" title="Delete">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `}
  </div>
  
  <script>
    (function() {
      // Search functionality
      const searchInput = document.getElementById('searchInput');
      if (searchInput) {
        let debounceTimer;
        searchInput.addEventListener('input', function() {
          clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            window.parent.postMessage({ type: 'search', query: this.value }, '*');
          }, 200);
        });
      }
      
      // Category filter
      document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          window.parent.postMessage({ type: 'category', category: this.dataset.category }, '*');
        });
      });
      
      // Sort headers
      document.querySelectorAll('th[data-sort]').forEach(th => {
        th.addEventListener('click', function() {
          window.parent.postMessage({ type: 'sort', field: this.dataset.sort }, '*');
        });
      });
      
      // Create button
      const createBtn = document.getElementById('createBtn');
      if (createBtn) {
        createBtn.addEventListener('click', function() {
          window.parent.postMessage({ type: 'create' }, '*');
        });
      }
      
      // Retry button
      const retryBtn = document.getElementById('retryBtn');
      if (retryBtn) {
        retryBtn.addEventListener('click', function() {
          window.parent.postMessage({ type: 'retry' }, '*');
        });
      }
      
      // Bulk actions
      const bulkDeleteBtn = document.getElementById('bulkDeleteBtn');
      if (bulkDeleteBtn) {
        bulkDeleteBtn.addEventListener('click', function() {
          window.parent.postMessage({ type: 'bulkDelete' }, '*');
        });
      }
      
      const selectAllBtn = document.getElementById('selectAllBtn');
      if (selectAllBtn) {
        selectAllBtn.addEventListener('click', function() {
          window.parent.postMessage({ type: 'selectAll' }, '*');
        });
      }
      
      const deselectAllBtn = document.getElementById('deselectAllBtn');
      if (deselectAllBtn) {
        deselectAllBtn.addEventListener('click', function() {
          window.parent.postMessage({ type: 'deselectAll' }, '*');
        });
      }
      
      // Select all checkbox
      const selectAllCheckbox = document.getElementById('selectAllCheckbox');
      if (selectAllCheckbox) {
        selectAllCheckbox.addEventListener('change', function() {
          window.parent.postMessage({ type: 'selectAllToggle', checked: this.checked }, '*');
        });
      }
      
      // Row checkboxes
      document.querySelectorAll('.row-checkbox').forEach(checkbox => {
        checkbox.addEventListener('change', function() {
          window.parent.postMessage({ type: 'toggleSelection', id: this.dataset.id }, '*');
        });
      });
      
      // Row action buttons
      document.querySelectorAll('.icon-btn').forEach(btn => {
        btn.addEventListener('click', function() {
          const action = this.dataset.action;
          const id = this.dataset.id;
          if (action === 'edit') {
            window.parent.postMessage({ type: 'edit', id: id }, '*');
          } else if (action === 'delete') {
            window.parent.postMessage({ type: 'delete', id: id }, '*');
          }
        });
      });
    })();
  </script>
</body>
</html>`;
  }

  private render(): void {
    if (!this.container) return;
    this.container.innerHTML = this.generateHTML();
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    // Search input
    const searchInput = this.container?.querySelector('#searchInput') as HTMLInputElement;
    if (searchInput) {
      let debounceTimer: ReturnType<typeof setTimeout>;
      searchInput.addEventListener('input', () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          this.handleSearch(searchInput.value);
        }, 200);
      });
    }

    // Category filter buttons
    this.container?.querySelectorAll('.filter-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const category = (btn as HTMLElement).dataset.category || 'all';
        this.handleCategoryChange(category);
      });
    });

    // Sort headers
    this.container?.querySelectorAll('th[data-sort]').forEach(th => {
      th.addEventListener('click', () => {
        const field = (th as HTMLElement).dataset.sort || 'name';
        this.handleSort(field);
      });
    });

    // Create button
    this.container?.querySelector('#createBtn')?.addEventListener('click', () => {
      this.handleCreate();
    });

    // Retry button
    this.container?.querySelector('#retryBtn')?.addEventListener('click', () => {
      this.loadData();
    });

    // Bulk delete
    this.container?.querySelector('#bulkDeleteBtn')?.addEventListener('click', () => {
      this.handleBulkDelete();
    });

    // Select all / deselect all
    this.container?.querySelector('#selectAllBtn')?.addEventListener('click', () => {
      this.selectAll();
    });
    this.container?.querySelector('#deselectAllBtn')?.addEventListener('click', () => {
      this.deselectAll();
    });

    // Select all checkbox
    const selectAllCheckbox = this.container?.querySelector('#selectAllCheckbox');
    if (selectAllCheckbox) {
      selectAllCheckbox.addEventListener('change', (e) => {
        if ((e.target as HTMLInputElement).checked) {
          this.selectAll();
        } else {
          this.deselectAll();
        }
      });
    }

    // Row checkboxes
    this.container?.querySelectorAll('.row-checkbox').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        const id = (checkbox as HTMLInputElement).dataset.id;
        if (id) this.toggleSelection(id);
      });
    });

    // Edit and delete buttons
    this.container?.querySelectorAll('[data-action="edit"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        const item = this.state.data.find(i => String(i.id) === String(id));
        if (item) this.handleEdit(item);
      });
    });

    this.container?.querySelectorAll('[data-action="delete"]').forEach(btn => {
      btn.addEventListener('click', () => {
        const id = (btn as HTMLElement).dataset.id;
        const item = this.state.data.find(i => String(i.id) === String(id));
        if (item) this.handleDelete(item);
      });
    });

    // Handle postMessage from iframe (if used)
    window.addEventListener('message', (e) => {
      if (e.data?.type) {
        switch (e.data.type) {
          case 'search':
            this.handleSearch(e.data.query);
            break;
          case 'category':
            this.handleCategoryChange(e.data.category);
            break;
          case 'sort':
            this.handleSort(e.data.field);
            break;
          case 'create':
            this.handleCreate();
            break;
          case 'edit':
            const editItem = this.state.data.find(i => String(i.id) === String(e.data.id));
            if (editItem) this.handleEdit(editItem);
            break;
          case 'delete':
            const deleteItem = this.state.data.find(i => String(i.id) === String(e.data.id));
            if (deleteItem) this.handleDelete(deleteItem);
            break;
          case 'bulkDelete':
            this.handleBulkDelete();
            break;
          case 'selectAll':
            this.selectAll();
            break;
          case 'deselectAll':
            this.deselectAll();
            break;
          case 'selectAllToggle':
            if (e.data.checked) this.selectAll();
            else this.deselectAll();
            break;
          case 'toggleSelection':
            this.toggleSelection(e.data.id);
            break;
          case 'retry':
            this.loadData();
            break;
        }
      }
    });
  }

  mount(container: HTMLElement): void {
    this.container = container;
    this.render();
  }

  unmount(): void {
    this.container = null;
  }

  getState(): typeof this.state {
    return { ...this.state };
  }
}

export default ItemsDashboard;
</output>
